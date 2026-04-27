import { apiClient } from "./client";

export interface CaptchaResponse {
  success: true;
  data: { sessionKey: string; image: string; expiresAt: string };
}

export interface LoginRequest {
  username: string;
  password: string;
  sessionKey: string;
  captchaInput: string;
}

export interface LoginUser {
  id: number;
  username: string;
  status: string;
  roleId: number;
  roleName: string;
  tokenVersion: number;
}

export interface LoginResponse {
  success: true;
  message: string;
  data: {
    user: LoginUser;
    accessToken: string;
    refreshToken: string;
    refreshExpiresAt: string;
  };
}

export const authApi = {
  newCaptcha: async () => {
    const res = await apiClient.get<CaptchaResponse>("/api/captcha/new");
    return res.data.data;
  },

  login: async (input: LoginRequest) => {
    const res = await apiClient.post<LoginResponse>("/api/auth/login", input);
    return res.data.data;
  },

  logout: async (refreshToken?: string) => {
    await apiClient.post("/api/auth/logout", { refreshToken });
  },

  getMe: async () => {
    const res = await apiClient.get<{ success: true; data: unknown }>("/api/me");
    return res.data.data;
  },
};
