import { apiClient } from "./client";
import type { ListResponse, ListParams, MutationResponse, DetailResponse } from "./types";

export type UserStatus = "active" | "disabled" | "locked";

export interface UserListItem {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  mobileNo: string | null;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  role: { id: number; name: string; description: string | null };
}

export interface UserDetail extends UserListItem {
  loginFailCount: number;
  lockedUntil: string | null;
  lockedReason: string | null;
  passwordChangedAt: string | null;
  updatedAt: string;
}

export interface UserListParams extends ListParams {
  roleId?: number;
  status?: UserStatus;
}

export interface UserCreateInput {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  mobileNo?: string;
  roleId: number;
}

export interface UserUpdateInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  mobileNo?: string;
  roleId?: number;
}

export const userApi = {
  list: async (params?: UserListParams) => {
    const res = await apiClient.get<ListResponse<UserListItem>>("/api/users", { params });
    return res.data;
  },
  getById: async (id: number) => {
    const res = await apiClient.get<DetailResponse<UserDetail>>(`/api/users/${id}`);
    return res.data.data;
  },
  create: async (input: UserCreateInput) => {
    const res = await apiClient.post<DetailResponse<UserDetail> & { message: string }>("/api/users", input);
    return res.data;
  },
  update: async (id: number, input: UserUpdateInput) => {
    const res = await apiClient.patch<DetailResponse<UserDetail> & { message: string }>(`/api/users/${id}`, input);
    return res.data;
  },
  setStatus: async (id: number, status: "active" | "disabled") => {
    const res = await apiClient.patch<DetailResponse<UserDetail> & { message: string }>(
      `/api/users/${id}/status`,
      { status },
    );
    return res.data;
  },
  unlock: async (id: number) => {
    const res = await apiClient.post<DetailResponse<UserDetail> & { message: string }>(
      `/api/users/${id}/unlock`,
    );
    return res.data;
  },
  resetPassword: async (id: number, newPassword: string) => {
    const res = await apiClient.post<MutationResponse>(`/api/users/${id}/reset-password`, { newPassword });
    return res.data;
  },
  delete: async (id: number) => {
    const res = await apiClient.delete<MutationResponse>(`/api/users/${id}`);
    return res.data;
  },
};
