# Project Overview

## โปรเจคนี้คืออะไร

**Smart Pole** — โปรแกรมรับข้อมูลและแสดงผลจากเสาสัญญาณอัจฉริยะที่กระจายอยู่ตามจุดต่าง ๆ ส่งข้อมูลผ่าน **MQTT 5** เข้าระบบส่วนกลาง

ขอบเขตข้อมูล:
- 📷 ภาพ/วิดีโอจาก CCTV (RTMP → SRS → HLS live + DVR)
- 🌫️ ฝุ่น PM2.5
- 🌡️ อุณหภูมิ + ความชื้น
- 💡 ควบคุม LED (อนาคต)
- ⚠️ Alert (offline detect + sensor threshold rule ฝั่ง backend)

ระบบเปิดช่อง MQTT ไว้ให้เสาส่งสัญญาณ → backend subscribe → persist → broadcast → frontend dashboard real-time

> รายละเอียด protocol + payload: `docs/mqtt-spec.md`
> Topic ที่ใช้: **`smartpole/sensor`** topic เดียว (`pole_name` อยู่ใน payload)
> Offline detection: ไม่มี heartbeat topic แยก — backend cron scan `Pole.lastSeenAt < now - 5 นาที`

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
7. **Security** — argon2id, rate limit, request id, structured logging
8. **Testability** — unit + integration + E2E ครบทุก module

## Scope

✅ ในขอบเขต:
- 8 หน้าเดิม: Dashboard, Camera Archive, Sensor Archive, My Profile, Role & Permission, User Management, Pole Monitor, System Log
- MQTT 5 ingress (`smartpole/sensor` topic เดียว)
- Sensor-based offline detection (background cron scan)
- HLS live stream + DVR recording playback
- WebSocket realtime push
- RBAC ระดับ page + action

❌ นอกขอบเขต:
- Hardware/firmware ฝั่งเสา
- การติดตั้ง MQTT broker production (ใช้ self-host Mosquitto ใน docker-compose)
- Mobile app (web responsive only)
- LED control (เก็บไว้ phase หลัง)
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
