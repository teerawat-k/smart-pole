# CAPTCHA

> CAPTCHA แบบ text 6 ตัวอักษร ใช้กัน brute-force login + automation

---

## Spec

| รายการ | ค่า | Source |
|---|---|---|
| Length | 6 ตัวอักษร | [captcha.constants.ts:2](../../backend/src/modules/captcha/captcha.constants.ts) (`CAPTCHA_LENGTH`) |
| Character set | `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (ตัด 0/O, 1/I/L) | `CAPTCHA_CHARS` |
| TTL | 5 นาที | `CAPTCHA_TTL_MS = 5 * 60 * 1000` |
| One-time use | ✅ | `verify()` → mark `isSolved = true` |
| Image format | SVG dataURI (160 × 50 px) | renderSvg() |

---

## Flow

```
1. Frontend → POST /api/captcha
2. Backend → captchaService.create():
   a. randomUUID → sessionKey
   b. random 6 chars → text
   c. sha256(text.toUpperCase()) → captchaHash
   d. INSERT CaptchaAttempt { sessionKey, captchaHash, expiresAt: now+5min, isSolved: false }
   e. renderSvg(text) → image dataURI
   f. return { sessionKey, image, expiresAt }
3. Frontend → แสดง <img src={image}> + เก็บ sessionKey
4. User → กรอก captcha input (ตัวเล็กตัวใหญ่อ่อนต่อ — backend normalize upper)
5. Frontend → POST /api/auth/login { ..., sessionKey, captchaInput }
6. Backend → captchaService.verify(sessionKey, input):
   a. SELECT CaptchaAttempt WHERE sessionKey AND isSolved=false AND expiresAt > now
   b. ถ้าไม่เจอ → return false (expired หรือ used)
   c. compare hash(input.toUpperCase()) === stored captchaHash
   d. ถ้า match → UPDATE isSolved = true → return true
   e. ไม่ match → return false
```

---

## Security Notes

- **Anti-replay:** one-time use — captcha ที่ verify ผ่านแล้วใช้อีกไม่ได้
- **No retry:** captcha ผิดครั้งเดียว = expire (ต้องขอใหม่)
- **TTL short:** 5 นาที กัน captcha solving farm ที่ใช้เวลานาน
- **Hash storage:** เก็บ SHA-256 hash ไม่เก็บ plain (ลด risk ถ้า DB รั่ว)
- **No PII:** ไม่มี user info ใน CaptchaAttempt — anonymous endpoint

---

## Cleanup

มี cron job (ตั้งใจให้มี) ลบ `CaptchaAttempt` ที่ expired:

```ts
// captcha.service.ts
cleanupExpired(): DELETE WHERE expiresAt < now
```

⚠️ ตรวจว่า scheduler มี job เรียก `cleanupExpired()` หรือไม่ — ถ้าไม่ ตาราง CaptchaAttempt จะโตเรื่อยๆ

---

## Frontend Hook

```ts
// hooks/api/use-auth.ts
const captcha = useNewCaptcha();           // { data: { sessionKey, image }, refetch, isFetching }
captcha.refetch();                          // โหลดใหม่
```

ใช้ใน [login page](../../frontend/app/(auth)/login/page.tsx):
- โหลด captcha ครั้งแรกเมื่อหน้าเปิด
- กด refresh button → `captcha.refetch()`
- หลัง login fail → auto `captcha.refetch()` + clear input

---

## ทำไมไม่ใช้ reCAPTCHA / hCaptcha

- ระบบ internal (ไม่เปิดสาธารณะ)
- ไม่ต้องการ third-party dependency
- ไม่ต้องการส่ง traffic ออกไป Google/Cloudflare
- Text captcha 6 chars + lockout policy = พอกัน brute-force พื้นฐาน
