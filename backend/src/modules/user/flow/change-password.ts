// ── Atom: self change password ─────────────────────────────
// Steps: check new!=current → find user → verify current → hash → update + bump tokenVersion → audit
import { userRepository } from "../user.repository";
import { auditService, AuditAction } from "@/modules/audit";
import { NotFoundError, UnauthorizedError, ValidationError } from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";
import { hashPassword, verifyPassword } from "@/common/utils/password";
import { USER_ENTITY } from "../user.constants";
import type { UserChangePasswordInput } from "../user.schema";

export async function changeMyPassword(input: UserChangePasswordInput, requestUserId: number) {
  if (input.currentPassword === input.newPassword) {
    throw new ValidationError(ErrorCode.USER_INVALID_PASSWORD, "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสปัจจุบัน");
  }

  const profile = await userRepository.findById(requestUserId);
  const user = profile ? await userRepository.findByUsername(profile.username) : null;
  if (!user) throw new NotFoundError(ErrorCode.USER_NOT_FOUND, "ไม่พบผู้ใช้งาน");

  const ok = await verifyPassword(user.password, input.currentPassword);
  if (!ok) {
    throw new UnauthorizedError(ErrorCode.AUTH_INVALID_CREDENTIALS, "รหัสผ่านปัจจุบันไม่ถูกต้อง");
  }

  const passwordHash = await hashPassword(input.newPassword);
  await userRepository.updatePassword(requestUserId, passwordHash, requestUserId);

  auditService.log({
    userId: requestUserId,
    action: AuditAction.CHANGE_PASSWORD,
    module: USER_ENTITY,
    targetId: requestUserId,
  });

  return { success: true };
}
