# 001. Bun + Elysia (ไม่ใช้ Node + Fastify)

- **Status:** accepted
- **Date:** 2026-04-27 (initial choice)
- **Supersedes:** plan เดิมที่ระบุ "Node 20 + Fastify 5" ใน Chat session

---

## Context

ต้องเลือก runtime + web framework สำหรับ backend ใหม่ที่ refactor จาก legacy

ข้อพิจารณา:
- Performance — handle MQTT ingest + REST + WS พร้อมกัน
- TypeScript-first DX
- Built-in test runner (ลด tooling)
- Maturity vs new tech risk

---

## Decision

ใช้ **Bun 1.x** เป็น runtime + **Elysia (latest)** เป็น HTTP framework

---

## Alternatives Considered

| Option | ข้อดี | ข้อเสีย | ตัดสิน |
|---|---|---|---|
| Node 20 + Fastify 5 | Mature, ecosystem ใหญ่, ทีมคุ้น | Slow startup, ต้อง config ts-node/tsx + jest/vitest แยก | ❌ |
| Node 20 + Express | Standard ที่สุด | Outdated patterns, slow, no TypeBox integration | ❌ |
| Deno + Oak | Secure-by-default, native TS | Ecosystem เล็ก, deploy ไม่คุ้น | ❌ |
| **Bun + Elysia** | Native TS, fast start, built-in test runner + sqlite + watch, TypeBox integration, Elysia type inference สุดยอด | New (1.x), Prisma adapter ใหม่ | ✅ |

---

## Consequences

### Positive
- เปิด project + run test ใช้ `bun test` ไม่ต้อง config jest/vitest
- HMR เร็วมาก (bun --watch < 200ms reload)
- `bun install` เร็วกว่า `npm/pnpm` ~5-10x
- Elysia type inference ครอบ method chain → ไม่ต้อง zod เพิ่ม (TypeBox อยู่ในนั้น) สำหรับ request schema
- Single runtime → ไม่มี node_modules duplicate

### Negative
- ทีมต้องใช้ `bun`/`bunx` เท่านั้น (ห้าม `node`/`npm`/`npx`) — เขียนไว้ใน [CLAUDE.md](../../../CLAUDE.md)
- Library บางตัวที่ฝัง native binding (เช่น `bcrypt`) อาจ build ไม่ผ่าน → แก้ด้วยใช้ alternative (`argon2` ก็มี issue บน Bun → ใช้ตัวที่ verified แล้ว)
- Prisma adapter `@prisma/adapter-pg` ใหม่ — ใช้แทน default engine
- Production deployment ต้องลง Bun runtime บน server (image `oven/bun:alpine`)

### Mitigation
- CI runner ใช้ Bun image official
- Document workflow ทุกอย่างใน CLAUDE.md ที่ห้าม fallback `npm`
- Pre-commit hook ตรวจ `bun.lock` exists + no `package-lock.json`/`pnpm-lock.yaml`

---

## References

- Bun: https://bun.sh
- Elysia: https://elysiajs.com
- Prisma adapter-pg: https://www.prisma.io/docs/orm/overview/databases/postgresql
