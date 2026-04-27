import { describe, test, expect, mock, beforeEach } from "bun:test";
import { ErrorCode } from "@/common/errors/codes";
import { expectError } from "@/common/test-helpers/expect-error";

// ── Mock setup ────────────────────────────────────────────
const mockFindMany = mock(async () => ({ data: [] as unknown[], total: 0 }));
const mockFindById = mock(async (_id: number) => null as unknown);
const mockFindByUsername = mock(async (_u: string) => null as unknown);
const mockFindByEmail = mock(async (_e: string) => null as unknown);
const mockFindLookup = mock(async () => [] as unknown[]);
const mockCreate = mock(async (_data: unknown) => ({ id: 3 }) as unknown);
const mockUpdate = mock(async (_id: number, _data: unknown) => ({ id: 3 }) as unknown);
const mockUpdatePassword = mock(async (_id: number, _hash: string, _by: number) => ({ id: 3, tokenVersion: 2 }));
const mockSetStatus = mock(async (_id: number, _status: string, _by: number) => ({ id: 3 }) as unknown);
const mockUnlock = mock(async (_id: number, _by: number) => ({ id: 3 }) as unknown);
const mockSoftDelete = mock(async (_id: number, _by: number) => undefined);
const mockCountActiveAdmins = mock(async (_id: number) => 5);

mock.module("./user.repository", () => ({
  userRepository: {
    findMany: mockFindMany,
    findById: mockFindById,
    findByUsername: mockFindByUsername,
    findByEmail: mockFindByEmail,
    findLookup: mockFindLookup,
    create: mockCreate,
    update: mockUpdate,
    updatePassword: mockUpdatePassword,
    setStatus: mockSetStatus,
    unlock: mockUnlock,
    softDelete: mockSoftDelete,
    countActiveAdmins: mockCountActiveAdmins,
  },
}));

const mockHashPassword = mock(async (_p: string) => "hashed-pw");
const mockVerifyPassword = mock(async (_h: string, _p: string) => true);
mock.module("@/common/utils/password", () => ({
  hashPassword: mockHashPassword,
  verifyPassword: mockVerifyPassword,
}));

const mockAuditLog = mock(() => {});
mock.module("@/modules/audit", () => ({
  auditService: { log: mockAuditLog },
  AuditAction: {
    CREATE: "CREATE",
    UPDATE: "UPDATE",
    DELETE: "DELETE",
    STATUS_CHANGE: "STATUS_CHANGE",
    UNLOCK: "UNLOCK",
    RESET_PASSWORD: "RESET_PASSWORD",
    CHANGE_PASSWORD: "CHANGE_PASSWORD",
  },
}));

mock.module("@/plugins/prisma", () => ({
  prisma: {
    role: { findUnique: mock(async () => ({ id: 1, name: "admin" })) },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
  },
}));

const { userService } = await import("./user.service");

beforeEach(() => {
  for (const m of [
    mockFindMany, mockFindById, mockFindByUsername, mockFindByEmail, mockFindLookup,
    mockCreate, mockUpdate, mockUpdatePassword, mockSetStatus, mockUnlock,
    mockSoftDelete, mockCountActiveAdmins,
    mockHashPassword, mockVerifyPassword, mockAuditLog,
  ]) {
    m.mockReset();
  }
  mockHashPassword.mockResolvedValue("hashed-pw");
  mockVerifyPassword.mockResolvedValue(true);
});

describe("userService.create", () => {
  test("สร้าง user ใหม่สำเร็จ", async () => {
    mockFindByUsername.mockResolvedValueOnce(null);
    mockFindByEmail.mockResolvedValueOnce(null);
    mockCreate.mockResolvedValueOnce({ id: 3, username: "viewer", email: "v@test.local" });
    const result = await userService.create(
      {
        username: "viewer",
        email: "v@test.local",
        password: "pwd123456",
        firstName: "V",
        lastName: "X",
        roleId: 2,
      },
      1,
    );
    expect(result).toMatchObject({ id: 3 });
    expect(mockHashPassword).toHaveBeenCalledTimes(1);
    expect(mockAuditLog).toHaveBeenCalledTimes(1);
  });

  test("throw DuplicateError เมื่อ username ซ้ำ", async () => {
    mockFindByUsername.mockResolvedValueOnce({ id: 1, username: "admin" });
    await expectError(
      userService.create(
        { username: "admin", email: "x@y", password: "12345abc", firstName: "x", lastName: "y", roleId: 2 },
        1,
      ),
      ErrorCode.USER_DUPLICATE_USERNAME,
    );
  });

  test("throw DuplicateError เมื่อ email ซ้ำ", async () => {
    mockFindByUsername.mockResolvedValueOnce(null);
    mockFindByEmail.mockResolvedValueOnce({ id: 1, email: "x@y" });
    await expectError(
      userService.create(
        { username: "newuser", email: "x@y", password: "12345abc", firstName: "x", lastName: "y", roleId: 2 },
        1,
      ),
      ErrorCode.USER_DUPLICATE_EMAIL,
    );
  });
});

describe("userService.setStatus", () => {
  test("disable user — เรียก repo + audit", async () => {
    mockFindById.mockResolvedValueOnce({ id: 5, username: "u5", role: { name: "user" }, status: "active" });
    mockSetStatus.mockResolvedValueOnce({ id: 5, status: "disabled" });
    await userService.setStatus(5, { status: "disabled" }, 1);
    expect(mockSetStatus).toHaveBeenCalledTimes(1);
    expect(mockAuditLog).toHaveBeenCalledTimes(1);
  });

  test("ห้าม disable ตัวเอง", async () => {
    await expectError(
      userService.setStatus(1, { status: "disabled" }, 1),
      ErrorCode.USER_CANNOT_DELETE_SELF,
    );
  });

  test("ห้าม disable admin คนสุดท้าย", async () => {
    mockFindById.mockResolvedValueOnce({ id: 1, username: "admin", role: { name: "admin" }, status: "active" });
    // ensureNotLastActiveAdmin จะเรียก findById อีกรอบ
    mockFindById.mockResolvedValueOnce({ id: 1, username: "admin", role: { name: "admin" }, status: "active" });
    mockCountActiveAdmins.mockResolvedValueOnce(1);
    await expectError(
      userService.setStatus(1, { status: "disabled" }, 99),
      ErrorCode.USER_LAST_ADMIN,
    );
  });
});

describe("userService.delete", () => {
  test("soft delete + audit", async () => {
    mockFindById.mockResolvedValueOnce({ id: 5, username: "u5", role: { name: "user" } });
    mockFindById.mockResolvedValueOnce({ id: 5, username: "u5", role: { name: "user" } });
    await userService.delete(5, 1);
    expect(mockSoftDelete).toHaveBeenCalledTimes(1);
    expect(mockAuditLog).toHaveBeenCalledTimes(1);
  });

  test("ห้ามลบตัวเอง", async () => {
    await expectError(userService.delete(1, 1), ErrorCode.USER_CANNOT_DELETE_SELF);
  });

  test("ห้ามลบ admin คนสุดท้าย", async () => {
    mockFindById.mockResolvedValueOnce({ id: 2, username: "a2", role: { name: "admin" } });
    mockFindById.mockResolvedValueOnce({ id: 2, username: "a2", role: { name: "admin" } });
    mockCountActiveAdmins.mockResolvedValueOnce(1);
    await expectError(userService.delete(2, 1), ErrorCode.USER_LAST_ADMIN);
  });
});

describe("userService.changeMyPassword", () => {
  test("เปลี่ยน password เมื่อ current ถูก", async () => {
    mockFindById.mockResolvedValueOnce({ id: 1, username: "admin" });
    mockFindByUsername.mockResolvedValueOnce({ id: 1, username: "admin", password: "old-hash" });
    mockVerifyPassword.mockResolvedValueOnce(true);
    await userService.changeMyPassword({ currentPassword: "old123abc", newPassword: "new123abc" }, 1);
    expect(mockUpdatePassword).toHaveBeenCalledTimes(1);
    expect(mockAuditLog).toHaveBeenCalledTimes(1);
  });

  test("throw UnauthorizedError เมื่อ current ผิด", async () => {
    mockFindById.mockResolvedValueOnce({ id: 1, username: "admin" });
    mockFindByUsername.mockResolvedValueOnce({ id: 1, username: "admin", password: "old-hash" });
    mockVerifyPassword.mockResolvedValueOnce(false);
    await expectError(
      userService.changeMyPassword({ currentPassword: "wrong", newPassword: "new123abc" }, 1),
      ErrorCode.AUTH_INVALID_CREDENTIALS,
    );
  });

  test("throw ValidationError เมื่อ new = current", async () => {
    await expectError(
      userService.changeMyPassword({ currentPassword: "samepw123", newPassword: "samepw123" }, 1),
      ErrorCode.USER_INVALID_PASSWORD,
    );
  });
});
