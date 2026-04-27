// ── Atom: scan offline poles ───────────────────────────────
// Find poles with lastSeenAt < now - threshold AND status = online
// Mark offline + broadcast + audit + auto-create offline alert (dedupe)
import { prisma } from "@/plugins/prisma";
import { logger } from "@/plugins/logger";
import { broadcastPoleStatus } from "@/plugins/websocket";
import { systemConfigService } from "@/modules/system-config";
import { auditService, AuditAction, SYSTEM_USER_ID } from "@/modules/audit";
import { alertService, AlertType } from "@/modules/alert";

export interface ScanResult {
  detected: number;
  thresholdMinutes: number;
}

export async function scanOfflinePoles(): Promise<ScanResult> {
  const thresholdMinutes = await systemConfigService.get<number>("pole.offline_threshold_minutes", 3);
  const cutoff = new Date(Date.now() - thresholdMinutes * 60_000);

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
    await alertService
      .createOrIgnore({
        poleId: pole.id,
        alertType: AlertType.POLE_OFFLINE,
        severity: "warning",
        message: `เสา ${pole.poleName} ขาดสัญญาณ heartbeat เกิน ${thresholdMinutes} นาที`,
      })
      .catch(() => undefined);
  }

  logger.info({ detected: candidates.length, thresholdMinutes }, "Scheduler: offline poles detected");
  return { detected: candidates.length, thresholdMinutes };
}
