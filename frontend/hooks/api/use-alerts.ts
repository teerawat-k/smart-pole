"use client";

import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { alertApi, type AlertListParams } from "@/lib/api/alert";

export function useAlerts(params?: AlertListParams) {
  return useQuery({
    queryKey: ["alert", "list", params],
    queryFn: () => alertApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useResolveAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: number; note?: string }) => alertApi.resolve(id, note),
    onSuccess: (r) => {
      toast.success(r.message);
      qc.invalidateQueries({ queryKey: ["alert"] });
    },
  });
}
