export interface Option {
  id?: string | number;
  value?: string | number;
  label: string;
}

/** ป้องกัน options เป็น non-array (defensive) */
export function safeOptions(options: Option[] | undefined): Option[] {
  return Array.isArray(options) ? options : [];
}

/** ดึง value canonical ของ option (รองรับทั้ง value และ id) */
export function getOptionValue(option: Option): string | number | undefined {
  return option.value ?? option.id;
}

/** หา option ที่ตรงกับ field value */
export function findOptionByValue(
  options: Option[],
  fieldValue: unknown,
): Option | undefined {
  return options.find((option) => getOptionValue(option) === fieldValue);
}

/** label ที่จะแสดง: option label → placeholder (required) → "ไม่ระบุ" */
export function resolveDisplayLabel(
  selected: Option | undefined,
  required: boolean | undefined,
  placeholder: string,
): string {
  if (selected) return selected.label;
  return required ? placeholder : "ไม่ระบุ";
}

/** show check ที่ "ไม่ระบุ" เมื่อ field value ว่าง (null/undefined) แต่ไม่ใช่ 0 */
export function shouldShowClearCheck(fieldValue: unknown): boolean {
  return !fieldValue && fieldValue !== 0;
}
