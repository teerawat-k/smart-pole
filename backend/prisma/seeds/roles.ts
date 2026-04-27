import { prisma } from "@/plugins/prisma";

// ── Default system roles ─────────────────────────────────
// admin: bypass ทุก permission (isSystem=true)
// user: monitoring + my_profile only

const SYSTEM_ROLES = [
  { name: "admin", description: "ผู้ดูแลระบบ — เข้าถึงทุกฟังก์ชัน", isSystem: true },
  { name: "user", description: "ผู้ใช้งานทั่วไป", isSystem: true },
];

const USER_ROLE_PERMISSIONS: { module: string; actions: string[] }[] = [
  { module: "dashboard", actions: ["view"] },
  { module: "camera_archive", actions: ["view"] },
  { module: "sensor_archive", actions: ["view"] },
  { module: "alert", actions: ["view"] },
  { module: "my_profile", actions: ["view", "edit"] },
];

const SEED_USER_ID = 0; // SYSTEM_USER_ID — initial seed (ก่อนมี admin user จริง)

export async function seedRoles(): Promise<void> {
  for (const role of SYSTEM_ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description, isSystem: role.isSystem },
      create: { ...role, createdBy: SEED_USER_ID },
    });
  }

  // user role permissions
  const userRole = await prisma.role.findUnique({ where: { name: "user" } });
  if (!userRole) throw new Error("user role missing after seed");

  // ลบ permission ของ user role ทั้งหมด → re-create ให้ตรง spec ปัจจุบัน
  await prisma.rolePermission.deleteMany({ where: { roleId: userRole.id } });

  for (const { module, actions } of USER_ROLE_PERMISSIONS) {
    for (const action of actions) {
      const perm = await prisma.permission.findUnique({
        where: { module_action: { module, action } },
      });
      if (!perm) continue;
      await prisma.rolePermission.create({
        data: { roleId: userRole.id, permissionId: perm.id },
      });
    }
  }

  console.log("✅ Seeded system roles (admin + user) with permissions");
}
