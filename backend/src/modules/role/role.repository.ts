import type { Prisma } from "@prisma/client";
import { prisma } from "@/plugins/prisma";
import type { PrismaTx } from "@/common/utils/prisma-tx";

const ROLE_LIST_SELECT = {
  id: true,
  name: true,
  description: true,
  isSystem: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { users: true, permissions: true } },
} satisfies Prisma.RoleSelect;

const ROLE_DETAIL_SELECT = {
  id: true,
  name: true,
  description: true,
  isSystem: true,
  createdAt: true,
  updatedAt: true,
  permissions: {
    select: {
      permission: {
        select: {
          id: true,
          module: true,
          action: true,
          moduleLabel: true,
          actionLabel: true,
        },
      },
    },
  },
  _count: { select: { users: true } },
} satisfies Prisma.RoleSelect;

const ROLE_LOOKUP_SELECT = {
  id: true,
  name: true,
  description: true,
  isSystem: true,
} satisfies Prisma.RoleSelect;

const PERMISSION_LIST_SELECT = {
  id: true,
  module: true,
  action: true,
  category: true,
  categoryLabel: true,
  moduleLabel: true,
  actionLabel: true,
  actionDescription: true,
} satisfies Prisma.PermissionSelect;

export const roleRepository = {
  async findMany(params: { page: number; limit: number }) {
    const where: Prisma.RoleWhereInput = { deletedAt: null };
    const [data, total] = await prisma.$transaction([
      prisma.role.findMany({
        where,
        select: ROLE_LIST_SELECT,
        orderBy: { id: "asc" },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.role.count({ where }),
    ]);
    return { data, total };
  },

  async findById(id: number) {
    return prisma.role.findFirst({
      where: { id, deletedAt: null },
      select: ROLE_DETAIL_SELECT,
    });
  },

  async findByName(name: string) {
    return prisma.role.findFirst({
      where: { name, deletedAt: null },
      select: { id: true, name: true, isSystem: true },
    });
  },

  async findLookup() {
    return prisma.role.findMany({
      where: { deletedAt: null },
      select: ROLE_LOOKUP_SELECT,
      orderBy: { name: "asc" },
    });
  },

  async listPermissions() {
    return prisma.permission.findMany({
      select: PERMISSION_LIST_SELECT,
      orderBy: [{ category: "asc" }, { module: "asc" }, { action: "asc" }],
    });
  },

  async create(data: { name: string; description?: string; createdBy: number }, tx?: PrismaTx) {
    const client = tx ?? prisma;
    return client.role.create({
      data: {
        name: data.name,
        description: data.description,
        createdBy: data.createdBy,
      },
      select: ROLE_DETAIL_SELECT,
    });
  },

  async update(id: number, data: { description?: string; updatedBy: number }, tx?: PrismaTx) {
    const client = tx ?? prisma;
    return client.role.update({
      where: { id },
      data: { description: data.description, updatedBy: data.updatedBy },
      select: ROLE_DETAIL_SELECT,
    });
  },

  async softDelete(id: number, deletedBy: number, tx?: PrismaTx) {
    const client = tx ?? prisma;
    return client.role.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy },
    });
  },

  async setPermissions(roleId: number, permissionIds: number[], tx?: PrismaTx) {
    const client = tx ?? prisma;
    // delete + recreate ใน transaction (ถ้า tx ส่งมา ใช้ tx; ถ้าไม่ ใช้ prisma.$transaction)
    if (tx) {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
        });
      }
      return;
    }
    await prisma.$transaction(async (txInner) => {
      await txInner.rolePermission.deleteMany({ where: { roleId } });
      if (permissionIds.length > 0) {
        await txInner.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
        });
      }
    });
  },

  async countUsers(roleId: number): Promise<number> {
    return prisma.user.count({ where: { roleId, deletedAt: null } });
  },
};
