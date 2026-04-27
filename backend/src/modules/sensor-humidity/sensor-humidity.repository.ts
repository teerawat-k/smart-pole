import type { Prisma } from "@prisma/client";
import { prisma } from "@/plugins/prisma";
import type { PrismaTx } from "@/common/utils/prisma-tx";

export const sensorHumidityRepository = {
  async write(
    input: { time: Date; poleId: number; seq: bigint; humidity: number; rawJson?: unknown },
    tx?: PrismaTx,
  ) {
    const client = tx ?? prisma;
    return client.sensorHumidity.upsert({
      where: { time_poleId: { time: input.time, poleId: input.poleId } },
      update: { seq: input.seq, humidity: input.humidity, rawJson: input.rawJson as Prisma.InputJsonValue },
      create: {
        time: input.time,
        poleId: input.poleId,
        seq: input.seq,
        humidity: input.humidity,
        rawJson: input.rawJson as Prisma.InputJsonValue,
      },
    });
  },

  async findLatest(poleId: number) {
    return prisma.sensorHumidity.findFirst({
      where: { poleId },
      orderBy: { time: "desc" },
      select: { time: true, humidity: true },
    });
  },

  async findHistory(params: { poleId: number; from: Date; to: Date; limit?: number }) {
    return prisma.sensorHumidity.findMany({
      where: { poleId: params.poleId, time: { gte: params.from, lte: params.to } },
      orderBy: { time: "asc" },
      take: params.limit ?? 5000,
      select: { time: true, humidity: true },
    });
  },
};
