"use client";

import { useMemo, useState } from "react";
import { Plus, Settings2, Trash2 } from "lucide-react";
import { useRoles, useDeleteRole } from "@/hooks/api/use-roles";
import { useAppAlertDialog } from "@/hooks/use-app-alert-dialog";
import { usePermission } from "@/hooks/use-permission";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/layout/data-table";
import type { Column } from "@/components/layout/data-table";
import { useClientSort } from "@/hooks/use-client-sort";
import { CreateRoleDialog } from "./components/create-role-dialog";
import { RolePermissionDialog } from "./components/role-permission-dialog";
import type { RoleListItem } from "@/lib/api/role";

export default function RolesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const roles = useRoles();
  const del = useDeleteRole();
  const { confirm, AlertDialogComponent } = useAppAlertDialog();
  const { sorted, sort, onSort } = useClientSort(roles.data?.data ?? []);
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("role:create");
  const canEdit   = hasPermission("role:edit");
  const canDelete = hasPermission("role:delete");
  const canRowAction = canEdit || canDelete;

  const columns = useMemo<Column<RoleListItem>[]>(() => [
    {
      title: "ชื่อบทบาท",
      dataIndex: "description",
      sorter: true,
      render: (r) => (
        <div className="flex items-center gap-2 font-medium text-primary-dark">
          {r.description || r.name}
          {r.isSystem && <Badge variant="outline" className="text-[10px]">ระบบ</Badge>}
        </div>
      ),
    },
    {
      title: "ชื่อระบบ",
      dataIndex: "name",
      render: (r) => <span className="text-xs text-muted-foreground">{r.name}</span>,
    },
    {
      title: "ผู้ใช้",
      key: "users",
      width: 80,
      align: "center",
      render: (r) => r._count.users,
    },
    {
      title: "สิทธิ์",
      key: "permissions",
      width: 80,
      align: "center",
      render: (r) => r._count.permissions,
    },
    ...(canRowAction ? [{
      title: "",
      key: "actions",
      width: "fit" as const,
      fixed: "right" as const,
      render: (r: RoleListItem) => (
        <div className="flex gap-1">
          {canEdit && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditingId(r.id)}
              disabled={r.isSystem}
              title={r.isSystem ? "บทบาทระบบ — ห้ามแก้ไข" : "จัดการสิทธิ์"}
              aria-label="จัดการสิทธิ์"
            >
              <Settings2 className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">จัดการสิทธิ์</span>
            </Button>
          )}
          {canDelete && (
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-destructive"
              aria-label="ลบ"
              disabled={r.isSystem || r._count.users > 0}
              onClick={() =>
                confirm({
                  title: "ลบบทบาท",
                  description: `ลบ "${r.description || r.name}"?`,
                  onAction: () => del.mutate(r.id),
                  actionVariant: "destructive",
                })
              }
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    }] : []),
  ], [del, confirm, canRowAction, canEdit, canDelete]);

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4 h-full overflow-hidden">
      <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">บทบาท &amp; สิทธิ์</h1>
          <p className="text-sm text-brand-muted">บทบาท {roles.data?.total ?? 0} รายการ</p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            เพิ่มบทบาทใหม่
          </Button>
        )}
      </div>

      <DataTable<RoleListItem>
        columns={columns}
        dataSource={roles.data?.data ?? []}
        loading={roles.isLoading}
        rowKey="id"
        className="flex-1 min-h-0"
      />

      <CreateRoleDialog open={createOpen} onOpenChange={setCreateOpen} />
      <RolePermissionDialog
        editingId={editingId}
        onOpenChange={(o) => { if (!o) setEditingId(null); }}
      />
      {AlertDialogComponent}
    </div>
  );
}
