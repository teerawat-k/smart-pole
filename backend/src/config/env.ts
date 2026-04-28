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
