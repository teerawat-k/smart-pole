import { prisma } from "@/plugins/prisma";
import type { PrismaTx } from "@/common/utils/prisma-tx";

export const authRepository = {
  // ── User auth fields update ───────────────────────────
  async incrementFailCount(userId: number, lockedUntil: Date | null, lockedReason: string | null, tx?: PrismaTx) {
    const client = tx ?? prisma;
    return client.user.update({
      where: { id: userId },
      data: {
        loginFailCount: { increment: 1 },
        lockedUntil,
        lockedReason,
      },
      select: { id: true, loginFailCount: true },
    });
  },

  async setStatusLocked(userId: number, reason: string, tx?: PrismaTx) {
    const client = tx ?? prisma;
    return client.user.update({
      where: { id: userId },
      data: {
        status: "locked",
        lockedReason: reason,
        loginFailCount: { increment: 1 },
      },
      select: { id: true },
    });
  },

  async resetFailAndMarkLogin(userId: number, tx?: PrismaTx) {
    const client = tx ?? prisma;
    return client.user.update({
      where: { id: userId },
      data: {
        loginFailCount: 0,
        lockedUntil: null,
        lockedReason: null,
        lastLoginAt: new Date(),
      },
      select: { id: true },
    });
  },

  async bumpTokenVersion(userId: number, tx?: PrismaTx) {
    const client = tx ?? prisma;
    return client.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
      select: { id: true, tokenVersion: true },
    });
  },

  // ── Refresh token ─────────────────────────────────────
  async createRefreshToken(data: {
    userId: number;
    tokenHash: string;
    family: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return prisma.refreshToken.create({
      data,
      select: { id: true, family: true, expiresAt: true },
    });
  },

  async findRefreshByHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: { select: { id: true, username: true, status: true, tokenVersion: true } },
      },
    });
  },

  async revokeRefreshToken(id: number, replacedById?: number) {
    return prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date(), replacedById },
    });
  },

  async revokeFamily(family: string) {
    return prisma.refreshToken.updateMany({
      where: { family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async revokeAllByUser(userId: number) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  // ── System log entries ────────────────────────────────
  async logSystem(data: {
    logType: "login_success" | "login_fail" | "logout" | "captcha_fail";
    userId?: number;
    usernameSnap?: string;
    failReason?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    await prisma.systemLog.create({
      data: {
        logType: data.logType,
        userId: data.userId,
        usernameSnap: data.usernameSnap,
        failReason: data.failReason,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  },
};
