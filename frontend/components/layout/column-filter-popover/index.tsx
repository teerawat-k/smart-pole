"use client";

import { useMemo, useState } from "react";
import { Filter, Search } from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  filterOptionsBySearch,
  toggleId,
  areAllVisibleChecked,
  countVisibleChecked,
  toggleAllVisible as toggleAllVisibleHelper,
  resolveApplyValue,
  isFilterActive,
} from "./helpers";
import type { ColumnFilterOption } from "./helpers";

export type { ColumnFilterOption } from "./helpers";

// Excel-like column filter popover
//   - default = checked all → onApply ส่ง undefined (= ไม่ filter)
//   - user uncheck บางรายการ → onApply ส่ง IDs ที่ยัง checked
//   - ถ้า check ทั้งหมด (subset = allIds) → ส่ง undefined

interface ColumnFilterPopoverProps {
  title:      string;
  options:    ColumnFilterOption[];
  isLoading?: boolean;
  /** IDs ที่ active ตอนนี้ — `undefined` = check all (default) */
  value:      number[] | undefined;
  onApply:    (values: number[] | undefined) => void;
}

export function ColumnFilterPopover({
  title, options, isLoading, value, onApply,
}: ColumnFilterPopoverProps) {
  const [open, setOpen]   = useState(false);
  const [search, setSearch] = useState("");

  const allIds = useMemo(() => options.map((o) => o.id), [options]);
  const initialSelected = value ?? allIds;
  const [draft, setDraft] = useState<number[]>(initialSelected);

  // reset draft เมื่อเปิด (ไม่เก็บค่าค้างจากครั้งก่อน)
  function handleOpenChange(next: boolean) {
    if (next) {
      setDraft(value ?? allIds);
      setSearch("");
    }
    setOpen(next);
  }

  const filteredOptions = useMemo(
    () => filterOptionsBySearch(options, search),
    [options, search],
  );
  const visibleIds = filteredOptions.map((o) => o.id);
  const visibleCheckedCount = countVisibleChecked(draft, visibleIds);
  const isAllVisibleChecked = areAllVisibleChecked(draft, visibleIds);
  const isIndeterminate = visibleCheckedCount > 0 && visibleCheckedCount < visibleIds.length;

  function handleToggleOne(id: number) {
    setDraft((prev) => toggleId(prev, id));
  }

  function handleToggleAllVisible() {
    setDraft((prev) => toggleAllVisibleHelper(prev, visibleIds));
  }

  function handleReset() {
    setDraft(allIds);
    onApply(undefined);
    setOpen(false);
  }

  function handleApply() {
    onApply(resolveApplyValue(draft, allIds));
    setOpen(false);
  }

  const isFiltered = isFilterActive(value, allIds);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative inline-flex items-center justify-center h-5 w-5 rounded hover:bg-muted-foreground/10",
            isFiltered ? "text-primary" : "text-muted-foreground",
          )}
          onClick={(e) => e.stopPropagation()}
          aria-label={`กรอง ${title}`}
        >
          {isFiltered && (
            <span
              aria-hidden
              className="absolute inset-0 rounded-full bg-primary/40 animate-ping pointer-events-none"
            />
          )}
          <Filter
            className="relative h-3.5 w-3.5"
            fill={isFiltered ? "currentColor" : "none"}
            strokeWidth={isFiltered ? 2.5 : 2}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`ค้นหา ${title}`}
            className="pl-8 h-8"
          />
        </div>

        <label className="flex items-center gap-2 py-1 cursor-pointer select-none">
          <Checkbox
            checked={isIndeterminate ? "indeterminate" : isAllVisibleChecked}
            onCheckedChange={handleToggleAllVisible}
            disabled={isLoading || options.length === 0}
          />
          <span className="text-sm">เลือกทั้งหมด</span>
        </label>

        <Separator className="my-2" />

        <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-2 text-center">กำลังโหลด…</div>
          ) : filteredOptions.length === 0 ? (
            <div className="text-sm text-muted-foreground py-2 text-center">ไม่พบข้อมูล</div>
          ) : (
            filteredOptions.map((opt) => (
              <label
                key={opt.id}
                className="flex items-center gap-2 py-0.5 cursor-pointer select-none"
              >
                <Checkbox
                  checked={draft.includes(opt.id)}
                  onCheckedChange={() => handleToggleOne(opt.id)}
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))
          )}
        </div>

        <Separator className="my-2" />

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
          >
            รีเซ็ต
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleApply}
            disabled={isLoading}
          >
            ตกลง
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
