# Backend Convention

Stack: Bun + Elysia (latest) + Prisma (latest, PrismaPg adapter) + PostgreSQL 18 + TimescaleDB + Mosquitto MQTT 5 + SRS + Pino

---

## Layer Architecture

```
Controller → Service → Repository → Prisma → DB
```

| Layer | หน้าที่ | เมื่อเจอปัญหา |
|---|---|---|
| Controller | validate input, เรียก service, return response | ไม่ต้อง try/catch |
| Service | business logic (orchestrator delegate flow/ atoms) | throw `AppError` |
| Repository | Prisma queries เท่านั้น | return `null` |

- ห้าม business logic ใน controller, ห้าม Prisma ใน service (ยกเว้น `reorderRecord()`), ห้าม throw ใน repository
- **Service-to-Service:** import ผ่าน `@/modules/<name>` (ห้าม import repo) — fire-and-forget (notification, audit, WebSocket) ไม่ต้อง await

---

## Module Structure (Atomic-first)

### Default — แต่ละประเภทมีไฟล์เดียว

```
src/modules/<name>/
├── <name>.controller.ts
├── <name>.service.ts          # orchestrator
├── <name>.repository.ts
├── <name>.schema.ts
├── <name>.constants.ts
├── <name>.service.test.ts
└── index.ts                   # export controller + service เท่านั้น (ห้าม export repository)
```

### When a type has multiple files → split per type into folder

ถ้าประเภทไหนมีไฟล์ **มากกว่า 1** → ย้ายเข้า folder ของ type นั้น (ประเภทที่ยังมีไฟล์เดียวคงอยู่ root):

```
src/modules/<name>/
├── controllers/             # มี > 1 controller (เช่น public + admin)
├── services/                # มี > 1 service file (orchestrator + sub-services)
├── flow/                    # business logic atoms — แยกตาม concern
│   ├── notify.ts            # ⭐ leaf — รวม notifier + metadata builder + invalidate helpers
│   ├── enrich.ts
│   ├── list.ts
│   ├── create.ts / update.ts / cancel.ts / ...
│   └── *.test.ts            # 1 atom 1 test file
├── shared/                  # helpers ใช้ภายในโมดูล
│   ├── helpers.ts           # isRecord, toRecord, trunc2, parseOptionalDate
│   └── invalidate.ts
├── repositories/
├── schemas/
├── tests/
│   ├── unit/
│   └── integration/
├── <name>.repository.ts     # ยังเหลือไฟล์เดียว → คงไว้ root
├── <name>.constants.ts
└── index.ts
```

**กฎ:**
- Folder per type สร้างเฉพาะ type ที่มี > 1 ไฟล์
- `index.ts` ของ module export เฉพาะ entry point
- Sub-folders **ห้าม import กันข้ามโฟลเดอร์** — service เป็นจุดเดียวที่ compose
- ทุก function ใน `flow/` รับ `tx?: PrismaTx` parameter + return explicit type

### Large module triggers split

- **> 500 LoC ในไฟล์เดียว:** ต้องแยก
- **≥ 3 distinct concerns:** ต้องแยกเป็น `flow/` หรือ sub-services
- **Service ที่มีหลาย workflow:** แยกเป็น `services/` หรือ `flow/`

---

## Atomic Refactor Pattern

มาตรฐานสำหรับ module ที่ > 500 LoC หรือ ≥ 3 concerns

### โครงสร้างมาตรฐาน

```
src/modules/<name>/
├── <name>.service.ts             # orchestrator/facade (~100 LoC) — delegate flow/ ทั้งหมด
├── <name>.repository.ts
├── <name>.controller.ts
├── <name>.schema.ts
├── <name>.constants.ts
├── shared/
│   ├── helpers.ts
│   └── invalidate.ts
└── flow/
    ├── notify.ts                 # ⭐ leaf
    ├── enrich.ts
    ├── list.ts
    ├── create.ts / update.ts / cancel.ts / ...
    ├── effects/
    │   ├── notify-new.ts
    │   └── notify-completed.ts
    └── *.test.ts
```

### กฎ orchestrator (`<name>.service.ts`)

- **ห้ามมี business logic** — ทุก method delegate `return flowFn(...)`
- **Read-only thin methods** (1-3 บรรทัด: passthrough repo) อยู่ inline ได้
- **Mutation ใหญ่** (มี side-effect: DB write + audit + notify + WS) — แยก flow file เสมอ

### กฎ Cross-flow Dependency

- **`flow/notify.ts` เป็น leaf เสมอ** — ตัด cycle
- **`shared/` ห้าม import จาก `flow/`**
- **`flow/<mutation>.ts` ห้าม import กันเอง** — orchestrator compose
- **กรณี atom ต้องเรียก orchestrator-level logic:** atom return flag/result ให้ orchestrator handle
- **atom ที่มี side-effect ต้องแยกจาก atom file ที่มี test pure**

### กฎ atom file (`flow/*.ts`)

- ทุก atom function รับ `tx?: PrismaTx` + return explicit type
- มี comment header อธิบาย concern + step ที่ compose
- ห้าม import `auditService.log` กับ `broadcastToAll` ตรง ๆ — ผ่าน `flow/notify.ts` หรือ `shared/invalidate.ts`

### Pattern ลด Magic String

```ts
export const <MODULE>_ENTITY = "<entity-name>" as const;
export const <MODULE>_QUERY_KEY = "<query-key>" as const;
export const <Module>NotificationType = {
  SUBMITTED: "<module>_submitted",
  APPROVED:  "<module>_approved",
} as const;
```

### Trigger ที่ต้องแยก flow

- ฟังก์ชัน > 80 LoC, side-effect ≥ 3 ตัว → แยก flow file
- ≥ 6 notification helpers ใน 1 file → แยก `effects/`
- ≥ 2 helper ที่ใช้ใน flow ≥ 2 ที่ → ย้าย `shared/`

---

## Performance Optimization Patterns

ใช้กับ flow file ที่มี independent ops — **ทำหลัง atomic เสร็จเท่านั้น**

### Promise.all สำหรับ Independent Reads

```ts
const [a, b, c] = await Promise.all([
  repo.findA(id),
  repo.findB(id),
  repo.findC(id),
]);
```

### Promise.all สำหรับ Independent Writes (รวมใน Transaction)

```ts
await Promise.all([
  repo.markStatus(id, statusId, tx),
  childService.supersedeRelated(id, tx),
]);
```

**ห้าม parallel writes ที่:** target row เดียวกัน, B ต้องอ่าน state หลัง A เสร็จ, มี optimistic lock check ระหว่าง

### Phase Pattern

```ts
export async function <mutationFn>(input, userId) {
  // Phase 1: validate (sequential — fail-fast)
  // Phase 2: parallel reads (meta data)
  // Phase 3: create main record (รอ id)
  // Phase 4: parallel enrich snapshots
  // Phase 5: parallel children writes
  // Phase 6: audit + WS (fire-and-forget — ห้าม await)
}
```

### Repo Function แบบ Batch

ถ้า service ใช้ for-loop ของ repo function เดี่ยว → เพิ่ม batch repo function ที่ dedupe ภายใน

### กฎเด็ดขาด — ห้ามทำ

- **ห้าม Promise.all ระหว่าง entries ที่ trigger callback ตามลำดับ**
- **ห้าม parallel writes ใน tx ที่มี optimistic lock**
- **ห้าม optimize ก่อน atomic ทำเสร็จ**

### Checkpoint หลัง Optimize

1. `bunx tsc --noEmit -p backend` ต้อง 0 errors
2. รัน unit test ของ module นั้น (รันแยกไฟล์ตามนโยบาย mock.module leak)
3. Behavior identical — ห้ามแก้ test assertion ตามค่าใหม่ ถ้าแก้ = behavior เปลี่ยน → revert

---

## Naming

| สิ่งที่ตั้ง | รูปแบบ |
|---|---|
| Repo fn | `findMany`, `findById`, `findBy<Field>`, `create`, `update`, `softDelete` |
| Service fn | `list`, `getById`, `create`, `update`, `delete` |
| Schema | `<entity><Action>Schema` |
| SELECT | `<ENTITY>_SELECT`, `<ENTITY>_LOOKUP_SELECT` |
| Constants | PascalCase `as const` → derived type `<Name>Value` |
| Test | `describe("<service>.<function>")`, `test("กริยา + กรรม + เงื่อนไข")` ภาษาไทยเป็นทางการ |

---

## Environment

- ทุก env validate ผ่าน Zod ใน `config/env.ts` — ห้าม `process.env` โดยตรง

---

## Prisma

### Table Naming Convention

- **ห้ามใช้ `@@map`** — table name ตรงกับ Prisma model name (PascalCase) ทุกตัว
- migration SQL ใช้ PascalCase ตาม model name (`"Pole"`, `"User"`, `"SensorReading"` ฯลฯ)

### Model Convention — ทุก master model ต้องมี

`order Int @default(0)` (ถ้ามี DnD), `deletedAt DateTime?`, `deletedBy Int?`, `createdBy Int`, `updatedBy Int?`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`

> **ห้ามมี `isActive` field** — ใช้ soft delete (`deletedAt`) อย่างเดียว
> "ปิดใช้งานชั่วคราว" → ใช้ status enum เฉพาะกิจ (เช่น `User.status = active|disabled|locked`)

### Time-series (sensor hypertable) — ใช้ pattern ต่างจาก master

```prisma
// 1 sensor type = 1 table (TimescaleDB hypertable)
model Sensor<Type> {
  time       DateTime
  poleId     Int
  seq        BigInt
  // sensor-specific fields
  rawJson    Json?
  ingestedAt DateTime @default(now())
  @@id([time, poleId])
  @@index([poleId, time(sort: Desc)])
}
```
- ไม่มี soft delete (time-series เก็บตาม retention policy)
- ไม่มี audit fields (ใช้ `seq` + `ingestedAt`)
- migration custom SQL: `create_hypertable(...)`

### กฎ

- ทุก query ของ master model ต้องมี `deletedAt: null` — ห้าม `prisma.foo.delete()`
- ห้าม query ใน loop, `$transaction` สำหรับ findMany+count, `upsert` ใน seed
- **Prisma (latest):** adapter เสมอ, pool config บน `pg.Pool`, singleton PrismaClient
- **TimescaleDB:** hypertable + continuous aggregate ผ่าน custom migration SQL

### Index Strategy

| ต้องมี Index | เหตุผล |
|---|---|
| FK ทุกตัว | JOIN — Prisma ไม่สร้างอัตโนมัติ |
| `deletedAt` | ทุก query filter |
| `code` / unique ที่ search | search + dup check |
| `createdAt` | ORDER BY |

### Migration

- ชื่อ: `{action}_{target}_{detail}`, `migrate dev` เฉพาะ dev, `migrate deploy` บน production
- ห้ามแก้ migration ที่ commit แล้ว
- Dev workflow: schema → `prisma db push` (dev) → feature เสร็จ → `prisma migrate dev --name <name>` → commit → deploy รัน `prisma migrate deploy`

### Migration Safety (Zero-Downtime)

| Safe | Dangerous (ต้อง 2 steps) |
|---|---|
| เพิ่ม column nullable/มี default | Rename → เพิ่มใหม่+copy → ลบเก่า |
| เพิ่ม table / index | Remove → code หยุดใช้ → ลบ |
| เพิ่ม nullable relation | Change type → column ใหม่+migrate → ลบเก่า |
|  | Add NOT NULL → nullable+backfill → ALTER |

---

## Elysia Patterns

- ห้ามหลุด method chain (type inference เสีย), `derive({ as: "scoped" })`, `guard()` เฉพาะ `beforeHandle`/`schema`
- Lifecycle: onRequest → onParse → onTransform → derive → resolve → beforeHandle → handler → afterHandle → onResponse

---

## API Conventions

### Standard CRUD

| Method | Path | หน้าที่ |
|---|---|---|
| GET | `/` | list (paginated) — ตารางหลัก |
| GET | `/lookup` | **combobox เท่านั้น** — auth, id + label, ไม่ paginate, ทุก module ต้องมี |
| GET | `/:id` | detail |
| POST | `/` | create |
| PATCH | `/:id` | update |
| DELETE | `/:id` | soft delete |
| PATCH | `/:id/status` | เปลี่ยน status enum (เฉพาะ module ที่มี — เช่น user.status) |
| PATCH | `/reorder` | DnD (`{ id, order }`) |
| POST | `/:id/approve\|reject\|cancel\|transition` | workflow action |

> **ไม่มี `/:id/toggle-active`** — โปรเจคนี้ไม่มี `isActive`; ใช้ `DELETE` (soft) หรือ `PATCH /:id/status` แทน

- Prefix: kebab-case plural (`/branches`, `/sale-orders`)
- 1 endpoint = 1 responsibility
- Reorder: ใช้ `reorderRecord()` จาก `@/common/utils/reorder` + `reorderSchema` จาก `@/common/schemas/reorder`
- Bulk: `/bulk-delete`, `/bulk-update-status` — Body: `{ ids: number[] }`
- **`GET /lookup` บังคับทุก module**

### Response Format

| Action | Format |
|---|---|
| GET single | `{ success, data }` |
| GET list | `{ success, data, total, page, limit }` |
| Mutation | `{ success, message }` |
| Error | `{ success: false, code, message, requestId }` |

### Pagination

- `page` default 1, `limit` default 20 max 100 — ใช้ `paginationQuery` จาก `@/common/schemas/pagination`
- sortBy: whitelist map เท่านั้น

---

## Auth & RBAC

- JWT: `{ sub: number, role: string, tokenVersion, iat, exp }` — 1 user = 1 role, userId จาก JWT เสมอ
- Permission: `module:action`, cached per role 60s, admin role bypass
- Helper อยู่ที่ [common/middleware/require-permission.ts](src/common/middleware/require-permission.ts) — มี 2 ฟังก์ชัน

### Controller pattern

```ts
import { authGuard } from "@/plugins/jwt";
import { requirePermission, hasPermission } from "@/common/middleware/require-permission";

export const fooController = new Elysia({ prefix: "/api/foos" })
  .use(authGuard)                                                  // ทุก route ต้อง login
  .get("/", async ({ query, user }) => {
    const result = await fooService.list(query);
    // enrich list — ห้ามให้ frontend คำนวณ flag เอง
    const [canEdit, canDelete] = await Promise.all([
      hasPermission(user, "foo:edit"),
      hasPermission(user, "foo:delete"),
    ]);
    const data = result.data.map((it) => ({ ...it, canEdit, canDelete }));
    return { success: true, data, total: result.total };
  }, { beforeHandle: requirePermission("foo:view") })             // ใช้ requirePermission ใน beforeHandle
  .get("/lookup", async () => /* ... */)                            // ⚠️ /lookup auth-only (ห้ามใส่ permission)
  .post("/", handler, { beforeHandle: requirePermission("foo:create") })
  .patch("/:id", handler, { beforeHandle: requirePermission("foo:edit") })
  .delete("/:id", handler, { beforeHandle: requirePermission("foo:delete") });
```

### `requirePermission()` vs `hasPermission()`

| ฟังก์ชัน | คืนค่า | ใช้เมื่อ |
|---|---|---|
| `requirePermission(...perms)` | throws `ForbiddenError` ถ้าไม่มี | `beforeHandle` ของ route ที่ต้อง gate |
| `hasPermission(user, perm)` | `Promise<boolean>` | enrich list response ด้วย `canEdit`/`canDelete` flags |

### `/lookup` endpoint
- auth เท่านั้น (ห้ามใส่ `requirePermission`) — combobox ใช้ใน dialog หลายๆ ที่ ผู้ใช้ทุก role ต้อง access

### Public file streaming (camera-clip `/stream`)
- public route — browser `<video src>` ไม่ส่ง Authorization header
- defense-in-depth: list endpoint (`/clips`) ต้อง auth → ผู้ใช้ไม่มี enumerate path; path validation regex กัน traversal
- production: upgrade เป็น signed URL (issue 1-hour token ผ่าน `/clips` response)

### Cache invalidation
```ts
import { invalidatePermissionCache } from "@/common/middleware/require-permission";
// เมื่อ admin แก้ permissions ของ role ผ่าน UI → ต้อง invalidate
invalidatePermissionCache(roleName);
```

---

## Audit Log

- `auditService.log()` fire-and-forget ใน **service** หลัง mutation — ห้าม await, ห้ามใน controller/repo
- Action: `CREATE` `UPDATE` `DELETE` `STATUS_CHANGE` `REORDER` `SUBMIT` `APPROVE` `REJECT` `CANCEL` `TRANSITION` `UPDATE_<FIELD>`

---

## Error & Logging

- `AppError(statusCode, code, message)` — message ภาษาไทย, code จาก `ErrorCode` constant (`MODULE-NNN`)
- Subclasses: `NotFoundError`, `DuplicateError`, `ValidationError`, `ForbiddenError`, `ConflictError`, `RateLimitError`
- Pino: info/warn/error, production ≥ warn, context `{ err, userId, path, method }` — ห้าม log password/token, ห้าม `console.log`

---

## File Storage

- Path: `uploads/{module}/{year}/{month}/{id}-{timestamp}-{sanitized-name}.ext`
- เก็บ relative path ใน DB, serve ผ่าน static plugin, soft delete ไม่ลบไฟล์จริง

## WebSocket

- JWT auth, in-memory `Map<userId, Set<WsLike>>`, push เท่านั้น
- Cache invalidation: `sendInvalidate(userIds, entity)` หลัง mutation

---

## Transaction Pattern

| สถานการณ์ | วิธี |
|---|---|
| create parent + children | `$transaction([...])` |
| read-then-write (optimistic lock) | interactive `$transaction(async (tx) => {})` |
| findMany + count | `$transaction([findMany, count])` |
| audit, notification, WebSocket | **ห้ามอยู่ใน tx** — fire-and-forget หลัง commit |

- Timeout: default 5s, ห้าม nested transaction — ส่ง `tx` เป็น parameter แทน
- Repo function ที่ใช้ทั้งใน/นอก tx → รับ `tx?: PrismaTransactionClient` ใช้ `(tx ?? prisma)`

---

## Soft Delete Cascade

| Relationship | เมื่อ soft delete parent |
|---|---|
| **Composition** | ✅ cascade — ใน transaction เดียว, leaf→parent |
| **Aggregation** | ❌ set FK null หรือปล่อย |
| **Reference** (audit/log) | ❌ เก็บไว้ |

- Cascade logic ใน **service ของ parent** — ห้ามใน repository

---

## Bulk Operation Limits

- `ids` array: `t.Array(t.Number(), { minItems: 1, maxItems: 100 })` — all-or-nothing ด้วย `$transaction`
- Partial success (import): return `{ succeeded, failed, errors }`

---

## Search / Filter Sanitization

- `search`: `t.String({ maxLength: 200 })` + trim, `sortBy`: `t.Union` whitelist, `sortOrder`: `asc`|`desc`
- **ห้าม user input เป็น field name / orderBy key ตรง**

---

## Rate Limiting

| Endpoint | Strategy | Limit |
|---|---|---|
| `POST /auth/login\|refresh` | per IP | 10-20 req/min |
| Mutation | per user | 60 req/min |
| GET | per user | 200 req/min |

---

## Security

- CORS: จำกัด domain (ห้าม `*`), ทุก endpoint ต้องมี TypeBox schema, ห้าม raw query

### Password & Secret

| เรื่อง | มาตรฐาน |
|---|---|
| Password hash | `argon2id` หรือ `bcrypt` cost ≥ 10 — ห้าม MD5/SHA |
| JWT secret | ≥ 256-bit random ใน `.env` |
| Refresh token | random ≥ 32 bytes + SHA-256 hash ใน DB |
| Token expiry | Access: 15-60 min, Refresh: 7-30 days |
| Password compare | `argon2.verify`/`bcrypt.compare()` — ห้าม `===` |

### File Upload Validation

- Whitelist MIME per module (image: jpeg/png/webp ≤ 5MB, PDF ≤ 20MB, Excel ≤ 10MB)
- ตรวจ magic bytes, sanitize filename, serve `Content-Disposition: attachment`

### XSS Prevention

- ห้าม `dangerouslySetInnerHTML`, backend strip HTML tags จาก text input
- URL field: อนุญาตเฉพาะ `https://` `http://`
- Production: `Content-Security-Policy: default-src 'self'`

---

## Idempotency Key

**POST เกี่ยวกับเงิน ต้องรับ `X-Idempotency-Key` (UUID v4)** — ตรวจ key ใน DB → ถ้ามี return ผลเดิม

---

## Request ID

- Generate UUID ที่ `onRequest` middleware → แนบทุก log → ส่งกลับ header `X-Request-Id` + error body

---

## Health Check

| Endpoint | ตรวจ |
|---|---|
| `GET /health` | app running — ไม่ต้อง auth |
| `GET /health/ready` | DB connected |

- **Graceful shutdown:** SIGTERM → stop accepting → drain (30s) → close DB+WS → exit

---

## Cache Headers

| Endpoint | Cache-Control |
|---|---|
| `GET /lookup` | `private, max-age=300` |
| `GET /` / `GET /:id` | `private, no-cache` |
| Mutation | `no-store` |
| Static (uploads) | `public, max-age=31536000, immutable` |

---

## Testing

### Unit Test (`<name>.service.test.ts`)

- test file อยู่ข้างๆ source file, description **ภาษาไทยเป็นทางการ** "กริยา + กรรม + เงื่อนไข"
- ห้ามภาษาไม่เป็นทางการ — ใช้: ส่งคืน, สร้าง, แก้ไข, ลบ, สลับสถานะ, กรองรายการ
- Mock repository ด้วย `mock.module()` (top-level) — ห้าม mock service

### Integration Test (`<name>.integration.test.ts`)

ต่อ PostgreSQL จริง — `TEST_PREFIX` ทุก test data, `afterAll` cleanup (ห้าม `afterEach` — deadlock)

```bash
bun test src/modules/foo/foo.service.test.ts
bun test src/modules/foo/foo.integration.test.ts
```

---

## Type Safety

- ห้าม `as` ใน service/controller — `as const` อนุญาต
- ทุก exported function ใน service/repo ต้องมี explicit return type
- JSON/unknown data: ใช้ `isRecord()` type guard

---

## Seeder

- Idempotent, model มี `@unique` → `upsert`, ไม่มี → `findFirst` + create guard
- ลำดับ seed-runner: parent → child (FK), filter `deletedAt: null` ทุก query (ไม่มี `isActive`)
