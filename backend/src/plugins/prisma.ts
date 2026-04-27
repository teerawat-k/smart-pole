import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "@/config/env";

// Decimal → number ตอน serialize เพื่อให้ frontend รับเป็น number ได้ตรง
// (Prisma 7 Decimal → ห้าม override prototype globally — wrap ที่ JSON.stringify ดีกว่า)
// แต่เพื่อให้สะดวก ตามมาตรฐาน v1: override toJSON
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma.Decimal prototype patch
(Prisma.Decimal.prototype as any).toJSON = function () {
  return Number(this.toString());
};

const pool = new Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);

declare global {
  // eslint-disable-next-line no-var, @typescript-eslint/no-explicit-any -- singleton pattern
  var __prisma: any | undefined;
}

export const prisma: PrismaClient = globalThis.__prisma ?? new PrismaClient({ adapter });

if (env.NODE_ENV !== "production") globalThis.__prisma = prisma;
