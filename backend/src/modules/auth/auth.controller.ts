import { Elysia } from "elysia";
import type { Server } from "bun";
import { authService } from "./auth.service";
import { loginSchema, refreshSchema, logoutSchema } from "./auth.schema";
import { jwtAccessPlugin, authGuard } from "@/plugins/jwt";
import { enforceRateLimit } from "@/common/middleware/rate-limit";

function getIpAddress(headers: Record<string, string | undefined>, server?: Server<unknown> | null, request?: Request): string | undefined {
  const forwarded = headers["x-forwarded-for"]?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  if (server?.requestIP && request) return server.requestIP(request)?.address ?? undefined;
  return undefined;
}

function getUserAgent(headers: Record<string, string | undefined>): string | undefined {
  return headers["user-agent"];
}

// ── Public auth endpoints (no auth required) ──────────────
export const authController = new Elysia({ prefix: "/api/auth" })
  .use(jwtAccessPlugin)
  .post(
    "/login",
    async ({ body, headers, jwt, server, request }) => {
      const ip = getIpAddress(headers, server, request) ?? "unknown";
      enforceRateLimit(ip, { keyPrefix: "login", windowMs: 60_000, max: 10 });

      const result = await authService.login({
        username: body.username,
        password: body.password,
        sessionKey: body.sessionKey,
        captchaInput: body.captchaInput,
        ipAddress: ip,
        userAgent: getUserAgent(headers),
      });

      // sign access token (short-lived)
      const accessToken = await jwt.sign({
        sub: String(result.user.id),
        role: result.user.roleName,
        tokenVersion: result.user.tokenVersion,
      });

      return {
        success: true,
        message: "เข้าสู่ระบบสำเร็จ",
        data: {
          user: result.user,
          accessToken,
          refreshToken: result.refreshToken,
          refreshExpiresAt: result.refreshExpiresAt,
        },
      };
    },
    { body: loginSchema },
  )
  .post(
    "/refresh",
    async ({ body, headers, jwt, server, request }) => {
      const ip = getIpAddress(headers, server, request) ?? "unknown";
      enforceRateLimit(ip, { keyPrefix: "refresh", windowMs: 60_000, max: 20 });

      const result = await authService.refresh({
        refreshToken: body.refreshToken,
        ipAddress: ip,
        userAgent: getUserAgent(headers),
      });

      const accessToken = await jwt.sign({
        sub: String(result.user.id),
        role: "", // role ไม่อยู่ใน refresh result — frontend จะใช้ /api/me แทน
        tokenVersion: result.user.tokenVersion,
      });

      return {
        success: true,
        message: "Refresh token สำเร็จ",
        data: {
          accessToken,
          refreshToken: result.refreshToken,
          refreshExpiresAt: result.refreshExpiresAt,
        },
      };
    },
    { body: refreshSchema },
  );

// ── Protected logout (requires access token) ─────────────
export const authProtectedController = new Elysia({ prefix: "/api/auth" })
  .use(authGuard)
  .post(
    "/logout",
    async ({ body, headers, user, server, request }) => {
      await authService.logout({
        refreshToken: body.refreshToken,
        userId: user.id,
        ipAddress: getIpAddress(headers, server, request),
        userAgent: getUserAgent(headers),
      });
      return { success: true, message: "ออกจากระบบสำเร็จ" };
    },
    { body: logoutSchema },
  )
  .post("/logout-all", async ({ user }) => {
    await authService.logoutAll(user.id);
    return { success: true, message: "ออกจากระบบทุก session สำเร็จ" };
  });
