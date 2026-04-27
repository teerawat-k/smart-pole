// ── Atom: dedupe + create alert ────────────────────────────
import type { AlertSeverity } from "@prisma/client";
import { alertRepository } from "../alert.repository";
import { ALERT_DEDUPE_WINDOW_SEC, ALERT_ENTITY } from "../alert.constants";
import { auditService, AuditAction, SYSTEM_USER_ID } from "@/modules/audit";
import { broadcastToAll } from "@/plugins/websocket";

export interface CreateAlertInput {
  poleId: number;
  alertType: string;
  severity: AlertSeverity;
  message: string;
  value?: number;
  threshold?: number;
  triggeredAt?: Date;
}

export async function dedupeAndCreate(input: CreateAlertInput): Promise<{ created: boolean; id?: number }> {
  const existing = await alertRepository.findOpenSimilar(
    input.poleId,
    input.alertType,
    ALERT_DEDUPE_WINDOW_SEC * 1000,
  );
  if (existing) return { created: false, id: existing.id };

  const alert = await alertRepository.create(input);

  auditService.log({
    userId: SYSTEM_USER_ID,
    action: AuditAction.CREATE,
    module: ALERT_ENTITY,
    targetId: alert.id,
    payload: { alertType: input.alertType, severity: input.severity, value: input.value, threshold: input.threshold },
  });

  broadcastToAll({
    type: "alert-new",
    payload: {
      id: alert.id,
      poleId: alert.poleId,
      alertType: alert.alertType,
      severity: alert.severity,
      message: alert.message,
      triggeredAt: alert.triggeredAt,
    },
  });

  return { created: true, id: alert.id };
}
