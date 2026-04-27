import { apiClient } from "./client";
import type { ListResponse, ListParams, MutationResponse, DetailResponse } from "./types";

export interface RoleListItem {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { users: number; permissions: number };
}

export interface RoleLookupItem {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
}

export interface Permission {
  id: number;
  module: string;
  action: string;
  category: string;
  categoryLabel: string;
  moduleLabel: string;
  actionLabel: string;
}

export interface RoleDetail {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: { permission: Permission }[];
  _count: { users: number };
}

export const roleApi = {
  list: async (params?: ListParams) => {
    const res = await apiClient.get<ListResponse<RoleListItem>>("/api/roles", { params });
    return res.data;
  },
  lookup: async () => {
    const res = await apiClient.get<{ success: true; data: RoleLookupItem[] }>("/api/roles/lookup");
    return res.data.data;
  },
  permissions: async () => {
    const res = await apiClient.get<{ success: true; data: Permission[] }>("/api/roles/permissions");
    return res.data.data;
  },
  getById: async (id: number) => {
    const res = await apiClient.get<DetailResponse<RoleDetail>>(`/api/roles/${id}`);
    return res.data.data;
  },
  create: async (input: { name: string; description?: string; permissionIds: number[] }) => {
    const res = await apiClient.post<DetailResponse<RoleDetail> & { message: string }>("/api/roles", input);
    return res.data;
  },
  update: async (id: number, description?: string) => {
    const res = await apiClient.patch<DetailResponse<RoleDetail> & { message: string }>(`/api/roles/${id}`, {
      description,
    });
    return res.data;
  },
  setPermissions: async (id: number, permissionIds: number[]) => {
    const res = await apiClient.put<DetailResponse<RoleDetail> & { message: string }>(
      `/api/roles/${id}/permissions`,
      { permissionIds },
    );
    return res.data;
  },
  delete: async (id: number) => {
    const res = await apiClient.delete<MutationResponse>(`/api/roles/${id}`);
    return res.data;
  },
};
