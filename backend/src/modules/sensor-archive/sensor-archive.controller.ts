import { Elysia, t } from "elysia";
import { sensorArchiveService } from "./sensor-archive.service";

export const sensorArchiveController = new Elysia()
  .get("/api/sensor-types", async () => {
    const data = await sensorArchiveService.listSensorTypes();
    return { success: true, data };
  })
  .get(
    "/api/poles/:id/sensors/latest",
    async ({ params }) => {
      const data = await sensorArchiveService.latestForPole(params.id);
      return { success: true, data };
    },
    { params: t.Object({ id: t.Numeric({ minimum: 1 }) }) },
  )
  .get(
    "/api/poles/:id/sensors/:sensorKey/history",
    async ({ params, query }) => {
      const data = await sensorArchiveService.history(params.sensorKey, {
        poleId: params.id,
        from: new Date(query.from),
        to: new Date(query.to),
        limit: query.limit,
      });
      return {
        success: true,
        data,
        total: data.length,
        sensorKey: params.sensorKey,
        poleId: params.id,
      };
    },
    {
      params: t.Object({
        id: t.Numeric({ minimum: 1 }),
        sensorKey: t.String({ minLength: 1, maxLength: 64 }),
      }),
      query: t.Object({
        from: t.String({ format: "date-time" }),
        to: t.String({ format: "date-time" }),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 50000 })),
      }),
    },
  );
