import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create Prisma Client with PostgreSQL adapter
const createPrismaClient = () => {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });

  const client = new PrismaClient({
    adapter,
  });

  return client;
};

// Singleton pattern for Prisma Client
// This prevents multiple instances in development
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
const disconnectPrisma = async () => {
  await prisma.$disconnect();
};

process.on("SIGTERM", disconnectPrisma);
process.on("SIGINT", disconnectPrisma);

export default prisma;
