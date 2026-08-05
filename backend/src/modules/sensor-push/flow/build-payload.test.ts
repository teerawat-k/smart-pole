import { describe, test, expect } from "bun:test";
import { buildPayload } from "./build-payload";
import { PUSH_SCHEMA_VERSION, PUSH_SOURCE } from "../sensor-push.constants";
import type { LatestReading } from "../sensor-push.schema";

const reading: LatestReading = {
  seq: 42,
  measuredAt: Date.parse("2026-08-05T03:00:00.000Z"),
  temperature: 31.5,
  humidity: 68,
  pm25: 22,
};

describe("sensor-push.buildPayload", () => {
  test("สร้าง payload ตาม schema พร้อม metadata ครบ", () => {
    const nowMs = Date.parse("2026-08-05T03:01:00.000Z");
    const payload = buildPayload({ poleName: "POLE-01", reading, eventId: "evt-1", nowMs });

    expect(payload.schemaVersion).toBe(PUSH_SCHEMA_VERSION);
    expect(payload.source).toBe(PUSH_SOURCE);
    expect(payload.eventId).toBe("evt-1");
    expect(payload.poleName).toBe("POLE-01");
    expect(payload.seq).toBe(42);
    expect(payload.sentAt).toBe("2026-08-05T03:01:00.000Z");
    expect(payload.measuredAt).toBe("2026-08-05T03:00:00.000Z");
    expect(payload.metrics).toEqual({ temperature: 31.5, humidity: 68, pm25: 22 });
  });

  test("ส่งคืน metric เป็น null เมื่อ sensor ไม่มีค่า", () => {
    const nowMs = Date.parse("2026-08-05T03:01:00.000Z");
    const partial: LatestReading = { ...reading, humidity: null, pm25: null };
    const payload = buildPayload({ poleName: "POLE-02", reading: partial, eventId: "evt-2", nowMs });

    expect(payload.metrics.temperature).toBe(31.5);
    expect(payload.metrics.humidity).toBeNull();
    expect(payload.metrics.pm25).toBeNull();
  });
});
