import { prisma } from "@/plugins/prisma";
import type { PrismaTx } from "@/common/utils/prisma-tx";

export const sensorHeartbeatSignalRepository = {
  async write(
    input: {
      time: Date;
      poleId: number;
      signalDbm?: number;
      uptimeSec?: bigint;
      firmwareVersion?: string;
    },
    tx?: PrismaTx,
  ) {
    const client = tx ?? prisma;
    return client.sensorHeartbeatSignal.upsert({
      where: { time_poleId: { time: input.time, poleId: input.poleId } },
      update: {
        signalDbm: input.signalDbm,
        uptimeSec: input.uptimeSec,
        firmwareVersion: input.firmwareVersion,
      },
      create: {
        time: input.time,
        poleId: input.poleId,
        signalDbm: input.signalDbm,
        uptimeSec: input.uptimeSec,
        firmwareVersion: input.firmwareVersion,
      },
    });
  },

  async findHistory(params: { poleId: number; from: Date; to: Date; limit?: number }) {
    return prisma.sensorHeartbeatSignal.findMany({
      where: { poleId: params.poleId, time: { gte: params.from, lte: params.to } },
      orderBy: { time: "asc" },
      take: params.limit ?? 5000,
      select: { time: true, signalDbm: true, uptimeSec: true, firmwareVersion: true },
    });
  },
};
