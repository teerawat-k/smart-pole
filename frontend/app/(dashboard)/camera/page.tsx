"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Play, Trash2, Video } from "lucide-react";
import { usePoleLookup } from "@/hooks/api/use-poles";
import { useRecordings, useDeleteRecording } from "@/hooks/api/use-recordings";
import { useAppAlertDialog } from "@/hooks/use-app-alert-dialog";
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
  const [playing, setPlaying] = useState<{ recording: RecordingItem; url: string } | null>(null);

  const list = useRecordings({ page, limit: 20, poleId: poleId ?? undefined, date });
  const del = useDeleteRecording();
  const { confirm, AlertDialogComponent } = useAppAlertDialog();

  const handlePlay = async (recording: RecordingItem) => {
    try {
      const playback = await recordingApi.getPlaybackUrl(Number(recording.id));
      // url อาจเป็น relative path → prefix ด้วย API base
      const fullUrl = playback.url.startsWith("http") ? playback.url : `${env.NEXT_PUBLIC_API_URL}${playback.url}`;
      setPlaying({ recording, url: fullUrl });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#0D47A1]">ภาพกล้อง — บันทึก DVR</h1>
        <p className="text-sm text-[#4A90A4]">เลือกเสาและวันที่เพื่อดูคลิปบันทึก</p>
      </div>

      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">เสา</Label>
            <Select value={poleId ? String(poleId) : ""} onValueChange={(v) => setPoleId(Number(v))}>
              <SelectTrigger>
                <SelectValue placeholder="-- เลือกเสา --" />
              </SelectTrigger>
              <SelectContent>
                {poleLookup.data?.filter((p) => p.hasCamera).map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.poleName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">วันที่</Label>
            <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} />
          </div>
        </CardContent>
      </Card>

      {!poleId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Video className="h-12 w-12 mx-auto mb-2" />
            กรุณาเลือกเสา
          </CardContent>
        </Card>
      ) : list.isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">กำลังโหลด...</CardContent>
        </Card>
      ) : list.data?.data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">ไม่มีบันทึกวันนี้</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.data?.data.map((r) => (
            <Card key={r.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 space-y-2">
                <div className="bg-blue-50 aspect-video rounded flex items-center justify-center">
                  <Video className="h-12 w-12 text-blue-300" />
                </div>
                <div className="text-sm font-medium truncate">{r.filename}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(r.startTime).toLocaleTimeString("th-TH")} · {formatDuration(r.durationSec)} ·{" "}
                  {formatBytes(r.fileSizeBytes)}
                </div>
                <div className="flex gap-2 pt-2 border-t">
                  <Button size="sm" onClick={() => handlePlay(r)}>
                    <Play className="mr-1 h-3.5 w-3.5" />
                    เล่น
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive ml-auto"
                    onClick={() =>
                      confirm({
                        title: "ลบบันทึก",
                        description: `ลบไฟล์ ${r.filename}?`,
                        onAction: () => del.mutate(Number(r.id)),
                        actionVariant: "destructive",
                      })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={playing !== null} onOpenChange={(o) => { if (!o) setPlaying(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{playing?.recording.filename}</DialogTitle>
          </DialogHeader>
          {playing && (
            <video src={playing.url} controls autoPlay className="w-full rounded">
              เบราว์เซอร์ไม่รองรับการเล่นวิดีโอ
            </video>
          )}
        </DialogContent>
      </Dialog>

      {AlertDialogComponent}
    </div>
  );
}
