// ── Sensor Push types ──────────────────────────────────────
import type { CircuitStateValue, SkipReasonValue } from "./sensor-push.constants";

export interface PushMetrics {
  temperature: number | null;
  humidity: number | null;
  pm25: number | null;
}

export interface PushPayload {
  schemaVersion: string;
  source: string;
  eventId: string;
  sentAt: string;      // UTC ISO 8601
  poleName: string;
  measuredAt: string;  // UTC ISO 8601
  seq: number;
  metrics: PushMetrics;
}

/** reading ล่าสุดของเสา (แปลงจาก Pole.latest* → number/epoch ms) */
export interface LatestReading {
  seq: number | null;
  measuredAt: number | null; // epoch ms
  temperature: number | null;
  humidity: number | null;
  pm25: number | null;
}

/** state ต่อ pole+receiver (subset ที่ flow ใช้) */
export interface PushStateSnapshot {
  lastPushedSeq: number | null;
  circuitState: CircuitStateValue;
  circuitFailCount: number;
  circuitOpenedAt: number | null; // epoch ms
}

export interface ShouldPushResult {
  ok: boolean;
  reason: SkipReasonValue | null;
}

/** ผลการคำนวณ circuit ใหม่ (เขียนกลับ state) */
export interface CircuitUpdate {
  circuitState: CircuitStateValue;
  circuitFailCount: number;
  circuitOpenedAt: number | null;
}

export interface PostResult {
  ok: boolean;
  status: number; // 0 = network/timeout error
}

export interface PushReceiverConfig {
  key: string;      // receiverKey
  url: string;
  keyId: string;
  timeoutMs: number;
  maxRetry: number;
}
