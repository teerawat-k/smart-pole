import { describe, test, expect } from "bun:test";
import { shouldPush } from "./should-push";
import { CircuitState, SkipReason } from "../sensor-push.constants";
import type { LatestReading, PushStateSnapshot } from "../sensor-push.schema";

const nowMs = Date.parse("2026-08-05T03:00:00.000Z");
const FRESHNESS = 240_000; // 4 นาที

const freshState: PushStateSnapshot = {
  lastPushedSeq: null,
  circuitState: CircuitState.CLOSED,
  circuitFailCount: 0,
  circuitOpenedAt: null,
};

function reading(over: Partial<LatestReading>): LatestReading {
  return { seq: 10, measuredAt: nowMs, temperature: 30, humidity: 60, pm25: 20, ...over };
}

describe("sensor-push.shouldPush", () => {
  test("ส่งคืน ok เมื่อข้อมูลสด + seq ใหม่", () => {
    const result = shouldPush(reading({}), freshState, nowMs, FRESHNESS);
    expect(result).toEqual({ ok: true, reason: null });
  });

  test("ข้ามด้วยเหตุ no-data เมื่อ seq เป็น null", () => {
    const result = shouldPush(reading({ seq: null }), freshState, nowMs, FRESHNESS);
    expect(result).toEqual({ ok: false, reason: SkipReason.NO_DATA });
  });

  test("ข้ามด้วยเหตุ stale เมื่อค่าเก่ากว่า freshness", () => {
    const stale = reading({ measuredAt: nowMs - FRESHNESS - 1 });
    const result = shouldPush(stale, freshState, nowMs, FRESHNESS);
    expect(result).toEqual({ ok: false, reason: SkipReason.STALE });
  });

  test("ข้ามด้วยเหตุ no-new เมื่อ seq ซ้ำกับที่ push ล่าสุด", () => {
    const state: PushStateSnapshot = { ...freshState, lastPushedSeq: 10 };
    const result = shouldPush(reading({ seq: 10 }), state, nowMs, FRESHNESS);
    expect(result).toEqual({ ok: false, reason: SkipReason.NO_NEW });
  });

  test("ส่งคืน ok เมื่อ seq มากกว่าที่ push ล่าสุด", () => {
    const state: PushStateSnapshot = { ...freshState, lastPushedSeq: 9 };
    const result = shouldPush(reading({ seq: 10 }), state, nowMs, FRESHNESS);
    expect(result).toEqual({ ok: true, reason: null });
  });
});
