"use client";

import { useQuery } from "@tanstack/react-query";
import { sensorApi } from "@/lib/api/sensor";

export function useSensorTypes() {
  return useQuery({ queryKey: ["sensor-type", "list"], queryFn: () => sensorApi.types() });
}

export function useSensorLatest(poleId: number | null, opts?: { refetchIntervalMs?: number }) {
  return useQuery({
    queryKey: ["sensor", "latest", poleId],
    queryFn: () => sensorApi.latest(poleId!),
    enabled: poleId !== null,
    refetchInterval: opts?.refetchIntervalMs ?? false,
  });
}

export function useSensorHistory(
  poleId: number | null,
  sensorKey: string,
  range: { from: Date; to: Date } | null,
) {
  return useQuery({
    queryKey: ["sensor", "history", poleId, sensorKey, range?.from.toISOString(), range?.to.toISOString()],
    queryFn: () =>
      sensorApi.history(poleId!, sensorKey, {
        from: range!.from.toISOString(),
        to: range!.to.toISOString(),
      }),
    enabled: poleId !== null && range !== null,
  });
}
