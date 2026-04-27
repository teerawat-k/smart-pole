import { prisma } from "@/plugins/prisma";
import { hashPassword } from "@/common/utils/password";

// ⚠️ Dev/test default password — ห้ามใช้ใน production
// Seed จะ upsert password เป็น 12345 (เพื่อให้ login ได้ทันทีตอน dev)
const DEFAULT_ADMIN = {
  username: "admin",
  email: "admin@smartpole.local",
  firstName: "System",
  lastName: "Admin",
  mobileNo: "000-000-0000",
  password: "12345",
};

const SEED_USER_ID = 0;

export async function seedUsers(): Promise<void> {
  const adminRole = await prisma.role.findUnique({ where: { name: "admin" } });
  if (!adminRole) throw new Error("admin role missing — run seedRoles first");

  const passwordHash = await hashPassword(DEFAULT_ADMIN.password);

  const user = await prisma.user.upsert({
    where: { username: DEFAULT_ADMIN.username },
    update: {
      // re-hash password ทุก seed (กัน hash format เปลี่ยนระหว่าง dev)
      password: passwordHash,
      roleId: adminRole.id,
      status: "active",
      loginFailCount: 0,
      lockedUntil: null,
      lockedReason: null,
    },
    create: {
      username: DEFAULT_ADMIN.username,
      email: DEFAULT_ADMIN.email,
      firstName: DEFAULT_ADMIN.firstName,
      lastName: DEFAULT_ADMIN.lastName,
      mobileNo: DEFAULT_ADMIN.mobileNo,
      password: passwordHash,
      roleId: adminRole.id,
      status: "active",
      createdBy: SEED_USER_ID,
    },
  });
  console.log(`✅ Admin upserted: ${user.username} / ${DEFAULT_ADMIN.password} (id=${user.id})`);
}
