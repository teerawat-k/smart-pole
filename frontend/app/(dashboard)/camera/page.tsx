"use client";

import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Video } from "lucide-react";
import { AppCombobox } from "@/components/layout/app-combobox";
import { usePoleLookup } from "@/hooks/api/use-poles";
import { useClipDates, useClipList } from "@/hooks/api/use-camera-clips";
import { cameraClipApi, type ClipItem } from "@/lib/api/camera-clip";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

function formatBytes(b: number): string {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function CameraPage() {
  const poleLookup = usePoleLookup();
  const [poleId, setPoleId] = useState<number | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

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

  // เปลี่ยนเสา → reset วันที่ + ไฟล์
  useEffect(() => {
    setDate(null);
    setSelectedFile(null);
  }, [poleId]);

  // เปลี่ยนวันที่ → reset ไฟล์
  useEffect(() => {
    setSelectedFile(null);
  }, [date]);

  // clips โหลดมา → เลือกไฟล์ใหม่สุดอัตโนมัติ
  useEffect(() => {
    if (clips.data && clips.data.length > 0 && selectedFile === null) {
      setSelectedFile(clips.data[0]!.filename);
    }
  }, [clips.data, selectedFile]);

  const poleOptions = useMemo(
    () => cameraPoles.map((p) => ({ id: p.id, label: p.poleName })),
    [cameraPoles],
  );

  const dateOptions = useMemo(
    () => (dates.data ?? []).map((d) => ({ id: d.date, label: `${d.date} (${d.fileCount} คลิป)` })),
    [dates.data],
  );

  const currentClip = useMemo(
    () => clips.data?.find((c) => c.filename === selectedFile) ?? null,
    [clips.data, selectedFile],
  );

  const playUrl = selectedPole && date && selectedFile
    ? cameraClipApi.buildStreamUrl(selectedPole.poleName, date, selectedFile)
    : null;

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4 h-full overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-primary-dark">บันทึกกล้อง</h1>
        <p className="text-sm text-brand-muted">เลือกเสาและวันที่ จากนั้นเลือกไฟล์ทางซ้ายเพื่อเปิดดู</p>
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
            disabled={!selectedPole || dates.isLoading || dateOptions.length === 0}
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
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4">
          {/* ── File list panel ── */}
          <ClipListPanel
            clips={clips.data ?? []}
            loading={clips.isLoading}
            selectedFile={selectedFile}
            onSelect={setSelectedFile}
          />

          {/* ── Video player panel ── */}
          <div className="flex flex-col gap-3 min-h-0">
            <div className="flex-1 min-h-0 bg-black rounded-md overflow-hidden flex items-center justify-center">
              {playUrl ? (
                <video
                  key={playUrl}
                  src={playUrl}
                  controls
                  autoPlay
                  className="w-full h-full"
                />
              ) : (
                <div className="flex flex-col items-center text-gray-400">
                  <Video className="h-10 w-10 mb-2" />
                  เลือกไฟล์ที่ต้องการดู
                </div>
              )}
            </div>
            {currentClip && (
              <div className="shrink-0 px-3 py-2 rounded-md border bg-card text-sm">
                <div className="font-medium">{currentClip.filename}</div>
                <div className="text-xs text-muted-foreground">
                  {formatBytes(currentClip.sizeBytes)} · บันทึกเมื่อ {formatDateTime(currentClip.modifiedAt)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ClipListPanel({
  clips,
  loading,
  selectedFile,
  onSelect,
}: {
  clips: ClipItem[];
  loading: boolean;
  selectedFile: string | null;
  onSelect: (filename: string) => void;
}) {
  return (
    <div className="flex flex-col rounded-md border bg-card min-h-0">
      <div className="shrink-0 px-3 py-2 border-b text-xs font-medium text-muted-foreground">
        รายชื่อไฟล์ ({clips.length})
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">กำลังโหลด...</div>
        ) : clips.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">ไม่พบคลิปในวันที่เลือก</div>
        ) : (
          <ul className="divide-y">
            {clips.map((c) => {
              const active = c.filename === selectedFile;
              return (
                <li key={c.filename}>
                  <button
                    type="button"
                    onClick={() => onSelect(c.filename)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-primary/10 text-primary-dark font-medium"
                        : "hover:bg-muted/50",
                    )}
                  >
                    <div className="truncate">{c.filename}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {formatBytes(c.sizeBytes)} · {formatDateTime(c.modifiedAt)}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
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
