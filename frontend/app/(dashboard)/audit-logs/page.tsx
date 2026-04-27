"use client";

import { useState } from "react";
import { useAuditLogs } from "@/hooks/api/use-logs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const logs = useAuditLogs({ page, limit: 50 });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#0D47A1]">Audit Log</h1>
        <p className="text-sm text-[#4A90A4]">บันทึกการเปลี่ยนแปลง {logs.data?.total ?? 0} รายการ</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F0F7FF] border-b">
                <tr>
                  <th className="px-4 py-2 text-left">เวลา</th>
                  <th className="px-4 py-2 text-left">Module</th>
                  <th className="px-4 py-2 text-left">Action</th>
                  <th className="px-4 py-2 text-left">Target ID</th>
                  <th className="px-4 py-2 text-left">User ID</th>
                  <th className="px-4 py-2 text-left">Payload</th>
                </tr>
              </thead>
              <tbody>
                {logs.data?.data.map((l) => (
                  <tr key={l.id} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-1.5 text-xs">{new Date(l.createdAt).toLocaleString("th-TH")}</td>
                    <td className="px-4 py-1.5">
                      <Badge variant="secondary" className="text-[10px]">
                        {l.module}
                      </Badge>
                    </td>
                    <td className="px-4 py-1.5 font-medium">{l.action}</td>
                    <td className="px-4 py-1.5 text-xs">{l.targetId}</td>
                    <td className="px-4 py-1.5 text-xs">{l.userId}</td>
                    <td className="px-4 py-1.5 text-xs text-muted-foreground max-w-xs truncate">
                      {l.payload ? JSON.stringify(l.payload).slice(0, 80) : "—"}
                    </td>
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
