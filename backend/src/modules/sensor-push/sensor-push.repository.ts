// ── Sensor Push repository — Prisma queries เท่านั้น ───────
import { prisma } from "@/plugins/prisma";
import type { PushState } from "@prisma/client";

const POLE_PUSH_SELECT = {
  id: true,
  poleName: true,
  latestSeq: true,
  latestReadingAt: true,
  latestPm25: true,
  latestTemperature: true,
  latestHumidity: true,
} as const;

export interface PolePushRow {
  id: number;
  poleName: string;
  latestSeq: bigint | null;
  latestReadingAt: bigint | null;
  latestPm25: import("@prisma/client").Prisma.Decimal | null;
  latestTemperature: import("@prisma/client").Prisma.Decimal | null;
  latestHumidity: import("@prisma/client").Prisma.Decimal | null;
}

/** อัปเดต state — รับ number (epoch ms) แปลงเป็น BigInt ที่ boundary */
export interface StateUpdate {
  anchorAt?: number | null;
  nextPushAt?: number | null;
  lastPushedSeq?: number | null;
  lastPushedAt?: number | null;
  circuitState?: string;
  circuitFailCount?: number;
  circuitOpenedAt?: number | null;
}

const toBig = (v: number | null | undefined): bigint | null | undefined =>
  v === undefined ? undefined : v === null ? null : BigInt(Math.trunc(v));

export const sensorPushRepository = {
  findActivePoles(): Promise<PolePushRow[]> {
    return prisma.pole.findMany({
      where: { deletedAt: null },
      select: POLE_PUSH_SELECT,
      orderBy: { id: "asc" },
    });
  },

  getOrCreateState(poleId: number, receiverKey: string): Promise<PushState> {
    return prisma.pushState.upsert({
      where: { poleId_receiverKey: { poleId, receiverKey } },
      update: {},
      create: { poleId, receiverKey },
    });
  },

  async saveState(id: number, data: StateUpdate): Promise<void> {
    await prisma.pushState.update({
      where: { id },
      data: {
        anchorAt: toBig(data.anchorAt),
        nextPushAt: toBig(data.nextPushAt),
        lastPushedSeq: toBig(data.lastPushedSeq),
        lastPushedAt: toBig(data.lastPushedAt),
        circuitState: data.circuitState,
        circuitFailCount: data.circuitFailCount,
        circuitOpenedAt: toBig(data.circuitOpenedAt),
      },
    });
  },

  findStates(): Promise<PushState[]> {
    return prisma.pushState.findMany({ orderBy: { poleId: "asc" } });
  },
};
