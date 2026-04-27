// ── Orchestrator: login flow ───────────────────────────────
// Steps:
//  1) verify captcha (skip → log captcha_fail + reject)
//  2) verify credentials (atom)
//  3) on success: reset fail count + lastLoginAt
//  4) issue refresh token (atom) → access token signed by caller (controller has jwt sign)
//  5) audit + system log
//  6) return tokens + user info
import { authRepository } from "../auth.repository";
import { captchaService } from "@/modules/captcha";
import { verifyCredentials } from "./verify-credentials";
import { issueRefreshToken } from "./issue-tokens";
import { auditService, AuditAction } from "@/modules/audit";
import { UnauthorizedError, ForbiddenError, ValidationError } from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";
import { FAIL_REASONS } from "../auth.constants";

export interface LoginContext {
  username: string;
  password: string;
  sessionKey: string;
  captchaInput: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginResult {
  user: { id: number; username: string; roleId: number; roleName: string; tokenVersion: number };
  refreshToken: string;
  refreshExpiresAt: Date;
}

export async function login(ctx: LoginContext): Promise<LoginResult> {
  // 1. verify captcha
  const captchaOk = await captchaService.verify(ctx.sessionKey, ctx.captchaInput);
  if (!captchaOk) {
    await authRepository.logSystem({
      logType: "captcha_fail",
      usernameSnap: ctx.username,
      failReason: FAIL_REASONS.WRONG_CAPTCHA,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    throw new ValidationError(ErrorCode.AUTH_CAPTCHA_INVALID, "captcha ไม่ถูกต้องหรือหมดอายุ");
  }

  // 2. verify credentials
  const verified = await verifyCredentials(ctx.username, ctx.password);
  if (!verified.ok) {
    await authRepository.logSystem({
      logType: "login_fail",
      userId: verified.userId,
      usernameSnap: verified.usernameSnap ?? ctx.username,
      failReason: FAIL_REASONS[verified.reason as keyof typeof FAIL_REASONS] ?? verified.reason.toLowerCase(),
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    if (verified.reason === "ACCOUNT_DISABLED") {
      throw new ForbiddenError(ErrorCode.AUTH_DISABLED, "บัญชีถูกปิดใช้งาน — กรุณาติดต่อผู้ดูแล");
    }
    if (verified.reason === "ACCOUNT_LOCKED") {
      const minutes = verified.remainingMinutes;
      throw new ForbiddenError(
        ErrorCode.AUTH_LOCKED,
        minutes ? `บัญชีถูกล็อก กรุณารอ ${minutes} นาที` : "บัญชีถูกล็อก — กรุณาติดต่อผู้ดูแล",
      );
    }
    throw new UnauthorizedError(ErrorCode.AUTH_INVALID_CREDENTIALS, "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
  }

  // 3. on success — reset fail count
  await authRepository.resetFailAndMarkLogin(verified.user.id);

  // 4. issue refresh token (access token signed in controller via jwt plugin)
  const tokens = await issueRefreshToken({
    userId: verified.user.id,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });

  // 5. audit + system log
  await authRepository.logSystem({
    logType: "login_success",
    userId: verified.user.id,
    usernameSnap: verified.user.username,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });
  auditService.log({
    userId: verified.user.id,
    action: AuditAction.LOGIN,
    module: "auth",
    targetId: verified.user.id,
  });

  return {
    user: verified.user,
    refreshToken: tokens.refreshToken,
    refreshExpiresAt: tokens.refreshExpiresAt,
  };
}
