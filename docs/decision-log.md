# Decision Log

> เพิ่ม entry ใหม่ด้านบนเสมอ — ห้ามลบ entry เก่า

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
