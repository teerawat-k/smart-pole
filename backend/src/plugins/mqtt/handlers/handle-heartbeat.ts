// ── Handler: heartbeat messages ────────────────────────────
// status=online → poleService.recordHeartbeat + write signal history + broadcast
// status=offline (LWT) → poleService.markOffline + broadcast
import { heartbeatMessageSchema } from "../schemas";
import { poleService } from "@/modules/pole";
import { sensorHeartbeatSignalService } from "@/modules/sensor-heartbeat-signal";
import { prisma } from "@/plugins/prisma";
import { logger } from "@/plugins/logger";
import { broadcastPoleStatus } from "@/plugins/websocket";
import { alertService, AlertType } from "@/modules/alert";

export async function handleHeartbeatMessage(poleName: string, raw: unknown): Promise<void> {
  const parsed = heartbeatMessageSchema.safeParse(raw);
  if (!parsed.success) {
    logger.warn({ poleName, errors: parsed.error.flatten() }, "MQTT heartbeat: validation failed");
    return;
  }
  const msg = parsed.data;
  if (msg.poleName !== poleName) {
    logger.warn({ topicPole: poleName, payloadPole: msg.poleName }, "MQTT heartbeat: poleName mismatch");
    return;
  }

  const time = new Date(msg.timestamp);
  if (Number.isNaN(time.getTime())) {
    logger.warn({ poleName }, "MQTT heartbeat: invalid timestamp");
    return;
  }

  if (msg.status === "offline") {
    const pole = await poleService.markOffline(poleName);
    if (pole) broadcastPoleStatus(poleName, "offline");
    return;
  }

  // online
  const pole = await prisma.pole.findFirst({
    where: { poleName, deletedAt: null },
    select: { id: true, poleStatus: true },
  });
  if (!pole) {
    logger.warn({ poleName }, "MQTT heartbeat: pole not found");
    return;
  }

  const wasOffline = pole.poleStatus !== "online";
  await poleService.recordHeartbeat(poleName, time);

  await sensorHeartbeatSignalService.write({
    time,
    poleId: pole.id,
    signalDbm: msg.signalDbm,
    uptimeSec: msg.uptimeSec !== undefined ? BigInt(msg.uptimeSec) : undefined,
    firmwareVersion: msg.firmwareVersion,
  }).catch((err) => {
    logger.warn({ err, poleName }, "MQTT heartbeat: signal write failed");
  });

  if (wasOffline) {
    broadcastPoleStatus(poleName, "online", time);
    // auto-resolve open offline alert
    await alertService.autoResolveForPole(pole.id, AlertType.POLE_OFFLINE).catch((err) => {
      logger.warn({ err, poleName }, "MQTT heartbeat: auto-resolve offline alert failed");
    });
  }
}
