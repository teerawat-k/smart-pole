import { sensorReadingService } from "@/modules/sensor-reading";
import { prisma } from "@/plugins/prisma";
import { NotFoundError } from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";

interface ListParams {
  poleId:     number;
  page:       number;
  limit:      number;
  from?:      bigint;
  to?:        bigint;
  sortBy?:    string;
  sortOrder?: "asc" | "desc";
}

export const sensorArchiveService = {
  async latestForPole(poleId: number) {
    const pole = await prisma.pole.findFirst({ where: { id: poleId, deletedAt: null }, select: { id: true } });
    if (!pole) throw new NotFoundError(ErrorCode.POLE_NOT_FOUND, "ไม่พบเสาที่ระบุ");
    return sensorReadingService.findLatest(poleId);
  },

  async list(params: ListParams) {
    const pole = await prisma.pole.findFirst({ where: { id: params.poleId, deletedAt: null }, select: { id: true } });
    if (!pole) throw new NotFoundError(ErrorCode.POLE_NOT_FOUND, "ไม่พบเสาที่ระบุ");
    return sensorReadingService.list(params);
  },
};
