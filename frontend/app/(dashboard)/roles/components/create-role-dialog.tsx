"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useCreateRole } from "@/hooks/api/use-roles";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRoleDialog({ open, onOpenChange }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const create = useCreateRole();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      { name: name.trim(), description: description.trim() || undefined, permissionIds: [] },
      {
        onSuccess: () => {
          setName("");
          setDescription("");
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
          <DialogTitle>เพิ่ม Role ใหม่</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="role-name">Role name * (kebab-case)</Label>
            <Input
              id="role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="operator"
              required
              pattern="[a-z][a-z0-9_-]*"
              minLength={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role-desc">คำอธิบาย</Label>
            <Textarea
              id="role-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ผู้ปฏิบัติงาน — เข้าถึงข้อมูล monitoring"
              rows={2}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            หลังสร้าง สามารถจัดการ permission ของ role ได้ที่ปุ่ม "จัดการ Permission"
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "กำลังสร้าง..." : "สร้าง"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
