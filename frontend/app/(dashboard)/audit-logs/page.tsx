"use client";

import { useMemo, useState } from "react";
import { useAuditLogs } from "@/hooks/api/use-logs";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/layout/data-table";
import type { Column } from "@/components/layout/data-table";
import type { AuditLogItem } from "@/lib/api/log";

const columns: Column<AuditLogItem>[] = [
  {
    title: "เวลา",
    dataIndex: "createdAt",
    width: 160,
    render: (r) => <span className="text-xs">{new Date(r.createdAt).toLocaleString("th-TH")}</span>,
  },
  {
    title: "โมดูล",
    dataIndex: "module",
    width: 120,
    render: (r) => <Badge variant="secondary" className="text-[10px]">{r.module}</Badge>,
  },
  {
    title: "การกระทำ",
    dataIndex: "action",
    width: 120,
    render: (r) => <span className="font-medium">{r.action}</span>,
  },
  {
    title: "รหัสเป้าหมาย",
    dataIndex: "targetId",
    width: 120,
    align: "center",
    render: (r) => <span className="text-xs">{r.targetId}</span>,
  },
  {
    title: "รหัสผู้ใช้",
    dataIndex: "userId",
    width: 100,
    align: "center",
    render: (r) => <span className="text-xs">{r.userId}</span>,
  },
  {
    title: "ข้อมูล",
    dataIndex: "payload",
    render: (r) => (
      <span className="text-xs text-muted-foreground">
        {r.payload ? JSON.stringify(r.payload).slice(0, 80) : "—"}
      </span>
    ),
  },
];

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const logs = useAuditLogs({ page, limit });

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4 h-full overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-primary-dark">บันทึกการเปลี่ยนแปลง</h1>
        <p className="text-sm text-brand-muted">{logs.data?.total ?? 0} รายการ</p>
      </div>

      <DataTable<AuditLogItem>
        columns={columns}
        dataSource={logs.data?.data ?? []}
        loading={logs.isLoading}
        rowKey="id"
        className="flex-1 min-h-0"
        pagination={{
          current: page,
          limit,
          total: logs.data?.total ?? 0,
          onChange: (p, l) => { setPage(p); setLimit(l); },
        }}
      />
    </div>
  );
}
