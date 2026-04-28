import { useAuthStore } from "@/stores/auth-store";

export function usePermission() {
  const user = useAuthStore((s) => s.user);
  const isSystemRole = user?.isSystemRole ?? false;
  const permissions = user?.permissions ?? [];
  const permissionSet = new Set(permissions);

  return {
    /** ตรวจ permission แบบเต็ม "module:action" — system role bypass ทั้งหมด */
    hasPermission: (key: string) => isSystemRole || permissionSet.has(key),
    /** มี action ใดๆ ของ module นี้หรือไม่ (ใช้สำหรับ menu visibility) */
    hasAnyOfModule: (module: string) =>
      isSystemRole || permissions.some((p) => p.startsWith(`${module}:`)),
    isSystemRole,
  };
}
