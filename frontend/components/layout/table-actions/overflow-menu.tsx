"use client";

import { Ellipsis } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TableActionGroup, TableActionItem } from "./types";
import { DropdownActionItem } from "./dropdown-item";

interface OverflowMenuProps {
  /** flat list — ใช้เมื่อไม่มี group structure */
  items?: TableActionItem[];
  /** group list — ใช้เมื่อมี group + separator */
  groups?: TableActionGroup[];
}

/** Dropdown ... menu สำหรับ overflow items */
export function OverflowMenu({ items, groups }: OverflowMenuProps) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="เพิ่มเติม"
            >
              <Ellipsis className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>เพิ่มเติม</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        {items
          ? items.map((item, i) => <DropdownActionItem key={i} item={item} />)
          : groups?.map((group, gi) => (
              <div key={gi}>
                {gi > 0 && <DropdownMenuSeparator />}
                {group.items.map((item, i) => (
                  <DropdownActionItem key={i} item={item} />
                ))}
              </div>
            ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
