# E03 · Role + Permission management module

> CRUD Role + จัดการ permission per role
> ฟังก์ชันอ้างอิง: `project-backup/backend/src/services/role.service.ts`

Priority: 2
Blocked by: E02
Status: done (T01-T05 รวมเป็น module เดียว)

## Tasks (รวม module ครั้งเดียว — atomic-first ภายใน)

| Task | ชื่อ | Status |
|------|------|--------|
| T01 | Role module — CRUD + lookup + permissions list | done |
| T02 | setPermissions flow (transaction deleteMany + createMany) | done |
| T03 | Block delete role ที่มี user | done |
| T04 | Block edit/delete isSystem role | done |
| T05 | Audit + invalidate cache ทุก mutation | done |

## Summary
- 1 module file ครบ (controller/service/repository/schema/constants/index/test) — ตาม pattern ที่ pmk ทำ
- guard logic (system role + has users) ใส่ใน service ไม่แยก flow file (function < 80 LoC)
- setPermissions: `$transaction(async tx => { deleteMany; createMany })` — atomic
- audit ทุก mutation: CREATE / UPDATE / DELETE / UPDATE (set permissions)
- invalidate `permissionCache` ทุกครั้งที่ permissions ของ role เปลี่ยน หรือ role ถูกลบ

## Endpoints
- `GET /api/roles?page&limit` — list + count users/permissions
- `GET /api/roles/lookup` — id+name+description+isSystem
- `GET /api/roles/permissions` — 26 permissions (frontend ใช้ใน editor matrix)
- `GET /api/roles/:id` — detail + permissions
- `POST /api/roles` — create (validate name unique)
- `PATCH /api/roles/:id` — update description (block isSystem)
- `PUT /api/roles/:id/permissions` — bulk replace permissions
- `DELETE /api/roles/:id` — soft delete (block isSystem + has users)

## Test Result
- 14 unit tests (mock repo) → pass
- Smoke ทุก endpoint → ผ่าน
- ทุก mutation มี audit log + invalidate cache

## Notes
- TODO(E01+): wrap controller ด้วย authPlugin + requirePermission เมื่อ E01 (auth) เสร็จ
- ตอนนี้ใช้ header `x-user-id` ชั่วคราว
