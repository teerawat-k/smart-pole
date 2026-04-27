// ── Atom: issue access + refresh token pair ────────────────
import { randomBytes, createHash, randomUUID } from "node:crypto";
import { authRepository } from "../auth.repository";
import { REFRESH_TOKEN_BYTES } from "../auth.constants";
import { env } from "@/config/env";

export interface IssuedTokens {
  refreshToken: string;
  refreshTokenHash: string;
  refreshExpiresAt: Date;
  family: string;
  refreshTokenId: number;
}

/**
 * Generate refresh token (random 32 bytes hex) + hash + persist
 * - access token signed by Elysia jwt plugin (ใน controller)
 * - refresh token plain return ครั้งเดียว — DB เก็บ hash
 */
export async function issueRefreshToken(opts: {
  userId: number;
  family?: string; // ใส่ family ถ้า rotate (track lineage); ไม่ใส่ = สร้าง family ใหม่
  ipAddress?: string;
  userAgent?: string;
}): Promise<IssuedTokens> {
  const refreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
  const refreshTokenHash = createHash("sha256").update(refreshToken).digest("hex");
  const family = opts.family ?? randomUUID();
  const expiresAt = parseExpiresIn(env.JWT_REFRESH_EXPIRES);

  const created = await authRepository.createRefreshToken({
    userId: opts.userId,
    tokenHash: refreshTokenHash,
    family,
    expiresAt,
    ipAddress: opts.ipAddress,
    userAgent: opts.userAgent,
  });

  return {
    refreshToken,
    refreshTokenHash,
    refreshExpiresAt: created.expiresAt,
    family,
    refreshTokenId: created.id,
  };
}

/** "7d" / "15m" / "30s" → Date in future */
function parseExpiresIn(input: string): Date {
  const match = /^(\d+)([smhd])$/.exec(input);
  if (!match) throw new Error(`Invalid expires_in format: ${input}`);
  const n = Number(match[1]);
  const unit = match[2];
  const ms =
    unit === "s" ? n * 1000 : unit === "m" ? n * 60_000 : unit === "h" ? n * 3_600_000 : n * 86_400_000;
  return new Date(Date.now() + ms);
}
