import type { Prisma } from "@prisma/client";
import { prisma } from "@/plugins/prisma";

/**
 * Prisma transaction client หรือ singleton client
 * ใช้กับ atom function ที่ต้องรับ `tx?: PrismaTx` เพื่อ compose ใน outer transaction
 *
 * pattern ภายใน atom: `const client = tx ?? prisma`
 */
export type PrismaTx = Prisma.TransactionClient | typeof prisma;
