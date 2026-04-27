import { prisma } from "@/plugins/prisma";
import { hashPassword } from "@/common/utils/password";

const DEFAULT_ADMIN = {
  username: "admin",
  email: "admin@smartpole.local",
  firstName: "System",
  lastName: "Admin",
  mobileNo: "000-000-0000",
  password: "Admin@1234",
};

const SEED_USER_ID = 0;

export async function seedUsers(): Promise<void> {
  const adminRole = await prisma.role.findUnique({ where: { name: "admin" } });
  if (!adminRole) throw new Error("admin role missing — run seedRoles first");

  const existing = await prisma.user.findUnique({ where: { username: DEFAULT_ADMIN.username } });
  if (existing) {
    console.log(`✅ Admin user already exists (id=${existing.id})`);
    return;
  }

  const passwordHash = await hashPassword(DEFAULT_ADMIN.password);
  const user = await prisma.user.create({
    data: {
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
  console.log(`✅ Default admin created: ${user.username} / Admin@1234 (id=${user.id})`);
}
