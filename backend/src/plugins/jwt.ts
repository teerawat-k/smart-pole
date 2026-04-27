import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { bearer } from "@elysiajs/bearer";
import { env } from "@/config/env";
import { UnauthorizedError } from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";

// ── JWT plugin (access token) ──────────────────────────────
// payload: { sub, role, tokenVersion, iat, exp }

export const jwtAccessPlugin = new Elysia({ name: "jwt-access" }).use(
  jwt({
    name: "jwt",
    secret: env.JWT_SECRET,
    exp: env.JWT_ACCESS_EXPIRES,
  }),
);

/**
 * Bearer auth guard — verify access token + derive userId/role
 *
 * Usage:
 *   .use(authGuard)
 *   .get("/protected", ({ user }) => user)
 */
export const authGuard = new Elysia({ name: "auth-guard" })
  .use(jwtAccessPlugin)
  .use(bearer())
  .derive({ as: "scoped" }, async ({ jwt, bearer }) => {
    if (!bearer) {
      throw new UnauthorizedError(ErrorCode.AUTH_TOKEN_INVALID, "ไม่ได้ระบุ access token");
    }
    const payload = await jwt.verify(bearer);
    if (!payload || typeof payload === "boolean") {
      throw new UnauthorizedError(ErrorCode.AUTH_TOKEN_EXPIRED, "Access token ไม่ถูกต้องหรือหมดอายุ");
    }
    const sub = Number(payload.sub);
    const role = String(payload.role ?? "");
    if (!Number.isFinite(sub) || sub <= 0) {
      throw new UnauthorizedError(ErrorCode.AUTH_TOKEN_INVALID, "Access token payload ไม่ถูกต้อง");
    }
    return {
      user: {
        id: sub,
        role,
        tokenVersion: typeof payload.tokenVersion === "number" ? payload.tokenVersion : 1,
      },
    };
  });
