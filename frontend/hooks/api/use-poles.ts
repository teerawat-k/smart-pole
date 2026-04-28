"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  poleApi,
  type PoleListParams,
  type PoleCreateInput,
  type PoleUpdateInput,
} from "@/lib/api/pole";

export function useSetMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled, reason }: { id: number; enabled: boolean; reason?: string }) =>
      poleApi.setMaintenance(id, enabled, reason),
    onSuccess: (result) => {
      toast.success(result.message);
      qc.invalidateQueries({ queryKey: ["pole"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function usePoles(params?: PoleListParams) {
  return useQuery({
    queryKey: ["pole", "list", params],
    queryFn: () => poleApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function usePoleLookup() {
  return useQuery({
    queryKey: ["pole", "lookup"],
    queryFn: () => poleApi.lookup(),
  });
}

export function usePole(id: number | null, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["pole", "detail", id],
    queryFn: () => poleApi.getById(id!),
    enabled: id !== null && (opts?.enabled ?? true),
  });
}

export function useCreatePole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PoleCreateInput) => poleApi.create(input),
    onSuccess: (result) => {
      toast.success(result.message);
      qc.invalidateQueries({ queryKey: ["pole"] });
    },
  });
}

export function useUpdatePole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: PoleUpdateInput }) => poleApi.update(id, input),
    onSuccess: (result) => {
      toast.success(result.message);
      qc.invalidateQueries({ queryKey: ["pole"] });
    },
  });
}

export function useDeletePole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => poleApi.delete(id),
    onSuccess: (result) => {
      toast.success(result.message);
      qc.invalidateQueries({ queryKey: ["pole"] });
    },
  });
}
