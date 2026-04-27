import { describe, test, expect, mock, beforeEach } from "bun:test";

// ── Mock setup ────────────────────────────────────────────
const mockCreate = mock((_data: {
  userId: number;
  action: string;
  module: string;
  targetId: number;
  payload?: unknown;
}) => Promise.resolve());

mock.module("./audit.repository", () => ({
  auditRepository: { create: mockCreate },
}));

const mockLoggerError = mock((_obj: unknown, _msg?: string) => {});
mock.module("@/plugins/logger", () => ({
  logger: { error: mockLoggerError },
}));

// ── Import after mock ─────────────────────────────────────
const { auditService } = await import("./audit.service");

// ── Fake data ─────────────────────────────────────────────
const FULL_PAYLOAD = {
  userId: 1,
  action: "CREATE",
  module: "pole",
  targetId: 10,
  payload: { name: "เสาทดสอบ" },
};

const MINIMAL_PAYLOAD = {
  userId: 2,
  action: "DELETE",
  module: "pole",
  targetId: 11,
};

// ── Reset ─────────────────────────────────────────────────
beforeEach(() => {
  mockCreate.mockReset();
  mockLoggerError.mockReset();
});

describe("auditService.log", () => {
  test("เรียก repository.create พร้อมข้อมูลครบ", async () => {
    mockCreate.mockResolvedValueOnce(undefined);
    auditService.log(FULL_PAYLOAD);
    await new Promise((r) => setTimeout(r, 10));
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(FULL_PAYLOAD);
  });

  test("เรียก repository.create ได้แม้ไม่มี payload", async () => {
    mockCreate.mockResolvedValueOnce(undefined);
    auditService.log(MINIMAL_PAYLOAD);
    await new Promise((r) => setTimeout(r, 10));
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  test("ส่งคืน void ทันที (ไม่ block caller)", () => {
    mockCreate.mockResolvedValueOnce(undefined);
    const result = auditService.log(FULL_PAYLOAD);
    expect(result).toBeUndefined();
  });

  test("log error ผ่าน pino เมื่อ repository.create fail", async () => {
    const dbError = new Error("DB unavailable");
    mockCreate.mockRejectedValueOnce(dbError);
    auditService.log(FULL_PAYLOAD);
    await new Promise((r) => setTimeout(r, 10));
    expect(mockLoggerError).toHaveBeenCalledTimes(1);
    expect(mockLoggerError.mock.calls[0]?.[0]).toMatchObject({ err: dbError, data: FULL_PAYLOAD });
  });

  test("ห้าม throw แม้ repository fail (fire-and-forget guarantee)", () => {
    mockCreate.mockRejectedValueOnce(new Error("boom"));
    expect(() => auditService.log(FULL_PAYLOAD)).not.toThrow();
  });
});
