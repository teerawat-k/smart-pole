// ── Atom: scan offline poles ───────────────────────────────
// Find poles with lastSeenAt < now - threshold AND status = online
// Mark them offline + broadcast WS
// (alert creation จะเพิ่มใน E11)
import { prisma } from "@/plugins/prisma";
import { logger } from "@/plugins/logger";
import { broadcastPoleStatus } from "@/plugins/websocket";
import { systemConfigService } from "@/modules/system-config";
import { auditService, AuditAction, SYSTEM_USER_ID } from "@/modules/audit";

export interface ScanResult {
  detected: number;
  thresholdMinutes: number;
}

export async function scanOfflinePoles(): Promise<ScanResult> {
  const thresholdMinutes = await systemConfigService.get<number>("pole.offline_threshold_minutes", 3);
  const cutoff = new Date(Date.now() - thresholdMinutes * 60_000);

  // หา pole ที่ status=online แต่ lastSeenAt เก่ากว่า cutoff
  const candidates = await prisma.pole.findMany({
    where: {
      poleStatus: "online",
      deletedAt: null,
      lastSeenAt: { lt: cutoff },
    },
    select: { id: true, poleName: true, lastSeenAt: true },
  });

  if (candidates.length === 0) return { detected: 0, thresholdMinutes };

  const ids = candidates.map((p) => p.id);
  await prisma.pole.updateMany({
    where: { id: { in: ids } },
    data: { poleStatus: "offline" },
  });

  for (const pole of candidates) {
    broadcastPoleStatus(pole.poleName, "offline", pole.lastSeenAt ?? undefined);
    auditService.log({
      userId: SYSTEM_USER_ID,
      action: AuditAction.STATUS_CHANGE,
      module: "pole",
      targetId: pole.id,
      payload: { from: "online", to: "offline", reason: "heartbeat_timeout", lastSeenAt: pole.lastSeenAt },
    });
  }

  logger.info({ detected: candidates.length, thresholdMinutes }, "Scheduler: offline poles detected");
  return { detected: candidates.length, thresholdMinutes };
}
