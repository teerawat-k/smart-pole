"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { meApi } from "@/lib/api/me";
import { useAuthStore } from "@/stores/auth-store";

export function useMe() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ["me"],
    queryFn: () => meApi.get(),
    enabled: isAuthenticated,
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof meApi.update>[0]) => meApi.update(input),
    onSuccess: (r) => {
      toast.success(r.message);
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useChangeMyPassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      meApi.changePassword(input),
    onSuccess: (r) => toast.success(r.message),
  });
}
