import { apiClient } from "./client";
import { cameraClipStreamUrl } from "@/lib/runtime-url";

export interface ClipItem {
  filename: string;
  sizeBytes: number;
  modifiedAt: string;
}

export interface LatestClip extends ClipItem {
  date: string; // YYYY-MM-DD
}

export const cameraClipApi = {
  getLatest: async (poleName: string) => {
    const res = await apiClient.get<{ success: true; data: LatestClip | null }>(
      `/api/cameras/${encodeURIComponent(poleName)}/latest`,
    );
    return res.data.data;
  },
  listClips: async (poleName: string, date: string) => {
    const res = await apiClient.get<{ success: true; data: ClipItem[] }>(
      `/api/cameras/${encodeURIComponent(poleName)}/clips`,
      { params: { date } },
    );
    return res.data.data;
  },
  /** URL สำหรับ <video src> — Range request handled by browser */
  buildStreamUrl: (poleName: string, date: string, file: string): string => {
    const qs = new URLSearchParams({ date, file });
    return cameraClipStreamUrl(poleName, qs.toString());
  },
};
