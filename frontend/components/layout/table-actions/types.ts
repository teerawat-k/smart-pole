import type { LucideIcon } from "lucide-react";

export interface TableActionItem {
  label: string;
  icon:  LucideIcon;
  onClick: () => void;
  variant?: "default" | "destructive";
  /** ซ่อน item ออกจาก dropdown */
  hidden?: boolean;
  /** ปิดใช้งาน — ถ้าระบุ disabledReason จะแสดงใน tooltip แทน label */
  disabled?: boolean;
  disabledReason?: string;
}

export interface TableActionGroup {
  label?: string;
  items:  TableActionItem[];
}

export interface TableActionsProps {
  /** รายการ action แบบ flat (ใช้เมื่อไม่ต้องการ group) */
  items?: TableActionItem[];
  /** รายการ action แบบ group คั่นด้วย divider (ใช้เมื่อมีหลายหมวด) */
  groups?: TableActionGroup[];
  /** จำนวน icon สูงสุดที่แสดง — เกินกว่านี้จะซ่อนใน ... dropdown (default: 3) */
  maxVisible?: number;
}

export const DEFAULT_MAX_VISIBLE = 2;
