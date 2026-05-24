# 004. argon2id สำหรับ password hashing — ไม่ใช้ bcrypt

- **Status:** accepted
- **Date:** 2026-04-27

---

## Context

ต้องเลือก password hash สำหรับ:
- User login password (`User.password`)
- MQTT credential per pole (`Pole.mqttPasswordHash`)

ข้อพิจารณา:
- Resistance ต่อ GPU/ASIC attack
- Memory hardness
- Industry standard / compliance
- Library availability บน Bun runtime
- Tuning cost vs security

---

## Decision

ใช้ **argon2id** (library: `argon2` v0.44+) ทั้งสองที่:
- User password
- MQTT credential plain → hash เก็บใน `Pole.mqttPasswordHash`

ใช้ default parameter ของ library (memory cost 65536 KiB, time cost 3, parallelism 4)

---

## Alternatives Considered

| Option | ข้อดี | ข้อเสีย | ตัดสิน |
|---|---|---|---|
| bcrypt cost ≥ 12 | Standard เก่า, library นิ่ง | GPU-friendly (resistance ต่ำกว่า argon2), max input 72 byte | ❌ |
| scrypt | Memory-hard | Mature น้อยกว่า argon2 ใน Node ecosystem | ❌ |
| **argon2id** | OWASP recommended, memory-hard ต้าน GPU/ASIC, ชนะ PHC contest 2015 | Library config มี option เยอะ — ต้อง tune | ✅ |
| PBKDF2 | NIST/FIPS approved | Iteration-only, ไม่ memory-hard | ❌ (compliance ไม่ require) |

---

## Consequences

### Positive
- Best-in-class password hash ปี 2026
- OWASP Password Storage Cheat Sheet แนะนำ argon2id เป็น default
- Library `argon2` v0.44 ทำงานบน Bun runtime + native binding compile ผ่าน
- Verify: `argon2.verify(hash, plain)` — API คล้าย bcrypt

### Negative
- CPU + memory cost สูงกว่า bcrypt (~50-100ms ต่อ verify ที่ default param) — เป็น design intent
- ไม่ compatible กับระบบเก่าที่ใช้ bcrypt (migration ต้อง re-hash ตอน user login ครั้งแรก)
- Mosquitto passwordfile **ไม่ใช้ argon2** (รองรับแค่ pbkdf2-sha512) → MQTT auth provisioning ต้อง bridge format (ดู [production-readiness.md](../../production-readiness.md) P1-1)

### Verify Performance
- Login p95 ที่ default param ~ 80-100ms ต่อ verify (acceptable สำหรับ login flow)
- ถ้า login traffic > 50 RPS → ลด memory cost เป็น 19456 KiB (จะเหลือ ~20ms) — ไม่จำเป็นตอนนี้

---

## References

- argon2 library: https://github.com/ranisalt/node-argon2
- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- Implementation: [backend/src/common/utils/password.ts](../../../backend/src/common/utils/password.ts)
- Usage: [seeds/users.ts:19](../../../backend/prisma/seeds/users.ts), [pole/flow/generate-credential.ts:17](../../../backend/src/modules/pole/flow/generate-credential.ts)
