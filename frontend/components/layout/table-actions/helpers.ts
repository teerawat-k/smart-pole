import type { TableActionGroup, TableActionItem } from "./types";

/** ส่งคืน item ที่ไม่ hidden */
export function visibleItems(items: TableActionItem[]): TableActionItem[] {
  return items.filter((item) => !item.hidden);
}

/** กรอง hidden ในแต่ละ group + ตัด group ที่ไม่มี item เหลือ */
export function nonEmptyGroups(groups: TableActionGroup[]): TableActionGroup[] {
  return groups
    .map((g) => ({ ...g, items: visibleItems(g.items) }))
    .filter((g) => g.items.length > 0);
}

/** แยก items เป็น inline กับ overflow ตาม maxVisible */
export function splitInlineOverflow(
  items: TableActionItem[],
  maxVisible: number,
): { inline: TableActionItem[]; overflow: TableActionItem[] } {
  if (items.length <= maxVisible) return { inline: items, overflow: [] };
  return {
    inline:   items.slice(0, maxVisible),
    overflow: items.slice(maxVisible),
  };
}

/** แยก groups เป็น inline + overflow โดยรักษา group boundary */
export function splitGroupsByMaxVisible(
  groups: TableActionGroup[],
  maxVisible: number,
): { inlineGroups: TableActionGroup[]; overflowGroups: TableActionGroup[] } {
  const inlineGroups:   TableActionGroup[] = [];
  const overflowGroups: TableActionGroup[] = [];
  let inlineCount = 0;

  for (const group of groups) {
    if (inlineCount >= maxVisible) {
      overflowGroups.push(group);
      continue;
    }
    const remaining = maxVisible - inlineCount;
    if (group.items.length <= remaining) {
      inlineGroups.push(group);
      inlineCount += group.items.length;
    } else {
      inlineGroups.push({ ...group, items: group.items.slice(0, remaining) });
      overflowGroups.push({ ...group, items: group.items.slice(remaining) });
      inlineCount = maxVisible;
    }
  }

  return { inlineGroups, overflowGroups };
}

/** นับ items ทั้งหมดใน groups */
export function countAllItems(groups: TableActionGroup[]): number {
  return groups.reduce((sum, g) => sum + g.items.length, 0);
}

/** ข้อความ tooltip — ถ้า disabled+มี disabledReason ใช้ disabledReason ไม่งั้น label */
export function resolveTooltip(item: TableActionItem): string {
  return item.disabled && item.disabledReason ? item.disabledReason : item.label;
}
