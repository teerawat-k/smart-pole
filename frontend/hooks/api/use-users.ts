"use client";

import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  userApi,
  type UserListParams,
  type UserCreateInput,
  type UserUpdateInput,
} from "@/lib/api/user";

export function useUsers(params?: UserListParams) {
  return useQuery({
    queryKey: ["user", "list", params],
    queryFn: () => userApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useUser(id: number | null, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["user", "detail", id],
    queryFn: () => userApi.getById(id!),
    enabled: id !== null && (opts?.enabled ?? true),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UserCreateInput) => userApi.create(input),
    onSuccess: (r) => {
      toast.success(r.message);
      qc.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UserUpdateInput }) => userApi.update(id, input),
    onSuccess: (r) => {
      toast.success(r.message);
      qc.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useSetUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: "active" | "disabled" }) =>
      userApi.setStatus(id, status),
    onSuccess: (r) => {
      toast.success(r.message);
      qc.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useUnlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => userApi.unlock(id),
    onSuccess: (r) => {
      toast.success(r.message);
      qc.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: number; newPassword: string }) =>
      userApi.resetPassword(id, newPassword),
    onSuccess: (r) => toast.success(r.message),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => userApi.delete(id),
    onSuccess: (r) => {
      toast.success(r.message);
      qc.invalidateQueries({ queryKey: ["user"] });
    },
  });
}
