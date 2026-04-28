// ── Atom: soft delete pole ────────────────────────────────
// TODO(E11): block ถ้ามี active alert
import { poleRepository } from "../pole.repository";
import { auditService, AuditAction } from "@/modules/audit";
import { NotFoundError } from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";
import { POLE_ENTITY } from "../pole.constants";

export async function softDeletePole(id: number, requestUserId: number) {
  const pole = await poleRepository.findById(id);
  if (!pole) throw new NotFoundError(ErrorCode.POLE_NOT_FOUND, "ไม่พบเสาที่ระบุ");

  // TODO(E11): assertNoActiveAlerts(id)

  await poleRepository.softDelete(id, requestUserId);

  auditService.log({
    userId: requestUserId,
    action: AuditAction.DELETE,
    module: POLE_ENTITY,
    targetId: id,
    payload: { poleName: pole.poleName },
  });

  return { success: true };
}
