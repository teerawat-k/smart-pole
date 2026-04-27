// ── Handler: dispatch sensor reading messages ─────────────
// Validate envelope → iterate readings → ใช้ sensor registry dispatch
// ทุก sensor key validate Zod ของ handler — fail key ใดๆ ไม่ block key อื่น
import { sensorMessageSchema } from "../schemas";
import { getSensorHandler } from "../sensor-registry";
import { poleService } from "@/modules/pole";
import { prisma } from "@/plugins/prisma";
import { logger } from "@/plugins/logger";
import { broadcastSensorReading } from "@/plugins/websocket";
import { env } from "@/config/env";

export async function handleSensorMessage(poleName: string, raw: unknown): Promise<void> {
  const parsed = sensorMessageSchema.safeParse(raw);
  if (!parsed.success) {
    logger.warn({ poleName, errors: parsed.error.flatten() }, "MQTT sensor: validation failed");
    return;
  }
  const msg = parsed.data;

  if (msg.poleName !== poleName) {
    logger.warn({ topicPole: poleName, payloadPole: msg.poleName }, "MQTT sensor: poleName mismatch");
    return;
  }

  const time = new Date(msg.timestamp);
  if (Number.isNaN(time.getTime())) {
    logger.warn({ poleName, timestamp: msg.timestamp }, "MQTT sensor: invalid timestamp");
    return;
  }

  // drift check
  const driftSec = Math.abs((Date.now() - time.getTime()) / 1000);
  if (driftSec > env.MQTT_TIMESTAMP_DRIFT_MAX_SEC) {
    logger.warn({ poleName, driftSec }, "MQTT sensor: timestamp drift exceeded");
    return;
  }

  // resolve poleId from poleName
  const pole = await prisma.pole.findFirst({
    where: { poleName, deletedAt: null },
    select: { id: true },
  });
  if (!pole) {
    logger.warn({ poleName }, "MQTT sensor: pole not found");
    return;
  }

  // dispatch readings
  for (const [sensorKey, payload] of Object.entries(msg.readings)) {
    const handler = getSensorHandler(sensorKey);
    if (!handler) {
      // unknown sensor — เก็บใน sensor_unknown debug table
      await prisma.sensorUnknown.create({
        data: {
          time,
          poleId: pole.id,
          sensorKey,
          rawJson: payload as object,
          reason: "no_handler",
        },
      });
      continue;
    }
    const validated = handler.schema.safeParse(payload);
    if (!validated.success) {
      await prisma.sensorUnknown.create({
        data: {
          time,
          poleId: pole.id,
          sensorKey,
          rawJson: payload as object,
          reason: "validation_failed",
        },
      });
      continue;
    }
    try {
      await handler.write({
        poleId: pole.id,
        time,
        seq: BigInt(msg.seq),
        data: validated.data,
        rawJson: payload,
      });
      // realtime broadcast
      broadcastSensorReading(poleName, sensorKey, validated.data as Record<string, unknown>);
    } catch (err) {
      logger.error({ err, poleName, sensorKey }, "MQTT sensor: handler write failed");
    }
  }

  // touch pole.lastSeenAt
  await poleService.touchLastSeen(poleName, time).catch((err) => {
    logger.warn({ err, poleName }, "MQTT sensor: touchLastSeen failed");
  });
}
