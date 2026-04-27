# Smart Pole

ระบบรับและแสดงผลข้อมูลจาก **เสาสัญญาณอัจฉริยะ (Smart Pole)** ที่ส่งข้อมูลผ่าน **MQTT 5** เข้ามายังระบบส่วนกลาง — รองรับ live monitoring, telemetry archive, video recording, และ multi-role permission

> โปรเจคนี้มีระบบเดิมที่จูเนียร์ทำมาแล้ว (อยู่ใน `project-backup/`) ฟังก์ชันค่อนข้างครบ แต่คุณภาพโค้ดยังไม่ได้มาตรฐาน
> **โปรเจค repo นี้ = refactor ครั้งใหญ่** ตามมาตรฐาน atomic-first, testable, layered architecture

---

## 1. Domain Overview

ข้อมูลที่รับเข้ามาจากเสาแต่ละต้น (publish ผ่าน MQTT 5):

| Topic | QoS | Payload |
|---|---|---|
| `smartpole/{poleName}/sensor` | 1 | `{ pole_id, timestamp, pm25, temperature, humidity, seq }` |
| `smartpole/{poleName}/heartbeat` | 0 | `{ pole_id, timestamp, status, signal_dbm, uptime_sec }` |
| `smartpole/{poleName}/alert` | 2 | `{ pole_id, timestamp, alert_type, value, threshold, message }` |

อุปกรณ์ที่ติดตั้งบนเสา (configurable per pole):
- 📷 กล้องวงจรปิด (RTMP push → SRS → HLS) + DVR เก็บเป็น `.mp4`
- 🌫️ PM2.5 sensor
- 🌡️ Temperature + Humidity sensor
- 💡 LED control
- 💓 Heartbeat (offline detect ถ้าไม่ส่งเกิน 3 นาที)

---

## 2. Architecture

```
[Smart Pole #1..N]
    │           │           │
    │ MQTT 5    │ RTMP push │ HTTP callback
    ▼           ▼           ▼
 [Mosquitto]  [SRS]    [Backend API]
    │           │           ▲
    │ subscribe │ HLS/DVR   │
    ▼           │           │
 [Backend]──────┼───────────┘
    │           │
    ├── Postgres   ─ master data, users, roles, alerts, recordings index, logs
    ├── InfluxDB   ─ sensor time-series, heartbeat history
    ├── MinIO      ─ video recording files (.mp4)
    └── WebSocket  → [Frontend] live dashboard
```

**Stack ที่ refactor แล้วจะใช้:**

| Layer | Tech |
|---|---|
| Runtime | **Bun** (เปลี่ยนจาก Node + tsx) |
| Backend | **Elysia 1.4** (เปลี่ยนจาก Fastify) + Prisma 7 + Pino |
| Frontend | Next.js 16 + **shadcn/ui + RHF + Zustand 5 + TanStack Query 5** (เพิ่มจากเดิม) |
| Auth | JWT access/refresh + RBAC (`module:action`) — เปลี่ยนจาก single JWT + page-permission |
| Realtime | **WebSocket** (เพิ่มใหม่ — เดิม polling 30s) |
| MQTT broker | Mosquitto 2 (คงเดิม) |
| Time-series | InfluxDB 2 (คงเดิม) |
| Object storage | MinIO (คงเดิม) |
| Streaming | SRS 5 — RTMP/HLS/DVR (คงเดิม) |
| Postgres | 16 (คงเดิม) |
| E2E | Playwright (เพิ่มใหม่) |
| CI/CD | GitHub Actions — UAT-dev only |

---

## 3. Features (ระบบเดิมมีครบ — ใช้เป็น scope refactor)

### 3.1 Core monitoring
- ✅ **Live Dashboard** — แสดง pole status (online/offline), sensor ล่าสุด (PM2.5/temp/humidity), HLS live stream, alert ที่ยังไม่ resolve
- ✅ **Pole Selector** — สลับเสาดู
- ✅ **Auto-offline detection** — ถ้าไม่รับ heartbeat ภายใน 3 นาที → mark offline

### 3.2 Archive
- ✅ **Camera Archive** — เลือก pole + วันที่ → list video recording (DVR จาก SRS) → กดเล่น (signed URL จาก MinIO)
- ✅ **Sensor Archive** — เลือก pole + ช่วงเวลา → query InfluxDB → ตาราง + export CSV

### 3.3 Master / Admin
- ✅ **Pole Management** — CRUD (`poleName`, `installPlace`, `ddnsHostname`, `ipCamera`, GPS, has_camera/pm25/temp/led)
- ✅ **User Management** — CRUD + enable/disable + reset password
- ✅ **Role & Permission** — สร้าง role + กำหนด permission per page (canView/Create/Edit/Delete/Export)
- ✅ **My Profile** — แก้ข้อมูลตัวเอง + เปลี่ยนรหัสผ่าน
- ✅ **System Log** — query log (login success/fail, action) + filter by type/user/date

### 3.4 Auth
- ✅ **Login + CAPTCHA** — กรอก username/password + captcha
- ✅ **Lockout policy** — 4-6 fails = lock 10 min, 7-9 = 30 min, ≥10 = disable account

### 3.5 MQTT Ingress
- ✅ Subscribe `smartpole/+/sensor` + `heartbeat` + `alert` พร้อม persist Postgres/Influx
- ✅ Auto-create `Alert` row ใน Postgres เมื่อรับ MQTT alert

---

## 4. ปัญหาของระบบเดิม (เหตุผลที่ต้อง refactor)

### Architecture / code quality
- ❌ ไม่มี layer แยก — `route` → `prisma` ตรง, business logic ปนกับ HTTP handler
- ❌ ไม่มี repository layer
- ❌ MQTT service เรียก `prisma.alert.create` ตรง (ข้าม service layer)
- ❌ ใช้ `any` หลายจุด (`request.user as { id, roleId }`, `(BigInt.prototype as any).toJSON`)
- ❌ ไม่มี Zod / TypeBox validation ที่ route layer
- ❌ ไม่มี error class — ใช้ `throw new Error('POLE_EXISTS')` แล้ว match string

### Data / persistence
- ❌ ไม่มี soft-delete (ลบ user แบบ hard delete)
- ❌ ไม่มี `createdBy`/`updatedBy`/`deletedBy`/`deletedAt` ตามมาตรฐาน
- ❌ ไม่มี audit log helper — ใช้ `system_log` ปนกับ login log
- ❌ ไม่มี transaction (`updateRolePermissions` upsert ทีละ row ใน loop)
- ❌ Authorization middleware query DB ทุก request (ไม่ cache role)

### API
- ❌ ไม่มี `/lookup` endpoint — combobox โหลด list ทั้งหมด (`GET /api/poles`)
- ❌ ไม่มี pagination (poles/users/roles)
- ❌ ไม่มี response envelope มาตรฐาน (`{ success, data, ... }`)
- ❌ Captcha ส่ง plain text กลับ frontend (ไม่ใช่รูป)
- ❌ ใช้ `bcryptjs` (ช้ามาก) ไม่ใช่ argon2id

### Frontend
- ❌ Auth ใช้ `localStorage` + `AuthContext` (ไม่ใช่ Zustand persist)
- ❌ ไม่มี shadcn/ui — ใช้ Tailwind class ตรง ทุกหน้า duplicate utility
- ❌ ไม่มี form library (RHF) — ใช้ controlled state เอง
- ❌ ไม่มี `DataTable` component — ทุกหน้าเขียน table เอง
- ❌ ใช้ `refetchInterval: 30000` แทน WebSocket invalidation
- ❌ Sidebar hardcode `adminOnly: true` แทน permission flag จาก backend
- ❌ Mixin business logic + UI ใน page component (`/dashboard/page.tsx` 120+ LoC ทำทุกอย่าง)

### MQTT / Realtime
- ❌ Offline detection ใช้ `setTimeout` in-memory — restart server = state หาย
- ❌ ไม่มี last-will message ตอน disconnect
- ❌ Topic schema ไม่ validate (parse JSON ตรง)
- ❌ ไม่มี dead-letter / replay สำหรับ message ที่ process fail

---

## 5. Repository Structure

```
smart-pole/
├── CLAUDE.md                    project-wide convention (atomic-first)
├── README.md                    (ไฟล์นี้)
├── docker-compose.yml           7 services: postgres, influx, minio, mosquitto, srs, adminer, backend, frontend
├── .env.example
├── .github/workflows/uat-dev.yml
│
├── backend/                     Elysia + Prisma 7 + MQTT subscriber
├── frontend/                    Next.js 16 + shadcn/ui
├── e2e/                         Playwright
├── docs/
│   ├── overview.md              ภาพรวม domain
│   ├── decision-log.md
│   ├── legacy-analysis.md       สำรวจระบบเดิม + ปัญหา
│   ├── mqtt-spec.md             topic + payload schema
│   └── test-scenarios/          เอกสารตรวจรับ
├── planning/
│   ├── PLANNING.md              epic overview
│   ├── CHANGELOG.md
│   └── epics/E{nn}-{name}/tasks/T{nn}.md
├── scripts/deploy.sh
└── infra/                       (เพิ่มใหม่) mosquitto + srs config + minio init
    ├── mosquitto/config/
    └── srs/srs.conf
```

> รายละเอียด convention: ดู `CLAUDE.md` ที่ root + ทุก sub-folder

---

## 6. Ports

| Service | Port | URL |
|---|---|---|
| Frontend | `7765` | http://localhost:7765 |
| Backend | `7766` | http://localhost:7766 |
| Postgres | `5432` | postgresql://… |
| InfluxDB | `8086` | http://localhost:8086 |
| MinIO API | `9000` | http://localhost:9000 |
| MinIO Console | `9090` | http://localhost:9090 |
| Mosquitto MQTT | `1883` / `9001` (WS) | mqtt://… |
| SRS RTMP | `1935` | rtmp://… |
| SRS HLS | `8080` | http://…/live/{pole}.m3u8 |
| Adminer | `8082` | http://localhost:8082 |

---

## 7. Quick Start

```bash
# 1. ขึ้น infra
cp .env.example .env
docker compose -f docker-compose.infra.yml up -d   # postgres, influx, minio, mosquitto, srs, adminer

# 2. Backend
cd backend
cp .env.example .env
bun install
bun run db:migrate
bun run db:seed
bun dev          # http://localhost:7766

# 3. Frontend
cd frontend
cp .env.example .env.local
bun install
bun dev          # http://localhost:7765

# 4. E2E (หลัง backend + frontend ทำงาน)
cd e2e
bun install
bun test
```

**Default admin** (จาก seed): `username: admin / password: Admin@1234`

---

## 8. Refactor Plan — High Level

ดูรายละเอียดที่ `planning/PLANNING.md` (8 epics, ~60 tasks)

| Phase | Epics | จุดประสงค์ |
|---|---|---|
| **Phase 0 — Foundation** | E00 | Layer + atomic + error/audit/auth/RBAC core |
| **Phase 1 — Master data** | E01 | User · Role · Pole CRUD ตาม pattern atomic |
| **Phase 2 — Ingress** | E02 · E03 | MQTT broker plugin · sensor/heartbeat/alert handlers · offline detection persistent |
| **Phase 3 — Archive** | E04 · E05 | Sensor history (Influx) + Camera recording (MinIO + SRS) |
| **Phase 4 — Realtime** | E06 | WebSocket + Live dashboard (เปลี่ยนจาก polling) |
| **Phase 5 — Audit + Log** | E07 | System log + audit log แยก + RBAC cache |
| **Phase 6 — Quality** | E08 | E2E + test scenarios + delivery docs |

---

## 9. Documentation Map

| ไฟล์ | จุดประสงค์ |
|---|---|
| `CLAUDE.md` (root) | project-wide convention (atomic, naming, git, security) |
| `backend/CLAUDE.md` | layer architecture + atomic refactor pattern + Prisma + API + MQTT plugin |
| `frontend/CLAUDE.md` | UI standards + atomic component + state + lookup pattern |
| `e2e/CLAUDE.md` | Playwright structure + screenshot + test cases |
| `docs/CLAUDE.md` | test-scenarios → delivery workflow |
| `docs/overview.md` | domain ภาพรวม |
| `docs/legacy-analysis.md` | สำรวจ project-backup + ปัญหาที่ refactor จะแก้ |
| `docs/mqtt-spec.md` | topic naming + payload schema |
| `docs/decision-log.md` | บันทึก decision สำคัญ |
| `planning/PLANNING.md` | epic overview + sprint |
| `planning/CHANGELOG.md` | บันทึกการเปลี่ยนแปลงจากลูกค้า |

---

## 10. CI/CD

GitHub Actions — **UAT-dev only** (ดู `.github/workflows/uat-dev.yml`)
- Trigger: push → `develop` หรือ manual dispatch
- Steps: install → typecheck (`bunx tsc --noEmit`) → unit test → build Docker → push registry → SSH deploy UAT host

---

## License

Internal project — proprietary.
