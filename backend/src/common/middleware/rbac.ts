import { ForbiddenError } from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";

// Atom: check single permission — ใช้ใน beforeHandle ของ Elysia
export function requirePermission(_role: string, _permission: `${string}:${string}`): void {
  // TODO: เชื่อมกับ rbac.repository ตาม schema จริงของโปรเจค
  // ปัจจุบันเป็น placeholder — ทุก module ที่ยังไม่มี permission seed = อนุญาตทุก authenticated user
  // เมื่อเพิ่ม permission seed แล้ว ให้ implement actual check ที่นี่
  if (false) throw new ForbiddenError(ErrorCode.AUTH_FORBIDDEN, "ไม่มีสิทธิ์เข้าถึง");
}
