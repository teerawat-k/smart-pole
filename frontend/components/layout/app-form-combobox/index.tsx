"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import type { ControllerRenderProps, FieldValues } from "react-hook-form";
import * as React from "react";

import { AppFormField } from "@/components/layout/app-form-field";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FormControl } from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  safeOptions,
  getOptionValue,
  findOptionByValue,
  resolveDisplayLabel,
  shouldShowClearCheck,
} from "./helpers";
import type { Option } from "./helpers";

export type { Option } from "./helpers";

interface AppFormComboboxProps {
  name: string;
  label: string | React.ReactNode;
  placeholder?: string;
  options: Option[];
  emptyText?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  layout?: "horizontal" | "vertical";
  labelAlign?: "left" | "right";
  className?: string;
  classNameLabel?: string;
  noLabel?: boolean;
  onChange?: (value: string | number, option?: Option) => void;
}

type ExtendedField = ControllerRenderProps<FieldValues, string> & {
  disabled?: boolean;
  readOnly?: boolean;
};

export function AppFormCombobox({
  name,
  label,
  placeholder = "เลือกข้อมูล",
  options = [],
  emptyText = "ไม่พบข้อมูล",
  required,
  disabled,
  readOnly,
  layout = "vertical",
  labelAlign = "left",
  className,
  classNameLabel,
  noLabel,
  onChange,
}: AppFormComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const opts = safeOptions(options);

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
        const selectedValue = findOptionByValue(opts, field.value);
        const displayLabel = resolveDisplayLabel(selectedValue, required, placeholder);

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
                  role="combobox"
                  aria-expanded={open}
                  className={cn(
                    "w-full justify-between font-normal disabled:opacity-100",
                    !field.value && "text-muted-foreground",
                    isFieldReadOnly && "pointer-events-none opacity-100",
                    "aria-invalid:border-destructive!",
                    className
                  )}
                  disabled={isFieldDisabled}
                >
                  <span className="truncate">{displayLabel}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent
              className="min-w-[--radix-popover-trigger-width] w-auto p-0"
              align="start"
            >
              <Command className="w-full">
                <CommandInput className="h-9" />
                <CommandList
                  className="max-h-[300px] overflow-x-hidden overflow-y-auto"
                  onWheel={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                >
                  <CommandEmpty>{emptyText}</CommandEmpty>
                  <CommandGroup>
                    {!required && (
                      <CommandItem
                        value="__clear__"
                        onSelect={() => {
                          field.onChange(null);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            shouldShowClearCheck(field.value) ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className="text-muted-foreground">ไม่ระบุ</span>
                      </CommandItem>
                    )}
                    {opts.map((option) => {
                      const optionValue = getOptionValue(option);
                      return (
                        <CommandItem
                          key={String(optionValue)}
                          value={String(option.label)}
                          className={cn(optionValue === field.value && "bg-primary/10! font-medium text-primary!")}
                          onSelect={() => {
                            const newValue = optionValue;
                            const currentValue = field.value;

                            if (newValue !== currentValue) {
                              field.onChange(newValue);
                              if (optionValue !== undefined) {
                                onChange?.(optionValue, option);
                              }
                            }
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              optionValue === field.value
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {option.label}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        );
      }}
    </AppFormField>
  );
}
