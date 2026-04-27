const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
  "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
  "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
] as const;

/** Format date as "17 มีนาคม 2026" */
export function formatDate(value: string | Date | null | undefined, fallback = "-"): string {
  if (!value) return fallback;
  const d = new Date(value);
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Format date+time as "17 มีนาคม 2026 14:30" */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear()} ${hh}:${min}`;
}

/** แปลง Date/string เป็น "YYYY-MM-DD" สำหรับใช้เป็น form value — คืน fallback ถ้า invalid */
export function toISODateString(value: string | Date | null | undefined, fallback = ""): string {
  if (!value) return fallback;
  const d = new Date(value);
  if (isNaN(d.getTime())) return fallback;
  return d.toISOString().split("T")[0];
}

/** ตัด 2 ทศนิยม (truncate, ห้ามปัดเศษ) — ใช้กับเงิน/qty/percent ทุกการคำนวณบน frontend
 *  เหตุผล: ระบบบัญชีของโครงการยึดค่าจริงตัดทิ้ง ปัดเศษทำให้ยอดผิดเพี้ยนสะสม */
export function trunc2(value: number): number {
  return Math.trunc(value * 100) / 100;
}

/** Format a number as Thai currency with 2 decimal places e.g. "1,234.50" */
export function formatMoney(value: number | null | undefined, fallback = "—"): string {
  if (value === null || value === undefined) return fallback;
  return value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Format a percent value with 2 decimal places e.g. 30 → "30.00", 30.5 → "30.50" */
export function formatPercent(value: number | null | undefined, fallback = "—"): string {
  if (value === null || value === undefined) return fallback;
  return value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Format relative time in Thai e.g. "เมื่อสักครู่", "5 นาทีที่แล้ว", "2 ชั่วโมงที่แล้ว" */
export function formatRelativeTime(value: string | Date | null | undefined): string {
  if (!value) return "";
  const diff = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (diff < 60) return "เมื่อสักครู่";
  if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
  return formatDate(value);
}
