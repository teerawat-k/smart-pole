# E01 · Auth — login + captcha + lockout + JWT refresh

> ระบบ login พร้อม captcha + lockout policy + JWT access/refresh + logout
> ฟังก์ชันอ้างอิง: `project-backup/backend/src/services/auth.service.ts`

Priority: 1
Blocked by: E00
Status: done (T06 cron + T05 rate-limit เลื่อนทีหลัง)

## Tasks

| Task | ชื่อ | Status |
|------|------|--------|
| T01 | Captcha module — SVG render + session + verify | done |
| T02 | Auth module — login flow + lockout policy | done |
| T03 | JWT plugin + refresh rotation + family tracking | done |
| T04 | Logout + refresh + reuse detection | done |
| T05 | Auth middleware (authGuard) | done — rate limit เลื่อน |
| T06 | Lockout cron job | skip (ใช้ lockedUntil expire ตามปกติ) |
| T07 | Login attempt log | done |

## Summary

### Atomic structure
```
src/modules/auth/
├── auth.constants.ts      LOCKOUT_TIERS, FAIL_REASONS
├── auth.repository.ts     fail count, refresh token, system log
├── auth.schema.ts         loginSchema, refreshSchema, logoutSchema
├── auth.service.ts        orchestrator (delegate flow/)
├── auth.controller.ts     /login (public) + /logout, /logout-all (protected)
├── flow/
│   ├── compute-lockout.ts (atom — pure)  + test
│   ├── verify-credentials.ts  (find user + status check + password verify + apply lockout)
│   ├── issue-tokens.ts    (random 32 bytes + SHA-256 + family UUID)
│   ├── login.ts           (orchestrator: captcha → verify → reset fail → issue tokens → log)
│   ├── refresh.ts         (rotation + reuse detection → revoke family)
│   └── logout.ts          (revoke single + logoutAll = bump tokenVersion)
└── index.ts
```

### Endpoints
- `POST /api/captcha/new` (public) → SVG base64 + sessionKey
- `POST /api/auth/login` (public) — body `{ username, password, sessionKey, captchaInput }`
- `POST /api/auth/refresh` (public) — rotation + reuse detection
- `POST /api/auth/logout` (auth) — revoke specific refresh
- `POST /api/auth/logout-all` (auth) — revoke all + bump tokenVersion

### JWT Plugin
- `src/plugins/jwt.ts`: `jwtAccessPlugin` (sign/verify), `authGuard` (Bearer extract → derive `user`)
- Access token: 15 min (HMAC HS256, payload `{ sub, role, tokenVersion, exp }`)
- Refresh token: 7 days, random 32 bytes hex, SHA-256 hash in DB, family UUID

### Lockout policy (ตาม legacy)
- fail 1-3 → no lock
- fail 4-6 → lockedUntil = now + 10 min
- fail 7-9 → lockedUntil = now + 30 min
- fail ≥ 10 → status = "locked" (admin ต้อง unlock ผ่าน `/api/users/:id/unlock`)

### Refresh token security
- random 32 bytes hex (ส่งกลับครั้งเดียว — DB เก็บแค่ hash)
- rotation: ทุก refresh → revoke เก่า + issue ใหม่ + link `replacedById`
- **reuse detection**: ใช้ refresh ที่ revoked แล้ว → revoke ทั้ง family + AUTH-008 → user ต้อง login ใหม่
- expiry: 7 days (config ผ่าน `JWT_REFRESH_EXPIRES`)

## Test Result
- compute-lockout 4 unit tests pass
- All backend tests: **121 pass / 0 fail** (224 expect calls, 15 files)
- Smoke E2E:
  - captcha generate → SVG OK
  - login wrong captcha → AUTH-007
  - login admin/12345 + correct captcha → access + refresh tokens
  - refresh → new token pair + invalidate old
  - **reuse old refresh → AUTH-008 (revoke family)** ✅
  - logout → success + audit log

## Notes
- Rate limit (T05 ส่วนหลัง) เลื่อนทีหลัง — phase hardening
- Lockout cron job (T06) ไม่ทำ — `lockedUntil` ตรวจในตอน login (ถ้าหมดเวลา → ยอมให้ login ผ่าน)
- frontend จะใช้ access token ใน header `Authorization: Bearer <token>`
- TODO: wire `authGuard` เข้า role/user controllers (ตอนนี้ใช้ `x-user-id` header ชั่วคราว)
