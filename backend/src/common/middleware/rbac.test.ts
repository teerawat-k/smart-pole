import { describe, test, expect, mock, beforeEach } from "bun:test";

// ── Mock setup ────────────────────────────────────────────
const mockFetchRole = mock(async (_roleName: string) => null as null | {
  isSystem: boolean;
  permissions: { permission: { module: string; action: string } }[];
});

mock.module("./rbac.repository", () => ({
  fetchRoleWithPermissions: mockFetchRole,
}));

const { hasPermission, requirePermission, invalidatePermissionCache } = await import("./rbac");

beforeEach(() => {
  mockFetchRole.mockReset();
  invalidatePermissionCache();
});

describe("hasPermission", () => {
  test("ส่งคืน true ถ้า role เป็น isSystem", async () => {
    mockFetchRole.mockResolvedValueOnce({ isSystem: true, permissions: [] });
    const ok = await hasPermission("admin", "pole:create");
    expect(ok).toBe(true);
  });

  test("ส่งคืน true ถ้า role มี permission ตรงกัน", async () => {
    mockFetchRole.mockResolvedValueOnce({
      isSystem: false,
      permissions: [{ permission: { module: "pole", action: "view" } }],
    });
    const ok = await hasPermission("user", "pole:view");
    expect(ok).toBe(true);
  });

  test("ส่งคืน false ถ้า role ไม่มี permission", async () => {
    mockFetchRole.mockResolvedValueOnce({
      isSystem: false,
      permissions: [{ permission: { module: "pole", action: "view" } }],
    });
    const ok = await hasPermission("user", "pole:delete");
    expect(ok).toBe(false);
  });

  test("ส่งคืน false ถ้า role ไม่มีใน DB", async () => {
    mockFetchRole.mockResolvedValueOnce(null);
    const ok = await hasPermission("ghost", "pole:view");
    expect(ok).toBe(false);
  });

  test("ใช้ cache เมื่อเรียกซ้ำ — query DB ครั้งเดียว", async () => {
    mockFetchRole.mockResolvedValueOnce({
      isSystem: false,
      permissions: [{ permission: { module: "pole", action: "view" } }],
    });
    await hasPermission("user", "pole:view");
    await hasPermission("user", "pole:view");
    await hasPermission("user", "pole:edit");
    expect(mockFetchRole).toHaveBeenCalledTimes(1);
  });
});

describe("invalidatePermissionCache", () => {
  test("ลบ cache ของ role ที่ระบุ", async () => {
    mockFetchRole.mockResolvedValueOnce({
      isSystem: false,
      permissions: [{ permission: { module: "pole", action: "view" } }],
    });
    await hasPermission("user", "pole:view");
    expect(mockFetchRole).toHaveBeenCalledTimes(1);

    invalidatePermissionCache("user");
    mockFetchRole.mockResolvedValueOnce({ isSystem: false, permissions: [] });
    await hasPermission("user", "pole:view");
    expect(mockFetchRole).toHaveBeenCalledTimes(2);
  });

  test("ลบ cache ทั้งหมดถ้าไม่ระบุ role", async () => {
    mockFetchRole.mockResolvedValue({ isSystem: false, permissions: [] });
    await hasPermission("a", "x:y");
    await hasPermission("b", "x:y");
    expect(mockFetchRole).toHaveBeenCalledTimes(2);

    invalidatePermissionCache();
    await hasPermission("a", "x:y");
    expect(mockFetchRole).toHaveBeenCalledTimes(3);
  });
});

describe("requirePermission", () => {
  test("throw ForbiddenError ถ้า context ไม่มี user", async () => {
    const guard = requirePermission("pole:view");
    await expect(guard({})).rejects.toMatchObject({ statusCode: 403 });
  });

  test("ผ่านเมื่อ user.role เป็น isSystem", async () => {
    mockFetchRole.mockResolvedValueOnce({ isSystem: true, permissions: [] });
    const guard = requirePermission("pole:create");
    await expect(guard({ user: { role: "admin" } })).resolves.toBeUndefined();
  });

  test("ผ่านเมื่อ user.role มี permission", async () => {
    mockFetchRole.mockResolvedValueOnce({
      isSystem: false,
      permissions: [{ permission: { module: "pole", action: "view" } }],
    });
    const guard = requirePermission("pole:view");
    await expect(guard({ user: { role: "user" } })).resolves.toBeUndefined();
  });

  test("throw ForbiddenError เมื่อ user ไม่มี permission", async () => {
    mockFetchRole.mockResolvedValueOnce({ isSystem: false, permissions: [] });
    const guard = requirePermission("pole:delete");
    await expect(guard({ user: { role: "user" } })).rejects.toMatchObject({ statusCode: 403 });
  });
});
