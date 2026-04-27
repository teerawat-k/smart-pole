/**
 * Shared API types — ใช้ร่วมกันทุก module
 */

/** Response format สำหรับ GET list endpoint ทุกตัว */
export interface ListResponse<T> {
  success: boolean;
  data:    T[];
  total:   number;
  page:    number;
  limit:   number;
}

/** Response format สำหรับ GET single endpoint */
export interface DetailResponse<T> {
  success: boolean;
  data:    T;
}

/** Response format สำหรับ mutation endpoint (create/update/delete) */
export interface MutationResponse {
  success: boolean;
  message: string;
}

/**
 * Base pagination params — extend ใน module-specific params
 *
 * @example
 * export interface BranchListParams extends ListParams {
 *   isActive?: boolean;
 * }
 */
export interface ListParams {
  page?:   number;
  limit?:  number;
  search?: string;
}
