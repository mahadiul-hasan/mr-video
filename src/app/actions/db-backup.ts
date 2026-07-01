"use server";

import { spawn } from "child_process";
import { requireAdmin } from "@/lib/requireAdmin";
import { revalidatePath } from "next/cache";

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not defined");
  return url;
}

function runCommand(command: string, args: string[], input?: string) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, {
      env: process.env,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      reject(error);
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(stderr || `${command} exited with code ${code}`));
      }
    });

    if (input) {
      child.stdin.end(input);
    }
  });
}

function removePrismaMigrationData(sql: string) {
  return sql
    .split(/\r?\n/)
    .filter(
      (line) =>
        !/^\s*INSERT\s+INTO\s+(?:public\.)?"_prisma_migrations"\b/i.test(
          line,
        ),
    )
    .join("\n");
}

export async function createDatabaseBackup() {
  await requireAdmin();

  const pgDump = process.env.PG_DUMP_PATH || "pg_dump";
  try {
    const { stdout } = await runCommand(pgDump, [
      "--dbname",
      databaseUrl(),
      "--format",
      "plain",
      "--no-owner",
      "--no-privileges",
      "--data-only",
      "--column-inserts",
      "--exclude-table-data",
      "_prisma_migrations",
    ]);

    return {
      success: true,
      filename: `mr-video-postgres-${new Date().toISOString().replace(/[:.]/g, "-")}.sql`,
      sql: stdout,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Backup failed",
    };
  }
}

export async function restoreDatabaseBackup(formData: FormData) {
  await requireAdmin();

  const backupFile = formData.get("backupFile");
  if (!(backupFile instanceof File) || backupFile.size === 0) {
    return { success: false, error: "PostgreSQL .sql backup file is required" };
  }

  const sql = removePrismaMigrationData(await backupFile.text());
  const psql = process.env.PSQL_PATH || "psql";
  const truncateSql = `
TRUNCATE TABLE
  "VideoTag",
  "Video",
  "Category",
  "Tag",
  "AdSession",
  "AdSetting",
  "AdUnit",
  "Admin"
RESTART IDENTITY CASCADE;
`;

  try {
    await runCommand(
      psql,
      ["--dbname", databaseUrl(), "--set", "ON_ERROR_STOP=1"],
      `${truncateSql}\n${sql}`,
    );
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Restore failed",
    };
  }

  revalidatePath("/");
  revalidatePath("/admin/dashboard");

  return { success: true };
}
