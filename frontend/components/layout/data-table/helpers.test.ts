import { describe, test, expect } from "vitest";
import {
  resolveDataKey,
  flattenColumns,
  countLeaves,
  hasGroupedHeader,
  buildPageRange,
  computeStickyOffsets,
  nextSortDirection,
  resolveCellValue,
} from "./helpers";
import type { Column } from "./types";

const mkCol = <T,>(overrides: Partial<Column<T>> = {}): Column<T> => ({
  title: "",
  ...overrides,
});

describe("data-table/helpers.resolveDataKey", () => {
  test("ส่งคืน undefined เมื่อ dataIndex undefined", () => {
    expect(resolveDataKey(undefined)).toBeUndefined();
  });
  test("ส่งคืน string ตรงเมื่อรับ string", () => {
    expect(resolveDataKey("foo")).toBe("foo");
  });
  test("ส่งคืน dot-joined เมื่อรับ array", () => {
    expect(resolveDataKey(["a", "b", "c"])).toBe("a.b.c");
  });
});

describe("data-table/helpers.flattenColumns", () => {
  test("คืน leaf เดิมเมื่อไม่มี children", () => {
    const cols = [mkCol({ key: "a" }), mkCol({ key: "b" })];
    expect(flattenColumns(cols).map((c) => c.key)).toEqual(["a", "b"]);
  });
  test("แผ่ children 1 ระดับ", () => {
    const cols = [
      mkCol({ key: "a" }),
      mkCol({ key: "g", children: [mkCol({ key: "g1" }), mkCol({ key: "g2" })] }),
      mkCol({ key: "b" }),
    ];
    expect(flattenColumns(cols).map((c) => c.key)).toEqual(["a", "g1", "g2", "b"]);
  });
  test("แผ่ children หลายระดับ recursive", () => {
    const cols = [
      mkCol({ key: "g", children: [
        mkCol({ key: "g1" }),
        mkCol({ key: "gg", children: [mkCol({ key: "gg1" }), mkCol({ key: "gg2" })] }),
      ]}),
    ];
    expect(flattenColumns(cols).map((c) => c.key)).toEqual(["g1", "gg1", "gg2"]);
  });
});

describe("data-table/helpers.countLeaves", () => {
  test("ส่งคืน 1 เมื่อไม่มี children", () => {
    expect(countLeaves(mkCol())).toBe(1);
  });
  test("ส่งคืน count of leaves recursive", () => {
    const col = mkCol({ children: [
      mkCol(),
      mkCol({ children: [mkCol(), mkCol()] }),
    ]});
    expect(countLeaves(col)).toBe(3);
  });
});

describe("data-table/helpers.hasGroupedHeader", () => {
  test("false เมื่อไม่มี column ใดมี children", () => {
    expect(hasGroupedHeader([mkCol(), mkCol()])).toBe(false);
  });
  test("true เมื่อมี column ใดตัวหนึ่งมี children non-empty", () => {
    expect(hasGroupedHeader([mkCol(), mkCol({ children: [mkCol()] })])).toBe(true);
  });
  test("false เมื่อ children เป็น empty array", () => {
    expect(hasGroupedHeader([mkCol({ children: [] })])).toBe(false);
  });
});

describe("data-table/helpers.buildPageRange", () => {
  test("ทุกหน้าเมื่อ total ≤ 7", () => {
    expect(buildPageRange(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(buildPageRange(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
  test("first/last + ellipsis เมื่อ current ใกล้กลาง", () => {
    expect(buildPageRange(5, 10)).toEqual([1, "...", 4, 5, 6, "...", 10]);
  });
  test("ไม่มี ellipsis ซ้าย เมื่อ current ใกล้ต้น", () => {
    expect(buildPageRange(2, 10)).toEqual([1, 2, 3, "...", 10]);
  });
  test("ไม่มี ellipsis ขวา เมื่อ current ใกล้ปลาย", () => {
    expect(buildPageRange(9, 10)).toEqual([1, "...", 8, 9, 10]);
  });
});

describe("data-table/helpers.computeStickyOffsets", () => {
  test("ทุก offset 0 เมื่อไม่มี fixed column", () => {
    const cols = [mkCol(), mkCol()];
    const { left, right } = computeStickyOffsets(cols);
    expect(left).toEqual([0, 0]);
    expect(right).toEqual([0, 0]);
  });
  test("Left offsets สะสมจาก width", () => {
    const cols = [
      mkCol({ fixed: "left", width: 50 }),
      mkCol({ fixed: "left", width: 100 }),
      mkCol(),
    ];
    const { left } = computeStickyOffsets(cols);
    expect(left).toEqual([0, 50, 0]);
  });
  test("Right offsets สะสมจาก ขวา → ซ้าย", () => {
    const cols = [
      mkCol(),
      mkCol({ fixed: "right", width: 80 }),
      mkCol({ fixed: "right", width: 60 }),
    ];
    const { right } = computeStickyOffsets(cols);
    expect(right).toEqual([0, 60, 0]);
  });
  test("width 'fit' ไม่บวก offset", () => {
    const cols = [
      mkCol({ fixed: "left", width: "fit" }),
      mkCol({ fixed: "left", width: 100 }),
    ];
    const { left } = computeStickyOffsets(cols);
    expect(left).toEqual([0, 0]);
  });
});

describe("data-table/helpers.nextSortDirection", () => {
  test("ครั้งแรกหรือเปลี่ยน column → asc", () => {
    expect(nextSortDirection(undefined, undefined, "name")).toBe("asc");
    expect(nextSortDirection("other", "asc", "name")).toBe("asc");
  });
  test("asc → desc เมื่อ column เดิม", () => {
    expect(nextSortDirection("name", "asc", "name")).toBe("desc");
  });
  test("desc → null (reset) เมื่อ column เดิม", () => {
    expect(nextSortDirection("name", "desc", "name")).toBeNull();
  });
});

describe("data-table/helpers.resolveCellValue", () => {
  const record = { a: { b: { c: 5 } }, x: "y" };
  test("ส่งคืน undefined เมื่อ dataIndex undefined", () => {
    expect(resolveCellValue(record, undefined)).toBeUndefined();
  });
  test("ดึง flat key", () => {
    expect(resolveCellValue(record, "x")).toBe("y");
  });
  test("ดึง nested ผ่าน 'a.b.c'", () => {
    expect(resolveCellValue(record, "a.b.c")).toBe(5);
  });
  test("ดึง nested ผ่าน array ['a','b','c']", () => {
    expect(resolveCellValue(record, ["a", "b", "c"])).toBe(5);
  });
  test("ส่งคืน undefined เมื่อ path ไม่มี", () => {
    expect(resolveCellValue(record, "a.zz")).toBeUndefined();
  });
});
