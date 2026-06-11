import { Elysia, t } from "elysia";
import { userService } from "./user.service";
import {
  userListQuery,
  userCreateSchema,
  userUpdateSchema,
  userStatusSchema,
  userResetPasswordSchema,
  userMyProfileUpdateSchema,
  userChangePasswordSchema,
} from "./user.schema";
import { authGuard } from "@/plugins/jwt";
import { requirePermission, hasPermission } from "@/common/middleware/require-permission";

export const userController = new Elysia({ prefix: "/api/users" })
  .use(authGuard)
  .get(
    "/",
    async ({ query, user }) => {
      const result = await userService.list({
        page: query.page,
        limit: query.limit,
        search: query.search,
        roleId: query.roleId,
        status: query.status,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      });
      const [canEdit, canDelete] = await Promise.all([
        hasPermission(user, "user:edit"),
        hasPermission(user, "user:delete"),
      ]);
      const data = result.data.map((u) => ({ ...u, canEdit, canDelete }));
      return { success: true, data, total: result.total, page: query.page, limit: query.limit };
    },
    { query: userListQuery, beforeHandle: requirePermission("user:view") },
  )
  .get("/lookup", async () => {
    const data = await userService.lookup();
    return { success: true, data };
  })
  .get(
    "/:id",
    async ({ params }) => {
      const data = await userService.getById(params.id);
      return { success: true, data };
    },
    {
      params: t.Object({ id: t.Numeric({ minimum: 1 }) }),
      beforeHandle: requirePermission("user:view"),
    },
  )
  .post(
    "/",
    async ({ body, user }) => {
      const data = await userService.create(body, user.id);
      return { success: true, data, message: "สร้างผู้ใช้งานสำเร็จ" };
    },
    { body: userCreateSchema, beforeHandle: requirePermission("user:create") },
  )
  .patch(
    "/:id",
    async ({ params, body, user }) => {
      const data = await userService.update(params.id, body, user.id);
      return { success: true, data, message: "อัปเดตผู้ใช้งานสำเร็จ" };
    },
    {
      params: t.Object({ id: t.Numeric({ minimum: 1 }) }),
      body: userUpdateSchema,
      beforeHandle: requirePermission("user:edit"),
    },
  )
  .patch(
    "/:id/status",
    async ({ params, body, user }) => {
      const data = await userService.setStatus(params.id, body, user.id);
      return { success: true, data, message: "เปลี่ยนสถานะผู้ใช้งานสำเร็จ" };
    },
    {
      params: t.Object({ id: t.Numeric({ minimum: 1 }) }),
      body: userStatusSchema,
      beforeHandle: requirePermission("user:edit"),
    },
  )
  .post(
    "/:id/unlock",
    async ({ params, user }) => {
      const data = await userService.unlock(params.id, user.id);
      return { success: true, data, message: "ปลดล็อกผู้ใช้งานสำเร็จ" };
    },
    {
      params: t.Object({ id: t.Numeric({ minimum: 1 }) }),
      beforeHandle: requirePermission("user:edit"),
    },
  )
  .post(
    "/:id/reset-password",
    async ({ params, body, user }) => {
      const data = await userService.resetPassword(params.id, body, user.id);
      return { success: true, data, message: "รีเซ็ตรหัสผ่านสำเร็จ" };
    },
    {
      params: t.Object({ id: t.Numeric({ minimum: 1 }) }),
      body: userResetPasswordSchema,
      beforeHandle: requirePermission("user:edit"),
    },
  )
  .delete(
    "/:id",
    async ({ params, user }) => {
      await userService.delete(params.id, user.id);
      return { success: true, message: "ลบผู้ใช้งานสำเร็จ" };
    },
    {
      params: t.Object({ id: t.Numeric({ minimum: 1 }) }),
      beforeHandle: requirePermission("user:delete"),
    },
  );

// ── My profile (auth-only — no permission) ──
export const meController = new Elysia({ prefix: "/api/me" })
  .use(authGuard)
  .get("/", async ({ user }) => {
    const data = await userService.getMyProfile(user.id);
    return { success: true, data };
  })
  .patch(
    "/",
    async ({ body, user }) => {
      const data = await userService.updateMyProfile(body, user.id);
      return { success: true, data, message: "อัปเดตโปรไฟล์สำเร็จ" };
    },
    { body: userMyProfileUpdateSchema },
  )
  .patch(
    "/password",
    async ({ body, user }) => {
      const data = await userService.changeMyPassword(body, user.id);
      return { success: true, data, message: "เปลี่ยนรหัสผ่านสำเร็จ" };
    },
    { body: userChangePasswordSchema },
  );
