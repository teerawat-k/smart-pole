import { prisma } from "@/plugins/prisma";

type SortColumn = "time" | "seq" | "pm25" | "temperature" | "humidity" | "ingestedAt";

interface ListParams {
  poleId:    number;
  page:      number;
  limit:     number;
  from?:     bigint;
  to?:       bigint;
  sortBy?:   SortColumn;
  sortOrder?: "asc" | "desc";
}

const SENSOR_READING_SELECT = {
  id:          true,
  time:        true,
  seq:         true,
  pm25:        true,
  temperature: true,
  humidity:    true,
  ingestedAt:  true,
} as const;

const LATEST_SELECT = {
  latestSeq:         true,
  latestPm25:        true,
  latestTemperature: true,
  latestHumidity:    true,
  latestReadingAt:   true,
} as const;

export const sensorReadingRepository = {
  findLatest(poleId: number) {
    return prisma.pole.findUnique({
      where: { id: poleId },
      select: LATEST_SELECT,
    });
  },

  async list(params: ListParams) {
    const where = {
      poleId: params.poleId,
      ...((params.from !== undefined || params.to !== undefined) && {
        time: {
          ...(params.from !== undefined && { gte: params.from }),
          ...(params.to   !== undefined && { lte: params.to }),
        },
      }),
    };

    const orderBy = { [params.sortBy ?? "seq"]: params.sortOrder ?? "desc" };

    const [data, total] = await prisma.$transaction([
      prisma.sensorReading.findMany({
        where,
        select: SENSOR_READING_SELECT,
        orderBy,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.sensorReading.count({ where }),
    ]);

    return { data, total };
  },
};
