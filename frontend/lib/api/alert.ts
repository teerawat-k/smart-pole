import { apiClient } from "./client";
import type { ListResponse, ListParams, MutationResponse } from "./types";

export type AlertSeverity = "info" | "warning" | "critical";

export interface AlertItem {
  id: number;
  poleId: number;
  alertType: string;
  severity: AlertSeverity;
  message: string;
  value: number | null;
  threshold: number | null;
  isResolved: boolean;
  resolvedAt: string | null;
  resolvedById: number | null;
  triggeredAt: string;
}

export interface AlertListParams extends ListParams {
  poleId?: number;
  severity?: AlertSeverity;
  alertType?: string;
  isResolved?: boolean;
  from?: string;
  to?: string;
}

export const alertApi = {
  list: async (params?: AlertListParams) => {
    const res = await apiClient.get<ListResponse<AlertItem>>("/api/alerts", { params });
    return res.data;
  },
  resolve: async (id: number, note?: string) => {
    const res = await apiClient.post<MutationResponse>(`/api/alerts/${id}/resolve`, { note });
    return res.data;
  },
};
