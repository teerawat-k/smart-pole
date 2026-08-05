// ── Orchestrator: push 1 pole → 1 receiver (compose atoms + state) ──
// concern: due? → circuit? → shouldPush? → build → sign → deliver → update state + metric
import crypto, { type KeyObject } from "node:crypto";
import { logger } from "@/plugins/logger";
import { pushTotal, pushSkipped } from "@/plugins/metrics";
import { sensorPushRepository, type PolePushRow } from "../sensor-push.repository";
import { buildPayload } from "./build-payload";
import { signMessage } from "./sign";
import { shouldPush } from "./should-push";
import { isCircuitBlocked, onPushFailure, onPushSuccess, parseCircuit } from "./circuit";
import { postToReceiver } from "./deliver";
import type { LatestReading, PushReceiverConfig, PushStateSnapshot } from "../sensor-push.schema";
import type { PushState } from "@prisma/client";

export interface PushTickParams {
  privateKey: KeyObject;
  cfg: PushReceiverConfig;
  intervalMs: number;
  freshnessMs: number;
  cooldownMs: number;
  failThreshold: number;
  nowMs: number;
}

function toReading(pole: PolePushRow): LatestReading {
  return {
    seq: pole.latestSeq === null ? null : Number(pole.latestSeq),
    measuredAt: pole.latestReadingAt === null ? null : Number(pole.latestReadingAt),
    temperature: pole.latestTemperature === null ? null : Number(pole.latestTemperature),
    humidity: pole.latestHumidity === null ? null : Number(pole.latestHumidity),
    pm25: pole.latestPm25 === null ? null : Number(pole.latestPm25),
  };
}

function toSnapshot(state: PushState): PushStateSnapshot {
  return {
    lastPushedSeq: state.lastPushedSeq === null ? null : Number(state.lastPushedSeq),
    circuitState: parseCircuit(state.circuitState),
    circuitFailCount: state.circuitFailCount,
    circuitOpenedAt: state.circuitOpenedAt === null ? null : Number(state.circuitOpenedAt),
  };
}

export async function pushTick(pole: PolePushRow, params: PushTickParams): Promise<void> {
  const { privateKey, cfg, intervalMs, freshnessMs, cooldownMs, failThreshold, nowMs } = params;
  const state = await sensorPushRepository.getOrCreateState(pole.id, cfg.key);

  // ยังไม่ถึงเวลา tick ถัดไป
  if (state.nextPushAt !== null && nowMs < Number(state.nextPushAt)) return;

  const snap = toSnapshot(state);
  const next = nowMs + intervalMs;

  // circuit เปิด + ยังไม่ครบ cooldown → ข้าม
  if (isCircuitBlocked(snap, nowMs, cooldownMs)) {
    await sensorPushRepository.saveState(state.id, { nextPushAt: next });
    pushSkipped.labels(cfg.key, "circuit-open").inc();
    return;
  }

  const reading = toReading(pole);
  const verdict = shouldPush(reading, snap, nowMs, freshnessMs);
  if (!verdict.ok) {
    await sensorPushRepository.saveState(state.id, { nextPushAt: next });
    pushSkipped.labels(cfg.key, verdict.reason ?? "skip").inc();
    return;
  }

  const eventId = crypto.randomUUID();
  const payload = buildPayload({ poleName: pole.poleName, reading, eventId, nowMs });
  const rawBody = JSON.stringify(payload);
  const timestamp = Math.floor(nowMs / 1000);
  const signature = signMessage(privateKey, timestamp, rawBody);

  const result = await postToReceiver({ cfg, rawBody, timestamp, signature, eventId });

  if (result.ok) {
    await sensorPushRepository.saveState(state.id, {
      lastPushedSeq: reading.seq,
      lastPushedAt: nowMs,
      nextPushAt: next,
      ...onPushSuccess(),
    });
    pushTotal.labels(cfg.key, "ok").inc();
  } else {
    await sensorPushRepository.saveState(state.id, {
      nextPushAt: next,
      ...onPushFailure(snap, nowMs, failThreshold),
    });
    pushTotal.labels(cfg.key, String(result.status)).inc();
    logger.warn({ pole: pole.poleName, status: result.status }, "sensor-push: delivery failed");
  }
}
