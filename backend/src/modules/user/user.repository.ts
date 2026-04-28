import type { Prisma, UserStatus } from "@prisma/client";
import { prisma } from "@/plugins/prisma";
import type { PrismaTx } from "@/common/utils/prisma-tx";

const USER_LIST_SELECT = {
  id: true,
  username: true,
  email: true,
  firstName: true,
  lastName: true,
  mobileNo: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  role: { select: { id: true, name: true, description: true } },
} satisfies Prisma.UserSelect;

const USER_DETAIL_SELECT = {
  id: true,
  username: true,
  email: true,
  firstName: true,
  lastName: true,
  mobileNo: true,
  status: true,
  loginFailCount: true,
  lockedUntil: true,
  lockedReason: true,
  lastLoginAt: true,
  passwordChangedAt: true,
  createdAt: true,
  updatedAt: true,
  role: {
    select: {
      id: true,
      name: true,
      description: true,
      isSystem: true,
      permissions: {
        select: {
          permission: { select: { module: true, action: true } },
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

const USER_LOOKUP_SELECT = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
} satisfies Prisma.UserSelect;

export const userRepository = {
  async findMany(params: {
    page: number;
    limit: number;
    search?: string;
    roleId?: number;
    status?: UserStatus;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) {
    const SORT_WHITELIST: Record<string, keyof Prisma.UserOrderByWithRelationInput> = {
      username: "username",
      firstName: "firstName",
      email: "email",
      status: "status",
      lastLoginAt: "lastLoginAt",
      createdAt: "createdAt",
    };
    const orderByKey = (params.sortBy && SORT_WHITELIST[params.sortBy]) ?? "createdAt";
    const orderBy: Prisma.UserOrderByWithRelationInput = { [orderByKey]: params.sortOrder ?? "desc" };

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(params.roleId && { roleId: params.roleId }),
      ...(params.status && { status: params.status }),
      ...(params.search && {
        OR: [
          { username: { contains: params.search, mode: "insensitive" } },
          { email: { contains: params.search, mode: "insensitive" } },
          { firstName: { contains: params.search, mode: "insensitive" } },
          { lastName: { contains: params.search, mode: "insensitive" } },
        ],
      }),
    };

    const [data, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: USER_LIST_SELECT,
        orderBy,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.user.count({ where }),
    ]);
    return { data, total };
  },

  async findById(id: number) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: USER_DETAIL_SELECT,
    });
  },

  async findByUsername(username: string) {
    return prisma.user.findFirst({
      where: { username, deletedAt: null },
      include: { role: { select: { id: true, name: true, isSystem: true } } },
    });
  },

  async findByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: { id: true, email: true },
    });
  },

  async findLookup() {
    return prisma.user.findMany({
      where: { deletedAt: null, status: "active" },
      select: USER_LOOKUP_SELECT,
      orderBy: { username: "asc" },
    });
  },

  async create(
    data: {
      username: string;
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      mobileNo?: string;
      roleId: number;
      createdBy: number;
    },
    tx?: PrismaTx,
  ) {
    const client = tx ?? prisma;
    return client.user.create({
      data: {
        username: data.username,
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        mobileNo: data.mobileNo,
        roleId: data.roleId,
        status: "active",
        createdBy: data.createdBy,
      },
      select: USER_DETAIL_SELECT,
    });
  },

  async update(
    id: number,
    data: Partial<{
      email: string;
      firstName: string;
      lastName: string;
      mobileNo: string;
      roleId: number;
      updatedBy: number;
    }>,
    tx?: PrismaTx,
  ) {
    const client = tx ?? prisma;
    return client.user.update({
      where: { id },
      data,
      select: USER_DETAIL_SELECT,
    });
  },

  async updatePassword(id: number, passwordHash: string, updatedBy: number, tx?: PrismaTx) {
    const client = tx ?? prisma;
    return client.user.update({
      where: { id },
      data: {
        password: passwordHash,
        passwordChangedAt: new Date(),
        tokenVersion: { increment: 1 }, // force logout-all
        updatedBy,
      },
      select: { id: true, tokenVersion: true },
    });
  },

  async setStatus(id: number, status: UserStatus, updatedBy: number, tx?: PrismaTx) {
    const client = tx ?? prisma;
    const data: Prisma.UserUncheckedUpdateInput = { status, updatedBy };
    if (status === "active") {
      data.loginFailCount = 0;
      data.lockedUntil = null;
      data.lockedReason = null;
    }
    return client.user.update({ where: { id }, data, select: USER_DETAIL_SELECT });
  },

  async unlock(id: number, updatedBy: number, tx?: PrismaTx) {
    const client = tx ?? prisma;
    return client.user.update({
      where: { id },
      data: {
        loginFailCount: 0,
        lockedUntil: null,
        lockedReason: null,
        status: "active",
        updatedBy,
      },
      select: USER_DETAIL_SELECT,
    });
  },

  async softDelete(id: number, deletedBy: number, tx?: PrismaTx) {
    const client = tx ?? prisma;
    return client.user.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy },
    });
  },

  async countActiveAdmins(roleId: number): Promise<number> {
    return prisma.user.count({
      where: { roleId, deletedAt: null, status: "active" },
    });
  },
};
