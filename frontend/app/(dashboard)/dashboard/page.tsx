"use client";

import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { AppCombobox } from "@/components/layout/app-combobox";
import { Wifi, WifiOff, Wrench, Antenna, Radio } from "lucide-react";
import { usePoleLookup } from "@/hooks/api/use-poles";
import { useSensorLatest } from "@/hooks/api/use-sensors";
import { LiveVideoPlayer } from "@/components/shared/live-video-player";
import { buildWsUrl } from "@/lib/runtime-url";
import type { PoleStatus } from "@/lib/api/pole";
import { useAuthStore } from "@/stores/auth-store";

const STATUS_CONFIG: Record<PoleStatus, { color: string; label: string; icon: typeof Wifi }> = {
  online: { color: "text-green-600 bg-green-50", label: "ออนไลน์", icon: Wifi },
  offline: { color: "text-red-600 bg-red-50", label: "ออฟไลน์", icon: WifiOff },
  maintenance: { color: "text-amber-600 bg-amber-50", label: "บำรุงรักษา", icon: Wrench },
  unknown: { color: "text-gray-500 bg-gray-50", label: "ไม่ทราบสถานะ", icon: Antenna },
};

export default function DashboardPage() {
  const qc = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const poleLookup = usePoleLookup();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (poleLookup.data && poleLookup.data.length > 0 && selectedId === null) {
      setSelectedId(poleLookup.data[0]!.id);
    }
  }, [poleLookup.data, selectedId]);

  const selected = useMemo(
    () => poleLookup.data?.find((p) => p.id === selectedId),
    [poleLookup.data, selectedId],
  );

  const sensors = useSensorLatest(selectedId, { refetchIntervalMs: 15_000 });
  const latestReadingAt = sensors.data?.latestReadingAt
    ? new Date(Number(sensors.data.latestReadingAt)).toLocaleString("th-TH", { hour12: false })
    : null;

  useEffect(() => {
    if (!accessToken) return;
    const wsUrl = buildWsUrl(accessToken);
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as { type: string; payload?: unknown };
        if (msg.type === "sensor-reading" || msg.type === "pole-status-changed") {
          qc.invalidateQueries({ queryKey: ["sensor"] });
          qc.invalidateQueries({ queryKey: ["pole"] });
        }
      } catch {
        // ignore non-JSON
      }
    };
    ws.onopen = () => ws.send("ping");
    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send("ping");
    }, 30_000);
    return () => {
      clearInterval(heartbeat);
      ws.close();
    };
  }, [accessToken, qc]);

  const statusInfo = selected?.poleStatus
    ? (STATUS_CONFIG[selected.poleStatus] ?? STATUS_CONFIG.unknown)
    : STATUS_CONFIG.unknown;
  const StatusIcon = statusInfo.icon;

  const poleOptions = useMemo(
    () => (poleLookup.data ?? []).map((p) => ({ id: p.id, label: `${p.poleName} (${p.installPlace})` })),
    [poleLookup.data],
  );

  // ── Live: แสดงเมื่อเสามีกล้อง (remount ด้วย key=poleName เมื่อเปลี่ยนเสา) ────
  const showLive = Boolean(selected?.hasCamera);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">แดชบอร์ด</h1>
          <p className="text-sm text-brand-muted">
            ภาพรวมเสาสัญญาณตามเวลาจริง
            {latestReadingAt && (
              <span className="ml-2 text-xs text-muted-foreground">
                · ข้อมูลล่าสุด {latestReadingAt}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AppCombobox
            className="w-56"
            options={poleOptions}
            value={selectedId}
            onChange={(v) => setSelectedId(Number(v))}
            required
          />
          {selected && (
            <Badge className={statusInfo.color}>
              <StatusIcon className="mr-1 h-3 w-3" />
              {statusInfo.label}
            </Badge>
          )}
        </div>
      </div>

      {/* Sensor summary */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <SensorCard
          label="PM2.5"
          value={sensors.data?.latestPm25 ?? null}
          unit="µg/m³"
          color="bg-amber-500"
          show={selected?.hasPm25Sensor}
        />
        <SensorCard
          label="อุณหภูมิ"
          value={sensors.data?.latestTemperature ?? null}
          unit="°C"
          color="bg-red-500"
          show={selected?.hasTempHumidity}
        />
        <SensorCard
          label="ความชื้น"
          value={sensors.data?.latestHumidity ?? null}
          unit="%RH"
          color="bg-green-500"
          show={selected?.hasTempHumidity}
        />
      </div>

      {/* Camera live stream */}
      {showLive && selected && (
        <div className="border rounded-md p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm font-medium">กล้องสด — {selected.poleName}</div>
            <Badge className="bg-red-500 text-white animate-pulse">
              <Radio className="mr-1 h-3 w-3" />
              LIVE
            </Badge>
          </div>
          <div className="bg-black rounded overflow-hidden w-full h-[55vh] min-h-[320px] max-h-[640px]">
            <LiveVideoPlayer
              key={selected.poleName}
              poleName={selected.poleName}
              className="w-full h-full"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            HLS Live — ดูคลิปย้อนหลังที่หน้า <a href="/camera" className="underline">บันทึกกล้อง</a>
          </p>
        </div>
      )}

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
    <div className={`border rounded-md p-3 md:p-4 ${show === false ? "opacity-50" : ""}`}>
      <div className="text-[10px] md:text-xs uppercase tracking-wider text-brand-muted mb-1 md:mb-2 truncate">{label}</div>
      <div className="text-lg md:text-2xl font-bold text-primary-dark">
        {value !== null ? value.toFixed(1) : "—"}
        <span className="text-[10px] md:text-xs font-normal text-muted-foreground ml-1">{unit}</span>
      </div>
      <div className={`h-1 rounded-full mt-2 md:mt-3 ${color} opacity-30`} />
    </div>
  );
}
