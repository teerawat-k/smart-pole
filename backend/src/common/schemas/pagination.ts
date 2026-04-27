import { t } from "elysia";

/**
 * Pagination query fields — spread เข้า `t.Object()` ของ list schema
 *
 * @example
 * export const poleListSchema = {
 *   query: t.Object({
 *     ...paginationQuery,
 *     search: t.Optional(t.String({ maxLength: 200 })),
 *     status: t.Optional(t.Union([t.Literal("online"), t.Literal("offline")])),
 *   }),
 * };
 */
export const paginationQuery = {
  page: t.Numeric({ default: 1, minimum: 1 }),
  limit: t.Numeric({ default: 20, minimum: 1, maximum: 100 }),
  search: t.Optional(t.String({ maxLength: 200 })),
  sortBy: t.Optional(t.String({ maxLength: 64 })),
  sortOrder: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
};

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
