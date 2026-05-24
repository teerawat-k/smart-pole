// ── Atom: generate MQTT credential for a pole ──────────────
// mqttUsername = poleName (ตรงกับ Mosquitto ACL pattern `smartpole/%u/#`)
// returns plain password ครั้งเดียว — DB เก็บ argon2 hash
import { randomBytes } from "node:crypto";
import { hashPassword } from "@/common/utils/password";

const PASSWORD_BYTES = 32;

export interface GeneratedCredential {
  mqttUsername: string;
  mqttPasswordPlain: string;
  mqttPasswordHash: string;
}

export async function generateMqttCredential(poleName: string): Promise<GeneratedCredential> {
  const mqttUsername = poleName;
  const mqttPasswordPlain = randomBytes(PASSWORD_BYTES).toString("hex");
  const mqttPasswordHash = await hashPassword(mqttPasswordPlain);
  return { mqttUsername, mqttPasswordPlain, mqttPasswordHash };
}
