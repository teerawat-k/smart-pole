import type { Column } from "./types";

/** Convert dataIndex to a dot-joined string key */
export function resolveDataKey<T>(dataIndex: keyof T | string | string[] | undefined): string | undefined {
  if (dataIndex === undefined) return undefined;
  if (Array.isArray(dataIndex)) return dataIndex.join(".");
  return String(dataIndex);
}

/** แผ่ Column tree (ที่มี children) เป็น leaf-only list — ใช้สำหรับ render tbody + sticky offset */
export function flattenColumns<T>(cols: Column<T>[]): Column<T>[] {
  const out: Column<T>[] = [];
  for (const c of cols) {
    if (c.children && c.children.length > 0) {
      out.push(...flattenColumns(c.children));
    } else {
      out.push(c);
    }
  }
  return out;
}

/** นับจำนวน leaf ใต้ column นี้ (colSpan สำหรับ group header) */
export function countLeaves<T>(col: Column<T>): number {
  if (!col.children || col.children.length === 0) return 1;
  return col.children.reduce((sum, c) => sum + countLeaves(c), 0);
}

/** ตรวจว่ามี 2-level header หรือไม่ */
export function hasGroupedHeader<T>(cols: Column<T>[]): boolean {
  return cols.some((c) => c.children && c.children.length > 0);
}

/** สร้าง pagination range พร้อม "..." — สูงสุด 7 ปุ่ม */
export function buildPageRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

/** คำนวณ sticky-left + sticky-right offsets per leaf column
 *  คืน { left: number[], right: number[] } — index ตรงกับ leafColumns
 */
export function computeStickyOffsets<T>(leafColumns: Column<T>[]): { left: number[]; right: number[] } {
  const left:  number[] = [];
  const right: number[] = [];
  let currentLeft  = 0;
  let currentRight = 0;

  leafColumns.forEach((col) => {
    if (col.fixed === "left") {
      left.push(currentLeft);
      currentLeft += col.width === "fit" ? 0 : Number(col.width) || 0;
    } else {
      left.push(0);
    }
  });

  for (let i = leafColumns.length - 1; i >= 0; i--) {
    const col = leafColumns[i];
    if (col.fixed === "right") {
      right[i] = currentRight;
      currentRight += col.width === "fit" ? 0 : Number(col.width) || 0;
    } else {
      right[i] = 0;
    }
  }

  return { left, right };
}

/** Compute next sort direction หลังกด column header (3-state cycle) */
export function nextSortDirection(
  currentColumn: string | undefined,
  currentDirection: "asc" | "desc" | undefined,
  clickedColumn: string,
): "asc" | "desc" | null {
  if (currentColumn === clickedColumn && currentDirection === "desc") return null;       // กดครั้งที่ 3 — reset
  if (currentColumn === clickedColumn && currentDirection === "asc")  return "desc";     // กดครั้งที่ 2
  return "asc";                                                                          // กดครั้งแรก / เปลี่ยนคอลัมน์
}

/** ดึงค่า nested จาก record ตาม dataIndex (รองรับ array ["a","b"] หรือ "a.b" หรือ key ตรง) */
export function resolveCellValue<T>(record: T, dataIndex: keyof T | string | string[] | undefined): unknown {
  if (dataIndex === undefined) return undefined;
  const parts = Array.isArray(dataIndex) ? dataIndex : String(dataIndex).split(".");
  return parts.reduce<unknown>(
    (acc, part) =>
      acc && typeof acc === "object"
        ? (acc as Record<string, unknown>)[part]
        : undefined,
    record,
  );
}
