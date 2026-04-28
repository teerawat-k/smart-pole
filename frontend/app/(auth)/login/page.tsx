"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/auth-store";
import { useNewCaptcha, useLogin } from "@/hooks/api/use-auth";
import { Loader2, RefreshCcw, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  const captcha = useNewCaptcha();
  const login = useLogin();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");

  // already logged in → redirect
  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [hasHydrated, isAuthenticated, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!captcha.data) return;
    login.mutate(
      {
        username: username.trim(),
        password,
        sessionKey: captcha.data.sessionKey,
        captchaInput: captchaInput.trim(),
      },
      {
        onError: (err: Error) => {
          toast.error(err.message);
          setCaptchaInput("");
          captcha.refetch();
        },
      },
    );
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-linear-to-br from-sidebar via-brand-bg to-brand-bg-light p-4">
      <Card className="w-full max-w-md shadow-2xl border-sidebar-border">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <Image src="/logo.png" alt="Smart Pole" width={120} height={120} priority />
          </div>
          <CardTitle className="text-2xl font-bold text-primary-dark">Smart Pole Management</CardTitle>
          <p className="text-sm text-brand-muted">ระบบบริหารเสาอัจฉริยะ</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">ชื่อผู้ใช้</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="captcha">รหัสยืนยัน</Label>
              <div className="flex items-center gap-2">
                {captcha.isLoading || !captcha.data ? (
                  <div className="h-12 flex-1 bg-muted animate-pulse rounded" />
                ) : (
                  <img
                    src={captcha.data.image}
                    alt="captcha"
                    className="h-12 flex-1 border rounded bg-white object-fill"
                  />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => captcha.refetch()}
                  aria-label="โหลด captcha ใหม่"
                  disabled={captcha.isFetching}
                  className="shrink-0"
                >
                  <RefreshCcw className={`h-4 w-4 ${captcha.isFetching ? "animate-spin" : ""}`} />
                </Button>
              </div>
              <Input
                id="captcha"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                required
                maxLength={6}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={login.isPending || !captcha.data}
            >
              {login.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  เข้าสู่ระบบ
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
