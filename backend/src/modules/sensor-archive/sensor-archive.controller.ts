import { Elysia, t } from "elysia";
import { sensorArchiveService } from "./sensor-archive.service";

export const sensorArchiveController = new Elysia()
  .get(
    "/api/poles/:id/sensors/latest",
    async ({ params }) => {
      const data = await sensorArchiveService.latestForPole(params.id);
      return { success: true, data };
    },
    { params: t.Object({ id: t.Numeric({ minimum: 1 }) }) },
  )
  .get(
    "/api/poles/:id/sensors/history",
    async ({ params, query }) => {
      const result = await sensorArchiveService.list({
        poleId:    params.id,
        page:      query.page,
        limit:     query.limit,
        from:      query.from !== undefined ? BigInt(query.from) : undefined,
        to:        query.to   !== undefined ? BigInt(query.to)   : undefined,
        sortBy:    query.sortBy,
        sortOrder: query.sortOrder,
      });
      return {
        success: true,
        data:    result.data,
        total:   result.total,
        page:    query.page,
        limit:   query.limit,
      };
    },
    {
      params: t.Object({ id: t.Numeric({ minimum: 1 }) }),
      query: t.Object({
        page:      t.Numeric({ default: 1, minimum: 1 }),
        limit:     t.Numeric({ default: 20, minimum: 1, maximum: 100 }),
        from:      t.Optional(t.Numeric({ minimum: 0 })),
        to:        t.Optional(t.Numeric({ minimum: 0 })),
        sortBy:    t.Optional(t.String({ maxLength: 64 })),
        sortOrder: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
      }),
    },
  );
