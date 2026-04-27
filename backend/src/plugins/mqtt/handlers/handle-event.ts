// ── Handler: event/alarm messages from hardware ────────────
// validate → resolve poleId → alertService.createFromMqtt
import { eventMessageSchema } from "../schemas";
import { alertService } from "@/modules/alert";
import { prisma } from "@/plugins/prisma";
import { logger } from "@/plugins/logger";

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

  await alertService.createFromMqtt({
    poleId: pole.id,
    alertType: msg.eventType,
    severity: msg.severity,
    message: msg.message,
    triggeredAt: new Date(msg.timestamp),
  });
}
