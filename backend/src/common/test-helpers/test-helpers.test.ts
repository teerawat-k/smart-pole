import { describe, test, expect } from "bun:test";
import { expectError } from "./expect-error";
import { makeTestPrefix } from "./test-prefix";
import { NotFoundError } from "@/common/errors";

describe("expectError", () => {
  test("ผ่านเมื่อ promise reject ด้วย AppError ที่ code ตรง", async () => {
    const err = await expectError(
      Promise.reject(new NotFoundError("POLE-001", "ไม่พบ")),
      "POLE-001",
    );
    expect(err).toBeInstanceOf(NotFoundError);
  });

  test("throw เมื่อ promise resolve", async () => {
    let caught: Error | null = null;
    try {
      await expectError(Promise.resolve("ok"), "POLE-001");
    } catch (e) {
      caught = e as Error;
    }
    expect(caught).not.toBeNull();
    expect(caught?.message).toContain("Expected to throw");
  });

  test("throw เมื่อ reject ด้วย error ที่ไม่ใช่ AppError", async () => {
    let caught: Error | null = null;
    try {
      await expectError(Promise.reject(new Error("other")), "POLE-001");
    } catch (e) {
      caught = e as Error;
    }
    expect(caught?.message).toContain("Expected AppError");
  });
});

describe("makeTestPrefix", () => {
  test("ขึ้นต้นด้วย scope_test_", () => {
    const p = makeTestPrefix("pole");
    expect(p).toMatch(/^pole_test_\d+_[a-z0-9]{3}$/);
  });

  test("ทุกครั้งได้ค่าต่างกัน", () => {
    const p1 = makeTestPrefix("user");
    const p2 = makeTestPrefix("user");
    expect(p1).not.toBe(p2);
  });
});
