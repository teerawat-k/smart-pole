# Project Overview

## โปรเจคนี้คืออะไร

**Smart Pole** — โปรแกรมรับข้อมูลและแสดงผลจากเสาสัญญาณอัจฉริยะที่กระจายอยู่ตามจุดต่าง ๆ ส่งข้อมูลผ่าน **MQTT 5** เข้าระบบส่วนกลาง

ขอบเขตข้อมูล:
- 🌫️ ฝุ่น **PM2.5** (sensor PM2510TH-OD รองรับ PM10 ด้วย — ยังไม่เก็บ DB, ดู [production-readiness.md](./production-readiness.md) P2-3)
- 🌡️ อุณหภูมิ + ความชื้น
- 📷 ภาพ/วิดีโอจากกล้อง CCTV (Dahua IPC-HFW5442E-ZE) — ปัจจุบัน **filesystem clip browser**; live HLS streaming อยู่ใน roadmap (ดู [integration/srs-streaming.md](./integration/srs-streaming.md))
- 💡 ควบคุม LED (อนาคต — flag `Pole.hasLed` พร้อม, control method ยังไม่ตัดสิน)
- ⚠️ Alert: backend สร้างจาก offline detection (ฝั่ง frontend ปิด UI ชั่วคราว — ดู [decision-log.md](./decision-log.md))

ระบบเปิดช่อง MQTT ไว้ให้เสาส่งสัญญาณ → backend subscribe → persist → broadcast → frontend dashboard real-time

> Protocol + payload: [./mqtt-spec.md](./mqtt-spec.md)
> Topic: **`smartpole/<poleName>/sensor`** (v2 — per-pole subtree, รองรับขยายเสาแบบ wildcard)
> Offline detection: ไม่มี heartbeat topic แยก — backend cron scan `Pole.lastSeenAt < now - 5 นาที` (ดู [domain/pole-lifecycle.md](./domain/pole-lifecycle.md))

## ลูกค้า / ผู้ใช้งาน

- ลูกค้า: TBD
- ผู้ใช้งานหลัก: เจ้าหน้าที่ดูแล/monitor เสาสัญญาณ
- ผู้ติดต่อฝั่งลูกค้า: TBD

## เป้าหมายหลัก (refactor)

ระบบเดิม (`project-backup/`) มีฟังก์ชันครบแต่คุณภาพต่ำ — เป้าหมาย refactor:

1. **Layered architecture** — controller → service → repository
2. **Atomic-first** — 1 function 1 concern, testable แยกได้
3. **มาตรฐาน data** — soft-delete, audit log, createdBy/updatedBy ทุก model
4. **Lookup pattern** — combobox ใช้ `/lookup` (id+label เท่านั้น)
5. **Realtime** — เปลี่ยน polling → WebSocket invalidation
6. **Type safety** — เลิก `any`, ใช้ Zod/TypeBox validate ทุก endpoint
7. **Security** — argon2id, rate limit (planned), request id, structured logging
8. **Testability** — unit + integration + E2E ครบทุก module

## Scope

✅ ในขอบเขต:
- 9 หน้า: Dashboard, Camera, Sensor Archive, My Profile, Role & Permission, User Management, Pole Management, System Log, Audit Log
- MQTT 5 ingress — topic `smartpole/<poleName>/sensor` (v2)
- Sensor-based offline detection (background cron scan)
- Camera clip filesystem browser (mp4 ที่ admin อัปโหลด)
- WebSocket realtime push (sensor + pole status)
- RBAC ระดับ module + action

🟡 อยู่ใน roadmap (deferred):
- HLS live streaming (SRS — config drafted, ยังไม่ deploy)
- Alert frontend UI (backend module ทำงานอยู่)
- PM10 schema field (sensor รองรับ — ระบบยังไม่เก็บ)
- MQTT auth provisioning (sync DB → Mosquitto)
- HTTPS / TLS

❌ นอกขอบเขต:
- Hardware/firmware ฝั่งเสา (ดู [integration/hardware-specs.md](./integration/hardware-specs.md))
- Mobile app (web responsive only)
- LED control implementation (เก็บไว้ phase หลัง)
- Multi-tenant

## Timeline

- เริ่ม: 2026-04-27
- Phase 0-1 (Foundation + Master data): 3 weeks
- Phase 2-3 (Ingress + Archive): 2 weeks
- Phase 4-6 (Realtime + Quality): 2 weeks
- ส่งมอบ UAT: TBD

## ผู้เกี่ยวข้อง

- Developer: TBD
- ผู้ติดต่อฝั่งลูกค้า: TBD
- Junior dev (ระบบเดิม): TBD

---

## เริ่มต้นใช้งาน Docs

| ต้องการ... | ดูที่ |
|---|---|
| รัน dev ครั้งแรก | [deployment/runbook.md](./deployment/runbook.md) |
| เข้าใจ architecture | [architecture/overview.md](./architecture/overview.md) |
| รู้ port อะไรเปิดอะไร | [deployment/ports.md](./deployment/ports.md) |
| เข้าใจ MQTT protocol | [mqtt-spec.md](./mqtt-spec.md) |
| Hardware spec กล้อง/Pi/sensor | [integration/hardware-specs.md](./integration/hardware-specs.md) |
| Auth + Lockout policy | [domain/auth-lockout.md](./domain/auth-lockout.md) |
| RBAC structure | [domain/rbac.md](./domain/rbac.md) |
| Pole status state machine | [domain/pole-lifecycle.md](./domain/pole-lifecycle.md) |
| ตัดสินใจ design ที่ผ่านมา | [decision-log.md](./decision-log.md) |
| ก่อน deploy production | [production-readiness.md](./production-readiness.md) |
| CI/CD pipeline | [ci-cd-setup.md](./ci-cd-setup.md) |
