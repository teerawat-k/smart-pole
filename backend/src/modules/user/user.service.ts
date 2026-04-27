import { userRepository } from "./user.repository";
import { auditService, AuditAction } from "@/modules/audit";
import {
  ConflictError,
  DuplicateError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";
import { hashPassword, verifyPassword } from "@/common/utils/password";
import { USER_ENTITY } from "./user.constants";
import type {
  UserCreateInput,
  UserUpdateInput,
  UserStatusInput,
  UserResetPasswordInput,
  UserMyProfileUpdateInput,
  UserChangePasswordInput,
} from "./user.schema";
import { prisma } from "@/plugins/prisma";

const ADMIN_ROLE_NAME = "admin";

async function ensureNotLastActiveAdmin(targetUserId: number): Promise<void> {
  const target = await userRepository.findById(targetUserId);
  if (!target || target.role.name !== ADMIN_ROLE_NAME) return;

  const adminRole = await prisma.role.findUnique({ where: { name: ADMIN_ROLE_NAME } });
  if (!adminRole) return;

  const activeAdmins = await userRepository.countActiveAdmins(adminRole.id);
  if (activeAdmins <= 1) {
    throw new ConflictError(ErrorCode.USER_LAST_ADMIN, "ต้องมี admin ที่ใช้งานได้อย่างน้อย 1 คน");
  }
}

export const userService = {
  async list(params: { page: number; limit: number; search?: string; roleId?: number; status?: "active" | "disabled" | "locked" }) {
    return userRepository.findMany(params);
  },

  async getById(id: number) {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError(ErrorCode.USER_NOT_FOUND, "ไม่พบผู้ใช้งานที่ระบุ");
    return user;
  },

  async lookup() {
    return userRepository.findLookup();
  },

  async create(input: UserCreateInput, requestUserId: number) {
    const existingUsername = await userRepository.findByUsername(input.username);
    if (existingUsername) {
      throw new DuplicateError(ErrorCode.USER_DUPLICATE_USERNAME, "ชื่อผู้ใช้นี้มีอยู่แล้ว");
    }
    const existingEmail = await userRepository.findByEmail(input.email);
    if (existingEmail) {
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
  },

  async update(id: number, input: UserUpdateInput, requestUserId: number) {
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
  },

  async setStatus(id: number, input: UserStatusInput, requestUserId: number) {
    if (id === requestUserId) {
      throw new ForbiddenError(ErrorCode.USER_CANNOT_DELETE_SELF, "ไม่สามารถปิดใช้งานบัญชีของตนเอง");
    }
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError(ErrorCode.USER_NOT_FOUND, "ไม่พบผู้ใช้งานที่ระบุ");

    if (input.status === "disabled") {
      await ensureNotLastActiveAdmin(id);
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
  },

  async unlock(id: number, requestUserId: number) {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError(ErrorCode.USER_NOT_FOUND, "ไม่พบผู้ใช้งานที่ระบุ");

    const updated = await userRepository.unlock(id, requestUserId);

    auditService.log({
      userId: requestUserId,
      action: AuditAction.UNLOCK,
      module: USER_ENTITY,
      targetId: id,
    });

    return updated;
  },

  async resetPassword(id: number, input: UserResetPasswordInput, requestUserId: number) {
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

    return { success: true };
  },

  async delete(id: number, requestUserId: number) {
    if (id === requestUserId) {
      throw new ForbiddenError(ErrorCode.USER_CANNOT_DELETE_SELF, "ไม่สามารถลบบัญชีของตนเอง");
    }
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError(ErrorCode.USER_NOT_FOUND, "ไม่พบผู้ใช้งานที่ระบุ");

    await ensureNotLastActiveAdmin(id);

    await userRepository.softDelete(id, requestUserId);

    auditService.log({
      userId: requestUserId,
      action: AuditAction.DELETE,
      module: USER_ENTITY,
      targetId: id,
      payload: { username: user.username },
    });

    return { success: true };
  },

  async getMyProfile(requestUserId: number) {
    return this.getById(requestUserId);
  },

  async updateMyProfile(input: UserMyProfileUpdateInput, requestUserId: number) {
    return this.update(requestUserId, input, requestUserId);
  },

  async changeMyPassword(input: UserChangePasswordInput, requestUserId: number) {
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
  },
};
