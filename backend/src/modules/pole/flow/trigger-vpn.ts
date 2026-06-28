// ── Atom: trigger on-demand VPN tunnel ของเสา (publish MQTT cmd + audit) ──
// concern: control-plane เดียว — validate เสา → ส่ง cmd ผ่าน broker → audit (security-sensitive)
// ไม่แตะ DB write (เป็น command ไม่ใช่ state change) → ไม่ต้อง tx
import { poleRepository } from "../pole.repository";
import { publishPoleCommand } from "@/plugins/mqtt";
import { auditService, AuditAction } from "@/modules/audit";
import { NotFoundError } from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";
import { POLE_ENTITY } from "../pole.constants";
import type { PoleVpnInput } from "../pole.schema";

const DEFAULT_TTL = 1800; // 30 นาที — ตรงกับ smartpole-vpn-agent

export interface VpnTriggerResult {
  poleName: string;
  action: "open" | "close";
  ttl?: number;
}

export async function triggerVpn(
  id: number,
  input: PoleVpnInput,
  requestUserId: number,
): Promise<VpnTriggerResult> {
  const pole = await poleRepository.findById(id);
  if (!pole) throw new NotFoundError(ErrorCode.POLE_NOT_FOUND, "ไม่พบเสาที่ระบุ");

  const ttl = input.action === "open" ? (input.ttl ?? DEFAULT_TTL) : undefined;
  await publishPoleCommand(pole.poleName, { action: `vpn-${input.action}`, ttl });

  auditService.log({
    userId: requestUserId,
    action: input.action === "open" ? AuditAction.VPN_OPEN : AuditAction.VPN_CLOSE,
    module: POLE_ENTITY,
    targetId: id,
    payload: { poleName: pole.poleName, action: input.action, ttl },
  });

  return { poleName: pole.poleName, action: input.action, ttl };
}
