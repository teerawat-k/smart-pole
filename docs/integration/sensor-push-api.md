# Sensor Push API — Architecture & Design Spec

> **สถานะ: ออกแบบเสร็จ — ยังไม่ implement** (รอ confirm 4 ข้อท้ายเอกสาร)
>
> Push ข้อมูล sensor (อุณหภูมิ / ความชื้น / PM2.5) จาก **Host → ระบบภายนอก** (one-way)
> ออกแบบเป็น **"มาตรฐานกลาง"** — ใช้ส่งไปหลายระบบได้ (receiver แรก: `www.kaengkhoi.go.th`) จึงเน้น **ความปลอดภัยสูง + ชัดเจน + reuse ได้**

---

## 0. ภาพรวม

| หัวข้อ | ค่า |
|---|---|
| ทิศทาง | Host (backend) → external endpoint (outbound push) |
| Method | `POST` + JSON body |
| จังหวะส่ง | **1 record ทุก 5 นาที ต่อเสา** (snapshot ค่าล่าสุด ณ tick — ไม่ใช่ค่าเฉลี่ย) |
| ที่อยู่โค้ด | TypeScript ใน backend เดิม (Bun + Elysia) — ไม่เพิ่ม service/ภาษาใหม่ |
| ต้นทางข้อมูล | `SensorReading` (มาจาก MQTT `smartpole/<pole>/sensor`) |

> push ยิงจาก **Host** ไม่ใช่จากเสา → **ไม่กิน 4G ของเสา**

---

## 1. Payload & Interval

### 1.1 JSON Payload (flat 1 record — final)

```json
{
  "schemaVersion": "1.0",
  "source": "smart-pole",
  "eventId": "9f1c2b7e-4d3a-4b6e-9c11-8a5e2f0d7b34",
  "sentAt": "2026-08-04T02:35:00.000Z",
  "poleName": "pole-01",
  "measuredAt": "2026-08-04T02:34:12.123Z",
  "seq": 12345,
  "metrics": {
    "temperature": 28.00,
    "humidity": 87.60,
    "pm25": 13.00
  }
}
```

| Field | Type | รูปแบบ | หมายเหตุ |
|---|---|---|---|
| `schemaVersion` | string | `"1.0"` | เปลี่ยนโครงสร้าง/หน่วย → ขึ้นเวอร์ชัน + แจ้ง receiver |
| `source` | string | `"smart-pole"` | ระบุระบบต้นทาง |
| `eventId` | string | UUID v4 | idempotency — receiver dedup ตอน retry |
| `sentAt` | string | UTC ISO 8601 | เวลา tick (ตอนส่ง) |
| `poleName` | string | `"pole-01"` | ชื่อเสา — ตรง MQTT topic + DB |
| `measuredAt` | string | UTC ISO 8601 | **เวลาที่วัดจริง** (เก่ากว่า `sentAt` เล็กน้อย) |
| `seq` | number | int | ลำดับจาก firmware — receiver ตรวจข้อมูลซ้ำ/ขาด |
| `metrics.temperature` | number \| null | 2 ทศนิยม | |
| `metrics.humidity` | number \| null | 2 ทศนิยม | |
| `metrics.pm25` | number \| null | 2 ทศนิยม | |

**หน่วย — ล็อกใน spec (ไม่อยู่ใน payload):** `temperature`=°C · `humidity`=%RH · `pm25`=µg/m³
> เปลี่ยนหน่วย = ขึ้น `schemaVersion` เป็น `"2.0"` + แจ้ง receiver ก่อน

### 1.2 Interval + tick logic

| ค่า | value | เหตุผล |
|---|---|---|
| read interval (firmware) | 60s | เสาอ่านทุก 1 นาที |
| **push interval** | **300s (5 นาที)** | ตามที่กำหนด |
| **freshness window** | **240s (4 นาที)** | reuse `SENSOR_FRESHNESS_MS` (ตัวเดียวกับ dashboard) = ทน 3 misses |

**anchor จาก online ล่าสุด:**
```
เสา resume (online)  → push ทันที + anchor = เวลานั้น
                     → tick ทุก 5 นาที นับจาก anchor
เสา offline          → หยุด push
เสา resume อีกครั้ง  → RESET anchor → เริ่มนับใหม่ + push ทันที
```

**ทุก tick เช็ค 3 ข้อก่อนส่ง (กันค่าผี):**
| # | เช็ค | ถ้าไม่ผ่าน |
|---|---|---|
| 1 | มีค่า sensor ล่าสุดไหม | skip `no-data` |
| 2 | `measuredAt` สด < 4 นาที | **skip `stale`** (sensor ไม่ทำงาน) |
| 3 | `seq` ต่างจากที่ push ล่าสุด | skip `no-new` |

> **1 slot 5 นาที = "มีข้อมูล" หรือ "ช่องว่างที่ documented"** — ไม่มีค่าเก่าหลอก (บทเรียนจากเหตุ sensor ตายเงียบ 15 ก.ค. — ดู [decision-log](../decision-log.md))

---

## 2. Security — One-way Push Standard

ออกแบบ **layered + asymmetric signature** เพราะจะส่งไป **หลายระบบ** → shared secret (HMAC) ไม่เหมาะ (leak ที่ receiver ใดกระทบทั้งหมด / ปลอมข้อความเราได้)

### 2.1 ชั้นความปลอดภัย (baseline — บังคับทุก receiver)

| ชั้น | กลไก | ป้องกัน |
|---|---|---|
| **Transport** | HTTPS **TLS 1.2+** + verify cert ปลายทาง (ห้าม skip) | ดักฟัง / MITM |
| **Authenticity + Integrity** | **Ed25519 detached signature** — เซ็นด้วย **private key** เรา, receiver verify ด้วย **public key** | ปลอมตัว + แก้ payload |
| **Replay** | `X-Timestamp` + เซ็นรวม timestamp + receiver reject ถ้าเก่ากว่า **±5 นาที** | ดักแล้วยิงซ้ำ |
| **Idempotency** | `eventId` (UUID v4) → receiver dedup | นับซ้ำตอน retry |

### 2.2 ทำไม Ed25519 (asymmetric) ไม่ใช่ HMAC

| | HMAC (shared secret) | **Ed25519 (แนะนำ)** |
|---|---|---|
| หลาย receiver | secret ต่อ receiver / ใช้ร่วม = เสี่ยง | **1 private key เรา · แจก public key** |
| receiver โดน compromise | **ปลอมข้อความเราได้** (มี secret) | **ปลอมไม่ได้** (มีแค่ public key) |
| ขนาด sig | 32 bytes | 64 bytes (เล็ก, เร็ว) |
| เหมาะกับ "standard กลาง" | ปานกลาง | ✅ ใช่ |

### 2.3 Headers (contract)

```http
POST /<endpoint> HTTP/1.1
Content-Type: application/json
X-SmartPole-Key-Id:     spole-2026            ← ระบุ public key ตัวไหน (รองรับ rotate)
X-SmartPole-Timestamp:  1785807300            ← unix seconds
X-SmartPole-Signature:  ed25519=<base64 ของ sign(timestamp + "." + rawBody)>
X-SmartPole-Event-Id:   9f1c2b7e-...
```

**signing string:** `<timestamp> + "." + <raw JSON body>` → sign ด้วย Ed25519 private key → base64

### 2.4 Receiver ต้องทำ (เอกสาร standard สำหรับผู้รับ)

1. TLS ✓
2. ตรวจ `X-Timestamp` — reject ถ้าเก่ากว่า ±5 นาที
3. **verify `X-Signature`** ด้วย public key ของเรา (เลือกตาม `X-Key-Id`) บน `timestamp + "." + body`
4. **dedup `eventId`** — เก็บ id ที่รับแล้ว
5. validate schema (field/type/หน่วย)
6. ตอบ HTTP: **2xx** สำเร็จ · **4xx** ผิดฝั่งเรา (ไม่ต้อง retry) · **5xx** ให้ retry
7. ตอบเร็ว < timeout (รับแล้วประมวลผล async)
8. (เสริม) IP allowlist รับเฉพาะ host/CF ของเรา · body size limit · rate limit

### 2.5 Key management (ฝั่งเรา)

- private key ใน **env/secret store** (perms 600, ไม่ commit) · publish public key ให้ receiver (+ hosted URL เผื่อ auto-fetch)
- **rotation:** `Key-Id` versioned → หมุน key โดยไม่ break (publish key ใหม่ + overlap ก่อนถอนเก่า)
- **per-receiver config:** endpoint URL · (option) IP allowlist ฝั่งเขา · (option) mTLS
- **outbound allowlist ฝั่งเรา** — POST ได้เฉพาะ host ที่กำหนด (SSRF prevention)

### 2.6 เสริม (receiver ที่ต้องเข้มพิเศษ เช่น .go.th)

- **mTLS** (client cert เรา → receiver verify) — assurance สูงสุด
- **IP allowlist** ฝั่ง receiver — รับเฉพาะ IP/Cloudflare ของเรา

---

## 3. Failure Handling (host down / เสา down / sensor down)

### หลักการ
> **"ไม่มีข้อมูลจริง = ช่องว่าง ไม่ใช่ค่าปลอม"** + **"ไม่สูญข้อมูลที่เก็บได้แล้ว"**

### 3.1 Matrix

| เคส | เกิดอะไร | พฤติกรรม push | receiver เห็น |
|---|---|---|---|
| **sensor ไม่ทำงาน** (เสา up) | ไม่มี reading ใหม่ | freshness gate → **skip** | ช่องว่าง (gap) |
| **เสา down** (ไม่มี MQTT) | reading stale | **skip** · resume + reset anchor เมื่อเสากลับ | gap แล้วต่อ |
| **receiver down** (host up) | push fail (5xx/timeout) | **retry backoff 3 ครั้ง** → ยัง fail → **outbox** | ได้ครบเมื่อ receiver กลับ (backfill) |
| **host/backend down** | pusher ไม่ทำงาน + **ข้อมูลช่วงนั้นหายที่ต้นทาง** (firmware เสา drop ตอน MQTT หลุด) | หยุด push · **resume จาก state ใน DB** เมื่อ host กลับ | gap ช่วง host down (ข้อมูลไม่มีจริง) |
| **DB down** (backend up) | อ่าน reading ไม่ได้ | skip จนกว่า DB กลับ | gap ชั่วคราว |

### 3.2 กลไกความทนทาน 3 ตัว

1. **State ใน DB** (`lastPushedSeq`, `lastPushedAt`, `anchorAt` ต่อ pole+receiver) → **รอด host restart** (ไม่ push ซ้ำ/ผิดตอน recover)
2. **Outbox + retry** (receiver down) — เพราะ **ข้อมูลอยู่ใน `SensorReading` แล้ว ไม่หาย** → **backfill snapshot จริงจาก DB** ตอน receiver กลับ (cap เช่น 1 ชม.ล่าสุด กัน flood)
3. **Heartbeat แยก (option)** — push สถานะ "pusher alive" ความถี่ต่ำ → receiver **แยกได้ว่า "เสา offline" (มี heartbeat แต่ไม่มี data) vs "host/network offline" (ไม่มี heartbeat เลย)**

### 3.3 จุดสำคัญของ "host down"

- ข้อมูล sensor **ช่วง host down = หายที่ต้นทางจริง** — firmware เสาปัจจุบัน **drop reading ตอน publish ไม่ได้** (ไม่ buffer) → **ไม่มีอะไรให้ backfill** → gap ถูกต้อง
- **ถ้าต้องการห้ามหายแม้ host down** → ต้องแก้ **firmware เสาให้ buffer + replay** (นอก scope งาน push — เป็น enhancement + **แตะเสา**)
- host กลับมา → scheduler อ่าน state จาก DB → resume ต่อ (ไม่ซ้ำ ไม่ข้าม)

### 3.4 Reliability & Backpressure — Circuit Breaker + Load Protection

> ป้องกัน "receiver ล่มนาน → retry สะสม → load กลับมาที่ host"

**ชั้นที่ 1 — Bounded retry (ต่อ push):**
- retry **สูงสุด 3 ครั้ง** + exponential backoff (เช่น 2s → 10s → 30s) · เกินนั้น → dead-letter (log) แล้วไปต่อ
- **timeout ต่อ request** (เช่น 10s) — receiver ค้าง → ไม่ผูก connection ค้าง

**ชั้นที่ 2 — Circuit Breaker (ต่อ receiver) ⭐ ตัวหลักกัน load:**
```
CLOSED (ปกติ) ──ล้มเหลวติดกัน N ครั้ง (เช่น 5)──► OPEN
OPEN (ตัดวงจร) ── หยุดยิงเลย cooldown (เช่น 10 นาที) = ไม่มี load ──►
     └── ครบ cooldown → HALF-OPEN (ยิง probe 1 ครั้ง)
                          ├─ สำเร็จ → CLOSED (resume)
                          └─ ล้ม   → OPEN อีก (cooldown ใหม่)
```
- **circuit เป็น "ต่อ receiver" ไม่ใช่ "ต่อเสา"** → 100 เสายิง receiver เดียวที่ล่ม = circuit เดียวตัดหมด → เหลือ ~1 probe/cooldown รวม (ไม่ใช่ 100×)

**ชั้นที่ 3 — Structural (กัน load เชิงโครงสร้าง):**
| กลไก | กัน |
|---|---|
| **Snapshot semantics** | push = ค่าล่าสุดทุก tick ไม่ใช่ queue ทุก record → **ไม่มี backlog สะสม** |
| **Concurrency limit** (worker pool 5–10) | หลายเสายิงพร้อมกัน → connection ไม่บาน |
| **Outbox cap / TTL** (backfill ≤ 1 ชม.) | receiver กลับมา → ไม่ flood ย้อนหลัง |
| **Fire-and-forget จาก scheduler** (async) | retry ไม่ block ingest / งานหลัก |

**Load math:** receiver ล่มนาน → circuit เปิด → เหลือ **~6 probe/ชม. รวมต่อ receiver** (1 ต่อ 10 นาที) = load ≈ 0

> **หมายเหตุถึง receiver:** ถ้าตัวเอง overload ควรตอบ **5xx** (ไม่ใช่ปล่อย timeout) → host จะ backoff/เปิด circuit ให้เร็วขึ้น = ช่วยกันภาระ 2 ฝั่ง

---

## 4. Architecture (backend — ตาม convention)

```
scheduler (tick ทุก 60s — เช็ค nextPushAt ต่อ pole+receiver)
  └─ sensorPushService.tick(pole, receiver)          orchestrator
       ├─ getFreshReading(poleId)      atom  ← reuse freshness gate (findLatest)
       ├─ shouldPush(reading, state)   atom  (pure: skip stale/dup/no-data)
       ├─ buildPayload()               atom
       ├─ signPayload(privKey, ts, body)  atom  (Ed25519)
       ├─ postToReceiver(url, headers, body) atom (+ retry/backoff/timeout)
       └─ recordDelivery / outbox()    atom  (update state + metric + audit)
```

- โมดูล `src/modules/sensor-push/` (controller admin จัดการ subscription/status + service + flow atoms + repository)
- **config (env, Zod):** `SENSOR_PUSH_ENABLED` · private key · interval · freshness (reuse constant)
- **DB:** `PushSubscription` (receiver config) + `PushState` + `PushOutbox`
- **metrics:** `push_total{receiver,status}` · `push_skipped{reason}` · `push_latency` · `push_outbox_size`
- **atomic + fire-and-forget** จาก scheduler · ไม่ block ingest

---

## 5. Testing (แผน — ทำตอน implement)

| ชั้น | ทดสอบ | เครื่องมือ |
|---|---|---|
| Unit | `shouldPush` ทุกเคส · `buildPayload` shape · `signPayload` (verify กลับ) | `bun test` + mock |
| Integration | ยิงเข้า **mock receiver** → verify signature + schema | Bun HTTP server |
| Failure | receiver 500/timeout → retry+outbox · host restart → resume จาก state | mock |
| Freshness | ชี้ sensor ที่ stale → skip | staging |
| Staging | ชี้ endpoint ไป **webhook.site** → ดู payload + headers สด | webhook.site |
| Canary | เปิดเฉพาะ pole-01 → verify → ขยาย | flag |

---

## 6. สรุปที่ตัดสินแล้ว vs ยังเปิด

**ตัดสินแล้ว:** flat payload · interval 5 นาที · freshness 4 นาที (reuse) · **Ed25519 asymmetric** · timestamp + eventId · gap-not-fake · state ใน DB · outbox + backfill จาก DB

**ยังต้อง confirm ก่อน implement:**
1. **Endpoint URL** ของ kaengkhoi + เขารับ **Ed25519** ไหม (หรือบังคับ HMAC / mTLS)
2. **Backfill** — resume เฉย ๆ หรือ backfill จาก DB ตอน receiver กลับ (cap เท่าไหร่)
3. **Heartbeat แยก** — ทำไหม (ช่วย receiver แยก pole-down / host-down)
4. **แก้ firmware เสาให้ buffer** ตอน host down — ทำ (กันหายทุกกรณี, แตะเสา) หรือยอม gap

---

## อ้างอิง
- [mqtt-spec.md](../mqtt-spec.md) — topic/payload ที่เสาส่งเข้ามา (ต้นทางข้อมูล)
- [decision-log.md](../decision-log.md) — เหตุ sensor ตายเงียบ 15 ก.ค. (ที่มาของ freshness gate)
- `backend/src/modules/sensor-reading/sensor-reading.constants.ts` — `SENSOR_FRESHNESS_MS` (reuse)
- `backend/prisma/schema.prisma` — model `SensorReading`
- [domain-ssl-setup.md](../deployment/domain-ssl-setup.md) — domain/HTTPS ที่รองรับ push
