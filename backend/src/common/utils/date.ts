// ── Date helpers — DB เก็บ UTC, ใช้ Asia/Bangkok ตอน UI display ─────────

/** parse YYYY-MM-DD หรือ ISO string → Date | undefined */
export function parseOptionalDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** นับจำนวนวัน calendar day (วันเดียวกัน = 1, ข้ามวัน = 2, ...) */
export function calcDaysDiff(from: Date, to: Date): number {
  const fromDate = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const toDate = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  const diffMs = toDate.getTime() - fromDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}

/**
 * คืน start/end ของวันใน Asia/Bangkok zone (UTC+7)
 * @example dayRange("2026-04-27") → { start: 2026-04-26T17:00:00Z, end: 2026-04-27T16:59:59.999Z }
 */
export function dayRange(date: Date | string): { start: Date; end: Date } {
  const base = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(base.getTime())) throw new Error("Invalid date");

  // Asia/Bangkok = UTC+7 → start of day in BKK = 17:00 UTC ของวันก่อนหน้า
  const ymd = base.toISOString().slice(0, 10);
  const start = new Date(`${ymd}T00:00:00+07:00`);
  const end = new Date(`${ymd}T23:59:59.999+07:00`);
  return { start, end };
}
