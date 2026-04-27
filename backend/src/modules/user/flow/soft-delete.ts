// ── Atom: soft delete user ────────────────────────────────
import { userRepository } from "../user.repository";
import { auditService, AuditAction } from "@/modules/audit";
import { NotFoundError } from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";
import { USER_ENTITY } from "../user.constants";
import { assertNotSelf, assertNotLastActiveAdmin } from "../shared/guards";

export async function softDeleteUser(id: number, requestUserId: number) {
  assertNotSelf(id, requestUserId);

  const user = await userRepository.findById(id);
  if (!user) throw new NotFoundError(ErrorCode.USER_NOT_FOUND, "ไม่พบผู้ใช้งานที่ระบุ");

  await assertNotLastActiveAdmin(id);

  await userRepository.softDelete(id, requestUserId);

  auditService.log({
    userId: requestUserId,
    action: AuditAction.DELETE,
    module: USER_ENTITY,
    targetId: id,
    payload: { username: user.username },
  });

  return { success: true };
}
