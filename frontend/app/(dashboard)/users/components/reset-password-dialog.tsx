"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResetUserPassword } from "@/hooks/api/use-users";

interface Props {
  target: { id: number; username: string } | null;
  onOpenChange: (open: boolean) => void;
}

export function ResetPasswordDialog({ target, onOpenChange }: Props) {
  const [password, setPassword] = useState("");
  const reset = useResetUserPassword();
  const open = target !== null;

  useEffect(() => {
    if (!open) setPassword("");
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    reset.mutate(
      { id: target.id, newPassword: password },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>ตั้งรหัสผ่านใหม่ — {target?.username}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="newpw">รหัสผ่านใหม่</Label>
            <Input
              id="newpw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={reset.isPending}>
              {reset.isPending ? "กำลังตั้งรหัส..." : "ยืนยัน"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
