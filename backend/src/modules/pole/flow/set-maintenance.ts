// ── Atom: toggle maintenance mode ──────────────────────────
import { poleRepository } from "../pole.repository";
import { auditService, AuditAction } from "@/modules/audit";
import { NotFoundError } from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";
import { POLE_ENTITY } from "../pole.constants";
import type { PoleMaintenanceInput } from "../pole.schema";

export async function setMaintenance(id: number, input: PoleMaintenanceInput, requestUserId: number) {
  const pole = await poleRepository.findById(id);
  if (!pole) throw new NotFoundError(ErrorCode.POLE_NOT_FOUND, "ไม่พบเสาที่ระบุ");

  const newStatus = input.enabled ? "maintenance" : "unknown";
  const updated = await poleRepository.updateStatus(
    id,
    newStatus,
    {
      maintenanceReason: input.enabled ? (input.reason ?? null) : null,
      updatedBy: requestUserId,
    },
  );

  auditService.log({
    userId: requestUserId,
    action: AuditAction.STATUS_CHANGE,
    module: POLE_ENTITY,
    targetId: id,
    payload: {
      from: pole.poleStatus,
      to: newStatus,
      reason: input.reason,
    },
  });

  return updated;
}
