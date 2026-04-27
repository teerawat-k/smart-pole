import { describe, test, expect } from "vitest";
import { Pencil } from "lucide-react";
import {
  visibleItems,
  nonEmptyGroups,
  splitInlineOverflow,
  splitGroupsByMaxVisible,
  countAllItems,
  resolveTooltip,
} from "./helpers";
import type { TableActionItem, TableActionGroup } from "./types";

const mkItem = (overrides: Partial<TableActionItem> = {}): TableActionItem => ({
  label:   "x",
  icon:    Pencil,
  onClick: () => undefined,
  ...overrides,
});

describe("table-actions/helpers.visibleItems", () => {
  test("กรอง hidden ออก", () => {
    const items = [mkItem({ label: "A" }), mkItem({ label: "B", hidden: true }), mkItem({ label: "C" })];
    expect(visibleItems(items).map((i) => i.label)).toEqual(["A", "C"]);
  });
  test("ไม่มี hidden → คืนเดิม", () => {
    const items = [mkItem({ label: "A" }), mkItem({ label: "B" })];
    expect(visibleItems(items).length).toBe(2);
  });
});

describe("table-actions/helpers.nonEmptyGroups", () => {
  test("ตัด group ที่ items ทั้งหมด hidden", () => {
    const groups: TableActionGroup[] = [
      { items: [mkItem({ label: "A" })] },
      { items: [mkItem({ label: "B", hidden: true })] },
      { items: [mkItem({ label: "C", hidden: true }), mkItem({ label: "D" })] },
    ];
    const result = nonEmptyGroups(groups);
    expect(result.length).toBe(2);
    expect(result[0].items.map((i) => i.label)).toEqual(["A"]);
    expect(result[1].items.map((i) => i.label)).toEqual(["D"]);
  });
});

describe("table-actions/helpers.splitInlineOverflow", () => {
  test("items ≤ maxVisible → inline ทั้งหมด, overflow ว่าง", () => {
    const items = [mkItem({ label: "A" }), mkItem({ label: "B" })];
    const r = splitInlineOverflow(items, 3);
    expect(r.inline.length).toBe(2);
    expect(r.overflow.length).toBe(0);
  });
  test("items > maxVisible → split", () => {
    const items = [mkItem({ label: "A" }), mkItem({ label: "B" }), mkItem({ label: "C" }), mkItem({ label: "D" })];
    const r = splitInlineOverflow(items, 2);
    expect(r.inline.map((i) => i.label)).toEqual(["A", "B"]);
    expect(r.overflow.map((i) => i.label)).toEqual(["C", "D"]);
  });
});

describe("table-actions/helpers.splitGroupsByMaxVisible", () => {
  const g1: TableActionGroup = { items: [mkItem({ label: "A" }), mkItem({ label: "B" })] };
  const g2: TableActionGroup = { items: [mkItem({ label: "C" })] };
  const g3: TableActionGroup = { items: [mkItem({ label: "D" }), mkItem({ label: "E" })] };

  test("inline เก็บได้ทั้ง group แรก", () => {
    const r = splitGroupsByMaxVisible([g1, g2, g3], 2);
    expect(r.inlineGroups.length).toBe(1);
    expect(r.inlineGroups[0].items.map((i) => i.label)).toEqual(["A", "B"]);
    expect(r.overflowGroups.length).toBe(2);
  });

  test("group ใหญ่กว่าเหลือ → split group", () => {
    const r = splitGroupsByMaxVisible([g1, g3], 3);
    expect(r.inlineGroups.length).toBe(2);
    expect(r.inlineGroups[1].items.map((i) => i.label)).toEqual(["D"]);
    expect(r.overflowGroups[0].items.map((i) => i.label)).toEqual(["E"]);
  });

  test("inline เต็มแล้ว → group ที่เหลือเข้า overflow ทั้งก้อน", () => {
    const r = splitGroupsByMaxVisible([g1, g2, g3], 2);
    expect(r.overflowGroups.length).toBe(2);
    expect(r.overflowGroups[0].items.map((i) => i.label)).toEqual(["C"]);
    expect(r.overflowGroups[1].items.map((i) => i.label)).toEqual(["D", "E"]);
  });
});

describe("table-actions/helpers.countAllItems", () => {
  test("รวม items ทุก group", () => {
    const groups: TableActionGroup[] = [
      { items: [mkItem(), mkItem()] },
      { items: [mkItem()] },
    ];
    expect(countAllItems(groups)).toBe(3);
  });
  test("groups ว่าง → 0", () => {
    expect(countAllItems([])).toBe(0);
  });
});

describe("table-actions/helpers.resolveTooltip", () => {
  test("ปกติ → label", () => {
    expect(resolveTooltip(mkItem({ label: "Edit" }))).toBe("Edit");
  });
  test("disabled + disabledReason → reason", () => {
    expect(resolveTooltip(mkItem({ label: "Edit", disabled: true, disabledReason: "ห้ามแก้" }))).toBe("ห้ามแก้");
  });
  test("disabled แต่ไม่มี reason → label", () => {
    expect(resolveTooltip(mkItem({ label: "Edit", disabled: true }))).toBe("Edit");
  });
});
