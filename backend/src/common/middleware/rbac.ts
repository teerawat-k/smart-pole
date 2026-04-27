import { ForbiddenError } from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";
import { fetchRoleWithPermissions } from "./rbac.repository";

// ── Permission Cache ──────────────────────────────────────
// in-memory Map<roleName, CachedRole> — TTL ไม่จำเป็นเพราะ invalidate ตอน mutation
// ผ่าน event ใน E03 (Role module)

interface CachedRole {
  isSystem: boolean;
  permissions: Set<string>;
}

const permissionCache = new Map<string, CachedRole>();

async function getCachedRole(roleName: string): Promise<CachedRole> {
  const cached = permissionCache.get(roleName);
  if (cached) return cached;

  const role = await fetchRoleWithPermissions(roleName);
  const entry: CachedRole = {
    isSystem: role?.isSystem ?? false,
    permissions: new Set(
      role?.permissions.map((rp) => `${rp.permission.module}:${rp.permission.action}`) ?? [],
    ),
  };
  permissionCache.set(roleName, entry);
  return entry;
}

/** ล้าง cache — เรียกเมื่อแก้ไข role permissions */
export function invalidatePermissionCache(roleName?: string): void {
  if (roleName) {
    permissionCache.delete(roleName);
  } else {
    permissionCache.clear();
  }
}

/** ตรวจว่า role มี permission หรือไม่ (isSystem bypass ทั้งหมด) */
export async function hasPermission(roleName: string, permission: string): Promise<boolean> {
  const role = await getCachedRole(roleName);
  if (role.isSystem) return true;
  return role.permissions.has(permission);
}

/**
 * ตรวจ permission จาก DB (cached) — ใช้ใน Elysia `beforeHandle`
 *
 * @example
 * .get("/", handler, { beforeHandle: requirePermission("pole:view") })
 * .guard({ beforeHandle: requirePermission("pole:create") }, (app) => app
 *   .post("/", createHandler)
 * )
 */
export function requirePermission(permission: `${string}:${string}`) {
  return async (context: Record<string, unknown>): Promise<void> => {
    const user = context.user;
    if (!user || typeof user !== "object" || !("role" in user)) {
      throw new ForbiddenError(ErrorCode.AUTH_FORBIDDEN, "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้");
    }
    const role = await getCachedRole(String(user.role));
    if (role.isSystem) return;
    if (!role.permissions.has(permission)) {
      throw new ForbiddenError(ErrorCode.AUTH_FORBIDDEN, "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้");
    }
  };
}
