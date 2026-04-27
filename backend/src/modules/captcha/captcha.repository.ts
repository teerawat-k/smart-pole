import { prisma } from "@/plugins/prisma";

export const captchaRepository = {
  async create(data: { sessionKey: string; captchaHash: string; expiresAt: Date }) {
    return prisma.captchaAttempt.create({ data });
  },

  async findActive(sessionKey: string) {
    return prisma.captchaAttempt.findFirst({
      where: {
        sessionKey,
        isSolved: false,
        expiresAt: { gt: new Date() },
      },
    });
  },

  async markSolved(id: number) {
    return prisma.captchaAttempt.update({
      where: { id },
      data: { isSolved: true },
    });
  },

  async cleanupExpired(): Promise<number> {
    const result = await prisma.captchaAttempt.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  },
};
