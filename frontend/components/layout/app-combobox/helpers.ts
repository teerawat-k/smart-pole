export interface ComboboxOption {
  id: string | number;
  label: string;
  warning?: string;
  group?: string;
}

export interface ComboboxGroup {
  key: string;
  label: string;
}

/** หา option ที่ตรงกับ value ที่เลือก */
export function findSelectedOption(
  options: ComboboxOption[],
  value: string | number | null | undefined,
): ComboboxOption | undefined {
  return options.find((o) => o.id === value);
}

/** กรอง options ตาม group key */
export function filterOptionsByGroup(
  options: ComboboxOption[],
  groupKey: string,
): ComboboxOption[] {
  return options.filter((o) => o.group === groupKey);
}

/** decide label ที่จะแสดงใน trigger */
export function resolveDisplayLabel(
  selected: ComboboxOption | undefined,
  required: boolean | undefined,
  placeholder: string,
): string {
  if (selected) return selected.label;
  return required ? placeholder : "ไม่ระบุ";
}

/** ตรวจว่ามี groups (ใช้ render แบบ grouped command) */
export function hasGroups(groups: ComboboxGroup[] | undefined): groups is ComboboxGroup[] {
  return Array.isArray(groups) && groups.length > 0;
}
