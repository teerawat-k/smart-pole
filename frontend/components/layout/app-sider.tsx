"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Video,
  Activity,
  Bell,
  AntennaIcon,
  Users,
  Shield,
  ScrollText,
  UserCircle,
} from "lucide-react";
import { usePermission } from "@/hooks/use-permission";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** "module:action" key — undefined = ทุกคนเข้าได้ */
  permission?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",   label: "แดชบอร์ด",        icon: LayoutDashboard, permission: "dashboard:view" },
  { href: "/camera",      label: "ภาพกล้อง",         icon: Video,            permission: "camera_archive:view" },
  { href: "/sensor",      label: "ข้อมูลเซนเซอร์",    icon: Activity,         permission: "sensor_archive:view" },
  { href: "/alerts",      label: "การแจ้งเตือน",     icon: Bell,             permission: "alert:view" },
  { href: "/poles",       label: "จัดการเสาสัญญาณ",  icon: AntennaIcon,      permission: "pole:view" },
  { href: "/users",       label: "จัดการผู้ใช้",      icon: Users,            permission: "user:view" },
  { href: "/roles",       label: "บทบาทและสิทธิ์",   icon: Shield,           permission: "role:view" },
  { href: "/system-logs", label: "บันทึกกิจกรรม",    icon: ScrollText,       permission: "system_log:view" },
  { href: "/profile",     label: "โปรไฟล์",          icon: UserCircle },
];

export function AppSider() {
  const pathname = usePathname();
  const { hasPermission } = usePermission();

  const visible = NAV_ITEMS.filter((item) => !item.permission || hasPermission(item.permission));

  return (
    <aside className="flex flex-col h-full w-52 shrink-0 bg-sidebar border-r border-sidebar-border">
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {visible.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg mb-1 text-sm transition-all duration-150",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
