"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AppDatePicker } from "@/components/layout/app-date-picker";
import { useUploadClip } from "@/hooks/api/use-camera-clips";

const MAX_BYTES = 500 * 1024 * 1024;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poleName: string;
  defaultDate?: string;
  onUploaded?: (date: string) => void;
}

export function UploadClipDialog({ open, onOpenChange, poleName, defaultDate, onUploaded }: Props) {
  const [date, setDate] = useState(() => defaultDate ?? new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadClip();

  // reset เมื่อปิด dialog
  useEffect(() => {
    if (!open) {
      setFile(null);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [open]);

  const handleFile = (f: File | null) => {
    if (!f) {
      setFile(null);
      return;
    }
    if (!f.name.toLowerCase().endsWith(".mp4")) {
      toast.error("รองรับเฉพาะไฟล์ .mp4");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error(`ไฟล์ใหญ่เกิน ${Math.floor(MAX_BYTES / 1024 / 1024)} MB`);
      return;
    }
    setFile(f);
  };

  const handleSubmit = () => {
    if (!file) return;
    setProgress(0);
    upload.mutate(
      { poleName, date, file, onProgress: setProgress },
      {
        onSuccess: () => {
          onUploaded?.(date);
          onOpenChange(false);
        },
        onError: (e: Error) => {
          toast.error(e.message);
          setProgress(0);
        },
      },
    );
  };

  const sizeMB = file ? (file.size / 1024 / 1024).toFixed(1) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>อัปโหลดคลิป — {poleName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">วันที่บันทึก</Label>
            <AppDatePicker value={date} onChange={setDate} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">
              ไฟล์วิดีโอ <span className="text-muted-foreground">(.mp4 ≤ 500 MB)</span>
            </Label>
            <Input
              ref={inputRef}
              type="file"
              accept="video/mp4,.mp4"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              disabled={upload.isPending}
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                {file.name} · {sizeMB} MB
              </p>
            )}
          </div>

          {upload.isPending && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>กำลังอัปโหลด...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={upload.isPending}>
            ยกเลิก
          </Button>
          <Button onClick={handleSubmit} disabled={!file || upload.isPending}>
            <Upload className="mr-2 h-4 w-4" />
            {upload.isPending ? "กำลังอัปโหลด..." : "อัปโหลด"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
