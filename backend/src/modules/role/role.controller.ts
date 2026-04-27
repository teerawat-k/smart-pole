import { Elysia, t } from "elysia";
import { roleService } from "./role.service";
import { roleListQuery, roleCreateSchema, roleUpdateSchema, setPermissionsSchema } from "./role.schema";

// TODO(E01+): wrap ด้วย authPlugin + requirePermission("role:view"|...) เมื่อ auth พร้อม
// ตอนนี้รับ `userId` จาก header `x-user-id` ชั่วคราว — ใช้สำหรับ test integration
function getUserId(headers: Record<string, string | undefined>): number {
  const raw = headers["x-user-id"];
  return raw ? Number(raw) : 1; // default admin
}

export const roleController = new Elysia({ prefix: "/api/roles" })
  .get(
    "/",
    async ({ query }) => {
      const result = await roleService.list({ page: query.page, limit: query.limit });
      return { success: true, ...result, page: query.page, limit: query.limit };
    },
    { query: roleListQuery },
  )
  .get("/lookup", async () => {
    const data = await roleService.lookup();
    return { success: true, data };
  })
  .get("/permissions", async () => {
    const data = await roleService.listPermissions();
    return { success: true, data };
  })
  .get(
    "/:id",
    async ({ params }) => {
      const data = await roleService.getById(params.id);
      return { success: true, data };
    },
    { params: t.Object({ id: t.Numeric({ minimum: 1 }) }) },
  )
  .post(
    "/",
    async ({ body, headers }) => {
      const data = await roleService.create(body, getUserId(headers));
      return { success: true, data, message: "สร้าง Role สำเร็จ" };
    },
    { body: roleCreateSchema },
  )
  .patch(
    "/:id",
    async ({ params, body, headers }) => {
      const data = await roleService.update(params.id, body, getUserId(headers));
      return { success: true, data, message: "อัปเดต Role สำเร็จ" };
    },
    {
      params: t.Object({ id: t.Numeric({ minimum: 1 }) }),
      body: roleUpdateSchema,
    },
  )
  .put(
    "/:id/permissions",
    async ({ params, body, headers }) => {
      const data = await roleService.setPermissions(params.id, body, getUserId(headers));
      return { success: true, data, message: "อัปเดต Permission สำเร็จ" };
    },
    {
      params: t.Object({ id: t.Numeric({ minimum: 1 }) }),
      body: setPermissionsSchema,
    },
  )
  .delete(
    "/:id",
    async ({ params, headers }) => {
      await roleService.delete(params.id, getUserId(headers));
      return { success: true, message: "ลบ Role สำเร็จ" };
    },
    { params: t.Object({ id: t.Numeric({ minimum: 1 }) }) },
  );
