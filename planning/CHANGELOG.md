# Changelog

> เพิ่ม entry ใหม่ด้านบนเสมอ — ห้ามลบ entry เก่า
> หมวด: เพิ่ม / แก้ไข / ยกเลิก / รอยืนยัน

---

## 2026-04-27 · Project setup + refactor planning

### เพิ่ม
- วางโครงสร้างโปรเจคตามมาตรฐาน atomic-first (backend / frontend / e2e / docs / planning)
- กำหนด tech stack: Bun + Elysia + Prisma 7 + Postgres + Influx + MinIO + Mosquitto MQTT 5 + SRS
- กำหนด port: frontend 7765, backend 7766
- ตั้ง CI/CD UAT-dev workflow
- สำรวจระบบเดิมใน `project-backup/` → สรุปไว้ที่ `docs/legacy-analysis.md`
- วาง refactor plan 14 epics + ~80 tasks (ดู `planning/PLANNING.md`)
- เพิ่ม `docs/mqtt-spec.md` ระบุ topic + payload schema

### แก้ไข
- เปลี่ยน backend framework: Fastify → Elysia
- เปลี่ยน password hash: bcryptjs → argon2id
- เปลี่ยน realtime: polling 30s → WebSocket invalidation
- เปลี่ยน offline detection: in-memory setTimeout → Postgres `lastSeenAt` + cron + MQTT LWT
- เพิ่ม layer: route/handler → controller → **service** → **repository** → Prisma

### ยกเลิก
- ระบบ `runStartup()` migrate + seed อัตโนมัติทุกครั้งที่ start (ใช้ `migrate deploy` ตอน CI/CD แทน)

### รอยืนยัน
- รายการ sensor type ทั้งหมด
- LED control phase นี้หรือยัง
- Image vs text captcha
- MQTT per-pole credential
- Threshold alert default
- Recording retention
- Multi-tenant
