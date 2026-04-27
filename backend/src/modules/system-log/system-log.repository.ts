import type { Prisma, SystemLogType } from "@prisma/client";
import { prisma } from "@/plugins/prisma";

const SYSTEM_LOG_LIST_SELECT = {
  id: true,
  logType: true,
  userId: true,
  usernameSnap: true,
  failReason: true,
  pageKey: true,
  ipAddress: true,
  userAgent: true,
  detail: true,
  createdAt: true,
} satisfies Prisma.SystemLogSelect;

export const systemLogRepository = {
  async findMany(params: {
    page: number;
    limit: number;
    logType?: SystemLogType;
    userId?: number;
    search?: string;
    from?: Date;
    to?: Date;
  }) {
    const where: Prisma.SystemLogWhereInput = {
      ...(params.logType && { logType: params.logType }),
      ...(params.userId !== undefined && { userId: params.userId }),
      ...(params.search && {
        OR: [
          { usernameSnap: { contains: params.search, mode: "insensitive" } },
          { ipAddress: { contains: params.search } },
        ],
      }),
      ...((params.from || params.to) && {
        createdAt: {
          ...(params.from && { gte: params.from }),
          ...(params.to && { lte: params.to }),
        },
      }),
    };

    const [data, total] = await prisma.$transaction([
      prisma.systemLog.findMany({
        where,
        select: SYSTEM_LOG_LIST_SELECT,
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.systemLog.count({ where }),
    ]);
    // Convert BigInt id → string for safe JSON
    return {
      data: data.map((row) => ({ ...row, id: row.id.toString() })),
      total,
    };
  },
};
