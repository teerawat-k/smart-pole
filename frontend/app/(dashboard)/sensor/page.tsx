"use client";

import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { AppCombobox } from "@/components/layout/app-combobox";
import { AppDatePicker } from "@/components/layout/app-date-picker";
import { DataTable } from "@/components/layout/data-table";
import type { Column, SortState } from "@/components/layout/data-table";
import { usePoleLookup } from "@/hooks/api/use-poles";
import { useSensorHistory } from "@/hooks/api/use-sensors";
import { formatDateTime } from "@/lib/format";
import type { SensorReadingRow } from "@/lib/api/sensor";

const SORT_WHITELIST = new Set(["seq", "ingestedAt", "pm25", "temperature", "humidity"]);

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** YYYY-MM-DD → epoch ms ที่ 00:00:00 ของโซน Asia/Bangkok */
function dateStartEpoch(date: string): number {
  return new Date(`${date}T00:00:00+07:00`).getTime();
}
/** YYYY-MM-DD → epoch ms ที่ 23:59:59.999 ของโซน Asia/Bangkok */
function dateEndEpoch(date: string): number {
  return new Date(`${date}T23:59:59.999+07:00`).getTime();
}

export default function SensorPage() {
  const poleLookup = usePoleLookup();
  const [poleId, setPoleId] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState<string>(todayISO);
  const [toDate, setToDate] = useState<string>(todayISO);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sort, setSort] = useState<SortState | undefined>({ column: "seq", direction: "desc" });

  useEffect(() => {
    if (poleId === null && poleLookup.data && poleLookup.data.length > 0) {
      setPoleId(poleLookup.data[0]!.id);
    }
  }, [poleLookup.data, poleId]);

  // เปลี่ยน filter → reset page
  useEffect(() => { setPage(1); }, [poleId, fromDate, toDate]);

  // ถ้า fromDate > toDate → bump toDate ให้เท่า fromDate
  useEffect(() => {
    if (fromDate > toDate) setToDate(fromDate);
  }, [fromDate, toDate]);

  const history = useSensorHistory(poleId, {
    page,
    limit,
    from:      dateStartEpoch(fromDate),
    to:        dateEndEpoch(toDate),
    sortBy:    sort?.column,
    sortOrder: sort?.direction,
  });

  const handleSort = (column: string, direction: "asc" | "desc" | null) => {
    if (!SORT_WHITELIST.has(column)) return;
    setSort(direction ? { column, direction } : undefined);
    setPage(1);
  };

  const poleOptions = useMemo(
    () => (poleLookup.data ?? []).map((p) => ({ id: p.id, label: p.poleName })),
    [poleLookup.data],
  );

  const columns = useMemo<Column<SensorReadingRow>[]>(() => [
    {
      title: "ลำดับ",
      dataIndex: "seq",
      sorter: true,
      width: 100,
      render: (r) => <span className="font-medium">{r.seq}</span>,
    },
    {
      title: "เวลาที่บันทึก",
      dataIndex: "ingestedAt",
      sorter: true,
      width: 220,
      render: (r) => <span>{formatDateTime(r.ingestedAt)}</span>,
    },
    {
      title: "PM2.5",
      dataIndex: "pm25",
      sorter: true,
      width: 140,
      render: (r) =>
        r.pm25 !== null ? (
          <span>
            {Number(r.pm25).toFixed(2)} <span className="text-xs text-muted-foreground">µg/m³</span>
          </span>
        ) : <span className="text-muted-foreground">—</span>,
    },
    {
      title: "อุณหภูมิ",
      dataIndex: "temperature",
      sorter: true,
      width: 140,
      render: (r) =>
        r.temperature !== null ? (
          <span>
            {Number(r.temperature).toFixed(2)} <span className="text-xs text-muted-foreground">°C</span>
          </span>
        ) : <span className="text-muted-foreground">—</span>,
    },
    {
      title: "ความชื้น",
      dataIndex: "humidity",
      sorter: true,
      width: 140,
      render: (r) =>
        r.humidity !== null ? (
          <span>
            {Number(r.humidity).toFixed(2)} <span className="text-xs text-muted-foreground">%RH</span>
          </span>
        ) : <span className="text-muted-foreground">—</span>,
    },
  ], []);

  const selectedPoleName = poleOptions.find((p) => p.id === poleId)?.label ?? "";

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4 h-full overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-primary-dark">ข้อมูลเซนเซอร์</h1>
        <p className="text-sm text-brand-muted">
          ประวัติค่าจากเซนเซอร์บนเสาสัญญาณ
          {selectedPoleName && ` · ${selectedPoleName}`}
          {history.data?.total !== undefined && ` · ทั้งหมด ${history.data.total.toLocaleString()} รายการ`}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 shrink-0">
        <div className="space-y-1 w-72">
          <Label className="text-xs">เสาสัญญาณ</Label>
          <AppCombobox
            className="w-full"
            options={poleOptions}
            value={poleId}
            onChange={(v) => setPoleId(Number(v))}
            required
          />
        </div>
        <div className="space-y-1 w-44">
          <Label className="text-xs">วันที่เริ่มต้น</Label>
          <AppDatePicker className="w-full" value={fromDate} onChange={setFromDate} />
        </div>
        <div className="space-y-1 w-44">
          <Label className="text-xs">วันที่สิ้นสุด</Label>
          <AppDatePicker className="w-full" value={toDate} onChange={setToDate} />
        </div>
      </div>

      <DataTable<SensorReadingRow>
        columns={columns}
        dataSource={history.data?.data ?? []}
        loading={history.isLoading}
        rowKey="id"
        sort={sort}
        onSort={handleSort}
        className="flex-1 min-h-0"
        pagination={{
          current: page,
          limit,
          total: history.data?.total ?? 0,
          onChange: (p, l) => { setPage(p); setLimit(l); },
        }}
      />
    </div>
  );
}
