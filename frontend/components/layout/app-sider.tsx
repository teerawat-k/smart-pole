"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Video,
  Activity,
  Bell,
  AntennaIcon,
  Users,
  Shield,
  ScrollText,
  History,
  UserCircle,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useLogout } from "@/hooks/api/use-auth";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: string; // "module:action" — ถ้ามีต้องตรวจ
  isAdmin?: boolean; // shortcut: ต้องเป็น admin (รอ permissions populate ผ่าน /me)
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/camera", label: "ภาพกล้อง", icon: Video },
  { href: "/sensor", label: "ข้อมูล Sensor", icon: Activity },
  { href: "/alerts", label: "การแจ้งเตือน", icon: Bell },
  { href: "/poles", label: "จัดการเสา", icon: AntennaIcon, isAdmin: true },
  { href: "/users", label: "จัดการผู้ใช้", icon: Users, isAdmin: true },
  { href: "/roles", label: "Role & Permission", icon: Shield, isAdmin: true },
  { href: "/system-logs", label: "System Log", icon: ScrollText, isAdmin: true },
  { href: "/audit-logs", label: "Audit Log", icon: History, isAdmin: true },
  { href: "/profile", label: "โปรไฟล์", icon: UserCircle },
];

export function AppSider() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = user?.role === "admin" || user?.isSystemRole === true;
  const visible = NAV_ITEMS.filter((item) => !item.isAdmin || isAdmin);

  const Logo = () => (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/60 border border-[#B2EBF2] flex-shrink-0">
        <Image src="/logo.png" alt="Smart Pole" width={32} height={32} className="object-contain" />
      </div>
      <div>
        <div className="text-[#0D47A1] font-bold text-sm tracking-wide">Smart Pole</div>
        <div className="text-[#4A90A4] text-[9px] tracking-widest uppercase">Management</div>
      </div>
    </div>
  );

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = pathname === item.href || pathname?.startsWith(item.href + "/");
    const Icon = item.icon;
    return (
      <Link
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg mb-1 text-sm transition-all duration-150",
          active
            ? "bg-[#1565C0] text-white font-medium shadow-sm"
            : "text-[#1E3A5F] hover:bg-[#B2EBF2] hover:text-[#0D47A1]",
        )}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  const Footer = () => (
    <div className="px-4 py-3 border-t border-[#B2EBF2] space-y-1">
      <div className="text-[#1E3A5F] text-xs truncate font-medium">{user?.name || user?.username}</div>
      <div className="text-[#4A90A4] text-[10px] mb-2">{user?.role}</div>
      <button
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        className="flex items-center gap-1.5 text-xs text-[#4A90A4] hover:text-[#0D47A1] transition-colors disabled:opacity-50"
      >
        <LogOut className="h-3.5 w-3.5" />
        ออกจากระบบ
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col h-screen w-52 flex-shrink-0 sticky top-0"
        style={{ background: "#E1FEFE" }}
      >
        <div className="px-4 py-4 border-b border-[#B2EBF2]">
          <Logo />
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {visible.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>
        <Footer />
      </aside>

      {/* Mobile top bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-50 border-b border-[#B2EBF2] flex items-center justify-between px-4 py-2"
        style={{ background: "#E1FEFE" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/60 border border-[#B2EBF2] flex items-center justify-center">
            <Image src="/logo.png" alt="Smart Pole" width={24} height={24} className="object-contain" />
          </div>
          <span className="text-[#0D47A1] font-bold text-sm">Smart Pole</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="เมนู"
          className="text-[#1E3A5F] px-2"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <aside
            className="absolute top-0 left-0 h-full w-64 flex flex-col border-r border-[#B2EBF2]"
            style={{ background: "#E1FEFE" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-[#B2EBF2]">
              <Logo />
              <button onClick={() => setMobileOpen(false)} className="text-[#4A90A4]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-3 px-2">
              {visible.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </nav>
            <Footer />
          </aside>
        </div>
      )}

      {/* Mobile spacing */}
      <div className="md:hidden h-12 flex-shrink-0" />
    </>
  );
}
