import pino from "pino";
import { env, isProd } from "@/config/env";

// ── Pino logger ────────────────────────────────────────────
// Production: JSON structured (พร้อมส่งเข้า log aggregator)
// Dev/test: pino-pretty (อ่านง่ายในคอนโซล)
export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: "smart-pole-backend" },
  redact: {
    paths: ["password", "passwordHash", "token", "accessToken", "refreshToken", "secret", "*.password", "*.token"],
    censor: "***",
  },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  ...(isProd
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname,service" },
        },
      }),
});
