import { describe, test, expect } from "bun:test";
import { runWithLock } from "./scheduler";

describe("runWithLock (Postgres advisory lock)", () => {
  test("ส่งคืน true เมื่อได้ lock + run fn", async () => {
    let ran = false;
    const ok = await runWithLock(987654321, async () => {
      ran = true;
    });
    expect(ok).toBe(true);
    expect(ran).toBe(true);
  });

  test("รันซ้ำได้หลังปลด lock", async () => {
    const lockKey = 987654322;
    expect(await runWithLock(lockKey, async () => {})).toBe(true);
    expect(await runWithLock(lockKey, async () => {})).toBe(true);
  });

  test("ปลด lock แม้ fn throw", async () => {
    const lockKey = 987654323;
    try {
      await runWithLock(lockKey, async () => {
        throw new Error("boom");
      });
    } catch {
      // expected
    }
    // ต้องได้ lock อีกครั้ง
    expect(await runWithLock(lockKey, async () => {})).toBe(true);
  });
});
