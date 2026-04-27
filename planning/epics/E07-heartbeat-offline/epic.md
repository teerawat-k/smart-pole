# E07 · Heartbeat + persistent offline detection

> Persistent offline detection — แทน in-memory setTimeout (legacy)
> ใช้ Postgres `lastSeenAt` + cron + advisory lock

Priority: 3
Blocked by: E06
Status: todo

## Tasks

| Task | ชื่อ | Status |
|------|------|--------|
| T01 | Scheduler plugin — cron + advisory lock | todo |
| T02 | Offline detection job — `*/1 * * * *` | todo |
| T03 | Pole heartbeat history (Influx) — write + query | todo |
| T04 | Auto-create offline alert | todo |
| T05 | Threshold config — เก็บใน DB ไม่ใช่ env | todo |

## Notes
- offline threshold default 3 min — เก็บใน `SystemConfig` table (T05)
- ทุก scan job log ผลใน audit (`HEARTBEAT_SCAN`) + metric
- รองรับ multi-instance ผ่าน Postgres advisory lock (`pg_try_advisory_lock`)
