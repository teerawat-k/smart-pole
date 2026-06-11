import { Elysia, t } from "elysia";
import { alertService } from "./alert.service";
import { alertListQuery, alertResolveSchema } from "./alert.schema";
import { authGuard } from "@/plugins/jwt";

// Alert frontend UI removed (commit 9e40888) — backend ยังทำงาน + frontend ฟื้นกลับได้
// ตอนนี้ auth-only (no permission seed สำหรับ alert) — ถ้าฟื้นกลับให้เพิ่ม alert:view + alert:resolve
export const alertController = new Elysia({ prefix: "/api/alerts" })
  .use(authGuard)
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
    async ({ params, body, user }) => {
      await alertService.resolve(params.id, user.id, body.note);
      return { success: true, message: "Resolve alert สำเร็จ" };
    },
    { params: t.Object({ id: t.Numeric({ minimum: 1 }) }), body: alertResolveSchema },
  );
