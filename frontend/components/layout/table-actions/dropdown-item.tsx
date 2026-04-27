"use client";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { TableActionItem } from "./types";

interface DropdownActionItemProps {
  item: TableActionItem;
}

/** 1 row ใน overflow dropdown */
export function DropdownActionItem({ item }: DropdownActionItemProps) {
  const Icon = item.icon;
  return (
    <DropdownMenuItem
      variant={item.variant === "destructive" ? "destructive" : "default"}
      onClick={item.disabled ? undefined : item.onClick}
      disabled={item.disabled}
    >
      <Icon className="h-3.5 w-3.5 mr-2 shrink-0" />
      {item.disabled && item.disabledReason ? item.disabledReason : item.label}
    </DropdownMenuItem>
  );
}
