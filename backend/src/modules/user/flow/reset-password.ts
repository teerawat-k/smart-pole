// ── Atom: admin reset user password ────────────────────────
import { userRepository } from "../user.repository";
import { auditService, AuditAction } from "@/modules/audit";
import { authRepository } from "@/modules/auth/auth.repository";
import { NotFoundError } from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";
import { hashPassword } from "@/common/utils/password";
import { USER_ENTITY } from "../user.constants";
import type { UserResetPasswordInput } from "../user.schema";

export async function resetUserPassword(id: number, input: UserResetPasswordInput, requestUserId: number) {
  const user = await userRepository.findById(id);
  if (!user) throw new NotFoundError(ErrorCode.USER_NOT_FOUND, "ไม่พบผู้ใช้งานที่ระบุ");

  const passwordHash = await hashPassword(input.newPassword);
  await userRepository.updatePassword(id, passwordHash, requestUserId);

  auditService.log({
    userId: requestUserId,
    action: AuditAction.RESET_PASSWORD,
    module: USER_ENTITY,
    targetId: id,
  });

  authRepository.logSystem({
    logType: "password_reset",
    userId: requestUserId,
    usernameSnap: user.username,
  }).catch(() => {});

  return { success: true };
}
