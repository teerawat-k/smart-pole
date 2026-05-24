// ── MQTT payload schemas (Zod) ─────────────────────────────
import { z } from "zod";

/**
 * smartpole/<poleName>/sensor
 *
 * `poleName` มาจาก topic — ไม่อยู่ใน payload (single source of truth)
 * `timestamp` = Unix epoch (วินาทีหรือมิลลิวินาที — backend แปลงเก็บตามที่ส่ง)
 */
export const sensorMessageSchema = z.object({
  timestamp:   z.number().int().min(0),
  seq:         z.number().int().min(0),
  pm25:        z.number().min(0).max(1000).optional(),
  temperature: z.number().min(-40).max(80).optional(),
  humidity:    z.number().min(0).max(100).optional(),
});

export type SensorMessage = z.infer<typeof sensorMessageSchema>;
