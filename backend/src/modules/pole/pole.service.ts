// ── Pole service orchestrator ──────────────────────────────
import { poleRepository } from "./pole.repository";
import { NotFoundError } from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";
import { createPole } from "./flow/create";
import { updatePole } from "./flow/update";
import { setMaintenance } from "./flow/set-maintenance";
import { regenerateMqttCredential } from "./flow/regenerate-credential";
import { softDeletePole } from "./flow/soft-delete";
import type { PoleCreateInput, PoleUpdateInput, PoleMaintenanceInput } from "./pole.schema";
import type { PoleStatus } from "@prisma/client";

async function getById(id: number) {
  const pole = await poleRepository.findById(id);
  if (!pole) throw new NotFoundError(ErrorCode.POLE_NOT_FOUND, "ไม่พบเสาที่ระบุ");
  return pole;
}

export const poleService = {
  list: (params: { page: number; limit: number; search?: string; poleStatus?: PoleStatus; hasCamera?: boolean; sortBy?: string; sortOrder?: "asc" | "desc" }) =>
    poleRepository.findMany(params),
  getById,
  lookup: () => poleRepository.findLookup(),

  // Mutations
  create: (input: PoleCreateInput, requestUserId: number) => createPole(input, requestUserId),
  update: (id: number, input: PoleUpdateInput, requestUserId: number) => updatePole(id, input, requestUserId),
  setMaintenance: (id: number, input: PoleMaintenanceInput, requestUserId: number) =>
    setMaintenance(id, input, requestUserId),
  regenerateCredential: (id: number, requestUserId: number) => regenerateMqttCredential(id, requestUserId),
  delete: (id: number, requestUserId: number) => softDeletePole(id, requestUserId),

  // ── Internal: MQTT-driven status updates (เรียกจาก MQTT handler) ──
  // maintenance เป็นแค่ tag บอกสถานะ — heartbeat ทำงานปกติ ไม่ต้อง guard
  markOffline: async (poleName: string) => {
    const pole = await poleRepository.findByName(poleName);
    if (!pole) return null;
    return poleRepository.updateStatus(pole.id, "offline");
  },
};
