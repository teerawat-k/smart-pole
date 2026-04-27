"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { logApi } from "@/lib/api/log";

export function useAuditLogs(params: Parameters<typeof logApi.audit>[0]) {
  return useQuery({
    queryKey: ["audit-log", params],
    queryFn: () => logApi.audit(params),
    placeholderData: keepPreviousData,
  });
}

export function useSystemLogs(params: Parameters<typeof logApi.system>[0]) {
  return useQuery({
    queryKey: ["system-log", params],
    queryFn: () => logApi.system(params),
    placeholderData: keepPreviousData,
  });
}
