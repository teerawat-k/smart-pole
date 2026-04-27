# Planning — Smart Pole

> ภาพรวม epic + current sprint
> ดูรายละเอียดแต่ละ task: `planning/epics/E{nn}-{name}/tasks/T{nn}.md`
> Reference (ฟังก์ชันเดิม): `docs/legacy-analysis.md` + `project-backup/`

---

## Overview

| Epic | ชื่อ | Priority | Blocked by | Status |
|------|------|----------|------------|--------|
| E00 | Foundation — skeleton + plugins + error/audit core | 0 | — | todo |
| E01 | Auth — login + captcha + lockout + JWT refresh | 1 | E00 | todo |
| E02 | Module — Module/Permission master + RBAC cache | 1 | E00 | todo |
| E03 | Module — Role + Permission management | 2 | E02 | todo |
| E04 | Module — User management | 2 | E02,E03 | todo |
| E05 | Module — Pole master | 2 | E02 | todo |
| E06 | MQTT plugin + topic schema + handlers | 2 | E05 | todo |
| E07 | Heartbeat + persistent offline detection | 3 | E06 | todo |
| E08 | Sensor archive (InfluxDB write + history query) | 3 | E06 | todo |
| E09 | Camera archive (MinIO + SRS callback + signed URL) | 3 | E05 | todo |
| E10 | WebSocket plugin + invalidate broadcaster | 3 | E00 | todo |
| E11 | Alert engine + threshold rules + notification | 4 | E07,E08,E10 | todo |
| E12 | System log + Audit log (separated concerns) | 4 | E04 | todo |
| E13 | Frontend foundation — layout + auth-store + DataTable + AppForm | 1 | E01 | todo |
| E14 | Frontend — Login page + Auth guard + Sidebar | 2 | E13 | todo |
| E15 | Frontend — Dashboard (live) | 4 | E14,E07,E08,E10 | todo |
| E16 | Frontend — Camera Archive | 4 | E14,E09 | todo |
| E17 | Frontend — Sensor Archive + CSV export | 4 | E14,E08 | todo |
| E18 | Frontend — Pole Management | 3 | E14,E05 | todo |
| E19 | Frontend — User Management | 3 | E14,E04 | todo |
| E20 | Frontend — Role & Permission | 3 | E14,E03 | todo |
| E21 | Frontend — My Profile + Change Password | 3 | E14,E04 | todo |
| E22 | Frontend — System Log viewer | 4 | E14,E12 | todo |
| E23 | Notification — toast + bell + read tracker | 5 | E11 | todo |
| E24 | E2E test suite | 5 | E15-E22 | todo |
| E25 | Test scenarios (.md → .xlsx → delivery) | 5 | E24 | todo |
| E26 | DevOps — docker-compose stack + UAT deploy + backup | 5 | E00 | todo |

---

## Phase Plan

| Phase | Sprint | Epics | จุดประสงค์ |
|---|---|---|---|
| **0 Foundation** | 1 | E00 · E01 · E26 | atomic skeleton + auth + dev infra |
| **1 RBAC** | 2 | E02 · E03 · E04 · E13 · E14 | permission core + frontend foundation + login screen |
| **1 Master** | 3 | E05 · E18 · E19 · E20 · E21 | pole/user/role frontend ครบ |
| **2 Ingress** | 4 | E06 · E07 · E08 · E10 | MQTT + heartbeat + sensor history + WS |
| **3 Media** | 5 | E09 · E16 · E17 | camera + archive frontend |
| **4 Realtime** | 6 | E11 · E15 · E23 | dashboard live + alert + notification |
| **5 Audit** | 7 | E12 · E22 | log/audit + viewer |
| **6 Quality** | 8 | E24 · E25 | E2E + delivery docs |

---

## Current Sprint

ยังไม่เริ่ม — รอ kickoff

---

## Blocked

—

---

## รอลูกค้า Confirm

- รายการ sensor type ทั้งหมด (PM2.5 + temp + humidity + อะไรอีก?)
- LED control — phase นี้หรือ phase 2?
- Image captcha (server render รูป) vs text captcha
- MQTT credential — per-pole หรือ shared?
- Threshold alert default ของแต่ละ sensor type
- Recording retention — เก็บกี่วัน? auto-delete?
- Multi-tenant scope
- Branding (logo, สี theme หลัก)

---

## Team Standards Reminder (กฎทุก task)

- ทุก task ต้องมี **Test Guide** — ห้าม mark done ถ้าไม่ผ่านครบ
- Backend mutation ต้องมี **audit log** (fire-and-forget) ตั้งแต่ task แรก
- ทุก module ต้องมี **`/lookup`** endpoint ตั้งแต่ task แรก
- ทุก service file > 80 LoC หรือ ≥ 3 concerns ต้องแยก `flow/` ทันที
- ทุก mutation ต้องมี **WebSocket invalidate** หลัง commit
- ทุก endpoint ต้องมี **Zod/TypeBox schema** + **explicit return type**
- ทุก model ต้องมี `isActive`, `deletedAt`, `createdBy`, `updatedBy`, `createdAt`, `updatedAt`
- หลังเสร็จ → `bunx tsc --noEmit` ทั้ง backend + frontend ต้อง 0 errors + run unit test ของ module
