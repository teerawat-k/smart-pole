// ── Atom: change user status (active/disabled) ─────────────
// Side effects: ตรวจ self / last admin → repo.setStatus → audit
import { userRepository } from "../user.repository";
import { auditService, AuditAction } from "@/modules/audit";
import { NotFoundError } from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";
import { USER_ENTITY } from "../user.constants";
import { assertNotSelf, assertNotLastActiveAdmin } from "../shared/guards";
import type { UserStatusInput } from "../user.schema";

export async function setUserStatus(id: number, input: UserStatusInput, requestUserId: number) {
  assertNotSelf(id, requestUserId);

  const user = await userRepository.findById(id);
  if (!user) throw new NotFoundError(ErrorCode.USER_NOT_FOUND, "ไม่พบผู้ใช้งานที่ระบุ");

  if (input.status === "disabled") {
    await assertNotLastActiveAdmin(id);
  }

  const updated = await userRepository.setStatus(id, input.status, requestUserId);

  auditService.log({
    userId: requestUserId,
    action: AuditAction.STATUS_CHANGE,
    module: USER_ENTITY,
    targetId: id,
    payload: { from: user.status, to: input.status },
  });

  return updated;
}
