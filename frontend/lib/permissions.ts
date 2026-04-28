// ── Single source of truth: route ↔ permission key ──────────────
// ใช้ทั้ง sidebar (menu visibility) และ useRouteGuard (page guard)

export interface NavPermission {
  /** path prefix ใน app router */
  href: string;
  /** module:view permission ที่ต้องมีถึงเข้าได้ — undefined = ทุกคนเข้าได้ */
  permission?: string;
}

export const NAV_PERMISSIONS: NavPermission[] = [
  { href: "/dashboard",   permission: "dashboard:view" },
  { href: "/camera",      permission: "camera_archive:view" },
  { href: "/sensor",      permission: "sensor_archive:view" },
  { href: "/alerts",      permission: "alert:view" },
  { href: "/poles",       permission: "pole:view" },
  { href: "/users",       permission: "user:view" },
  { href: "/roles",       permission: "role:view" },
  { href: "/system-logs", permission: "system_log:view" },
  { href: "/audit-logs",  permission: "system_log:view" },
  { href: "/profile" }, // ทุกคนเข้าโปรไฟล์ตัวเองได้
];

export function findRoutePermission(pathname: string): string | undefined {
  const match = NAV_PERMISSIONS.find(
    (n) => pathname === n.href || pathname.startsWith(n.href + "/"),
  );
  return match?.permission;
}
