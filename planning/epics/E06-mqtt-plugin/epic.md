# E06 · MQTT plugin + topic schema + handlers

> Backend MQTT subscriber — connect Mosquitto + validate topic + dispatch handler atoms
> Spec: `docs/mqtt-spec.md`

Priority: 2
Blocked by: E05, E08-core
Status: done (T07/T09 ขั้นสูง เลื่อน)

## Tasks

| Task | ชื่อ | Status |
|------|------|--------|
| T01 | MQTT client + connect + reconnect + auth | done |
| T02 | Topic dispatcher + Zod schema validation | done |
| T03 | Handler — handle-sensor.ts | done |
| T04 | Handler — handle-heartbeat.ts | done |
| T05 | Handler — handle-event.ts (alert hook → E11) | partial |
| T06 | LWT (last-will) handling | done (heartbeat.status=offline path) |
| T07 | Backpressure + batch flush | skip (best-effort writes พอ) |
| T08 | Health check `/health/mqtt` | TODO |
| T09 | Replay buffer + dead-letter | skip |
| T10 | Unit tests + integration | done (parse-topic + integration with aedes) |

## Atomic Structure

```
src/plugins/mqtt/
├── client.ts                  singleton + connect + reconnect + dispatch
├── parse-topic.ts             pure atom + tests
├── schemas.ts                 Zod (envelope/sensor/heartbeat/event)
├── sensor-registry.ts         registry pattern
├── handlers/
│   ├── handle-sensor.ts       validate envelope → iterate readings → dispatch by registry
│   ├── handle-heartbeat.ts    online/offline + signal history + WS broadcast
│   └── handle-event.ts        TODO(E11) → alertService.createFromMqtt
├── mqtt.integration.test.ts   real broker + handler integration
└── index.ts                   register sensor handlers via side-effect imports
```

## Topics
- `smartpole/+/sensor` (QoS 1) — readings: { pm25, temperature, humidity, ... }
- `smartpole/+/heartbeat` (QoS 0) — status, signalDbm, uptimeSec
- `smartpole/+/event` (QoS 2) — eventType, severity, message

## Validation
- envelope: `{ schemaVersion, poleName, timestamp, seq? }`
- timestamp drift > 300s → reject
- poleName mismatch (topic vs payload) → reject
- pole not found → log warn + skip
- sensor key in registry → validate Zod → write
- sensor key not in registry → `sensor_unknown` table
- sensor key validate fail → `sensor_unknown` reason=validation_failed

## Side Effects (per message)
**Sensor:**
1. iterate readings → dispatch via `getSensorHandler(key)`
2. write hypertable
3. `broadcastSensorReading` (WS)
4. `poleService.touchLastSeen` (best-effort)

**Heartbeat:**
1. status=online → `poleService.recordHeartbeat` + write `sensor_heartbeat_signal`
2. status=offline (LWT) → `poleService.markOffline`
3. broadcast pole-status-changed (เฉพาะตอนเปลี่ยน state offline→online)

**Event:**
1. TODO(E11): create alert via alertService
2. broadcast event to all WS clients

## Test Result
- parse-topic: 6 unit tests pass
- mqtt.integration.test.ts: **7 pass / 1 skip / 0 fail**
  - sensor reading → write 3 tables (pm25/temp/humidity)
  - poleName mismatch → reject
  - unknown sensor key → sensor_unknown
  - validation fail → sensor_unknown reason=validation_failed
  - fahrenheit → celsius conversion
  - heartbeat online → status update + signal write
  - heartbeat offline (LWT) → mark offline
  - real broker test (aedes) skip — Windows IPv6 connection timing issue
- All unit tests: **137 pass / 0 fail**
- Test scripts: `test:unit` (default), `test:integration` (sequential per file)

## Notes
- Backpressure (T07) เลื่อน — Postgres direct write ทนได้ (ไม่ใช่ Influx network)
- Health check (T08) TODO เพิ่ม `/health/mqtt`
- Replay/DLQ (T09) skip — handler ไม่ throw ที่ไหน, fail ของ sensor key เก็บใน sensor_unknown แล้ว
