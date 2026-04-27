import { t, type Static } from "elysia";
import { paginationQuery } from "@/common/schemas/pagination";

const severityEnum = t.Union([t.Literal("info"), t.Literal("warning"), t.Literal("critical")]);

export const alertListQuery = t.Object({
  ...paginationQuery,
  poleId: t.Optional(t.Numeric({ minimum: 1 })),
  severity: t.Optional(severityEnum),
  alertType: t.Optional(t.String({ maxLength: 64 })),
  isResolved: t.Optional(t.BooleanString()),
  from: t.Optional(t.String({ format: "date-time" })),
  to: t.Optional(t.String({ format: "date-time" })),
});

export const alertResolveSchema = t.Object({
  note: t.Optional(t.String({ maxLength: 500 })),
});

export type AlertResolveInput = Static<typeof alertResolveSchema>;
