// ── Sensor Push constants ──────────────────────────────────
export const SENSOR_PUSH_ENTITY = "sensor_push" as const;
export const PUSH_SCHEMA_VERSION = "1.0" as const;
export const PUSH_SOURCE = "smart-pole" as const;
export const DEFAULT_RECEIVER_KEY = "default" as const;

export const CircuitState = {
  CLOSED: "closed",
  OPEN: "open",
  HALF_OPEN: "half_open",
} as const;
export type CircuitStateValue = (typeof CircuitState)[keyof typeof CircuitState];

export const PushHeader = {
  KEY_ID: "X-SmartPole-Key-Id",
  TIMESTAMP: "X-SmartPole-Timestamp",
  SIGNATURE: "X-SmartPole-Signature",
  EVENT_ID: "X-SmartPole-Event-Id",
} as const;

export const SkipReason = {
  NO_DATA: "no-data",
  STALE: "stale",
  NO_NEW: "no-new",
} as const;
export type SkipReasonValue = (typeof SkipReason)[keyof typeof SkipReason];
