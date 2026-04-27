// ── Atom: verify username/password + check user status ────
import { userRepository } from "@/modules/user/user.repository";
import { authRepository } from "../auth.repository";
import { verifyPassword } from "@/common/utils/password";
import { computeLockout } from "./compute-lockout";
import { FAIL_REASONS } from "../auth.constants";

export type VerifyResult =
  | { ok: true; user: { id: number; username: string; status: string; roleId: number; roleName: string; tokenVersion: number } }
  | { ok: false; reason: keyof typeof FAIL_REASONS_REVERSE; remainingMinutes?: number; userId?: number; usernameSnap?: string };

const FAIL_REASONS_REVERSE = {
  USER_NOT_FOUND: "USER_NOT_FOUND",
  ACCOUNT_DISABLED: "ACCOUNT_DISABLED",
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  WRONG_PASSWORD: "WRONG_PASSWORD",
} as const;

export async function verifyCredentials(username: string, password: string): Promise<VerifyResult> {
  const user = await userRepository.findByUsername(username);
  if (!user) {
    return { ok: false, reason: "USER_NOT_FOUND", usernameSnap: username };
  }

  if (user.status === "disabled") {
    return { ok: false, reason: "ACCOUNT_DISABLED", userId: user.id, usernameSnap: username };
  }

  // soft-lock จาก lockedUntil
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
    return {
      ok: false,
      reason: "ACCOUNT_LOCKED",
      userId: user.id,
      usernameSnap: username,
      remainingMinutes: remaining,
    };
  }

  // hard-lock จาก status=locked
  if (user.status === "locked") {
    return {
      ok: false,
      reason: "ACCOUNT_LOCKED",
      userId: user.id,
      usernameSnap: username,
    };
  }

  const passwordOk = await verifyPassword(user.password, password);
  if (!passwordOk) {
    // increment fail count + apply lockout policy
    const newFailCount = user.loginFailCount + 1;
    const decision = computeLockout(newFailCount);
    if (decision.permanent) {
      await authRepository.setStatusLocked(user.id, "too_many_attempts");
      return { ok: false, reason: "ACCOUNT_LOCKED", userId: user.id, usernameSnap: username };
    }
    await authRepository.incrementFailCount(
      user.id,
      decision.lockedUntil,
      decision.lockedUntil ? "too_many_attempts" : null,
    );
    return {
      ok: false,
      reason: "WRONG_PASSWORD",
      userId: user.id,
      usernameSnap: username,
      remainingMinutes: decision.lockedUntil
        ? Math.ceil((decision.lockedUntil.getTime() - Date.now()) / 60_000)
        : undefined,
    };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      status: user.status,
      roleId: user.roleId,
      roleName: user.role.name,
      tokenVersion: user.tokenVersion,
    },
  };
}

void FAIL_REASONS; // suppress unused (kept for future thai message lookup)
