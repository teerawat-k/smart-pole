"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cameraClipApi } from "@/lib/api/camera-clip";

export function useClipDates(poleName: string | null) {
  return useQuery({
    queryKey: ["camera-clip", "dates", poleName],
    queryFn: () => cameraClipApi.listDates(poleName!),
    enabled: !!poleName,
  });
}

export function useClipList(poleName: string | null, date: string | null) {
  return useQuery({
    queryKey: ["camera-clip", "list", poleName, date],
    queryFn: () => cameraClipApi.listClips(poleName!, date!),
    enabled: !!poleName && !!date,
  });
}

export function useUploadClip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cameraClipApi.upload,
    onSuccess: (r) => {
      toast.success(r.message);
      qc.invalidateQueries({ queryKey: ["camera-clip"] });
    },
  });
}
