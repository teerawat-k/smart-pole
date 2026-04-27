"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { roleApi } from "@/lib/api/role";

export function useRoles() {
  return useQuery({
    queryKey: ["role", "list"],
    queryFn: () => roleApi.list({ page: 1, limit: 100 }),
  });
}

export function useRoleLookup() {
  return useQuery({
    queryKey: ["role", "lookup"],
    queryFn: () => roleApi.lookup(),
  });
}

export function usePermissions() {
  return useQuery({
    queryKey: ["role", "permissions"],
    queryFn: () => roleApi.permissions(),
  });
}

export function useRole(id: number | null, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["role", "detail", id],
    queryFn: () => roleApi.getById(id!),
    enabled: id !== null && (opts?.enabled ?? true),
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string; permissionIds: number[] }) =>
      roleApi.create(input),
    onSuccess: (r) => {
      toast.success(r.message);
      qc.invalidateQueries({ queryKey: ["role"] });
    },
  });
}

export function useUpdateRolePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, permissionIds }: { id: number; permissionIds: number[] }) =>
      roleApi.setPermissions(id, permissionIds),
    onSuccess: (r) => {
      toast.success(r.message);
      qc.invalidateQueries({ queryKey: ["role"] });
    },
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => roleApi.delete(id),
    onSuccess: (r) => {
      toast.success(r.message);
      qc.invalidateQueries({ queryKey: ["role"] });
    },
  });
}
