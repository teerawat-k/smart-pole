// ── Handler: health event from Pi ──────────────────────────
// Topic: smartpole/<poleName>/health
// Pi ส่งทุก cycle (success/failure) — track success rate + ยืนยันว่าเสายัง reachable
//
// Atomic responsibility: validate payload → increment Prometheus counter
//   → mark pole seen (ต่ออายุ lastSeenAt)
//
// /health = หลักฐานว่า MQTT link ยังต่ออยู่ → เสายัง "online" แม้ sensor อ่านค่าไม่ได้
// (offline สงวนไว้สำหรับกรณีติดต่อไม่ได้เลย — ไม่มีทั้ง /sensor และ /health)

import { healthMessageSchema } from "../schemas";
import { logger } from "@/plugins/logger";
import { sensorReadsTotal } from "@/plugins/metrics";
import { markPoleSeen } from "./mark-pole-seen";

export async function handleHealthMessage(poleName: string, raw: unknown): Promise<void> {
  const parsed = healthMessageSchema.safeParse(raw);
  if (!parsed.success) {
    logger.warn(
      { poleName, errors: parsed.error.flatten() },
      "MQTT health: validation failed",
    );
    return;
  }
  const { timestamp, outcome, error } = parsed.data;

  sensorReadsTotal.labels(poleName, outcome).inc();

  // ต่ออายุ lastSeenAt — กัน false offline ตอน sensor พังแต่เสายังมีชีวิต
  const seen = await markPoleSeen(poleName, BigInt(timestamp));
  if (!seen) {
    logger.warn({ poleName }, "MQTT health: pole not found");
  }

  // log เฉพาะ outcome ที่ไม่ใช่ ok — กัน log spam
  if (outcome !== "ok") {
    logger.warn({ poleName, outcome, error }, "Pi sensor read failed");
  }
}
