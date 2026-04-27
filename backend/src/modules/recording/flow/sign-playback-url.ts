// ── Atom: sign playback URL (JWT-signed token) ────────────
import { jwt as elysiaJwt } from "@elysiajs/jwt";
import { Elysia } from "elysia";
import { env } from "@/config/env";
import { PLAYBACK_TOKEN_TTL_SEC } from "../recording.constants";

// We use Elysia's jwt by creating a one-off instance — alternatively use @elysiajs/jwt low-level
// For simplicity — สร้าง JWT helper ผ่าน Elysia.use() pattern ภายใน
// แต่ใน atom function ต้องการ sign โดยไม่มี request context → ใช้ jose หรือ jsonwebtoken
// Solution: ใช้ elysia internal jwt ผ่าน app instance singleton
// Simpler: ใช้ HMAC sign แบบมือ

import { createHmac } from "node:crypto";

export interface PlaybackToken {
  recordingId: string;
  userId: number;
  exp: number;
}

/** sign HMAC token: payload (base64url) + sig (HMAC sha256) */
export function signPlaybackToken(recordingId: bigint, userId: number): string {
  const payload: PlaybackToken = {
    recordingId: recordingId.toString(),
    userId,
    exp: Math.floor(Date.now() / 1000) + PLAYBACK_TOKEN_TTL_SEC,
  };
  const data = base64url(JSON.stringify(payload));
  const sig = createHmac("sha256", env.JWT_SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyPlaybackToken(token: string): PlaybackToken | null {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expectedSig = createHmac("sha256", env.JWT_SECRET).update(data).digest("base64url");
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as PlaybackToken;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function base64url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

void elysiaJwt;
void Elysia; // suppress unused
