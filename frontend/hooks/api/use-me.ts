"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { meApi, type MeResponse } from "@/lib/api/me";
import { useAuthStore, type AuthUser } from "@/stores/auth-store";

function meToAuthUser(me: MeResponse): AuthUser {
  return {
    id: me.id,
    username: me.username,
    role: me.role.name,
    name: `${me.firstName} ${me.lastName}`.trim() || me.username,
    isSystemRole: me.role.isSystem,
    permissions: me.role.permissions.map((rp) => `${rp.permission.module}:${rp.permission.action}`),
  };
}

export function useMe() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);
  const query = useQuery({
    queryKey: ["me"],
    queryFn: () => meApi.get(),
    enabled: isAuthenticated,
  });

  // sync /me → authStore.user (populate name + isSystemRole + permissions)
  useEffect(() => {
    if (query.data) setUser(meToAuthUser(query.data));
  }, [query.data, setUser]);

  return query;
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
