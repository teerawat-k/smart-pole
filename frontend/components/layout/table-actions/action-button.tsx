"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { TableActionItem } from "./types";
import { resolveTooltip } from "./helpers";

interface ActionButtonProps {
  item: TableActionItem;
}

/** Inline icon button พร้อม tooltip — ใช้กับ items ที่ไม่ overflow */
export function ActionButton({ item }: ActionButtonProps) {
  const isDestructive = item.variant === "destructive";
  const Icon = item.icon;
  const tooltipText = resolveTooltip(item);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7",
            isDestructive && !item.disabled && "text-destructive hover:text-destructive hover:bg-destructive/10",
            item.disabled && "opacity-30 cursor-not-allowed pointer-events-none",
          )}
          onClick={item.disabled ? undefined : item.onClick}
          tabIndex={item.disabled ? -1 : undefined}
          aria-label={tooltipText}
          aria-disabled={item.disabled}
        >
          <Icon className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>{tooltipText}</p>
      </TooltipContent>
    </Tooltip>
  );
}
