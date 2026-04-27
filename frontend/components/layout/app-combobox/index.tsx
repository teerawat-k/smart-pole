"use client";

import * as React from "react";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { OptionItem } from "./option-item";
import {
  findSelectedOption,
  filterOptionsByGroup,
  resolveDisplayLabel,
  hasGroups,
} from "./helpers";
import type { ComboboxOption, ComboboxGroup } from "./helpers";

export type { ComboboxOption, ComboboxGroup } from "./helpers";

interface AppComboboxProps {
  value: string | number | null | undefined;
  onChange: (value: string | number) => void;
  onClear?: () => void;
  options: ComboboxOption[];
  groups?: ComboboxGroup[];
  placeholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  noChevron?: boolean;
}

export function AppCombobox({
  value,
  onChange,
  onClear,
  options,
  groups,
  placeholder = "เลือก",
  emptyText = "ไม่พบข้อมูล",
  className,
  disabled,
  required,
  noChevron,
}: AppComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selected = findSelectedOption(options, value);
  const displayLabel = resolveDisplayLabel(selected, required, placeholder);

  const clearItem = !required && onClear && (
    <CommandItem
      value="__clear__"
      onSelect={() => {
        onClear();
        setOpen(false);
      }}
      className={cn(!value && value !== 0 && "bg-primary/10 font-medium")}
    >
      <span className="text-muted-foreground">ไม่ระบุ</span>
    </CommandItem>
  );

  const grouped = hasGroups(groups);

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            "font-normal disabled:opacity-100",
            noChevron ? "justify-center px-1" : "justify-between",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{displayLabel}</span>
          {!noChevron && <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="min-w-[--radix-popover-trigger-width] w-auto p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder} className="h-9" />
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandEmpty>{emptyText}</CommandEmpty>
            {grouped ? (
              <>
                {clearItem && (
                  <CommandGroup>{clearItem}</CommandGroup>
                )}
                {groups.map((group, idx) => {
                  const groupOptions = filterOptionsByGroup(options, group.key);
                  if (groupOptions.length === 0) return null;
                  return (
                    <React.Fragment key={group.key}>
                      {idx > 0 && <CommandSeparator />}
                      <CommandGroup heading={group.label}>
                        {groupOptions.map((option) => (
                          <OptionItem key={String(option.id)} option={option} value={value} onChange={onChange} setOpen={setOpen} />
                        ))}
                      </CommandGroup>
                    </React.Fragment>
                  );
                })}
              </>
            ) : (
              <CommandGroup>
                {clearItem}
                {options.map((option) => (
                  <OptionItem key={String(option.id)} option={option} value={value} onChange={onChange} setOpen={setOpen} />
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
