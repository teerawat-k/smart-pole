import { t, type Static } from "elysia";
import { paginationQuery } from "@/common/schemas/pagination";

const poleStatusEnum = t.Union([
  t.Literal("online"),
  t.Literal("offline"),
  t.Literal("unknown"),
  t.Literal("maintenance"),
]);

export const poleListQuery = t.Object({
  ...paginationQuery,
  poleStatus: t.Optional(poleStatusEnum),
  hasCamera: t.Optional(t.BooleanString()),
});

export const poleCreateSchema = t.Object({
  poleName: t.String({ minLength: 1, maxLength: 64, pattern: "^[a-zA-Z0-9._-]+$" }),
  installPlace: t.String({ minLength: 1, maxLength: 200 }),
  ddnsHostname: t.Optional(t.String({ maxLength: 200 })),
  ipCamera: t.Optional(t.String({ maxLength: 64 })),
  cameraModel: t.Optional(t.String({ maxLength: 100 })),
  latitude: t.Optional(t.Number({ minimum: -90, maximum: 90 })),
  longitude: t.Optional(t.Number({ minimum: -180, maximum: 180 })),
  hasCamera: t.Optional(t.Boolean()),
  hasPm25Sensor: t.Optional(t.Boolean()),
  hasTempHumidity: t.Optional(t.Boolean()),
  hasLed: t.Optional(t.Boolean()),
});

export const poleUpdateSchema = t.Object({
  installPlace: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
  ddnsHostname: t.Optional(t.String({ maxLength: 200 })),
  ipCamera: t.Optional(t.String({ maxLength: 64 })),
  cameraModel: t.Optional(t.String({ maxLength: 100 })),
  latitude: t.Optional(t.Number({ minimum: -90, maximum: 90 })),
  longitude: t.Optional(t.Number({ minimum: -180, maximum: 180 })),
  hasCamera: t.Optional(t.Boolean()),
  hasPm25Sensor: t.Optional(t.Boolean()),
  hasTempHumidity: t.Optional(t.Boolean()),
  hasLed: t.Optional(t.Boolean()),
});

export const poleMaintenanceSchema = t.Object({
  enabled: t.Boolean(),
  reason: t.Optional(t.String({ maxLength: 500 })),
});

// on-demand VPN: open = สั่งเสาเปิด tunnel (ttl วินาที, auto-close) · close = ปิดทันที
export const poleVpnSchema = t.Object({
  action: t.Union([t.Literal("open"), t.Literal("close")]),
  ttl: t.Optional(t.Integer({ minimum: 60, maximum: 3600 })),
});

export type PoleCreateInput = Static<typeof poleCreateSchema>;
export type PoleUpdateInput = Static<typeof poleUpdateSchema>;
export type PoleMaintenanceInput = Static<typeof poleMaintenanceSchema>;
export type PoleVpnInput = Static<typeof poleVpnSchema>;
