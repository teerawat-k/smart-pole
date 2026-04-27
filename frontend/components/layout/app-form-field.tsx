import React from "react";
import type { ControllerRenderProps, FieldValues } from "react-hook-form";
import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAppFormContext } from "@/components/layout/app-form";
import { cn } from "@/lib/utils";

interface AppFormFieldProps {
  name: string;
  label: string | React.ReactNode;
  children:
    | React.ReactNode
    | ((field: ControllerRenderProps<FieldValues, string>) => React.ReactNode);
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  layout?: "horizontal" | "vertical";
  labelAlign?: "left" | "right";
  className?: string;
  classNameLabel?: string;
  classNameContent?: string;
  noLabel?: boolean;
}

export function AppFormField({
  name,
  label,
  children,
  required,
  disabled = false,
  readOnly: propReadOnly,
  layout = "vertical",
  labelAlign = "left",
  className,
  classNameLabel,
  classNameContent,
  noLabel = false,
}: AppFormFieldProps) {
  const { control } = useFormContext();
  const { readOnly: contextReadOnly } = useAppFormContext();
  const isReadOnly = propReadOnly ?? contextReadOnly;

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem
          className={cn(
            layout === "horizontal" && "flex items-start gap-3 space-y-0",
            className
          )}
        >
          {!noLabel && (
            <FormLabel
              htmlFor=""
              className={cn(
                "font-normal",
                layout === "horizontal" ? "h-9 min-w-[120px]" : "",
                labelAlign === "right"
                  ? "flex items-center gap-0.5 justify-end text-right"
                  : "flex items-center gap-0.5 justify-start text-left",
                classNameLabel
              )}
            >
              {label}
              {required && (
                <span className="text-destructive">*</span>
              )}
            </FormLabel>
          )}
          <div className={cn("w-full min-w-0", classNameContent)}>
            {typeof children === "function" ? (
              children({
                ...field,
                disabled: disabled,
                readOnly: isReadOnly,
              } as ControllerRenderProps<FieldValues, string>)
            ) : (
              <FormControl
                {...field}
                {...({ readOnly: isReadOnly, disabled: disabled } as Record<string, unknown>)}
              >
                {children as React.ReactElement}
              </FormControl>
            )}
            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  );
}
