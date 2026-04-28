"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Play, Trash2, Video } from "lucide-react";
import { AppCombobox } from "@/components/layout/app-combobox";
import { AppDatePicker } from "@/components/layout/app-date-picker";
import { DataTable } from "@/components/layout/data-table";
import type { Column } from "@/components/layout/data-table";
import { usePoleLookup } from "@/hooks/api/use-poles";
import { useRecordings, useDeleteRecording } from "@/hooks/api/use-recordings";
import { useAppAlertDialog } from "@/hooks/use-app-alert-dialog";
import { usePermission } from "@/hooks/use-permission";
import { recordingApi, type RecordingItem } from "@/lib/api/recording";
import { env } from "@/config/env";

function formatBytes(b: string | null): string {
  if (!b) return "—";
  const num = Number(b);
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function CameraPage() {
  const poleLookup = usePoleLookup();
  const [poleId, setPoleId] = useState<number | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [playing, setPlaying] = useState<{ recording: RecordingItem; url: string } | null>(null);

  const list = useRecordings({ page, limit, poleId: poleId ?? undefined, date });
  const del = useDeleteRecording();
  const { confirm, AlertDialogComponent } = useAppAlertDialog();
  const { hasPermission } = usePermission();
  const canDelete = hasPermission("camera_archive:delete");

  const poleOptions = useMemo(
    () => (poleLookup.data ?? []).filter((p) => p.hasCamera).map((p) => ({ id: p.id, label: p.poleName })),
    [poleLookup.data],
  );

  const handlePlay = async (recording: RecordingItem) => {
    try {
      const playback = await recordingApi.getPlaybackUrl(Number(recording.id));
      const fullUrl = playback.url.startsWith("http") ? playback.url : `${env.NEXT_PUBLIC_API_URL}${playback.url}`;
      setPlaying({ recording, url: fullUrl });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const columns = useMemo<Column<RecordingItem>[]>(() => [
    {
      title: "เวลา",
      key: "time",
      render: (r) => <span className="text-xs">{r.startTime} — {r.endTime}</span>,
    },
    {
      title: "ระยะเวลา",
      dataIndex: "durationSec",
      width: 100,
      render: (r) => r.durationSec ? formatDuration(r.durationSec) : "—",
    },
    {
      title: "ขนาด",
      dataIndex: "fileSizeBytes",
      width: 100,
      render: (r) => formatBytes(r.fileSizeBytes),
    },
    {
      title: "วันที่",
      dataIndex: "recordedDate",
      width: 120,
      render: (r) => <span className="text-xs text-muted-foreground">{r.recordedDate}</span>,
    },
    {
      title: "",
      key: "actions",
      width: "fit",
      fixed: "right",
      render: (r) => (
        <div className="flex gap-1">
          <Button size="icon-sm" variant="ghost" aria-label="เล่น" onClick={() => handlePlay(r)}>
            <Play className="h-3.5 w-3.5" />
          </Button>
          {canDelete && (
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-destructive"
              aria-label="ลบ"
              onClick={() =>
                confirm({
                  title: "ลบบันทึก",
                  description: "ต้องการลบคลิปนี้ใช่หรือไม่?",
                  onAction: () => del.mutate(Number(r.id)),
                  actionVariant: "destructive",
                })
              }
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ], [del, confirm, canDelete]);

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4 h-full overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-primary-dark">ภาพกล้อง — บันทึก DVR</h1>
        <p className="text-sm text-brand-muted">เลือกเสาและวันที่เพื่อดูคลิปบันทึก</p>
      </div>

      <div className="shrink-0 grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-lg border bg-card">
        <div className="space-y-1">
          <Label className="text-xs">เสา</Label>
          <AppCombobox
            className="w-full"
            options={poleOptions}
            value={poleId}
            onChange={(v) => { setPoleId(Number(v)); setPage(1); }}
            required
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">วันที่</Label>
          <AppDatePicker value={date} onChange={(v) => { setDate(v); setPage(1); }} />
        </div>
      </div>

      {!poleId ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground rounded-lg border bg-card">
          <Video className="h-12 w-12 mb-2" />
          กรุณาเลือกเสา
        </div>
      ) : (
        <DataTable<RecordingItem>
          columns={columns}
          dataSource={list.data?.data ?? []}
          loading={list.isLoading}
          rowKey="id"
          className="flex-1 min-h-0"
          emptyText="ไม่พบคลิปในวันที่เลือก"
          pagination={{
            current: page,
            limit,
            total: list.data?.total ?? 0,
            onChange: (p, l) => { setPage(p); setLimit(l); },
          }}
        />
      )}

      <Dialog open={!!playing} onOpenChange={(o) => { if (!o) setPlaying(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {playing && `${playing.recording.recordedDate} ${playing.recording.startTime}`}
            </DialogTitle>
          </DialogHeader>
          {playing && (
            <video src={playing.url} controls autoPlay className="w-full rounded" />
          )}
        </DialogContent>
      </Dialog>

      {AlertDialogComponent}
    </div>
  );
}
