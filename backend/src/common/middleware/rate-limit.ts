// ── Rate Limit (in-memory, fixed window) ───────────────────
// ใช้ป้องกัน brute-force ที่ login/refresh — single-instance dev เพียงพอ
// production multi-instance: ต้องเปลี่ยนเป็น Redis
import { RateLimitError } from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";

interface Bucket {
  count:     number;
  resetAtMs: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  windowMs: number;
  max:      number;
  keyPrefix: string;
}

/**
 * เรียกตอน beforeHandle — throw RateLimitError ถ้าเกิน
 * key = `${keyPrefix}:${identity}` (identity = ip หรือ userId)
 */
export function enforceRateLimit(identity: string, opts: RateLimitOptions): void {
  const now = Date.now();
  const key = `${opts.keyPrefix}:${identity}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAtMs <= now) {
    buckets.set(key, { count: 1, resetAtMs: now + opts.windowMs });
    return;
  }

  if (bucket.count >= opts.max) {
    const retryAfterSec = Math.ceil((bucket.resetAtMs - now) / 1000);
    throw new RateLimitError(
      ErrorCode.COMMON_RATE_LIMIT,
      `เรียกใช้บ่อยเกินกำหนด ลองใหม่ใน ${retryAfterSec} วินาที`,
    );
  }

  bucket.count += 1;
}

/** cleanup expired buckets (เรียกจาก scheduler) */
export function cleanupRateLimitBuckets(): number {
  const now = Date.now();
  let removed = 0;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAtMs <= now) {
      buckets.delete(key);
      removed++;
    }
  }
  return removed;
}
