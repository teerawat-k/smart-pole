import axios, { AxiosError } from "axios";
import { env } from "@/config/env";

// Atom: Axios instance เดียวของระบบ — ห้าม axios.create() นอกไฟล์นี้
export const apiClient = axios.create({
  baseURL: env.NEXT_PUBLIC_API_URL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.response.use(
  (res) => res.data,
  (error: AxiosError<{ error?: { message?: string; code?: string }; message?: string }>) => {
    const data = error.response?.data;
    const message = data?.error?.message ?? data?.message ?? error.message ?? "เกิดข้อผิดพลาด";
    return Promise.reject(new Error(message));
  },
);
