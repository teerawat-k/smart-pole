"use client";

import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface AppAlertDialogProps {
  trigger?: React.ReactNode;
  title: string;
  description: React.ReactNode;
  cancelText?: string;
  actionText?: string;
  hideAction?: boolean;
  actionVariant?: "default" | "destructive" | "success";
  onAction: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AppAlertDialog({
  trigger,
  title,
  description,
  cancelText = "ยกเลิก",
  actionText = "ยืนยัน",
  hideAction = false,
  actionVariant = "default",
  onAction,
  open,
  onOpenChange,
}: AppAlertDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger && (
        <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3">
          {!hideAction && (
            <AlertDialogAction
              className={cn(
                actionVariant === "destructive" && "bg-destructive! text-white hover:bg-destructive/90!",
                actionVariant === "success" && "bg-emerald-500! text-white hover:bg-emerald-600!",
              )}
              onClick={onAction}
            >
              {actionText}
            </AlertDialogAction>
          )}
          <AlertDialogCancel>{cancelText}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
