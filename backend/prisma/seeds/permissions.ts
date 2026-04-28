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

// แต่ละ entry สะท้อน action ที่ UI ปัจจุบันรองรับจริงเท่านั้น
// (ลบ action ที่ไม่มีปุ่ม/ฟังก์ชันใน UI — เพื่อไม่ให้สิทธิ์ที่ไม่มีผลปรากฏใน dialog)
const PERMISSIONS: PermissionSeed[] = [
  // ── Monitoring ──
  ...buildModule("dashboard",      "Monitoring", "monitoring", "แดชบอร์ด",         ["view"]),
  ...buildModule("camera_archive", "Monitoring", "monitoring", "บันทึกกล้อง",      ["view", "delete"]),
  ...buildModule("sensor_archive", "Monitoring", "monitoring", "ข้อมูลเซนเซอร์",   ["view"]),

  // ── Master ──
  ...buildModule("pole", "ข้อมูลหลัก", "master", "เสาสัญญาณ", ["view", "create", "edit", "delete"]),

  // ── Admin ──
  ...buildModule("user",       "Admin", "admin", "ผู้ใช้งาน",        ["view", "create", "edit", "delete"]),
  ...buildModule("role",       "Admin", "admin", "บทบาทและสิทธิ์",  ["view", "create", "edit", "delete"]),
  ...buildModule("system_log", "Admin", "admin", "บันทึกกิจกรรม",   ["view"]),
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
