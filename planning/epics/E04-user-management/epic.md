# E04 · User management module

> CRUD User + status (active/disabled) + reset password + lockout + my profile
> ฟังก์ชันอ้างอิง: `project-backup/backend/src/services/user.service.ts`

Priority: 2
Blocked by: E02,E03
Status: done

## Tasks

| Task | ชื่อ | Status |
|------|------|--------|
| T01 | Prisma schema User | done (รวมใน E02.T01) |
| T02 | User module CRUD + pagination + lookup | done |
| T03 | `/users/:id/status` — change status + reset lockout | done |
| T04 | `/users/:id/reset-password` admin reset | done |
| T05 | `/users/:id/unlock` clear locked | done |
| T06 | `/me`, `/me/password`, `/me` PATCH | done |
| T07 | Block delete user ตัวเอง + last admin | done |

## Summary
- Module ตาม atomic pattern: controller / service / repository / schema / constants / index / test
- status enum (active/disabled/locked) — locked = soft lock จาก fail count, disabled = admin ตั้ง
- changePassword bumps `tokenVersion` (force logout-all จะมีผลตอน E01.T04)
- guards:
  - block disable/delete ตัวเอง
  - block disable/delete admin คนสุดท้าย (count `status=active` + `role.name=admin`)
  - duplicate username/email check ตอน create
- หลัก argon2id (ใช้ `verifyPassword` รองรับ bcrypt fallback ภายในเดียวกัน — E01 จะ extend)

## Endpoints
- `GET /api/users?page&limit&search&roleId&status`
- `GET /api/users/lookup` (id+username+firstName+lastName, status=active เท่านั้น)
- `GET /api/users/:id`
- `POST /api/users` (admin create)
- `PATCH /api/users/:id` (admin update)
- `PATCH /api/users/:id/status` (active|disabled)
- `POST /api/users/:id/unlock`
- `POST /api/users/:id/reset-password`
- `DELETE /api/users/:id` (soft)
- `GET /api/me`
- `PATCH /api/me`
- `PATCH /api/me/password` (verify current → hash new → bump tokenVersion)

## Test Result
- 12 unit tests pass (110 backend tests total, 199 expect calls)
- Smoke: list/me/create ผ่าน
- Audit log เรียกทุก mutation
- typecheck 0 errors

## Notes
- TODO(E01+): wrap auth + permission check
- service file 224 LoC (ยังไม่ trigger split — ภายใต้ 500) แต่จะ refactor flow/ ใน next commit ถ้าเพิ่ม fields/concerns
