"use client";

// Render-only — fetch /me on mount + sync ไป authStore
// วางใน dashboard layout เพื่อ populate user.name/permissions/isSystemRole
import { useMe } from "@/hooks/api/use-me";

export function MeLoader() {
  useMe();
  return null;
}
