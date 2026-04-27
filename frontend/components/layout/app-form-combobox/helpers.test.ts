import { describe, test, expect } from "vitest";
import {
  safeOptions,
  getOptionValue,
  findOptionByValue,
  resolveDisplayLabel,
  shouldShowClearCheck,
} from "./helpers";

describe("app-form-combobox/helpers.safeOptions", () => {
  test("คืน [] เมื่อไม่ใช่ array", () => {
    // @ts-expect-error - intentional bad input
    expect(safeOptions(null)).toEqual([]);
    expect(safeOptions(undefined)).toEqual([]);
  });
  test("คืน array เดิม", () => {
    const opts = [{ id: 1, label: "a" }];
    expect(safeOptions(opts)).toBe(opts);
  });
});

describe("app-form-combobox/helpers.getOptionValue", () => {
  test("priority value > id", () => {
    expect(getOptionValue({ id: 1, value: 2, label: "a" })).toBe(2);
  });
  test("fallback id", () => {
    expect(getOptionValue({ id: 5, label: "a" })).toBe(5);
  });
  test("undefined ทั้งคู่", () => {
    expect(getOptionValue({ label: "a" })).toBeUndefined();
  });
});

describe("app-form-combobox/helpers.findOptionByValue", () => {
  const opts = [
    { id: 1, label: "A" },
    { value: "x", label: "X" },
  ];
  test("เจอด้วย id", () => {
    expect(findOptionByValue(opts, 1)?.label).toBe("A");
  });
  test("เจอด้วย value", () => {
    expect(findOptionByValue(opts, "x")?.label).toBe("X");
  });
  test("undefined เมื่อไม่เจอ", () => {
    expect(findOptionByValue(opts, 99)).toBeUndefined();
  });
});

describe("app-form-combobox/helpers.resolveDisplayLabel", () => {
  test("label ของ selected", () => {
    expect(resolveDisplayLabel({ id: 1, label: "A" }, false, "ph")).toBe("A");
  });
  test("placeholder เมื่อ required", () => {
    expect(resolveDisplayLabel(undefined, true, "ph")).toBe("ph");
  });
  test("'ไม่ระบุ' เมื่อ optional + ว่าง", () => {
    expect(resolveDisplayLabel(undefined, false, "ph")).toBe("ไม่ระบุ");
  });
});

describe("app-form-combobox/helpers.shouldShowClearCheck", () => {
  test("true เมื่อ null/undefined/empty string", () => {
    expect(shouldShowClearCheck(null)).toBe(true);
    expect(shouldShowClearCheck(undefined)).toBe(true);
    expect(shouldShowClearCheck("")).toBe(true);
  });
  test("false เมื่อ 0 (valid value)", () => {
    expect(shouldShowClearCheck(0)).toBe(false);
  });
  test("false เมื่อมีค่า", () => {
    expect(shouldShowClearCheck(1)).toBe(false);
    expect(shouldShowClearCheck("x")).toBe(false);
  });
});
