// ── Atom: regenerate MQTT credential ───────────────────────
// ใช้เมื่อ password leak / rotation policy
// ⚠️ ส่ง plain password กลับครั้งเดียว — ของเก่าใช้ไม่ได้แล้ว
import { poleRepository } from "../pole.repository";
import { auditService, AuditAction } from "@/modules/audit";
import { NotFoundError } from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";
import { POLE_ENTITY } from "../pole.constants";
import { generateMqttCredential } from "./generate-credential";

export async function regenerateMqttCredential(id: number, requestUserId: number) {
  const pole = await poleRepository.findById(id);
  if (!pole) throw new NotFoundError(ErrorCode.POLE_NOT_FOUND, "ไม่พบเสาที่ระบุ");

  const cred = await generateMqttCredential(pole.poleName);

  await poleRepository.updateMqttCredential(id, {
    mqttUsername: cred.mqttUsername,
    mqttPasswordHash: cred.mqttPasswordHash,
    updatedBy: requestUserId,
  });

  auditService.log({
    userId: requestUserId,
    action: AuditAction.UPDATE,
    module: POLE_ENTITY,
    targetId: id,
    payload: { event: "regenerate_mqtt_credential" },
  });

  return {
    mqttUsername: cred.mqttUsername,
    mqttPassword: cred.mqttPasswordPlain,
  };
}
