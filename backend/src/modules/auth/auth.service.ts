// ── Auth service orchestrator ──────────────────────────────
// delegate ทุก flow ไป atoms ใน flow/
import { login as loginFlow, type LoginContext } from "./flow/login";
import { refreshTokens, type RefreshResult } from "./flow/refresh";
import { logout as logoutFlow, logoutAll } from "./flow/logout";

export const authService = {
  login: (ctx: LoginContext) => loginFlow(ctx),
  refresh: (opts: { refreshToken: string; ipAddress?: string; userAgent?: string }): Promise<RefreshResult> =>
    refreshTokens(opts),
  logout: (opts: { refreshToken?: string; userId: number; ipAddress?: string; userAgent?: string }) =>
    logoutFlow(opts),
  logoutAll: (userId: number) => logoutAll(userId),
};
