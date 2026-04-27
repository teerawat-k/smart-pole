import type { PaginationParams } from "../schemas/pagination";

/** แปลง pagination params → Prisma `skip/take` */
export function toSkipTake(q: PaginationParams): { skip: number; take: number; page: number; limit: number } {
  const page = q.page ?? 1;
  const limit = q.limit ?? 20;
  return { skip: (page - 1) * limit, take: limit, page, limit };
}
