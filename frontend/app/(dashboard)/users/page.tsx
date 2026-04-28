"use client";

import { useMemo, useState } from "react";
import { Plus, Lock, KeyRound, UserCog, UserX } from "lucide-react";
import { useUsers, useDeleteUser, useSetUserStatus, useUnlockUser } from "@/hooks/api/use-users";
import { useRoleLookup } from "@/hooks/api/use-roles";
import { useAppAlertDialog } from "@/hooks/use-app-alert-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/layout/data-table";
import type { Column, SortState } from "@/components/layout/data-table";
import { UserDialog } from "./components/user-dialog";
import { ResetPasswordDialog } from "./components/reset-password-dialog";
import { useAuthStore } from "@/stores/auth-store";
import { usePermission } from "@/hooks/use-permission";
import type { UserListItem } from "@/lib/api/user";

const SORT_WHITELIST = new Set(["username", "firstName", "email", "status", "lastLoginAt", "createdAt"]);

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sort, setSort] = useState<SortState | undefined>();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ id: number; username: string } | null>(null);

  const me = useAuthStore((s) => s.user);
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("user:create");
  const canEdit   = hasPermission("user:edit");
  const canDelete = hasPermission("user:delete");
  const canRowAction = canEdit || canDelete;
  const users = useUsers({
    page, limit,
    search: debouncedSearch || undefined,
    sortBy: sort?.column,
    sortOrder: sort?.direction,
  });
  const roleLookup = useRoleLookup();
  const deleteUser = useDeleteUser();
  const setStatus = useSetUserStatus();
  const unlock = useUnlockUser();
  const { confirm, AlertDialogComponent } = useAppAlertDialog();

  function handleSort(column: string, direction: "asc" | "desc" | null) {
    setSort(direction ? { column, direction } : undefined);
    setPage(1);
  }

  const columns = useMemo<Column<UserListItem>[]>(() => [
    {
      title: "ชื่อผู้ใช้",
      dataIndex: "username",
      sorter: true,
      render: (r) => <span className="font-medium">{r.username}</span>,
    },
    {
      title: "ชื่อ-นามสกุล",
      key: "fullname",
      sorter: true,
      sortKey: "firstName",
      render: (r) => `${r.firstName} ${r.lastName}`,
    },
    {
      title: "อีเมล",
      dataIndex: "email",
      sorter: true,
      render: (r) => <span className="text-muted-foreground">{r.email}</span>,
    },
    {
      title: "บทบาท",
      key: "role",
      width: 120,
      render: (r) => <Badge variant="outline">{r.role.description || r.role.name}</Badge>,
    },
    {
      title: "สถานะ",
      dataIndex: "status",
      sorter: true,
      width: 100,
      render: (r) => (
        <Badge variant={r.status === "active" ? "default" : r.status === "locked" ? "destructive" : "secondary"}>
          {r.status === "active" ? "ใช้งาน" : r.status === "locked" ? "ล็อก" : "ปิด"}
        </Badge>
      ),
    },
    {
      title: "เข้าใช้งานล่าสุด",
      dataIndex: "lastLoginAt",
      sorter: true,
      width: 160,
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleString("th-TH") : "—"}
        </span>
      ),
    },
    ...(canRowAction ? [{
      title: "",
      key: "actions",
      width: "fit" as const,
      fixed: "right" as const,
      render: (r: UserListItem) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="action"><UserCog className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canEdit && (
              <DropdownMenuItem onClick={() => { setEditingId(r.id); setDialogOpen(true); }}>แก้ไข</DropdownMenuItem>
            )}
            {canEdit && (
              <DropdownMenuItem onClick={() => setResetTarget({ id: r.id, username: r.username })}>
                <KeyRound className="mr-2 h-4 w-4" />ตั้งรหัสผ่านใหม่
              </DropdownMenuItem>
            )}
            {canEdit && r.status === "locked" && (
              <DropdownMenuItem onClick={() => confirm({ title: "ปลดล็อกผู้ใช้", description: `ปลดล็อก ${r.username}?`, onAction: () => unlock.mutate(r.id) })}>
                <Lock className="mr-2 h-4 w-4" />ปลดล็อก
              </DropdownMenuItem>
            )}
            {canEdit && r.status === "active" && r.id !== me?.id && (
              <DropdownMenuItem onClick={() => confirm({ title: "ปิดใช้งาน", description: `ปิดใช้งาน ${r.username}?`, onAction: () => setStatus.mutate({ id: r.id, status: "disabled" }), actionVariant: "destructive" })}>
                <UserX className="mr-2 h-4 w-4" />ปิดใช้งาน
              </DropdownMenuItem>
            )}
            {canEdit && r.status === "disabled" && (
              <DropdownMenuItem onClick={() => setStatus.mutate({ id: r.id, status: "active" })}>เปิดใช้งาน</DropdownMenuItem>
            )}
            {canEdit && canDelete && <DropdownMenuSeparator />}
            {canDelete && (
              <DropdownMenuItem
                className="text-destructive"
                disabled={r.id === me?.id}
                onClick={() => confirm({ title: "ลบผู้ใช้", description: `ต้องการลบ ${r.username}?`, onAction: () => deleteUser.mutate(r.id), actionText: "ลบ", actionVariant: "destructive" })}
              >
                ลบ
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }] : []),
  ], [me, confirm, unlock, setStatus, deleteUser, canRowAction, canEdit, canDelete]);

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4 h-full overflow-hidden">
      <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">จัดการผู้ใช้งาน</h1>
          <p className="text-sm text-brand-muted">ผู้ใช้งานทั้งหมด {users.data?.total ?? 0} คน</p>
        </div>
        {canCreate && (
          <Button onClick={() => { setEditingId(null); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />เพิ่มผู้ใช้
          </Button>
        )}
      </div>

      <div className="shrink-0">
        <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="max-w-sm" />
      </div>

      <DataTable<UserListItem>
        columns={columns}
        dataSource={users.data?.data ?? []}
        loading={users.isLoading}
        rowKey="id"
        sort={sort}
        onSort={(col, dir) => SORT_WHITELIST.has(col) && handleSort(col, dir)}
        className="flex-1 min-h-0"
        pagination={{ current: page, limit, total: users.data?.total ?? 0, onChange: (p, l) => { setPage(p); setLimit(l); } }}
      />

      <UserDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditingId(null); }}
        editingId={editingId}
        roles={roleLookup.data ?? []}
      />
      <ResetPasswordDialog target={resetTarget} onOpenChange={(o) => { if (!o) setResetTarget(null); }} />
      {AlertDialogComponent}
    </div>
  );
}
