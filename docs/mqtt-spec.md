# MQTT Spec

> สเปคของ topic + payload ที่ใช้ระหว่างเสาสัญญาณ ↔ backend
> Broker: Mosquitto 2 (MQTT 5) — auth ด้วย username/password + ACL per pole (planned)

---

## 1. Topic Naming

```
smartpole/{poleName}/{messageType}
```

- `poleName` = `Pole.poleName` (unique ใน DB) — ห้ามเว้นวรรค, kebab-case แนะนำ
- `messageType` = `sensor` | `heartbeat` | `alert` | `command` (downstream — phase 2)

---

## 2. Topics (upstream — เสา → backend)

### 2.1 `smartpole/{poleName}/sensor`

| Property | Value |
|---|---|
| QoS | 1 (at-least-once) |
| Retained | false |
| Frequency | ทุก 30s (config ได้ที่ฝั่งเสา) |

**Payload (JSON):**
```json
{
  "pole_id": "pole-001",
  "timestamp": "2026-04-27T10:30:00Z",
  "pm25": 35.2,
  "temperature": 28.5,
  "humidity": 65.0,
  "seq": 12345
}
```

**Validation (refactor — Zod):**
- `pole_id`: string, ตรงกับ topic
- `timestamp`: ISO 8601, ห่างจาก server time ≤ 5 min (กัน replay)
- `pm25` / `temperature` / `humidity`: number, finite
- `seq`: integer, monotonic per pole (ถ้าน้อยลง = ของเก่า, drop)

**Side effect:**
- write Influx `sensor_readings` measurement
- update `pole.lastSeenAt` (อ่อน — ไม่ persist online status เพราะ heartbeat ทำหน้าที่)

---

### 2.2 `smartpole/{poleName}/heartbeat`

| Property | Value |
|---|---|
| QoS | 0 (fire-and-forget — ส่งบ่อย) |
| Retained | false |
| Frequency | ทุก 30s |

**Payload:**
```json
{
  "pole_id": "pole-001",
  "timestamp": "2026-04-27T10:30:00Z",
  "status": "online",
  "signal_dbm": -67,
  "uptime_sec": 86400
}
```

**Side effect:**
- update `pole.poleStatus = "online"` + `pole.lastSeenAt = now()`
- write Influx `pole_heartbeat` measurement
- reset offline detection timer (persistent — ดู §4)

---

### 2.3 `smartpole/{poleName}/alert`

| Property | Value |
|---|---|
| QoS | 2 (exactly-once — สำคัญ) |
| Retained | false |
| Frequency | event-based |

**Payload:**
```json
{
  "pole_id": "pole-001",
  "timestamp": "2026-04-27T10:30:00Z",
  "alert_type": "pm25_high",
  "value": 150.5,
  "threshold": 100.0,
  "message": "PM2.5 เกินค่ามาตรฐาน"
}
```

**Side effect:**
- create `Alert` row (ผ่าน `alertService.create()` — ไม่เรียก repo ตรง)
- broadcast WebSocket → frontend invalidate + toast
- severity: `value > threshold * 1.5` → critical, else warning

**Alert types (enum):**
- `pm25_high`
- `temp_high` / `temp_low`
- `humidity_high` / `humidity_low`
- `signal_weak`
- `device_error`
- `tampering` (กรณีมี sensor ตรวจจับ)

---

### 2.4 Last Will (เพิ่มใหม่ — refactor)

เสาทุกต้นต้องตั้ง LWT ตอน connect:
```
topic:    smartpole/{poleName}/heartbeat
payload:  {"pole_id":"…","status":"offline","timestamp":"…"}
qos:      1
retain:   false
```

→ ถ้าเสา disconnect แบบไม่ส่ง DISCONNECT ปกติ broker จะส่ง LWT ให้ backend อัตโนมัติ
→ backend mark offline ทันที (ไม่ต้องรอ 3 นาที)

---

## 3. Topics (downstream — backend → เสา) — Phase 2

### 3.1 `smartpole/{poleName}/command`

สำหรับสั่งงานเสา (เช่น เปิด/ปิด LED, restart, update config)

**Payload:**
```json
{
  "command_id": "uuid-v4",
  "command": "led_on",
  "args": { "color": "red", "duration_sec": 60 },
  "issued_by": "user-id",
  "issued_at": "..."
}
```

**Ack:** เสาตอบกลับที่ `smartpole/{poleName}/command/ack` ด้วย `command_id` เดียวกัน

---

## 4. Offline Detection (refactor strategy)

### ระบบเดิม (มีปัญหา)
```ts
const heartbeatTimers = new Map<string, NodeJS.Timeout>()
setTimeout(() => markOffline(pole), 3 * 60 * 1000)
```
→ restart server = state หาย, scale-out ไม่ได้

### ระบบใหม่
1. ทุก heartbeat → update `pole.lastSeenAt` ใน Postgres
2. **Scheduled job** (cron `*/1 * * * *`) → query `WHERE lastSeenAt < now() - interval '3 min' AND poleStatus = 'online'` → mark offline + emit alert
3. รองรับหลาย instance (ใช้ row-lock หรือ leader election ผ่าน Postgres advisory lock)
4. LWT ของ MQTT จัดการ disconnect แบบเร็ว (graceful)

---

## 5. Auth & ACL (planned)

- ทุกเสามี username/password ต่างกัน (1 pole = 1 credential)
- ACL: เสา `pole-001` publish ได้แค่ `smartpole/pole-001/+`
- Backend subscribe ได้ `smartpole/+/+`
- Plain TCP (1883) สำหรับ dev / TLS (8883) สำหรับ production

---

## 6. Backend MQTT Plugin Architecture (refactor)

```
src/plugins/mqtt/
├── client.ts           ─ singleton client + connect + reconnect
├── subscriber.ts       ─ register topic handlers
├── schemas/            ─ Zod schema per topic
│   ├── sensor.schema.ts
│   ├── heartbeat.schema.ts
│   └── alert.schema.ts
└── handlers/           ─ atom handlers (1 topic 1 file)
    ├── handle-sensor.ts        → call sensorService.write()
    ├── handle-heartbeat.ts     → call poleService.recordHeartbeat()
    └── handle-alert.ts         → call alertService.create()
```

**กฎ:**
- handler ห้ามเรียก `prisma` ตรง — ผ่าน service เท่านั้น
- handler validate payload ด้วย Zod ก่อน → ถ้า fail = log + skip (ไม่ throw)
- service ที่ถูกเรียกจาก MQTT handler ใช้ `userId = SYSTEM_USER_ID` ใน audit log
- เพิ่ม metric: `mqtt_messages_total{topic, status}` — Prometheus (phase 2)
