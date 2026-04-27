# Changelog

> เพิ่ม entry ใหม่ด้านบนเสมอ — ห้ามลบ entry เก่า
> หมวด: เพิ่ม / แก้ไข / ยกเลิก / รอยืนยัน

---

## 2026-04-28 · Backend + Frontend MVP complete

### เพิ่ม (Backend)
- 4 migrations: audit log, RBAC + user, pole, sensors, system_config, alert + recording
- 13 modules: audit, captcha, auth, role, user, pole, sensor (×4 + archive facade), mqtt subscriber, heartbeat-scan, alert, recording, system-log, system-config
- Plugins: prisma, logger, request-id, jwt, websocket (5 broadcast atoms), mqtt (registry pattern), scheduler (cron + advisory lock), storage
- 143 unit tests + 9 integration tests pass / 0 fail
- Atomic flow files: 24 atom files across user/pole/auth/alert/recording/heartbeat-scan modules
- MQTT 5 subscriber + 3 handlers (sensor/heartbeat/event) + sensor handler registry
- Sensor schema: 1 table per sensor type (PM2.5/temp/humidity/heartbeat-signal) + sensor_unknown debug
- Alert engine: dedupe (60s window) + auto-resolve on offline→online + WS broadcast

### เพิ่ม (Frontend)
- 9 pages: login, dashboard (live + WS + HLS), poles (CRUD + MQTT cred), users (CRUD + lock/reset), roles (matrix), alerts (resolve), camera (DVR list + play), sensor (history + CSV), profile (edit + change password), system-logs, audit-logs
- shadcn UI primitives (22 components) + layout components (12 widgets) + 5 hooks copied from pmk-psom-v2-remark + adapted
- Auth flow: captcha + login + JWT refresh rotation + reuse detection + auto-logout on password change
- Sidebar: dynamic permission filter + mobile drawer (legacy color scheme #E1FEFE/#0D47A1 preserved)
- /me sync to authStore: name + permissions[] + isSystemRole

### แก้ไข
- /api/me ส่ง role.isSystem + permissions[] (frontend ใช้สำหรับ permission check)
- admin user password = `12345` (dev only)
- TypecastDB หยุดใช้ — ใช้ Postgres ปกติก่อน, เพิ่ม hypertable migration เมื่อ extension ติดตั้ง

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
