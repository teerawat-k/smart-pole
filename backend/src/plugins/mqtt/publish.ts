// ── MQTT publish — downlink command ไปยังเสา ───────────────
// ใช้ client เดียวกับ subscriber (backend-subscriber มี ACL readwrite smartpole/#)
import { getMqttClient } from "./client";
import { logger } from "@/plugins/logger";
import { AppError } from "@/common/errors/app-error";
import { ErrorCode } from "@/common/errors/codes";

export interface PoleCommand {
  action: string;
  ttl?: number;
}

// publish JSON command ไป smartpole/<pole>/cmd (QoS 1) — throw ถ้า broker ไม่พร้อม/publish พลาด
export async function publishPoleCommand(poleName: string, command: PoleCommand): Promise<void> {
  const client = getMqttClient();
  if (!client || !client.connected) {
    throw new AppError(503, ErrorCode.MQTT_PUBLISH_FAILED, "MQTT broker ไม่พร้อม — ส่งคำสั่งไปยังเสาไม่ได้");
  }

  const topic = `smartpole/${poleName}/cmd`;
  await new Promise<void>((resolve, reject) => {
    client.publish(topic, JSON.stringify(command), { qos: 1 }, (err) => {
      if (err) reject(new AppError(503, ErrorCode.MQTT_PUBLISH_FAILED, "ส่งคำสั่งไปยังเสาไม่สำเร็จ"));
      else resolve();
    });
  });

  logger.info({ poleName, action: command.action }, "MQTT: published pole command");
}
