// ── Handler: sensor packet (flat) ──────────────────────────
// validate → resolve poleId → insert SensorReading + update Pole.latest* + lastSeenAt + broadcast
// timestamp: เก็บ raw epoch ตรงๆ (ไม่แปลง) — frontend แปลง timezone เอง
import { sensorMessageSchema } from "../schemas";
import { prisma } from "@/plugins/prisma";
import { logger } from "@/plugins/logger";
import { broadcastSensorReading } from "@/plugins/websocket";
import { Prisma } from "@prisma/client";

export async function handleSensorMessage(raw: unknown): Promise<void> {
  const parsed = sensorMessageSchema.safeParse(raw);
  if (!parsed.success) {
    logger.warn({ errors: parsed.error.flatten() }, "MQTT sensor: validation failed");
    return;
  }
  const msg = parsed.data;
  const poleName = msg.pole_name;
  const time = BigInt(msg.timestamp);

  const pole = await prisma.pole.findFirst({
    where: { poleName, deletedAt: null },
    select: { id: true },
  });
  if (!pole) {
    logger.warn({ poleName }, "MQTT sensor: pole not found");
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

  broadcastSensorReading(poleName, "sensor", msg);
}
