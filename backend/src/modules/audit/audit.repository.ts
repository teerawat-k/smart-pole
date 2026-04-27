import type { Prisma } from "@prisma/client";
import { prisma } from "@/plugins/prisma";

export interface CreateAuditLogInput {
  userId: number;
  action: string;
  module: string;
  targetId: number;
  payload?: unknown;
}

export interface ListAuditLogParams {
  page: number;
  limit: number;
  module?: string;
  action?: string;
  userId?: number;
  targetId?: number;
  from?: Date;
  to?: Date;
}

const AUDIT_LIST_SELECT = {
  id: true,
  userId: true,
  action: true,
  module: true,
  targetId: true,
  payload: true,
  createdAt: true,
} satisfies Prisma.AuditLogSelect;

export const auditRepository = {
  async create(data: CreateAuditLogInput): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        module: data.module,
        targetId: data.targetId,
        ...(data.payload !== undefined ? { payload: data.payload as object } : {}),
      },
    });
  },

  async findMany(params: ListAuditLogParams) {
    const where: Prisma.AuditLogWhereInput = {
      ...(params.module && { module: params.module }),
      ...(params.action && { action: params.action }),
      ...(params.userId !== undefined && { userId: params.userId }),
      ...(params.targetId !== undefined && { targetId: params.targetId }),
      ...((params.from || params.to) && {
        createdAt: {
          ...(params.from && { gte: params.from }),
          ...(params.to && { lte: params.to }),
        },
      }),
    };

    const [data, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        select: AUDIT_LIST_SELECT,
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { data, total };
  },
};
