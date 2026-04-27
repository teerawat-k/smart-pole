// ── Atom: create user ─────────────────────────────────────
// Steps: check duplicate username/email → hash password → repo.create → audit
import { userRepository } from "../user.repository";
import { auditService, AuditAction } from "@/modules/audit";
import { DuplicateError } from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";
import { hashPassword } from "@/common/utils/password";
import { USER_ENTITY } from "../user.constants";
import type { UserCreateInput } from "../user.schema";

export async function createUser(input: UserCreateInput, requestUserId: number) {
  if (await userRepository.findByUsername(input.username)) {
    throw new DuplicateError(ErrorCode.USER_DUPLICATE_USERNAME, "ชื่อผู้ใช้นี้มีอยู่แล้ว");
  }
  if (await userRepository.findByEmail(input.email)) {
    throw new DuplicateError(ErrorCode.USER_DUPLICATE_EMAIL, "อีเมลนี้มีอยู่แล้ว");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await userRepository.create({
    username: input.username,
    email: input.email,
    password: passwordHash,
    firstName: input.firstName,
    lastName: input.lastName,
    mobileNo: input.mobileNo,
    roleId: input.roleId,
    createdBy: requestUserId,
  });

  auditService.log({
    userId: requestUserId,
    action: AuditAction.CREATE,
    module: USER_ENTITY,
    targetId: user.id,
    payload: { username: user.username, email: user.email, roleId: input.roleId },
  });

  return user;
}
