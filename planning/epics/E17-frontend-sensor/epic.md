# E17 · Frontend — Sensor Archive + CSV export

Priority: 4
Blocked by: E14, E08
Status: done (refactored 2026-04-28)

## Tasks

| Task | ชื่อ | Status |
|------|------|--------|
| T01 | Page — auto-select pole แรก + paginated table | done |
| T02 | DataTable มาตรฐาน + sortable ทุกคอลัมน์ | done |
| T03 | CSV export (frontend gen + BOM ภาษาไทย) | done |
| T04 | Chart view | TODO (เลื่อน — ไม่ใน scope MVP) |

## Implementation

- `frontend/app/(dashboard)/sensor/page.tsx` — single-page list
- คอลัมน์: ลำดับ (seq), เวลาที่บันทึก (ingestedAt), PM2.5, อุณหภูมิ, ความชื้น
- default sort: `seq desc` — sortable ทุกคอลัมน์ผ่าน DataTable มาตรฐาน
- pagination: server-side, page size 20 (ปรับใน DataTable footer ได้)
- เปลี่ยนเสา → reset page = 1
- CSV export: header ภาษาไทย + BOM + format วันเวลาแบบไทย (`formatDateTime`)

## API ที่ใช้

```
GET /api/poles/:id/sensors/history?page=1&limit=20&sortBy=seq&sortOrder=desc
→ { data, total, page, limit }
```

## ที่ลบออก
- date picker (ตั้งแต่/ถึง) — ใช้ pagination แทน
- sensor type combobox (เก่ามี pm25/temperature/humidity/heartbeat — ตอนนี้ flat schema แสดงทุก field พร้อมกัน)
- API `GET /api/sensor-types` (ลบ table ใน backend)

## Notes
- Chart view ไม่อยู่ใน MVP — ถ้าทำให้ใช้ `next/dynamic({ ssr: false })` lazy load Recharts
