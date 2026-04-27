"use client";

import { useState } from "react";
import { Plus, Antenna, Wifi, WifiOff, Wrench } from "lucide-react";
import { useDeletePole, usePoles } from "@/hooks/api/use-poles";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/use-debounce";
import { useAppAlertDialog } from "@/hooks/use-app-alert-dialog";
import { PoleDialog } from "./components/pole-dialog";
import type { PoleListItem, PoleStatus } from "@/lib/api/pole";

const STATUS_BADGE: Record<PoleStatus, { color: string; label: string; icon: typeof Wifi }> = {
  online: { color: "bg-green-100 text-green-700 border-green-300", label: "Online", icon: Wifi },
  offline: { color: "bg-red-100 text-red-700 border-red-300", label: "Offline", icon: WifiOff },
  maintenance: { color: "bg-amber-100 text-amber-700 border-amber-300", label: "Maintenance", icon: Wrench },
  unknown: { color: "bg-gray-100 text-gray-700 border-gray-300", label: "Unknown", icon: Antenna },
};

export default function PolesPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const poles = usePoles({ page, limit: 20, search: debouncedSearch || undefined });
  const deletePole = useDeletePole();
  const { confirm, AlertDialogComponent } = useAppAlertDialog();

  const handleEdit = (id: number) => {
    setEditingId(id);
    setDialogOpen(true);
  };

  const handleDelete = (pole: PoleListItem) => {
    confirm({
      title: "ยืนยันการลบเสา",
      description: `ต้องการลบเสา "${pole.poleName}" ใช่หรือไม่?`,
      onAction: () => deletePole.mutate(pole.id),
      actionText: "ลบ",
      actionVariant: "destructive",
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-[#0D47A1]">จัดการเสาสัญญาณ</h1>
          <p className="text-sm text-[#4A90A4]">รายการเสาสัญญาณทั้งหมด {poles.data?.total ?? 0} ต้น</p>
        </div>
        <Button
          onClick={() => {
            setEditingId(null);
            setDialogOpen(true);
          }}
          className="bg-[#1565C0] hover:bg-[#0D47A1]"
        >
          <Plus className="mr-2 h-4 w-4" />
          เพิ่มเสาใหม่
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="ค้นหา ชื่อเสา / สถานที่..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
        />
      </div>

      {poles.isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">กำลังโหลด...</CardContent>
        </Card>
      ) : poles.data?.data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">ยังไม่มีเสา — กดปุ่ม "เพิ่มเสาใหม่"</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {poles.data?.data.map((pole) => {
            const statusInfo = STATUS_BADGE[pole.poleStatus];
            const StatusIcon = statusInfo.icon;
            return (
              <Card key={pole.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[#0D47A1] truncate">{pole.poleName}</div>
                      <div className="text-xs text-muted-foreground truncate">{pole.installPlace}</div>
                    </div>
                    <Badge variant="outline" className={statusInfo.color}>
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {statusInfo.label}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {pole.hasCamera && <Badge variant="secondary" className="text-[10px]">Camera</Badge>}
                    {pole.hasPm25Sensor && <Badge variant="secondary" className="text-[10px]">PM2.5</Badge>}
                    {pole.hasTempHumidity && <Badge variant="secondary" className="text-[10px]">Temp/Humid</Badge>}
                    {pole.hasLed && <Badge variant="secondary" className="text-[10px]">LED</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Last seen: {pole.lastSeenAt ? new Date(pole.lastSeenAt).toLocaleString("th-TH") : "—"}
                  </div>
                  <div className="flex gap-2 pt-2 border-t">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(pole.id)}>
                      แก้ไข
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(pole)}
                    >
                      ลบ
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {poles.data && poles.data.total > 20 && (
        <div className="flex justify-center gap-2 pt-4">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            ก่อนหน้า
          </Button>
          <span className="px-4 py-1 text-sm">
            หน้า {page} / {Math.ceil(poles.data.total / 20)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page * 20 >= poles.data.total}
            onClick={() => setPage(page + 1)}
          >
            ถัดไป
          </Button>
        </div>
      )}

      <PoleDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingId(null);
        }}
        editingId={editingId}
      />
      {AlertDialogComponent}
    </div>
  );
}
