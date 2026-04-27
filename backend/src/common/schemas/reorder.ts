import { t, type Static } from "elysia";

/**
 * Reorder schema — `PATCH /reorder` body
 * ใช้คู่กับ helper `reorderRecord()` ใน `@/common/utils/reorder`
 */
export const reorderSchema = t.Object({
  id: t.Number(),
  order: t.Number({ minimum: 0 }),
});

export type ReorderInput = Static<typeof reorderSchema>;
