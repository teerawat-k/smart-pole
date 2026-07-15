# Sensor Push API — Data Format Spec

> **สถานะ: ออกแบบเสร็จ — ยังไม่ implement** (รอ: URL ปลายทาง + วิธี auth)
>
> Push ข้อมูล sensor (อุณหภูมิ / ความชื้น / PM2.5) จาก **Host → ระบบภายนอก**
> ทิศทาง: **outbound push** (เราเป็นฝ่ายยิงออก) — ไม่ใช่ปลายทางมาดึง

---

## 1. ภาพรวม

| หัวข้อ | ค่า |
|---|---|
| ทิศทาง | Host (backend) → external endpoint |
| Method | `POST` + JSON body |
| จังหวะส่ง | **1 record ทุก 3 นาที ต่อเสา** (snapshot ค่าล่าสุด ณ ตอน tick — ไม่ใช่ค่าเฉลี่ย) |
| ภาษา/ที่อยู่โค้ด | TypeScript ใน backend เดิม (Bun + Elysia) — ไม่เพิ่ม service/ภาษาใหม่ |
| ต้นทางข้อมูล | `SensorReading` (มาจาก MQTT `smartpole/<pole>/sensor`) |

> **หมายเหตุ:** push ยิงจาก Host ไม่ใช่จากเสา → **ไม่กิน 4G ของเสา**

---

## 2. JSON Format (final)

```json
{
  "schemaVersion": "1.0",
  "source": "smart-pole",
  "eventId": "9f1c2b7e-4d3a-4b6e-9c11-8a5e2f0d7b34",
  "sentAt": "2026-07-15T02:33:00.000Z",
  "poleName": "pole-01",
  "measuredAt": "2026-07-15T02:32:27.123Z",
  "seq": 12345,
  "metrics": {
    "temperature": 28.00,
    "humidity": 87.60,
    "pm25": 13.00
  }
}
```

### Field Spec

| Field | Type | รูปแบบ | หมายเหตุ |
|---|---|---|---|
| `schemaVersion` | string | `"1.0"` | เปลี่ยนโครงสร้าง/หน่วย → ต้องขึ้นเวอร์ชัน + แจ้งปลายทาง |
| `source` | string | `"smart-pole"` | ระบุระบบต้นทาง (ปลายทางอาจรับหลายระบบ) |
| `eventId` | string | UUID v4 | **idempotency** — ปลายทาง dedup ได้เมื่อเรา retry |
| `sentAt` | string | UTC ISO 8601 | เวลา tick (ตอนที่ส่ง) |
| `poleName` | string | `"pole-01"` | ชื่อเสา — ตรงกับ MQTT topic + DB |
| `measuredAt` | string | UTC ISO 8601 | **เวลาที่เสาวัดค่านั้นจริง** (มักเก่ากว่า `sentAt` เล็กน้อย เพราะเสาอ่านทุก ~60s) |
| `seq` | number | int | ลำดับจาก firmware — ปลายทางเรียง/ตรวจข้อมูลซ้ำ-ขาดได้ |
| `metrics.temperature` | number \| null | 2 ทศนิยม | |
| `metrics.humidity` | number \| null | 2 ทศนิยม | |
| `metrics.pm25` | number \| null | 2 ทศนิยม | |

### หน่วย — **ล็อกใน spec นี้** (ไม่ประกาศใน payload)

| metric | หน่วย |
|---|---|
| `temperature` | **°C** (เซลเซียส) |
| `humidity` | **%RH** |
| `pm25` | **µg/m³** |

> ⚠️ ปลายทางตกลงหน่วยกันไว้แล้ว จึงตัด `units` ออกจาก payload
> → **ห้ามฝ่ายใดเปลี่ยนหน่วยเงียบ ๆ** · ถ้าต้องเปลี่ยน = ขึ้น `schemaVersion` เป็น `"2.0"` + แจ้งปลายทางก่อน

---

## 3. HTTP Headers

```http
POST /<endpoint> HTTP/1.1
Content-Type: application/json
X-SmartPole-Event-Id:   9f1c2b7e-...              ← ตรงกับ eventId ใน body (idempotency)
X-SmartPole-Timestamp:  1784081963                ← กัน replay attack
X-SmartPole-Signature:  sha256=<HMAC-SHA256 ของ body ด้วย shared secret>
```

---

## 4. Logic การส่ง — 1 record ทุก 3 นาที (anchor จาก online ล่าสุด)

```
เสา resume (online)  ──► push ทันที (record แรก) + ตั้ง anchor = เวลานั้น
                     ──► tick ทุก 3 นาที นับจาก anchor
เสา offline          ──► หยุด push
เสา resume อีกครั้ง  ──► RESET anchor = เวลา resume ใหม่ → เริ่มนับ 3 นาทีใหม่
```

### Timeline ตัวอย่าง

```
09:00:00  เสา online (resume)         → 📤 push #1 ทันที + anchor=09:00:00
09:03:00  tick                        → 📤 push #2
09:06:00  tick                        → 📤 push #3
09:07:30  sensor ตาย (ไม่มีค่าใหม่)
09:09:00  tick → ค่าล่าสุดเก่าเกิน     → ⏭️ SKIP (ไม่ส่งค่าเก่าซ้ำ)
09:12:00  tick → ยังไม่มีค่าใหม่       → ⏭️ SKIP
   ⋮
10:15:20  เสากลับ online (resume)      → 🔄 RESET anchor → 📤 push ทันที
10:18:20  tick (นับจาก 10:15:20)      → 📤 push
```

### กติกาตอน tick — เช็ค 3 ข้อก่อนส่ง

| # | เช็ค | ถ้าไม่ผ่าน |
|---|---|---|
| 1 | มีค่า sensor ล่าสุดไหม | skip |
| 2 | ค่าล่าสุด**สดพอ**ไหม (`measuredAt` ไม่เก่ากว่า `freshnessWindow`) | **skip — ห้ามส่งค่าเก่าซ้ำ** |
| 3 | `seq` ต่างจากที่ push ล่าสุดไหม | skip (ไม่มีค่าใหม่ = ไม่ส่งซ้ำ) |

> ⭐ **ข้อ 2–3 มาจากเหตุการณ์จริง (15 ก.ค. 2026):** sensor ตาย 03:33 น. แต่ Pi ยัง online + ยังส่ง `/health` (`outcome:"timeout"`)
> ถ้าไม่มีกติกานี้ ระบบจะ **ส่งค่าเก่า 28°C/87.6% ซ้ำทุก 3 นาทีเป็นวัน ๆ** → ปลายทางเข้าใจผิดว่าข้อมูลปกติ
> ดู [decision-log](../decision-log.md)

### State ที่เก็บต่อเสา

```
{ poleName, anchorAt, nextPushAt, lastPushedSeq, lastPushedAt }
```
- **resume detection:** ผูกกับ pole status เดิม (`lastSeenAt` / MQTT handler `markPoleSeen`) — offline→online = reset anchor
- หลายเสา = **แต่ละเสามี timer ของตัวเอง** ยิงแยก record (ไม่รวม batch)

### Config

| ค่า | default | หมายเหตุ |
|---|---|---|
| `pushIntervalSec` | **180** (3 นาที) | จังหวะ tick |
| `freshnessWindowSec` | **180** | ค่าเก่ากว่านี้ = ไม่ส่ง |
| `pushOnResume` | **true** | ส่ง record แรกทันทีตอน resume |

---

## 5. เหตุผลของดีไซน์ (rationale)

| ตัดสินใจ | ทำไม |
|---|---|
| **`measuredAt` เป็น UTC ISO 8601** | ตรง convention โปรเจค (DB เก็บ UTC) · ไม่กำกวมเรื่อง timezone/DST — ปลายทางแปลง +07 เองได้ · **ห้ามส่ง local time เปล่า ๆ** |
| **แยก `measuredAt` กับ `sentAt`** | ถ้า retry/ค้างใน queue แล้วส่งช้า ปลายทางต้องรู้ว่า **วัดตอนไหน** ไม่ใช่ตอนได้รับ |
| **flat 1 record (ไม่มี `readings[]`)** | requirement คือ 1 push = 1 record เสมอ + **แต่ละเสามี timer แยก** → ไม่ต้องมี array |
| **`metrics` แบบ nested** | เพิ่ม sensor ใหม่ (`pm10`, `noise`, `co2`) ได้โดยไม่ชน field ระดับบน |
| **`metrics` เป็น number ไม่ใช่ string** | ปลายทางคำนวณต่อได้ทันที · ตรงกับ `Decimal.toJSON` → number ของโปรเจค |
| **อนุญาต `null` รายตัว** | sensor อ่านได้บางค่า → ส่งเท่าที่มี ดีกว่าทิ้งทั้ง record |
| **`eventId` + `seq`** | push แบบ at-least-once → ปลายทาง dedup + เรียง + ตรวจข้อมูลขาดได้เอง |
| **anchor จาก resume (ไม่ใช่ clock grid)** | เสาหายแล้วกลับมา → เริ่มนับใหม่ ไม่ยิงรัวชดเชย backlog |
| **skip เมื่อค่าไม่สด** | ปลายทางเห็น "ช่องว่าง" = รู้ว่าเสามีปัญหา — **ดีกว่าได้ค่าเก่าหลอก** |

---

## 6. Reliability (เมื่อ implement)

- **at-least-once + idempotency** (`eventId`) → ปลายทาง dedup
- **retry แบบ exponential backoff** เฉพาะ 5xx/timeout (เช่น 3 ครั้ง)
- **dead-letter** เก็บ record ที่ fail ไว้ replay
- **outbound allowlist** เฉพาะ host ปลายทางที่กำหนด + secret เก็บใน env (ไม่ commit)
- **metrics:** `push_total{endpoint,status}` · `push_latency` · `push_skipped{reason}`

---

## 7. ค้างอยู่ (ต้อง confirm ก่อน implement)

- [ ] **URL ปลายทาง**
- [ ] **วิธี auth** — HMAC signature / Bearer token / mTLS / ไม่มี
- [ ] ยืนยัน interval **3 นาที**
- [ ] ปลายทางรับ `null` ใน metrics ได้ไหม (กรณีอ่านได้บางค่า)

---

## อ้างอิง

- [mqtt-spec.md](../mqtt-spec.md) — topic/payload ที่เสาส่งเข้ามา (ต้นทางข้อมูล)
- [decision-log.md](../decision-log.md) — เหตุการณ์ sensor ตาย 15 ก.ค. (ที่มาของกติกา skip ค่าไม่สด)
- `backend/prisma/schema.prisma` — model `SensorReading` (`time`, `seq`, `pm25`, `temperature`, `humidity`)
