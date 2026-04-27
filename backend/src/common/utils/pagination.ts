import type { PaginationQuery } from "../schemas/pagination";

export function toSkipTake(q: PaginationQuery): { skip: number; take: number; page: number; limit: number } {
  const page = q.page ?? 1;
  const limit = q.limit ?? 20;
  return { skip: (page - 1) * limit, take: limit, page, limit };
}
