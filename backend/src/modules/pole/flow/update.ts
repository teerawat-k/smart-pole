// ── Atom: update pole (admin) ──────────────────────────────
import { poleRepository } from "../pole.repository";
import { auditService, AuditAction } from "@/modules/audit";
import { DuplicateError, NotFoundError } from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";
import { POLE_ENTITY } from "../pole.constants";
import type { PoleUpdateInput } from "../pole.schema";

export async function updatePole(id: number, input: PoleUpdateInput, requestUserId: number) {
  const pole = await poleRepository.findById(id);
  if (!pole) throw new NotFoundError(ErrorCode.POLE_NOT_FOUND, "ไม่พบเสาที่ระบุ");

  if (input.ddnsHostname && input.ddnsHostname !== pole.ddnsHostname) {
    const conflict = await poleRepository.findByDdnsHostname(input.ddnsHostname);
    if (conflict && conflict.id !== id) {
      throw new DuplicateError(ErrorCode.POLE_DUPLICATE_DDNS, "DDNS hostname นี้มีอยู่แล้ว");
    }
  }

  const updated = await poleRepository.update(id, { ...input, updatedBy: requestUserId });

  auditService.log({
    userId: requestUserId,
    action: AuditAction.UPDATE,
    module: POLE_ENTITY,
    targetId: id,
    payload: { changes: input },
  });

  return updated;
}
