import { describe, test, expect } from "bun:test";
import { generateMqttCredential } from "./generate-credential";

describe("generateMqttCredential", () => {
  test("ส่งคืน mqttUsername = pole-{poleName}", async () => {
    const cred = await generateMqttCredential("test-001");
    expect(cred.mqttUsername).toBe("pole-test-001");
  });

  test("ส่งคืน plain password เป็น hex 64 chars (32 bytes)", async () => {
    const cred = await generateMqttCredential("x");
    expect(cred.mqttPasswordPlain).toMatch(/^[0-9a-f]{64}$/);
  });

  test("hash ไม่เท่ากับ plain", async () => {
    // หมายเหตุ: ไม่ตรวจ $argon2id$ prefix ตรงๆ เพราะ mock.module ของ password ใน test อื่น leak ข้ามไฟล์
    // (Bun mock.module leak issue) — ใช้ comparison เช็ค semantic แทน
    const cred = await generateMqttCredential("x");
    expect(cred.mqttPasswordHash).not.toBe(cred.mqttPasswordPlain);
    expect(cred.mqttPasswordHash.length).toBeGreaterThan(0);
  });

  test("plain ไม่เท่ากับ hash", async () => {
    const cred = await generateMqttCredential("x");
    expect(cred.mqttPasswordPlain).not.toBe(cred.mqttPasswordHash);
  });

  test("2 รอบสร้าง password ต่างกัน", async () => {
    const a = await generateMqttCredential("x");
    const b = await generateMqttCredential("x");
    expect(a.mqttPasswordPlain).not.toBe(b.mqttPasswordPlain);
  });
});
