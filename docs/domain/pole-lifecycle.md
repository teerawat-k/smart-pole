# Pole Lifecycle & Status

> วงจรชีวิตของเสาแต่ละต้นและกฎที่ระบบใช้ตัดสิน status

---

## Pole Status Enum

```prisma
enum PoleStatus {
  online       // เสาส่ง sensor packet ภายใน 5 นาทีล่าสุด
  offline      // ไม่มี packet เกิน threshold (default 5 นาที)
  maintenance  // admin set ผ่าน POST /api/poles/:id/maintenance
  unknown      // เริ่มต้น (เสาเพิ่งสร้าง ยังไม่ส่ง packet ครั้งแรก)
}
```

ค่า default ตอน create = `unknown`

---

## State Transitions

```
                ┌─────────────┐
                │   unknown   │  (เสาเพิ่งสร้าง ยังไม่ส่ง packet)
                └──────┬──────┘
                       │ MQTT packet มา
                       ▼
              ┌──────────────────┐
              │      online      │ ◄──────────────────────┐
              └─────┬────────────┘                        │
                    │ lastSeenAt < now - 5min             │ MQTT packet กลับมา
                    │ (background scan ทุก 1 นาที)         │
                    ▼                                     │
              ┌──────────────────┐                        │
              │     offline      │ ───────────────────────┘
              └─────┬────────────┘
                    │ admin set maintenance
                    │ (POST /:id/maintenance enabled:true)
                    ▼
              ┌──────────────────┐
              │   maintenance    │
              └─────┬────────────┘
                    │ admin clear maintenance
                    │ (POST /:id/maintenance enabled:false)
                    ▼
                  (กลับเป็น offline ก่อน แล้วถ้า packet มา → online)
```

> **ระหว่าง maintenance**: backend ยังรับ MQTT packet ได้ปกติ + update `lastSeenAt` ได้ แต่ **ไม่เปลี่ยน status** กลับเป็น online (admin ต้องคลายเอง)

---

## Offline Detection

### Mechanism
ไม่มี MQTT topic `heartbeat` แยก — ระบบใช้ `Pole.lastSeenAt` ที่ update ทุกครั้งรับ sensor packet เป็น signal

### Background Job
ดู [scan-offline-poles.ts](../../backend/src/modules/heartbeat-scan/flow/scan-offline-poles.ts):
- รัน cron `*/1 * * * *` (ทุก 1 นาที)
- ขอ Postgres advisory lock ([scheduler.ts](../../backend/src/plugins/scheduler.ts)) เพื่อกัน multi-instance run ซ้ำ
- `SELECT Pole WHERE poleStatus = 'online' AND lastSeenAt < now - threshold`
- `UPDATE Pole SET poleStatus = 'offline'`
- สำหรับเสาที่เปลี่ยน:
  - WebSocket broadcast `{ type: "pole-status-changed" }`
  - audit log (`STATUS_CHANGE`, payload: `{ from: "online", to: "offline", reason: "heartbeat_timeout" }`, `userId = SYSTEM_USER_ID = 0`)
  - alertService.createOrIgnore (POLE_OFFLINE, severity: warning) — dedupe 60s

### Threshold
- Default = **5 นาที** (`POLE_OFFLINE_THRESHOLD_MINUTES` env)
- ปรับได้ผ่าน env per environment

---

## Pole Operations (Admin)

### Create

`POST /api/poles`
- Required: `poleName` (unique), `installPlace`
- Optional: `latitude, longitude, ipCamera, ddnsHostname, cameraModel, hasCamera, hasPm25Sensor, hasTempHumidity, hasLed`
- Backend gen MQTT credential auto:
  - `mqttUsername = poleName`
  - `mqttPassword` = random 32 byte hex (จะ return ครั้งเดียวใน response)
  - `mqttPasswordHash` = argon2 hash → เก็บ DB
- Response: `{ success, data: pole, message: "...โปรดบันทึก MQTT password (จะไม่แสดงอีก)" }`

### Update

`PATCH /api/poles/:id`
- แก้ field พื้นฐานได้: `installPlace, location, cameraModel, capability flags, ipCamera, ddnsHostname`
- **`poleName` แก้ไม่ได้** (immutable หลัง create — เป็น MQTT topic key)

### Set Maintenance

`POST /api/poles/:id/maintenance`
- Body: `{ enabled: boolean, reason?: string }`
- `enabled: true` → `poleStatus = "maintenance"` + `maintenanceReason = reason`
- `enabled: false` → `poleStatus = "offline"` + clear reason

### Regenerate MQTT Credential

`POST /api/poles/:id/regenerate-credential`
- gen MQTT password ใหม่ + hash ใหม่
- เก่าใช้ไม่ได้ทันที (ต้อง update Pi ก่อน)
- Response: plain password ใหม่ (ครั้งเดียว)
- Use case: password leak / rotation policy / Pi ลืม password

### Soft Delete

`DELETE /api/poles/:id`
- Set `deletedAt = now, deletedBy = admin.id`
- **Cascade:** ลบ `SensorReading` ทั้งหมดของเสา (Prisma `onDelete: Cascade` บน foreign key) — ⚠️ ตรวจให้ดีก่อนลบ

---

## Pole Capability Flags

| Flag | ความหมาย | กระทบ UI |
|---|---|---|
| `hasCamera` | เสาติดกล้อง | Camera page filter เสาที่มีกล้องเท่านั้น, Dashboard แสดง section camera clip |
| `hasPm25Sensor` | เสามี PM2.5 sensor | Dashboard sensor card แสดง PM2.5 |
| `hasTempHumidity` | เสามี temp+humidity sensor | Dashboard sensor card แสดง 2 card |
| `hasLed` | เสามี LED control | (อนาคต) แสดง control panel |

⚠️ **ไม่มี `hasPm10Sensor` flag** — แม้ sensor PM2510TH-OD รองรับ PM10 ดู [hardware-specs.md § 3](../integration/hardware-specs.md) + [production-readiness.md](../production-readiness.md) P2-3

---

## Sensor Snapshot (Latest)

ทุกครั้งที่ MQTT packet `smartpole/<poleName>/sensor` มา → backend update ตาราง `Pole`:

```
Pole.latestSeq         = packet.seq
Pole.latestPm25        = packet.pm25
Pole.latestTemperature = packet.temperature
Pole.latestHumidity    = packet.humidity
Pole.latestReadingAt   = packet.timestamp
Pole.lastSeenAt        = packet.timestamp
Pole.poleStatus        = "online"
```

+ insert row ใหม่ใน `SensorReading` (history)

### ทำไม denormalize?

- Dashboard query `GET /api/poles/:id/sensors/latest` ตอบไว (1 row จาก Pole, ไม่ต้อง subquery `SensorReading`)
- List page (`GET /api/poles`) แสดงค่าล่าสุด + status ใน 1 query
- Lock contention ที่ Pole row ระดับ acceptable เพราะ 1 packet/30s/เสา

---

## Alert Auto-Create

เมื่อเสาเปลี่ยน online → offline (จาก background scan):
- `alertService.createOrIgnore({ poleId, alertType: POLE_OFFLINE, severity: "warning" })` — dedupe 60s
- ⚠️ **Backend สร้าง alert + เก็บใน DB** แต่ **frontend ไม่มีหน้าแสดง** (ดู [decision-log](../decision-log.md) entry `2026-05-24 · Alert system`)

Alert types ที่ระบบรองรับ (ดู [alert.constants.ts](../../backend/src/modules/alert/alert.constants.ts)):
- `pm25_high, temp_high, temp_low, humidity_high, humidity_low` — sensor threshold (ยังไม่มี rule engine กระตุ้น)
- `pole_offline` — สร้างจาก background scan
- `tampering, device_error, power_loss` — (อนาคต — ต้องมี event topic เพิ่ม)

---

## Auto-Resolve

เมื่อเสากลับเป็น online (packet มาใหม่):
- ตอนนี้ **ยังไม่มี auto-resolve flow** ใน sensor handler
- `alertService.autoResolveForPole(poleId, alertType)` มีพร้อม แต่ไม่มีจุดเรียก
- → ดู [production-readiness.md](../production-readiness.md) (อาจเพิ่มเป็น P2)
