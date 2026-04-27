import { t, type Static } from "elysia";
import { paginationQuery } from "@/common/schemas/pagination";
import { passwordSchema } from "@/common/schemas/password.schema";

export const userListQuery = t.Object({
  ...paginationQuery,
  roleId: t.Optional(t.Numeric({ minimum: 1 })),
  status: t.Optional(t.Union([t.Literal("active"), t.Literal("disabled"), t.Literal("locked")])),
});

export const userCreateSchema = t.Object({
  username: t.String({ minLength: 3, maxLength: 64, pattern: "^[a-zA-Z0-9._-]+$" }),
  email: t.String({ format: "email", maxLength: 200 }),
  password: passwordSchema,
  firstName: t.String({ minLength: 1, maxLength: 100 }),
  lastName: t.String({ minLength: 1, maxLength: 100 }),
  mobileNo: t.Optional(t.String({ maxLength: 32 })),
  roleId: t.Number({ minimum: 1 }),
});

export const userUpdateSchema = t.Object({
  email: t.Optional(t.String({ format: "email", maxLength: 200 })),
  firstName: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  lastName: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  mobileNo: t.Optional(t.String({ maxLength: 32 })),
  roleId: t.Optional(t.Number({ minimum: 1 })),
});

export const userStatusSchema = t.Object({
  status: t.Union([t.Literal("active"), t.Literal("disabled")]),
});

export const userResetPasswordSchema = t.Object({
  newPassword: passwordSchema,
});

export const userMyProfileUpdateSchema = t.Object({
  email: t.Optional(t.String({ format: "email", maxLength: 200 })),
  firstName: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  lastName: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  mobileNo: t.Optional(t.String({ maxLength: 32 })),
});

export const userChangePasswordSchema = t.Object({
  currentPassword: t.String({ minLength: 1 }),
  newPassword: passwordSchema,
});

export type UserCreateInput = Static<typeof userCreateSchema>;
export type UserUpdateInput = Static<typeof userUpdateSchema>;
export type UserStatusInput = Static<typeof userStatusSchema>;
export type UserResetPasswordInput = Static<typeof userResetPasswordSchema>;
export type UserMyProfileUpdateInput = Static<typeof userMyProfileUpdateSchema>;
export type UserChangePasswordInput = Static<typeof userChangePasswordSchema>;
