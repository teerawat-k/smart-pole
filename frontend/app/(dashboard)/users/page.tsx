"use client";

import { useState } from "react";
import { Plus, Lock, KeyRound, UserCog, UserX } from "lucide-react";
import { useUsers, useDeleteUser, useSetUserStatus, useUnlockUser } from "@/hooks/api/use-users";
import { useRoleLookup } from "@/hooks/api/use-roles";
import { useAppAlertDialog } from "@/hooks/use-app-alert-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { UserDialog } from "./components/user-dialog";
import { ResetPasswordDialog } from "./components/reset-password-dialog";
import { useAuthStore } from "@/stores/auth-store";

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ id: number; username: string } | null>(null);

  const me = useAuthStore((s) => s.user);
  const users = useUsers({ page, limit: 20, search: debouncedSearch || undefined });
  const roleLookup = useRoleLookup();
  const deleteUser = useDeleteUser();
  const setStatus = useSetUserStatus();
  const unlock = useUnlockUser();
  const { confirm, AlertDialogComponent } = useAppAlertDialog();

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-[#0D47A1]">จัดการผู้ใช้งาน</h1>
          <p className="text-sm text-[#4A90A4]">ผู้ใช้งานทั้งหมด {users.data?.total ?? 0} คน</p>
        </div>
        <Button
          onClick={() => {
            setEditingId(null);
            setDialogOpen(true);
          }}
          className="bg-[#1565C0] hover:bg-[#0D47A1]"
        >
          <Plus className="mr-2 h-4 w-4" />
          เพิ่มผู้ใช้
        </Button>
      </div>

      <Input
        placeholder="ค้นหา username / email / ชื่อ..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="max-w-sm"
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F0F7FF] border-b">
                <tr>
                  <th className="px-4 py-2 text-left">Username</th>
                  <th className="px-4 py-2 text-left">ชื่อ-นามสกุล</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Role</th>
                  <th className="px-4 py-2 text-left">สถานะ</th>
                  <th className="px-4 py-2 text-left">Last Login</th>
                  <th className="px-4 py-2 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {users.isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      กำลังโหลด...
                    </td>
                  </tr>
                ) : users.data?.data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      ไม่มีข้อมูล
                    </td>
                  </tr>
                ) : (
                  users.data?.data.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-2 font-medium">{u.username}</td>
                      <td className="px-4 py-2">
                        {u.firstName} {u.lastName}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-2">
                        <Badge variant="outline">{u.role.description || u.role.name}</Badge>
                      </td>
                      <td className="px-4 py-2">
                        <Badge
                          variant={
                            u.status === "active"
                              ? "default"
                              : u.status === "locked"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {u.status === "active" ? "ใช้งาน" : u.status === "locked" ? "ล็อก" : "ปิด"}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("th-TH") : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="action">
                              <UserCog className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingId(u.id);
                                setDialogOpen(true);
                              }}
                            >
                              แก้ไข
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setResetTarget({ id: u.id, username: u.username })}>
                              <KeyRound className="mr-2 h-4 w-4" />
                              ตั้งรหัสผ่านใหม่
                            </DropdownMenuItem>
                            {u.status === "locked" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  confirm({
                                    title: "ปลดล็อกผู้ใช้",
                                    description: `ปลดล็อก ${u.username}?`,
                                    onAction: () => unlock.mutate(u.id),
                                  });
                                }}
                              >
                                <Lock className="mr-2 h-4 w-4" />
                                ปลดล็อก
                              </DropdownMenuItem>
                            )}
                            {u.status === "active" && u.id !== me?.id && (
                              <DropdownMenuItem
                                onClick={() => {
                                  confirm({
                                    title: "ปิดใช้งาน",
                                    description: `ปิดใช้งาน ${u.username}?`,
                                    onAction: () => setStatus.mutate({ id: u.id, status: "disabled" }),
                                    actionVariant: "destructive",
                                  });
                                }}
                              >
                                <UserX className="mr-2 h-4 w-4" />
                                ปิดใช้งาน
                              </DropdownMenuItem>
                            )}
                            {u.status === "disabled" && (
                              <DropdownMenuItem
                                onClick={() => setStatus.mutate({ id: u.id, status: "active" })}
                              >
                                เปิดใช้งาน
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              disabled={u.id === me?.id}
                              onClick={() => {
                                confirm({
                                  title: "ลบผู้ใช้",
                                  description: `ต้องการลบ ${u.username}?`,
                                  onAction: () => deleteUser.mutate(u.id),
                                  actionText: "ลบ",
                                  actionVariant: "destructive",
                                });
                              }}
                            >
                              ลบ
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {users.data && users.data.total > 20 && (
        <div className="flex justify-center gap-2 pt-4">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            ก่อนหน้า
          </Button>
          <span className="px-4 py-1 text-sm">
            หน้า {page} / {Math.ceil(users.data.total / 20)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page * 20 >= users.data.total}
            onClick={() => setPage(page + 1)}
          >
            ถัดไป
          </Button>
        </div>
      )}

      <UserDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditingId(null);
        }}
        editingId={editingId}
        roles={roleLookup.data ?? []}
      />

      <ResetPasswordDialog
        target={resetTarget}
        onOpenChange={(o) => {
          if (!o) setResetTarget(null);
        }}
      />

      {AlertDialogComponent}
    </div>
  );
}
