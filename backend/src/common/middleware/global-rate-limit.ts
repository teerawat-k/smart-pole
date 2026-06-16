// ── Global Rate Limit (per IP) — เพิ่มจาก login/refresh ที่มีอยู่แล้ว ─────
//
// ตาม CLAUDE.md Rate Limiting:
//   Mutation (POST/PATCH/PUT/DELETE) : 60 req/min per IP
//   GET                              : 200 req/min per IP
//   /auth/login + /auth/refresh      : handled separately ใน auth.controller (10/20 req/min)
//
// Skip:
//   /health, /health/ready, /metrics  : system endpoints
//   /auth/login, /auth/refresh        : มี rate limit ของตัวเอง
//   /uploads/*                        : static files (Cache-Control จัดการ)
//
// ⚠️ ตอนนี้ key = IP เท่านั้น (per-user limit ทำ override ที่ controller ได้ถ้าจำเป็น)
//   Multi-instance backend → ต้องเปลี่ยน enforceRateLimit เป็น Redis backed

import { Elysia } from "elysia";
import { enforceRateLimit } from "./rate-limit";

const SKIP_EXACT = new Set<string>([
  "/health",
  "/health/ready",
  "/metrics",
  "/api/auth/login",
  "/api/auth/refresh",
]);

const SKIP_PREFIX: readonly string[] = [
  "/uploads/",
  "/swagger",
] as const;

const MUTATION_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

function shouldSkip(method: string, path: string): boolean {
  if (method === "OPTIONS") return true;       // CORS preflight
  if (SKIP_EXACT.has(path)) return true;
  if (SKIP_PREFIX.some((p) => path.startsWith(p))) return true;
  if (!path.startsWith("/api/")) return true;  // non-API paths ไม่ rate limit
  return false;
}

function extractIp(request: Request, server: { requestIP?: (req: Request) => { address: string } | null } | null): string {
  const fwd = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (fwd) return fwd;
  if (server?.requestIP) {
    const addr = server.requestIP(request)?.address;
    if (addr) return addr;
  }
  return "unknown";
}

export const globalRateLimitPlugin = new Elysia({ name: "global-rate-limit" })
  .onRequest(({ request, server }) => {
    const url = new URL(request.url);
    if (shouldSkip(request.method, url.pathname)) return;

    const isMutation = MUTATION_METHODS.has(request.method);
    const ip = extractIp(request, server);

    enforceRateLimit(ip, {
      keyPrefix: isMutation ? "mut-ip" : "get-ip",
      windowMs: 60_000,
      max:       isMutation ? 60 : 200,
    });
  });
