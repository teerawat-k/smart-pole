import { prisma } from "@/plugins/prisma";

// ── Permission seed — รายการ module:action ของระบบ ────────────────────
// เพิ่มเมื่อมี module ใหม่ — ระบบจะ upsert (idempotent)

interface PermissionSeed {
  module: string;
  action: string;
  category: string;
  categoryLabel: string;
  moduleLabel: string;
  actionLabel: string;
  actionDescription?: string;
}

const PERMISSIONS: PermissionSeed[] = [
  // ── Monitoring ──
  ...buildModule("dashboard", "Monitoring", "monitoring", "Dashboard", ["view"]),
  ...buildModule("camera_archive", "Monitoring", "monitoring", "Camera Archive", ["view", "delete", "export"]),
  ...buildModule("sensor_archive", "Monitoring", "monitoring", "Sensor Archive", ["view", "export"]),
  ...buildModule("alert", "Monitoring", "monitoring", "Alert", ["view", "edit"]),

  // ── Master ──
  ...buildModule("pole", "ข้อมูลหลัก", "master", "เสาสัญญาณ", ["view", "create", "edit", "delete"]),

  // ── Admin ──
  ...buildModule("user", "Admin", "admin", "ผู้ใช้งาน", ["view", "create", "edit", "delete"]),
  ...buildModule("role", "Admin", "admin", "Role & Permission", ["view", "create", "edit", "delete"]),
  ...buildModule("audit_log", "Admin", "admin", "Audit Log", ["view", "export"]),
  ...buildModule("system_log", "Admin", "admin", "System Log", ["view", "export"]),

  // ── Personal (ทุกคนใช้ได้) ──
  ...buildModule("my_profile", "ส่วนตัว", "personal", "โปรไฟล์ของฉัน", ["view", "edit"]),
];

function buildModule(
  module: string,
  categoryLabel: string,
  category: string,
  moduleLabel: string,
  actions: string[],
): PermissionSeed[] {
  const actionLabels: Record<string, string> = {
    view: "ดูข้อมูล",
    create: "สร้าง",
    edit: "แก้ไข",
    delete: "ลบ",
    export: "ส่งออก",
  };
  return actions.map((action) => ({
    module,
    action,
    category,
    categoryLabel,
    moduleLabel,
    actionLabel: actionLabels[action] ?? action,
    actionDescription: undefined,
  }));
}

export async function seedPermissions(): Promise<void> {
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { module_action: { module: p.module, action: p.action } },
      update: {
        category: p.category,
        categoryLabel: p.categoryLabel,
        moduleLabel: p.moduleLabel,
        actionLabel: p.actionLabel,
        actionDescription: p.actionDescription,
      },
      create: p,
    });
  }
  console.log(`✅ Seeded ${PERMISSIONS.length} permissions`);
}
