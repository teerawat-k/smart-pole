# E10 · WebSocket plugin + invalidate broadcaster

> WebSocket realtime push — แทน polling ของ legacy
> Push message types: `invalidate`, `notification`, `pole-status-changed`, `sensor-reading`

Priority: 3
Blocked by: E00, E01 (JWT)
Status: done (T03/T04 ขั้นสูง เลื่อน)

## Tasks

| Task | ชื่อ | Status |
|------|------|--------|
| T01 | WS plugin — JWT auth + connection registry | done |
| T02 | Broadcaster atoms (invalidate/notification/pole-status/sensor-reading/broadcastToAll) | done |
| T03 | Heartbeat (ping/pong) — basic | done (server reply pong; idle timeout เลื่อน) |
| T04 | Reconnect-friendly protocol + sequence id | skip (yagni — frontend reconnect + refetch) |
| T05 | Wire mutation → broadcast | TODO ตอนทำ MQTT handler (E06) |

## Summary
- `src/plugins/websocket.ts` — Elysia plugin + in-memory registry `Map<userId, Set<WS>>`
- JWT verify ที่ `open` event (token ใน query string `?token=<jwt>`) → close 4001 ถ้า invalid
- ping/pong handler — frontend ส่ง "ping" → server ตอบ "pong"
- Atoms:
  - `sendInvalidate(userIds, entity, payload?)` → push `{ type: "invalidate", entity, payload }`
  - `sendNotification(userIds, { title, message, severity, refType?, refId? })`
  - `broadcastToAll(message)`
  - `broadcastPoleStatus(poleName, status, lastSeenAt?)`
  - `broadcastSensorReading(poleName, sensorKey, data)`
- helpers: `getConnectedUserIds()`, `getConnectionCount()`
- safeSend wrapper — log warn ถ้า send fail, ไม่ throw

## Test Result
- 7 unit tests pass (registry + 4 broadcaster types)
- All backend: **133 pass / 0 fail** (246 expect calls)
- typecheck 0 errors

## Notes
- Production scale-out: ย้าย Redis pub/sub (phase 2)
- Idle timeout (T03 เต็ม): ใช้ Elysia ws lifecycle หรือ heartbeat scheduler — เลื่อนทีหลัง
- T05 wire ที่ MQTT handler (E06) + service mutation (เพิ่มทีหลัง)
