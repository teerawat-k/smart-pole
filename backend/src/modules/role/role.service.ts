import { prisma } from "@/plugins/prisma";
import { roleRepository } from "./role.repository";
import { auditService, AuditAction } from "@/modules/audit";
import {
  ConflictError,
  DuplicateError,
  ForbiddenError,
  NotFoundError,
} from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";
import { ROLE_ENTITY } from "./role.constants";
import { invalidatePermissionCache } from "@/common/middleware/rbac";
import type { RoleCreateInput, RoleUpdateInput, SetPermissionsInput } from "./role.schema";

export const roleService = {
  async list(params: { page: number; limit: number }) {
    return roleRepository.findMany(params);
  },

  async getById(id: number) {
    const role = await roleRepository.findById(id);
    if (!role) throw new NotFoundError(ErrorCode.ROLE_NOT_FOUND, "ไม่พบ Role ที่ระบุ");
    return role;
  },

  async lookup() {
    return roleRepository.findLookup();
  },

  async listPermissions() {
    return roleRepository.listPermissions();
  },

  async create(input: RoleCreateInput, userId: number) {
    const existing = await roleRepository.findByName(input.name);
    if (existing) throw new DuplicateError(ErrorCode.ROLE_DUPLICATE_NAME, "ชื่อ Role นี้มีอยู่แล้ว");

    const created = await prisma.$transaction(async (tx) => {
      const role = await roleRepository.create(
        { name: input.name, description: input.description, createdBy: userId },
        tx,
      );
      if (input.permissionIds.length > 0) {
        await roleRepository.setPermissions(role.id, input.permissionIds, tx);
      }
      return role;
    });

    auditService.log({
      userId,
      action: AuditAction.CREATE,
      module: ROLE_ENTITY,
      targetId: created.id,
      payload: { name: input.name, permissionCount: input.permissionIds.length },
    });

    return created;
  },

  async update(id: number, input: RoleUpdateInput, userId: number) {
    const role = await roleRepository.findById(id);
    if (!role) throw new NotFoundError(ErrorCode.ROLE_NOT_FOUND, "ไม่พบ Role ที่ระบุ");
    if (role.isSystem) throw new ForbiddenError(ErrorCode.ROLE_IS_SYSTEM, "ห้ามแก้ไข System Role");

    const updated = await roleRepository.update(id, { description: input.description, updatedBy: userId });

    auditService.log({
      userId,
      action: AuditAction.UPDATE,
      module: ROLE_ENTITY,
      targetId: id,
      payload: { before: { description: role.description }, after: { description: input.description } },
    });

    return updated;
  },

  async setPermissions(id: number, input: SetPermissionsInput, userId: number) {
    const role = await roleRepository.findById(id);
    if (!role) throw new NotFoundError(ErrorCode.ROLE_NOT_FOUND, "ไม่พบ Role ที่ระบุ");
    if (role.isSystem) throw new ForbiddenError(ErrorCode.ROLE_IS_SYSTEM, "ห้ามแก้ไข System Role");

    await roleRepository.setPermissions(id, input.permissionIds);
    invalidatePermissionCache(role.name);

    auditService.log({
      userId,
      action: AuditAction.UPDATE,
      module: ROLE_ENTITY,
      targetId: id,
      payload: { permissionIds: input.permissionIds },
    });

    return roleRepository.findById(id);
  },

  async delete(id: number, userId: number) {
    const role = await roleRepository.findById(id);
    if (!role) throw new NotFoundError(ErrorCode.ROLE_NOT_FOUND, "ไม่พบ Role ที่ระบุ");
    if (role.isSystem) throw new ForbiddenError(ErrorCode.ROLE_IS_SYSTEM, "ห้ามลบ System Role");

    const userCount = await roleRepository.countUsers(id);
    if (userCount > 0) {
      throw new ConflictError(ErrorCode.ROLE_HAS_USERS, `ลบ Role นี้ไม่ได้ — มีผู้ใช้งาน ${userCount} คนใช้อยู่`);
    }

    await roleRepository.softDelete(id, userId);
    invalidatePermissionCache(role.name);

    auditService.log({
      userId,
      action: AuditAction.DELETE,
      module: ROLE_ENTITY,
      targetId: id,
      payload: { name: role.name },
    });

    return { success: true };
  },
};
