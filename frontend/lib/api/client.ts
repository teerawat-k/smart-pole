import axios, { type InternalAxiosRequestConfig } from "axios";
import qs from "qs";
import { apiBase } from "@/lib/runtime-url";
import { useAuthStore } from "@/stores/auth-store";

export const apiClient = axios.create({
  baseURL: apiBase(),   // empty = relative URL (axios resolve เทียบ page origin)
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
  paramsSerializer: (params) => qs.stringify(params, { arrayFormat: "repeat" }),
});

// Request interceptor: attach Bearer token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401, refresh token, queue requests
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null): void {
  failedQueue.forEach((pending) => {
    if (error) {
      pending.reject(error);
    } else {
      pending.resolve(token ?? "");
    }
  });
  failedQueue = [];
}

const AUTH_PATHS = ["/auth/login", "/auth/refresh"];

function redirectToLogin(): void {
  const currentPath = window.location.pathname + window.location.search;
  const goto = currentPath !== "/" && currentPath !== "/login" ? `?goto=${encodeURIComponent(currentPath)}` : "";
  window.location.href = `/login${goto}`;
}

function isAuthPath(url: string | undefined): boolean {
  if (!url) return false;
  return AUTH_PATHS.some((path) => url.includes(path));
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(new Error("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง"));
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;

    if (
      status === 401 &&
      typeof window !== "undefined" &&
      !isAuthPath(originalRequest?.url)
    ) {
      if (originalRequest._retry) {
        useAuthStore.getState().clearAuth();
        redirectToLogin();
        return Promise.reject(new Error("กรุณาเข้าสู่ระบบ"));
      }

      const { refreshToken } = useAuthStore.getState();

      if (!refreshToken) {
        useAuthStore.getState().clearAuth();
        redirectToLogin();
        return Promise.reject(new Error("กรุณาเข้าสู่ระบบ"));
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await apiClient.post<{
          success: boolean;
          data: { accessToken: string };
        }>("/auth/refresh", { refreshToken });
        const newToken = response.data.data.accessToken;
        useAuthStore.getState().setAccessToken(newToken);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().clearAuth();
        redirectToLogin();
        return Promise.reject(new Error("กรุณาเข้าสู่ระบบ"));
      } finally {
        isRefreshing = false;
      }
    }

    const message =
      error.response?.data?.error?.message
        ? (error.response.data.error.message as string)
        : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
    return Promise.reject(new Error(message));
  }
);

export function uploadFile(
  url: string,
  formData: FormData,
  signal?: AbortSignal
): Promise<unknown> {
  return apiClient.post(url, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    signal,
  });
}
