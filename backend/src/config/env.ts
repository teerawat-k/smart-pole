import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(7766),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES: z.string().default("15m"),
  JWT_REFRESH_EXPIRES: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("http://localhost:7765"),
  UPLOAD_DIR: z.string().default("uploads"),
  LOG_LEVEL: z.string().default("info"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // ใช้ console.error ตรงนี้เพราะ Pino logger ยังไม่ถูก initialize
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
