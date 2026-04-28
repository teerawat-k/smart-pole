// ── Atom: unlock user (clear lockedUntil) ──────────────────
import { userRepository } from "../user.repository";
import { auditService, AuditAction } from "@/modules/audit";
import { authRepository } from "@/modules/auth/auth.repository";
import { NotFoundError } from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";
import { USER_ENTITY } from "../user.constants";

export async function unlockUser(id: number, requestUserId: number) {
  const user = await userRepository.findById(id);
  if (!user) throw new NotFoundError(ErrorCode.USER_NOT_FOUND, "ไม่พบผู้ใช้งานที่ระบุ");

  const updated = await userRepository.unlock(id, requestUserId);

  auditService.log({
    userId: requestUserId,
    action: AuditAction.UNLOCK,
    module: USER_ENTITY,
    targetId: id,
  });

  authRepository.logSystem({
    logType: "account_unlocked",
    userId: requestUserId,
    usernameSnap: user.username,
  }).catch(() => {});

  return updated;
}
