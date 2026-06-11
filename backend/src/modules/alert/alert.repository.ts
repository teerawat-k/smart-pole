import type { Prisma, AlertSeverity } from "@prisma/client";
import { prisma } from "@/plugins/prisma";
import type { PrismaTx } from "@/common/utils/prisma-tx";

const ALERT_LIST_SELECT = {
  id: true,
  poleId: true,
  alertType: true,
  severity: true,
  message: true,
  value: true,
  threshold: true,
  isResolved: true,
  resolvedAt: true,
  resolvedById: true,
  triggeredAt: true,
} satisfies Prisma.AlertSelect;

export const alertRepository = {
  async findMany(params: {
    page: number;
    limit: number;
    poleId?: number;
    severity?: AlertSeverity;
    alertType?: string;
    isResolved?: boolean;
    from?: Date;
    to?: Date;
  }) {
    const where: Prisma.AlertWhereInput = {
      ...(params.poleId && { poleId: params.poleId }),
      ...(params.severity && { severity: params.severity }),
      ...(params.alertType && { alertType: params.alertType }),
      ...(params.isResolved !== undefined && { isResolved: params.isResolved }),
      ...((params.from || params.to) && {
        triggeredAt: {
          ...(params.from && { gte: params.from }),
          ...(params.to && { lte: params.to }),
        },
      }),
    };
    const [data, total] = await prisma.$transaction([
      prisma.alert.findMany({
        where,
        select: ALERT_LIST_SELECT,
        orderBy: { triggeredAt: "desc" },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.alert.count({ where }),
    ]);
    return { data, total };
  },

  async findOpenSimilar(poleId: number, alertType: string, sinceMs: number) {
    const cutoff = new Date(Date.now() - sinceMs);
    return prisma.alert.findFirst({
      where: { poleId, alertType, isResolved: false, triggeredAt: { gte: cutoff } },
      select: { id: true, value: true },
    });
  },

  async create(
    data: {
      poleId: number;
      alertType: string;
      severity: AlertSeverity;
      message: string;
      value?: number;
      threshold?: number;
      triggeredAt?: Date;
    },
    tx?: PrismaTx,
  ) {
    const client = tx ?? prisma;
    return client.alert.create({
      data: {
        poleId: data.poleId,
        alertType: data.alertType,
        severity: data.severity,
        message: data.message,
        value: data.value,
        threshold: data.threshold,
        triggeredAt: data.triggeredAt,
      },
      select: ALERT_LIST_SELECT,
    });
  },

  async resolve(id: number, resolvedById: number | null, note?: string, tx?: PrismaTx) {
    const client = tx ?? prisma;
    return client.alert.update({
      where: { id },
      data: { isResolved: true, resolvedAt: new Date(), resolvedById, resolvedNote: note },
      select: ALERT_LIST_SELECT,
    });
  },

  async findOpenForPole(poleId: number, alertType: string) {
    return prisma.alert.findFirst({
      where: { poleId, alertType, isResolved: false },
      select: { id: true },
    });
  },
};
