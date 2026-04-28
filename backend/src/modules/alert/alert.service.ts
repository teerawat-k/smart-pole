// ── Alert service orchestrator ─────────────────────────────
import { alertRepository } from "./alert.repository";
import { dedupeAndCreate, type CreateAlertInput } from "./flow/dedupe-and-create";
import { resolveAlert, autoResolveOpenForPole } from "./flow/resolve";
import { SYSTEM_USER_ID } from "@/modules/audit";

export const alertService = {
  list: alertRepository.findMany.bind(alertRepository),

  /** create alert with dedupe — ใช้จาก rule engine */
  createOrIgnore: (input: CreateAlertInput) => dedupeAndCreate(input),

  /** resolve manually (admin) */
  resolve: (id: number, userId: number, note?: string) => resolveAlert(id, userId, note),

  /** auto resolve เมื่อ condition clear (เช่น pole online กลับมา) */
  autoResolveForPole: (poleId: number, alertType: string) =>
    autoResolveOpenForPole(poleId, alertType, SYSTEM_USER_ID),
};
