// ── User service orchestrator ──────────────────────────────
// ทุก mutation delegate ไป flow/ — service เป็น facade เท่านั้น
// read-only thin methods inline ได้ (≤ 3 บรรทัด passthrough)

import { userRepository } from "./user.repository";
import { NotFoundError } from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";
import { createUser } from "./flow/create";
import { updateUser } from "./flow/update";
import { setUserStatus } from "./flow/set-status";
import { unlockUser } from "./flow/unlock";
import { resetUserPassword } from "./flow/reset-password";
import { softDeleteUser } from "./flow/soft-delete";
import { changeMyPassword } from "./flow/change-password";
import type {
  UserCreateInput,
  UserUpdateInput,
  UserStatusInput,
  UserResetPasswordInput,
  UserMyProfileUpdateInput,
  UserChangePasswordInput,
} from "./user.schema";

async function getById(id: number) {
  const user = await userRepository.findById(id);
  if (!user) throw new NotFoundError(ErrorCode.USER_NOT_FOUND, "ไม่พบผู้ใช้งานที่ระบุ");
  return user;
}

export const userService = {
  // ── reads ──
  list: (params: { page: number; limit: number; search?: string; roleId?: number; status?: "active" | "disabled" | "locked" }) =>
    userRepository.findMany(params),
  getById,
  lookup: () => userRepository.findLookup(),

  // ── mutations (delegate to atoms) ──
  create: (input: UserCreateInput, requestUserId: number) => createUser(input, requestUserId),
  update: (id: number, input: UserUpdateInput, requestUserId: number) => updateUser(id, input, requestUserId),
  setStatus: (id: number, input: UserStatusInput, requestUserId: number) => setUserStatus(id, input, requestUserId),
  unlock: (id: number, requestUserId: number) => unlockUser(id, requestUserId),
  resetPassword: (id: number, input: UserResetPasswordInput, requestUserId: number) =>
    resetUserPassword(id, input, requestUserId),
  delete: (id: number, requestUserId: number) => softDeleteUser(id, requestUserId),

  // ── self ──
  getMyProfile: (requestUserId: number) => getById(requestUserId),
  updateMyProfile: (input: UserMyProfileUpdateInput, requestUserId: number) =>
    updateUser(requestUserId, input, requestUserId),
  changeMyPassword: (input: UserChangePasswordInput, requestUserId: number) =>
    changeMyPassword(input, requestUserId),
};
