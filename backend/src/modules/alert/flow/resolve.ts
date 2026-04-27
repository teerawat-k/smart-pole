// ── Atom: resolve alert (manual or system) ────────────────
import { alertRepository } from "../alert.repository";
import { auditService, AuditAction } from "@/modules/audit";
import { ALERT_ENTITY } from "../alert.constants";
import { ConflictError, NotFoundError } from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";
import { prisma } from "@/plugins/prisma";
import { broadcastToAll } from "@/plugins/websocket";

export async function resolveAlert(
  alertId: number,
  resolvedById: number,
  note?: string,
): Promise<void> {
  const existing = await prisma.alert.findUnique({ where: { id: alertId }, select: { id: true, isResolved: true, poleId: true, alertType: true } });
  if (!existing) throw new NotFoundError(ErrorCode.ALERT_NOT_FOUND, "ไม่พบ alert ที่ระบุ");
  if (existing.isResolved) throw new ConflictError(ErrorCode.ALERT_ALREADY_RESOLVED, "Alert นี้ resolve ไปแล้ว");

  await alertRepository.resolve(alertId, resolvedById, note);

  auditService.log({
    userId: resolvedById,
    action: AuditAction.UPDATE,
    module: ALERT_ENTITY,
    targetId: alertId,
    payload: { event: "resolved", note },
  });

  broadcastToAll({
    type: "alert-resolved",
    payload: { id: alertId, poleId: existing.poleId, alertType: existing.alertType, resolvedById },
  });
}

/** Auto-resolve open alerts of a type for a pole — เช่น offline → online */
export async function autoResolveOpenForPole(
  poleId: number,
  alertType: string,
  systemUserId: number,
): Promise<number> {
  const existing = await alertRepository.findOpenForPole(poleId, alertType);
  if (!existing) return 0;
  await alertRepository.resolve(existing.id, systemUserId, "auto-resolved by system");

  auditService.log({
    userId: systemUserId,
    action: AuditAction.UPDATE,
    module: ALERT_ENTITY,
    targetId: existing.id,
    payload: { event: "auto_resolved", reason: "condition_cleared" },
  });

  broadcastToAll({
    type: "alert-resolved",
    payload: { id: existing.id, poleId, alertType, auto: true },
  });

  return existing.id;
}
