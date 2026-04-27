"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#0D47A1]">Dashboard</h1>
        <p className="text-sm text-[#4A90A4]">ภาพรวมเสาสัญญาณและสถานะ real-time</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: "PM2.5", value: "—", unit: "µg/m³", color: "bg-amber-500" },
          { label: "อุณหภูมิ", value: "—", unit: "°C", color: "bg-red-500" },
          { label: "ความชื้น", value: "—", unit: "%RH", color: "bg-green-500" },
          { label: "สถานะเสา", value: "—", unit: "", color: "bg-blue-500" },
        ].map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-[#4A90A4]">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#0D47A1]">
                {card.value}
                <span className="text-xs font-normal text-muted-foreground ml-1">{card.unit}</span>
              </div>
              <div className={`h-1 rounded-full mt-3 ${card.color} opacity-30`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">ภาพกล้อง Live</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-lg h-48 md:h-64 flex flex-col items-center justify-center gap-2 text-slate-400">
            <span className="text-3xl">▶</span>
            <span className="text-sm font-medium">เลือกเสาเพื่อดูภาพ Live</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">การแจ้งเตือน</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">ยังไม่มีการแจ้งเตือนที่รอแก้ไข</p>
        </CardContent>
      </Card>
    </div>
  );
}
