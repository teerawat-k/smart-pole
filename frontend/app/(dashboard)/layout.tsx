"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { AppSider } from "@/components/layout/app-sider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [hasHydrated, isAuthenticated, router]);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F7FF]">
        <div className="text-[#4A90A4] text-sm">กำลังโหลด...</div>
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen bg-[#F0F7FF]">
      <AppSider />
      <main className="flex-1 flex flex-col overflow-hidden w-full pt-12 md:pt-0">{children}</main>
    </div>
  );
}
