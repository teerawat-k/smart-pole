// ── Sensor Push service — orchestrator + scheduler (flag-gated) ──
import { type KeyObject } from "node:crypto";
import { registerJob } from "@/plugins/scheduler";
import { env } from "@/config/env";
import { logger } from "@/plugins/logger";
import { sensorPushRepository } from "./sensor-push.repository";
import { pushTick, type PushTickParams } from "./flow/push-tick";
import { loadPrivateKey } from "./flow/sign";
import { DEFAULT_RECEIVER_KEY } from "./sensor-push.constants";
import type { PushReceiverConfig } from "./sensor-push.schema";

let privateKey: KeyObject | null = null;

function receiverConfig(): PushReceiverConfig {
  return {
    key: DEFAULT_RECEIVER_KEY,
    url: env.SENSOR_PUSH_RECEIVER_URL,
    keyId: env.SENSOR_PUSH_KEY_ID,
    timeoutMs: env.SENSOR_PUSH_TIMEOUT_MS,
    maxRetry: env.SENSOR_PUSH_MAX_RETRY,
  };
}

async function tickAll(): Promise<void> {
  if (!env.SENSOR_PUSH_ENABLED || !env.SENSOR_PUSH_RECEIVER_URL || privateKey === null) return;
  const poles = await sensorPushRepository.findActivePoles();
  const params: PushTickParams = {
    privateKey,
    cfg: receiverConfig(),
    intervalMs: env.SENSOR_PUSH_INTERVAL_SEC * 1000,
    freshnessMs: env.SENSOR_PUSH_FRESHNESS_SEC * 1000,
    cooldownMs: env.SENSOR_PUSH_CIRCUIT_COOLDOWN_SEC * 1000,
    failThreshold: env.SENSOR_PUSH_CIRCUIT_FAIL_THRESHOLD,
    nowMs: Date.now(),
  };
  for (const pole of poles) {
    try {
      await pushTick(pole, params);
    } catch (err) {
      logger.error({ err, pole: pole.poleName }, "sensor-push: tick error");
    }
  }
}

export interface PushStatusRow {
  poleId: number;
  receiverKey: string;
  lastPushedSeq: number | null;
  lastPushedAt: number | null;
  nextPushAt: number | null;
  circuitState: string;
  circuitFailCount: number;
}
export interface PushStatus {
  enabled: boolean;
  receiverConfigured: boolean;
  keyId: string;
  intervalSec: number;
  states: PushStatusRow[];
}

export const sensorPushService = {
  /** เรียกครั้งเดียวตอน startup — gated by SENSOR_PUSH_ENABLED */
  start(): void {
    if (!env.SENSOR_PUSH_ENABLED) {
      logger.info("sensor-push: disabled (SENSOR_PUSH_ENABLED=false)");
      return;
    }
    if (!env.SENSOR_PUSH_RECEIVER_URL || !env.SENSOR_PUSH_PRIVATE_KEY) {
      logger.warn("sensor-push: enabled แต่ไม่มี receiver URL / private key — ไม่เริ่ม");
      return;
    }
    try {
      privateKey = loadPrivateKey(env.SENSOR_PUSH_PRIVATE_KEY);
    } catch (err) {
      logger.error({ err }, "sensor-push: private key ไม่ถูกต้อง — ไม่เริ่ม");
      return;
    }
    registerJob({ name: "sensor-push-tick", cronExpression: "*/1 * * * *", fn: tickAll });
    logger.info({ url: env.SENSOR_PUSH_RECEIVER_URL }, "sensor-push: started");
  },

  async status(): Promise<PushStatus> {
    const states = await sensorPushRepository.findStates();
    return {
      enabled: env.SENSOR_PUSH_ENABLED,
      receiverConfigured: env.SENSOR_PUSH_RECEIVER_URL !== "",
      keyId: env.SENSOR_PUSH_KEY_ID,
      intervalSec: env.SENSOR_PUSH_INTERVAL_SEC,
      states: states.map((s) => ({
        poleId: s.poleId,
        receiverKey: s.receiverKey,
        lastPushedSeq: s.lastPushedSeq === null ? null : Number(s.lastPushedSeq),
        lastPushedAt: s.lastPushedAt === null ? null : Number(s.lastPushedAt),
        nextPushAt: s.nextPushAt === null ? null : Number(s.nextPushAt),
        circuitState: s.circuitState,
        circuitFailCount: s.circuitFailCount,
      })),
    };
  },
};
