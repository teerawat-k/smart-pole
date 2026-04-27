import { describe, test, expect } from "bun:test";
import { signPlaybackToken, verifyPlaybackToken } from "./sign-playback-url";

describe("playback token", () => {
  test("sign + verify ส่งคืน payload ตรง", () => {
    const token = signPlaybackToken(BigInt(123), 5);
    const payload = verifyPlaybackToken(token);
    expect(payload?.recordingId).toBe("123");
    expect(payload?.userId).toBe(5);
    expect(payload?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  test("verify fail เมื่อ signature ไม่ตรง", () => {
    const token = signPlaybackToken(BigInt(1), 1);
    const tampered = token.split(".")[0] + ".bad-signature";
    expect(verifyPlaybackToken(tampered)).toBeNull();
  });

  test("verify fail เมื่อ format ผิด", () => {
    expect(verifyPlaybackToken("invalid-token")).toBeNull();
    expect(verifyPlaybackToken("")).toBeNull();
  });
});
