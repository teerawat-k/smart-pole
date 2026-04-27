// ── Auth-related constants ─────────────────────────────────

// Lockout policy:
//  fail 1-3 → no lock
//  fail 4-6 → lock 10 min
//  fail 7-9 → lock 30 min
//  fail ≥ 10 → status = "locked" (admin must unlock)
export const LOCKOUT_TIERS = [
  { failsAt: 4, durationMs: 10 * 60 * 1000 },
  { failsAt: 7, durationMs: 30 * 60 * 1000 },
] as const;
export const PERMANENT_LOCK_THRESHOLD = 10;

export const REFRESH_TOKEN_BYTES = 32;

export const FAIL_REASONS = {
  USER_NOT_FOUND: "user_not_found",
  ACCOUNT_DISABLED: "account_disabled",
  ACCOUNT_LOCKED: "account_locked",
  WRONG_PASSWORD: "wrong_password",
  WRONG_CAPTCHA: "wrong_captcha",
} as const;
