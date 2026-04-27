import { apiClient } from "./client";

export interface SensorType {
  id: number;
  key: string;
  displayName: string;
  unit: string | null;
  chartType: string | null;
  chartColor: string | null;
}

export interface SensorLatest {
  pm25: { time: string; pm25: number; pm10: number | null; aqi: number | null } | null;
  temperature: { time: string; temperature: number; unit: string } | null;
  humidity: { time: string; humidity: number } | null;
}

export const sensorApi = {
  types: async () => {
    const res = await apiClient.get<{ success: true; data: SensorType[] }>("/api/sensor-types");
    return res.data.data;
  },
  latest: async (poleId: number) => {
    const res = await apiClient.get<{ success: true; data: SensorLatest }>(
      `/api/poles/${poleId}/sensors/latest`,
    );
    return res.data.data;
  },
  history: async (poleId: number, sensorKey: string, params: { from: string; to: string; limit?: number }) => {
    const res = await apiClient.get<{ success: true; data: unknown[]; total: number }>(
      `/api/poles/${poleId}/sensors/${sensorKey}/history`,
      { params },
    );
    return res.data;
  },
};
