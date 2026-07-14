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

export async function seedUsers(): Promise<void> {
  const adminRole = await prisma.role.findFirst({ where: { name: "admin", deletedAt: null } });
  if (!adminRole) throw new Error("admin role missing — run seedRoles first");

  const passwordHash = await hashPassword(DEFAULT_ADMIN.password);

  // username ไม่ใช่ @unique แล้ว (partial unique) → findFirst + create/update guard แทน upsert
  const existing = await prisma.user.findFirst({
    where: { username: DEFAULT_ADMIN.username, deletedAt: null },
    select: { id: true },
  });
  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          password: passwordHash,
          roleId: adminRole.id,
          status: "active",
          loginFailCount: 0,
          lockedUntil: null,
          lockedReason: null,
        },
      })
    : await prisma.user.create({
        data: {
          username: DEFAULT_ADMIN.username,
          email: DEFAULT_ADMIN.email,
          firstName: DEFAULT_ADMIN.firstName,
          lastName: DEFAULT_ADMIN.lastName,
          mobileNo: DEFAULT_ADMIN.mobileNo,
          password: passwordHash,
          roleId: adminRole.id,
          status: "active",
          // createdBy = null (initial admin)
        },
      });
  console.log(`✅ Admin upserted: ${user.username} / ${DEFAULT_ADMIN.password} (id=${user.id})`);
}
