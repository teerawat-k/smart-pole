import { t, type Static } from "elysia";
import { paginationQuery } from "@/common/schemas/pagination";

export const roleListQuery = t.Object({
  ...paginationQuery,
});

export const roleCreateSchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 64 }),
  description: t.Optional(t.String({ maxLength: 200 })),
  permissionIds: t.Array(t.Number({ minimum: 1 }), { minItems: 0, maxItems: 200 }),
});

export const roleUpdateSchema = t.Object({
  description: t.Optional(t.String({ maxLength: 200 })),
});

export const setPermissionsSchema = t.Object({
  permissionIds: t.Array(t.Number({ minimum: 1 }), { minItems: 0, maxItems: 200 }),
});

export type RoleCreateInput = Static<typeof roleCreateSchema>;
export type RoleUpdateInput = Static<typeof roleUpdateSchema>;
export type SetPermissionsInput = Static<typeof setPermissionsSchema>;
