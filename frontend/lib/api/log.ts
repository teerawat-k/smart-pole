import { apiClient } from "./client";
import type { ListResponse, ListParams } from "./types";

export interface AuditLogItem {
  id: number;
  userId: number;
  action: string;
  module: string;
  targetId: number;
  payload: unknown;
  createdAt: string;
}

export interface SystemLogItem {
  id: string;
  logType: string;
  userId: number | null;
  usernameSnap: string | null;
  failReason: string | null;
  pageKey: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  detail: unknown;
  createdAt: string;
}

export const logApi = {
  audit: async (params?: ListParams & { module?: string; userId?: number; action?: string; from?: string; to?: string }) => {
    const res = await apiClient.get<ListResponse<AuditLogItem>>("/api/audit-logs", { params });
    return res.data;
  },
  system: async (params?: ListParams & { logType?: string; userId?: number; from?: string; to?: string }) => {
    const res = await apiClient.get<ListResponse<SystemLogItem>>("/api/system-logs", { params });
    return res.data;
  },
};
