// เกณฑ์ความสด (freshness) ของค่า sensor
// ถ้าค่าล่าสุด (latestReadingAt) เก่ากว่านี้ → ถือว่า sensor "ไม่ทำงาน" → คืนค่า metric เป็น null
//
// เสาอ่านทุก ~60s → 240s (4 นาที) = ทน 3 ครั้งที่เงียบก่อนตัดสินว่า sensor dead
// (สั้นเกิน = false alarm จาก jitter · ยาวเกิน = โชว์ค่าผีนาน)
//
// ⚠️ single source of truth — ใช้ร่วมกัน: dashboard `findLatest` + (อนาคต) sensor-push freshness gate
export const SENSOR_FRESHNESS_MS = 4 * 60 * 1000;
