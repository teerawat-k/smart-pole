"use client";

import { useQuery } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { sensorApi, type SensorHistoryParams } from "@/lib/api/sensor";

export function useSensorLatest(poleId: number | null, opts?: { refetchIntervalMs?: number }) {
  return useQuery({
    queryKey: ["sensor", "latest", poleId],
    queryFn: () => sensorApi.latest(poleId!),
    enabled: poleId !== null,
    refetchInterval: opts?.refetchIntervalMs ?? false,
  });
}

export function useSensorHistory(poleId: number | null, params: SensorHistoryParams) {
  return useQuery({
    queryKey: ["sensor", "history", poleId, params],
    queryFn: () => sensorApi.history(poleId!, params),
    enabled: poleId !== null,
    placeholderData: keepPreviousData,
  });
}
