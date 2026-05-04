import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const username = process.env.ADMIN_USERNAME!;
  const password = process.env.ADMIN_PASSWORD!;

  const existing = await prisma.admin.findUnique({
    where: { username },
  });

  if (existing) {
    console.log("Admin already exists");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.admin.create({
    data: {
      username,
      passwordHash,
    },
  });

  console.log("✅ Admin created");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
