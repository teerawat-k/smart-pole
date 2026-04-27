"use client";

import { useState } from "react";
import { Plus, Shield, Settings2 } from "lucide-react";
import { useRoles, useDeleteRole } from "@/hooks/api/use-roles";
import { useAppAlertDialog } from "@/hooks/use-app-alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateRoleDialog } from "./components/create-role-dialog";
import { RolePermissionDialog } from "./components/role-permission-dialog";

export default function RolesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const roles = useRoles();
  const del = useDeleteRole();
  const { confirm, AlertDialogComponent } = useAppAlertDialog();

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-[#0D47A1]">Role &amp; Permission</h1>
          <p className="text-sm text-[#4A90A4]">บทบาท {roles.data?.total ?? 0} รายการ</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-[#1565C0] hover:bg-[#0D47A1]">
          <Plus className="mr-2 h-4 w-4" />
          เพิ่ม Role
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.data?.data.map((r) => (
          <Card key={r.id}>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-start gap-3">
                <Shield className="h-8 w-8 text-[#1565C0] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[#0D47A1] flex items-center gap-2">
                    {r.description || r.name}
                    {r.isSystem && (
                      <Badge variant="outline" className="text-[10px]">
                        SYSTEM
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{r.name}</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <div>👤 ผู้ใช้: {r._count.users} คน</div>
                <div>🔒 Permission: {r._count.permissions} รายการ</div>
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingId(r.id)}
                  disabled={r.isSystem}
                >
                  <Settings2 className="mr-1 h-3.5 w-3.5" />
                  จัดการ Permission
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive ml-auto"
                  disabled={r.isSystem || r._count.users > 0}
                  onClick={() =>
                    confirm({
                      title: "ลบ Role",
                      description: `ลบ "${r.description || r.name}"?`,
                      onAction: () => del.mutate(r.id),
                      actionVariant: "destructive",
                    })
                  }
                >
                  ลบ
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CreateRoleDialog open={createOpen} onOpenChange={setCreateOpen} />
      <RolePermissionDialog
        editingId={editingId}
        onOpenChange={(o) => {
          if (!o) setEditingId(null);
        }}
      />
      {AlertDialogComponent}
    </div>
  );
}
