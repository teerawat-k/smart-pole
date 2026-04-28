# E08 · Sensor archive — flat table + latest column on Pole

> เก็บ sensor data รูปแบบ flat (1 row per packet) ใน `SensorReading` + ค่าล่าสุดใน column ของ `Pole`
> Pattern เปลี่ยน 2026-04-28: รวม 4 sensor table เป็น 1 + รวม PoleLatestReading เข้า Pole
> Spec: `docs/mqtt-spec.md`

Priority: 3
Blocked by: E06
Status: done (refactored 2026-04-28)

## ทำไมเปลี่ยนจาก 1 table per sensor

| ประเด็น | เดิม (4 tables) | **ใหม่ (1 flat table)** |
|---|---|---|
| Sensor packet | เสาส่ง JSON nested (`readings.pm25.pm25`, `readings.temperature.temperature`) | flat (`pm25`, `temperature`, `humidity`) |
| DB writes per packet | 1 row × N sensor type + 1 latest table | 1 row + 1 update บน Pole |
| Query "ค่าปัจจุบัน" | JOIN 3 tables หรือ query latest table | อ่าน column บน Pole — ไม่มี JOIN |
| Schema flexibility | sensor ใหม่ = สร้าง table ใหม่ | สอน column ใหม่ใน SensorReading + Pole.latest* |
| ความซับซ้อน | sensor registry + handler 4 module | ไม่มี registry — handler เดียว |

## Schema ปัจจุบัน

```prisma
model SensorReading {
  id          BigInt   @id @default(autoincrement())
  time        BigInt   // raw epoch จากเสา
  poleId      Int
  seq         BigInt
  pm25        Decimal? @db.Decimal(8, 2)
  temperature Decimal? @db.Decimal(6, 2)
  humidity    Decimal? @db.Decimal(5, 2)
  ingestedAt  DateTime @default(now())

  pole Pole @relation(fields: [poleId], references: [id], onDelete: Cascade)

  @@index([poleId, time(sort: Desc)])
  @@index([poleId, seq])
}

// ค่าปัจจุบัน — รวมเป็น column ใน Pole (ไม่มี table แยกแล้ว)
model Pole {
  // ...
  latestSeq         BigInt?
  latestPm25        Decimal? @db.Decimal(8, 2)
  latestTemperature Decimal? @db.Decimal(6, 2)
  latestHumidity    Decimal? @db.Decimal(5, 2)
  latestReadingAt   BigInt?
  lastSeenAt        BigInt?
}
```

## Tasks

| Task | ชื่อ | Status |
|------|------|--------|
| T01 | Refactor: รวม 4 sensor table → SensorReading flat | done |
| T02 | Refactor: ลบ PoleLatestReading → column ใน Pole | done |
| T03 | Repository + service paginated + sortable | done |
| T04 | Controller: `/api/poles/:id/sensors/latest` + `/history` (paginated, sortable) | done |
| T05 | ลบ table `SensorType` + `SensorUnknown` (ไม่ได้ใช้) | done |
| T06 | Continuous aggregates / retention policy (TimescaleDB) | TODO เลื่อน |

## Endpoints

```
GET /api/poles/:id/sensors/latest
→ { latestSeq, latestPm25, latestTemperature, latestHumidity, latestReadingAt }

GET /api/poles/:id/sensors/history?page=1&limit=20&sortBy=seq&sortOrder=desc&from?&to?
→ { data: SensorReading[], total, page, limit }
   sortBy whitelist: time, seq, pm25, temperature, humidity, ingestedAt
```

## Atomic Structure

```
backend/src/modules/
├── sensor-reading/
│   ├── sensor-reading.repository.ts   (findLatest + list paginated)
│   ├── sensor-reading.service.ts      (sortBy whitelist)
│   └── index.ts
└── sensor-archive/
    ├── sensor-archive.service.ts      (facade — pole guard + delegate)
    ├── sensor-archive.controller.ts   (paginated query schema)
    └── index.ts
```

## ที่ลบออก
- `sensor-pm25/`, `sensor-temperature/`, `sensor-humidity/`, `sensor-heartbeat-signal/` — 4 modules
- `sensor-registry.ts` ใน `plugins/mqtt/`
- `SensorType` model + seed — ไม่ใช้ (sensor schema ตายตัว)
- `SensorUnknown` model — ไม่ใช้ (validation fail = drop)
- API `GET /api/sensor-types` — ลบไปแล้ว

## Test Result
- MQTT integration test: 5/5 pass (insert + upsert + lastSeenAt + reject invalid + history overwrite)

## Notes
- ถ้าต้องเพิ่ม sensor type ใหม่: เพิ่ม column ใน `SensorReading` + `Pole.latest*` + `mqtt/schemas.ts` + `handle-sensor.ts`
- Postgres b-tree composite `(poleId, time DESC)` รองรับ < 100 poles × 30s ได้สบาย
- TimescaleDB: ทำตอน scale พ้น Postgres + เพิ่ม `create_hypertable` migration
