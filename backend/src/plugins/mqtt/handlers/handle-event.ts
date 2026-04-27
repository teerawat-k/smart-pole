// ── Handler: event/alarm messages from hardware ────────────
// TODO(E11): create alert via alertService.createFromMqtt
// ตอนนี้ log + broadcast เป็น notification ก่อน
import { eventMessageSchema } from "../schemas";
import { prisma } from "@/plugins/prisma";
import { logger } from "@/plugins/logger";
import { broadcastToAll } from "@/plugins/websocket";

export async function handleEventMessage(poleName: string, raw: unknown): Promise<void> {
  const parsed = eventMessageSchema.safeParse(raw);
  if (!parsed.success) {
    logger.warn({ poleName, errors: parsed.error.flatten() }, "MQTT event: validation failed");
    return;
  }
  const msg = parsed.data;
  if (msg.poleName !== poleName) {
    logger.warn({ topicPole: poleName, payloadPole: msg.poleName }, "MQTT event: poleName mismatch");
    return;
  }

  const pole = await prisma.pole.findFirst({
    where: { poleName, deletedAt: null },
    select: { id: true },
  });
  if (!pole) {
    logger.warn({ poleName }, "MQTT event: pole not found");
    return;
  }

  // TODO(E11): alertService.createFromMqtt + dedupe
  logger.info({ poleName, eventType: msg.eventType, severity: msg.severity }, "MQTT event received");
  broadcastToAll({
    type: "pole-event",
    payload: { poleName, eventType: msg.eventType, severity: msg.severity, message: msg.message, time: msg.timestamp },
  });
}
