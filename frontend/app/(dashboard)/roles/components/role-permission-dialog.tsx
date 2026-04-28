"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useRole, usePermissions, useUpdateRolePermissions } from "@/hooks/api/use-roles";
import type { Permission } from "@/lib/api/role";

interface Props {
  editingId: number | null;
  onOpenChange: (open: boolean) => void;
}

export function RolePermissionDialog({ editingId, onOpenChange }: Props) {
  const open = editingId !== null;
  const role = useRole(editingId, { enabled: open });
  const permissions = usePermissions();
  const update = useUpdateRolePermissions();

  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (open && role.data) {
      setSelected(new Set(role.data.permissions.map((p) => p.permission.id)));
    }
  }, [open, role.data]);

  // group by category
  const grouped = useMemo(() => {
    if (!permissions.data) return [];
    const map = new Map<string, { categoryLabel: string; modules: Map<string, Permission[]> }>();
    for (const p of permissions.data) {
      if (!map.has(p.category)) {
        map.set(p.category, { categoryLabel: p.categoryLabel, modules: new Map() });
      }
      const cat = map.get(p.category)!;
      if (!cat.modules.has(p.module)) cat.modules.set(p.module, []);
      cat.modules.get(p.module)!.push(p);
    }
    return Array.from(map.entries()).map(([key, value]) => ({
      key,
      label: value.categoryLabel,
      modules: Array.from(value.modules.entries()).map(([m, perms]) => ({
        module: m,
        moduleLabel: perms[0]!.moduleLabel,
        perms,
      })),
    }));
  }, [permissions.data]);

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = () => {
    if (editingId === null) return;
    update.mutate(
      { id: editingId, permissionIds: Array.from(selected) },
      {
        onSuccess: () => onOpenChange(false),
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            จัดการสิทธิ์ — {role.data?.description || role.data?.name || "..."}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4 -mx-6 px-6">
          {grouped.map((cat) => (
            <div key={cat.key} className="space-y-2">
              <h3 className="text-sm font-bold text-primary-dark sticky top-0 bg-background py-1 border-b">
                {cat.label}
              </h3>
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left py-1 pl-2">โมดูล</th>
                    <th className="text-center w-20">ดู</th>
                    <th className="text-center w-20">สร้าง</th>
                    <th className="text-center w-20">แก้ไข</th>
                    <th className="text-center w-20">ลบ</th>
                    <th className="text-center w-20">ส่งออก</th>
                  </tr>
                </thead>
                <tbody>
                  {cat.modules.map((mod) => (
                    <tr key={mod.module} className="border-t hover:bg-muted/50">
                      <td className="py-1.5 pl-2 font-medium">{mod.moduleLabel}</td>
                      {["view", "create", "edit", "delete", "export"].map((action) => {
                        const perm = mod.perms.find((p) => p.action === action);
                        return (
                          <td key={action} className="text-center">
                            {perm ? (
                              <Checkbox
                                checked={selected.has(perm.id)}
                                onCheckedChange={() => toggle(perm.id)}
                              />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button onClick={submit} disabled={update.isPending}>
            {update.isPending ? "กำลังบันทึก..." : `บันทึก (${selected.size} รายการ)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
