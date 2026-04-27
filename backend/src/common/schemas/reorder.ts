import { t } from "elysia";

export const reorderSchema = t.Object({
  id: t.Number(),
  order: t.Number({ minimum: 0 }),
});

export type ReorderInput = { id: number; order: number };
