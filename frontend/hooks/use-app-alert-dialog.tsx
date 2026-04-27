"use client";

import { useState } from "react";
import { AppAlertDialog } from "@/components/layout/app-alert-dialog";

interface ConfirmOptions {
  title: string;
  description: string;
  onAction: () => void;
  actionText?: string;
  cancelText?: string;
  hideAction?: boolean;
  actionVariant?: "default" | "destructive" | "success";
}

export function useAppAlertDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  function confirm(opts: ConfirmOptions): void {
    setOptions(opts);
    setIsOpen(true);
  }

  const AlertDialogComponent = options ? (
    <AppAlertDialog
      open={isOpen}
      onOpenChange={setIsOpen}
      title={options.title}
      description={options.description}
      onAction={() => {
        options.onAction();
        setIsOpen(false);
      }}
      hideAction={options.hideAction}
      actionText={options.actionText}
      cancelText={options.cancelText}
      actionVariant={options.actionVariant}
    />
  ) : null;

  return { confirm, AlertDialogComponent };
}
