// ── Atom: คำนวณ lockout duration จาก fail count ──────────
import { LOCKOUT_TIERS, PERMANENT_LOCK_THRESHOLD } from "../auth.constants";

export interface LockoutDecision {
  permanent: boolean; // true = ตั้ง status=locked (admin ต้อง unlock)
  lockedUntil: Date | null; // null = ไม่ lock (1-3 fails)
}

export function computeLockout(failCount: number): LockoutDecision {
  if (failCount >= PERMANENT_LOCK_THRESHOLD) {
    return { permanent: true, lockedUntil: null };
  }

  // หา tier ที่ตรง — เริ่มจาก tier ที่ failsAt มากที่สุดแล้ว <= failCount
  const matchingTier = [...LOCKOUT_TIERS]
    .reverse()
    .find((tier) => failCount >= tier.failsAt);

  if (!matchingTier) {
    return { permanent: false, lockedUntil: null };
  }

  return {
    permanent: false,
    lockedUntil: new Date(Date.now() + matchingTier.durationMs),
  };
}
