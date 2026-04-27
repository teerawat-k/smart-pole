// ── Atom: logout (revoke refresh) ──────────────────────────
import { createHash } from "node:crypto";
import { authRepository } from "../auth.repository";
import { auditService, AuditAction } from "@/modules/audit";

export async function logout(opts: {
  refreshToken?: string;
  userId: number;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  if (opts.refreshToken) {
    const tokenHash = createHash("sha256").update(opts.refreshToken).digest("hex");
    const stored = await authRepository.findRefreshByHash(tokenHash);
    if (stored && !stored.revokedAt) {
      await authRepository.revokeRefreshToken(stored.id);
    }
  }

  await authRepository.logSystem({
    logType: "logout",
    userId: opts.userId,
    ipAddress: opts.ipAddress,
    userAgent: opts.userAgent,
  });
  auditService.log({
    userId: opts.userId,
    action: AuditAction.LOGOUT,
    module: "auth",
    targetId: opts.userId,
  });
}

export async function logoutAll(userId: number): Promise<void> {
  await authRepository.revokeAllByUser(userId);
  await authRepository.bumpTokenVersion(userId);
  auditService.log({
    userId,
    action: AuditAction.LOGOUT,
    module: "auth",
    targetId: userId,
    payload: { scope: "all" },
  });
}
