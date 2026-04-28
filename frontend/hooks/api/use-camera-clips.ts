"use client";

import { useQuery } from "@tanstack/react-query";
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
