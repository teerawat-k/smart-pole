// ── Atom: refresh access token (rotation + reuse detection) ─
import { createHash } from "node:crypto";
import { authRepository } from "../auth.repository";
import { issueRefreshToken } from "./issue-tokens";
import { UnauthorizedError } from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";

export interface RefreshResult {
  user: { id: number; username: string; tokenVersion: number };
  refreshToken: string;
  refreshExpiresAt: Date;
}

export async function refreshTokens(opts: {
  refreshToken: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<RefreshResult> {
  const tokenHash = createHash("sha256").update(opts.refreshToken).digest("hex");
  const stored = await authRepository.findRefreshByHash(tokenHash);
  if (!stored) {
    throw new UnauthorizedError(ErrorCode.AUTH_TOKEN_INVALID, "Refresh token ไม่ถูกต้อง");
  }

  // reuse detection — token revoked ก่อนหน้า = ส่อ leak → revoke ทั้ง family
  if (stored.revokedAt) {
    await authRepository.revokeFamily(stored.family);
    throw new UnauthorizedError(ErrorCode.AUTH_REFRESH_REUSE, "Refresh token ถูกใช้ซ้ำ — ระบบยกเลิก session ทั้งหมดเพื่อความปลอดภัย");
  }

  if (stored.expiresAt < new Date()) {
    throw new UnauthorizedError(ErrorCode.AUTH_TOKEN_EXPIRED, "Refresh token หมดอายุ — กรุณา login ใหม่");
  }

  if (stored.user.status !== "active") {
    throw new UnauthorizedError(ErrorCode.AUTH_DISABLED, "บัญชีถูกปิดใช้งาน");
  }

  // rotate — issue ใหม่ + revoke เก่า + link replacedById
  const next = await issueRefreshToken({
    userId: stored.userId,
    family: stored.family,
    ipAddress: opts.ipAddress,
    userAgent: opts.userAgent,
  });
  await authRepository.revokeRefreshToken(stored.id, next.refreshTokenId);

  return {
    user: { id: stored.user.id, username: stored.user.username, tokenVersion: stored.user.tokenVersion },
    refreshToken: next.refreshToken,
    refreshExpiresAt: next.refreshExpiresAt,
  };
}
