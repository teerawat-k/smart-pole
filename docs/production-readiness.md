# Production Readiness TODO

> รายการที่ต้องเคลียร์ก่อน deploy ขึ้น production (หรือ public-facing UAT) — เพิ่ม item ใหม่ด้านบนของ section, ห้ามลบ item ที่ปิดแล้ว (mark `✅ done` + วันที่)

**Priority:**
- 🔴 **P0** — Blocker, ห้าม deploy ก่อนแก้
- 🟠 **P1** — สำคัญ, deploy ได้แต่ต้องตาม fix ภายใน 1-2 sprint
- 🟡 **P2** — Nice to have, ทำเมื่อมีเวลา

> 🔐 ดู [security-hardening.md](./security-hardening.md) สำหรับ security ที่ apply แล้ว + rotation procedure

---

### ~~P0-x · Mosquitto allow_anonymous=true ใน production~~ ✅ FIXED 2026-06-17

- Mosquitto enforce auth + per-pole ACL — [security-hardening.md § 1](./security-hardening.md#-1-mosquitto-enforce-authentication)
- **commit:** [3d2f5b3](https://github.com/teerawat-k/smart-pole/commit/3d2f5b3)

### ~~P0-y · JWT secret = dev placeholder~~ ✅ FIXED 2026-06-17

- Rotate 256-bit random — [security-hardening.md § 2](./security-hardening.md#-2-jwt-secret-rotation)
- **commit:** manual rotation (ไม่ commit secret)

### ~~P0-z · Pi SSH password auth + global API ไม่มี rate limit~~ ✅ FIXED 2026-06-17

- Pi 5 SSH key-only + global API rate limit per IP
- **commits:** [3d2f5b3](https://github.com/teerawat-k/smart-pole/commit/3d2f5b3)

---

## 🔴 P0 — Blockers

### P0-0 · Coordinate Pi firmware update ก่อน deploy MQTT topic v2

- **บริบท:** ดู [decision-log.md](./decision-log.md) entry `2026-05-24 · MQTT topic v2`
- **ปัญหา:** Backend ถูกแก้แล้วให้รับ topic `smartpole/<poleName>/sensor` (เอา `pole_name` ออกจาก payload) → Pi ที่ยัง publish topic เก่า `smartpole/sensor` จะถูก backend log warn ทิ้ง ไม่บันทึก
- **วิธีแก้:**
  1. แจ้งทีม firmware Pi — เปลี่ยน topic publish เป็น `smartpole/<poleName>/sensor` + เอา `pole_name` ออกจาก payload (ดู [docs/mqtt-spec.md § 7](./mqtt-spec.md))
  2. Deploy Pi ทุกตัวก่อน
  3. Test UAT 1-2 วัน — ตรวจ backend log ว่า packet เข้าครบ (ไม่มี "unknown topic format")
  4. Deploy backend
- **Estimate:** ~1-2 ชม. ต่อ firmware update + 1-2 วัน UAT verification
- **Status:** open — backend code พร้อมแล้ว, รอ Pi firmware

### ~~P0-1 · Pole controller ไม่มี auth จริง~~ ✅ FIXED 2026-06-11

- **commit:** ดู Done section ด้านล่าง

### ~~P0-2 · User controller ไม่มี auth จริง~~ ✅ FIXED 2026-06-11

- **commit:** ดู Done section ด้านล่าง

### P0-3 · Rotate Postgres dev password ที่เคย commit

- **บริบท:** ดู [decision-log.md](./decision-log.md) entry `2026-05-24`
- **ปัญหา:** password `gg0943455931` อยู่ใน git history ของ `backend/.env.example` ตั้งแต่ initial commit
- **วิธีแก้:**
  1. dev ทุกคน — เปลี่ยน password Postgres dev บนเครื่องตัวเอง
  2. update `.env` ของตัวเองให้ตรง
  3. ตรวจว่าไม่เอา password เดิมไปใช้ใน UAT/production
  4. (optional) ถ้า repo public ในอนาคต → `git filter-repo` ลบ history
- **Status:** open (action ฝั่ง dev — ไม่ใช่ code change)

---

## 🟠 P1 — Important

### P1-2 · แยก production seed + กัน dev seed รันบน production

- **บริบท:** ดู [decision-log.md](./decision-log.md) entry `2026-05-24 · Default admin password 12345`
- **ปัญหา:** [seeds/users.ts:13](../backend/prisma/seeds/users.ts) hardcode admin password = `12345` (plain) — ถ้า ops รัน `bun db:seed` บน production database (อุบัติเหตุหรือ scripted deploy) จะได้ admin login ที่ใครก็เดาได้
- **วิธีแก้:**
  1. **กัน dev seed บน production** — เพิ่ม guard ที่หัว [seeds/index.ts](../backend/prisma/seeds/index.ts):
     ```ts
     if (process.env.NODE_ENV === "production") {
       throw new Error("dev seed ห้ามรันบน production — ใช้ seeds/production.ts แทน");
     }
     ```
  2. **สร้าง production seed แยก** `backend/prisma/seeds/production.ts`:
     - require env `INITIAL_ADMIN_USERNAME` + `INITIAL_ADMIN_PASSWORD` + `INITIAL_ADMIN_EMAIL`
     - throw ถ้าไม่ครบ
     - seed permissions + roles เหมือนเดิม + create admin จาก env vars
     - idempotent (`upsert` — รันซ้ำได้)
  3. **เพิ่ม script** ใน [backend/package.json](../backend/package.json): `"db:seed:prod": "bun prisma/seeds/production.ts"`
  4. **Deployment runbook** ระบุ: rollout production = `bun db:deploy` → `bun db:seed:prod` (ครั้งแรกเท่านั้น)
- **กระทบ:**
  - dev workflow ไม่เปลี่ยน (`bun db:seed` ทำงานเหมือนเดิม)
  - ops ต้อง export 3 env vars ก่อน seed prod
  - documentation deployment runbook
- **Estimate:** ~2-3 ชม. (รวม test idempotency + runbook)
- **Status:** open

### P1-1 · MQTT auth provisioning service (sync DB → Mosquitto)

- **บริบท:** ตอนนี้ Mosquitto ใช้ `allow_anonymous true` (dev) → ทุกคน publish ได้โดยไม่ auth → production ใช้ไม่ได้
- **ปัญหา:**
  1. Backend สร้าง MQTT credential ต่อเสาเก็บใน `Pole.mqttUsername` + `mqttPasswordHash` (argon2) แล้ว — แต่ Mosquitto ไม่รู้
  2. Mosquitto passwordfile ([infra/mosquitto/config/passwordfile](../infra/mosquitto/config/passwordfile)) ว่างเปล่า
  3. argon2 hash ของ backend ไม่ compatible กับ format password file ของ Mosquitto (Mosquitto ใช้ pbkdf2/sha512)
- **วิธีแก้ (เลือก 1):**
  - **(A) File-based + reload:** ตอน create/regenerate pole → backend exec `mosquitto_passwd -b file user pass` → reload Mosquitto (`SIGHUP`) — ง่ายแต่ต้องมี mosquitto_passwd บน image + share volume
  - **(B) Dynamic Security plugin:** Mosquitto Dynsec — backend เรียก control API ของ Dynsec ผ่าน MQTT control topic — scale ดีกว่าแต่ setup ยากกว่า
  - **(C) HTTP auth plugin (`mosquitto-auth-plug` หรือ `mosquitto-go-auth`):** Mosquitto ยิง HTTP ไปถาม backend ตอน client connect/publish — backend ตอบ allow/deny — design clean สุดแต่ละ external plugin
- **คำแนะนำ:** เริ่ม (A) ก่อน production แรก (cost ต่ำ) → migrate ไป (C) เมื่อโต > 50 เสา
- **กระทบ:**
  - `pole/flow/create.ts` + `pole/flow/regenerate-credential.ts` — เพิ่ม step sync Mosquitto
  - Docker compose — share `passwordfile` volume + ติด `mosquitto-clients` ใน backend image
  - `mosquitto.conf` — เปลี่ยน `allow_anonymous false` + uncomment `password_file` + `acl_file`
- **Estimate:** ~6-8 ชม. (option A) + 1 วัน UAT test
- **Status:** open

### P1-3 · SRS callback handler — implement เมื่อ SRS deploy

- **บริบท:** [infra/srs/srs.conf](../infra/srs/srs.conf) ออกแบบให้ SRS callback ไปที่ backend 3 endpoint แต่ backend ยังไม่มี handler:
  - `POST /api/srs/on-publish` — แจ้งเมื่อกล้องเริ่ม RTMP push
  - `POST /api/srs/on-unpublish` — แจ้งเมื่อ stream หลุด
  - `POST /api/srs/on-dvr` — แจ้งเมื่อ DVR เซฟไฟล์ mp4 เสร็จ 1 segment (30 นาที)
- **ปัญหา:** ถ้า SRS ขึ้นโดย backend ยังไม่มี handler → ทุก callback เด้ง 404 (SRS ไม่ retry สำคัญแค่ log fail)
- **วิธีแก้:**
  1. สร้าง `backend/src/modules/srs/srs.controller.ts` รับ 3 endpoint ตาม payload spec ของ SRS 5
  2. Validate `X-Srs-*` headers (ถ้ามี) + body schema
  3. `on-publish` → mark `Pole.poleStatus = streaming` (เพิ่ม enum) หรือ flag separate
  4. `on-dvr` → optional: index ใน DB (ไม่จำเป็นเพราะ camera-clip browser อ่าน filesystem ตรงๆ — อาจแค่ broadcast WS ให้ frontend refetch)
  5. `on-unpublish` → optional: revert streaming flag + audit
- **กระทบ:**
  - SRS ต้องอยู่ใน docker-compose (ตอนนี้ไม่อยู่)
  - เปิด port 1935 (RTMP) บน host
  - กล้อง Dahua ต้อง config RTMP push ไปที่ SRS
  - Frontend ต้องมี HLS player (`hls.js` ใน `package.json` + component)
- **Estimate:** ~1-2 วัน (handler + docker-compose + กล้อง config + frontend player)
- **Priority rationale:** P1 (ไม่ใช่ P0) เพราะ camera clip filesystem browser ใช้งานได้แล้ว — live streaming เป็น feature ต่อขยาย
- **Status:** open — deferred จนกว่าจะตัดสินใจเปิด live streaming

---

## 🟡 P2 — Nice to have

### P2-1 · ฟื้นหน้า Alert UI ใน frontend (ถ้าผู้ใช้ต้องการ)

- **บริบท:** commit `9e40888` ลบหน้า `/alerts` + `useAlerts` hook + `lib/api/alert.ts` ออกจาก frontend, แต่ **backend module ยังทำงานอยู่ครบ**:
  - `alertController` (REST API ยัง expose) ใน [src/index.ts](../backend/src/index.ts):81
  - `alertService` มี 4 ops: `list`, `createOrIgnore` (dedupe 60s), `resolve`, `autoResolveForPole`
  - `heartbeat-scan` auto-create POLE_OFFLINE alert ทุกครั้งเสาขาดสัญญาณ → ข้อมูลสะสมใน DB ไม่หาย
- **ปัญหา:** alert data ถูกสร้าง+เก็บ แต่ user ไม่เห็น UI → "silent data sink"
- **ตัวเลือก:**
  - **(A)** ปล่อยไว้ (status ปัจจุบัน) — data สะสมเผื่อใช้ภายหลัง
  - **(B)** ฟื้นกลับ — สร้าง `frontend/lib/api/alert.ts` + `useAlerts` hook + `/alerts` page ใหม่ (~4-6 ชม.)
  - **(C)** ถอด backend ออกด้วย — ลบ `modules/alert/` + ถอด `alertController` จาก `src/index.ts` + เอา auto-create ออกจาก `heartbeat-scan/flow/scan-offline-poles.ts` + drop `Alert` table ใน migration ใหม่ (~2-3 ชม.)
- **ปัจจุบัน:** เลือก (A) — ทบทวนเมื่อ stakeholder ตัดสินใจ
- **Status:** decision required

### P2-3 · เพิ่ม PM10 ใน schema + MQTT payload (sensor รองรับแล้ว)

- **บริบท:** Sensor field คือ **PM2510TH-OD** (sumtech.co.th) — รองรับ **PM2.5 + PM10 + Temp + Humi** แต่ระบบเก็บแค่ PM2.5
- **ที่อยู่:**
  - Schema: [backend/prisma/schema.prisma](../backend/prisma/schema.prisma) — `SensorReading` ไม่มี column `pm10`, `Pole` ไม่มี `latestPm10`/`hasPm10Sensor`
  - MQTT: [backend/src/plugins/mqtt/schemas.ts](../backend/src/plugins/mqtt/schemas.ts) — `sensorMessageSchema` ไม่มี `pm10` field
  - Frontend: [frontend/app/(dashboard)/dashboard/page.tsx](../frontend/app/(dashboard)/dashboard/page.tsx) — ไม่แสดง card PM10
- **วิธีแก้:**
  1. **Migration** เพิ่ม columns:
     - `SensorReading.pm10  Decimal? @db.Decimal(8, 2)`
     - `Pole.latestPm10     Decimal? @db.Decimal(8, 2)`
     - `Pole.hasPm10Sensor  Boolean @default(false)`
  2. **MQTT schema** เพิ่ม `pm10: z.number().min(0).max(2000).optional()` (PM10 range สูงกว่า PM2.5)
  3. **MQTT handler** insert + update PM10
  4. **Frontend Dashboard** เพิ่ม PM10 sensor card (filter `selected.hasPm10Sensor`)
  5. **Pole form** เพิ่ม checkbox `hasPm10Sensor`
  6. **Pi firmware** ส่ง `pm10` ใน sensor payload (coordinate กับทีม Pi)
- **Estimate:** ~3-4 ชม. (schema + migration + UI + Pi coordination)
- **Priority rationale:** P2 — ไม่ใช่ blocker, แต่เป็น hardware capability ที่ทิ้งไว้เปล่าๆ น่าเสียดาย
- **Status:** open

### P2-2 · ลบ `account_unlocked` audit log ที่บันทึก userId ผิด

- **ที่อยู่:** [backend/src/modules/user/flow/unlock.ts:22-26](../backend/src/modules/user/flow/unlock.ts)
- **ปัญหา:** `logSystem({ userId: requestUserId })` บันทึก userId ของ admin (คนปลดล็อก) ไม่ใช่ target user → audit trail แสดง "admin ถูก unlock" แทน "user X ถูก unlock"
- **วิธีแก้:** เปลี่ยน `userId: requestUserId` เป็น `userId: user.id` (target user) + เพิ่ม `detail: { unlockedBy: requestUserId }` ใน JSON เพื่อเก็บ context คนปลดล็อก
- **Estimate:** ~15 นาที
- **Status:** open

---

## ✅ Done

### ✅ 2026-06-11 · HTTPS via nginx (TLS termination) + CI test runner fix

**HTTPS setup:**
- ตัดสินใจใช้ nginx ที่ติดตั้ง host (ไม่ใช่ Caddy ใน docker) — เพราะ server แชร์กับ wanasub.com ซึ่ง nginx ครอง 80/443 อยู่แล้ว
- [infra/nginx/smart-pole.conf](../infra/nginx/smart-pole.conf): server block — TLS termination + reverse proxy ไป backend/frontend/SRS/WebSocket
- [infra/nginx/setup-nginx.sh](../infra/nginx/setup-nginx.sh): script gen self-signed cert (10 ปี) + symlink sites-enabled + reload
- Self-signed cert สำหรับ IP `152.42.242.162` — browser warning ครั้งแรก (กำจัด: import root CA — ดู README)
- Path proxy: `/api/*` `/ws*` `/hls/*` `/*` ไป backend `:7766` / SRS `:7780` / frontend `:7765`
- Backend multi-origin CORS (`http://152.42.242.162:7765,https://152.42.242.162` — comma-separated ผ่าน env)
- Workflow `uat-dev.yml` append `https://152.42.242.162` อัตโนมัติทุก deploy
- ✅ Verified: `https://152.42.242.162/login` → 200, `/api/poles` → 401, `/hls/...m3u8` → 200, `/` HTTP→HTTPS → 301
- Let's Encrypt upgrade path: ตั้ง DNS + แก้ server_name + `certbot --nginx -d <domain>` (ดู infra/nginx/README.md)

**CI test runner fix (mock.module leak):**
- [backend/scripts/run-unit-tests.ts](../backend/scripts/run-unit-tests.ts): spawn 1 child process per file — กัน Bun mock.module hoist ปนกัน
- [.github/workflows/ci.yml](../.github/workflows/ci.yml): เปลี่ยน `bun test --pattern` → `bun run test:unit`
- **2 real bugs ที่ถูกซ่อน (mock leak ตอนแรก):**
  - `websocket.ts`: เพิ่ม `jsonReplacer` ที่ broadcast functions — BigInt → Number (เหมือน Decimal.toJSON ใน plugins/prisma.ts)
  - `scheduler.test.ts` → `scheduler.integration.test.ts`: ใช้ Postgres advisory lock จริง = integration test ไม่ใช่ unit test
- ✅ CI green ครั้งแรกตั้งแต่ commit 81c720a

### ✅ 2026-06-11 · Auth coverage ครบทุก controller — provisioning automation

ขยายต่อจาก P0-1 + P0-2 (Pole + User):
- **role.controller.ts** — เพิ่ม `authGuard` + `requirePermission("role:view|create|edit|delete")` + invalidate cache เมื่อ PUT permissions
- **audit.controller.ts** — auth + `requirePermission("system_log:view")` (admin function)
- **system-log.controller.ts** — auth + `requirePermission("system_log:view")`
- **sensor-archive.controller.ts** — auth + `requirePermission("sensor_archive:view"|"dashboard:view")`
- **camera-clip.controller.ts** — split เป็น 2 sub-controller:
  - List endpoints (`/latest`, `/clips`) — auth + `camera_archive:view`/`dashboard:view`
  - Stream endpoint — public route (browser `<video src>` ไม่ส่ง Authorization header; path validation + list endpoint lock = defense in depth; upgrade เป็น signed URL ภายหลัง)
- **alert.controller.ts** — auth-only (no permission seed สำหรับ alert; alert UI ถอดแล้ว backend ยังทำงาน)

Permission flags ใน list response:
- Backend `hasPermission(user, perm)` helper (อยู่ใน `common/middleware/require-permission.ts` ข้าง `requirePermission`)
- `GET /api/poles` + `GET /api/users` enrich response ด้วย `canEdit`, `canDelete` ต่อ row
- Frontend `PoleListItem.canEdit/canDelete` + `UserListItem.canEdit/canDelete` types updated

Login response มี permissions ครบ:
- `verify-credentials.ts` — `VerifiedUser` มี `firstName, lastName, isSystemRole, permissions[]`
- `user.repository.findByUsername` join role.permissions
- `use-auth.ts` populate AuthUser เต็มจาก login response (ไม่ต้องรอ /me)

Provisioning automation:
- `backend/scripts/create-pole.ts` — Bun CLI สร้าง pole + gen MQTT cred ผ่าน prisma direct
- `infra/pole-firmware/provision-pi.sh` — 6-step automated Pi provisioning (~3 นาที vs 30 นาที manual)

### ✅ 2026-06-11 · P0-1 + P0-2 — Pole + User controller auth

- **แก้:**
  - สร้าง [backend/src/common/middleware/require-permission.ts](../backend/src/common/middleware/require-permission.ts) — Elysia `beforeHandle` helper พร้อม cache permissions per role 60s + admin bypass
  - [pole.controller.ts](../backend/src/modules/pole/pole.controller.ts): wrap `.use(authGuard)` ทุก endpoint, `getUserId(headers)` → `user.id` (จาก JWT), เพิ่ม `requirePermission("pole:view|create|edit|delete")` ต่อ endpoint
  - [user.controller.ts](../backend/src/modules/user/user.controller.ts): wrap `.use(authGuard)` ทุก endpoint + `requirePermission("user:...")`
  - `meController` ใช้ `.use(authGuard)` แบบ auth-only (ไม่มี permission check — self-service)
- **Permission mapping:**
  - `GET /` `GET /:id` — `pole:view` / `user:view`
  - `POST /` — `pole:create` / `user:create`
  - `PATCH /:id` `PATCH /:id/status` `POST /:id/maintenance` `POST /:id/regenerate-credential` `POST /:id/unlock` `POST /:id/reset-password` — `pole:edit` / `user:edit`
  - `DELETE /:id` — `pole:delete` / `user:delete`
  - `GET /lookup` — auth-only (used by combobox)
  - `GET/PATCH /api/me` — auth-only

### ✅ 2026-05-24 · MQTT username inconsistency — แก้ `generate-credential` ให้ตรงกับ seed

- **ปัญหาเดิม:** `seeds/poles.ts:33` ตั้ง `mqttUsername = poleName` (`pole-01`) แต่ `pole/flow/generate-credential.ts:15` ใช้ `"pole-" + poleName` (`pole-pole-01`) → ผิด pattern กัน
- **วิธีแก้:** เลือก format `poleName` ตรงๆ (ตรงกับ ACL pattern `%u` + เรียบง่าย) — แก้ `generate-credential.ts` เอา prefix `pole-` ออก + update test
- **Verified:** test case `"ส่งคืน mqttUsername = poleName (ตรงกับ Mosquitto ACL pattern %u)"` ใน [generate-credential.test.ts](../backend/src/modules/pole/flow/generate-credential.test.ts)
