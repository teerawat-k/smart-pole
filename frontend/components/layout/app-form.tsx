"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm,
  type UseFormReturn,
  type DefaultValues,
  type FieldValues,
  type SubmitHandler,
} from "react-hook-form";
import { Form } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import React, { createContext, useCallback, useContext, useRef } from "react";

type AppFormContextValue = {
  readOnly?: boolean;
};

const AppFormContext = createContext<AppFormContextValue>({});

export const useAppFormContext = () => useContext(AppFormContext);

interface AppFormProps<T extends FieldValues> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- zodResolver overloads require loose typing; ZodTypeAny doesn't satisfy all overload signatures
  schema: any;
  defaultValues?: DefaultValues<T>;
  onSubmit: SubmitHandler<T>;
  children: (form: UseFormReturn<T>) => React.ReactNode;
  className?: string;
  readOnly?: boolean;
  mode?: "onBlur" | "onChange" | "onSubmit" | "onTouched" | "all";
  autoComplete?: string;
  form?: UseFormReturn<T>;
}

export function AppForm<T extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  children,
  className,
  readOnly,
  mode = "onSubmit",
  autoComplete = "off",
  form: externalForm,
}: AppFormProps<T>) {
  const internalForm = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
    mode,
  });

  const form = externalForm ?? internalForm;
  const formRef = useRef<HTMLFormElement>(null);

  const handleInvalid = useCallback(() => {
    // Scroll first error field into view
    requestAnimationFrame(() => {
      const el = formRef.current?.querySelector("[aria-invalid='true']");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shadcn Form expects UseFormReturn<FieldValues>, but we use generic T; safe because Form only reads the methods
    <Form {...(form as unknown as UseFormReturn<FieldValues>)}>
      <AppFormContext.Provider value={{ readOnly }}>
        <form
          ref={formRef}
          onSubmit={onSubmit ? form.handleSubmit(onSubmit, handleInvalid) : undefined}
          className={cn("space-y-4", className)}
          autoComplete={autoComplete}
        >
          {children(form)}
        </form>
      </AppFormContext.Provider>
    </Form>
  );
}
