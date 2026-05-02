"use client";

import { useEffect, useState } from "react";
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
import { AppCombobox } from "@/components/layout/app-combobox";

import { useCreateUser, useUpdateUser, useUser } from "@/hooks/api/use-users";
import type { RoleLookupItem } from "@/lib/api/role";
import type { UserCreateInput } from "@/lib/api/user";

const EMPTY: UserCreateInput = {
  username: "",
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  mobileNo: "",
  roleId: 0,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: number | null;
  roles: RoleLookupItem[];
}

export function UserDialog({ open, onOpenChange, editingId, roles }: Props) {
  const isEdit = editingId !== null;
  const [form, setForm] = useState<UserCreateInput>(EMPTY);

  const detail = useUser(editingId, { enabled: open && isEdit });
  const create = useCreateUser();
  const update = useUpdateUser();

  useEffect(() => {
    if (open && detail.data) {
      setForm({
        username: detail.data.username,
        email: detail.data.email,
        password: "",
        firstName: detail.data.firstName,
        lastName: detail.data.lastName,
        mobileNo: detail.data.mobileNo ?? "",
        roleId: detail.data.role.id,
      });
    } else if (open && !isEdit) {
      setForm(EMPTY);
    }
  }, [open, isEdit, detail.data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit) {
      update.mutate(
        {
          id: editingId,
          input: {
            email: form.email,
            firstName: form.firstName,
            lastName: form.lastName,
            mobileNo: form.mobileNo,
            roleId: form.roleId,
          },
        },
        { onSuccess: () => onOpenChange(false), onError: (e: Error) => toast.error(e.message) },
      );
    } else {
      create.mutate(form, {
        onSuccess: () => onOpenChange(false),
        onError: (e: Error) => toast.error(e.message),
      });
    }
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "แก้ไขผู้ใช้" : "เพิ่มผู้ใช้ใหม่"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="username" required>Username</Label>
              <Input
                id="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
                disabled={isEdit}
                pattern="[a-zA-Z0-9._-]+"
                minLength={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" required>อีเมล</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="firstName" required>ชื่อ</Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName" required>นามสกุล</Label>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="mobile">เบอร์โทร</Label>
              <Input
                id="mobile"
                value={form.mobileNo}
                onChange={(e) => setForm({ ...form, mobileNo: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label required>บทบาท</Label>
              <AppCombobox
                options={roles.map((r) => ({ id: r.id, label: r.description || r.name }))}
                value={form.roleId ?? null}
                onChange={(v) => setForm({ ...form, roleId: Number(v) })}
                required
              />
            </div>
            {!isEdit && (
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="password" required>รหัสผ่าน</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!isEdit}
                  minLength={8}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
