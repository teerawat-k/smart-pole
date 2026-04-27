# E14 · Frontend — Login + Auth guard + Sidebar + Header

Priority: 2
Blocked by: E13
Status: todo

## Tasks

| Task | ชื่อ | Status |
|------|------|--------|
| T01 | Login page — captcha + form + lockout countdown | todo |
| T02 | Auth guard layout — redirect + permission check | todo |
| T03 | Sidebar — dynamic menu จาก permissions | todo |
| T04 | Topbar / Header — user info + bell + logout | todo |
| T05 | Lockout/disabled UI message + countdown timer | todo |

## Notes
- Sidebar **ห้าม hardcode `adminOnly: true`** (legacy ทำผิด) — ใช้ permissions[] จาก authStore
- menu items มี `path` ห้ามมี `children` (และกลับกัน)
- Login refresh captcha ทุกครั้งที่ submit fail
