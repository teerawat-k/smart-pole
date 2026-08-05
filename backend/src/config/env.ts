import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(7766),

  // Database
  DATABASE_URL: z.string().min(1),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES: z.string().default("15m"),
  JWT_REFRESH_EXPIRES: z.string().default("7d"),

  // CORS
  CORS_ORIGIN: z.string().default("http://localhost:7765"),

  // Storage — camera clips: <UPLOAD_DIR>/camera/<poleName>/<YYYY-MM-DD>/<file>.mp4
  UPLOAD_DIR: z.string().default("data/uploads"),

  // MQTT (Mosquitto)
  MQTT_BROKER_URL: z.string().default("mqtt://localhost:7783"),
  MQTT_USERNAME: z.string().default("backend-subscriber"),
  MQTT_PASSWORD: z.string().default(""),
  MQTT_CLIENT_ID: z.string().default("smart-pole-backend"),
  MQTT_TIMESTAMP_DRIFT_MAX_SEC: z.coerce.number().default(300),

  // Pole offline threshold (นาที) — background job mark offline ถ้า lastSeenAt เกิน
  POLE_OFFLINE_THRESHOLD_MINUTES: z.coerce.number().default(5),

  // Logging
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  // ── Sensor Push API (outbound push ข้อมูล sensor → ระบบภายนอก) ──
  // ปิดโดย default — เปิดใช้เมื่อ receiver + key พร้อม (ดู docs/integration/sensor-push-api.md)
  SENSOR_PUSH_ENABLED: z.string().default("false").transform((v) => v === "true"),
  SENSOR_PUSH_RECEIVER_URL: z.string().default(""), // endpoint ปลายทาง (ว่าง = ไม่ยิง)
  SENSOR_PUSH_KEY_ID: z.string().default("spole-2026"),
  SENSOR_PUSH_PRIVATE_KEY: z.string().default(""), // Ed25519 PKCS8 PEM (\\n ได้)
  SENSOR_PUSH_INTERVAL_SEC: z.coerce.number().default(300), // 5 นาที
  SENSOR_PUSH_FRESHNESS_SEC: z.coerce.number().default(240), // 4 นาที
  SENSOR_PUSH_TIMEOUT_MS: z.coerce.number().default(10_000),
  SENSOR_PUSH_MAX_RETRY: z.coerce.number().default(3),
  SENSOR_PUSH_CIRCUIT_FAIL_THRESHOLD: z.coerce.number().default(5),
  SENSOR_PUSH_CIRCUIT_COOLDOWN_SEC: z.coerce.number().default(600), // 10 นาที
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // ใช้ console.error ตรงนี้เพราะ Pino logger ยังไม่ถูก initialize
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isDev = env.NODE_ENV === "development";
export const isProd = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
