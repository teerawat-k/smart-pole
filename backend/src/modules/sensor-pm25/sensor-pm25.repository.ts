import type { Prisma } from "@prisma/client";
import { prisma } from "@/plugins/prisma";
import type { PrismaTx } from "@/common/utils/prisma-tx";

export const sensorPm25Repository = {
  async write(
    input: {
      time: Date;
      poleId: number;
      seq: bigint;
      pm25: number;
      pm10?: number;
      aqi?: number;
      rawJson?: unknown;
    },
    tx?: PrismaTx,
  ) {
    const client = tx ?? prisma;
    return client.sensorPm25.upsert({
      where: { time_poleId: { time: input.time, poleId: input.poleId } },
      update: {
        seq: input.seq,
        pm25: input.pm25,
        pm10: input.pm10,
        aqi: input.aqi,
        rawJson: input.rawJson as Prisma.InputJsonValue,
      },
      create: {
        time: input.time,
        poleId: input.poleId,
        seq: input.seq,
        pm25: input.pm25,
        pm10: input.pm10,
        aqi: input.aqi,
        rawJson: input.rawJson as Prisma.InputJsonValue,
      },
    });
  },

  async findLatest(poleId: number) {
    return prisma.sensorPm25.findFirst({
      where: { poleId },
      orderBy: { time: "desc" },
      select: { time: true, pm25: true, pm10: true, aqi: true },
    });
  },

  async findHistory(params: { poleId: number; from: Date; to: Date; limit?: number }) {
    return prisma.sensorPm25.findMany({
      where: { poleId: params.poleId, time: { gte: params.from, lte: params.to } },
      orderBy: { time: "asc" },
      take: params.limit ?? 5000,
      select: { time: true, pm25: true, pm10: true, aqi: true },
    });
  },
};
