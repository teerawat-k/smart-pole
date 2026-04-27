# E04 · User management module

> CRUD User + status (enable/disable) + reset password + lockout management
> ฟังก์ชันอ้างอิง: `project-backup/backend/src/services/user.service.ts`

Priority: 2
Blocked by: E02,E03
Status: todo

## Tasks

| Task | ชื่อ | Status |
|------|------|--------|
| T01 | Prisma schema User — soft delete + audit + lockout | todo |
| T02 | User module — CRUD + lookup + pagination | todo |
| T03 | Endpoint `/users/:id/status` — toggle active + reset lockout | todo |
| T04 | Endpoint `/users/:id/reset-password` — admin reset | todo |
| T05 | Endpoint `/users/:id/unlock` — clear locked state | todo |
| T06 | My profile — `/me`, `/me/password`, `/me/sessions` | todo |
| T07 | Block delete user ตัวเอง + last admin | todo |

## Notes
- เปลี่ยนจาก legacy: ใช้ soft delete (เดิม hard delete)
- ใช้ argon2id ตั้งแต่ create
- `/me/password` change → trigger `logout-all` (E01.T04)
- list pagination + search by username/firstName/lastName/email
