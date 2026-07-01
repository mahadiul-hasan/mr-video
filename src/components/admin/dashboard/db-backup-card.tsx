"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createDatabaseBackup,
  restoreDatabaseBackup,
} from "@/app/actions/db-backup";

export function DbBackupCard() {
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleBackup() {
    setBusy(true);
    try {
      const result = await createDatabaseBackup();
      if (!result.success || !result.sql || !result.filename) {
        window.alert(result.error || "Backup failed");
        return;
      }

      const blob = new Blob([result.sql], {
        type: "application/sql",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Backup failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore(formData: FormData) {
    if (!window.confirm("Restore backup and replace current database data?")) {
      return;
    }

    setBusy(true);
    try {
      const result = await restoreDatabaseBackup(formData);
      if (!result.success) {
        window.alert(result.error || "Restore failed");
        return;
      }
      window.alert("Database restored successfully");
      window.location.reload();
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Database Backup</CardTitle>
        <CardDescription>Export or restore PostgreSQL table data only</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-2">
        <div className="rounded-lg border border-border p-4">
          <p className="mb-3 text-sm font-medium">Backup</p>
          <Button onClick={handleBackup} disabled={busy} className="gap-2">
            <Download className="h-4 w-4" />
            Download Backup
          </Button>
        </div>

        <form action={handleRestore} className="rounded-lg border border-border p-4">
          <p className="mb-3 text-sm font-medium">Restore</p>
          <div className="flex flex-col gap-3">
            <input
              ref={fileRef}
              type="file"
              name="backupFile"
              accept=".sql,application/sql,text/plain"
              required
              className="rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium"
            />
            <Button type="submit" variant="outline" disabled={busy} className="gap-2">
              <Upload className="h-4 w-4" />
              Restore
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
