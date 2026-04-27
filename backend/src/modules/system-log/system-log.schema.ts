import { t } from "elysia";
import { paginationQuery } from "@/common/schemas/pagination";

const logTypeEnum = t.Union([
  t.Literal("login_success"),
  t.Literal("login_fail"),
  t.Literal("logout"),
  t.Literal("captcha_fail"),
  t.Literal("page_access"),
]);

export const systemLogListQuery = t.Object({
  ...paginationQuery,
  logType: t.Optional(logTypeEnum),
  userId: t.Optional(t.Numeric({ minimum: 1 })),
  from: t.Optional(t.String({ format: "date-time" })),
  to: t.Optional(t.String({ format: "date-time" })),
});
