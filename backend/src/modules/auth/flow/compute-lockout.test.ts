import { describe, test, expect } from "bun:test";
import { computeLockout } from "./compute-lockout";

describe("computeLockout", () => {
  test("fail 1-3 → ไม่ lock", () => {
    expect(computeLockout(1).lockedUntil).toBeNull();
    expect(computeLockout(2).lockedUntil).toBeNull();
    expect(computeLockout(3).lockedUntil).toBeNull();
    expect(computeLockout(3).permanent).toBe(false);
  });

  test("fail 4-6 → lock 10 นาที", () => {
    const r = computeLockout(4);
    expect(r.permanent).toBe(false);
    expect(r.lockedUntil).toBeInstanceOf(Date);
    const diffMin = r.lockedUntil ? (r.lockedUntil.getTime() - Date.now()) / 60_000 : 0;
    expect(diffMin).toBeGreaterThan(9);
    expect(diffMin).toBeLessThanOrEqual(10);
  });

  test("fail 7-9 → lock 30 นาที", () => {
    const r = computeLockout(7);
    const diffMin = r.lockedUntil ? (r.lockedUntil.getTime() - Date.now()) / 60_000 : 0;
    expect(diffMin).toBeGreaterThan(29);
    expect(diffMin).toBeLessThanOrEqual(30);
  });

  test("fail ≥ 10 → permanent", () => {
    const r = computeLockout(10);
    expect(r.permanent).toBe(true);
    expect(r.lockedUntil).toBeNull();
    expect(computeLockout(15).permanent).toBe(true);
  });
});
