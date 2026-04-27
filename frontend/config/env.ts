import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_WS_URL: z.string().min(1).default("ws://localhost:7766/ws"),
  NEXT_PUBLIC_HLS_BASE: z.string().min(1).default("http://localhost:7780"),
  NEXT_PUBLIC_PROJECT_PREFIX: z.string().min(1),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  NEXT_PUBLIC_HLS_BASE: process.env.NEXT_PUBLIC_HLS_BASE,
  NEXT_PUBLIC_PROJECT_PREFIX: process.env.NEXT_PUBLIC_PROJECT_PREFIX,
  NODE_ENV: process.env.NODE_ENV,
});

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
export const isDev = env.NODE_ENV === "development";
