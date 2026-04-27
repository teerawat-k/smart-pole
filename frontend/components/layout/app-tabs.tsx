"use client";

import * as React from "react";
import {
  Tabs,
  TabsList,
  TabsContent,
  TabsTrigger as TabsTriggerPrimitive,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// Wrapper ของ shadcn <TabsTrigger> เพื่อเพิ่ม cursor-pointer เป็น default
// (ห้ามแก้ไฟล์ components/ui/ ตรง ๆ)

function AppTabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsTriggerPrimitive>) {
  return (
    <TabsTriggerPrimitive
      className={cn("cursor-pointer", className)}
      {...props}
    />
  );
}

// Re-export คู่มาตรฐาน เพื่อ import จากที่เดียว
export { Tabs, TabsList, TabsContent, AppTabsTrigger as TabsTrigger };
