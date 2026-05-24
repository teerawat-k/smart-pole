# SRS Live Streaming — Planned (ยังไม่ deploy)

> ⚠️ **สถานะ:** ออกแบบไว้ครบ — config [infra/srs/srs.conf](../../infra/srs/srs.conf) พร้อม, **ยังไม่ deploy** + backend handler ยังไม่ implement
>
> ดู [production-readiness.md](../production-readiness.md) **P1-3** สำหรับ implementation plan

---

## ทำไมยังไม่ deploy

ตัดสินใจ **defer** จนกว่า stakeholder จะ confirm ต้องการ live streaming — ดู [docs/decision-log.md](../decision-log.md) entry `2026-05-24 · Defer SRS live streaming handler`

**ทางเลือกปัจจุบัน:** Camera clip filesystem browser ([backend/src/modules/camera-clip/](../../backend/src/modules/camera-clip/)) — user เปิดดู clip mp4 offline ผ่านหน้า `/camera` + dashboard

---

## Design Summary (เมื่อพร้อม deploy)

### Flow

```
Dahua Camera           SRS                   Backend                Frontend
─────────────       ──────────         ─────────────────         ──────────
[RTMP push]    →   [RTMP recv]   →   [POST /api/srs/         →   [WS notify]
                    │                  on-publish]                  refetch
                    │
                    ├─ HLS gen   →   <UPLOAD_DIR>/hls/      →   [HLS player]
                    │                  <poleName>.m3u8           hls.js
                    │
                    └─ DVR mp4   →   <UPLOAD_DIR>/recordings/
                                       <poleName>/
                                       <YYYY-MM-DD>/
                                       <HH-MM-SS>.mp4
                                     [POST /api/srs/
                                       on-dvr]
```

### SRS Config (drafted, ใน repo แล้ว)

ดู [infra/srs/srs.conf](../../infra/srs/srs.conf):

| รายการ | ค่า |
|---|---|
| RTMP listen | 1935 |
| HLS dir | `./objs/nginx/html` |
| HLS fragment | 4 วินาที |
| HLS window | 30 วินาที (rolling) |
| DVR plan | segment |
| DVR duration | 1800 วินาที (30 นาที) |
| DVR path | `recordings/[stream]/[2006-01-02]/[15-04-05].mp4` |
| HTTP API | port 1985 |
| HTTP server | port 8080 |
| HTTP hooks | 3 callback → backend `:7766` |

### Stream Key Convention

- 1 stream = 1 pole
- Stream key = `poleName` (เช่น `pole-01`)
- RTMP push URL: `rtmp://<srs-host>:1935/live/<poleName>`
- HLS playback URL: `http://<srs-host>:8080/live/<poleName>.m3u8`

### Backend Callback Endpoints (planned, ยังไม่มี)

| Method | Path | เมื่อไหร่ | Backend ทำอะไร |
|---|---|---|---|
| POST | `/api/srs/on-publish` | กล้องเริ่ม RTMP push | (option) mark `Pole.poleStatus = streaming` + audit |
| POST | `/api/srs/on-unpublish` | Stream หลุด | revert flag + audit |
| POST | `/api/srs/on-dvr` | DVR mp4 segment เซฟเสร็จ | (option) index DB หรือแค่ broadcast WS ให้ frontend refetch |

> Backend ตอบ HTTP 200 = อนุญาต SRS ทำงานต่อ; non-200 = SRS ปฏิเสธ stream

---

## Frontend (planned)

- ติดตั้ง `hls.js` ใน `frontend/package.json`
- สร้าง `components/shared/hls-player.tsx` — wrapper รอบ `<video>` + hls.js
- Dashboard `<video>` แทนที่ clip browser ด้วย live player (สลับโหมด live/recorded)

---

## Migration Path

ดู [production-readiness.md P1-3](../production-readiness.md) สำหรับ:
- Implementation checklist
- Docker compose update (add SRS service)
- Pole status enum update
- Frontend HLS player skeleton
- Camera RTMP push config

---

## เมื่อตัดสินใจ "ไม่ทำ live streaming"

ถ้า stakeholder confirm ใช้ filesystem clip browser พอ:
1. ลบ folder `infra/srs/`
2. ลบ entry [P1-3 ใน production-readiness.md](../production-readiness.md)
3. ลบ decision-log entry นี้ (mark superseded)
4. ลบไฟล์ doc นี้
