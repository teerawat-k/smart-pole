import { t } from "elysia";
import { paginationQuery } from "@/common/schemas/pagination";

export const auditListQuery = t.Object({
  ...paginationQuery,
  module: t.Optional(t.String({ maxLength: 64 })),
  action: t.Optional(t.String({ maxLength: 64 })),
  userId: t.Optional(t.Numeric({ minimum: 0 })),
  targetId: t.Optional(t.Numeric({ minimum: 0 })),
  from: t.Optional(t.String({ format: "date-time" })),
  to: t.Optional(t.String({ format: "date-time" })),
});
