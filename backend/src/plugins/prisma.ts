import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@/config/env";

// Decimal → number ตอน serialize เพื่อให้ frontend รับ number ได้ตรง
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma.Decimal prototype patch
(Prisma.Decimal.prototype as any).toJSON = function () {
  return Number(this.toString());
};

// BigInt → number ตอน serialize (lastSeenAt เก็บ epoch ms เป็น BigInt — ปลอดภัยถึงปี 287396)
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- BigInt prototype patch
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

declare global {
  // eslint-disable-next-line no-var -- singleton pattern (dev only)
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient = globalThis.__prisma ?? new PrismaClient({ adapter });

if (env.NODE_ENV !== "production") globalThis.__prisma = prisma;

// ── Health check helper ────────────────────────────────
export async function pingDb(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
