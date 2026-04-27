export interface ColumnFilterOption {
  id:    number;
  label: string;
}

/** filter options ตาม search string (case-insensitive) */
export function filterOptionsBySearch(options: ColumnFilterOption[], search: string): ColumnFilterOption[] {
  const q = search.toLowerCase().trim();
  if (!q) return options;
  return options.filter((o) => o.label.toLowerCase().includes(q));
}

/** toggle id ใน list */
export function toggleId(prev: number[], id: number): number[] {
  return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
}

/** check ว่า all visible ids อยู่ใน draft ทั้งหมดหรือไม่ */
export function areAllVisibleChecked(draft: number[], visibleIds: number[]): boolean {
  if (visibleIds.length === 0) return false;
  return visibleIds.every((id) => draft.includes(id));
}

/** นับจำนวน visible ที่ถูก check */
export function countVisibleChecked(draft: number[], visibleIds: number[]): number {
  return draft.filter((id) => visibleIds.includes(id)).length;
}

/** toggle ทุก visible: ถ้า all → uncheck all visible; ถ้าไม่ครบ → add ทั้งหมด */
export function toggleAllVisible(draft: number[], visibleIds: number[]): number[] {
  if (areAllVisibleChecked(draft, visibleIds)) {
    return draft.filter((id) => !visibleIds.includes(id));
  }
  return [...new Set([...draft, ...visibleIds])];
}

/** ตรวจว่า draft = allIds (เซ็ตเดียวกัน) — ใช้ตัดสินใจส่ง undefined แทน array */
export function isDraftAll(draft: number[], allIds: number[]): boolean {
  if (draft.length !== allIds.length) return false;
  return allIds.every((id) => draft.includes(id));
}

/** map draft → ค่า apply (undefined ถ้าเป็นทั้งหมด = ไม่ filter) */
export function resolveApplyValue(draft: number[], allIds: number[]): number[] | undefined {
  return isDraftAll(draft, allIds) ? undefined : draft;
}

/** ตรวจว่ามี filter active อยู่ (value !== undefined && ไม่ครบทุกตัว) */
export function isFilterActive(value: number[] | undefined, allIds: number[]): boolean {
  return value !== undefined && value.length !== allIds.length;
}
