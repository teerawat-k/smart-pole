import { apiClient } from "./client";
import type { DetailResponse, MutationResponse } from "./types";
import type { UserDetail } from "./user";

export const meApi = {
  get: async () => {
    const res = await apiClient.get<DetailResponse<UserDetail>>("/api/me");
    return res.data.data;
  },
  update: async (input: { firstName?: string; lastName?: string; email?: string; mobileNo?: string }) => {
    const res = await apiClient.patch<DetailResponse<UserDetail> & { message: string }>("/api/me", input);
    return res.data;
  },
  changePassword: async (input: { currentPassword: string; newPassword: string }) => {
    const res = await apiClient.patch<MutationResponse>("/api/me/password", input);
    return res.data;
  },
};
