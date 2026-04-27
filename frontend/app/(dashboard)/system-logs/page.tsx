"use client";

import { useState } from "react";
import { useSystemLogs } from "@/hooks/api/use-logs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TYPE_COLORS: Record<string, string> = {
  login_success: "bg-green-100 text-green-700",
  login_fail: "bg-red-100 text-red-700",
  logout: "bg-gray-100 text-gray-700",
  captcha_fail: "bg-amber-100 text-amber-700",
  page_access: "bg-blue-100 text-blue-700",
};

export default function SystemLogsPage() {
  const [page, setPage] = useState(1);
  const [logType, setLogType] = useState<string | undefined>();

  const logs = useSystemLogs({ page, limit: 50, logType });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-[#0D47A1]">System Log</h1>
          <p className="text-sm text-[#4A90A4]">บันทึกการเข้าใช้งาน {logs.data?.total ?? 0} รายการ</p>
        </div>
        <Select value={logType ?? "all"} onValueChange={(v) => { setLogType(v === "all" ? undefined : v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            <SelectItem value="login_success">login_success</SelectItem>
            <SelectItem value="login_fail">login_fail</SelectItem>
            <SelectItem value="logout">logout</SelectItem>
            <SelectItem value="captcha_fail">captcha_fail</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F0F7FF] border-b">
                <tr>
                  <th className="px-4 py-2 text-left">เวลา</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">User</th>
                  <th className="px-4 py-2 text-left">IP</th>
                  <th className="px-4 py-2 text-left">Reason</th>
                </tr>
              </thead>
              <tbody>
                {logs.data?.data.map((l) => (
                  <tr key={l.id} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-1.5 text-xs">
                      {new Date(l.createdAt).toLocaleString("th-TH")}
                    </td>
                    <td className="px-4 py-1.5">
                      <Badge variant="outline" className={TYPE_COLORS[l.logType] ?? ""}>
                        {l.logType}
                      </Badge>
                    </td>
                    <td className="px-4 py-1.5">{l.usernameSnap ?? "—"}</td>
                    <td className="px-4 py-1.5 text-xs text-muted-foreground">{l.ipAddress ?? "—"}</td>
                    <td className="px-4 py-1.5 text-xs">{l.failReason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {logs.data && logs.data.total > 50 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            ก่อนหน้า
          </Button>
          <span className="px-4 py-1 text-sm">
            หน้า {page} / {Math.ceil(logs.data.total / 50)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page * 50 >= logs.data.total}
            onClick={() => setPage(page + 1)}
          >
            ถัดไป
          </Button>
        </div>
      )}
    </div>
  );
}
