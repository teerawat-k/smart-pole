import { prisma } from "@/plugins/prisma";

export const systemConfigRepository = {
  async get(key: string): Promise<unknown | null> {
    const row = await prisma.systemConfig.findUnique({ where: { key }, select: { value: true } });
    return row?.value ?? null;
  },

  async set(key: string, value: unknown, updatedBy: number): Promise<void> {
    await prisma.systemConfig.upsert({
      where: { key },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma JSON value type is permissive
      update: { value: value as any, updatedBy },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: { key, value: value as any, updatedBy },
    });
  },
};
