# E08 · Sensor archive — 1 table per sensor type (TimescaleDB)

> เก็บ sensor data ใน Postgres + TimescaleDB
> **Pattern: 1 sensor type = 1 hypertable** — schema แต่ละ sensor ต่างกันได้, tune query/index/retention แยก
> รองรับเพิ่ม sensor ใหม่ในอนาคตผ่าน registry + plugin pattern

Priority: 3
Blocked by: E06
Status: todo

## ทำไม 1 table per sensor (ไม่ใช่ table รวม)

| ประเด็น | Table รวม (long format) | **Table แยก per sensor (เลือก)** |
|---|---|---|
| Schema flexibility | ทุก sensor ต้อง `(time, pole_id, field, value)` | sensor มี field ละเอียดต่างกันได้ (PM2.5: `pm25, pm10, aqi`; weather: `pressure, wind`) |
| Index tuning | composite index ชุดเดียวสำหรับทุก sensor | index แยกตาม access pattern จริง |
| Retention policy | เหมือนกันทุก sensor | sensor บันทึกถี่ retention สั้น, สำคัญ retention ยาว |
| Continuous aggregate | ต้อง `WHERE field=...` ทุก query | aggregate per sensor type ตรง ๆ |
| Query plan | scan ทั้ง table แม้ filter `field` | scan แค่ table ที่ต้องการ |
| Schema evolution | ALTER ใหญ่ส่งผลกระทบทุก sensor | ALTER เฉพาะ sensor นั้น |
| Sensor non-numeric (GPS, image hash) | value เก็บ float ไม่ได้ | กำหนด column ตามจริง |

## Tasks

| Task | ชื่อ | Status |
|------|------|--------|
| T01 | Sensor type registry + base hypertable migration helper | todo |
| T02 | Master table `SensorType` (ลงทะเบียน sensor ที่ระบบรู้จัก) | todo |
| T03 | Hypertable `sensor_pm25` + module + handler | todo |
| T04 | Hypertable `sensor_temperature` + module + handler | todo |
| T05 | Hypertable `sensor_humidity` + module + handler | todo |
| T06 | Hypertable `sensor_heartbeat_signal` (signal_dbm history) | todo |
| T07 | Sensor handler registry — dispatch MQTT message | todo |
| T08 | Continuous aggregates per sensor (5min/1h/1d) | todo |
| T09 | Retention policy per sensor (config DB-backed) | todo |
| T10 | CLI tool: `bun scripts/new-sensor.ts <name>` | todo |
| T11 | Sensor archive controller — generic facade | todo |
| T12 | CSV export (frontend gen) | todo |

## Schema Pattern (ทุก sensor table มี field มาตรฐาน + sensor-specific)

```prisma
model SensorPm25 {
  time       DateTime
  poleId     Int
  seq        BigInt
  pm25       Float
  pm10       Float?
  aqi        Int?
  rawJson    Json?
  ingestedAt DateTime @default(now())
  @@id([time, poleId])
  @@index([poleId, time(sort: Desc)])
}

model SensorTemperature {
  time        DateTime
  poleId      Int
  seq         BigInt
  temperature Float
  unit        String   @default("celsius")
  rawJson     Json?
  ingestedAt  DateTime @default(now())
  @@id([time, poleId])
  @@index([poleId, time(sort: Desc)])
}

model SensorHumidity { /* %RH */ ... }
model SensorHeartbeatSignal { /* signal_dbm, uptime_sec */ ... }
```

แต่ละ table แปลงเป็น TimescaleDB hypertable ใน custom migration:
```sql
SELECT create_hypertable('sensor_pm25', 'time', chunk_time_interval => INTERVAL '7 days');
```

## Master Table

```prisma
model SensorType {
  id            Int     @id @default(autoincrement())
  key           String  @unique         // "pm25", "temperature", "humidity"
  displayName   String                  // "ฝุ่น PM2.5"
  unit          String?                 // "µg/m³"
  tableName     String                  // "sensor_pm25"
  schemaJson    Json                    // Zod schema (frontend ใช้ render dynamic UI)
  chartType     String?                 // "line" | "bar" | "gauge"
  chartColor    String?
  retentionDays Int     @default(365)
  isEnabled     Boolean @default(true)  // disable = ไม่ ingest แต่ data เก่ายังอยู่
  // standard
  deletedAt   DateTime?
  deletedBy   Int?
  createdBy   Int
  updatedBy   Int?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## Handler Registry Pattern

```ts
// src/plugins/mqtt/sensor-registry.ts
export interface SensorHandler<TPayload> {
  key: string;
  schema: ZodSchema<TPayload>;
  write: (poleId: number, data: TPayload, time: Date, seq: bigint, tx?: PrismaTx) => Promise<void>;
}

// src/modules/sensor-pm25/handler.ts
export const pm25Handler: SensorHandler<Pm25Payload> = {
  key: "pm25",
  schema: z.object({ pm25: z.number(), pm10: z.number().optional(), aqi: z.number().optional() }),
  write: (poleId, data, time, seq, tx) =>
    sensorPm25Service.write({ poleId, time, seq, ...data }, tx),
};
registerSensorHandler(pm25Handler);
```

## MQTT Payload (ใหม่)

```json
{
  "schemaVersion": "1.0",
  "poleName": "pole-001",
  "timestamp": "2026-04-27T10:30:00Z",
  "seq": 12345,
  "readings": {
    "pm25":        { "pm25": 35.2, "pm10": 50.0, "aqi": 87 },
    "temperature": { "temperature": 28.5 },
    "humidity":    { "humidity": 65.0 }
  }
}
```

→ MQTT handler iterate `readings` keys → `getSensorHandler(key)` → validate Zod + write
→ key ที่ไม่อยู่ใน registry → log warn + insert `sensor_unknown` (debug)
→ field ใน schema ที่ pole ไม่ส่ง = ไม่บันทึก (ไม่ error)

## Notes

- เพิ่ม sensor ใหม่ = `bun scripts/new-sensor.ts <key>` → gen migration + module + handler + seed entry
- frontend query metadata `GET /api/sensor-types` → render UI ตาม sensor ที่ enabled
- `sensor_unknown` table เก็บ rawJson ของ payload ที่ schema ยังไม่รองรับ — admin ดูแล้วตัดสินใจเพิ่ม sensor type ใหม่
- ทุก sensor table = hypertable, **ไม่มี soft delete + audit fields** (time-series ใช้ retention policy)
