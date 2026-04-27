import { apiClient } from "./client";
import type { DetailResponse, MutationResponse } from "./types";

export interface MeResponse {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  mobileNo: string | null;
  status: string;
  loginFailCount: number;
  lockedUntil: string | null;
  lockedReason: string | null;
  lastLoginAt: string | null;
  passwordChangedAt: string | null;
  createdAt: string;
  updatedAt: string;
  role: {
    id: number;
    name: string;
    description: string | null;
    isSystem: boolean;
    permissions: Array<{ permission: { module: string; action: string } }>;
  };
}

export const meApi = {
  get: async () => {
    const res = await apiClient.get<DetailResponse<MeResponse>>("/api/me");
    return res.data.data;
  },
  update: async (input: { firstName?: string; lastName?: string; email?: string; mobileNo?: string }) => {
    const res = await apiClient.patch<DetailResponse<MeResponse> & { message: string }>("/api/me", input);
    return res.data;
  },
  changePassword: async (input: { currentPassword: string; newPassword: string }) => {
    const res = await apiClient.patch<MutationResponse>("/api/me/password", input);
    return res.data;
  },
};
