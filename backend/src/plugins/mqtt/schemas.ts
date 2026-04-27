// ── MQTT payload schemas (Zod) — application-defined ─────
// ดู docs/mqtt-spec.md
import { z } from "zod";

/** Common envelope — ทุก message มี field เหล่านี้ */
export const envelopeSchema = z.object({
  schemaVersion: z.string(),
  poleName: z.string().min(1).max(64),
  timestamp: z.string(), // ISO 8601 (validate drift ใน handler)
  seq: z.number().int().min(0).optional(),
});

/** smartpole/{poleName}/sensor */
export const sensorMessageSchema = envelopeSchema.extend({
  seq: z.number().int().min(0),
  readings: z.record(z.string(), z.record(z.string(), z.unknown())),
});

/** smartpole/{poleName}/heartbeat */
export const heartbeatMessageSchema = envelopeSchema.extend({
  status: z.enum(["online", "offline"]),
  signalDbm: z.number().int().min(-150).max(0).optional(),
  uptimeSec: z.number().int().min(0).optional(),
  firmwareVersion: z.string().max(64).optional(),
});

/** smartpole/{poleName}/event */
export const eventMessageSchema = envelopeSchema.extend({
  eventType: z.string().min(1).max(64),
  severity: z.enum(["info", "warning", "critical"]).default("warning"),
  message: z.string().min(1).max(500),
  detail: z.record(z.string(), z.unknown()).optional(),
});

export type SensorMessage = z.infer<typeof sensorMessageSchema>;
export type HeartbeatMessage = z.infer<typeof heartbeatMessageSchema>;
export type EventMessage = z.infer<typeof eventMessageSchema>;
