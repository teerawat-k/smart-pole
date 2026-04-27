# E03 · Role + Permission management module

> CRUD Role + จัดการ permission per role
> ฟังก์ชันอ้างอิง: `project-backup/backend/src/services/role.service.ts`

Priority: 2
Blocked by: E02
Status: todo

## Tasks

| Task | ชื่อ | Status |
|------|------|--------|
| T01 | Role module — CRUD + lookup + toggle-active | todo |
| T02 | Permission flow — `replacePermissions` (transaction) | todo |
| T03 | Block delete role ที่มี user อ้างถึง | todo |
| T04 | Block delete/edit role `isSystem: true` | todo |
| T05 | Audit + invalidate cache ทุก mutation | todo |

## Notes
- **Bulk update permission** ใช้ `$transaction([deleteMany, createMany])` แทน loop upsert
- ทุก mutation ปล่อย event `permissionChanged` (หรือ `roleChanged`) ไป invalidate cache
