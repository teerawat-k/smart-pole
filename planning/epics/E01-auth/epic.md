# E01 · Auth — login + captcha + lockout + JWT refresh

> ระบบ login พร้อม captcha + lockout policy + JWT access/refresh + logout
> ฟังก์ชันอ้างอิง: `project-backup/backend/src/services/auth.service.ts`

Priority: 1
Blocked by: E00
Status: todo

## Tasks

| Task | ชื่อ | Status |
|------|------|--------|
| T01 | Captcha module — image render + session table + verify | todo |
| T02 | Auth module — login flow + lockout policy | todo |
| T03 | JWT plugin — access (15m) + refresh (7d) + rotation | todo |
| T04 | Logout + refresh-token endpoint + token blacklist | todo |
| T05 | Auth middleware — verify access token + derive userId/role | todo |
| T06 | Lockout policy + scheduled unlock job | todo |
| T07 | Login attempt log (system_log entries) | todo |

## Notes

- **เปลี่ยนจาก legacy:** text captcha → image captcha (server render base64 PNG)
- **เปลี่ยนจาก legacy:** bcryptjs → argon2id (verify legacy bcrypt ได้ + re-hash ตอน login สำเร็จครั้งแรก)
- **เปลี่ยนจาก legacy:** single token → access (short) + refresh (long) + rotation
- Lockout: 1-3 fail = ไม่ lock, 4-6 = lock 10m, 7-9 = lock 30m, ≥10 = disable (admin enable)
- Refresh token: random 32 bytes + SHA-256 hash ใน DB + family tracking (detect token reuse → invalidate ทั้ง family)

## ข้อเสนอเพิ่มเติม
- เพิ่ม **rate limit** `POST /auth/login` 10 req/min per IP (T05 รวม)
- เพิ่ม **password policy** บังคับเปลี่ยน password ครั้งแรก login (initial admin) — phase 2
