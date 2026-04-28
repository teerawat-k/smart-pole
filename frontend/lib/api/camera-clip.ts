import { apiClient } from "./client";
import { env } from "@/config/env";

export interface ClipDate {
  date: string;       // YYYY-MM-DD
  fileCount: number;
}

export interface ClipItem {
  filename: string;
  sizeBytes: number;
  modifiedAt: string;
}

export interface UploadClipResult {
  filename: string;
  sizeBytes: number;
}

export const cameraClipApi = {
  listDates: async (poleName: string) => {
    const res = await apiClient.get<{ success: true; data: ClipDate[] }>(
      `/api/cameras/${encodeURIComponent(poleName)}/dates`,
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
  /** absolute URL สำหรับ <video src> — Range request handled by browser */
  buildStreamUrl: (poleName: string, date: string, file: string): string => {
    const qs = new URLSearchParams({ date, file });
    return `${env.NEXT_PUBLIC_API_URL}/api/cameras/${encodeURIComponent(poleName)}/stream?${qs.toString()}`;
  },
  upload: async (input: {
    poleName: string;
    date: string;
    file: File;
    onProgress?: (percent: number) => void;
  }) => {
    const fd = new FormData();
    fd.append("date", input.date);
    fd.append("file", input.file);
    const res = await apiClient.post<{ success: true; data: UploadClipResult; message: string }>(
      `/api/cameras/${encodeURIComponent(input.poleName)}/upload`,
      fd,
      {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (input.onProgress && e.total) {
            input.onProgress(Math.round((e.loaded / e.total) * 100));
          }
        },
      },
    );
    return res.data;
  },
};
