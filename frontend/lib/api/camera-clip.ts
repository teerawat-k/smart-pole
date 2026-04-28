import { apiClient } from "./client";
import { env } from "@/config/env";

export interface ClipItem {
  filename: string;
  sizeBytes: number;
  modifiedAt: string;
}

export const cameraClipApi = {
  listClips: async (poleName: string, date: string) => {
    const res = await apiClient.get<{ success: true; data: ClipItem[] }>(
      `/api/cameras/${encodeURIComponent(poleName)}/clips`,
      { params: { date } },
    );
    return res.data.data;
  },
  /** absolute URL สำหรับ <video src> — Range request handled by browser */
  buildStreamUrl: (poleName: string, date: string, file: string): string => {
    const qs = new URLSearchParams({ date, file });
    return `${env.NEXT_PUBLIC_API_URL}/api/cameras/${encodeURIComponent(poleName)}/stream?${qs.toString()}`;
  },
};
