"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Video,
  Activity,
  AntennaIcon,
  Users,
  Shield,
  ScrollText,
  UserCircle,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  { href: "/camera",      label: "บันทึกกล้อง",      icon: Video,            permission: "camera_archive:view" },
  { href: "/sensor",      label: "ข้อมูลเซนเซอร์",    icon: Activity,         permission: "sensor_archive:view" },
  { href: "/poles",       label: "จัดการเสาสัญญาณ",  icon: AntennaIcon,      permission: "pole:view" },
  { href: "/users",       label: "จัดการผู้ใช้",      icon: Users,            permission: "user:view" },
  { href: "/roles",       label: "บทบาทและสิทธิ์",   icon: Shield,           permission: "role:view" },
  { href: "/system-logs", label: "บันทึกกิจกรรม",    icon: ScrollText,       permission: "system_log:view" },
  { href: "/profile",     label: "โปรไฟล์",          icon: UserCircle },
];

function useVisibleNav(): NavItem[] {
  const { hasPermission } = usePermission();
  return NAV_ITEMS.filter((item) => !item.permission || hasPermission(item.permission));
}

function SiderNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const visible = useVisibleNav();

  return (
    <nav className="flex-1 overflow-y-auto py-3 px-2">
      {visible.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
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
  );
}

/** Desktop sidebar — fixed column ≥ lg */
export function AppSider() {
  return (
    <aside className="hidden lg:flex flex-col h-full w-52 shrink-0 bg-sidebar border-r border-sidebar-border">
      <SiderNav />
    </aside>
  );
}

/** Mobile/tablet hamburger — opens nav drawer < lg */
export function AppSiderMobileTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="เปิดเมนู"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 max-w-[80vw] p-0 bg-sidebar">
        <SheetHeader>
          <SheetTitle>เมนู</SheetTitle>
          <SheetDescription className="sr-only">รายการเมนูหลัก</SheetDescription>
        </SheetHeader>
        <SiderNav onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
