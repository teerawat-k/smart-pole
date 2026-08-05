// ── Atom (pure): circuit breaker transitions ต่อ receiver ──
// closed → ล้มติดกัน N ครั้ง → open (หยุดยิง cooldown) → probe → closed/open
import { CircuitState, type CircuitStateValue } from "../sensor-push.constants";
import type { CircuitUpdate, PushStateSnapshot } from "../sensor-push.schema";

/** map string จาก DB → CircuitStateValue (เลี่ยง `as`) */
export function parseCircuit(s: string): CircuitStateValue {
  if (s === CircuitState.OPEN) return CircuitState.OPEN;
  if (s === CircuitState.HALF_OPEN) return CircuitState.HALF_OPEN;
  return CircuitState.CLOSED;
}

/** ควรข้ามไหม (circuit เปิด + ยังไม่ครบ cooldown) — ครบ cooldown = ยอมให้ probe 1 ครั้ง */
export function isCircuitBlocked(state: PushStateSnapshot, nowMs: number, cooldownMs: number): boolean {
  if (state.circuitState !== CircuitState.OPEN) return false;
  if (state.circuitOpenedAt === null) return false;
  return nowMs - state.circuitOpenedAt < cooldownMs;
}

/** หลัง push สำเร็จ → reset closed */
export function onPushSuccess(): CircuitUpdate {
  return { circuitState: CircuitState.CLOSED, circuitFailCount: 0, circuitOpenedAt: null };
}

/** หลัง push ล้มเหลว → เพิ่ม fail · เปิด circuit เมื่อถึง threshold · probe ล้ม = เปิดใหม่ */
export function onPushFailure(state: PushStateSnapshot, nowMs: number, threshold: number): CircuitUpdate {
  if (state.circuitState === CircuitState.OPEN) {
    // probe (open + cooldown ครบ) ล้ม → เปิดใหม่ reset cooldown
    return { circuitState: CircuitState.OPEN, circuitFailCount: state.circuitFailCount + 1, circuitOpenedAt: nowMs };
  }
  const failCount = state.circuitFailCount + 1;
  if (failCount >= threshold) {
    return { circuitState: CircuitState.OPEN, circuitFailCount: failCount, circuitOpenedAt: nowMs };
  }
  return { circuitState: CircuitState.CLOSED, circuitFailCount: failCount, circuitOpenedAt: null };
}
