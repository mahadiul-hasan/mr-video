import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaPgPool: Pool | undefined;
};

function getRequiredDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not defined");
  }
  return url;
}

function numberFromEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function createPgPool() {
  return new Pool({
    connectionString: getRequiredDatabaseUrl(),
    max: numberFromEnv("DATABASE_POOL_MAX", 10),
    idleTimeoutMillis: numberFromEnv("DATABASE_IDLE_TIMEOUT_MS", 30_000),
    connectionTimeoutMillis: numberFromEnv("DATABASE_CONNECTION_TIMEOUT_MS", 5_000),
    maxUses: numberFromEnv("DATABASE_POOL_MAX_USES", 7_500),
    allowExitOnIdle: process.env.NODE_ENV !== "production",
  });
}

function createPrismaClient() {
  const pool = globalForPrisma.prismaPgPool ?? createPgPool();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prismaPgPool = pool;
  }

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log:
      process.env.PRISMA_QUERY_LOG === "true"
        ? ["query", "error", "warn"]
        : ["error", "warn"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

let isDisconnecting = false;

async function disconnectPrisma() {
  if (isDisconnecting) return;
  isDisconnecting = true;

  await prisma.$disconnect().catch(() => {});
  await globalForPrisma.prismaPgPool?.end().catch(() => {});
}

process.once("SIGTERM", () => {
  void disconnectPrisma().finally(() => process.exit(0));
});

process.once("SIGINT", () => {
  void disconnectPrisma().finally(() => process.exit(0));
});

export default prisma;
