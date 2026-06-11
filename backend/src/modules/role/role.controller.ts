import { Elysia, t } from "elysia";
import { roleService } from "./role.service";
import { roleListQuery, roleCreateSchema, roleUpdateSchema, setPermissionsSchema } from "./role.schema";
import { authGuard } from "@/plugins/jwt";
import { requirePermission, invalidatePermissionCache } from "@/common/middleware/require-permission";

export const roleController = new Elysia({ prefix: "/api/roles" })
  .use(authGuard)
  .get(
    "/",
    async ({ query }) => {
      const result = await roleService.list({ page: query.page, limit: query.limit });
      return { success: true, ...result, page: query.page, limit: query.limit };
    },
    { query: roleListQuery, beforeHandle: requirePermission("role:view") },
  )
  .get("/lookup", async () => {
    const data = await roleService.lookup();
    return { success: true, data };
  })
  .get(
    "/permissions",
    async () => {
      const data = await roleService.listPermissions();
      return { success: true, data };
    },
    { beforeHandle: requirePermission("role:view") },
  )
  .get(
    "/:id",
    async ({ params }) => {
      const data = await roleService.getById(params.id);
      return { success: true, data };
    },
    {
      params: t.Object({ id: t.Numeric({ minimum: 1 }) }),
      beforeHandle: requirePermission("role:view"),
    },
  )
  .post(
    "/",
    async ({ body, user }) => {
      const data = await roleService.create(body, user.id);
      return { success: true, data, message: "สร้าง Role สำเร็จ" };
    },
    { body: roleCreateSchema, beforeHandle: requirePermission("role:create") },
  )
  .patch(
    "/:id",
    async ({ params, body, user }) => {
      const data = await roleService.update(params.id, body, user.id);
      return { success: true, data, message: "อัปเดต Role สำเร็จ" };
    },
    {
      params: t.Object({ id: t.Numeric({ minimum: 1 }) }),
      body: roleUpdateSchema,
      beforeHandle: requirePermission("role:edit"),
    },
  )
  .put(
    "/:id/permissions",
    async ({ params, body, user }) => {
      const data = await roleService.setPermissions(params.id, body, user.id);
      // permissions เปลี่ยน → invalidate cache ของ role นี้
      const roleAfter = await roleService.getById(params.id);
      invalidatePermissionCache(roleAfter.name);
      return { success: true, data, message: "อัปเดต Permission สำเร็จ" };
    },
    {
      params: t.Object({ id: t.Numeric({ minimum: 1 }) }),
      body: setPermissionsSchema,
      beforeHandle: requirePermission("role:edit"),
    },
  )
  .delete(
    "/:id",
    async ({ params, user }) => {
      await roleService.delete(params.id, user.id);
      return { success: true, message: "ลบ Role สำเร็จ" };
    },
    {
      params: t.Object({ id: t.Numeric({ minimum: 1 }) }),
      beforeHandle: requirePermission("role:delete"),
    },
  );
