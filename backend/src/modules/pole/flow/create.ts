// ── Atom: create pole ──────────────────────────────────────
// Steps: validate dup → generate credential → create row → audit
//        return ปลายทาง: pole + plain password (ครั้งเดียว!)
import { poleRepository } from "../pole.repository";
import { auditService, AuditAction } from "@/modules/audit";
import { DuplicateError } from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";
import { POLE_ENTITY } from "../pole.constants";
import { generateMqttCredential } from "./generate-credential";
import type { PoleCreateInput } from "../pole.schema";

export async function createPole(input: PoleCreateInput, requestUserId: number) {
  if (await poleRepository.findByName(input.poleName)) {
    throw new DuplicateError(ErrorCode.POLE_DUPLICATE_NAME, "ชื่อเสานี้มีอยู่แล้ว");
  }
  if (input.ddnsHostname && (await poleRepository.findByDdnsHostname(input.ddnsHostname))) {
    throw new DuplicateError(ErrorCode.POLE_DUPLICATE_DDNS, "DDNS hostname นี้มีอยู่แล้ว");
  }

  const cred = await generateMqttCredential(input.poleName);

  const pole = await poleRepository.create({
    ...input,
    mqttUsername: cred.mqttUsername,
    mqttPasswordHash: cred.mqttPasswordHash,
    createdBy: requestUserId,
  });

  auditService.log({
    userId: requestUserId,
    action: AuditAction.CREATE,
    module: POLE_ENTITY,
    targetId: pole.id,
    payload: { poleName: pole.poleName, installPlace: pole.installPlace },
  });

  // ⚠️ plain password return ครั้งเดียวที่นี่ — frontend ต้อง copy ไปใส่ในเสา
  return {
    pole,
    mqttPassword: cred.mqttPasswordPlain,
  };
}
