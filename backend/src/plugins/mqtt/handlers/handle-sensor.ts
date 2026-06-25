// ── Handler: sensor packet (flat) ──────────────────────────
// poleName มาจาก topic — `smartpole/<poleName>/sensor`
// validate → mark pole seen (lastSeenAt + online) → insert SensorReading + update Pole.latest* → broadcast
// timestamp: เก็บ raw epoch ตรงๆ (ไม่แปลง) — frontend แปลง timezone เอง
//
// lastSeenAt + transition offline→online + auto-resolve alert → delegate `markPoleSeen` (shared กับ /health)
import { sensorMessageSchema } from "../schemas";
import { prisma } from "@/plugins/prisma";
import { logger } from "@/plugins/logger";
import { broadcastSensorReading } from "@/plugins/websocket";
import { mqttMessagesTotal } from "@/plugins/metrics";
import { markPoleSeen } from "./mark-pole-seen";
import { Prisma } from "@prisma/client";

export async function handleSensorMessage(poleName: string, raw: unknown): Promise<void> {
  const parsed = sensorMessageSchema.safeParse(raw);
  if (!parsed.success) {
    logger.warn({ poleName, errors: parsed.error.flatten() }, "MQTT sensor: validation failed");
    mqttMessagesTotal.labels("sensor", "invalid").inc();
    return;
  }
  const msg = parsed.data;
  const time = BigInt(msg.timestamp);

  // ต่ออายุ lastSeenAt + online + auto-resolve (อ่านสถานะก่อน flip ภายใน markPoleSeen)
  const seen = await markPoleSeen(poleName, time);
  if (!seen) {
    logger.warn({ poleName }, "MQTT sensor: pole not found");
    mqttMessagesTotal.labels("sensor", "unknown_pole").inc();
    return;
  }

  const seq = BigInt(msg.seq);
  const pm25        = msg.pm25        !== undefined ? new Prisma.Decimal(msg.pm25)        : null;
  const temperature = msg.temperature !== undefined ? new Prisma.Decimal(msg.temperature) : null;
  const humidity    = msg.humidity    !== undefined ? new Prisma.Decimal(msg.humidity)    : null;

  await Promise.all([
    prisma.sensorReading.create({
      data: { time, poleId: seen.poleId, seq, pm25, temperature, humidity },
    }),
    prisma.pole.update({
      where: { id: seen.poleId },
      data: {
        latestSeq: seq,
        latestPm25: pm25,
        latestTemperature: temperature,
        latestHumidity: humidity,
        latestReadingAt: time,
      },
    }),
  ]);

  broadcastSensorReading(poleName, "sensor", { poleName, ...msg });
  mqttMessagesTotal.labels("sensor", "ok").inc();
}
