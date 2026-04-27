import { t } from "elysia";
import { paginationQuery } from "@/common/schemas/pagination";

export const recordingListQuery = t.Object({
  ...paginationQuery,
  poleId: t.Optional(t.Numeric({ minimum: 1 })),
  date: t.Optional(t.String({ format: "date" })),
  minDuration: t.Optional(t.Numeric({ minimum: 0 })),
});

// SRS http_hooks payload — adapt ตาม SRS spec
export const srsCallbackSchema = t.Object({
  action: t.Optional(t.String()),
  client_id: t.Optional(t.String()),
  ip: t.Optional(t.String()),
  vhost: t.Optional(t.String()),
  app: t.Optional(t.String()),
  stream: t.String({ minLength: 1 }), // = poleName
  param: t.Optional(t.String()),
  cwd: t.Optional(t.String()),
  file: t.String({ minLength: 1 }), // path to mp4
});
