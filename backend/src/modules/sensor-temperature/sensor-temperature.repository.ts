import type { Prisma } from "@prisma/client";
import { prisma } from "@/plugins/prisma";
import type { PrismaTx } from "@/common/utils/prisma-tx";

export const sensorTemperatureRepository = {
  async write(
    input: { time: Date; poleId: number; seq: bigint; temperature: number; unit?: string; rawJson?: unknown },
    tx?: PrismaTx,
  ) {
    const client = tx ?? prisma;
    return client.sensorTemperature.upsert({
      where: { time_poleId: { time: input.time, poleId: input.poleId } },
      update: { seq: input.seq, temperature: input.temperature, unit: input.unit ?? "celsius", rawJson: input.rawJson as Prisma.InputJsonValue },
      create: {
        time: input.time,
        poleId: input.poleId,
        seq: input.seq,
        temperature: input.temperature,
        unit: input.unit ?? "celsius",
        rawJson: input.rawJson as Prisma.InputJsonValue,
      },
    });
  },

  async findLatest(poleId: number) {
    return prisma.sensorTemperature.findFirst({
      where: { poleId },
      orderBy: { time: "desc" },
      select: { time: true, temperature: true, unit: true },
    });
  },

  async findHistory(params: { poleId: number; from: Date; to: Date; limit?: number }) {
    return prisma.sensorTemperature.findMany({
      where: { poleId: params.poleId, time: { gte: params.from, lte: params.to } },
      orderBy: { time: "asc" },
      take: params.limit ?? 5000,
      select: { time: true, temperature: true, unit: true },
    });
  },
};
