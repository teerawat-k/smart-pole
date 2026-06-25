// ── Shared: mark pole as contacted (reachable) ─────────────
// ใช้ร่วมโดย handle-sensor + handle-health
//
// Atomic responsibility: ต่ออายุ Pole.lastSeenAt + ตั้งสถานะ online
//   + auto-resolve pole_offline alert เมื่อ transition offline → online
//
// นิยามสถานะ: เสา "offline" = ติดต่อไม่ได้เลย (ไม่มีทั้ง /sensor และ /health)
// ดังนั้น "ข้อความใด ๆ" ที่เข้ามา = เสายัง reachable → ต่ออายุ lastSeenAt
// (sensor อ่านค่าไม่ได้แต่เสายังมีชีวิต = ยัง online — ไม่ใช่ offline)
import { prisma } from "@/plugins/prisma";
import { logger } from "@/plugins/logger";
import { alertService, AlertType } from "@/modules/alert";

export interface PoleSeenResult {
  poleId: number;
  wasOffline: boolean;
}

export async function markPoleSeen(
  poleName: string,
  time: bigint,
): Promise<PoleSeenResult | null> {
  const pole = await prisma.pole.findFirst({
    where: { poleName, deletedAt: null },
    select: { id: true, poleStatus: true }, // poleStatus ใช้ detect transition
  });
  if (!pole) return null;

  await prisma.pole.update({
    where: { id: pole.id },
    data: { poleStatus: "online", lastSeenAt: time },
  });

  // Auto-resolve pole_offline alert ถ้าก่อนหน้านี้ offline (fire-and-forget)
  // กัน alert table บวมเมื่อเสา flip online/offline หลายรอบ
  const wasOffline = pole.poleStatus === "offline";
  if (wasOffline) {
    alertService.autoResolveForPole(pole.id, AlertType.POLE_OFFLINE).catch((err: unknown) => {
      logger.error({ err, poleId: pole.id }, "auto-resolve pole_offline alert failed");
    });
  }

  return { poleId: pole.id, wasOffline };
}
