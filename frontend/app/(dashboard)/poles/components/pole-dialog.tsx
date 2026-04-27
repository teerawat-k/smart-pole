"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCreatePole, usePole, useUpdatePole } from "@/hooks/api/use-poles";
import type { PoleCreateInput } from "@/lib/api/pole";

interface PoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: number | null;
}

const EMPTY_FORM: PoleCreateInput = {
  poleName: "",
  installPlace: "",
  ddnsHostname: "",
  ipCamera: "",
  hasCamera: false,
  hasPm25Sensor: false,
  hasTempHumidity: false,
  hasLed: false,
};

export function PoleDialog({ open, onOpenChange, editingId }: PoleDialogProps) {
  const [form, setForm] = useState<PoleCreateInput>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState<string | null>(null);
  const isEdit = editingId !== null;

  const detail = usePole(editingId, { enabled: open && isEdit });
  const createPole = useCreatePole();
  const updatePole = useUpdatePole();

  useEffect(() => {
    if (open && detail.data) {
      setForm({
        poleName: detail.data.poleName,
        installPlace: detail.data.installPlace,
        ddnsHostname: detail.data.ddnsHostname ?? "",
        ipCamera: detail.data.ipCamera ?? "",
        latitude: detail.data.latitude ?? undefined,
        longitude: detail.data.longitude ?? undefined,
        hasCamera: detail.data.hasCamera,
        hasPm25Sensor: detail.data.hasPm25Sensor,
        hasTempHumidity: detail.data.hasTempHumidity,
        hasLed: detail.data.hasLed,
      });
    } else if (open && !isEdit) {
      setForm(EMPTY_FORM);
      setShowPassword(null);
    }
  }, [open, isEdit, detail.data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit) {
      updatePole.mutate(
        { id: editingId, input: form },
        {
          onSuccess: () => onOpenChange(false),
          onError: (err: Error) => toast.error(err.message),
        },
      );
    } else {
      createPole.mutate(form, {
        onSuccess: (result) => {
          setShowPassword(result.data.mqttPassword);
          // ไม่ปิด dialog — ให้ user copy password
        },
        onError: (err: Error) => toast.error(err.message),
      });
    }
  };

  const isPending = createPole.isPending || updatePole.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? "แก้ไขเสาสัญญาณ" : "เพิ่มเสาใหม่"}</DialogTitle>
        </DialogHeader>

        {showPassword ? (
          <div className="space-y-4 py-4">
            <p className="text-sm font-medium text-amber-700">
              ⚠️ โปรดบันทึก MQTT Password — จะไม่แสดงอีก
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded p-3 font-mono text-xs break-all">
              {showPassword}
            </div>
            <p className="text-xs text-muted-foreground">
              นำ password นี้ไปตั้งค่าในเสาสัญญาณ (MQTT username = pole-{form.poleName})
            </p>
            <DialogFooter>
              <Button
                onClick={() => {
                  setShowPassword(null);
                  onOpenChange(false);
                }}
              >
                เสร็จสิ้น
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="poleName">ชื่อเสา *</Label>
                <Input
                  id="poleName"
                  value={form.poleName}
                  onChange={(e) => setForm({ ...form, poleName: e.target.value })}
                  required
                  placeholder="pole-001"
                  disabled={isEdit}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="installPlace">สถานที่ติดตั้ง *</Label>
                <Input
                  id="installPlace"
                  value={form.installPlace}
                  onChange={(e) => setForm({ ...form, installPlace: e.target.value })}
                  required
                  placeholder="ทางเข้าหลัก"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ddns">DDNS Hostname</Label>
                <Input
                  id="ddns"
                  value={form.ddnsHostname}
                  onChange={(e) => setForm({ ...form, ddnsHostname: e.target.value })}
                  placeholder="example.ddns.net"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ipCamera">IP Camera</Label>
                <Input
                  id="ipCamera"
                  value={form.ipCamera}
                  onChange={(e) => setForm({ ...form, ipCamera: e.target.value })}
                  placeholder="192.168.1.100"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lat">Latitude</Label>
                <Input
                  id="lat"
                  type="number"
                  step="0.0000001"
                  value={form.latitude ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, latitude: e.target.value ? Number(e.target.value) : undefined })
                  }
                  placeholder="13.7563"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lng">Longitude</Label>
                <Input
                  id="lng"
                  type="number"
                  step="0.0000001"
                  value={form.longitude ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, longitude: e.target.value ? Number(e.target.value) : undefined })
                  }
                  placeholder="100.5018"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <Label className="text-sm">อุปกรณ์ที่ติดตั้ง</Label>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { key: "hasCamera", label: "กล้อง CCTV" },
                  { key: "hasPm25Sensor", label: "PM2.5 Sensor" },
                  { key: "hasTempHumidity", label: "Temp/Humidity" },
                  { key: "hasLed", label: "LED" },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between gap-2 p-2 border rounded cursor-pointer hover:bg-muted"
                  >
                    <span>{item.label}</span>
                    <Switch
                      checked={Boolean(form[item.key as keyof PoleCreateInput])}
                      onCheckedChange={(v) => setForm({ ...form, [item.key]: v })}
                    />
                  </label>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isPending} className="bg-[#1565C0] hover:bg-[#0D47A1]">
                {isPending ? "กำลังบันทึก..." : isEdit ? "บันทึก" : "เพิ่มเสา"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
