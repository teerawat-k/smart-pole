// Date format helpers — DB เก็บ UTC, frontend แสดง Asia/Bangkok
const TZ = "Asia/Bangkok";

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: TZ,
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: TZ,
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  // ตัด 2 ทศนิยม (truncate) — ห้ามปัด
  const truncated = Math.trunc(value * 100) / 100;
  return new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(truncated);
}
