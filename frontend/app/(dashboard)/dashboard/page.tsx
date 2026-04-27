"use client";

import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wifi, WifiOff, Wrench, Antenna, AlertTriangle } from "lucide-react";
import { usePoleLookup } from "@/hooks/api/use-poles";
import { useSensorLatest } from "@/hooks/api/use-sensors";
import { useAlerts } from "@/hooks/api/use-alerts";
import { env } from "@/config/env";
import type { PoleStatus } from "@/lib/api/pole";
import { useAuthStore } from "@/stores/auth-store";

const STATUS_CONFIG: Record<PoleStatus, { color: string; label: string; icon: typeof Wifi }> = {
  online: { color: "text-green-600 bg-green-50", label: "Online", icon: Wifi },
  offline: { color: "text-red-600 bg-red-50", label: "Offline", icon: WifiOff },
  maintenance: { color: "text-amber-600 bg-amber-50", label: "Maintenance", icon: Wrench },
  unknown: { color: "text-gray-500 bg-gray-50", label: "Unknown", icon: Antenna },
};

export default function DashboardPage() {
  const qc = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const poleLookup = usePoleLookup();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // auto-pick first pole when lookup loads
  useEffect(() => {
    if (poleLookup.data && poleLookup.data.length > 0 && selectedId === null) {
      setSelectedId(poleLookup.data[0]!.id);
    }
  }, [poleLookup.data, selectedId]);

  const selected = useMemo(
    () => poleLookup.data?.find((p) => p.id === selectedId),
    [poleLookup.data, selectedId],
  );

  // refetch ทุก 15s — fallback ถ้า WS หาย; WS จะ invalidate ทันทีอยู่แล้ว
  const sensors = useSensorLatest(selectedId, { refetchIntervalMs: 15_000 });

  // active alerts สำหรับเสานี้
  const alerts = useAlerts({
    page: 1,
    limit: 5,
    poleId: selectedId ?? undefined,
    isResolved: false,
  });

  // WebSocket subscribe → invalidate sensor + alert queries
  useEffect(() => {
    if (!accessToken) return;
    const wsUrl = env.NEXT_PUBLIC_WS_URL + `?token=${accessToken}`;
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as { type: string; payload?: unknown };
        if (msg.type === "sensor-reading" || msg.type === "pole-status-changed") {
          qc.invalidateQueries({ queryKey: ["sensor"] });
          qc.invalidateQueries({ queryKey: ["pole"] });
        }
        if (msg.type === "alert-new" || msg.type === "alert-resolved") {
          qc.invalidateQueries({ queryKey: ["alert"] });
        }
      } catch {
        // ignore non-JSON (e.g. "pong")
      }
    };
    ws.onopen = () => ws.send("ping"); // sanity
    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send("ping");
    }, 30_000);
    return () => {
      clearInterval(heartbeat);
      ws.close();
    };
  }, [accessToken, qc]);

  const statusInfo = selected ? STATUS_CONFIG.unknown : STATUS_CONFIG.unknown;
  const StatusIcon = statusInfo.icon;
  const hlsUrl = selected ? `${env.NEXT_PUBLIC_HLS_BASE}/live/${selected.poleName}.m3u8` : null;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-[#0D47A1]">Dashboard</h1>
          <p className="text-sm text-[#4A90A4]">ภาพรวมเสาสัญญาณ real-time</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedId ? String(selectedId) : ""} onValueChange={(v) => setSelectedId(Number(v))}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="เลือกเสา..." />
            </SelectTrigger>
            <SelectContent>
              {poleLookup.data?.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.poleName} — {p.installPlace}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selected && (
            <Badge className={statusInfo.color}>
              <StatusIcon className="mr-1 h-3 w-3" />
              {statusInfo.label}
            </Badge>
          )}
        </div>
      </div>

      {/* Sensor cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <SensorCard
          label="PM2.5"
          value={sensors.data?.pm25?.pm25 ?? null}
          unit="µg/m³"
          color="bg-amber-500"
          show={selected?.hasPm25Sensor}
        />
        <SensorCard
          label="อุณหภูมิ"
          value={sensors.data?.temperature?.temperature ?? null}
          unit="°C"
          color="bg-red-500"
          show={selected?.hasTempHumidity}
        />
        <SensorCard
          label="ความชื้น"
          value={sensors.data?.humidity?.humidity ?? null}
          unit="%RH"
          color="bg-green-500"
          show={selected?.hasTempHumidity}
        />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-[#4A90A4]">การแจ้งเตือน</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0D47A1]">
              {alerts.data?.total ?? 0}
              <span className="text-xs font-normal text-muted-foreground ml-1">รายการ</span>
            </div>
            <div className="h-1 rounded-full mt-3 bg-blue-500 opacity-30" />
          </CardContent>
        </Card>
      </div>

      {/* Live camera */}
      {selected?.hasCamera && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">📷 ภาพกล้อง Live — {selected.poleName}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black aspect-video rounded overflow-hidden flex items-center justify-center">
              {hlsUrl ? (
                <video
                  src={hlsUrl}
                  autoPlay
                  muted
                  controls
                  className="w-full h-full"
                  onError={(e) => {
                    (e.currentTarget as HTMLVideoElement).poster = "";
                  }}
                >
                  เบราว์เซอร์ไม่รองรับ HLS
                </video>
              ) : (
                <span className="text-gray-400">เลือกเสาที่มีกล้อง</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              HLS: <code className="text-xs">{hlsUrl}</code>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Active alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">⚠️ การแจ้งเตือนล่าสุด</CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.data?.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">ไม่มี alert ที่รอแก้ไข</p>
          ) : (
            <div className="space-y-2">
              {alerts.data?.data.map((a) => (
                <div key={a.id} className="flex items-start gap-2 p-2 rounded border-l-4 border-amber-500 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-sm flex-1">
                    <div className="font-medium">{a.message}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.alertType} · {new Date(a.triggeredAt).toLocaleString("th-TH")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SensorCard({
  label,
  value,
  unit,
  color,
  show,
}: {
  label: string;
  value: number | null;
  unit: string;
  color: string;
  show?: boolean;
}) {
  return (
    <Card className={show === false ? "opacity-50" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs uppercase tracking-wider text-[#4A90A4]">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-[#0D47A1]">
          {value !== null ? value.toFixed(1) : "—"}
          <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>
        </div>
        <div className={`h-1 rounded-full mt-3 ${color} opacity-30`} />
      </CardContent>
    </Card>
  );
}
