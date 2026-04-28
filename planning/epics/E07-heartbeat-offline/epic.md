# E07 · Offline detection (background scan)

> ใช้ `Pole.lastSeenAt` + node-cron + Postgres advisory lock — multi-instance safe
> ไม่มี topic `heartbeat` แยก — `lastSeenAt` ปรับทุกครั้งที่ได้ sensor packet ใน E06

Priority: 3
Blocked by: E06
Status: done (refactored 2026-04-28)

## Tasks

| Task | ชื่อ | Status |
|------|------|--------|
| T01 | Scheduler plugin (cron + advisory lock) | done |
| T02 | Offline detection job (every 1 min) | done |
| T03 | Auto-create offline alert | done (delegate ไป E11) |
| T04 | Threshold config | done (env `POLE_OFFLINE_THRESHOLD_MINUTES`, default 5 นาที) |

## Atomic Structure

```
backend/src/plugins/scheduler.ts          # cron + runWithLock + registerJob
backend/src/modules/heartbeat-scan/
├── heartbeat-scan.service.ts             # register cron job
├── flow/
│   └── scan-offline-poles.ts             # atom: query + bulk update + WS + audit + alert
└── index.ts
```

## Logic

- cron `*/1 * * * *` — รัน `scanOfflinePoles`
- threshold = `env.POLE_OFFLINE_THRESHOLD_MINUTES` (default **5 นาที**)
- query: `Pole WHERE poleStatus='online' AND deletedAt IS NULL AND lastSeenAt < cutoff`
- bulk update: `pole.updateMany({ id: { in: [...] } }, { poleStatus: 'offline' })`
- per pole detected:
  - broadcast WS `pole-status-changed`
  - audit log `STATUS_CHANGE` (userId = SYSTEM_USER_ID = null)
  - `alertService.createOrIgnore({ alertType: POLE_OFFLINE })` — dedupe ใน 60 วินาที

## Multi-instance Safety

- `pg_try_advisory_lock(hashKey)` — non-blocking
- 1 instance ได้ lock → run, instance อื่น skip
- lock release ใน `finally` (ปลดแม้ fn throw)

## ที่เปลี่ยน
- เดิม threshold เก็บใน `SystemConfig` table → ตอนนี้ใช้ env (ลบ table แล้ว)
- เดิม default 15 นาที → 5 นาที
- เดิม recover ผ่าน LWT ของ heartbeat topic → ตอนนี้ recover ผ่าน sensor packet ปกติ (handle-sensor set `poleStatus = "online"`)
- เดิม `lastSeenAt` เป็น `DateTime` → ตอนนี้ `BigInt` (epoch ms)

## Test Result
- `scheduler.test.ts`: 3 unit tests pass
- typecheck 0 errors

## Notes
- เสาที่ส่ง sensor มาใหม่หลังจาก mark offline → handle-sensor set `online` + `alertService.autoResolveForPole(POLE_OFFLINE)`
- ไม่มี LWT path แล้ว (รอ scan ทุก 1 นาที)
