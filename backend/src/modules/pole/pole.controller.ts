import { Elysia, t } from "elysia";
import { poleService } from "./pole.service";
import {
  poleListQuery,
  poleCreateSchema,
  poleUpdateSchema,
  poleMaintenanceSchema,
} from "./pole.schema";

// TODO: wrap ด้วย authGuard + requirePermission
function getUserId(headers: Record<string, string | undefined>): number {
  const raw = headers["x-user-id"];
  return raw ? Number(raw) : 1;
}

export const poleController = new Elysia({ prefix: "/api/poles" })
  .get(
    "/",
    async ({ query }) => {
      const result = await poleService.list({
        page: query.page,
        limit: query.limit,
        search: query.search,
        poleStatus: query.poleStatus,
        hasCamera: query.hasCamera,
      });
      return { success: true, ...result, page: query.page, limit: query.limit };
    },
    { query: poleListQuery },
  )
  .get("/lookup", async () => {
    const data = await poleService.lookup();
    return { success: true, data };
  })
  .get(
    "/:id",
    async ({ params }) => {
      const data = await poleService.getById(params.id);
      return { success: true, data };
    },
    { params: t.Object({ id: t.Numeric({ minimum: 1 }) }) },
  )
  .post(
    "/",
    async ({ body, headers }) => {
      const data = await poleService.create(body, getUserId(headers));
      return { success: true, data, message: "สร้างเสาสำเร็จ — โปรดบันทึก MQTT password (จะไม่แสดงอีก)" };
    },
    { body: poleCreateSchema },
  )
  .patch(
    "/:id",
    async ({ params, body, headers }) => {
      const data = await poleService.update(params.id, body, getUserId(headers));
      return { success: true, data, message: "อัปเดตเสาสำเร็จ" };
    },
    { params: t.Object({ id: t.Numeric({ minimum: 1 }) }), body: poleUpdateSchema },
  )
  .post(
    "/:id/maintenance",
    async ({ params, body, headers }) => {
      const data = await poleService.setMaintenance(params.id, body, getUserId(headers));
      return { success: true, data, message: body.enabled ? "เปิดโหมดบำรุงรักษา" : "ปิดโหมดบำรุงรักษา" };
    },
    { params: t.Object({ id: t.Numeric({ minimum: 1 }) }), body: poleMaintenanceSchema },
  )
  .post(
    "/:id/regenerate-credential",
    async ({ params, headers }) => {
      const data = await poleService.regenerateCredential(params.id, getUserId(headers));
      return {
        success: true,
        data,
        message: "Regenerate MQTT credential สำเร็จ — โปรดบันทึก password (จะไม่แสดงอีก)",
      };
    },
    { params: t.Object({ id: t.Numeric({ minimum: 1 }) }) },
  )
  .delete(
    "/:id",
    async ({ params, headers }) => {
      await poleService.delete(params.id, getUserId(headers));
      return { success: true, message: "ลบเสาสำเร็จ" };
    },
    { params: t.Object({ id: t.Numeric({ minimum: 1 }) }) },
  );
