// ── Handler: sensor packet (flat) ──────────────────────────
// poleName มาจาก topic — `smartpole/<poleName>/sensor`
// validate → resolve poleId → insert SensorReading + update Pole.latest* + lastSeenAt + broadcast
// timestamp: เก็บ raw epoch ตรงๆ (ไม่แปลง) — frontend แปลง timezone เอง
import { sensorMessageSchema } from "../schemas";
import { prisma } from "@/plugins/prisma";
import { logger } from "@/plugins/logger";
import { broadcastSensorReading } from "@/plugins/websocket";
import { mqttMessagesTotal } from "@/plugins/metrics";
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

  const pole = await prisma.pole.findFirst({
    where: { poleName, deletedAt: null },
    select: { id: true },
  });
  if (!pole) {
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
      data: { time, poleId: pole.id, seq, pm25, temperature, humidity },
    }),
    prisma.pole.update({
      where: { id: pole.id },
      data: {
        poleStatus: "online",
        lastSeenAt: time,
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
