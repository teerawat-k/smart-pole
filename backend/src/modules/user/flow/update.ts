// ── Atom: update user (admin) ──────────────────────────────
import { userRepository } from "../user.repository";
import { auditService, AuditAction } from "@/modules/audit";
import { DuplicateError, NotFoundError } from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";
import { USER_ENTITY } from "../user.constants";
import type { UserUpdateInput } from "../user.schema";
import type { Prisma } from "@prisma/client";

export async function updateUser(id: number, input: UserUpdateInput, requestUserId: number) {
  const user = await userRepository.findById(id);
  if (!user) throw new NotFoundError(ErrorCode.USER_NOT_FOUND, "ไม่พบผู้ใช้งานที่ระบุ");

  if (input.email && input.email !== user.email) {
    const conflict = await userRepository.findByEmail(input.email);
    if (conflict && conflict.id !== id) {
      throw new DuplicateError(ErrorCode.USER_DUPLICATE_EMAIL, "อีเมลนี้มีอยู่แล้ว");
    }
  }

  const before: Record<string, Prisma.JsonValue> = {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    mobileNo: user.mobileNo ?? null,
    roleId: user.role.id,
  };

  const updated = await userRepository.update(id, { ...input, updatedBy: requestUserId });

  const afterKeys = Object.keys(before);
  const after: Record<string, Prisma.JsonValue> = Object.fromEntries(
    Object.entries(input)
      .filter(([k]) => afterKeys.includes(k))
      .map(([k, v]) => [k, v ?? null]),
  );

  auditService.log({
    userId: requestUserId,
    action: AuditAction.UPDATE,
    module: USER_ENTITY,
    targetId: id,
    before,
    after,
  });

  return updated;
}
