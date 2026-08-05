import { describe, test, expect } from "bun:test";
import { isCircuitBlocked, onPushFailure, onPushSuccess, parseCircuit } from "./circuit";
import { CircuitState } from "../sensor-push.constants";
import type { PushStateSnapshot } from "../sensor-push.schema";

const nowMs = Date.parse("2026-08-05T03:00:00.000Z");
const COOLDOWN = 600_000; // 10 นาที

function snap(over: Partial<PushStateSnapshot>): PushStateSnapshot {
  return { lastPushedSeq: null, circuitState: CircuitState.CLOSED, circuitFailCount: 0, circuitOpenedAt: null, ...over };
}

describe("sensor-push.parseCircuit", () => {
  test("แปลง string จาก DB → CircuitStateValue", () => {
    expect(parseCircuit("open")).toBe(CircuitState.OPEN);
    expect(parseCircuit("half_open")).toBe(CircuitState.HALF_OPEN);
    expect(parseCircuit("closed")).toBe(CircuitState.CLOSED);
  });

  test("ส่งคืน closed เมื่อค่าไม่รู้จัก (ป้องกันค่าเพี้ยน)", () => {
    expect(parseCircuit("garbage")).toBe(CircuitState.CLOSED);
  });
});

describe("sensor-push.isCircuitBlocked", () => {
  test("ไม่บล็อกเมื่อ circuit ปิด (closed)", () => {
    expect(isCircuitBlocked(snap({}), nowMs, COOLDOWN)).toBe(false);
  });

  test("บล็อกเมื่อ circuit เปิดและยังไม่ครบ cooldown", () => {
    const state = snap({ circuitState: CircuitState.OPEN, circuitOpenedAt: nowMs - 1000 });
    expect(isCircuitBlocked(state, nowMs, COOLDOWN)).toBe(true);
  });

  test("ยอมให้ probe เมื่อ circuit เปิดแต่ครบ cooldown แล้ว", () => {
    const state = snap({ circuitState: CircuitState.OPEN, circuitOpenedAt: nowMs - COOLDOWN - 1 });
    expect(isCircuitBlocked(state, nowMs, COOLDOWN)).toBe(false);
  });
});

describe("sensor-push.onPushSuccess", () => {
  test("รีเซ็ต circuit เป็น closed เมื่อ push สำเร็จ", () => {
    expect(onPushSuccess()).toEqual({
      circuitState: CircuitState.CLOSED,
      circuitFailCount: 0,
      circuitOpenedAt: null,
    });
  });
});

describe("sensor-push.onPushFailure", () => {
  test("เพิ่ม failCount แต่ยังไม่เปิด circuit เมื่อยังไม่ถึง threshold", () => {
    const result = onPushFailure(snap({ circuitFailCount: 1 }), nowMs, 5);
    expect(result).toEqual({ circuitState: CircuitState.CLOSED, circuitFailCount: 2, circuitOpenedAt: null });
  });

  test("เปิด circuit เมื่อ failCount ถึง threshold", () => {
    const result = onPushFailure(snap({ circuitFailCount: 4 }), nowMs, 5);
    expect(result).toEqual({ circuitState: CircuitState.OPEN, circuitFailCount: 5, circuitOpenedAt: nowMs });
  });

  test("probe ล้มเหลว (circuit เปิดอยู่) → เปิดใหม่ reset cooldown", () => {
    const state = snap({ circuitState: CircuitState.OPEN, circuitFailCount: 6, circuitOpenedAt: nowMs - COOLDOWN - 1 });
    const result = onPushFailure(state, nowMs, 5);
    expect(result).toEqual({ circuitState: CircuitState.OPEN, circuitFailCount: 7, circuitOpenedAt: nowMs });
  });
});
