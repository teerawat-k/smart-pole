import { describe, test, expect } from "bun:test";
import crypto from "node:crypto";
import { loadPrivateKey, signMessage } from "./sign";

// สร้างคู่กุญแจ Ed25519 สำหรับทดสอบ verify roundtrip
const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
const privatePem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

describe("sensor-push.sign", () => {
  test("โหลด private key จาก PEM ปกติได้", () => {
    const key = loadPrivateKey(privatePem);
    expect(key.asymmetricKeyType).toBe("ed25519");
  });

  test("โหลด private key จาก PEM ที่ escape \\n ใน env ได้", () => {
    const escaped = privatePem.replace(/\n/g, "\\n");
    const key = loadPrivateKey(escaped);
    expect(key.asymmetricKeyType).toBe("ed25519");
  });

  test("ลายเซ็นที่สร้างต้อง verify ผ่านด้วย public key คู่กัน", () => {
    const key = loadPrivateKey(privatePem);
    const timestamp = 1_700_000_000;
    const rawBody = JSON.stringify({ poleName: "POLE-01", seq: 1 });
    const signature = signMessage(key, timestamp, rawBody);

    const msg = Buffer.from(`${timestamp}.${rawBody}`, "utf8");
    const ok = crypto.verify(null, msg, publicKey, Buffer.from(signature, "base64"));
    expect(ok).toBe(true);
  });

  test("verify ล้มเหลวเมื่อ body ถูกแก้ไข (ป้องกันปลอมแปลง)", () => {
    const key = loadPrivateKey(privatePem);
    const timestamp = 1_700_000_000;
    const signature = signMessage(key, timestamp, JSON.stringify({ seq: 1 }));

    const tampered = Buffer.from(`${timestamp}.${JSON.stringify({ seq: 999 })}`, "utf8");
    const ok = crypto.verify(null, tampered, publicKey, Buffer.from(signature, "base64"));
    expect(ok).toBe(false);
  });
});
