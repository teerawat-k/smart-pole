// Seed runner — เรียง parent → child (FK) — idempotent ทุก step
import { prisma } from "@/plugins/prisma";

async function main() {
  console.log("🌱 Seeding...");
  // import { seedUsers } from "./users";
  // await seedUsers();
  console.log("✅ Seed completed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
