// ── Atom (pure): สร้าง push payload ตาม schema ─────────────
import { PUSH_SCHEMA_VERSION, PUSH_SOURCE } from "../sensor-push.constants";
import type { LatestReading, PushPayload } from "../sensor-push.schema";

export interface BuildPayloadInput {
  poleName: string;
  reading: LatestReading; // ผ่าน shouldPush มาแล้ว (seq + measuredAt ไม่ null)
  eventId: string;
  nowMs: number;
}

export function buildPayload(input: BuildPayloadInput): PushPayload {
  const { poleName, reading, eventId, nowMs } = input;
  return {
    schemaVersion: PUSH_SCHEMA_VERSION,
    source: PUSH_SOURCE,
    eventId,
    sentAt: new Date(nowMs).toISOString(),
    poleName,
    measuredAt: new Date(reading.measuredAt ?? nowMs).toISOString(),
    seq: reading.seq ?? 0,
    metrics: {
      temperature: reading.temperature,
      humidity: reading.humidity,
      pm25: reading.pm25,
    },
  };
}
