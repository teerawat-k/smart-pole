# MQTT Spec

> สเปคของ topic + payload สำหรับเสาสัญญาณ (และระบบภายนอก) ส่งข้อมูลเข้า Smart Pole backend
> Broker: Mosquitto 2 (รองรับ MQTT 5)

---

## 1. ภาพรวม

ระบบรับข้อมูลจากเสาเซนเซอร์ผ่าน MQTT broker แล้ว backend จะ:
- บันทึก time-series ลงตาราง `SensorReading` (ทุก packet)
- อัปเดตค่าล่าสุด + สถานะ online ลงตาราง `Pole` (overwrite)
- ส่งสัญญาณผ่าน WebSocket ให้ frontend อัปเดตหน้าจอแบบเรียลไทม์

มี topic เดียวที่ระบบใช้ในตอนนี้: **`smartpole/sensor`** — `pole_name` อยู่ใน payload (ไม่อยู่ในชื่อ topic)

---

## 2. การเชื่อมต่อ Broker

| รายการ | ค่า |
|---|---|
| Host (dev) | `localhost` |
| TCP Port | `1883` (plain) — production ควรใช้ TLS 8883 |
| WebSocket Port | `9001` |
| Protocol | MQTT 5 (`protocolVersion: 5`) |
| Auth | username/password (dev: anonymous เปิดได้ — production บังคับ auth) |
| Keep-alive | แนะนำ 60 วินาที |
| Clean session | `true` |

ตัวอย่าง connection string:
```
mqtt://username:password@host:1883?clientId=pole-XX
```

---

## 3. Topic: `smartpole/sensor`

### 3.1 Properties

| รายการ | ค่า |
|---|---|
| Direction | upstream (เสา → backend) |
| QoS | 1 (at-least-once) |
| Retained | `false` |
| Frequency | แนะนำทุก 30 วินาที (config ที่ฝั่งเสา) |

### 3.2 Payload (JSON)

ขั้นต่ำ (required):
```json
{
  "pole_name": "pole-01",
  "timestamp": 1777348800000,
  "seq": 1042
}
```

เต็มรูปแบบ:
```json
{
  "pole_name":   "pole-01",
  "timestamp":   1777348800000,
  "seq":         1042,
  "pm25":        35.2,
  "temperature": 33.1,
  "humidity":    74.5
}
```

### 3.3 ข้อกำหนดของแต่ละฟิลด์

| Field | Type | Required | ข้อกำหนด |
|---|---|---|---|
| `pole_name` | string | ✅ | ชื่อเสาที่ลงทะเบียนใน DB (1–64 อักขระ) |
| `timestamp` | number | ✅ | Unix epoch — รองรับทั้งวินาที (10 หลัก) และมิลลิวินาที (13 หลัก) — backend auto-detect |
| `seq` | integer | ✅ | ≥ 0 — ลำดับ packet ของเสา (ใช้ตรวจ packet หาย) |
| `pm25` | number | optional | 0–1000 µg/m³ |
| `temperature` | number | optional | -40 ถึง 80 °C |
| `humidity` | number | optional | 0–100 %RH |

> ฟิลด์อื่นที่ส่งมาเกินจะถูกเก็บเฉพาะที่ schema รองรับ (ฟิลด์เกิน = ignore)
> ❌ ไม่มี: `signalDbm`, `uptimeSec`, `firmware`, `aqi`, `pm10` (ตัดออกใน refactor ล่าสุด)

### 3.4 พฤติกรรมหลังรับข้อความ

หาก validation **ผ่าน**:
1. `INSERT` 1 row ลง `SensorReading` (มี `id` auto-increment)
2. `UPDATE Pole` set `latestPm25`, `latestTemperature`, `latestHumidity`, `latestSeq`, `latestReadingAt`, `lastSeenAt = timestamp`, `poleStatus = "online"`
3. broadcast WebSocket → frontend invalidate query

หาก validation **ไม่ผ่าน**:
- log warning + ทิ้งข้อความ — ไม่ตอบกลับ ไม่ retry
- เหตุผลที่พบบ่อย: `pole_name` ไม่ตรงในฐาน, ค่าทิเกินช่วง, JSON ผิด format

> ส่ง `(pole_name, timestamp, seq)` ซ้ำ 2 รอบ → `SensorReading` เก็บ 2 row (history) แต่ `Pole.latest*` overwrite ค่าใหม่ทับเก่า

---

## 4. Offline Detection

ระบบไม่ต้องการ topic `heartbeat` แยก — ใช้ `lastSeenAt` ของแต่ละเสาเป็น signal:

- ถ้าเสาส่ง `smartpole/sensor` มาเรื่อยๆ → `lastSeenAt` ปรับใหม่ทุกครั้ง
- Background job (cron `*/1 * * * *`) ตรวจเสาที่ `lastSeenAt < now - threshold` → mark `offline` + สร้าง alert
- ค่า threshold default = **5 นาที** (ปรับใน env `POLE_OFFLINE_THRESHOLD_MINUTES`)
- เสาที่ส่งใหม่อีกครั้งจะถูก mark online + auto-resolve alert

---

## 5. ตัวอย่างการเชื่อมต่อจากระบบภายนอก

### 5.1 ก่อนเริ่ม

1. **ขอ credential ของเสาจาก admin** — ระบบสร้างให้ตอนสร้างเสาในหน้า "จัดการเสาสัญญาณ" ผ่าน API `POST /api/poles` หรือ `PATCH /api/poles/:id/regenerate-credential`
2. credential ที่ได้: `mqttUsername` (= `pole-XX`) + `mqttPassword` (random hex 32 byte) — แสดงครั้งเดียว เก็บไว้ฝั่งเสา
3. ตั้งให้เสา publish เฉพาะ topic `smartpole/sensor` — ACL จะตรวจว่า `pole_name` ใน payload ตรงกับ username ของ MQTT client (production)

### 5.2 ตัวอย่าง Python

```python
import json, time, paho.mqtt.client as mqtt

client = mqtt.Client(client_id="pole-01", protocol=mqtt.MQTTv5)
client.username_pw_set("pole-01", "<mqtt-password>")
client.connect("broker.example.com", 1883, keepalive=60)
client.loop_start()

while True:
    payload = {
        "pole_name":   "pole-01",
        "timestamp":   int(time.time() * 1000),  # ms epoch
        "seq":         next_seq(),               # int monotonic
        "pm25":        read_pm25(),
        "temperature": read_temp(),
        "humidity":    read_humidity(),
    }
    client.publish("smartpole/sensor", json.dumps(payload), qos=1)
    time.sleep(30)
```

### 5.3 ตัวอย่าง Node.js / Bun

```ts
import mqtt from "mqtt";

const client = mqtt.connect("mqtt://broker.example.com:1883", {
  clientId:        "pole-01",
  username:        "pole-01",
  password:        "<mqtt-password>",
  protocolVersion: 5,
  clean:           true,
});

let seq = 0;

client.on("connect", () => {
  setInterval(() => {
    const payload = {
      pole_name:   "pole-01",
      timestamp:   Date.now(),
      seq:         seq++,
      pm25:        readPm25(),
      temperature: readTemp(),
      humidity:    readHumidity(),
    };
    client.publish("smartpole/sensor", JSON.stringify(payload), { qos: 1 });
  }, 30_000);
});
```

### 5.4 ตัวอย่าง CLI (mosquitto_pub) สำหรับทดสอบ

```bash
mosquitto_pub -h localhost -p 1883 \
  -t "smartpole/sensor" \
  -m '{"pole_name":"pole-01","timestamp":1777348800000,"seq":1,"pm25":35.2,"temperature":33.1,"humidity":74.5}'
```

หรือ PowerShell:
```powershell
$ts = [int][DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$json = '{"pole_name":"pole-01","timestamp":' + $ts + ',"seq":1,"pm25":35.2,"temperature":33.1,"humidity":74.5}'
$json | & "C:\Program Files\mosquitto\mosquitto_pub.exe" -h localhost -p 1883 -t "smartpole/sensor" -l
```

### 5.5 Subscribe ดู message ทั้งหมด (debug)

```bash
mosquitto_sub -h localhost -p 1883 -t "smartpole/#" -v
```

---

## 6. ความปลอดภัย

| รายการ | แนวปฏิบัติ |
|---|---|
| TLS | production ใช้ port 8883 พร้อม CA cert |
| Username/password | 1 เสา = 1 credential (ห้ามใช้ร่วม) |
| Password storage ฝั่งเสา | เก็บใน secure element / env-var ที่ RW เฉพาะ owner |
| ACL | เสา `pole-XX` ห้าม subscribe; publish ได้เฉพาะ `smartpole/sensor` |
| Replay protection | ฝั่งเสาส่ง `timestamp` ปัจจุบัน + `seq` monotonic — backend จัดเก็บตามที่ส่ง (ไม่มี drift check แล้ว) |
| Rate limit | broker ตั้ง `max_inflight_messages` ระดับ pole, backend ไม่ถือ rate limit เพิ่ม |

---

## 7. Backend Plugin Architecture

```
backend/src/plugins/mqtt/
├── client.ts                  ─ singleton client + connect + reconnect
├── parse-topic.ts             ─ parse "smartpole/sensor" → { messageType }
├── schemas.ts                 ─ Zod schema ของ sensor payload
├── handlers/
│   └── handle-sensor.ts       ─ validate → insert SensorReading + update Pole.latest* + broadcast
├── parse-topic.test.ts
├── mqtt.integration.test.ts
└── index.ts                   ─ export start/stop subscriber
```

**กฎสำคัญ:**
- handler validate Zod ก่อนทำอะไร — fail = log + skip (ห้าม throw ออก)
- handler ห้ามเรียก service-level audit/notification ในตัว — แตะ DB ผ่าน Prisma + broadcast ผ่าน plugin
- service ที่ถูกเรียกใช้ `userId = SYSTEM_USER_ID` (null) เมื่อ audit

---

## 8. การเปลี่ยนแปลงล่าสุด (เทียบกับ spec เดิม)

| เก่า | ใหม่ |
|---|---|
| Topic: `smartpole/{poleName}/{sensor\|heartbeat\|alert}` | Topic: `smartpole/sensor` เดียว — `pole_name` ใน payload |
| `timestamp` เป็น ISO 8601 | `timestamp` เป็น Unix epoch (number) |
| มี `heartbeat` topic แยก | รวมกับ sensor — ระบบใช้ `lastSeenAt` แทน |
| มี `alert` topic จากเสา | ระบบสร้าง alert จากฝั่ง backend (offline scan / threshold rule) |
| Drift check 5 นาที + reject | ไม่มี drift check — เก็บ `timestamp` ตามที่เสาส่ง |
| `aqi`, `pm10`, `signal_dbm`, `uptime_sec`, `firmware` | ตัดออกจาก schema |
| มี Last Will (LWT) | ไม่ใช้ — รอ background scan ตรวจ offline |
| Sensor data แยก 4 table | รวมเป็น `SensorReading` table เดียว (flat) |
