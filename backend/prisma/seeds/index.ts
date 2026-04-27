// Seed runner — เรียง parent → child (FK) — idempotent ทุก step
import "../../src/config/env";
import { prisma } from "@/plugins/prisma";
import { seedPermissions } from "./permissions";
import { seedRoles } from "./roles";
import { seedUsers } from "./users";

async function main() {
  console.log("🌱 Seeding...");
  await seedPermissions();
  await seedRoles();
  await seedUsers();
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
