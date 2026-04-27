import { describe, test, expect } from "vitest";
import {
  findSelectedOption,
  filterOptionsByGroup,
  resolveDisplayLabel,
  hasGroups,
} from "./helpers";

const opts = [
  { id: 1, label: "A", group: "g1" },
  { id: 2, label: "B", group: "g2" },
  { id: 3, label: "C", group: "g1" },
];

describe("app-combobox/helpers.findSelectedOption", () => {
  test("คืน option ที่ id ตรง", () => {
    expect(findSelectedOption(opts, 2)?.label).toBe("B");
  });
  test("undefined เมื่อไม่เจอ/null", () => {
    expect(findSelectedOption(opts, null)).toBeUndefined();
    expect(findSelectedOption(opts, 99)).toBeUndefined();
  });
});

describe("app-combobox/helpers.filterOptionsByGroup", () => {
  test("คืน option ใน group เดียวกัน", () => {
    expect(filterOptionsByGroup(opts, "g1").map((o) => o.id)).toEqual([1, 3]);
  });
});

describe("app-combobox/helpers.resolveDisplayLabel", () => {
  test("คืน label ของ selected เมื่อมี", () => {
    expect(resolveDisplayLabel(opts[0], false, "ph")).toBe("A");
  });
  test("คืน placeholder เมื่อ required + ไม่มี selected", () => {
    expect(resolveDisplayLabel(undefined, true, "ph")).toBe("ph");
  });
  test("คืน 'ไม่ระบุ' เมื่อ optional + ไม่มี selected", () => {
    expect(resolveDisplayLabel(undefined, false, "ph")).toBe("ไม่ระบุ");
  });
});

describe("app-combobox/helpers.hasGroups", () => {
  test("false เมื่อ undefined/empty", () => {
    expect(hasGroups(undefined)).toBe(false);
    expect(hasGroups([])).toBe(false);
  });
  test("true เมื่อ length > 0", () => {
    expect(hasGroups([{ key: "g1", label: "G1" }])).toBe(true);
  });
});
