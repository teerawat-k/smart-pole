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

// TODO(E01+): wrap ด้วย authPlugin + requirePermission เมื่อ auth พร้อม
function getUserId(headers: Record<string, string | undefined>): number {
  const raw = headers["x-user-id"];
  return raw ? Number(raw) : 1; // default admin
}

export const userController = new Elysia({ prefix: "/api/users" })
  .get(
    "/",
    async ({ query }) => {
      const result = await userService.list({
        page: query.page,
        limit: query.limit,
        search: query.search,
        roleId: query.roleId,
        status: query.status,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      });
      return { success: true, ...result, page: query.page, limit: query.limit };
    },
    { query: userListQuery },
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
    { params: t.Object({ id: t.Numeric({ minimum: 1 }) }) },
  )
  .post(
    "/",
    async ({ body, headers }) => {
      const data = await userService.create(body, getUserId(headers));
      return { success: true, data, message: "สร้างผู้ใช้งานสำเร็จ" };
    },
    { body: userCreateSchema },
  )
  .patch(
    "/:id",
    async ({ params, body, headers }) => {
      const data = await userService.update(params.id, body, getUserId(headers));
      return { success: true, data, message: "อัปเดตผู้ใช้งานสำเร็จ" };
    },
    { params: t.Object({ id: t.Numeric({ minimum: 1 }) }), body: userUpdateSchema },
  )
  .patch(
    "/:id/status",
    async ({ params, body, headers }) => {
      const data = await userService.setStatus(params.id, body, getUserId(headers));
      return { success: true, data, message: "เปลี่ยนสถานะผู้ใช้งานสำเร็จ" };
    },
    { params: t.Object({ id: t.Numeric({ minimum: 1 }) }), body: userStatusSchema },
  )
  .post(
    "/:id/unlock",
    async ({ params, headers }) => {
      const data = await userService.unlock(params.id, getUserId(headers));
      return { success: true, data, message: "ปลดล็อกผู้ใช้งานสำเร็จ" };
    },
    { params: t.Object({ id: t.Numeric({ minimum: 1 }) }) },
  )
  .post(
    "/:id/reset-password",
    async ({ params, body, headers }) => {
      const data = await userService.resetPassword(params.id, body, getUserId(headers));
      return { success: true, data, message: "รีเซ็ตรหัสผ่านสำเร็จ" };
    },
    { params: t.Object({ id: t.Numeric({ minimum: 1 }) }), body: userResetPasswordSchema },
  )
  .delete(
    "/:id",
    async ({ params, headers }) => {
      await userService.delete(params.id, getUserId(headers));
      return { success: true, message: "ลบผู้ใช้งานสำเร็จ" };
    },
    { params: t.Object({ id: t.Numeric({ minimum: 1 }) }) },
  );

// ── My profile (separate prefix) ──
export const meController = new Elysia({ prefix: "/api/me" })
  .get("/", async ({ headers }) => {
    const data = await userService.getMyProfile(getUserId(headers));
    return { success: true, data };
  })
  .patch(
    "/",
    async ({ body, headers }) => {
      const data = await userService.updateMyProfile(body, getUserId(headers));
      return { success: true, data, message: "อัปเดตโปรไฟล์สำเร็จ" };
    },
    { body: userMyProfileUpdateSchema },
  )
  .patch(
    "/password",
    async ({ body, headers }) => {
      const data = await userService.changeMyPassword(body, getUserId(headers));
      return { success: true, data, message: "เปลี่ยนรหัสผ่านสำเร็จ" };
    },
    { body: userChangePasswordSchema },
  );
