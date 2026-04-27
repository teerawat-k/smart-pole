// ── Atom: update user (admin) ──────────────────────────────
import { userRepository } from "../user.repository";
import { auditService, AuditAction } from "@/modules/audit";
import { DuplicateError, NotFoundError } from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";
import { USER_ENTITY } from "../user.constants";
import type { UserUpdateInput } from "../user.schema";

export async function updateUser(id: number, input: UserUpdateInput, requestUserId: number) {
  const user = await userRepository.findById(id);
  if (!user) throw new NotFoundError(ErrorCode.USER_NOT_FOUND, "ไม่พบผู้ใช้งานที่ระบุ");

  if (input.email && input.email !== user.email) {
    const conflict = await userRepository.findByEmail(input.email);
    if (conflict && conflict.id !== id) {
      throw new DuplicateError(ErrorCode.USER_DUPLICATE_EMAIL, "อีเมลนี้มีอยู่แล้ว");
    }
  }

  const updated = await userRepository.update(id, { ...input, updatedBy: requestUserId });

  auditService.log({
    userId: requestUserId,
    action: AuditAction.UPDATE,
    module: USER_ENTITY,
    targetId: id,
    payload: { changes: input },
  });

  return updated;
}
