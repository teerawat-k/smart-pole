"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import type { ControllerRenderProps, FieldValues } from "react-hook-form";

import { AppFormField } from "@/components/layout/app-form-field";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { FormControl } from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AppFormDatePickerProps {
  name: string;
  label: string | React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  layout?: "horizontal" | "vertical";
  labelAlign?: "left" | "right";
  className?: string;
  classNameLabel?: string;
  noLabel?: boolean;
}

type ExtendedField = ControllerRenderProps<FieldValues, string> & {
  disabled?: boolean;
  readOnly?: boolean;
};

export function AppFormDatePicker({
  name,
  label,
  required,
  disabled,
  readOnly,
  layout = "vertical",
  labelAlign = "left",
  className,
  classNameLabel,
  noLabel,
}: AppFormDatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <AppFormField
      name={name}
      label={label}
      required={required}
      layout={layout}
      labelAlign={labelAlign}
      className={className}
      classNameLabel={classNameLabel}
      disabled={disabled}
      readOnly={readOnly}
      noLabel={noLabel}
    >
      {(fieldProps) => {
        const field = fieldProps as ExtendedField;
        const isFieldDisabled = !!field.disabled;
        const isFieldReadOnly = !!field.readOnly;

        // Convert string date (YYYY-MM-DD) to Date object
        const dateValue = field.value ? new Date(field.value + "T00:00:00") : undefined;

        return (
          <Popover
            open={isFieldDisabled || isFieldReadOnly ? false : open}
            onOpenChange={setOpen}
            modal={true}
          >
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start font-normal disabled:opacity-100",
                    !field.value && "text-muted-foreground",
                    isFieldReadOnly && "pointer-events-none opacity-100",
                    "aria-invalid:border-destructive!"
                  )}
                  disabled={isFieldDisabled}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <span className="truncate">
                    {dateValue
                      ? formatDate(dateValue)
                      : "เลือกวันที่"}
                  </span>
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              {open && (
                <Calendar
                  key={field.value ?? "empty"}
                  mode="single"
                  selected={dateValue}
                  defaultMonth={dateValue}
                  hideToday={!!dateValue}
                  onSelect={(date) => {
                    if (date) {
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, "0");
                      const day = String(date.getDate()).padStart(2, "0");
                      field.onChange(`${year}-${month}-${day}`);
                    } else {
                      field.onChange("");
                    }
                    setOpen(false);
                  }}
                  initialFocus
                />
              )}
            </PopoverContent>
          </Popover>
        );
      }}
    </AppFormField>
  );
}
