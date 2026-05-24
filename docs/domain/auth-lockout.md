# Auth & Lockout Policy

> นโยบายการ login + lock บัญชี — ระบุพฤติกรรมที่ frontend ต้องแสดง + ที่ admin ปลดล็อก

---

## Login Flow

1. User submit form login (username + password + captcha)
2. Backend ตรวจ captcha → ผิด → log `captcha_fail` + reject (สร้าง captcha ใหม่)
3. Backend ตรวจ password (argon2.verify) + ตรวจ `status` + ตรวจ `lockedUntil`
4. ผิด → ++loginFailCount → คำนวณ lockout (ดู § Lockout Tiers) → throw `AUTH_*`
5. ถูก → reset `loginFailCount=0, lockedUntil=null, lockedReason=null` + sign JWT + return tokens

---

## Lockout Tiers

| Fail count | ผลลัพธ์ |
|---|---|
| 1–3 | ไม่ lock — แจ้ง "username/password ไม่ถูกต้อง" |
| 4–6 | **lock 10 นาที** — `lockedUntil = now + 10min`, status คงเดิม |
| 7–9 | **lock 30 นาที** — `lockedUntil = now + 30min`, status คงเดิม |
| ≥ 10 | **lock ถาวร** — `User.status = "locked"` + `lockedUntil = null` → admin ปลดล็อกผ่าน UI เท่านั้น |

ค่าเก็บใน [auth.constants.ts:8-12](../../backend/src/modules/auth/auth.constants.ts):
```ts
LOCKOUT_TIERS = [
  { failsAt: 4, durationMs: 10 * 60 * 1000 },
  { failsAt: 7, durationMs: 30 * 60 * 1000 },
];
PERMANENT_LOCK_THRESHOLD = 10;
```

---

## User Status Enum

```prisma
enum UserStatus {
  active     // ใช้งานได้ปกติ
  disabled   // admin ปิดใช้งานชั่วคราว — login ไม่ได้ (ไม่ใช่ lockout)
  locked     // ระบบ lock จาก fail ≥ 10 ครั้ง — admin ต้อง unlock
}
```

> โปรเจคนี้ **ไม่มี `isActive` field** — ใช้ `status` enum + `deletedAt` แทน (ดู [00-root-CLAUDE.md](../../CLAUDE.md))

---

## Admin Actions

### Unlock user
- Endpoint: `POST /api/users/:id/unlock`
- Flow ([unlock.ts](../../backend/src/modules/user/flow/unlock.ts)):
  1. `userRepository.unlock(id)` — reset `loginFailCount=0, lockedUntil=null, lockedReason=null`, ถ้า `status=locked` → set `active`
  2. audit log: `action = UNLOCK, module = "user", targetId = user.id`
  3. system log: `logType = "account_unlocked"` (⚠️ **ปัจจุบันบันทึก userId ผิด** — ดู [production-readiness.md P2-2](../production-readiness.md))

### Set status (disable/enable)
- Endpoint: `PATCH /api/users/:id/status`
- Guard:
  - `assertNotSelf` — ห้าม admin ปิดบัญชีตัวเอง
  - `assertNotLastActiveAdmin` — ห้ามปิด admin คนสุดท้ายในระบบ (ป้องกัน lockout ทั้งระบบ)
- Audit log: `action = STATUS_CHANGE, payload = { from, to }`

### Reset password
- Endpoint: `POST /api/users/:id/reset-password`
- Body: `{ newPassword }` (admin กรอกให้ user)
- Audit log: `action = RESET_PASSWORD`

---

## Frontend Behavior

| Backend Error | UI Behavior |
|---|---|
| `AUTH_CAPTCHA_INVALID` | แสดง toast + refetch captcha ใหม่ + clear captcha input |
| `AUTH_INVALID_CREDENTIALS` | แสดง toast "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" + refetch captcha + clear input |
| `AUTH_LOCKED` (มี remaining minutes) | แสดง "บัญชีถูกล็อก กรุณารอ X นาที" |
| `AUTH_LOCKED` (ไม่มี minutes = permanent) | แสดง "บัญชีถูกล็อก — กรุณาติดต่อผู้ดูแล" |
| `AUTH_DISABLED` | แสดง "บัญชีถูกปิดใช้งาน — กรุณาติดต่อผู้ดูแล" |

---

## System Log Coverage

ทุก login attempt ถูกบันทึก — ดู [SystemLog model](../../backend/prisma/schema.prisma):

| logType | เมื่อไหร่ | userId | usernameSnap |
|---|---|---|---|
| `login_success` | login ผ่าน | user.id | user.username |
| `login_fail` | password/account fail | user.id (ถ้าเจอ user) | username ที่กรอก |
| `captcha_fail` | captcha ผิด | null | username ที่กรอก |
| `logout` | logout ปกติ | user.id | user.username |
| `account_locked` | ระบบ lock (auto จาก fail) | user.id | user.username |
| `account_unlocked` | admin unlock (⚠️ ปัจจุบันบันทึก userId ของ admin ผิด — ดู P2-2) | should be target user.id | target.username |
| `password_changed` | user เปลี่ยน password ตัวเอง | user.id | user.username |
| `password_reset` | admin reset password ให้ user | admin.id (?) | target.username |
| `page_access` | (future) ติดตามการเข้าหน้า | user.id | user.username |

---

## Token Strategy

| Token | ที่อยู่ | Expire | Storage |
|---|---|---|---|
| Access (JWT) | header `Authorization: Bearer ...` | 15 นาที (`JWT_ACCESS_EXPIRES`) | localStorage (`<PREFIX>-auth`) |
| Refresh | body `POST /auth/refresh { refreshToken }` | 7 วัน (`JWT_REFRESH_EXPIRES`) | localStorage |

⚠️ Refresh token ใน localStorage = XSS risk → ดู [production-readiness.md](../production-readiness.md) สำหรับ migrate ไป httpOnly cookie

### Refresh Rotation
- ทุกครั้งที่ refresh: เก่า revoke + ออกใหม่ + เชื่อม `replacedById` (family chain)
- ถ้า refresh ที่ revoke แล้วถูกใช้ → ทั้ง family invalidate (token theft detection)

### Token Version
- `User.tokenVersion` field — เพิ่ม +1 เพื่อ invalidate JWT ทุกตัวของ user นั้น (logout-all-devices)
- JWT payload มี `tokenVersion` → guard เปรียบเทียบกับ DB

---

## Captcha

ดู [./captcha.md](./captcha.md)

---

## RBAC

ดู [./rbac.md](./rbac.md)
