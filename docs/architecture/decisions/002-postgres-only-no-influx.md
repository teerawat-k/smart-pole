# 002. PostgreSQL อย่างเดียว — ไม่ใช้ InfluxDB

- **Status:** accepted
- **Date:** 2026-04-28 (ดู [docs/decision-log.md](../../decision-log.md) entry "ยุบ MQTT topic + รวม sensor table")
- **Supersedes:** plan เดิมที่ระบุ "PostgreSQL + InfluxDB" สำหรับ time-series

---

## Context

Sensor data จากเสา (PM2.5, อุณหภูมิ, ความชื้น) ส่งทุก 30 วินาที — เป็น time-series

ขนาด data รายปีต่อเสา:
- 30s interval → 2,880 packet/day → ~1M packet/ปี
- 50 เสา → ~50M row/ปี → ขนาด ~3 GB (ไม่ใหญ่)

ข้อพิจารณา:
- Operational complexity (1 DB vs 2 DB)
- Query patterns: chart + filter + aggregate
- Backup/restore
- DBA expertise
- ค่าใช้จ่าย infra

---

## Decision

ใช้ **PostgreSQL 18 อย่างเดียว** — เก็บ time-series ใน `SensorReading` table ปกติ

**TimescaleDB extension** วางแผนติดตั้งเพิ่มภายหลัง (เมื่อ data volume > 100M row หรือ query ช้า) — schema design พร้อมรองรับ:
- index `(poleId, time DESC)` ตามแบบ hypertable
- ไม่มี audit fields (`createdBy`/`updatedBy`/`deletedAt`) — เป็น append-only

---

## Alternatives Considered

| Option | ข้อดี | ข้อเสีย | ตัดสิน |
|---|---|---|---|
| Postgres + InfluxDB 2 | InfluxDB optimize time-series, downsampling auto | 2 DB ต้องดูแล, sync transactional ลำบาก, ทีมต้องเรียน InfluxQL/Flux, backup แยก | ❌ |
| Postgres + TimescaleDB (ตอนนี้) | Single DB, hypertable + continuous aggregate, SQL ปกติ | Setup extension เพิ่มเติม, dev บางคนยังไม่คุ้น | 🟡 (วางแผนภายหลัง) |
| **Postgres ปกติ + index ดีๆ** | เริ่มง่ายสุด, dev ทุกคนคุ้น, ขยายไป Timescale ง่าย | Query aggregate ระยะยาวจะช้าเมื่อ data โต > 100M row | ✅ (เริ่มที่นี่) |

---

## Consequences

### Positive
- 1 DB instance ทุก env — ลด operational complexity
- Transactional integrity ระหว่าง sensor + master data
- Backup/restore ใช้ `pg_dump` เดียว
- Frontend query เดียว join + aggregate ได้
- Tooling: Prisma + Adminer ใช้ได้กับทุก table
- Migrate ขึ้น TimescaleDB ภายหลังไม่กระทบ schema (เปลี่ยน table เป็น hypertable ผ่าน `create_hypertable()`)

### Negative
- Sensor history endpoint (`GET /api/poles/:id/sensors/history`) ยังเป็น raw row scan + pagination — ถ้า user query 1 ปีจะช้า
- ไม่มี downsampling auto (5min/1h aggregate) — ต้องทำ continuous aggregate เมื่อเปิด Timescale
- Disk usage ใหญ่กว่า InfluxDB (Postgres ไม่ compress data ดีเท่า — แก้ด้วย Timescale compression)

### Trigger ให้ migrate ไป Timescale
- Sensor table > 100M row
- Sensor query > 500ms (p95)
- ต้องการ continuous aggregate (chart 1h/1d sampling)

---

## References

- Schema: [backend/prisma/schema.prisma](../../../backend/prisma/schema.prisma) (model `SensorReading`)
- Index strategy: `@@index([poleId, time(sort: Desc)])` + `@@index([poleId, seq])`
- TimescaleDB: https://docs.timescale.com
