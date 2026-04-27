# E15 · Frontend — Dashboard (live)

> Live monitoring dashboard — pole selector + sensor cards + HLS video + alert banner
> ฟังก์ชันอ้างอิง: `project-backup/frontend/app/(main)/page.tsx`

Priority: 4
Blocked by: E14, E07, E08, E10
Status: todo

## Tasks

| Task | ชื่อ | Status |
|------|------|--------|
| T01 | Dashboard layout — pole selector + capability-aware card grid | todo |
| T02 | Sensor cards (PM2.5/temp/humidity) + threshold color | todo |
| T03 | HLS video player (hls.js) — lazy-loaded | todo |
| T04 | Active alerts banner + ack/resolve actions | todo |
| T05 | Realtime updates ผ่าน WebSocket invalidation | todo |
| T06 | Mini chart (last 1 hr) — Recharts lazy | todo |

## Notes
- เปลี่ยนจาก legacy: ลบ `refetchInterval: 30000` → ใช้ WebSocket
- capability flag → ถ้า `hasPm25Sensor=false` → ไม่แสดง card PM2.5
- video player + chart ต้อง lazy load (`next/dynamic`)
