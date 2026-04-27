"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";

import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface AppDatePickerProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
}

export function AppDatePicker({ value, onChange, disabled, readOnly, className }: AppDatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const dateValue = value ? new Date(value + "T00:00:00") : undefined;
  const isBlocked = disabled || readOnly;

  return (
    <Popover open={isBlocked ? false : open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start font-normal",
            !value && "text-muted-foreground",
            readOnly && "pointer-events-none",
            className,
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <span className="truncate">
            {dateValue ? formatDate(dateValue) : "เลือกวันที่"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {open && (
          <Calendar
            key={value ?? "empty"}
            mode="single"
            selected={dateValue}
            defaultMonth={dateValue}
            hideToday={!!dateValue}
            onSelect={(date) => {
              if (date) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                onChange(`${year}-${month}-${day}`);
              } else {
                onChange("");
              }
              setOpen(false);
            }}
            initialFocus
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
