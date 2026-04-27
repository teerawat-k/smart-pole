import { Elysia, t } from "elysia";
import { alertService } from "./alert.service";
import { alertListQuery, alertResolveSchema } from "./alert.schema";

function getUserId(headers: Record<string, string | undefined>): number {
  const raw = headers["x-user-id"];
  return raw ? Number(raw) : 1;
}

export const alertController = new Elysia({ prefix: "/api/alerts" })
  .get(
    "/",
    async ({ query }) => {
      const result = await alertService.list({
        page: query.page,
        limit: query.limit,
        poleId: query.poleId,
        severity: query.severity,
        alertType: query.alertType,
        isResolved: query.isResolved,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
      });
      return { success: true, ...result, page: query.page, limit: query.limit };
    },
    { query: alertListQuery },
  )
  .post(
    "/:id/resolve",
    async ({ params, body, headers }) => {
      await alertService.resolve(params.id, getUserId(headers), body.note);
      return { success: true, message: "Resolve alert สำเร็จ" };
    },
    { params: t.Object({ id: t.Numeric({ minimum: 1 }) }), body: alertResolveSchema },
  );
