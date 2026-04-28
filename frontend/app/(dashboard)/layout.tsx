"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { AppSider } from "@/components/layout/app-sider";
import { AppHeader } from "@/components/layout/app-header";
import { MeLoader } from "@/components/shared/me-loader";
import { useRouteGuard } from "@/hooks/use-route-guard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  useRouteGuard();

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [hasHydrated, isAuthenticated, router]);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-brand-muted text-sm">กำลังโหลด...</div>
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <div className="h-screen flex flex-col bg-white">
      <MeLoader />
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <AppSider />
        <main className="flex-1 overflow-hidden bg-white">{children}</main>
      </div>
    </div>
  );
}
