"use client";

import { useState } from "react";
import { useSystemLogs, useAuditLogs } from "@/hooks/api/use-logs";
import { Badge } from "@/components/ui/badge";
import { AppCombobox } from "@/components/layout/app-combobox";
import { DataTable } from "@/components/layout/data-table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Column } from "@/components/layout/data-table";
import type { SystemLogItem, AuditLogItem } from "@/lib/api/log";
import { formatDateTime } from "@/lib/format";

// ── System log tab ─────────────────────────────────────────

const SYSTEM_LOG_TYPE_COLORS: Record<string, string> = {
  login_success: "bg-green-100 text-green-700",
  login_fail: "bg-red-100 text-red-700",
  logout: "bg-gray-100 text-gray-700",
  captcha_fail: "bg-amber-100 text-amber-700",
  page_access: "bg-blue-100 text-blue-700",
  password_changed: "bg-violet-100 text-violet-700",
  password_reset: "bg-orange-100 text-orange-700",
  account_locked: "bg-red-200 text-red-800",
  account_unlocked: "bg-emerald-100 text-emerald-700",
};

const SYSTEM_LOG_FILTER_OPTIONS = [
  { id: "all", label: "ทั้งหมด" },
  { id: "login_success", label: "login_success" },
  { id: "login_fail", label: "login_fail" },
  { id: "logout", label: "logout" },
  { id: "captcha_fail", label: "captcha_fail" },
  { id: "page_access", label: "page_access" },
  { id: "password_changed", label: "password_changed" },
  { id: "password_reset", label: "password_reset" },
  { id: "account_locked", label: "account_locked" },
  { id: "account_unlocked", label: "account_unlocked" },
];

const systemLogColumns: Column<SystemLogItem>[] = [
  {
    title: "เวลา",
    dataIndex: "createdAt",
    width: 160,
    render: (r) => <span className="text-xs">{formatDateTime(r.createdAt)}</span>,
  },
  {
    title: "ประเภท",
    dataIndex: "logType",
    width: 180,
    render: (r) => (
      <Badge variant="outline" className={SYSTEM_LOG_TYPE_COLORS[r.logType] ?? ""}>
        {r.logType}
      </Badge>
    ),
  },
  {
    title: "ผู้ใช้",
    dataIndex: "usernameSnap",
    render: (r) => r.usernameSnap ?? "—",
  },
  {
    title: "IP",
    dataIndex: "ipAddress",
    width: 140,
    render: (r) => <span className="text-xs text-muted-foreground">{r.ipAddress ?? "—"}</span>,
  },
  {
    title: "เหตุผล",
    dataIndex: "failReason",
    render: (r) => <span className="text-xs">{r.failReason ?? "—"}</span>,
  },
];

function SystemLogsTab() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [logType, setLogType] = useState<string | undefined>();

  const logs = useSystemLogs({ page, limit, logType });

  function handleTypeChange(v: string | number) {
    setLogType(v === "all" ? undefined : String(v));
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden">
      <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
        <p className="text-sm text-brand-muted">
          บันทึกการเข้าใช้งาน {logs.data?.total ?? 0} รายการ
        </p>
        <AppCombobox
          className="w-52"
          options={SYSTEM_LOG_FILTER_OPTIONS}
          value={logType ?? "all"}
          onChange={handleTypeChange}
          required
        />
      </div>

      <DataTable<SystemLogItem>
        columns={systemLogColumns}
        dataSource={logs.data?.data ?? []}
        loading={logs.isLoading}
        rowKey="id"
        className="flex-1 min-h-0"
        pagination={{
          current: page,
          limit,
          total: logs.data?.total ?? 0,
          onChange: (p, l) => {
            setPage(p);
            setLimit(l);
          },
        }}
      />
    </div>
  );
}

// ── Audit log tab ──────────────────────────────────────────

const AUDIT_ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  STATUS_CHANGE: "bg-amber-100 text-amber-700",
  RESET_PASSWORD: "bg-orange-100 text-orange-700",
  CHANGE_PASSWORD: "bg-violet-100 text-violet-700",
  UNLOCK: "bg-emerald-100 text-emerald-700",
  LOGIN: "bg-gray-100 text-gray-700",
  LOGOUT: "bg-gray-100 text-gray-700",
};

function renderDiff(before: Record<string, unknown> | null, after: Record<string, unknown> | null): React.ReactNode {
  if (!before && !after) return <span className="text-xs text-muted-foreground">—</span>;
  if (!before || !after) {
    const data = before ?? after;
    return (
      <span className="text-xs font-mono text-muted-foreground">
        {JSON.stringify(data)}
      </span>
    );
  }

  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  const changedKeys = keys.filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));

  if (changedKeys.length === 0) {
    return <span className="text-xs text-muted-foreground">ไม่มีการเปลี่ยนแปลง</span>;
  }

  return (
    <div className="flex flex-col gap-0.5">
      {changedKeys.map((k) => (
        <span key={k} className="text-xs font-mono">
          <span className="text-muted-foreground">{k}: </span>
          <span className="text-red-600 line-through">{String(before[k] ?? "—")}</span>
          {" → "}
          <span className="text-green-700">{String(after[k] ?? "—")}</span>
        </span>
      ))}
    </div>
  );
}

function renderDetail(row: AuditLogItem): React.ReactNode {
  if (row.before !== null || row.after !== null) {
    return renderDiff(row.before, row.after);
  }
  if (row.payload !== null) {
    return (
      <span className="text-xs font-mono text-muted-foreground">
        {JSON.stringify(row.payload)}
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">—</span>;
}

const auditLogColumns: Column<AuditLogItem>[] = [
  {
    title: "เวลา",
    dataIndex: "createdAt",
    width: 160,
    render: (r) => <span className="text-xs">{formatDateTime(r.createdAt)}</span>,
  },
  {
    title: "โมดูล",
    dataIndex: "module",
    width: 120,
    render: (r) => <span className="text-xs font-mono">{r.module}</span>,
  },
  {
    title: "การกระทำ",
    dataIndex: "action",
    width: 160,
    render: (r) => (
      <Badge variant="outline" className={AUDIT_ACTION_COLORS[r.action] ?? ""}>
        {r.action}
      </Badge>
    ),
  },
  {
    title: "รายละเอียด",
    dataIndex: "payload",
    render: (r) => renderDetail(r),
  },
  {
    title: "ผู้ดำเนินการ (userId)",
    dataIndex: "userId",
    width: 160,
    render: (r) => <span className="text-xs text-muted-foreground">{r.userId}</span>,
  },
];

function AuditLogsTab() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const logs = useAuditLogs({ page, limit });

  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden">
      <div className="flex items-center shrink-0">
        <p className="text-sm text-brand-muted">
          บันทึกการเปลี่ยนแปลงข้อมูล {logs.data?.total ?? 0} รายการ
        </p>
      </div>

      <DataTable<AuditLogItem>
        columns={auditLogColumns}
        dataSource={logs.data?.data ?? []}
        loading={logs.isLoading}
        rowKey="id"
        className="flex-1 min-h-0"
        pagination={{
          current: page,
          limit,
          total: logs.data?.total ?? 0,
          onChange: (p, l) => {
            setPage(p);
            setLimit(l);
          },
        }}
      />
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────

export default function SystemLogsPage() {
  return (
    <div className="p-4 md:p-6 flex flex-col gap-4 h-full overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-primary-dark">บันทึกกิจกรรม</h1>
      </div>

      <Tabs defaultValue="access" className="flex flex-col flex-1 min-h-0">
        <TabsList className="shrink-0 w-fit">
          <TabsTrigger value="access">การเข้าใช้งาน</TabsTrigger>
          <TabsTrigger value="changes">การเปลี่ยนแปลงข้อมูล</TabsTrigger>
        </TabsList>

        <TabsContent value="access" className="flex-1 min-h-0 mt-4">
          <SystemLogsTab />
        </TabsContent>

        <TabsContent value="changes" className="flex-1 min-h-0 mt-4">
          <AuditLogsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
