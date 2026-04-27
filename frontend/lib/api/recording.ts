import { apiClient } from "./client";
import type { ListResponse, ListParams, MutationResponse, DetailResponse } from "./types";

export interface RecordingItem {
  id: string;
  poleId: number;
  filename: string;
  recordedDate: string;
  startTime: string;
  endTime: string;
  durationSec: number;
  fileSizeBytes: string | null;
  createdAt: string;
}

export interface RecordingPlayback {
  url: string;
  filename: string;
  startTime: string;
  endTime: string;
  expiresAt: string;
}

export interface RecordingListParams extends ListParams {
  poleId?: number;
  date?: string;
  minDuration?: number;
}

export const recordingApi = {
  list: async (params?: RecordingListParams) => {
    const res = await apiClient.get<ListResponse<RecordingItem>>("/api/recordings", { params });
    return res.data;
  },
  getPlaybackUrl: async (id: number) => {
    const res = await apiClient.get<DetailResponse<RecordingPlayback>>(`/api/recordings/${id}/url`);
    return res.data.data;
  },
  delete: async (id: number) => {
    const res = await apiClient.delete<MutationResponse>(`/api/recordings/${id}`);
    return res.data;
  },
};
