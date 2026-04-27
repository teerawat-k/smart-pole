"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { usePoleLookup } from "@/hooks/api/use-poles";
import { useSensorTypes, useSensorHistory } from "@/hooks/api/use-sensors";
import { Download, Search } from "lucide-react";

export default function SensorPage() {
  const poleLookup = usePoleLookup();
  const sensorTypes = useSensorTypes();

  const [poleId, setPoleId] = useState<number | null>(null);
  const [sensorKey, setSensorKey] = useState<string>("pm25");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 16));
  const [search, setSearch] = useState(false);

  const range = useMemo(() => (search ? { from: new Date(from), to: new Date(to) } : null), [search, from, to]);

  const history = useSensorHistory(poleId, sensorKey, range);

  const handleExportCsv = () => {
    if (!history.data?.data || history.data.data.length === 0) return;
    const rows = history.data.data as Array<Record<string, unknown>>;
    const keys = Object.keys(rows[0] ?? {});
    const header = keys.join(",");
    const lines = rows.map((r) =>
      keys
        .map((k) => {
          const v = r[k];
          if (v === null || v === undefined) return "";
          if (v instanceof Date) return v.toISOString();
          return String(v);
        })
        .join(","),
    );
    const csv = "﻿" + [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sensor-${sensorKey}-${poleId}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#0D47A1]">ข้อมูล Sensor</h1>
        <p className="text-sm text-[#4A90A4]">ค้นประวัติค่าจาก sensor บนเสาสัญญาณ</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(true);
            }}
            className="grid grid-cols-1 md:grid-cols-5 gap-3"
          >
            <div className="space-y-1">
              <Label className="text-xs">เสา</Label>
              <Select value={poleId ? String(poleId) : ""} onValueChange={(v) => setPoleId(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="-- เลือกเสา --" />
                </SelectTrigger>
                <SelectContent>
                  {poleLookup.data?.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.poleName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Sensor</Label>
              <Select value={sensorKey} onValueChange={setSensorKey}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sensorTypes.data?.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ตั้งแต่</Label>
              <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ถึง</Label>
              <Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={!poleId} className="w-full bg-[#1565C0]">
                <Search className="mr-2 h-4 w-4" />
                ค้นหา
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {search && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">ผลการค้นหา ({history.data?.total ?? 0} รายการ)</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={!history.data?.data.length}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            {history.isLoading ? (
              <div className="p-8 text-center text-muted-foreground">กำลังโหลด...</div>
            ) : !history.data || history.data.total === 0 ? (
              <div className="p-8 text-center text-muted-foreground">ไม่พบข้อมูล</div>
            ) : (
              <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-sm">
                  <thead className="bg-[#F0F7FF] sticky top-0 border-b">
                    <tr>
                      {Object.keys(history.data.data[0] as Record<string, unknown>).map((k) => (
                        <th key={k} className="px-3 py-2 text-left font-medium">
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(history.data.data as Array<Record<string, unknown>>).map((row, i) => (
                      <tr key={i} className="border-b">
                        {Object.keys(row).map((k) => (
                          <td key={k} className="px-3 py-1.5">
                            {row[k] === null || row[k] === undefined
                              ? "—"
                              : typeof row[k] === "string" && k === "time"
                                ? new Date(row[k] as string).toLocaleString("th-TH")
                                : String(row[k])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
