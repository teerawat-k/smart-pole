import { useAuthStore } from "@/stores/auth-store";

export function usePermission() {
  const user = useAuthStore((s) => s.user);
  const isSystemRole = user?.isSystemRole ?? false;
  const permissions = user?.permissions ?? [];
  const permissionSet = new Set(permissions);

  return {
    hasPermission: (key: string) => isSystemRole || permissionSet.has(key),
    /** ตรวจว่ามี menus:<action> permission หรือไม่ */
    hasMenuPermission: (action: string) => isSystemRole || permissionSet.has(`menus:${action}`),
    /** ตรวจว่ามี permission ที่ขึ้นต้นด้วย menus:<prefix> อย่างน้อย 1 ตัว */
    hasAnyMenuPrefix: (prefix: string) =>
      isSystemRole || permissions.some((p) => p.startsWith(`menus:${prefix}`)),
  };
}
