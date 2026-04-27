"use client";

import { useState } from "react";
import { useAlerts, useResolveAlert } from "@/hooks/api/use-alerts";
import { useAppAlertDialog } from "@/hooks/use-app-alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, AlertTriangle, AlertCircle, CheckCheck } from "lucide-react";
import type { AlertSeverity } from "@/lib/api/alert";

const SEVERITY_INFO: Record<AlertSeverity, { color: string; icon: typeof Bell; label: string }> = {
  info: { color: "bg-blue-100 text-blue-700", icon: Bell, label: "Info" },
  warning: { color: "bg-amber-100 text-amber-700", icon: AlertTriangle, label: "Warning" },
  critical: { color: "bg-red-100 text-red-700", icon: AlertCircle, label: "Critical" },
};

export default function AlertsPage() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("open");

  const alerts = useAlerts({
    page,
    limit: 20,
    isResolved: filter === "all" ? undefined : filter === "resolved",
  });
  const resolveAlert = useResolveAlert();
  const { confirm, AlertDialogComponent } = useAppAlertDialog();

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-[#0D47A1]">การแจ้งเตือน</h1>
          <p className="text-sm text-[#4A90A4]">{alerts.data?.total ?? 0} รายการ</p>
        </div>
        <Select value={filter} onValueChange={(v) => { setFilter(v as typeof filter); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">ที่ยังไม่ resolved</SelectItem>
            <SelectItem value="resolved">resolved แล้ว</SelectItem>
            <SelectItem value="all">ทั้งหมด</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {alerts.isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">กำลังโหลด...</CardContent>
        </Card>
      ) : alerts.data?.data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CheckCheck className="h-12 w-12 mx-auto mb-2 text-green-500" />
            ไม่มี alert ที่รอแก้ไข
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {alerts.data?.data.map((a) => {
            const info = SEVERITY_INFO[a.severity];
            const Icon = info.icon;
            return (
              <Card key={a.id} className={a.isResolved ? "opacity-60" : ""}>
                <CardContent className="pt-4 flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${info.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={info.color}>
                        {info.label}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {a.alertType}
                      </Badge>
                      <span className="text-xs text-muted-foreground">เสา id: {a.poleId}</span>
                      {a.isResolved && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 text-[10px]">
                          ✓ resolved
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm font-medium">{a.message}</div>
                    {a.value !== null && a.threshold !== null && (
                      <div className="text-xs text-muted-foreground">
                        ค่า: {a.value} / threshold: {a.threshold}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      เกิดเมื่อ: {new Date(a.triggeredAt).toLocaleString("th-TH")}
                    </div>
                  </div>
                  {!a.isResolved && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        confirm({
                          title: "ยืนยัน Resolve",
                          description: `Resolve alert "${a.message}"?`,
                          onAction: () => resolveAlert.mutate({ id: a.id }),
                        })
                      }
                    >
                      Resolve
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {alerts.data && alerts.data.total > 20 && (
        <div className="flex justify-center gap-2 pt-4">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            ก่อนหน้า
          </Button>
          <span className="px-4 py-1 text-sm">
            หน้า {page} / {Math.ceil(alerts.data.total / 20)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page * 20 >= alerts.data.total}
            onClick={() => setPage(page + 1)}
          >
            ถัดไป
          </Button>
        </div>
      )}

      {AlertDialogComponent}
    </div>
  );
}
