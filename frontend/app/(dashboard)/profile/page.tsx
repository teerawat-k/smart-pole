"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMe, useUpdateMe, useChangeMyPassword } from "@/hooks/api/use-me";
import { useLogout } from "@/hooks/api/use-auth";
import { Loader2 } from "lucide-react";

export default function ProfilePage() {
  const me = useMe();
  const update = useUpdateMe();
  const changePw = useChangeMyPassword();
  const logout = useLogout();

  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", mobileNo: "" });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });

  useEffect(() => {
    if (me.data) {
      setForm({
        firstName: me.data.firstName,
        lastName: me.data.lastName,
        email: me.data.email,
        mobileNo: me.data.mobileNo ?? "",
      });
    }
  }, [me.data]);

  const submitProfile = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate(form, { onError: (e: Error) => toast.error(e.message) });
  };

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.next !== pw.confirm) {
      toast.error("รหัสผ่านใหม่ไม่ตรงกัน");
      return;
    }
    changePw.mutate(
      { currentPassword: pw.current, newPassword: pw.next },
      {
        onSuccess: () => {
          toast.success("เปลี่ยนรหัสผ่านสำเร็จ — กำลัง logout");
          setTimeout(() => logout.mutate(), 1000);
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  if (me.isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-primary-dark">โปรไฟล์ของฉัน</h1>
        <p className="text-sm text-brand-muted">@{me.data?.username} — {me.data?.role?.description || me.data?.role?.name}</p>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">ข้อมูลส่วนตัว</TabsTrigger>
          <TabsTrigger value="password">เปลี่ยนรหัสผ่าน</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6">
          <form onSubmit={submitProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="fn">ชื่อ</Label>
                <Input id="fn" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ln">นามสกุล</Label>
                <Input id="ln" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="em">Email</Label>
                <Input id="em" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="mob">เบอร์โทร</Label>
                <Input id="mob" value={form.mobileNo} onChange={(e) => setForm({ ...form, mobileNo: e.target.value })} />
              </div>
            </div>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="password" className="mt-6">
          <form onSubmit={submitPassword} className="space-y-4 max-w-sm">
            <div className="space-y-1.5">
              <Label>รหัสผ่านปัจจุบัน</Label>
              <Input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>รหัสผ่านใหม่</Label>
              <Input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required minLength={8} />
            </div>
            <div className="space-y-1.5">
              <Label>ยืนยันรหัสผ่านใหม่</Label>
              <Input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required minLength={8} />
            </div>
            <div className="space-y-1">
              <Button type="submit" disabled={changePw.isPending}>
                {changePw.isPending ? "กำลังเปลี่ยน..." : "เปลี่ยนรหัสผ่าน"}
              </Button>
              <p className="text-xs text-muted-foreground">หลังเปลี่ยนสำเร็จ ระบบจะ logout อัตโนมัติ</p>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
