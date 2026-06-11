import { Elysia, t } from "elysia";
import { poleService } from "./pole.service";
import {
  poleListQuery,
  poleCreateSchema,
  poleUpdateSchema,
  poleMaintenanceSchema,
} from "./pole.schema";
import { authGuard } from "@/plugins/jwt";
import { requirePermission } from "@/common/middleware/require-permission";

export const poleController = new Elysia({ prefix: "/api/poles" })
  .use(authGuard)
  .get(
    "/",
    async ({ query }) => {
      const result = await poleService.list({
        page: query.page,
        limit: query.limit,
        search: query.search,
        poleStatus: query.poleStatus,
        hasCamera: query.hasCamera,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      });
      return { success: true, ...result, page: query.page, limit: query.limit };
    },
    { query: poleListQuery, beforeHandle: requirePermission("pole:view") },
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
    {
      params: t.Object({ id: t.Numeric({ minimum: 1 }) }),
      beforeHandle: requirePermission("pole:view"),
    },
  )
  .post(
    "/",
    async ({ body, user }) => {
      const data = await poleService.create(body, user.id);
      return { success: true, data, message: "สร้างเสาสำเร็จ — โปรดบันทึก MQTT password (จะไม่แสดงอีก)" };
    },
    { body: poleCreateSchema, beforeHandle: requirePermission("pole:create") },
  )
  .patch(
    "/:id",
    async ({ params, body, user }) => {
      const data = await poleService.update(params.id, body, user.id);
      return { success: true, data, message: "อัปเดตเสาสำเร็จ" };
    },
    {
      params: t.Object({ id: t.Numeric({ minimum: 1 }) }),
      body: poleUpdateSchema,
      beforeHandle: requirePermission("pole:edit"),
    },
  )
  .post(
    "/:id/maintenance",
    async ({ params, body, user }) => {
      const data = await poleService.setMaintenance(params.id, body, user.id);
      return { success: true, data, message: body.enabled ? "เปิดโหมดบำรุงรักษา" : "ปิดโหมดบำรุงรักษา" };
    },
    {
      params: t.Object({ id: t.Numeric({ minimum: 1 }) }),
      body: poleMaintenanceSchema,
      beforeHandle: requirePermission("pole:edit"),
    },
  )
  .post(
    "/:id/regenerate-credential",
    async ({ params, user }) => {
      const data = await poleService.regenerateCredential(params.id, user.id);
      return {
        success: true,
        data,
        message: "Regenerate MQTT credential สำเร็จ — โปรดบันทึก password (จะไม่แสดงอีก)",
      };
    },
    {
      params: t.Object({ id: t.Numeric({ minimum: 1 }) }),
      beforeHandle: requirePermission("pole:edit"),
    },
  )
  .delete(
    "/:id",
    async ({ params, user }) => {
      await poleService.delete(params.id, user.id);
      return { success: true, message: "ลบเสาสำเร็จ" };
    },
    {
      params: t.Object({ id: t.Numeric({ minimum: 1 }) }),
      beforeHandle: requirePermission("pole:delete"),
    },
  );
