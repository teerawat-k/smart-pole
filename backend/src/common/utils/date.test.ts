import { describe, test, expect } from "bun:test";
import { parseOptionalDate, calcDaysDiff, dayRange } from "./date";

describe("parseOptionalDate", () => {
  test("ส่งคืน Date เมื่อ string ถูกรูปแบบ", () => {
    expect(parseOptionalDate("2026-04-27")).toBeInstanceOf(Date);
    expect(parseOptionalDate("2026-04-27T10:30:00Z")).toBeInstanceOf(Date);
  });

  test("ส่งคืน undefined เมื่อ null/undefined/empty", () => {
    expect(parseOptionalDate(null)).toBeUndefined();
    expect(parseOptionalDate(undefined)).toBeUndefined();
    expect(parseOptionalDate("")).toBeUndefined();
  });

  test("ส่งคืน undefined เมื่อ string ไม่ใช่ date", () => {
    expect(parseOptionalDate("not-a-date")).toBeUndefined();
  });
});

describe("calcDaysDiff", () => {
  test("วันเดียวกันส่งคืน 1", () => {
    const d1 = new Date(2026, 3, 27, 8);
    const d2 = new Date(2026, 3, 27, 23);
    expect(calcDaysDiff(d1, d2)).toBe(1);
  });

  test("วันถัดไปส่งคืน 2", () => {
    expect(calcDaysDiff(new Date(2026, 3, 27), new Date(2026, 3, 28))).toBe(2);
  });

  test("ข้ามเดือน — Apr 30 → May 2 = 3 วัน", () => {
    expect(calcDaysDiff(new Date(2026, 3, 30), new Date(2026, 4, 2))).toBe(3);
  });
});

describe("dayRange (Asia/Bangkok)", () => {
  test("ส่งคืน start/end ของวันที่ระบุ", () => {
    const { start, end } = dayRange("2026-04-27");
    // start = 2026-04-26T17:00:00.000Z (BKK 00:00)
    expect(start.toISOString()).toBe("2026-04-26T17:00:00.000Z");
    // end = 2026-04-27T16:59:59.999Z (BKK 23:59:59.999)
    expect(end.toISOString()).toBe("2026-04-27T16:59:59.999Z");
  });

  test("รับ Date object ได้", () => {
    const { start } = dayRange(new Date("2026-04-27T05:00:00Z"));
    expect(start.toISOString()).toBe("2026-04-26T17:00:00.000Z");
  });

  test("throw เมื่อ invalid date", () => {
    expect(() => dayRange("not-a-date")).toThrow();
  });
});
