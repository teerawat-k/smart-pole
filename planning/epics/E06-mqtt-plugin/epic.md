# E06 · MQTT plugin + topic schema + handlers

> Backend MQTT subscriber — connect Mosquitto + validate topic + dispatch handler atoms
> ฟังก์ชันอ้างอิง: `project-backup/backend/src/services/mqtt.service.ts`
> Spec: `docs/mqtt-spec.md`

Priority: 2
Blocked by: E05
Status: todo

## Tasks

| Task | ชื่อ | Status |
|------|------|--------|
| T01 | MQTT client plugin — connect + reconnect + auth | todo |
| T02 | Topic dispatcher + Zod schema validation | todo |
| T03 | Handler — `handle-sensor.ts` (atom) | todo |
| T04 | Handler — `handle-heartbeat.ts` (atom) | todo |
| T05 | Handler — `handle-alert.ts` (atom) | todo |
| T06 | LWT (last-will) handling | todo |
| T07 | Backpressure + batch flush | todo |
| T08 | Health check `/health/mqtt` | todo |
| T09 | Replay buffer + dead-letter | todo |
| T10 | Unit tests with mock MQTT broker | todo |

## Notes
- โครงสร้าง:
  ```
  src/plugins/mqtt/
  ├── client.ts (singleton)
  ├── subscriber.ts (register handlers)
  ├── schemas/{sensor,heartbeat,alert}.schema.ts (Zod)
  └── handlers/{handle-sensor,handle-heartbeat,handle-alert}.ts
  ```
- handler ห้ามเรียก prisma ตรง — ผ่าน service (`sensorArchiveService`, `poleService`, `alertService`) เท่านั้น
- handler validate payload ก่อน → fail = log warn + skip (ไม่ throw, ไม่หยุด subscriber)
- MQTT user สำหรับ backend = `backend-subscriber` (subscribe `smartpole/+/+`)
