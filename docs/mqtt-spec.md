# MQTT Spec — Topic v2 (per-pole tree, scale-ready)

> สเปคของ topic + payload สำหรับเสาสัญญาณส่งข้อมูลเข้า Smart Pole backend
> Broker: Mosquitto 2 (รองรับ MQTT 5)
> **เวอร์ชัน 2** — เปลี่ยนจาก `smartpole/sensor` เดียวเป็น per-pole subtree (`smartpole/<poleName>/...`) เพื่อรองรับการขยายเสาและ ACL แยกต่อเสา

---

## 1. ภาพรวม

ระบบรับข้อมูลจากเสาเซนเซอร์ผ่าน MQTT broker แล้ว backend จะ:
- บันทึก time-series ลงตาราง `SensorReading` (ทุก packet)
- อัปเดตค่าล่าสุด + สถานะ online ลงตาราง `Pole` (overwrite)
- ส่งสัญญาณผ่าน WebSocket ให้ frontend อัปเดตหน้าจอแบบเรียลไทม์

**Topic structure** ออกแบบเป็น tree ต่อเสา — backend subscribe ด้วย wildcard ครั้งเดียวรองรับ N เสาโดยไม่ต้องแก้ code

---

## 2. การเชื่อมต่อ Broker

| รายการ | ค่า |
|---|---|
| Host (dev) | `localhost` |
| TCP Port | `1883` (Docker internal) / `7783` (host mapped) |
| WebSocket Port | `9001` (Docker internal) / `7791` (host mapped) |
| Protocol | MQTT 5 (`protocolVersion: 5`) |
| Auth (dev) | anonymous (Mosquitto config `allow_anonymous true`) |
| Auth (production) | username/password ต่อเสา — `username = poleName` |
| Keep-alive | แนะนำ 60 วินาที |
| Clean session | `true` |

ตัวอย่าง connection string:
```
mqtt://<poleName>:<password>@<host>:1883?clientId=<poleName>
```

---

## 3. Topic Tree

```
smartpole/<poleName>/
├── sensor          upstream — เสาส่งค่าวัด                  (QoS 1, ไม่ retain) ← ใช้แล้ว
├── heartbeat       upstream — สถานะมีชีวิต (signal/uptime)  [planned]
├── event           upstream — alert/error จากตัวเสา         [planned]
├── status          upstream — LWT online/offline            [planned, retained]
└── cmd/<command>   downstream — backend → เสา (reboot ฯลฯ)  [planned]
```

**กฎ:**
- `<poleName>` = ชื่อเสาที่ลงทะเบียน + ตรงกับ MQTT username (1-64 ตัวอักษร, `[a-zA-Z0-9_-]`)
- เสา publish ได้เฉพาะ subtree ของตัวเอง (`smartpole/<poleName>/#`) — บังคับผ่าน ACL pattern
- เสา subscribe ได้เฉพาะ `smartpole/<poleName>/cmd/+` (เมื่อเปิด cmd channel)

---

## 4. Topic: `smartpole/<poleName>/sensor`

### 4.1 Properties

| รายการ | ค่า |
|---|---|
| Direction | upstream (เสา → backend) |
| QoS | 1 (at-least-once) |
| Retained | `false` |
| Frequency | แนะนำทุก 30 วินาที (config ที่ฝั่งเสา) |

### 4.2 Payload (JSON)

> ⚠️ **เปลี่ยนจาก v1**: เอา `pole_name` ออกจาก payload — backend ดึงจาก topic แทน

ขั้นต่ำ (required):
```json
{
  "timestamp": 1777348800000,
  "seq": 1042
}
```

เต็มรูปแบบ:
```json
{
  "timestamp":   1777348800000,
  "seq":         1042,
  "pm25":        35.2,
  "temperature": 33.1,
  "humidity":    74.5
}
```

### 4.3 ข้อกำหนดของแต่ละฟิลด์

| Field | Type | Required | ข้อกำหนด |
|---|---|---|---|
| `timestamp` | number | ✅ | Unix epoch — รองรับทั้งวินาที (10 หลัก) และมิลลิวินาที (13 หลัก) — เก็บตามที่ส่ง |
| `seq` | integer | ✅ | ≥ 0 — ลำดับ packet ของเสา (ใช้ตรวจ packet หาย) |
| `pm25` | number | optional | 0–1000 µg/m³ |
| `temperature` | number | optional | -40 ถึง 80 °C |
| `humidity` | number | optional | 0–100 %RH |

> ฟิลด์อื่นที่ส่งมาเกินจะถูก ignore (Zod schema strict กับฟิลด์ที่ define)
> ❌ ไม่มี: `pole_name` (อยู่ใน topic แล้ว), `signal_dbm`, `uptime_sec`, `firmware`, `aqi`, `pm10`

### 4.4 พฤติกรรมหลังรับข้อความ

**Validation ผ่าน:**
1. `INSERT` 1 row ลง `SensorReading` (มี `id` auto-increment)
2. `UPDATE Pole` set `latestPm25, latestTemperature, latestHumidity, latestSeq, latestReadingAt, lastSeenAt = timestamp, poleStatus = "online"`
3. Broadcast WebSocket → frontend invalidate query

**Validation ไม่ผ่าน:**
- Log warning + ทิ้งข้อความ ไม่ตอบกลับ ไม่ retry
- เหตุผลที่พบบ่อย: topic format ผิด, poleName ไม่ตรงในฐาน, ค่าทิเกินช่วง, JSON ผิด format

> ส่ง packet ซ้ำ `(poleName, timestamp, seq)` 2 รอบ → `SensorReading` เก็บ 2 row (history) แต่ `Pole.latest*` overwrite ค่าใหม่ทับเก่า

---

## 5. Backend Subscription

```
smartpole/+/sensor    ← wildcard ครอบทุกเสาที่ register
```

- ใช้ MQTT single-level wildcard (`+`) ที่ตำแหน่ง `<poleName>`
- **เพิ่มเสาใหม่ไม่ต้องแก้ code/restart subscriber** — backend จะรับ message ของเสาใหม่ทันทีที่ broker route มา
- Backend resolve `poleName` จาก topic → query `Pole` → ถ้าไม่เจอ log warn ทิ้ง (ไม่ throw)

**Subscription เพิ่มในอนาคต** (เมื่อเปิดใช้):
```
smartpole/+/heartbeat
smartpole/+/event
smartpole/+/status
```

---

## 6. Mosquitto ACL

ไฟล์: [infra/mosquitto/config/aclfile](../infra/mosquitto/config/aclfile)

```
# Backend subscriber — รับทุก topic + ส่ง cmd ได้
user backend-subscriber
topic readwrite smartpole/#

# Per-pole pattern — เสาแต่ละต้น pub/sub ได้แค่ subtree ของตัวเอง
pattern readwrite smartpole/%u/#
```

- `%u` = MQTT username = `poleName` (1 username = 1 เสา)
- **เพิ่มเสาใหม่ไม่ต้องแก้ ACL** — pattern แทนทุก user อัตโนมัติ
- ⚠️ **Production:** เปิด `allow_anonymous false` ใน `mosquitto.conf` + uncomment `password_file` + `acl_file` + reload broker

> สถานะปัจจุบัน: dev = `allow_anonymous true` (ACL ปิดอยู่ — ทุกคน publish ได้); P1 ต้องทำ auth provisioning ให้ครบ (ดู [production-readiness.md](./production-readiness.md))

---

## 7. ตัวอย่างการเชื่อมต่อจากระบบภายนอก

### 7.1 ก่อนเริ่ม

1. **ขอ credential ของเสาจาก admin** — สร้างผ่าน `POST /api/poles` หรือ `POST /api/poles/:id/regenerate-credential`
2. ได้: `mqttUsername` (= `poleName`) + `mqttPassword` (random hex 32 byte) — แสดงครั้งเดียว เก็บไว้ฝั่งเสา
3. ตั้งให้เสา publish ไปที่ topic `smartpole/<poleName>/sensor`

### 7.2 ตัวอย่าง Python (paho-mqtt)

```python
import json, time, paho.mqtt.client as mqtt

POLE_NAME = "pole-01"
TOPIC = f"smartpole/{POLE_NAME}/sensor"

client = mqtt.Client(client_id=POLE_NAME, protocol=mqtt.MQTTv5)
client.username_pw_set(POLE_NAME, "<mqtt-password>")
client.connect("broker.example.com", 1883, keepalive=60)
client.loop_start()

while True:
    payload = {
        "timestamp":   int(time.time() * 1000),
        "seq":         next_seq(),
        "pm25":        read_pm25(),
        "temperature": read_temp(),
        "humidity":    read_humidity(),
    }
    client.publish(TOPIC, json.dumps(payload), qos=1)
    time.sleep(30)
```

### 7.3 ตัวอย่าง Node.js / Bun

```ts
import mqtt from "mqtt";

const POLE_NAME = "pole-01";
const TOPIC = `smartpole/${POLE_NAME}/sensor`;

const client = mqtt.connect("mqtt://broker.example.com:1883", {
  clientId:        POLE_NAME,
  username:        POLE_NAME,
  password:        "<mqtt-password>",
  protocolVersion: 5,
  clean:           true,
});

let seq = 0;
client.on("connect", () => {
  setInterval(() => {
    client.publish(TOPIC, JSON.stringify({
      timestamp:   Date.now(),
      seq:         seq++,
      pm25:        readPm25(),
      temperature: readTemp(),
      humidity:    readHumidity(),
    }), { qos: 1 });
  }, 30_000);
});
```

### 7.4 ทดสอบด้วย mosquitto_pub (CLI)

```bash
mosquitto_pub -h localhost -p 7783 \
  -t "smartpole/pole-01/sensor" \
  -m '{"timestamp":1777348800000,"seq":1,"pm25":35.2,"temperature":33.1,"humidity":74.5}'
```

PowerShell:
```powershell
$ts = [int][DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$json = '{"timestamp":' + $ts + ',"seq":1,"pm25":35.2,"temperature":33.1,"humidity":74.5}'
$json | & "C:\Program Files\mosquitto\mosquitto_pub.exe" -h localhost -p 7783 -t "smartpole/pole-01/sensor" -l
```

### 7.5 Subscribe ดูทุก message (debug)

```bash
mosquitto_sub -h localhost -p 7783 -t "smartpole/#" -v
```

---

## 8. Offline Detection

ระบบไม่ใช้ topic `heartbeat` แยก — ใช้ `lastSeenAt` ของแต่ละเสา:

- ทุกครั้งที่ `smartpole/<poleName>/sensor` มา → `Pole.lastSeenAt` อัปเดต
- Background job (cron) ตรวจเสาที่ `lastSeenAt < now - threshold` → mark `offline` + สร้าง alert
- Threshold default = **5 นาที** (`POLE_OFFLINE_THRESHOLD_MINUTES` ใน env)
- เสาที่ส่งใหม่อีกครั้ง → backend mark `online` + auto-resolve alert

---

## 9. Backend Plugin Architecture

```
backend/src/plugins/mqtt/
├── client.ts                  ─ singleton client + connect + reconnect + dispatch
├── parse-topic.ts             ─ parse "smartpole/<poleName>/<msgType>" → { poleName, messageType }
├── schemas.ts                 ─ Zod schema ของแต่ละ messageType
├── handlers/
│   └── handle-sensor.ts       ─ (poleName, raw) → validate → DB + broadcast
├── parse-topic.test.ts
├── mqtt.integration.test.ts
└── index.ts                   ─ export start/stop subscriber
```

**กฎสำคัญ:**
- Handler รับ `poleName` (จาก topic) แยกจาก `raw` (payload) — ห้ามอ่าน poleName จาก payload
- Handler validate Zod ก่อนทำอะไร — fail = log + skip (ห้าม throw ออก)
- Handler ห้ามเรียก service-level audit/notification ในตัว — แตะ DB ผ่าน Prisma + broadcast ผ่าน plugin
- Audit ที่ trigger จาก MQTT ใช้ `userId = SYSTEM_USER_ID`

**เพิ่ม messageType ใหม่:**
1. เพิ่ม value ใน `MessageType` union ของ `parse-topic.ts`
2. เพิ่ม schema ใน `schemas.ts`
3. สร้าง handler ใน `handlers/handle-<type>.ts`
4. เพิ่ม `case` ใน `client.ts` switch — type-checker จะบังคับให้ exhaustive
5. เพิ่ม subscribe pattern ใน `client.ts` (`smartpole/+/<msgType>`)

---

## 10. Scale Story — เพิ่มเสาใหม่

| ขั้น | ใครทำ | ไฟล์/คำสั่ง |
|---|---|---|
| 1 | Admin → backend | `POST /api/poles` (ตั้ง poleName + installPlace + capability flags) |
| 2 | Backend → DB | gen `mqttUsername = poleName` + random 256-bit password → argon2 hash เก็บใน `Pole` |
| 3 | Backend → Admin | response = plain password (ครั้งเดียว — ไม่แสดงอีก) |
| 4 | Admin → Mosquitto (P1 — ยังไม่ auto) | sync DB → passwordfile + reload broker |
| 5 | Admin → Pi | กรอก `poleName` + plain password ใน config เสา |
| 6 | Pi → Mosquitto | connect ด้วย `username = poleName` |
| 7 | Pi → topic | publish ที่ `smartpole/<poleName>/sensor` |
| 8 | Backend auto | wildcard subscription รับเอง → save + broadcast |

**ไม่มีจุดไหนต้องแก้ code หรือ restart backend** — เพิ่ม 1, 10, 100, 1000 เสาทำงาน identical (cost ที่เพิ่ม = DB row + MQTT broker memory + Postgres write throughput)

---

## 11. Migration — v1 → v2

> ⚠️ **Breaking change** — เสาที่ใช้ topic เดิม `smartpole/sensor` จะถูก backend ทิ้ง (log warn: "unknown topic format")

| ลำดับ | Action |
|---|---|
| 1 | Update Pi firmware/script — เปลี่ยน topic เป็น `smartpole/<poleName>/sensor` + เอา `pole_name` ออกจาก payload |
| 2 | Deploy Pi ทุกตัวก่อน |
| 3 | Test ใน UAT 1-2 วัน (ดู log backend ว่า packet เข้าครบ) |
| 4 | Deploy backend topic v2 |
| 5 | ตรวจว่าไม่มี log "unknown topic format" จาก topic เก่า |

**Rollback:** backend version เก่าใช้ topic v1 + payload มี `pole_name` — Pi ที่ขึ้น v2 แล้วยังไม่ tolerate ทั้ง 2 รูปแบบ → rollback ต้อง downgrade backend + downgrade Pi พร้อมกัน (ทดสอบ in-house ดี)

---

## 12. การเปลี่ยนแปลงจาก v1 (2026-05-24)

| v1 | v2 |
|---|---|
| Topic: `smartpole/sensor` เดียว | Topic: `smartpole/<poleName>/sensor` (subtree ต่อเสา) |
| `pole_name` ใน payload | `poleName` ใน topic (ไม่ใส่ใน payload) |
| Backend subscribe `smartpole/sensor` | Backend subscribe `smartpole/+/sensor` (wildcard) |
| ACL pattern `smartpole/%u/#` ขัดกับ topic | ACL pattern ทำงานตรงกับ topic |
| ไม่มีพื้นที่สำหรับ heartbeat/event/cmd | มี subtree พร้อมขยาย (`<poleName>/heartbeat`, `/event`, `/cmd/...`) |
