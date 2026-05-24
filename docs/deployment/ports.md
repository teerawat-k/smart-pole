# Ports

> รวม port ทั้งหมดที่ Smart Pole ใช้ — แยกตาม service + scope (internal Docker vs host-mapped)

---

## Port Map

| Port | Service | Direction | Scope | Source |
|---|---|---|---|---|
| **7765** | Frontend (Next.js) | inbound (HTTP) | host + Docker | `frontend/package.json:6` (`next dev -p 7765`), `docker-compose.yml:72` |
| **7766** | Backend (Elysia) | inbound (HTTP + WebSocket `/ws`) | host + Docker | `backend/src/config/env.ts:5` (PORT), `docker-compose.yml:34` |
| **7783** | Mosquitto MQTT TCP | inbound (MQTT 5) | host mapping (external) | `docker-compose.yml:15` → internal `1883` |
| **7791** | Mosquitto MQTT WebSocket | inbound (MQTT 5 over WS) | host mapping | `docker-compose.yml:16` → internal `9001` |
| **5432** | PostgreSQL 18 | local DB | **host install** (ไม่อยู่ใน Docker) | `backend/.env.example:7` |
| **1935** | SRS RTMP | inbound (RTMP push from camera) | planned (ยังไม่ deploy) | `infra/srs/srs.conf:4` |
| **1985** | SRS HTTP API | management API | planned | `infra/srs/srs.conf:12` |
| **8080** | SRS HTTP server (HLS) | inbound (HLS m3u8 + ts) | planned | `infra/srs/srs.conf:17` |

---

## Internal vs External

### Mosquitto
- **Internal (Docker network):** `mosquitto:1883`
  - Backend container ใช้ `MQTT_BROKER_URL=mqtt://mosquitto:1883` (override ใน `docker-compose.yml:40`)
- **External (host mapped):** `localhost:7783`
  - Pi เชื่อมจากภายนอก / Backend ที่รัน `bun dev` บน host ใช้ `mqtt://localhost:7783`

### Backend
- **Internal (Docker network):** `backend:7766`
  - Frontend container เรียก backend ผ่าน service name
  - SRS callback hooks (planned) → `http://backend:7766/api/srs/...`
- **External (host mapped):** `localhost:7766`
  - Frontend `bun dev` บน host เรียกผ่าน `localhost:7766`

### Frontend
- **Internal:** `frontend:7765`
- **External:** `localhost:7765` (dev), `<server-ip>:7765` (UAT)

---

## Production Server (DigitalOcean — current UAT)

Public IP: `152.42.242.162`

| Port | บริการ | URL |
|---|---|---|
| 7765 | Frontend | http://152.42.242.162:7765 |
| 7766 | Backend API | http://152.42.242.162:7766 |
| 7783 | MQTT TCP | `mqtt://152.42.242.162:7783` (สำหรับ Pi เชื่อม) |
| 7791 | MQTT WebSocket | `ws://152.42.242.162:7791` |
| 1935 | SRS RTMP | ⚠️ ยังไม่เปิด — เปิดเมื่อ deploy SRS (ดู [production-readiness P1-3](../production-readiness.md)) |

⚠️ **ยังไม่มี HTTPS** — Phase 1 production-readiness: ติดตั้ง reverse proxy (Caddy หรือ Nginx) + Let's Encrypt → terminate TLS ที่ 443

---

## Firewall (Production checklist)

| Port | เปิด? | ใคร |
|---|---|---|
| 22 (SSH) | ✅ | admin IP only (whitelist) |
| 80, 443 | ✅ | public (HTTPS reverse proxy) |
| 7765, 7766 | ❌ | block (เข้าผ่าน 443 proxy เท่านั้น) |
| 7783, 7791 | ✅ | public หรือ pole subnet (MQTT จาก field) |
| 8883 (MQTT TLS, planned) | ✅ | แทน 7783 ใน production |
| 1935 (RTMP) | ✅ (planned) | กล้องเฉพาะ IP / VPN |
| 5432 (Postgres) | ❌ | localhost only |
| 1985 (SRS API) | ❌ | localhost only |

---

## ทำไมเลือก port 77xx

- **77xx range** = ไม่ชน standard service (HTTP 80/443, SSH 22, ฯลฯ)
- **อยู่ใน private port range** (49152-65535 ไม่ใช่ — 77xx เป็น registered range) แต่ไม่ชน well-known
- **จดจำง่าย** — 4 ตัวเลขสุดท้ายเรียงกัน (7765 / 7766 / 7783 / 7791)
- Production ใช้ proxy ปิดทับ → port เปิดเฉพาะ 443
