"use client";

import { useMemo, useState } from "react";
import { Plus, Antenna, Wifi, WifiOff, Wrench, Pencil, Trash2, WrenchIcon } from "lucide-react";
import { useDeletePole, usePoles, useSetMaintenance } from "@/hooks/api/use-poles";
import { usePermission } from "@/hooks/use-permission";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/layout/data-table";
import type { Column, SortState } from "@/components/layout/data-table";
import { useDebounce } from "@/hooks/use-debounce";
import { useAppAlertDialog } from "@/hooks/use-app-alert-dialog";
import { PoleDialog } from "./components/pole-dialog";
import type { PoleListItem, PoleStatus } from "@/lib/api/pole";

const STATUS_BADGE: Record<PoleStatus, { color: string; label: string; icon: typeof Wifi }> = {
  online:      { color: "bg-green-100 text-green-700 border-green-300", label: "ออนไลน์",      icon: Wifi },
  offline:     { color: "bg-red-100 text-red-700 border-red-300",       label: "ออฟไลน์",      icon: WifiOff },
  maintenance: { color: "bg-amber-100 text-amber-700 border-amber-300", label: "บำรุงรักษา",   icon: Wrench },
  unknown:     { color: "bg-gray-100 text-gray-700 border-gray-300",    label: "ไม่ทราบสถานะ", icon: Antenna },
};

const SORT_WHITELIST = new Set(["poleName", "installPlace", "poleStatus", "lastSeenAt", "createdAt"]);

export default function PolesPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sort, setSort] = useState<SortState | undefined>();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const poles = usePoles({
    page, limit,
    search: debouncedSearch || undefined,
    sortBy: sort?.column,
    sortOrder: sort?.direction,
  });
  const deletePole = useDeletePole();
  const setMaintenance = useSetMaintenance();
  const { confirm, AlertDialogComponent } = useAppAlertDialog();
  const { hasPermission } = usePermission();
  // Page-level button — hasPermission OK (page guard / menu visibility ยกเว้นใน CLAUDE.md)
  const canCreate = hasPermission("pole:create");

  function handleSort(column: string, direction: "asc" | "desc" | null) {
    setSort(direction ? { column, direction } : undefined);
    setPage(1);
  }

  const handleEdit = (id: number) => { setEditingId(id); setDialogOpen(true); };

  const handleDelete = (pole: PoleListItem) => {
    confirm({
      title: "ยืนยันการลบเสา",
      description: `ต้องการลบเสา "${pole.poleName}" ใช่หรือไม่?`,
      onAction: () => deletePole.mutate(pole.id),
      actionText: "ลบ",
      actionVariant: "destructive",
    });
  };

  const columns = useMemo<Column<PoleListItem>[]>(() => [
    {
      title: "ชื่อเสา",
      dataIndex: "poleName",
      sorter: true,
      render: (r) => <span className="font-medium text-primary-dark">{r.poleName}</span>,
    },
    {
      title: "สถานที่",
      dataIndex: "installPlace",
      sorter: true,
      render: (r) => <span className="text-muted-foreground">{r.installPlace}</span>,
    },
    {
      title: "สถานะ",
      dataIndex: "poleStatus",
      sorter: true,
      width: 140,
      render: (r) => {
        const s = STATUS_BADGE[r.poleStatus];
        const Icon = s.icon;
        return (
          <Badge variant="outline" className={s.color}>
            <Icon className="mr-1 h-3 w-3" />{s.label}
          </Badge>
        );
      },
    },
    {
      title: "อุปกรณ์",
      key: "devices",
      width: 220,
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.hasCamera    && <Badge variant="secondary" className="text-[10px]">กล้อง</Badge>}
          {r.hasPm25Sensor && <Badge variant="secondary" className="text-[10px]">PM2.5</Badge>}
          {r.hasTempHumidity && <Badge variant="secondary" className="text-[10px]">อุณหภูมิ/ความชื้น</Badge>}
          {r.hasLed       && <Badge variant="secondary" className="text-[10px]">LED</Badge>}
        </div>
      ),
    },
    {
      title: "พบล่าสุด",
      dataIndex: "lastSeenAt",
      sorter: true,
      width: 160,
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.lastSeenAt ? new Date(r.lastSeenAt).toLocaleString("th-TH") : "—"}
        </span>
      ),
    },
    {
      title: "",
      key: "actions",
      width: "fit" as const,
      fixed: "right" as const,
      render: (r: PoleListItem) => {
        // ใช้ flag ต่อ row (ห้าม hasPermission ตาม CLAUDE.md)
        if (!r.canEdit && !r.canDelete) return null;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon-sm" variant="ghost" aria-label="เมนู">
                <WrenchIcon className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {r.canEdit && (
                <DropdownMenuItem onClick={() => handleEdit(r.id)}>
                  <Pencil className="mr-2 h-4 w-4" />แก้ไข
                </DropdownMenuItem>
              )}
              {r.canEdit && (r.poleStatus === "maintenance" ? (
                <DropdownMenuItem onClick={() => confirm({
                  title: "ยกเลิกบำรุงรักษา",
                  description: `นำเสา "${r.poleName}" ออกจากโหมดบำรุงรักษา?`,
                  onAction: () => setMaintenance.mutate({ id: r.id, enabled: false }),
                })}>
                  <Wrench className="mr-2 h-4 w-4" />ยกเลิกบำรุงรักษา
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => confirm({
                  title: "ตั้งเป็นบำรุงรักษา",
                  description: `ตั้งเสา "${r.poleName}" เป็นโหมดบำรุงรักษา?`,
                  onAction: () => setMaintenance.mutate({ id: r.id, enabled: true }),
                })}>
                  <Wrench className="mr-2 h-4 w-4" />ตั้งเป็นบำรุงรักษา
                </DropdownMenuItem>
              ))}
              {r.canEdit && r.canDelete && <DropdownMenuSeparator />}
              {r.canDelete && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  onClick={() => handleDelete(r)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />ลบ
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [confirm, setMaintenance, deletePole]);

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4 h-full overflow-hidden">
      <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">จัดการเสาสัญญาณ</h1>
          <p className="text-sm text-brand-muted">รายการเสาสัญญาณทั้งหมด {poles.data?.total ?? 0} ต้น</p>
        </div>
        {canCreate && (
          <Button onClick={() => { setEditingId(null); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />เพิ่มเสาใหม่
          </Button>
        )}
      </div>

      <div className="shrink-0">
        <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="max-w-sm" />
      </div>

      <DataTable<PoleListItem>
        columns={columns}
        dataSource={poles.data?.data ?? []}
        loading={poles.isLoading}
        rowKey="id"
        sort={sort}
        onSort={(col, dir) => SORT_WHITELIST.has(col) && handleSort(col, dir)}
        className="flex-1 min-h-0"
        pagination={{ current: page, limit, total: poles.data?.total ?? 0, onChange: (p, l) => { setPage(p); setLimit(l); } }}
      />

      <PoleDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingId(null); }}
        editingId={editingId}
      />
      {AlertDialogComponent}
    </div>
  );
}
