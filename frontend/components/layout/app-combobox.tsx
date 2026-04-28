"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  id: string | number;
  label: string;
}

interface AppComboboxProps {
  options: ComboboxOption[];
  value: string | number | null;
  onChange: (value: string | number) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export function AppCombobox({
  options,
  value,
  onChange,
  className,
  disabled,
}: AppComboboxProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => String(o.id) === String(value ?? ""));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("justify-between font-normal", className)}
        >
          <span className={cn(!selected && "text-muted-foreground")}>
            {selected?.label ?? "เลือก..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        style={{ minWidth: "var(--radix-popover-trigger-width)", width: "auto" }}
      >
        <Command>
          <CommandInput placeholder="ค้นหา..." />
          <CommandList>
            <CommandEmpty>ไม่พบข้อมูล</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      String(value ?? "") === String(option.id) ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
