// Shared API response/request types
export interface ListResponse<T> {
  success: true;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ItemResponse<T> {
  success: true;
  data: T;
}

export interface MutationResponse {
  success: true;
  message: string;
  id?: number;
}

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  [key: string]: unknown;
}
