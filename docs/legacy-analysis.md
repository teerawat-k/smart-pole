# Legacy System Analysis

> สำรวจระบบเดิมที่อยู่ใน `project-backup/` — ใช้เป็น reference สำหรับ scope refactor
> ระบบเดิมเขียนโดยจูเนียร์ ฟังก์ชันครบแต่คุณภาพยังไม่ได้มาตรฐาน

---

## 1. Stack เดิม

| Layer | Tech | สถานะหลัง refactor |
|---|---|---|
| Runtime | Node + tsx | → **Bun** |
| Backend framework | Fastify 5 | → **Elysia 1.4** |
| ORM | Prisma 7 + PrismaPg | คงเดิม |
| DB | Postgres 16 | คงเดิม |
| Time-series | InfluxDB 2 | คงเดิม |
| Object storage | MinIO | คงเดิม |
| Streaming | SRS 5 (RTMP + HLS + DVR) | คงเดิม |
| MQTT broker | Mosquitto 2 | คงเดิม |
| Frontend | Next.js 16 + React Query + Tailwind | → เพิ่ม **shadcn/ui + RHF + Zustand** |
| Auth | JWT + bcryptjs + AuthContext (localStorage) | → JWT access/refresh + **argon2id + Zustand persist** |
| Realtime | polling `refetchInterval: 30000` | → **WebSocket invalidation** |
| Captcha | DB-backed text captcha | → image captcha (server render) |
| Validation | manual `if (!field)` | → **Zod / TypeBox schema** |
| Logging | console.log + pino-pretty | → **Pino structured + request id** |
| Testing | ❌ ไม่มี | → **bun test (unit + integration) + Playwright (E2E)** |

---

## 2. Database Schema เดิม

จาก `project-backup/backend/prisma/schema.prisma` มี 9 models:

| Model | Purpose | ปัญหา |
|---|---|---|
| `Page` | master page key + display name | ไม่มี soft-delete, sortOrder คงที่ — ควรเปลี่ยนเป็น `Module` + permission key style `module:action` |
| `Role` | user role | ไม่มี soft-delete, isSystem flag ดี |
| `RolePagePermission` | role × page × (canView/Create/Edit/Delete/Export) | ดีอยู่ แต่จัดการ bulk update แบบ for-loop upsert (ควรใช้ `$transaction`) |
| `User` | username/email/role/lockout | hard delete, ไม่มี `createdBy`/`updatedBy` |
| `Pole` | master เสา + sensor flags + status | `poleStatus` เป็น string ('online'/'offline') ควรเป็น enum, ไม่มี soft-delete |
| `VideoRecording` | DVR file index | ดีพอใช้ แต่ไม่มี audit |
| `Alert` | alert จาก MQTT | severity/alertType เป็น string — ควร enum |
| `SystemLog` | login + action audit | mix login log + audit ใน table เดียว — ควรแยก |
| `CaptchaAttempt` | captcha session | ใช้ได้ แต่ควรย้ายไป Redis |

**ที่ขาดทุก model:** `isActive`, `deletedAt`, `createdBy`, `updatedBy`, `deletedBy` (ตาม convention)

---

## 3. Backend Architecture เดิม

```
src/
├── index.ts              ─ register plugins + routes (single file)
├── startup.ts            ─ migrate + seed ทุกครั้งที่ start (ปัญหา: production ไม่ควร)
├── config/{prisma,influx}.ts
├── plugins/{cors,jwt,cookie}.ts
├── middleware/{authenticate,authorize}.ts
├── routes/               ─ HTTP handler + business logic ปนกัน
│   ├── auth.ts dashboard.ts logs.ts poles.ts profile.ts
│   ├── recordings.ts roles.ts sensors.ts users.ts
└── services/             ─ ไม่มี repository, prisma + business logic ปนกัน
    ├── auth.service.ts pole.service.ts user.service.ts
    ├── role.service.ts log.service.ts mqtt.service.ts
    ├── sensor.service.ts recording.service.ts
```

### ปัญหาเชิง architecture

| # | ปัญหา | ผลกระทบ |
|---|---|---|
| 1 | ไม่มี repository layer | service ผูกกับ Prisma ตรง — mock ยาก |
| 2 | route ทำ validation + call service + format response | route file อ้วน, duplicate logic |
| 3 | MQTT service เรียก `prisma.alert.create` ตรง | ข้าม service layer + ไม่ผ่าน audit |
| 4 | `runStartup()` รัน migrate + seed ทุกครั้ง | ห้ามทำใน production (race condition) |
| 5 | `BigInt.prototype.toJSON = ...` global mutation | side-effect ระดับ runtime |
| 6 | error throw `new Error('POLE_EXISTS')` แล้ว match string | ไม่ type-safe, ไม่มี error code |
| 7 | ไม่มี response envelope | frontend แต่ละหน้า parse format ต่างกัน |
| 8 | `request.user as { id, roleId }` ใช้ `as` ทุกที่ | ไม่ type-safe |
| 9 | ไม่มี Zod/TypeBox schema | accept body อะไรก็ได้ |
| 10 | logger ใช้ Fastify default + console.log ปน | ไม่ structured |

---

## 4. API Endpoints เดิม

| Path | Method | Page | ใช้ permission |
|---|---|---|---|
| `/api/auth/captcha` | GET | - | public |
| `/api/auth/login` | POST | - | public |
| `/api/auth/logout` | POST | - | auth |
| `/api/me` | GET/PATCH | my_profile | auth |
| `/api/me/password` | PATCH | my_profile | auth |
| `/api/users` | GET/POST | user_management | View/Create |
| `/api/users/:id` | GET/PATCH/DELETE | user_management | View/Edit/Delete |
| `/api/users/:id/status` | PATCH | user_management | Edit |
| `/api/pages` | GET | role_permission | View |
| `/api/roles` | GET/POST | role_permission | View/Create |
| `/api/roles/:id` | GET/DELETE | role_permission | View/Delete |
| `/api/roles/:id/permissions` | PUT | role_permission | Edit |
| `/api/poles` | GET/POST | pole_monitor | View/Create |
| `/api/poles/:id` | GET/PATCH/DELETE | pole_monitor | View/Edit/Delete |
| `/api/poles/:poleId/sensor/latest` | GET | dashboard | View |
| `/api/poles/:poleId/sensor/history` | GET | sensor_archive | View |
| `/api/poles/:poleId/recordings` | GET | camera_archive | View |
| `/api/recordings/:id/url` | GET | camera_archive | View |
| `/api/recordings` | POST | - (SRS callback) | auth |
| `/api/recordings/:id` | DELETE | camera_archive | Delete |
| `/api/dashboard/:poleId` | GET | dashboard | View |
| `/api/logs` | GET | system_log | View |
| `/health` | GET | - | public |

### ปัญหาเชิง API
- ❌ ไม่มี `/lookup` ทุก module
- ❌ ไม่มี pagination (`/api/poles`, `/api/users`, `/api/roles`)
- ❌ Response format ไม่สม่ำเสมอ (บางที array, บางที object, บางที `{ data, total }`)
- ❌ ไม่มี request id, ไม่มี rate limit
- ❌ Path ไม่เป็น kebab-case plural (มี `/me` กับ `/users` ปน)

---

## 5. MQTT Service เดิม

### Topic & Payload (ใช้ได้ดี — เก็บไว้)

| Topic | QoS | Payload field |
|---|---|---|
| `smartpole/+/sensor` | 1 | `pole_id, timestamp, pm25, temperature, humidity, seq` |
| `smartpole/+/heartbeat` | 0 | `pole_id, timestamp, status, signal_dbm, uptime_sec` |
| `smartpole/+/alert` | 2 | `pole_id, timestamp, alert_type, value, threshold, message` |

### Offline detection (มีปัญหา)

```ts
const heartbeatTimers = new Map<string, NodeJS.Timeout>()
// ตั้ง setTimeout ใน-memory — restart server = ทุก timer หาย → ทุก pole จะค้าง online
```

**ต้อง refactor:** เก็บ `lastHeartbeatAt` ใน DB + scheduled job (cron / setInterval) check ทุก 1 นาที

### ปัญหาอื่น
- ❌ ไม่ validate payload (parse JSON ตรง)
- ❌ Alert handler เรียก `prisma.alert.create` ตรง (ไม่ผ่าน service)
- ❌ ไม่มี last-will message (broker ไม่รู้ว่า pole disconnect แบบ ungraceful)
- ❌ ไม่มี dead-letter — ถ้า process fail = message หาย
- ❌ ไม่มี backpressure / flush batching (writeApi.flush() ทุก message)

---

## 6. Frontend เดิม

```
app/
├── (main)/
│   ├── layout.tsx           ─ AuthGuard + Sidebar (client component)
│   ├── page.tsx             ─ Dashboard (120 LoC ทำทุกอย่างในไฟล์เดียว)
│   ├── camera/page.tsx      ─ Camera Archive
│   ├── sensor/page.tsx      ─ Sensor Archive
│   ├── poles/page.tsx       ─ Pole Management
│   ├── users/page.tsx       ─ User Management
│   ├── roles/page.tsx       ─ Role & Permission
│   ├── logs/page.tsx        ─ System Log
│   └── profile/page.tsx     ─ My Profile
└── login/page.tsx
components/{Sidebar,Topbar}.tsx
contexts/AuthContext.tsx
lib/api.ts                   ─ axios instance + 401 redirect
```

### ปัญหา
| # | ปัญหา | refactor → |
|---|---|---|
| 1 | Auth ใช้ `localStorage` + Context | Zustand persist + skipHydration |
| 2 | Sidebar `adminOnly: true` hardcode | ใช้ `permissions[]` flag จาก backend |
| 3 | `refetchInterval: 30000` ทุกหน้า | WebSocket invalidate |
| 4 | ทุกหน้าเขียน table + filter เอง | DataTable component + useTableParams |
| 5 | Dialog ทำเอง (ใช้ overlay div) | shadcn Dialog + AlertDialog |
| 6 | Form controlled state ทำเอง | RHF + Zod + AppForm/AppFormField |
| 7 | Tailwind class duplicate ทุกหน้า | extract `Card`/`Button`/`Input` shadcn |
| 8 | `any` ทั่ว (`poles?.map((p: any))`) | type-safe API types จาก backend |
| 9 | combobox feed จาก `useQuery(['poles'])` (list ทั้งหมด) | `useQuery(['pole-lookup'])` ใช้ `/lookup` |
| 10 | กลุ่ม component logic + UI ใน page เดียว | แยก: page (orchestrator) + dialog + table column builder |

---

## 7. Refactor Strategy

### Big-bang vs incremental
**เลือก incremental** — ทำทีละ module ตาม epic, ไม่ทำลายของเก่าทั้งระบบในครั้งเดียว
- ของเก่าอยู่ใน `project-backup/` ไม่แตะ → ใช้ดู behavior อ้างอิง
- ระบบใหม่เขียนตาม atomic pattern จาก epic E00 (Foundation) ขึ้น

### Migration data
- Postgres: schema ใหม่ + migration script ดูดข้อมูลจากของเก่า (ถ้ามีลูกค้าใช้แล้ว)
- InfluxDB: bucket เดิมใช้ต่อได้ — แค่เปลี่ยน writer ให้ผ่าน service layer
- MinIO: bucket เดิมใช้ต่อ
- SRS: config คงเดิม

### Order of work (ดู `planning/PLANNING.md`)
1. **E00 Foundation** — atomic skeleton + auth + RBAC + audit + error
2. **E01 Master data** — User · Role · Pole (CRUD ตาม pattern)
3. **E02 MQTT plugin** — broker connection + topic schema + validate
4. **E03 Heartbeat** — persistent offline detection + alert
5. **E04 Sensor archive** — Influx wrapper + history API
6. **E05 Camera archive** — MinIO + SRS callback + signed URL
7. **E06 Realtime** — WebSocket + Live dashboard
8. **E07 System log + audit log** — แยก concern + RBAC cache
9. **E08 E2E + delivery docs**
