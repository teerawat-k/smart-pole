"use client";

import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { recordingApi, type RecordingListParams } from "@/lib/api/recording";

export function useRecordings(params: RecordingListParams) {
  return useQuery({
    queryKey: ["recording", "list", params],
    queryFn: () => recordingApi.list(params),
    placeholderData: keepPreviousData,
    enabled: params.poleId !== undefined,
  });
}

export function useDeleteRecording() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => recordingApi.delete(id),
    onSuccess: (r) => {
      toast.success(r.message);
      qc.invalidateQueries({ queryKey: ["recording"] });
    },
  });
}
