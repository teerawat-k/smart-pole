// ── Handler: health event from Pi ──────────────────────────
// Topic: smartpole/<poleName>/health
// Pi ส่งทุก cycle (success/failure) — backend ใช้ track success rate per pole
//
// Atomic responsibility: validate payload → increment Prometheus counter
// (ไม่บันทึก DB — เป็น metric flow ไม่ใช่ business data)

import { healthMessageSchema } from "../schemas";
import { logger } from "@/plugins/logger";
import { sensorReadsTotal } from "@/plugins/metrics";

export async function handleHealthMessage(poleName: string, raw: unknown): Promise<void> {
  const parsed = healthMessageSchema.safeParse(raw);
  if (!parsed.success) {
    logger.warn(
      { poleName, errors: parsed.error.flatten() },
      "MQTT health: validation failed",
    );
    return;
  }
  const { outcome, error } = parsed.data;

  sensorReadsTotal.labels(poleName, outcome).inc();

  // log เฉพาะ outcome ที่ไม่ใช่ ok — กัน log spam
  if (outcome !== "ok") {
    logger.warn({ poleName, outcome, error }, "Pi sensor read failed");
  }
}
