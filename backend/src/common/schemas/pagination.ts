import { t } from "elysia";

export const paginationQuery = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
  search: t.Optional(t.String({ maxLength: 200 })),
  sortBy: t.Optional(t.String()),
  sortOrder: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
});

export type PaginationQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};
