import { prisma } from "@/plugins/prisma";

// ── Default roles ────────────────────────────────────────
// admin: bypass ทุก permission (isSystem=true) — ห้ามแก้ไข/ลบ
// user : ผู้ใช้งานทั่วไป (isSystem=false) — admin ปรับสิทธิ์ผ่าน UI ได้

const DEFAULT_ROLES = [
  { name: "admin", description: "ผู้ดูแลระบบ — เข้าถึงทุกฟังก์ชัน", isSystem: true },
  { name: "user",  description: "ผู้ใช้งานทั่วไป",                    isSystem: false },
];

// สิทธิ์เริ่มต้นสำหรับ user role — view-only ฝั่ง monitoring
const USER_ROLE_PERMISSIONS: { module: string; actions: string[] }[] = [
  { module: "dashboard",      actions: ["view"] },
  { module: "camera_archive", actions: ["view"] },
  { module: "sensor_archive", actions: ["view"] },
];

export async function seedRoles(): Promise<void> {
  for (const role of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description, isSystem: role.isSystem },
      create: { ...role }, // createdBy = null (system seed)
    });
  }

  // user role permissions — เฉพาะตอนเริ่มต้น (สถานะ "ยังไม่มี permission ใดๆ")
  // หากเคย seed/แก้ไขใน UI แล้ว → คงค่าเดิม ไม่ overwrite
  const userRole = await prisma.role.findUnique({ where: { name: "user" } });
  if (!userRole) throw new Error("user role missing after seed");

  const existingCount = await prisma.rolePermission.count({ where: { roleId: userRole.id } });
  if (existingCount === 0) {
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
    console.log("✅ Seeded default permissions for user role");
  } else {
    console.log("↻ user role already has permissions — skip default seed");
  }

  console.log("✅ Seeded roles (admin system, user editable)");
}
