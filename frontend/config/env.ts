import { z } from "zod";

// URL env vars ทั้งหมดเป็น optional (default "") — frontend ใช้ relative URL
// ผ่าน lib/runtime-url.ts ทำให้ใช้งานได้ทั้ง HTTP (port 7765) และ HTTPS (nginx)
const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().default(""),
  NEXT_PUBLIC_WS_URL: z.string().default(""),
  NEXT_PUBLIC_PROJECT_PREFIX: z.string().min(1),
  // SRS HLS base URL — empty = ใช้ /hls relative path
  NEXT_PUBLIC_HLS_BASE: z.string().default(""),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  NEXT_PUBLIC_PROJECT_PREFIX: process.env.NEXT_PUBLIC_PROJECT_PREFIX,
  NEXT_PUBLIC_HLS_BASE: process.env.NEXT_PUBLIC_HLS_BASE,
  NODE_ENV: process.env.NODE_ENV,
});

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
export const isDev = env.NODE_ENV === "development";
