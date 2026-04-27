import { describe, test, expect, beforeAll, afterAll, vi } from "vitest";
import {
  formatDate,
  formatDateTime,
  toISODateString,
  formatMoney,
  formatRelativeTime,
  trunc2,
} from "./format";

describe("lib/format.trunc2 (ตัด 2 ทศนิยม ห้ามปัดเศษ)", () => {
  test("ตัด 2 ทศนิยมแบบ truncate ไม่ใช่ round", () => {
    expect(trunc2(1.236)).toBe(1.23);  // ไม่ใช่ 1.24
    expect(trunc2(1.234)).toBe(1.23);
    expect(trunc2(2.999)).toBe(2.99);  // ไม่ใช่ 3.00
  });
  test("จำนวนเต็มไม่เปลี่ยน", () => {
    expect(trunc2(100)).toBe(100);
    expect(trunc2(0)).toBe(0);
  });
  test("ค่าติดลบ truncate ไปทาง 0", () => {
    expect(trunc2(-1.999)).toBe(-1.99);  // ไม่ใช่ -2.00
  });
  test("ค่าน้อยมาก", () => {
    expect(trunc2(0.001)).toBe(0);
    expect(trunc2(0.999)).toBe(0.99);
  });
});

describe("lib/format.formatDate", () => {
  test("ส่งคืนวันที่รูปแบบไทยเมื่อรับ Date object", () => {
    expect(formatDate(new Date("2026-03-17T05:00:00Z"))).toMatch(/มีนาคม 2026/);
  });

  test("ส่งคืนวันที่รูปแบบไทยเมื่อรับ ISO string", () => {
    expect(formatDate("2026-01-01T00:00:00Z")).toMatch(/มกราคม 2026|ธันวาคม 2025/);
  });

  test("ส่งคืน fallback เมื่อรับ null", () => {
    expect(formatDate(null)).toBe("-");
  });

  test("ส่งคืน fallback เมื่อรับ undefined", () => {
    expect(formatDate(undefined)).toBe("-");
  });

  test("ส่งคืน fallback ที่กำหนดเองได้", () => {
    expect(formatDate(null, "—")).toBe("—");
    expect(formatDate(undefined, "ไม่ระบุ")).toBe("ไม่ระบุ");
  });
});

describe("lib/format.formatDateTime", () => {
  test("ส่งคืนวันที่+เวลารูปแบบไทย พร้อม HH:MM (zero-padded)", () => {
    const result = formatDateTime(new Date("2026-03-17T05:00:00Z"));
    expect(result).toMatch(/มีนาคม 2026 \d{2}:\d{2}$/);
  });

  test("ส่งคืน '-' เมื่อรับ null/undefined", () => {
    expect(formatDateTime(null)).toBe("-");
    expect(formatDateTime(undefined)).toBe("-");
  });
});

describe("lib/format.toISODateString", () => {
  test("ส่งคืน YYYY-MM-DD เมื่อรับ Date object", () => {
    expect(toISODateString(new Date("2026-03-17T05:00:00Z"))).toBe("2026-03-17");
  });

  test("ส่งคืน YYYY-MM-DD เมื่อรับ ISO string", () => {
    expect(toISODateString("2026-03-17T05:00:00Z")).toBe("2026-03-17");
  });

  test("ส่งคืน fallback เมื่อรับ null/undefined", () => {
    expect(toISODateString(null)).toBe("");
    expect(toISODateString(undefined)).toBe("");
  });

  test("ส่งคืน fallback เมื่อ string parse ไม่ได้", () => {
    expect(toISODateString("not-a-date")).toBe("");
    expect(toISODateString("not-a-date", "INVALID")).toBe("INVALID");
  });

  test("ส่งคืน fallback ที่กำหนดเอง", () => {
    expect(toISODateString(null, "2000-01-01")).toBe("2000-01-01");
  });
});

describe("lib/format.formatMoney", () => {
  test("ส่งคืน thousand separator + 2 ทศนิยม", () => {
    expect(formatMoney(1234.5)).toBe("1,234.50");
    expect(formatMoney(1000000)).toBe("1,000,000.00");
  });

  test("ปัด 2 ตำแหน่งโดย toLocaleString", () => {
    expect(formatMoney(1.005)).toMatch(/^1\.00|1\.01$/);
  });

  test("ส่งคืน fallback เมื่อรับ null/undefined", () => {
    expect(formatMoney(null)).toBe("—");
    expect(formatMoney(undefined)).toBe("—");
  });

  test("ส่งคืน fallback ที่กำหนดเอง", () => {
    expect(formatMoney(null, "0.00")).toBe("0.00");
  });

  test("ค่า 0 ต้อง format เป็น '0.00' (ไม่ใช่ fallback)", () => {
    expect(formatMoney(0)).toBe("0.00");
  });

  test("ค่าติดลบ format ถูกต้อง", () => {
    expect(formatMoney(-1234.56)).toBe("-1,234.56");
  });
});

describe("lib/format.formatRelativeTime", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-17T12:00:00Z"));
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  test("ส่งคืน 'เมื่อสักครู่' สำหรับ < 60 วินาที", () => {
    expect(formatRelativeTime(new Date("2026-03-17T11:59:30Z"))).toBe("เมื่อสักครู่");
  });

  test("ส่งคืน 'X นาทีที่แล้ว' สำหรับ < 1 ชั่วโมง", () => {
    expect(formatRelativeTime(new Date("2026-03-17T11:55:00Z"))).toBe("5 นาทีที่แล้ว");
  });

  test("ส่งคืน 'X ชั่วโมงที่แล้ว' สำหรับ < 1 วัน", () => {
    expect(formatRelativeTime(new Date("2026-03-17T10:00:00Z"))).toBe("2 ชั่วโมงที่แล้ว");
  });

  test("ส่งคืน formatDate (ไม่ใช่ relative) เมื่อ ≥ 1 วัน", () => {
    const result = formatRelativeTime(new Date("2026-03-15T12:00:00Z"));
    expect(result).toMatch(/มีนาคม 2026/);
  });

  test("ส่งคืน '' (empty) เมื่อรับ null/undefined", () => {
    expect(formatRelativeTime(null)).toBe("");
    expect(formatRelativeTime(undefined)).toBe("");
  });
});
