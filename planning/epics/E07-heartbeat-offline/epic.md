# E07 · Heartbeat + persistent offline detection

> ใช้ Postgres `lastSeenAt` + node-cron + advisory lock — multi-instance safe

Priority: 3
Blocked by: E06
Status: done (T04 alert auto-create เลื่อนไป E11)

## Tasks

| Task | ชื่อ | Status |
|------|------|--------|
| T01 | Scheduler plugin (cron + advisory lock) | done |
| T02 | Offline detection job (* */1 * * * *) | done |
| T03 | Heartbeat signal history (Postgres table) | done (E08 SensorHeartbeatSignal) |
| T04 | Auto-create offline alert | TODO (E11) |
| T05 | Threshold config (SystemConfig) | done |

## Atomic Structure

```
src/plugins/scheduler.ts          # cron + runWithLock + registerJob
src/modules/system-config/        # key-value config + 30s cache
└── system-config.{repository,service,index}.ts
src/modules/heartbeat-scan/
├── heartbeat-scan.service.ts     # register cron job
├── flow/
│   └── scan-offline-poles.ts     # atom: query + bulk update + WS broadcast + audit
└── index.ts
```

## Logic
- cron `*/1 * * * *` — รัน scanOfflinePoles
- threshold default = 3 min (DB config key `pole.offline_threshold_minutes`, can override at runtime)
- query: `Pole WHERE poleStatus='online' AND deletedAt IS NULL AND lastSeenAt < now - threshold`
- bulk update: `pole.updateMany({ id: { in: [...] } }, { poleStatus: 'offline' })`
- per pole detected: broadcast WS `pole-status-changed` + audit log `STATUS_CHANGE` (userId=SYSTEM_USER_ID)

## Multi-instance Safety
- `pg_try_advisory_lock(hashKey)` — non-blocking
- 1 instance ที่ได้ lock จะ run, instance อื่น skip
- lock release in `finally` (ปลด lock แม้ fn throw)

## Test Result
- scheduler.test.ts: 3 unit tests (acquire/re-run/throw safety)
- 140 unit tests pass / 0 fail
- typecheck 0 errors

## Notes
- T04 (auto-resolve offline alert + create alert) ทำใน E11
- LWT (handle-heartbeat status=offline) ทำใน E06 แล้ว — เป็น real-time path
- scan job เป็น safety net (กรณี LWT ไม่ trigger)
