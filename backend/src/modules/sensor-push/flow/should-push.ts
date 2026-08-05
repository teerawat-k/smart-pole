// ── Atom (pure): ตัดสินว่าควร push ไหม (freshness + dedup) ──
import { SkipReason } from "../sensor-push.constants";
import type { LatestReading, PushStateSnapshot, ShouldPushResult } from "../sensor-push.schema";

export function shouldPush(
  reading: LatestReading,
  state: PushStateSnapshot,
  nowMs: number,
  freshnessMs: number,
): ShouldPushResult {
  // 1) ไม่มีข้อมูล
  if (reading.seq === null || reading.measuredAt === null) {
    return { ok: false, reason: SkipReason.NO_DATA };
  }
  // 2) ค่าไม่สด (sensor ไม่ทำงาน) — ห้ามส่งค่าเก่า
  if (nowMs - reading.measuredAt > freshnessMs) {
    return { ok: false, reason: SkipReason.STALE };
  }
  // 3) seq ซ้ำกับที่ push ล่าสุด — ไม่มีค่าใหม่
  if (state.lastPushedSeq !== null && reading.seq === state.lastPushedSeq) {
    return { ok: false, reason: SkipReason.NO_NEW };
  }
  return { ok: true, reason: null };
}
