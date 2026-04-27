import type { PrismaClient } from "@prisma/client";

// ใช้สำหรับฟังก์ชัน repo/atom ที่รับ tx? เพื่อ run ใน transaction หรือใช้ singleton ก็ได้
export type PrismaTx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;
