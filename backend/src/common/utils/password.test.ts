import { describe, test, expect } from "bun:test";
import { hashPassword, verifyPassword } from "./password";

describe("password utils (argon2id)", () => {
  test("hash ส่งคืนค่าที่ขึ้นต้นด้วย $argon2id$", async () => {
    const hashed = await hashPassword("MyPass123");
    expect(hashed).toMatch(/^\$argon2id\$/);
    expect(hashed.length).toBeGreaterThan(60);
  });

  test("verify ถูกเมื่อ password ตรง", async () => {
    const hashed = await hashPassword("Correct123");
    expect(await verifyPassword(hashed, "Correct123")).toBe(true);
  });

  test("verify ไม่ผ่านเมื่อ password ผิด", async () => {
    const hashed = await hashPassword("Correct123");
    expect(await verifyPassword(hashed, "Wrong123")).toBe(false);
  });

  test("verify ส่งคืน false เมื่อ hash format ไม่ถูก (ไม่ throw)", async () => {
    expect(await verifyPassword("not-a-valid-hash", "anything")).toBe(false);
  });

  test("hash 2 ครั้งของ password เดียวกันได้คนละค่า (salt ต่างกัน)", async () => {
    const h1 = await hashPassword("Same123");
    const h2 = await hashPassword("Same123");
    expect(h1).not.toBe(h2);
    // แต่ verify ผ่านทั้งคู่
    expect(await verifyPassword(h1, "Same123")).toBe(true);
    expect(await verifyPassword(h2, "Same123")).toBe(true);
  });
});
