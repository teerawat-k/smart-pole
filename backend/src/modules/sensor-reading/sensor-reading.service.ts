import { sensorReadingRepository } from "./sensor-reading.repository";

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

export const sensorReadingService = {
  findLatest(poleId: number) {
    return sensorReadingRepository.findLatest(poleId);
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
