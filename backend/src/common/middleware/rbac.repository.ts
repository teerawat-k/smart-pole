import { prisma } from "@/plugins/prisma";

// ── Note ────────────────────────────────────────────────────
// Role + RolePermission models ทำใน E02 (Module + Permission master)
// ตอนนี้ skeleton — caller จะได้ result เป็น null (= ไม่มี permission)
// เมื่อ schema พร้อม → uncomment query

export interface RoleWithPermissions {
  isSystem: boolean;
  permissions: { permission: { module: string; action: string } }[];
}

export async function fetchRoleWithPermissions(_roleName: string): Promise<RoleWithPermissions | null> {
  // TODO(E02): เปิด query เมื่อ Role/RolePermission schema พร้อม
  // return prisma.role.findFirst({
  //   where: { name: roleName, deletedAt: null },
  //   select: {
  //     isSystem: true,
  //     permissions: {
  //       select: { permission: { select: { module: true, action: true } } },
  //     },
  //   },
  // });
  void prisma; // กัน unused import warning
  return null;
}
