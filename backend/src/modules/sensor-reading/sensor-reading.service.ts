import { Prisma } from "@prisma/client";
import { sensorReadingRepository } from "./sensor-reading.repository";
import { SENSOR_FRESHNESS_MS } from "./sensor-reading.constants";

const SORT_WHITELIST = ["time", "seq", "pm25", "temperature", "humidity", "ingestedAt"] as const;
type SortColumn = (typeof SORT_WHITELIST)[number];

interface ListParams {
  poleId:     number;
  page:       number;
  limit:      number;
  from?:      bigint;
  to?:        bigint;
  sortBy?:    string;
  sortOrder?: "asc" | "desc";
}

export interface SensorLatestResult {
  latestSeq:         bigint | null;
  latestPm25:        Prisma.Decimal | null;
  latestTemperature: Prisma.Decimal | null;
  latestHumidity:    Prisma.Decimal | null;
  latestReadingAt:   bigint | null;
  sensorFresh:       boolean; // false = ค่าเก่าเกิน freshness → metric เป็น null (sensor ไม่ทำงาน)
}

export const sensorReadingService = {
  // Freshness gate: ถ้าค่าล่าสุดเก่ากว่า SENSOR_FRESHNESS_MS → คืน metric เป็น null
  // ป้องกัน dashboard โชว์ "ค่าผี" ที่ค้าง (sensor ตายแต่ Pole.latest* ยังค้างค่าเดิม)
  async findLatest(poleId: number): Promise<SensorLatestResult> {
    const raw = await sensorReadingRepository.findLatest(poleId);
    const readingAt = raw?.latestReadingAt ?? null;
    const fresh = readingAt !== null && Date.now() - Number(readingAt) <= SENSOR_FRESHNESS_MS;
    return {
      latestReadingAt:   readingAt,
      latestSeq:         raw?.latestSeq ?? null,
      latestPm25:        fresh ? (raw?.latestPm25 ?? null) : null,
      latestTemperature: fresh ? (raw?.latestTemperature ?? null) : null,
      latestHumidity:    fresh ? (raw?.latestHumidity ?? null) : null,
      sensorFresh:       fresh,
    };
  },

  list(params: ListParams) {
    const sortBy = SORT_WHITELIST.includes(params.sortBy as SortColumn)
      ? (params.sortBy as SortColumn)
      : undefined;
    return sensorReadingRepository.list({
      poleId:    params.poleId,
      page:      params.page,
      limit:     params.limit,
      from:      params.from,
      to:        params.to,
      sortBy,
      sortOrder: params.sortOrder,
    });
  },
};
