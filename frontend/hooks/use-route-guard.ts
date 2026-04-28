import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { usePermission } from "@/hooks/use-permission";
import { findRoutePermission } from "@/lib/permissions";

/**
 * Redirect ไป /dashboard เมื่อผู้ใช้ไม่มี permission สำหรับ route ปัจจุบัน
 * - ใช้ map กลางจาก `lib/permissions.ts` (ไม่ duplicate กับ AppSider)
 * - หน้าไม่มี permission requirement (เช่น /profile) → ปล่อยผ่านเสมอ
 */
export function useRouteGuard(): void {
  const pathname = usePathname();
  const router = useRouter();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const { hasPermission } = usePermission();

  useEffect(() => {
    if (!hasHydrated) return;
    const required = findRoutePermission(pathname ?? "");
    if (!required) return; // public route
    if (!hasPermission(required)) router.replace("/dashboard");
  }, [pathname, router, hasHydrated, hasPermission]);
}
