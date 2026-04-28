import { apiClient } from "./client";
import type { ListResponse, ListParams, MutationResponse, DetailResponse } from "./types";

export type PoleStatus = "online" | "offline" | "unknown" | "maintenance";

export interface Pole {
  id: number;
  poleName: string;
  installPlace: string;
  ddnsHostname: string | null;
  ipCamera: string | null;
  cameraModel: string | null;
  latitude: number | null;
  longitude: number | null;
  hasCamera: boolean;
  hasPm25Sensor: boolean;
  hasTempHumidity: boolean;
  hasLed: boolean;
  poleStatus: PoleStatus;
  lastSeenAt: string | null;
  maintenanceReason: string | null;
  mqttUsername: string;
  createdAt: string;
  updatedAt: string;
}

export interface PoleListItem {
  id: number;
  poleName: string;
  installPlace: string;
  poleStatus: PoleStatus;
  lastSeenAt: string | null;
  hasCamera: boolean;
  hasPm25Sensor: boolean;
  hasTempHumidity: boolean;
  hasLed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PoleLookupItem {
  id: number;
  poleName: string;
  installPlace: string;
  hasCamera: boolean;
  hasPm25Sensor: boolean;
  hasTempHumidity: boolean;
  poleStatus: PoleStatus;
  lastSeenAt: string | null;
}

export interface PoleListParams extends ListParams {
  poleStatus?: PoleStatus;
  hasCamera?: boolean;
}

export interface PoleCreateInput {
  poleName: string;
  installPlace: string;
  ddnsHostname?: string;
  ipCamera?: string;
  latitude?: number;
  longitude?: number;
  hasCamera?: boolean;
  hasPm25Sensor?: boolean;
  hasTempHumidity?: boolean;
  hasLed?: boolean;
}

export type PoleUpdateInput = Partial<PoleCreateInput>;

export const poleApi = {
  list: async (params?: PoleListParams) => {
    const res = await apiClient.get<ListResponse<PoleListItem>>("/api/poles", { params });
    return res.data;
  },

  lookup: async () => {
    const res = await apiClient.get<{ success: true; data: PoleLookupItem[] }>("/api/poles/lookup");
    return res.data.data;
  },

  getById: async (id: number) => {
    const res = await apiClient.get<DetailResponse<Pole>>(`/api/poles/${id}`);
    return res.data.data;
  },

  create: async (input: PoleCreateInput) => {
    const res = await apiClient.post<{
      success: true;
      message: string;
      data: { pole: Pole; mqttPassword: string };
    }>("/api/poles", input);
    return res.data;
  },

  update: async (id: number, input: PoleUpdateInput) => {
    const res = await apiClient.patch<DetailResponse<Pole> & { message: string }>(`/api/poles/${id}`, input);
    return res.data;
  },

  setMaintenance: async (id: number, enabled: boolean, reason?: string) => {
    const res = await apiClient.post<DetailResponse<Pole> & { message: string }>(
      `/api/poles/${id}/maintenance`,
      { enabled, reason },
    );
    return res.data;
  },

  regenerateCredential: async (id: number) => {
    const res = await apiClient.post<{
      success: true;
      message: string;
      data: { mqttUsername: string; mqttPassword: string };
    }>(`/api/poles/${id}/regenerate-credential`);
    return res.data;
  },

  delete: async (id: number) => {
    const res = await apiClient.delete<MutationResponse>(`/api/poles/${id}`);
    return res.data;
  },
};
