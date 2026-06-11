// ── Permission guard middleware (Elysia beforeHandle) ─────
//
// ใช้ใน controller route หลัง .use(authGuard):
//   .post("/", handler, {
//     body: schema,
//     beforeHandle: requirePermission("pole:create"),
//   })
//
// Admin role (isSystem=true) bypass ทุก permission
// Cache role permissions ใน-memory 60s (invalidate auto เมื่อ TTL หมด)

import { prisma } from "@/plugins/prisma";
import { ForbiddenError } from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";

const ADMIN_ROLE = "admin" as const;
const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  perms: Set<string>;
  expires: number;
}

const cache = new Map<string, CacheEntry>();

async function loadRolePermissions(roleName: string): Promise<Set<string>> {
  const role = await prisma.role.findFirst({
    where: { name: roleName, deletedAt: null },
    select: {
      permissions: {
        select: {
          permission: { select: { module: true, action: true } },
        },
      },
    },
  });
  if (!role) return new Set();
  return new Set(
    role.permissions.map((rp) => `${rp.permission.module}:${rp.permission.action}`),
  );
}

async function getPermissions(roleName: string): Promise<Set<string>> {
  const now = Date.now();
  const cached = cache.get(roleName);
  if (cached && cached.expires > now) return cached.perms;

  const perms = await loadRolePermissions(roleName);
  cache.set(roleName, { perms, expires: now + CACHE_TTL_MS });
  return perms;
}

/** ล้าง cache (เรียกเมื่อ role permissions ถูกแก้ผ่าน UI) */
export function invalidatePermissionCache(roleName?: string): void {
  if (roleName) {
    cache.delete(roleName);
  } else {
    cache.clear();
  }
}

interface AuthedContext {
  user: { id: number; role: string };
}

/**
 * Require ≥ 1 permission ใน list
 * @example
 *   beforeHandle: requirePermission("pole:create")
 *   beforeHandle: requirePermission("pole:edit", "pole:create")  // อย่างน้อย 1 ใน 2
 */
export function requirePermission(...required: string[]): (ctx: AuthedContext) => Promise<void> {
  return async (ctx) => {
    // Admin bypass
    if (ctx.user.role === ADMIN_ROLE) return;

    const perms = await getPermissions(ctx.user.role);
    const has = required.some((p) => perms.has(p));
    if (!has) {
      throw new ForbiddenError(
        ErrorCode.AUTH_FORBIDDEN,
        "ไม่มีสิทธิ์ในการดำเนินการนี้",
      );
    }
  };
}
