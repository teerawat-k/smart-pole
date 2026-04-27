import { describe, test, expect, mock, beforeEach } from "bun:test";
import { ErrorCode } from "@/common/errors/codes";
import { expectError } from "@/common/test-helpers/expect-error";

// ── Mock setup ────────────────────────────────────────────
const mockFindMany = mock(async () => ({ data: [], total: 0 }));
const mockFindById = mock(async (_id: number) => null as unknown);
const mockFindByName = mock(async (_name: string) => null as unknown);
const mockFindLookup = mock(async () => [] as unknown[]);
const mockListPermissions = mock(async () => [] as unknown[]);
const mockCreate = mock(async (_data: unknown) => ({ id: 5 }) as unknown);
const mockUpdate = mock(async (_id: number, _data: unknown) => ({ id: 5 }) as unknown);
const mockSoftDelete = mock(async (_id: number, _by: number) => undefined);
const mockSetPermissions = mock(async (_id: number, _ids: number[]) => undefined);
const mockCountUsers = mock(async (_id: number) => 0);

mock.module("./role.repository", () => ({
  roleRepository: {
    findMany: mockFindMany,
    findById: mockFindById,
    findByName: mockFindByName,
    findLookup: mockFindLookup,
    listPermissions: mockListPermissions,
    create: mockCreate,
    update: mockUpdate,
    softDelete: mockSoftDelete,
    setPermissions: mockSetPermissions,
    countUsers: mockCountUsers,
  },
}));

const mockAuditLog = mock(() => {});
mock.module("@/modules/audit", () => ({
  auditService: { log: mockAuditLog },
  AuditAction: {
    CREATE: "CREATE",
    UPDATE: "UPDATE",
    DELETE: "DELETE",
  },
}));

const mockInvalidateCache = mock(() => {});
mock.module("@/common/middleware/rbac", () => ({
  invalidatePermissionCache: mockInvalidateCache,
}));

// ปิด prisma transaction (service เรียก prisma.$transaction ตอน create role)
mock.module("@/plugins/prisma", () => ({
  prisma: {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
  },
}));

const { roleService } = await import("./role.service");

// ── Reset ─────────────────────────────────────────────────
beforeEach(() => {
  for (const m of [
    mockFindMany,
    mockFindById,
    mockFindByName,
    mockFindLookup,
    mockListPermissions,
    mockCreate,
    mockUpdate,
    mockSoftDelete,
    mockSetPermissions,
    mockCountUsers,
    mockAuditLog,
    mockInvalidateCache,
  ]) {
    m.mockReset();
  }
});

describe("roleService.list", () => {
  test("ส่งคืนผลจาก repository.findMany", async () => {
    mockFindMany.mockResolvedValueOnce({ data: [{ id: 1 }, { id: 2 }], total: 2 });
    const result = await roleService.list({ page: 1, limit: 20 });
    expect(result.total).toBe(2);
    expect(result.data).toHaveLength(2);
  });
});

describe("roleService.getById", () => {
  test("ส่งคืน role เมื่อพบ", async () => {
    mockFindById.mockResolvedValueOnce({ id: 1, name: "admin" });
    const result = await roleService.getById(1);
    expect(result).toMatchObject({ id: 1, name: "admin" });
  });

  test("throw NotFoundError เมื่อไม่พบ", async () => {
    mockFindById.mockResolvedValueOnce(null);
    await expectError(roleService.getById(999), ErrorCode.ROLE_NOT_FOUND);
  });
});

describe("roleService.create", () => {
  test("สร้าง role ใหม่ + เรียก audit log", async () => {
    mockFindByName.mockResolvedValueOnce(null);
    mockCreate.mockResolvedValueOnce({ id: 5, name: "viewer" });
    await roleService.create({ name: "viewer", permissionIds: [1, 2, 3] }, 99);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockSetPermissions).toHaveBeenCalledTimes(1);
    expect(mockAuditLog).toHaveBeenCalledTimes(1);
  });

  test("throw DuplicateError เมื่อชื่อซ้ำ", async () => {
    mockFindByName.mockResolvedValueOnce({ id: 1, name: "admin", isSystem: true });
    await expectError(
      roleService.create({ name: "admin", permissionIds: [] }, 99),
      ErrorCode.ROLE_DUPLICATE_NAME,
    );
  });

  test("ไม่เรียก setPermissions เมื่อ permissionIds ว่าง", async () => {
    mockFindByName.mockResolvedValueOnce(null);
    mockCreate.mockResolvedValueOnce({ id: 5, name: "viewer" });
    await roleService.create({ name: "viewer", permissionIds: [] }, 99);
    expect(mockSetPermissions).not.toHaveBeenCalled();
  });
});

describe("roleService.update", () => {
  test("อัปเดต description ปกติ", async () => {
    mockFindById.mockResolvedValueOnce({ id: 5, name: "viewer", isSystem: false, description: "old" });
    mockUpdate.mockResolvedValueOnce({ id: 5, description: "new" });
    await roleService.update(5, { description: "new" }, 99);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockAuditLog).toHaveBeenCalledTimes(1);
  });

  test("throw ForbiddenError เมื่อแก้ system role", async () => {
    mockFindById.mockResolvedValueOnce({ id: 1, name: "admin", isSystem: true });
    await expectError(roleService.update(1, { description: "x" }, 99), ErrorCode.ROLE_IS_SYSTEM);
  });

  test("throw NotFoundError เมื่อไม่พบ", async () => {
    mockFindById.mockResolvedValueOnce(null);
    await expectError(roleService.update(999, {}, 99), ErrorCode.ROLE_NOT_FOUND);
  });
});

describe("roleService.delete", () => {
  test("soft delete + invalidate cache + audit", async () => {
    mockFindById.mockResolvedValueOnce({ id: 5, name: "viewer", isSystem: false });
    mockCountUsers.mockResolvedValueOnce(0);
    await roleService.delete(5, 99);
    expect(mockSoftDelete).toHaveBeenCalledTimes(1);
    expect(mockInvalidateCache).toHaveBeenCalledWith("viewer");
    expect(mockAuditLog).toHaveBeenCalledTimes(1);
  });

  test("throw ConflictError เมื่อมี user อ้างถึง", async () => {
    mockFindById.mockResolvedValueOnce({ id: 5, name: "viewer", isSystem: false });
    mockCountUsers.mockResolvedValueOnce(3);
    await expectError(roleService.delete(5, 99), ErrorCode.ROLE_HAS_USERS);
  });

  test("throw ForbiddenError เมื่อลบ system role", async () => {
    mockFindById.mockResolvedValueOnce({ id: 1, name: "admin", isSystem: true });
    await expectError(roleService.delete(1, 99), ErrorCode.ROLE_IS_SYSTEM);
  });
});

describe("roleService.setPermissions", () => {
  test("set permissions + invalidate cache", async () => {
    mockFindById.mockResolvedValueOnce({ id: 5, name: "viewer", isSystem: false });
    mockFindById.mockResolvedValueOnce({ id: 5, name: "viewer", isSystem: false, permissions: [] });
    await roleService.setPermissions(5, { permissionIds: [1, 2, 3] }, 99);
    expect(mockSetPermissions).toHaveBeenCalledWith(5, [1, 2, 3]);
    expect(mockInvalidateCache).toHaveBeenCalledWith("viewer");
  });

  test("throw ForbiddenError เมื่อ system role", async () => {
    mockFindById.mockResolvedValueOnce({ id: 1, name: "admin", isSystem: true });
    await expectError(
      roleService.setPermissions(1, { permissionIds: [] }, 99),
      ErrorCode.ROLE_IS_SYSTEM,
    );
  });
});
