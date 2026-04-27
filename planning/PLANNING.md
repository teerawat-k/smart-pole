# Planning — Smart Pole

> ภาพรวม epic + current sprint
> Reference: `docs/legacy-analysis.md` + `project-backup/`

---

## Overview

| Epic | ชื่อ | Priority | Status |
|------|------|----------|--------|
| E00 | Foundation — skeleton + plugins + error/audit core | 0 | ✅ done |
| E01 | Auth — login + captcha + lockout + JWT refresh | 1 | ✅ done |
| E02 | Permission master + RBAC cache + seed | 1 | ✅ done |
| E03 | Role + Permission management | 2 | ✅ done |
| E04 | User management + /me | 2 | ✅ done |
| E05 | Pole master + MQTT credential | 2 | ✅ done |
| E06 | MQTT plugin + topic schema + handlers | 2 | ✅ done |
| E07 | Heartbeat + persistent offline detection | 3 | ✅ done |
| E08 | Sensor archive (1 table per sensor + facade) | 3 | ✅ done (Postgres mode) |
| E09 | Camera archive (file system + SRS callback + signed URL) | 3 | ✅ done |
| E10 | WebSocket plugin + invalidate broadcaster | 3 | ✅ done |
| E11 | Alert engine + dedupe + auto-resolve | 4 | ✅ done |
| E12 | System log + Audit log (query API) | 4 | ✅ done |
| E13 | Frontend foundation — shadcn + layout + auth-store | 1 | ✅ done |
| E14 | Frontend — Login + Auth guard + Sidebar | 2 | ✅ done |
| E15 | Frontend — Dashboard (live + WS + HLS) | 4 | ✅ done |
| E16 | Frontend — Camera Archive | 4 | ✅ done |
| E17 | Frontend — Sensor Archive + CSV export | 4 | ✅ done |
| E18 | Frontend — Pole Management | 3 | ✅ done |
| E19 | Frontend — User Management | 3 | ✅ done |
| E20 | Frontend — Role & Permission matrix | 3 | ✅ done |
| E21 | Frontend — My Profile + Change Password | 3 | ✅ done |
| E22 | Frontend — System Log + Audit Log viewer | 4 | ✅ done |
| E23 | Notification — toast + bell + read tracker | 5 | ⏳ partial (toast only) |
| E24 | E2E test suite (Playwright) | 5 | ⏳ todo |
| E25 | Test scenarios (.md → .xlsx → delivery) | 5 | ⏳ todo |
| E26 | DevOps — docker-compose stack + UAT deploy | 5 | ⚠️ partial (compose ready, deploy pending) |

---

## Current Status (snapshot)

### ✅ Complete
- **Backend:** ทุก module + endpoint (auth, role, user, pole, sensor, mqtt, alert, recording, audit, system-log, websocket, heartbeat-scan)
- **Frontend:** 9 pages (login, dashboard, poles, users, roles, alerts, camera, sensor, profile, system-logs, audit-logs)
- **Schema:** 4 migrations (audit, RBAC+user, pole, sensors, system-config, alert+recording)
- **Tests:** 143 backend unit pass + 9 integration pass / 0 fail

### ⏳ Pending
- E2E tests (Playwright)
- Test scenarios → delivery .xlsx
- DevOps deploy (docker-compose ready, UAT not deployed)
- Notification bell (toast already done)

### Backend Test Stats
- Unit: 143 / 0 fail (~250 expect calls)
- Integration: 9 / 0 fail
- Typecheck: 0 errors

---

## Stretch (เพิ่มถ้ามีเวลา)
- TimescaleDB extension installed → continuous aggregates + retention policies (E08.T08-T09)
- Mosquitto config sync per-pole credential (E26.T03)
- Notification bell + Web Push (E23)
- Rate limit middleware (E01.T05 ส่วน rate-limit เลื่อน)
- Lockout cron job auto-unlock (E01.T06)
- Health check `/health/mqtt` (E06.T08)

---

## Team Standards Reminder

- ทุก master model ห้ามมี `isActive` — ใช้ `deletedAt` + status enum เฉพาะกิจ
- Service file > 80 LoC + side-effect ≥ 3 → split flow/
- Mutation = audit log (fire-and-forget) + WS invalidate
- Endpoint = TypeBox schema + explicit return type
- ทุก commit pass `bunx tsc --noEmit` 0 errors + run unit test ของ module
