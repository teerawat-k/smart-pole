"use client";

import { CommandItem } from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ComboboxOption } from "./helpers";

interface OptionItemProps {
  option: ComboboxOption;
  value: string | number | null | undefined;
  onChange: (value: string | number) => void;
  setOpen: (open: boolean) => void;
}

export function OptionItem({ option, value, onChange, setOpen }: OptionItemProps) {
  return (
    <CommandItem
      key={String(option.id)}
      value={String(option.label)}
      disabled={Boolean(option.warning)}
      onSelect={() => {
        if (option.warning) return;
        onChange(option.id);
        setOpen(false);
      }}
      className={cn(
        option.id === value && "bg-primary/10! font-medium text-primary!",
        option.warning && "text-muted-foreground cursor-not-allowed opacity-60",
      )}
    >
      {option.warning ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="line-through decoration-muted-foreground/50 w-full">{option.label}</span>
          </TooltipTrigger>
          <TooltipContent side="right">{option.warning}</TooltipContent>
        </Tooltip>
      ) : (
        option.label
      )}
    </CommandItem>
  );
}
