# E06 · MQTT plugin + topic schema + handler

> Backend MQTT subscriber — connect Mosquitto + validate payload + บันทึก SensorReading + อัปเดต Pole.latest*
> Spec: `docs/mqtt-spec.md`

Priority: 2
Blocked by: E05
Status: done (refactored 2026-04-28)

## Tasks

| Task | ชื่อ | Status |
|------|------|--------|
| T01 | MQTT 5 client + connect + reconnect + auth | done |
| T02 | Topic dispatcher + Zod schema validation | done |
| T03 | Handler — handle-sensor.ts (insert + upsert + broadcast) | done |
| T04 | Integration test ผ่าน Aedes broker / direct handler | done |
| T05 | Health check `/health/mqtt` | TODO |

## Topic ที่ใช้

```
smartpole/sensor   (QoS 1, retain false)
```

ตัด topic เก่าออกหมด: `smartpole/{poleName}/sensor|heartbeat|event` — ใช้ topic เดียว `pole_name` อยู่ใน payload

## Atomic Structure

```
backend/src/plugins/mqtt/
├── client.ts                  singleton + connect + reconnect + dispatch
├── parse-topic.ts             pure atom — รองรับเฉพาะ "smartpole/sensor"
├── schemas.ts                 Zod sensor schema (flat — pm25/temperature/humidity)
├── handlers/
│   └── handle-sensor.ts       validate → insert SensorReading + update Pole.latest*
├── parse-topic.test.ts
├── mqtt.integration.test.ts   integration with Aedes broker
└── index.ts                   export start/stop subscriber
```

## Payload Schema

Required: `pole_name` (string), `timestamp` (number — Unix epoch s/ms), `seq` (int ≥ 0)
Optional: `pm25` (0–1000), `temperature` (-40..80), `humidity` (0..100)

ดู `docs/mqtt-spec.md` § 3 — ตัวอย่าง full + minimal + Python/Node sample code

## Validation

- Zod parse fail → log warn + skip (ไม่ throw)
- `pole_name` ไม่อยู่ใน DB → log warn + skip
- ไม่มี drift check (รับ timestamp ตามที่เสาส่ง)
- sender ส่งซ้ำ → SensorReading เก็บ 2 row (history) + Pole.latest* overwrite

## Side Effects (per sensor packet)

```
Promise.all([
  prisma.sensorReading.create(...)   // history log (id auto-increment)
  prisma.pole.update(...)            // latestSeq, latestPm25, latestTemperature,
                                     // latestHumidity, latestReadingAt,
                                     // lastSeenAt = timestamp, poleStatus = "online"
])
broadcastSensorReading(poleName, "sensor", msg)  // WS push
```

## Test Result

- `parse-topic.test.ts`: 4 tests pass
- `mqtt.integration.test.ts`: 5 tests pass
  - บันทึก SensorReading + update Pole.latest*
  - reject humidity เกินช่วง
  - packet ใหม่ overwrite Pole.latest* (history เก็บ 2 row)
  - reject pole_name ไม่มีใน DB
  - lastSeenAt ปรับตาม timestamp ของ packet

## Notes
- T05 (health check `/health/mqtt`) ยังไม่ได้ทำ
- Replay/DLQ ไม่จำเป็น — handler ไม่ throw, validation fail = drop เงียบ
- offline detection อยู่ที่ E07 (background scan) — ไม่ใช่ topic แยก
