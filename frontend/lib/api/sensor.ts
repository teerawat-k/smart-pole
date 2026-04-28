import { apiClient } from "./client";

export interface SensorLatest {
  latestSeq: string | null;
  latestPm25: number | null;
  latestTemperature: number | null;
  latestHumidity: number | null;
  latestReadingAt: string | null;
}

export interface SensorReadingRow {
  id: string;
  time: string;
  seq: string;
  pm25: number | null;
  temperature: number | null;
  humidity: number | null;
  ingestedAt: string;
}

export interface SensorHistoryParams {
  page?:      number;
  limit?:     number;
  from?:      number;
  to?:        number;
  sortBy?:    string;
  sortOrder?: "asc" | "desc";
}

export const sensorApi = {
  latest: async (poleId: number) => {
    const res = await apiClient.get<{ success: true; data: SensorLatest }>(
      `/api/poles/${poleId}/sensors/latest`,
    );
    return res.data.data;
  },
  history: async (poleId: number, params?: SensorHistoryParams) => {
    const res = await apiClient.get<{
      success: true;
      data:  SensorReadingRow[];
      total: number;
      page:  number;
      limit: number;
    }>(`/api/poles/${poleId}/sensors/history`, { params });
    return res.data;
  },
};
