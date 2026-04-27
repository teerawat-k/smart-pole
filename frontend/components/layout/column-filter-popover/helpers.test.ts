import { describe, test, expect } from "vitest";
import {
  filterOptionsBySearch,
  toggleId,
  areAllVisibleChecked,
  countVisibleChecked,
  toggleAllVisible,
  isDraftAll,
  resolveApplyValue,
  isFilterActive,
} from "./helpers";

const opts = [
  { id: 1, label: "Apple" },
  { id: 2, label: "Banana" },
  { id: 3, label: "Cherry" },
];

describe("column-filter-popover/helpers.filterOptionsBySearch", () => {
  test("คืนทั้งหมดเมื่อ search ว่าง", () => {
    expect(filterOptionsBySearch(opts, "")).toEqual(opts);
    expect(filterOptionsBySearch(opts, "  ")).toEqual(opts);
  });
  test("filter case-insensitive", () => {
    expect(filterOptionsBySearch(opts, "an").map((o) => o.id)).toEqual([2]);
    expect(filterOptionsBySearch(opts, "A").map((o) => o.id)).toEqual([1, 2]);
  });
});

describe("column-filter-popover/helpers.toggleId", () => {
  test("เพิ่มเมื่อยังไม่มี", () => {
    expect(toggleId([1, 2], 3)).toEqual([1, 2, 3]);
  });
  test("ลบเมื่อมีอยู่", () => {
    expect(toggleId([1, 2, 3], 2)).toEqual([1, 3]);
  });
});

describe("column-filter-popover/helpers.areAllVisibleChecked", () => {
  test("false เมื่อ visible empty", () => {
    expect(areAllVisibleChecked([1, 2], [])).toBe(false);
  });
  test("true เมื่อ visible ทั้งหมดอยู่ใน draft", () => {
    expect(areAllVisibleChecked([1, 2, 3], [1, 2])).toBe(true);
  });
  test("false เมื่อขาดบางตัว", () => {
    expect(areAllVisibleChecked([1], [1, 2])).toBe(false);
  });
});

describe("column-filter-popover/helpers.countVisibleChecked", () => {
  test("นับ intersection", () => {
    expect(countVisibleChecked([1, 2, 5], [2, 3, 5])).toBe(2);
  });
});

describe("column-filter-popover/helpers.toggleAllVisible", () => {
  test("uncheck เฉพาะ visible เมื่อ all checked", () => {
    expect(toggleAllVisible([1, 2, 3, 9], [1, 2])).toEqual([3, 9]);
  });
  test("เพิ่ม visible ที่ขาด (dedup)", () => {
    expect(toggleAllVisible([1], [1, 2, 3])).toEqual([1, 2, 3]);
  });
});

describe("column-filter-popover/helpers.isDraftAll", () => {
  test("true เมื่อ draft = allIds", () => {
    expect(isDraftAll([1, 2, 3], [3, 2, 1])).toBe(true);
  });
  test("false เมื่อขาด/เกิน", () => {
    expect(isDraftAll([1, 2], [1, 2, 3])).toBe(false);
  });
});

describe("column-filter-popover/helpers.resolveApplyValue", () => {
  test("undefined เมื่อ draft = all", () => {
    expect(resolveApplyValue([1, 2, 3], [1, 2, 3])).toBeUndefined();
  });
  test("คืน draft เมื่อ subset", () => {
    expect(resolveApplyValue([1], [1, 2, 3])).toEqual([1]);
  });
});

describe("column-filter-popover/helpers.isFilterActive", () => {
  test("false เมื่อ value undefined", () => {
    expect(isFilterActive(undefined, [1, 2])).toBe(false);
  });
  test("false เมื่อ length เท่ากับ all", () => {
    expect(isFilterActive([1, 2], [1, 2])).toBe(false);
  });
  test("true เมื่อ subset", () => {
    expect(isFilterActive([1], [1, 2])).toBe(true);
  });
});
