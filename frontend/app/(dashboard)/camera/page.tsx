"use client";

import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Play, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppCombobox } from "@/components/layout/app-combobox";
import { DataTable } from "@/components/layout/data-table";
import type { Column } from "@/components/layout/data-table";
import { usePoleLookup } from "@/hooks/api/use-poles";
import { useClipDates, useClipList } from "@/hooks/api/use-camera-clips";
import { cameraClipApi, type ClipItem } from "@/lib/api/camera-clip";
import { formatDateTime } from "@/lib/format";

function formatBytes(b: number): string {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function CameraPage() {
  const poleLookup = usePoleLookup();
  const [poleId, setPoleId] = useState<number | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [playing, setPlaying] = useState<{ filename: string; url: string } | null>(null);

  const cameraPoles = useMemo(
    () => (poleLookup.data ?? []).filter((p) => p.hasCamera),
    [poleLookup.data],
  );

  const selectedPole = useMemo(
    () => cameraPoles.find((p) => p.id === poleId) ?? null,
    [cameraPoles, poleId],
  );

  const dates = useClipDates(selectedPole?.poleName ?? null);
  const clips = useClipList(selectedPole?.poleName ?? null, date);

  // เลือกวันที่ใหม่สุดอัตโนมัติเมื่อ dates โหลดมา
  useEffect(() => {
    if (dates.data && dates.data.length > 0 && date === null) {
      setDate(dates.data[0]!.date);
    }
  }, [dates.data, date]);

  // เปลี่ยนเสา → reset วันที่
  useEffect(() => {
    setDate(null);
  }, [poleId]);

  const poleOptions = useMemo(
    () => cameraPoles.map((p) => ({ id: p.id, label: p.poleName })),
    [cameraPoles],
  );

  const dateOptions = useMemo(
    () => (dates.data ?? []).map((d) => ({ id: d.date, label: `${d.date} (${d.fileCount} คลิป)` })),
    [dates.data],
  );

  const handlePlay = (clip: ClipItem) => {
    if (!selectedPole || !date) return;
    const url = cameraClipApi.buildStreamUrl(selectedPole.poleName, date, clip.filename);
    setPlaying({ filename: clip.filename, url });
  };

  const columns = useMemo<Column<ClipItem>[]>(() => [
    {
      title: "ไฟล์",
      dataIndex: "filename",
      render: (r) => <span className="font-medium">{r.filename}</span>,
    },
    {
      title: "ขนาด",
      dataIndex: "sizeBytes",
      width: 120,
      render: (r) => formatBytes(r.sizeBytes),
    },
    {
      title: "เวลาบันทึก",
      dataIndex: "modifiedAt",
      width: 200,
      render: (r) => <span className="text-xs text-muted-foreground">{formatDateTime(r.modifiedAt)}</span>,
    },
    {
      title: "",
      key: "actions",
      width: "fit",
      fixed: "right",
      render: (r) => (
        <Button size="sm" variant="ghost" onClick={() => handlePlay(r)}>
          <Play className="mr-1 h-3.5 w-3.5" />เล่น
        </Button>
      ),
    },
  ], [selectedPole, date]);

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4 h-full overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-primary-dark">บันทึกกล้อง</h1>
        <p className="text-sm text-brand-muted">เลือกเสาและวันที่เพื่อดูคลิปที่ถูกบันทึก</p>
      </div>

      <div className="shrink-0 grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-lg border bg-card">
        <div className="space-y-1">
          <Label className="text-xs">เสา</Label>
          <AppCombobox
            className="w-full"
            options={poleOptions}
            value={poleId}
            onChange={(v) => setPoleId(Number(v))}
            required
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">วันที่</Label>
          <AppCombobox
            className="w-full"
            options={dateOptions}
            value={date}
            onChange={(v) => setDate(String(v))}
            required
            disabled={!selectedPole || dates.isLoading}
          />
        </div>
      </div>

      {!selectedPole ? (
        <EmptyState text="กรุณาเลือกเสา" />
      ) : dates.data?.length === 0 ? (
        <EmptyState text="ไม่พบคลิปสำหรับเสานี้" />
      ) : !date ? (
        <EmptyState text="กรุณาเลือกวันที่" />
      ) : (
        <DataTable<ClipItem>
          columns={columns}
          dataSource={clips.data ?? []}
          loading={clips.isLoading}
          rowKey="filename"
          className="flex-1 min-h-0"
          emptyText="ไม่พบคลิปในวันที่เลือก"
        />
      )}

      <Dialog open={!!playing} onOpenChange={(o) => { if (!o) setPlaying(null); }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{playing?.filename}</DialogTitle>
          </DialogHeader>
          {playing && (
            <video src={playing.url} controls autoPlay className="w-full rounded bg-black" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground rounded-lg border bg-card">
      <Video className="h-12 w-12 mb-2" />
      {text}
    </div>
  );
}
