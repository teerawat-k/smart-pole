# Decision Log

> เพิ่ม entry ใหม่ด้านบนเสมอ — ห้ามลบ entry เก่า

---

## 2026-07-15 · ออกแบบ Sensor Push API (ส่งข้อมูลออกภายนอก) — + บทเรียนจาก "sensor ตายเงียบ"

- **สถานการณ์:** ต้อง push อุณหภูมิ/ความชื้น/PM2.5 ออกไประบบภายนอก · ระหว่างออกแบบเกิดเหตุจริง: **03:33 น. sensor + กล้อง ดับพร้อมกันภายใน 1 นาที** (sensor reading สุดท้าย 20:33:27Z / SRS unpublish 20:34:30Z) แต่ **Pi ยังรอด** — ยังส่ง `/health` ได้ แต่รายงาน `outcome:"timeout"` (NoResponseError: no communication with the instrument) → **ไฟที่จ่ายให้อุปกรณ์รอบข้างหลุด ไม่ใช่แค่กล้องเสีย** (ต่างจากเหตุ 10 ก.ค. ที่กล้องดับแต่ sensor ยังทำงาน) · **กว่าจะรู้ = ~6 ชม.**
- **ตัดสินใจ (design — ยังไม่ implement):**
  1. **Outbound push** (เรายิงออก) ไม่ใช่ให้ปลายทาง pull — เขียนใน **backend เดิม (TS/Bun)** ไม่เพิ่ม service/ภาษาใหม่ (RAM host ตึง + event อยู่ที่ backend อยู่แล้ว)
  2. **1 record ทุก 3 นาที ต่อเสา** — snapshot ค่าล่าสุด ณ tick (ไม่ใช่ค่าเฉลี่ย) · **flat JSON ไม่มี array** เพราะแต่ละเสามี timer แยก
  3. **anchor จาก online ล่าสุด** — เสา resume → reset นับ 3 นาทีใหม่ (ไม่ยิงรัวชดเชย backlog)
  4. **ตัด `units` ออกจาก payload** — ปลายทางตกลงหน่วยกันแล้ว → **ล็อกใน spec** (°C / %RH / µg/m³) · เปลี่ยนหน่วยเมื่อไหร่ = ขึ้น `schemaVersion`
  5. ⭐ **skip เมื่อค่าไม่สด หรือ `seq` ซ้ำ** — **บทเรียนตรงจากเหตุ 15 ก.ค.**: ถ้าไม่มีกฎนี้ ระบบจะส่งค่าเก่า (28°C/87.6%) **ซ้ำทุก 3 นาทีเป็นวัน ๆ** ทั้งที่ sensor ตายไปแล้ว → ปลายทางเข้าใจผิดว่าข้อมูลปกติ · **ให้ปลายทางเห็น "ช่องว่าง" ดีกว่าได้ค่าหลอก**
- **เหตุผล:** timestamp UTC ISO 8601 ตาม convention (ไม่กำกวม tz) · แยก `measuredAt`/`sentAt` เพราะ retry อาจส่งช้า · `eventId`+`seq` ให้ปลายทาง dedup/ตรวจข้อมูลขาดเองได้ (push เป็น at-least-once)
- **ผลที่ตามมา:** spec เก็บที่ [integration/sensor-push-api.md](./integration/sensor-push-api.md) · **ค้าง:** URL ปลายทาง + วิธี auth (HMAC/Bearer) · **เปิดประเด็นเร่งด่วนจากเหตุการณ์:** (1) ต้องมี **alert** — รู้ช้า 6 ชม. ทุกครั้ง (2) **smart plug** ที่ไฟกล้อง+sensor — กู้ remote ได้ ไม่ต้องวิ่งหน้างาน (3) ตรวจ **ระบบจ่ายไฟที่เสา** — ทำไมอุปกรณ์รอบข้างดับแต่ Pi ไม่ดับ (ดับซ้ำ 2 ครั้งใน 5 วัน)

---

## 2026-06-28 · VPN on-demand WireGuard — implement + verified (+ พบ/แก้ MQTT cred mismatch)

- **สถานการณ์:** สั่งทำ VPN solution ตาม [vpn-solution-design.md](./vpn-solution-design.md) (Phase 1–6) เพื่อ remote เข้าเสาหลัง CGNAT
- **ตัดสินใจ:** deploy **WireGuard on-demand, hub co-located (DOCKER-USER segmentation), per-pole key**:
  - **Hub (host):** `wg0` 10.99.0.1/24 UDP 51820 + segmentation ผ่าน `DOCKER-USER` (ไม่ใช่ FORWARD policy — Docker จัดการ iptables เอง) + enable boot
  - **เสา:** `wg-maint.conf` (on-demand, down by default, AllowedIPs=10.99.0.0/24 ไม่ยึด default route) + `smartpole-vpn-agent` (MQTT `cmd` → `wg-quick up/down` + auto-close timer) + sudoers NOPASSWD เฉพาะ wg-quick
  - **Admin:** WG client template + `vpn-trigger.py` (รันบน laptop)
- **เหตุผล:** ตรงหลัก design — เบา (data idle ~0, ไม่กระทบ live 24x7), ปลอดภัย (segmentation + on-demand + per-pole key), ใช้ MQTT control plane เดิม
- **ผลที่ตามมา:**
  - **verified:** handshake สำเร็จ · **segmentation พิสูจน์แล้ว** (เสาบน VPN → host/backend = บล็อก 100%) · open/close/auto-close ทำงาน · เส้น 4G ปกติไม่กระทบ · 6 containers healthy
  - **⚠️ พบ bug ระหว่างทาง:** main.py/agent ใช้ MQTT username `smartpole` แต่ broker (allow_anonymous false) มี user แค่ `pole-01` + `backend-subscriber` + ACL `pattern smartpole/%u/#` → **เสา auth ไม่ผ่าน = sensor/health ไม่เข้า backend** (regression จากตอน deploy main.py fix รอบก่อนทับ cred ที่เคยถูก). **แก้:** เปลี่ยน username → `pole-01` (repo + deployed) + reset password `pole-01` ใน broker passwordfile (bind-mount `ro` → แก้ที่ host path `/var/www/.../passwordfile` + `docker kill -s HUP`) → เสากลับ online (`sensor_reads_total{pole-01}` เพิ่ม)
  - **ค้าง (production hardening):** Phase 5 (สั่ง vpn-open ผ่าน backend endpoint authenticated + audit) + pole endpoint nft firewall — ทางเลือก (segmentation hub กันชั้นหลักแล้ว)

---

## 2026-06-26 · Park: VPN remote-maintenance + data-budget Step 2 (ทำ RUT200 config ก่อน)

- **สถานการณ์:** วิเคราะห์ 2 เรื่องของ phase 4G เสร็จแล้ว แต่ priority ตอนนี้คือ initial setup/config RUT200 ให้ใช้งานได้ก่อน
- **ตัดสินใจ:** **park ทั้ง 2 เรื่องชั่วคราว** เก็บข้อสรุปการวิเคราะห์ไว้ resume ทีหลัง:
  1. **VPN remote maintenance** — เอนเอียง **WireGuard self-host + segmentation เข้ม** (per-peer firewall ให้เสาเข้าได้แค่ bastion, hub แยกจาก production host, key revocable ต่อเสา). ปลอดภัยพอ**เฉพาะถ้าทำ segmentation ได้**; ทางที่ดีสุด = **on-demand tunnel trigger ผ่าน MQTT** (exposure ต่ำสุด). harden ไม่ได้ → **ไม่ทำ** ใช้ maintenance on-site แทน. หลักการ: **field device = semi-trusted → เสาโดน compromise แล้วต้องลามเข้า production ไม่ได้**
  2. **Data budget Step 2** — Step 1 (cap 15fps/150k) ทำแล้ว (worst-case ~97GB). Step 2 = **on-demand live + record-sync (D/E) ผ่าน MQTT downlink** — pending
- **เหตุผล:** RUT200 network/SIM ต้องใช้งานได้ก่อน ทั้ง 2 เรื่องค่อยตามมา
- **ผลที่ตามมา:** ทั้งคู่ผูกกับ **MQTT control plane (level 3, P2-4)** → ทำพร้อมกันได้เมื่อถึงเวลา; provision เสาทำบน **public IP ก่อนติดตั้ง** (VPN ไม่เกี่ยวกับ provisioning); ดูรายละเอียดวิเคราะห์ใน entry `2026-06-25 · 4G/CGNAT`

---

## 2026-06-25 · 4G/CGNAT — เสาบน cellular ต่อ outbound ได้ แต่ inbound ไม่ได้

- **สถานการณ์:** phase ถัดไปเสาย้ายจาก local network → 4G LTE (Teltonika RUT200 + True SIM 100GB/เดือน). SIM มือถือเกือบทั้งหมดอยู่หลัง **CGNAT** → เสาได้ private IP, ต่อ **ออก** ได้ แต่ไม่มีใครต่อ **เข้า** หาเสาได้
- **ตัดสินใจ:**
  1. **Data flow ไม่ต้องแก้** — MQTT/RTMP/rsync ทั้งหมดเป็น outbound จากเสา → ใช้ได้บน 4G (กล้อง RTSP อยู่ LAN หลัง RUT200 ไม่วิ่ง 4G)
  2. **Management ต้องเปลี่ยน** — SSH เข้าเสา, `deploy-firmware-fleet.sh` (SSH-based), provision/migrate remote → ใช้บน 4G ไม่ได้ → ต้องผ่าน **VPN (WireGuard/OpenVPN) / RUT200 RMS / reverse SSH tunnel** หรือย้ายไป **MQTT downlink**
  3. **Scenario E (clip-on-request)** ต้องเป็น backend → MQTT → เสา rsync clip **ออก** (ห้าม host pull เข้าเสา)
- **เหตุผล:** CGNAT บล็อก inbound เป็นข้อจำกัดของ cellular ทั่วไป แก้ฝั่งเราไม่ได้ (นอกจากซื้อ public/static-IP SIM) → ต้องออกแบบให้ทุกอย่าง "เสาเริ่มต่อออก" หรือ "สั่งผ่าน MQTT downlink"
- **ผลที่ตามมา:**
  - `deploy-firmware-fleet.sh` (SSH-based) ใช้ได้เฉพาะ **local LAN / ผ่าน VPN** — mark ใน header + [production-readiness.md](./production-readiness.md) `P2-4`
  - **ตอกย้ำว่า MQTT control plane (level 3) จำเป็น ไม่ใช่ optional** สำหรับ cellular — เป็นทางเดียวที่สั่งงานเสาผ่าน CGNAT ได้
  - ต้องเลือก remote-management ก่อน deploy 4G: **RUT200 RMS** หรือ **WireGuard/OpenVPN** (RUT200 รองรับ)
  - ตรวจจริงเมื่อได้ SIM: เทียบ WAN IP บน RUT200 กับ `curl ifconfig.me` — ไม่ตรง = หลัง CGNAT (เกือบแน่นอน)

---

## 2026-06-25 · Pole status semantics + Fleet firmware management

- **สถานการณ์:**
  1. เหตุการณ์จริง: sensor (Modbus) ของ pole-001 power หลุด ~58 นาที — Pi ยังส่ง `/health` (outcome=timeout) แต่หยุดส่ง `/sensor`. เดิม backend อัปเดต `lastSeenAt` เฉพาะตอนได้ `/sensor` → เสาถูก mark `offline` ทั้งที่ live stream + recording ยังทำงาน 100% (เสายัง reachable แค่ sensor พัง)
  2. การแก้ retention SD card (36 ชม.) ต้อง `scp` + แก้ crontab รายเสาด้วยมือ — 1 เสายังโอเค แต่ไม่ scale + เสี่ยง config drift
- **ตัดสินใจ:**
  1. **นิยาม offline ใหม่:** เสา `offline` = ติดต่อไม่ได้เลย (ไม่มีทั้ง `/sensor` และ `/health`). ให้ `/health` ต่ออายุ `lastSeenAt` ด้วย ผ่าน helper กลาง `markPoleSeen()` — `lastSeenAt` = "ติดต่อล่าสุด", `latestReadingAt` = "อ่าน sensor สำเร็จล่าสุด" (แยกกัน)
  2. **Fleet firmware (level 1):** สร้าง `deploy-firmware-fleet.sh` — loop `scp`+`ssh` ทุกเสาใน `fleet.txt`, per-pole error isolation, push เฉพาะไฟล์ pole-agnostic (default `cleanup-recordings.sh`)
- **เหตุผล:**
  1. `offline` ต้องสะท้อน "ติดต่อเสาไม่ได้" จริง ไม่ใช่ "sensor อ่านไม่ได้" — 2 เคสนี้ ops ตอบสนองต่างกัน (เปลี่ยน sensor vs ไปดูเสา/เน็ต). heartbeat-scan logic เดิม (`lastSeenAt < cutoff`) ถูกอยู่แล้ว — แค่ feed ข้อมูลให้ถูก
  2. ไฟล์ firmware ส่วนใหญ่ (`main.py`/stream/record/sync) ถูก patch credential ต่อเสา → fleet-push ตรงจะ clobber → level 1 จำกัดเฉพาะไฟล์ pole-agnostic ก่อน (ปลอดภัย, แก้ pain เฉพาะหน้า)
- **ผลที่ตามมา:**
  - commit `6e31d89` (mqtt status logic + test), `7bf25de` (retention 36h), + fleet script
  - **Roadmap fleet (ยังไม่ทำ):** level 2 = firmware versioning (`FIRMWARE_VERSION` ใน `/health` → ตรวจ drift บน dashboard), level 3 = MQTT control plane (`smartpole/<pole>/cmd` + `config` retained → push config/update ผ่าน MQTT รองรับเสา offline, ไม่ต้อง SSH fan-out). retention/threshold ควรกลายเป็น "config push ค่าเดียว" แทน redeploy เมื่อทำ level 3 — ดู [production-readiness.md](./production-readiness.md) `P2-4`
  - หลัก design: แยก **code** (versioned + pull/trigger) ออกจาก **config** (push ผ่าน MQTT retained)

---

## 2026-06-17 · P0 Security hardening — production-grade

- **สถานการณ์:** Pi 5 migration เสร็จ + ระบบเริ่ม stable → ถึงเวลา harden ก่อน pilot launch จริง บางส่วนยังเป็น dev default (Mosquitto allow_anonymous, JWT secret อาจเป็น dev placeholder, Pi SSH password auth เปิด, ไม่มี global API rate limit)
- **ตัดสินใจ:** apply 4 hardening items ใน 1 session:
  1. Mosquitto enforce auth + per-pole ACL (anonymous off)
  2. JWT secret rotate → 256-bit random (128 hex)
  3. Pi 5 SSH key-only (PasswordAuthentication no)
  4. Global API rate limit per IP (mutation 60/min, GET 200/min)
- **เหตุผล:**
  1. ทุก item เป็น industry standard — ไม่ใช่ optional ก่อน pilot ทดสอบกับ end-user
  2. Mosquitto/ACL infrastructure พร้อมแล้วใน repo (commit เก่า) — แค่ uncomment + generate hash
  3. Rate limit code มีอยู่แล้วสำหรับ login/refresh — ขยายเป็น global โดย wrap onRequest hook
  4. Pi 5 พึ่ง migrate เสร็จ — clean state เหมาะกับ harden + ไม่กระทบ user ที่ใช้งานอยู่
- **ผลที่ตามมา:**
  - Bug discovery: `JWT_SECRET` ใน .env corrupt ด้วย Windows path mangling (Git Bash convert `/value` → `C:/Program Files/Git/value`) — แก้โดยใช้ stdin pipe แทน inline shell substitution
  - CI/CD ล่มชั่วคราว 3 รอบ: `appleboy/scp-action@master` มี breaking change → pin `@v0.1.7` + เพิ่ม timeout + retry health check
  - ทุก JWT token ที่ออกอยู่ใน production invalidate → user re-login (acceptable, dev/UAT user น้อย)
  - บันทึกใน [security-hardening.md](./security-hardening.md) ครบขั้นตอน + rotation procedure

---

## 2026-06-16 · Pi 4 → Pi 5 hardware migration

- **สถานการณ์:** Pi 4 1GB ใกล้เต็ม RAM (906 MB total, ใช้ swap 120 MB ตลอด) + อุณหภูมิ throttle ตอน ffmpeg load — ส่งผลต่อ video frame drop และ sensor latency
- **ตัดสินใจ:** swap Pi 4 ออก → Pi 5 4 GB + active cooler + SDcard 32 GB ใหม่
- **เหตุผล:**
  1. Pi 5 RAM 4× → ไม่ swap + overhead ลด
  2. CPU เร็ว 2-3× → ffmpeg preset upgrade possible
  3. Active cooler → idle 39°C (vs Pi 4 ~50°C), load < 50°C (vs Pi 4 throttle)
  4. clean fresh OS = ลดความเสี่ยง config drift
- **ผลที่ตามมา:**
  - สร้าง `infra/pole-firmware/migrate-pi.sh` script (skip backend create-pole + keep credentials)
  - สร้าง runbook `MIGRATION-CHECKLIST.md` — replicable สำหรับ Pi ตัวต่อไป
  - Downtime ~15 นาที (acceptable)
  - Pi 5 hostname = `pole-001` (cosmetic — ไม่กระทบฟังก์ชัน)
  - Bug discovery: `docker compose restart` ไม่ reload env_file → ต้องใช้ `docker compose up -d --force-recreate <service>`

---

## 2026-05-24 · แก้ `.env.example` MQTT_BROKER_URL ให้ตรง default dev workflow

- **สถานการณ์:** `.env.example` ตั้ง `MQTT_BROKER_URL=mqtt://localhost:1883` แต่ Mosquitto ใน `docker-compose.yml` map external port เป็น **7783** (internal 1883) → dev ที่ copy `.env.example` เป็น `.env` แล้วรัน `bun dev` ตรงบนเครื่อง (default workflow ตาม CLAUDE.md) จะเชื่อม MQTT ไม่ได้
- **ตัดสินใจ:** เปลี่ยน `.env.example` เป็น `mqtt://localhost:7783` (ตรงกับ host port mapping) + เพิ่ม comment อธิบาย override สำหรับ Docker mode
- **เหตุผล:**
  1. Default dev workflow ใน [docker-compose.dev.yml](../docker-compose.dev.yml) คือรัน Mosquitto ใน Docker, backend `bun dev` บน host
  2. ค่า env ที่ copy-paste แล้วใช้ได้ทันที = ลด friction
  3. Docker compose `app` profile override `MQTT_BROKER_URL` เป็น `mqtt://mosquitto:1883` อยู่แล้ว ([docker-compose.yml:40](../docker-compose.yml))
- **ผลที่ตามมา:** dev ที่ค้าง `.env` เก่า (port 1883) ต้อง update — แจ้งใน decision-log + production-readiness ที่ section "dev setup"

---

## 2026-05-24 · Default admin password `12345` ใน seed — dev only

- **สถานการณ์:** [seeds/users.ts:13](../backend/prisma/seeds/users.ts) ตั้ง default admin password = `12345` (plain) + comment เตือนว่า "Dev/test default — ห้ามใช้ใน production" แต่ไม่มี mechanism กันไม่ให้ seed รันบน production
- **ตัดสินใจ:**
  1. **ปล่อย seed dev เดิมไว้** (ไม่แก้) — password `12345` ใช้ได้แค่ dev seed
  2. **เพิ่ม guard ใน seeder** ตรวจ `NODE_ENV !== "production"` ก่อนรัน seed admin (เป็น P1 ใน production-readiness)
  3. **เขียน production seed แยก** ที่ require `INITIAL_ADMIN_PASSWORD` env var (เป็น P1 ใน production-readiness)
- **เหตุผล:**
  1. ไม่ break dev workflow ปัจจุบัน (ทุก dev login `admin/12345` ได้)
  2. กัน accident รัน `bun db:seed` บน production แล้วได้ admin password ที่รั่ว
  3. แยก concern: dev seed (idempotent, hardcoded creds) vs production seed (env-driven, require ops input)
- **ผลที่ตามมา:** บันทึก [production-readiness.md](./production-readiness.md) P1-2 — ทำก่อน deploy production ครั้งแรก

---

## 2026-05-24 · Alert system — เก็บ backend ไว้, ฝั่ง frontend UI ถอดชั่วคราว

- **สถานการณ์:** commit `9e40888` (`feat: drop sensor csv export + remove alert/notification system from frontend`) ลบ:
  - หน้า `frontend/app/(dashboard)/alerts/page.tsx`
  - hook `frontend/hooks/api/use-alerts.ts`
  - API client `frontend/lib/api/alert.ts`
  - menu item ใน `app-sider.tsx` + `permissions.ts` ของ frontend
  - แต่ **ไม่ได้แตะ backend** — module `alert/` ยังครบ + endpoint live + heartbeat scan ยัง `createOrIgnore` alert ตอน pole offline + `Alert` table ใน schema ยังอยู่
- **ตัดสินใจ:** เลือก **(C) ปล่อย backend ไว้** (เก็บข้อมูลสะสม) + ฝั่ง frontend UI ถอดออกแล้วยังไม่ฟื้น
- **เหตุผล:**
  1. Backend ทำงานถูกต้อง (dedupe + auto-resolve) — ลบทิ้งเสียดาย
  2. Frontend ถูกถอดแล้วแสดงว่ามีเจตนา (อาจไม่อยากให้ user เห็นตอนนี้) — ไม่ฟื้นกลับโดยไม่มีคำขอ
  3. ถ้าฟื้นกลับภายหลัง ทำง่าย (มี API อยู่แล้ว — แค่สร้าง hook + page)
- **ผลที่ตามมา:**
  - `Alert` table จะมี row สะสม (POLE_OFFLINE) ที่ user มองไม่เห็น — รับได้ในระยะกลาง
  - บันทึกใน [production-readiness.md](./production-readiness.md) P2-1 ให้ stakeholder ตัดสินใจ A/B/C ภายหลัง
  - ถ้าจะถอด backend ภายหลัง: drop `Alert` table + เอา `auto-create` ใน `heartbeat-scan` ออก + ถอด `alertController` + `modules/alert/`

---

## 2026-05-24 · Defer SRS live streaming handler จนกว่าจะ deploy SRS

- **สถานการณ์:** [infra/srs/srs.conf](../infra/srs/srs.conf) ออกแบบไว้ครบ (HLS frag 4s/window 30s, DVR segment 30 นาที, HTTP hooks 3 callback) แต่:
  - SRS ไม่อยู่ใน `docker-compose.yml`
  - Backend ไม่มี module `srs/` รับ callback 3 endpoint
  - Frontend ไม่มี HLS player (ไม่มี `hls.js` ใน `package.json`)
  - กล้อง Dahua ยังไม่ได้ config RTMP push (ใช้ DVR mp4 บน NVR แทน → คัด clip ไป filesystem)
- **ตัดสินใจ:** **Defer** — เก็บ `srs.conf` ไว้เป็น template, ไม่ implement handler/UI ตอนนี้
- **เหตุผล:**
  1. Camera clip filesystem browser ที่ refactor มา (commit `cd196088`) ใช้งานได้แล้ว — user เปิดดูคลิป offline ผ่านหน้า `/camera` + dashboard ได้
  2. Live streaming เป็น feature ต่อขยาย — ไม่ใช่ blocker
  3. ถ้า rush implement ตอนนี้ ต้องทำ: SRS service + 3 backend handlers + Pole status enum ใหม่ (`streaming`) + HLS player + กล้อง RTMP config — cost สูง, value ยังไม่ชัด
- **ผลที่ตามมา:**
  - บันทึก [production-readiness.md](./production-readiness.md) P1-3 — implement เมื่อ stakeholder ตัดสินใจเปิด live
  - `srs.conf` คงอยู่เป็นแบบสำหรับ feature นี้ (HLS + DVR config สำเร็จรูป)
  - ถ้าไม่ใช้ตลอดไป → ลบ `infra/srs/` + entry นี้ + อัปเดต `production-readiness.md`

---

## 2026-05-24 · MQTT username = poleName ตรงๆ (ตัด prefix `pole-`)

- **สถานการณ์:** มี inconsistency ระหว่าง:
  - `seeds/poles.ts:33` ใช้ `mqttUsername = poleName` (`pole-01`)
  - `pole/flow/generate-credential.ts:15` ใช้ `mqttUsername = "pole-" + poleName` (`pole-pole-01`)
  → เสาที่ seed กับเสาที่สร้างผ่าน API จะมี format username ต่างกัน
- **ตัดสินใจ:** เลือก format **`poleName` ตรงๆ** ทั้งระบบ — แก้ `generate-credential.ts` เอา prefix `pole-` ออก + update test
- **เหตุผล:**
  1. Mosquitto ACL pattern `smartpole/%u/#` ทำงานตรงทันที — `%u = poleName`
  2. ฝั่ง Pi config ง่าย — username = ชื่อเสาที่ระบบแสดงในหน้า admin
  3. ตรงกับ seed ที่มีอยู่ ไม่ต้อง migrate data
- **ผลที่ตามมา:**
  - เสาที่ถูกสร้างผ่าน API ไปแล้วในชื่อ `pole-<poleName>` (ถ้ามี) ต้อง `regenerate-credential` หรือ update DB ตรง
  - ปิดงานใน [production-readiness.md](./production-readiness.md) ย้าย P1-2 ไป Done

---

## 2026-05-24 · MQTT topic v2 — per-pole subtree (scale-ready)

- **สถานการณ์:** topic v1 ใช้ `smartpole/sensor` เดียว + `pole_name` ใน payload แต่:
  1. ACL pattern ใน `aclfile` ใช้ `smartpole/%u/#` ซึ่งไม่ match topic จริง → ถ้าเปิด `allow_anonymous false` ใน production, เสาทุกตัว publish ไม่ผ่าน ACL
  2. ไม่มีพื้นที่สำหรับ message type ใหม่ (heartbeat/event/cmd) — ขยายต้อง redesign topic อยู่ดี
  3. `pole_name` ใน payload = duplicate กับ MQTT username + เปิดช่อง spoofing (เสา A ส่ง payload อ้าง pole_name = B)
- **ตัดสินใจ:**
  1. **เปลี่ยน topic เป็น `smartpole/<poleName>/<messageType>`** (per-pole subtree)
  2. **เอา `pole_name` ออกจาก payload sensor** — backend ดึงจาก topic แทน
  3. **Backend subscribe wildcard** `smartpole/+/sensor` ครอบทุกเสา (เพิ่มเสาไม่ต้องแก้ code)
  4. **ACL pattern `smartpole/%u/#` คงเดิม** — ตอนนี้ match กับ topic จริงแล้ว
  5. **Hard cutover** — ไม่ทำ backward-compat กับ topic เก่า (Pi ต้อง update firmware ก่อน backend deploy)
  6. **เผื่อโตในอนาคต:** สำรองพื้นที่ `<poleName>/heartbeat`, `/event`, `/status`, `/cmd/<command>` (ไม่ implement ตอนนี้)
- **เหตุผล:** scale-ready จากต้นทาง, ACL ทำงานถูกต้อง production, ตัดช่อง spoofing, ไม่ต้อง refactor topic อีกครั้ง
- **ผลที่ตามมา:**
  - กระทบ Pi firmware ทุกตัว — เพิ่ม P0 ใน [production-readiness.md](./production-readiness.md) coordinate firmware update
  - ต้องทำ MQTT auth provisioning (sync DB → Mosquitto passwordfile) เป็น P1 ก่อน production
  - Code change: `parse-topic.ts` + test, `schemas.ts`, `handle-sensor.ts` (รับ poleName param), `client.ts` (wildcard subscribe + dispatch switch), `mqtt.integration.test.ts`
  - Doc rewrite: [docs/mqtt-spec.md](./mqtt-spec.md) เป็น v2

---

## 2026-05-24 · ลบ Postgres password ออกจาก `.env.example` + ถือว่ารั่ว

- **สถานการณ์:** `backend/.env.example` commit ตั้งแต่ initial มี `DATABASE_URL` ที่ใส่ password จริง (`gg0943455931`) ของ Postgres dev — อยู่ใน git history ทุก commit ใครได้ repo access เห็นได้หมด
- **ตัดสินใจ:**
  1. แก้ `.env.example` เป็น placeholder `<YOUR_LOCAL_POSTGRES_PASSWORD>` (commit ต่อจาก initial)
  2. ถือว่า password เดิมรั่ว → **ทุก dev ต้อง rotate** Postgres password บนเครื่องตัวเอง
  3. **ไม่ rewrite git history** — repo เป็น private + cost สูง (ทุกคนต้อง re-clone) → ยอมรับ residual risk
  4. ตรวจ `.env.uat.example` แล้ว — ใช้ placeholder ถูกต้อง (`__REPLACE__`)
- **เหตุผล:** minimize blast radius, สร้าง pattern ที่ถูกตั้งแต่ตอนนี้, รักษา hygiene สำหรับ secret ใหม่ทุกตัว
- **ผลที่ตามมา:** dev ทุกคน sync ใหม่ → update `.env` ของตัวเอง + rotate Postgres dev password; ถ้า repo public ในอนาคต ต้อง `git filter-repo` ลบ history ก่อน

---

## 2026-04-28 · ยุบ MQTT topic + รวม sensor table + ใช้ epoch timestamp

- **สถานการณ์:** topic เดิมแยก 3 (`sensor`/`heartbeat`/`event`) + sensor data 4 table + payload nested + drift check ทำให้ ingress ซับซ้อนเกินจำเป็น สำหรับเสาที่ส่งแค่ค่าวัด 3 ตัว
- **ตัดสินใจ:**
  1. เหลือ topic เดียว `smartpole/sensor` — `pole_name` อยู่ใน payload
  2. flat payload: `{ pole_name, timestamp, seq, pm25?, temperature?, humidity? }`
  3. รวม 4 sensor table → `SensorReading` เดียว (id auto-increment)
  4. รวม `PoleLatestReading` → column ใน `Pole` (`latest*`)
  5. เปลี่ยน `timestamp` รับ Unix epoch number — ไม่มี drift check
  6. heartbeat ตัดออกหมด — ใช้ `lastSeenAt` + cron scan
- **เหตุผล:** spec ระบบจริงจากเสาส่ง 3 ค่ากับ seq เท่านั้น — schema เก่า over-engineered + JOIN เยอะตอน query latest
- **ผลที่ตามมา:** ลด table จาก ~20 → 12, ลด module จาก 13 → 9, integration test 5/5 pass, ลด complexity ของ MQTT ingest มาก

## 2026-04-28 · ห้ามใช้ `@@map` — table name = model name

- **สถานการณ์:** schema เดิมใช้ `@@map("snake_case")` mix กับ PascalCase model — Prisma client gen mapping มั่ว ตอนเพิ่ม model ใหม่ไม่มี `@@map` แล้ว query ผิด table
- **ตัดสินใจ:** ลบ `@@map` ทั้งหมด — table name ตรงกับ Prisma model name (PascalCase) ทุกตัว
- **ผลที่ตามมา:** ยุบ migrations เป็น `0_init` เดียว, เพิ่มกฎใน `backend/CLAUDE.md` ว่าห้ามใช้ `@@map` ในอนาคต

---

## 2026-04-27 · MQTT offline detection ย้ายจาก in-memory → Postgres + cron

- **สถานการณ์:** ระบบเดิมใช้ `setTimeout` map in-memory — restart server = state หาย, scale-out ไม่ได้
- **ตัดสินใจ:** เก็บ `lastSeenAt` ใน Postgres ทุก heartbeat + cron job 1 นาทีเช็ค `lastSeenAt < now() - 3min` + ใช้ MQTT LWT สำหรับ disconnect แบบเร็ว
- **เหตุผล:** persistent, รองรับ multi-instance, LWT ทำให้ตอบสนองเร็วเมื่อ ungraceful disconnect
- **ผลที่ตามมา:** ต้องมี advisory lock กัน job ซ้อน, เพิ่ม index `(poleStatus, lastSeenAt)`

---

## 2026-04-27 · เปลี่ยน Fastify → Elysia

- **สถานการณ์:** ระบบเดิมใช้ Fastify + Node + tsx — มาตรฐาน Bun-stack ของทีมใช้ Elysia
- **ตัดสินใจ:** refactor backend ทั้งหมดเป็น Elysia 1.4 + Bun runtime
- **เหตุผล:** เป็นมาตรฐานทีม (เหมือน pmk-psom-v2-remark), Bun เร็วกว่า, type inference จาก Elysia ดีกว่า, ลด dependency (`tsx` + `dotenv` ไม่ต้อง)
- **ผลที่ตามมา:** route + plugin + middleware ต้องเขียนใหม่หมด, MQTT subscriber + Influx + MinIO client เขียนเป็น Elysia plugin

---

## 2026-04-27 · เปลี่ยน bcryptjs → argon2id

- **สถานการณ์:** bcryptjs เป็น pure-JS ช้ามาก + bcrypt cost 12 ใช้เวลา ~1s/hash บน Bun
- **ตัดสินใจ:** ใช้ `argon2` (native) — argon2id mode
- **เหตุผล:** เร็วกว่า, แข็งแรงกว่าตามมาตรฐาน OWASP 2023+
- **ผลที่ตามมา:** seed admin user ต้อง re-hash, migration script แปลง user เก่า → bcrypt verify ครั้งสุดท้ายได้ + re-hash เป็น argon2 ตอน login สำเร็จ

---

## 2026-04-27 · Realtime จาก polling → WebSocket

- **สถานการณ์:** ระบบเดิมใช้ `refetchInterval: 30000` ทุกหน้า — เสีย bandwidth, latency 30s
- **ตัดสินใจ:** เพิ่ม WebSocket plugin (in-memory `Map<userId, Set<WS>>`) + sendInvalidate(userIds, entity) หลัง mutation
- **เหตุผล:** มาตรฐานทีม, real-time จริง, ลด query DB
- **ผลที่ตามมา:** frontend ต้องมี `useWebSocket()` hook + handle reconnect, backend ต้อง broadcast หลัง MQTT alert/heartbeat

---

## 2026-04-27 · ใช้ MQTT 5 + Mosquitto เป็น message broker หลัก

- **สถานการณ์:** ต้องรับ telemetry จากเสาหลายต้นพร้อมกันแบบ real-time + heartbeat
- **ตัดสินใจ:** Mosquitto 2 (MQTT 5) — backend subscribe topic `smartpole/+/{sensor|heartbeat|alert}`
- **เหตุผล:** มาตรฐาน IoT, รองรับ QoS, retained, last-will, ใช้ใน project-backup อยู่แล้ว
- **ผลที่ตามมา:** ต้องวาง topic naming + payload schema + ACL (per-pole credential)

---

## 2026-04-27 · เริ่มโปรเจคจากโครงสร้างมาตรฐาน atomic-first

- **สถานการณ์:** ต้องการมาตรฐานเดียวกันกับ pmk-psom-v2-remark
- **ตัดสินใจ:** copy convention + atomic refactor pattern + CLAUDE.md ทุกชั้น
- **เหตุผล:** ลด onboarding cost, รับประกัน atomic, testable, parallel-agent friendly
- **ผลที่ตามมา:** ทุก module ต้องตาม pattern (orchestrator/flow/shared) ตั้งแต่ต้น

---

## 2026-04-27 · Refactor แบบ incremental ไม่ใช่ big-bang

- **สถานการณ์:** ระบบเดิม (`project-backup/`) มีฟังก์ชันครบ ลูกค้าอาจเริ่มใช้แล้ว
- **ตัดสินใจ:** เก็บ project-backup ไว้เป็น reference, เขียนใหม่ทั้งระบบใน repo ใหม่ทีละ epic
- **เหตุผล:** สามารถดู behavior ของเก่าตอนเขียนใหม่ + รวบ tests + ลดความเสี่ยง regression
- **ผลที่ตามมา:** ต้องมี migration script ดูดข้อมูล Postgres เดิม → schema ใหม่ ก่อน cutover
