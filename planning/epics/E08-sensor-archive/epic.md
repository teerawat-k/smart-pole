# E08 · Sensor archive — 1 table per sensor type

> เก็บ sensor data ใน Postgres (ปกติ) — TimescaleDB extension จะติดตั้งทีหลัง
> Pattern: 1 sensor type = 1 table — schema แต่ละ sensor ต่างกันได้
> รองรับเพิ่ม sensor ใหม่ในอนาคตผ่าน registry + plugin pattern

Priority: 3
Blocked by: E06
Status: done (Postgres-mode; T08 continuous aggregates + T09 retention เลื่อนทีหลัง TimescaleDB ติดตั้งแล้ว)

## ทำไม 1 table per sensor

| ประเด็น | Table รวม (long format) | **Table แยก per sensor (เลือก)** |
|---|---|---|
| Schema flexibility | ทุก sensor ต้อง `(time, pole_id, field, value)` | sensor มี field ละเอียดต่างกัน (PM2.5: `pm25, pm10, aqi`) |
| Index tuning | composite index ชุดเดียว | index แยกตาม access pattern จริง |
| Retention policy | เหมือนกันทุก sensor | tune ต่อ sensor |
| Query plan | scan ทั้ง table แม้ filter `field` | scan แค่ table ที่ต้องการ |
| Sensor non-numeric (GPS, image hash) | value เก็บ float ไม่ได้ | กำหนด column ตามจริง |

## Tasks

| Task | ชื่อ | Status |
|------|------|--------|
| T01 | Sensor registry + base hypertable migration helper | done (ทำผ่าน plain Postgres ก่อน) |
| T02 | Master table `SensorType` | done |
| T03 | Hypertable `sensor_pm25` + module + handler | done (Postgres) |
| T04 | Hypertable `sensor_temperature` | done |
| T05 | Hypertable `sensor_humidity` | done |
| T06 | Hypertable `sensor_heartbeat_signal` | done |
| T07 | Sensor handler registry — dispatch | done (E06.handle-sensor) |
| T08 | Continuous aggregates per sensor | TODO (รอ TimescaleDB) |
| T09 | Retention policy per sensor | TODO (รอ TimescaleDB) |
| T10 | CLI tool: `bun scripts/new-sensor.ts` | TODO (yagni — ทำเมื่อเพิ่ม sensor type ใหม่ ≥ 2 ครั้ง) |
| T11 | Sensor archive controller — generic facade | done |
| T12 | CSV export | (frontend gen ใน E17) |

## Endpoints
- `GET /api/sensor-types` — list enabled sensor types (frontend ใช้ render UI dynamic)
- `GET /api/poles/:id/sensors/latest` — return latest of all sensors at the pole
- `GET /api/poles/:id/sensors/:sensorKey/history?from&to&limit` — generic history

## Atomic Structure (4 sensors + facade)
```
src/modules/
├── sensor-pm25/      (repository + service + handler) — schema: pm25/pm10/aqi
├── sensor-temperature/ — auto F→C convert
├── sensor-humidity/
├── sensor-heartbeat-signal/
└── sensor-archive/   (facade)
    ├── service (listSensorTypes / latestForPole / history-by-key)
    ├── controller
    └── index
```

## Test Result
- 140 unit pass / 0 fail
- Smoke E2E:
  - `/api/sensor-types` → 4 types พร้อม chart config
  - `/api/poles/:id/sensors/latest` → `{ pm25, temperature, humidity }` (null เมื่อไม่มี data)
- MQTT integration test (E06): ส่ง sensor → write 3 tables ครบ

## Notes
- Postgres ปกติ + b-tree composite `(poleId, time DESC)` — performance OK ระดับ < 100 poles × 30s
- เมื่อ TimescaleDB ติดตั้งแล้ว: เพิ่ม `create_hypertable` migration + continuous aggregate + retention policy
