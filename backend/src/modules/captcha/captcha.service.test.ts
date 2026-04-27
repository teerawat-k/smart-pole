import { describe, test, expect, mock, beforeEach } from "bun:test";

const mockCreate = mock(async (_data: unknown) => ({ id: 1 }));
const mockFindActive = mock(async (_key: string) => null as unknown);
const mockMarkSolved = mock(async (_id: number) => undefined);
const mockCleanup = mock(async () => 0);

mock.module("./captcha.repository", () => ({
  captchaRepository: {
    create: mockCreate,
    findActive: mockFindActive,
    markSolved: mockMarkSolved,
    cleanupExpired: mockCleanup,
  },
}));

const { captchaService } = await import("./captcha.service");

beforeEach(() => {
  mockCreate.mockReset();
  mockFindActive.mockReset();
  mockMarkSolved.mockReset();
  mockCleanup.mockReset();
});

describe("captchaService.create", () => {
  test("ส่งคืน sessionKey + image base64 svg + expiresAt", async () => {
    mockCreate.mockResolvedValueOnce({ id: 1 });
    const result = await captchaService.create();
    expect(result.sessionKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.image).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  test("เก็บ hash ไม่ใช่ plain text", async () => {
    mockCreate.mockResolvedValueOnce({ id: 1 });
    await captchaService.create();
    const arg = mockCreate.mock.calls[0]?.[0] as { captchaHash: string };
    expect(arg.captchaHash).toMatch(/^[0-9a-f]{64}$/); // SHA-256 hex
  });
});

describe("captchaService.verify", () => {
  test("ส่งคืน false เมื่อ input ว่าง", async () => {
    expect(await captchaService.verify("sk", "")).toBe(false);
  });

  test("ส่งคืน false เมื่อไม่พบ session", async () => {
    mockFindActive.mockResolvedValueOnce(null);
    expect(await captchaService.verify("sk", "ABC123")).toBe(false);
  });

  test("ส่งคืน false เมื่อ hash ไม่ตรง", async () => {
    mockFindActive.mockResolvedValueOnce({ id: 1, captchaHash: "wrong-hash" });
    expect(await captchaService.verify("sk", "ABC123")).toBe(false);
    expect(mockMarkSolved).not.toHaveBeenCalled();
  });

  test("ส่งคืน true + mark solved เมื่อ hash ตรง", async () => {
    // hash ของ "ABC123" (uppercase)
    const { createHash } = await import("node:crypto");
    const hash = createHash("sha256").update("ABC123").digest("hex");
    mockFindActive.mockResolvedValueOnce({ id: 5, captchaHash: hash });
    expect(await captchaService.verify("sk", "abc123")).toBe(true); // case-insensitive
    expect(mockMarkSolved).toHaveBeenCalledWith(5);
  });
});

describe("captchaService.cleanupExpired", () => {
  test("ส่งคืนจำนวน rows ที่ลบ", async () => {
    mockCleanup.mockResolvedValueOnce(7);
    expect(await captchaService.cleanupExpired()).toBe(7);
  });
});
