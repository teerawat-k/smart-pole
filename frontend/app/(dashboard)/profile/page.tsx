"use client";

import { useAuthStore } from "@/stores/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold text-[#0D47A1]">โปรไฟล์ของฉัน</h1>

      <Card className="mt-6 max-w-2xl">
        <CardHeader>
          <CardTitle>ข้อมูลผู้ใช้</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Row label="Username" value={user?.username} />
          <Row label="ชื่อ-นามสกุล" value={user?.name} />
          <Row label="Role" value={user?.role} />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-2 border-b last:border-0">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="col-span-2 text-sm font-medium">{value ?? "—"}</div>
    </div>
  );
}
