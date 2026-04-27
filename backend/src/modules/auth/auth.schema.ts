import { t, type Static } from "elysia";

export const loginSchema = t.Object({
  username: t.String({ minLength: 1, maxLength: 64 }),
  password: t.String({ minLength: 1, maxLength: 200 }),
  sessionKey: t.String({ minLength: 1, maxLength: 64 }),
  captchaInput: t.String({ minLength: 1, maxLength: 16 }),
});

export const refreshSchema = t.Object({
  refreshToken: t.String({ minLength: 1, maxLength: 200 }),
});

export const logoutSchema = t.Object({
  refreshToken: t.Optional(t.String({ maxLength: 200 })),
});

export type LoginInput = Static<typeof loginSchema>;
export type RefreshInput = Static<typeof refreshSchema>;
export type LogoutInput = Static<typeof logoutSchema>;
