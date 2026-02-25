import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("🌱 Seeding database...");

  // 1) Seed admin developer
  const passwordHash = await bcrypt.hash("admin123", 10);

  const admin = await prisma.developers.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      email: "admin@example.com",
      display_name: "Admin",
      password_hash: passwordHash,
    },
    update: {
      display_name: "Admin",
      password_hash: passwordHash,
    },
  });

  console.log(`✅ Admin developer seeded: ${admin.email}`);

  // 2) Seed demo API
  const demoApi = await prisma.apis.upsert({
    where: { id: "00000000-0000-0000-0000-000000000010" },
    create: {
      id: "00000000-0000-0000-0000-000000000010",
      owner_developer_id: admin.id,
      name: "Demo User Management API",
      description: "A sample API for managing users — seeded for demo purposes",
      base_url: "https://api.example.com/v1",
      version: "1.0.0",
      status: "ACTIVE",
    },
    update: {
      name: "Demo User Management API",
      description: "A sample API for managing users — seeded for demo purposes",
    },
  });

  console.log(`✅ Demo API seeded: ${demoApi.name}`);

  await prisma.$disconnect();
  await pool.end();
  console.log("🌱 Seeding complete!");
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
