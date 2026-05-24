# Environment Variables

> ทุก env validate ผ่าน **Zod ใน `config/env.ts`** — ห้ามใช้ `process.env` ตรง

---

## Backend

ดู [backend/src/config/env.ts](../../backend/src/config/env.ts) + [backend/.env.example](../../backend/.env.example)

| Variable | Type | Default | Required | Description |
|---|---|---|---|---|
| `NODE_ENV` | enum | `development` | ✅ | `development \| staging \| production \| test` |
| `PORT` | number | `7766` | ✅ | Backend HTTP listen port |
| `DATABASE_URL` | string | — | ✅ | Postgres connection string — dev: `postgresql://postgres:<password>@localhost:5432/smart_pole` |
| `JWT_SECRET` | string (≥ 32 chars) | — | ✅ | Sign JWT access token — production ใช้ random ≥ 256-bit |
| `JWT_ACCESS_EXPIRES` | string (duration) | `15m` | ✅ | Access token TTL — formats: `15m`, `1h`, `30s` |
| `JWT_REFRESH_EXPIRES` | string (duration) | `7d` | ✅ | Refresh token TTL |
| `CORS_ORIGIN` | string (URL) | `http://localhost:7765` | ✅ | Frontend origin ที่อนุญาต (comma-separated สำหรับหลาย origin) |
| `UPLOAD_DIR` | string (path) | `data/uploads` | ✅ | Root path เก็บ uploaded files (relative ต่อ working dir) |
| `MQTT_BROKER_URL` | string (mqtt:// URL) | `mqtt://localhost:7783` | ✅ | Mosquitto endpoint — Docker override `mqtt://mosquitto:1883` |
| `MQTT_USERNAME` | string | `backend-subscriber` | ✅ | MQTT username สำหรับ backend subscriber |
| `MQTT_PASSWORD` | string | `""` (empty) | ✅ | MQTT password — empty = anonymous (production ต้องตั้ง) |
| `MQTT_CLIENT_ID` | string | `smart-pole-backend` | ✅ | Mosquitto client ID — ต้อง unique ต่อ instance |
| `MQTT_TIMESTAMP_DRIFT_MAX_SEC` | number | `300` | ✅ | (reserved — ไม่มี drift check ใน code ปัจจุบัน, ตัดออกแล้ว) |
| `POLE_OFFLINE_THRESHOLD_MINUTES` | number | `5` | ✅ | นาทีที่ pole ไม่ส่ง sensor packet → mark offline |
| `LOG_LEVEL` | enum | `info` | ✅ | Pino log level: `fatal\|error\|warn\|info\|debug\|trace` |

### Validation
ทุก env ตรวจตอน startup ผ่าน `envSchema.safeParse(process.env)` — ถ้า invalid → `console.error` + `process.exit(1)`

### Files
- [backend/.env.example](../../backend/.env.example) — template สำหรับ dev (copy เป็น `.env`)
- [backend/.env.uat.example](../../backend/.env.uat.example) — template สำหรับ UAT deployment
- `.env`, `.env.uat`, `.env.production` — gitignored (อย่า commit)

---

## Frontend

ดู [frontend/config/env.ts](../../frontend/config/env.ts)

| Variable | Type | Default | Required | Description |
|---|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | string (URL) | — | ✅ | Backend HTTP URL — dev: `http://localhost:7766` |
| `NEXT_PUBLIC_WS_URL` | string (ws URL) | `ws://localhost:7766/ws` | ✅ | Backend WebSocket URL (derive auto จาก API URL แล้ว replace protocol) |
| `NEXT_PUBLIC_PROJECT_PREFIX` | string | — | ✅ | Prefix สำหรับ localStorage key (เช่น `"smart-pole"` → `smart-pole-auth`) |
| `NODE_ENV` | enum | `development` | ✅ | `development \| production \| test` |

> Frontend env ต้องขึ้นต้น `NEXT_PUBLIC_` (Next.js convention) เพราะ embed ใน client bundle

### .env files
- `frontend/.env.local` (dev — gitignored)
- `frontend/.env.production` (build-time embed สำหรับ production — gitignored)
- ไม่มี `.env.example` ฝั่ง frontend — keys ดูใน `config/env.ts`

---

## Secrets Strategy

| Env | Secret source | Rotation |
|---|---|---|
| Dev | `.env` ใน local machine (developer ตั้งเอง) | ไม่ต้อง rotate |
| UAT | `.env.uat` บน UAT server (gitignored) | rotate ทุก 90 วัน |
| Production | (planned) HashiCorp Vault หรือ DigitalOcean Secrets / 1Password | rotate ทุก 30-90 วัน + audit access |

⚠️ **ห้าม commit `.env` / `.env.uat` / `.env.production`** — `.gitignore` ครอบคลุมแล้ว ([../../.gitignore](../../.gitignore))

⚠️ **Dev Postgres password เคย leak** ใน `.env.example` (commit แรก) → rotate dev password (ดู [production-readiness P0-3](../production-readiness.md))

---

## Per-Environment Overrides

### Dev (local)
- Backend: `bun dev` ใน `backend/` — อ่าน `.env`
- Frontend: `bun dev` ใน `frontend/` — อ่าน `.env.local`
- Mosquitto: Docker (`docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d mosquitto`)
- Postgres: local install บนเครื่อง (port 5432)

### UAT (Docker compose, single host)
- ใช้ `docker-compose.yml` (เปิดทั้ง backend + frontend + mosquitto containers)
- `.env.uat` copy ไปเป็น `.env` บน server
- `DATABASE_URL` ใช้ Postgres ภายนอก compose (host install หรือ managed DB)

### Production (planned)
- Docker compose หรือ Kubernetes
- Secrets ผ่าน vault / orchestrator
- HTTPS reverse proxy (Caddy/Nginx) terminate ที่ 443
- ดู [production-readiness.md](../production-readiness.md) สำหรับ checklist

---

## Adding New Env Var

1. เพิ่มใน `envSchema` ของ `config/env.ts` (backend หรือ frontend) — ต้องมี `z.string()`/`z.number()` + default ถ้ามี
2. เพิ่มใน `.env.example` (+ `.env.uat.example` ถ้าค่าต่างกัน) พร้อม comment อธิบาย
3. ใช้ผ่าน `env.MY_NEW_VAR` ใน code (ห้าม `process.env.MY_NEW_VAR`)
4. แจ้งทีม — update `.env` ใน local + UAT
