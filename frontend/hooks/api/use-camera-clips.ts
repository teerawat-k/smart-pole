"use client";

import { useQuery } from "@tanstack/react-query";
import { cameraClipApi } from "@/lib/api/camera-clip";

export function useClipList(poleName: string | null, date: string | null) {
  return useQuery({
    queryKey: ["camera-clip", "list", poleName, date],
    queryFn: () => cameraClipApi.listClips(poleName!, date!),
    enabled: !!poleName && !!date,
  });
}

export function useLatestClip(poleName: string | null) {
  return useQuery({
    queryKey: ["camera-clip", "latest", poleName],
    queryFn: () => cameraClipApi.getLatest(poleName!),
    enabled: !!poleName,
  });
}
