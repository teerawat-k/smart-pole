# E00 · Foundation

> วาง atomic skeleton ของ backend ทั้งระบบ — error class, audit service, plugin core, prisma adapter, request id, health check
> ทุก epic ถัดไป build ทับ epic นี้ — ต้องเสร็จก่อนเริ่มงานอื่น

Priority: 0
Blocked by: —
Status: todo

## Tasks

| Task | ชื่อ | Status |
|------|------|--------|
| T01 | Backend bootstrap — Elysia + env + onError + health | todo |
| T02 | Prisma plugin — adapter + Decimal serialize + singleton | todo |
| T03 | Logger plugin — Pino structured + request id middleware | todo |
| T04 | Error system — AppError + subclasses + ErrorCode catalog | todo |
| T05 | Common schemas — pagination, reorder, password | todo |
| T06 | Common utils — prisma-tx, date helpers, password (argon2id) | todo |
| T07 | Audit service module — atomic log helper | todo |
| T08 | RBAC middleware skeleton — `requirePermission` + cache layer | todo |
| T09 | File storage plugin — buildStoragePath + ensureDir | todo |
| T10 | Module template script — `bun scripts/new-module.ts <name>` | todo |
| T11 | Backend test setup — bunfig + integration helpers | todo |

## Notes

- **ทุก task ต้องส่งมอบพร้อม unit test** — ไม่มี test = ไม่ผ่าน review
- **ห้ามใส่ business logic** ใน epic นี้ — ทุกอย่างต้อง generic ใช้ได้ทุก module
- ทำ E00 เสร็จก่อน → ส่งให้ทีมรีวิว pattern ก่อนเริ่ม E01-onwards
- **ข้อเสนอเสริม:** เพิ่ม T10 (module template script) — generate skeleton 1 module (controller/service/repo/schema/constants/index/test) จากชื่อ → ลด typo, รับประกัน pattern
