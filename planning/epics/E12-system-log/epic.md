# E12 · System log + Audit log (separated concerns)

> แยก concern: SystemLog (login/page-access) ↔ AuditLog (mutation)
> ฟังก์ชันอ้างอิง: `project-backup/backend/src/services/log.service.ts` (legacy รวม login + audit ใน table เดียว)

Priority: 4
Blocked by: E04
Status: todo

## Tasks

| Task | ชื่อ | Status |
|------|------|--------|
| T01 | Schema split — SystemLog (auth/access) + AuditLog (mutation) | todo |
| T02 | SystemLog query API + filter | todo |
| T03 | AuditLog query API + filter + diff viewer | todo |
| T04 | Page access tracking middleware | todo |
| T05 | Retention — daily archive cron | todo |

## Notes
- SystemLog: login_success, login_fail, logout, captcha_fail, page_access (เพิ่มใหม่)
- AuditLog: ทุก CREATE/UPDATE/DELETE/TOGGLE/REORDER + detail (before/after JSON diff)
- Retention: SystemLog 90 days online + archive S3, AuditLog 365 days online
