# Architecture Overview

> ภาพรวม service + protocol + data flow ของระบบ Smart Pole — อ่านควบคู่กับ [docs/overview.md](../overview.md)

---

## Service Map

```
┌─────────────────────────┐
│  Pi เสาที่ <poleName>    │  Raspberry Pi (Bookworm 64-bit)
│  ├─ Python script        │  /home/pi/smartpole/main.py
│  ├─ paho-mqtt client     │  publish smartpole/<poleName>/sensor
│  └─ FFmpeg (optional)    │  RTMP push → SRS (planned)
└────────┬────────────────┘
         │ MQTT 5 (TCP 7783 ext / 1883 int)
         ▼
┌─────────────────────────┐
│  Mosquitto 2 broker      │  Docker container
│  ├─ Listener 1883        │  MQTT TCP
│  ├─ Listener 9001        │  MQTT WebSocket
│  ├─ aclfile              │  pattern smartpole/%u/#
│  └─ passwordfile         │  ⚠️ dev: empty (allow_anonymous true)
└────────┬────────────────┘
         │ subscribe smartpole/+/sensor
         ▼
┌─────────────────────────────────────────┐
│  Backend (Bun + Elysia)                  │  Port 7766
│  ├─ plugins/mqtt          subscribe+dispatch
│  ├─ plugins/websocket     in-memory map<userId, ws>
│  ├─ plugins/scheduler     node-cron + pg advisory lock
│  ├─ plugins/prisma        singleton, Decimal+BigInt patch
│  ├─ modules/<entity>      controller→service→repo
│  └─ /uploads static       serve data/uploads/**
└────────┬────────────────┬──────────────┘
         │ SQL            │ WS push (sensor-reading, pole-status-changed)
         ▼                ▼
┌─────────────────┐  ┌─────────────────────┐
│  PostgreSQL 18  │  │  Frontend (Next 16)  │  Port 7765
│  + Timescale*   │  │  ├─ App Router       │
│  database:      │  │  ├─ TanStack Query   │  invalidate on WS
│  smart_pole     │  │  ├─ Zustand auth     │  localStorage persist
└─────────────────┘  │  └─ shadcn UI        │
                     └─────────────────────┘

*Timescale extension วางแผนติดตั้ง — `SensorReading` ตอนนี้คือ Postgres ปกติ
 ยังไม่ได้ทำ hypertable (ดู docs/decision-log.md)
```

---

## Data Flow — Sensor Packet

```
1. Sensor RS485 → Pi (Modbus RTU read every 30s)
2. Pi → MQTT publish "smartpole/<poleName>/sensor" QoS 1
   payload: { timestamp, seq, pm25?, temperature?, humidity? }
3. Mosquitto → route ตาม ACL pattern (production) / anonymous (dev)
4. Backend MQTT plugin → parseTopic → handleSensorMessage
5. Zod validate → resolve poleName ตรง Pole DB → INSERT SensorReading + UPDATE Pole.latest*
6. Backend WebSocket → broadcast { type: "sensor-reading", payload }
7. Frontend useWebSocket → invalidate ["sensor"], ["pole"] queries
8. TanStack Query refetch → Dashboard component re-render
```

---

## Data Flow — Camera Clip

```
1. Dahua IPC-HFW5442E-ZE (กล้อง) → บันทึก mp4 ลง NVR/SD card หรือ NAS
2. Ops → คัดลอกไฟล์มาที่ data/uploads/camera/<poleName>/<YYYY-MM-DD>/<HH-MM-SS>.mp4
   (manual ตอนนี้ — SRS DVR auto-record อยู่ใน roadmap, ดู production-readiness.md P1-3)
3. Frontend /camera → useClipList(poleName, date) → GET /api/cameras/<poleName>/clips?date=...
4. Backend cameraClipService → readdir filesystem → return list
5. User เลือกไฟล์ → <video src={cameraClipApi.buildStreamUrl(...)}>
6. Backend GET /api/cameras/<poleName>/stream?date=&file=
7. Static plugin + HTTP Range request → stream mp4 ตรง browser
```

---

## Data Flow — Offline Detection

```
1. Scheduler ตั้ง cron */1 * * * * (ทุก 1 นาที)
2. job ขอ Postgres advisory lock (กัน multi-instance run ซ้ำ)
3. SELECT Pole WHERE poleStatus = 'online' AND lastSeenAt < now - 5 min
4. UPDATE Pole SET poleStatus = 'offline' WHERE id IN (...)
5. สำหรับเสาที่เปลี่ยน:
   a. WebSocket broadcast { type: "pole-status-changed", payload: { poleName, status: "offline" } }
   b. auditService.log({ action: STATUS_CHANGE, module: "pole", ... }) — fire-and-forget
   c. alertService.createOrIgnore({ poleId, alertType: POLE_OFFLINE, severity: "warning" })
      (dedupe window 60 วินาที กัน alert ซ้ำ)
6. release advisory lock
```

---

## Auth Flow — Login

```
1. Frontend POST /api/captcha → ได้ { sessionKey, image } (SVG dataURI)
2. Frontend POST /api/auth/login { username, password, sessionKey, captchaInput }
3. Backend orchestrator login.ts:
   a. captchaService.verify(sessionKey, captchaInput) — one-time use
   b. verifyCredentials(username, password) — argon2.verify + check status/lock
   c. ถ้า fail: ++loginFailCount → computeLockout → set lockedUntil หรือ status=locked
   d. ถ้าสำเร็จ: reset failCount + lastLoginAt
   e. issueRefreshToken — random 32 byte + sha256 hash store ใน RefreshToken table
   f. auditService.log + systemLog
4. Controller jwt.sign({ sub: userId, role: roleName, tokenVersion }) — exp 15m
5. Return { accessToken, refreshToken, user }
6. Frontend Zustand store persist ใน localStorage (key = "<PREFIX>-auth")
```

---

## Realtime — WebSocket

```
1. Frontend useWebSocket → connect ws://host:7766/ws?token=<accessToken>
2. Backend websocketPlugin → jwt.verify → addConnection(userId, ws)
3. Heartbeat: client ping ทุก 30s → server pong
4. Backend broadcast:
   - broadcastToAll({ type, payload })          ใช้ใน sensor/pole-status (public)
   - sendInvalidate([userIds], entity)          targeted
   - sendNotification([userIds], notification)  targeted (toast + bell)
5. Frontend onMessage → dispatch ตาม type → invalidate TanStack query หรือ toast
6. Reconnect: 3s delay หลัง onclose ถ้ายัง authenticated
```

---

## Module Layer (Backend)

```
Controller (Elysia route)
  ├─ Validate input (TypeBox schema)
  ├─ Resolve user (TODO: authGuard — ปัจจุบัน trust x-user-id header)
  └─ Call service → return { success, data | message }

Service (orchestrator หรือ delegate flow/)
  ├─ Business logic
  ├─ Throw AppError (NotFoundError, ConflictError, ...)
  ├─ Fire-and-forget audit / WS / alert
  └─ Compose flow atoms (สำหรับ module ใหญ่)

Repository (Prisma queries)
  ├─ ใช้ select เฉพาะ field (FOO_LIST_SELECT, FOO_DETAIL_SELECT)
  ├─ filter deletedAt: null ทุก query
  └─ return null ถ้าไม่เจอ (ห้าม throw)

flow/<concern>.ts (atom — สำหรับ module ใหญ่)
  ├─ 1 function 1 step
  ├─ รับ tx?: PrismaTx + return explicit type
  └─ ห้าม import กันข้าม flow file
```

---

## Storage Convention

| ประเภท | ที่อยู่ | Serve |
|---|---|---|
| Camera clip | `data/uploads/camera/<poleName>/<YYYY-MM-DD>/<file>.mp4` | Static plugin + Range request |
| User upload (future) | `data/uploads/<module>/<year>/<month>/<id>-<ts>-<name>.ext` | Static plugin |
| Mosquitto data | `data/mosquitto/data/` | (internal — persistence) |
| Mosquitto log | `data/mosquitto/log/` | (internal) |

> **ไม่มี MinIO/S3** — เลือกใช้ filesystem เพื่อความเรียบง่าย (ดู [decisions/003-filesystem-storage-not-minio.md](./decisions/003-filesystem-storage-not-minio.md))

---

## ดูเพิ่ม

- Architecture Decision Records: [./decisions/](./decisions/)
- MQTT protocol: [../mqtt-spec.md](../mqtt-spec.md)
- Hardware specs (กล้อง/Pi/sensor): [../integration/hardware-specs.md](../integration/hardware-specs.md)
- Port mapping: [../deployment/ports.md](../deployment/ports.md)
- Operational runbook: [../deployment/runbook.md](../deployment/runbook.md)
