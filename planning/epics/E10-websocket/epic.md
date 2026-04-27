# E10 · WebSocket plugin + invalidate broadcaster

> WebSocket realtime push — แทน polling ของ legacy
> Push message types: `invalidate`, `notification`, `pole-status-changed`, `alert-new`

Priority: 3
Blocked by: E00
Status: todo

## Tasks

| Task | ชื่อ | Status |
|------|------|--------|
| T01 | WS plugin — JWT auth + connection registry | todo |
| T02 | Broadcaster atoms — `sendInvalidate`, `sendNotification`, `broadcastToAll` | todo |
| T03 | Heartbeat (ping/pong) + idle timeout | todo |
| T04 | Reconnect-friendly protocol + sequence id | todo |
| T05 | Wire ทุก mutation → broadcast (audit-style integration) | todo |

## Notes
- registry: `Map<userId, Set<WS>>` (in-memory — phase 2 ย้าย Redis)
- ทุก mutation ที่ commit Postgres → fire-and-forget broadcast
- frontend hook `useWebSocket()` (E13) จัดการ reconnect + invalidate query
