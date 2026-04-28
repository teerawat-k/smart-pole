// ── MQTT payload schemas (Zod) ─────────────────────────────
import { z } from "zod";

/** smartpole/sensor — timestamp = Unix epoch (seconds หรือ milliseconds, auto-detect) */
export const sensorMessageSchema = z.object({
  pole_name:   z.string().min(1).max(64),
  timestamp:   z.number().int().min(0),
  seq:         z.number().int().min(0),
  pm25:        z.number().min(0).max(1000).optional(),
  temperature: z.number().min(-40).max(80).optional(),
  humidity:    z.number().min(0).max(100).optional(),
});

export type SensorMessage = z.infer<typeof sensorMessageSchema>;
