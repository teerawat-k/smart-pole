import { describe, test, expect } from "bun:test";
import { Value } from "@sinclair/typebox/value";
import { t } from "elysia";
import { paginationQuery } from "./pagination";
import { reorderSchema } from "./reorder";
import { passwordSchema, isPasswordConfirmed } from "./password.schema";

describe("paginationQuery", () => {
  const schema = t.Object(paginationQuery);

  test("ใช้ค่า default เมื่อไม่ส่ง page/limit", () => {
    const result = Value.Default(schema, {});
    expect(result).toMatchObject({ page: 1, limit: 20 });
  });

  test("รับค่า page และ limit ที่ส่งมา", () => {
    const result = Value.Default(schema, { page: 3, limit: 50 });
    expect(result).toMatchObject({ page: 3, limit: 50 });
  });

  test("ปฏิเสธ limit เกิน 100", () => {
    expect(Value.Check(schema, { page: 1, limit: 101 })).toBe(false);
  });

  test("ปฏิเสธ page < 1", () => {
    expect(Value.Check(schema, { page: 0, limit: 20 })).toBe(false);
  });

  test("ปฏิเสธ sortOrder ที่ไม่ใช่ asc/desc", () => {
    expect(Value.Check(schema, { page: 1, limit: 20, sortOrder: "ascending" })).toBe(false);
  });

  test("ยอมรับ sortOrder = asc/desc", () => {
    expect(Value.Check(schema, { page: 1, limit: 20, sortOrder: "asc" })).toBe(true);
    expect(Value.Check(schema, { page: 1, limit: 20, sortOrder: "desc" })).toBe(true);
  });
});

describe("reorderSchema", () => {
  test("ยอมรับ payload ถูกต้อง", () => {
    expect(Value.Check(reorderSchema, { id: 5, order: 2 })).toBe(true);
  });

  test("ปฏิเสธ order ติดลบ", () => {
    expect(Value.Check(reorderSchema, { id: 5, order: -1 })).toBe(false);
  });

  test("ปฏิเสธเมื่อขาด field", () => {
    expect(Value.Check(reorderSchema, { id: 5 })).toBe(false);
  });
});

describe("passwordSchema", () => {
  test("ยอมรับรหัสผ่านที่มีตัวอักษรและตัวเลขอย่างน้อย 8 ตัว", () => {
    expect(Value.Check(passwordSchema, "Abcd1234")).toBe(true);
    expect(Value.Check(passwordSchema, "p4ssw0rd")).toBe(true);
  });

  test("ปฏิเสธรหัสผ่านสั้นกว่า 8 ตัว", () => {
    expect(Value.Check(passwordSchema, "Abc123")).toBe(false);
  });

  test("ปฏิเสธรหัสผ่านที่ไม่มีตัวเลข", () => {
    expect(Value.Check(passwordSchema, "abcdefgh")).toBe(false);
  });

  test("ปฏิเสธรหัสผ่านที่ไม่มีตัวอักษร", () => {
    expect(Value.Check(passwordSchema, "12345678")).toBe(false);
  });
});

describe("isPasswordConfirmed", () => {
  test("ส่งคืน true เมื่อ password ทั้งสองตัวตรงกัน", () => {
    expect(isPasswordConfirmed({ newPassword: "Abc12345", confirmPassword: "Abc12345" })).toBe(true);
  });

  test("ส่งคืน false เมื่อ password ไม่ตรงกัน", () => {
    expect(isPasswordConfirmed({ newPassword: "Abc12345", confirmPassword: "Different1" })).toBe(false);
  });
});
