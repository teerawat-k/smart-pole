import type { Prisma } from "@prisma/client";
import { prisma } from "@/plugins/prisma";

const RECORDING_LIST_SELECT = {
  id: true,
  poleId: true,
  filename: true,
  recordedDate: true,
  startTime: true,
  endTime: true,
  durationSec: true,
  fileSizeBytes: true,
  createdAt: true,
} satisfies Prisma.VideoRecordingSelect;

const RECORDING_DETAIL_SELECT = {
  ...RECORDING_LIST_SELECT,
  storagePath: true,
} satisfies Prisma.VideoRecordingSelect;

export const recordingRepository = {
  async findMany(params: {
    page: number;
    limit: number;
    poleId?: number;
    date?: Date;
    minDuration?: number;
  }) {
    const where: Prisma.VideoRecordingWhereInput = {
      deletedAt: null,
      ...(params.poleId && { poleId: params.poleId }),
      ...(params.date && {
        recordedDate: params.date,
      }),
      ...(params.minDuration !== undefined && { durationSec: { gte: params.minDuration } }),
    };

    const [data, total] = await prisma.$transaction([
      prisma.videoRecording.findMany({
        where,
        select: RECORDING_LIST_SELECT,
        orderBy: [{ recordedDate: "desc" }, { startTime: "desc" }],
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.videoRecording.count({ where }),
    ]);
    return { data, total };
  },

  async findById(id: bigint) {
    return prisma.videoRecording.findFirst({
      where: { id, deletedAt: null },
      select: RECORDING_DETAIL_SELECT,
    });
  },

  async findByFilename(filename: string) {
    return prisma.videoRecording.findUnique({
      where: { filename },
      select: { id: true, deletedAt: true },
    });
  },

  async create(data: {
    poleId: number;
    filename: string;
    storagePath: string;
    recordedDate: Date;
    startTime: Date;
    endTime: Date;
    durationSec: number;
    fileSizeBytes?: number;
  }) {
    return prisma.videoRecording.create({
      data: {
        poleId: data.poleId,
        filename: data.filename,
        storagePath: data.storagePath,
        recordedDate: data.recordedDate,
        startTime: data.startTime,
        endTime: data.endTime,
        durationSec: data.durationSec,
        fileSizeBytes: data.fileSizeBytes !== undefined ? BigInt(data.fileSizeBytes) : undefined,
      },
      select: RECORDING_DETAIL_SELECT,
    });
  },

  async softDelete(id: bigint, deletedBy: number) {
    return prisma.videoRecording.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy },
    });
  },
};
