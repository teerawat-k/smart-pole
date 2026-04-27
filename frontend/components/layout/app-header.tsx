"use client";

import Image from "next/image";
import { LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth-store";

const ROLE_LABEL: Record<string, string> = {
  admin: "ผู้ดูแลระบบ",
  user: "ผู้ใช้งาน",
};

interface AppHeaderProps {
  onLogout?: () => void;
}

export function AppHeader({ onLogout }: AppHeaderProps) {
  const user = useAuthStore((state) => state.user);

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center border-b bg-background px-4 gap-3 shrink-0">
      <div className="flex items-center gap-2">
        <Image src="/logo.png" alt="Smart Pole" width={32} height={32} />
        <span className="font-bold text-[#0D47A1] hidden md:block">Smart Pole</span>
      </div>

      <div className="flex-1" />

      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 rounded-full p-0 bg-primary hover:bg-primary/90"
              aria-label="เมนูผู้ใช้งาน"
            >
              <UserRound className="h-4 w-4 text-primary-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-52" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <UserRound className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="flex flex-col min-w-0">
                  <p className="text-sm font-medium truncate">{user.name || user.username}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {ROLE_LABEL[user.role] ?? user.role}
                  </p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer gap-2"
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4 text-destructive" />
              ออกจากระบบ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}
