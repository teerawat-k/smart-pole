# Docker Services

> สรุป service ที่อยู่ใน `docker-compose.yml` + service ที่ run บน host

---

## Services

### docker-compose.yml (`smart-pole` project)

```
┌─────────────────────────────────────────────────────────┐
│  Docker network: smart-pole-network (external)          │
│                                                          │
│  ┌───────────────────┐  ┌──────────────────────────┐    │
│  │  mosquitto         │  │  backend                  │    │
│  │  eclipse-mosquitto │  │  ${DOCKERHUB}/            │    │
│  │  :2 (MQTT 5)       │◄─┤  smart-pole-backend       │    │
│  │  Listener 1883 TCP │  │  :${IMAGE_TAG}            │    │
│  │  Listener 9001 WS  │  │  Bun + Elysia (port 7766) │    │
│  └────────┬───────────┘  └──────┬───────────────────┘    │
│           │ Mosquitto config       │ HTTP                │
│           │ (./infra/mosquitto/)   │                     │
│           │                         ▼                     │
│           │              ┌────────────────────┐          │
│           │              │  frontend           │          │
│           │              │  ${DOCKERHUB}/      │          │
│           │              │  smart-pole-frontend│          │
│           │              │  :${IMAGE_TAG}      │          │
│           │              │  Next.js (port 7765)│          │
│           │              └─────────────────────┘          │
└───────────┼────────────────────────────────────────────┘
            │ external port mapping
            ▼
       host:7783/7791  ← Pi เชื่อม MQTT, browser MQTT WS

       host:7765  ← user เข้าเว็บ
       host:7766  ← API เรียกตรง (ปกติผ่าน proxy)
```

---

### Service Details

#### `mosquitto`

| รายการ | ค่า |
|---|---|
| Image | `eclipse-mosquitto:2` |
| Container name | `smart-pole-mosquitto` |
| Ports | `7783:1883` (TCP), `7791:9001` (WebSocket) |
| Volumes | `./infra/mosquitto/config` (ro), `./data/mosquitto/data`, `./data/mosquitto/log` |
| Restart | `unless-stopped` |
| TZ | `Asia/Bangkok` |
| Config | [infra/mosquitto/config/mosquitto.conf](../../infra/mosquitto/config/mosquitto.conf) |

#### `backend`

| รายการ | ค่า |
|---|---|
| Image | `${DOCKERHUB_USERNAME:-teerawatk}/smart-pole-backend:${IMAGE_TAG:-latest}` |
| Container name | `smart-pole-backend` |
| Ports | `7766:7766` |
| Env file | `./backend/.env` |
| Env override | `MQTT_BROKER_URL=mqtt://mosquitto:1883` (internal service name) |
| Volumes | `./data/uploads:/app/data/uploads` (camera clips), `./volumes/logs:/app/logs` |
| Depends on | `mosquitto` (started) |
| Health check | `curl -f http://localhost:7766/health` ทุก 30s |
| Extra hosts | `host.docker.internal:host-gateway` (เข้า Postgres บน host) |
| Logging | json-file, max 20MB × 5 file, gzip |

#### `frontend`

| รายการ | ค่า |
|---|---|
| Image | `${DOCKERHUB_USERNAME:-teerawatk}/smart-pole-frontend:${IMAGE_TAG:-latest}` |
| Container name | `smart-pole-frontend` |
| Ports | `7765:7765` |
| Env | `NODE_ENV=production`, `PORT=7765`, `HOSTNAME=0.0.0.0` |
| Depends on | `backend` (started) |
| Health check | `curl -f http://localhost:7765/api/health` ทุก 30s |
| Resources | limits: 2 CPU / 1 GB RAM, reservations: 0.5 CPU / 512 MB |

---

## Services ที่ **ไม่อยู่** ใน Docker compose

### PostgreSQL 18 + TimescaleDB extension

⚠️ Postgres **ลงบน host directly** — ไม่อยู่ใน compose

**เหตุผล:**
- TimescaleDB extension setup ง่ายกว่า + ต้องลง extension manual
- Persistent storage บน host = ง่ายต่อ backup/migrate (ไม่ผูกกับ container)
- ในอนาคต production อาจใช้ managed Postgres (DigitalOcean Managed DB / AWS RDS)

**Backend container เข้า Postgres ผ่าน:**
- `extra_hosts: ['host.docker.internal:host-gateway']`
- `DATABASE_URL=postgresql://postgres:<pwd>@host.docker.internal:5432/smart_pole`

### Service ที่อยู่ใน roadmap แต่ยังไม่ deploy

- **SRS** — RTMP + HLS + DVR — config drafted ใน [infra/srs/srs.conf](../../infra/srs/srs.conf), ดู [production-readiness P1-3](../production-readiness.md)
- **Reverse proxy** (Caddy / Nginx + Let's Encrypt) — HTTPS terminate ที่ 443

---

## docker-compose.dev.yml (overlay)

ดู [docker-compose.dev.yml](../../docker-compose.dev.yml):
- Override mosquitto ports (ตรงกับ main compose)
- ติด profile `app` ให้ backend + frontend → ไม่ start เพราะ dev เน้นรัน `bun dev` บน host

### Usage

```bash
# รัน Mosquitto ใน Docker, backend + frontend ใน bun dev
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d mosquitto

# รัน backend + frontend + mosquitto ใน Docker (test deployment image)
docker compose --profile app up
```

---

## Network

```yaml
networks:
  smart-pole-network:
    name: smart-pole-network
    external: true       # ต้อง pre-create ก่อน compose up
```

**สร้างครั้งแรก:**
```bash
docker network create smart-pole-network
```

> external = ถ้า compose down จะไม่ลบ network → reuse ข้าม restart

---

## Volumes (host path)

| Host path | Container path | ใช้ทำอะไร |
|---|---|---|
| `./infra/mosquitto/config` | `/mosquitto/config:ro` | Mosquitto config (read-only) |
| `./data/mosquitto/data` | `/mosquitto/data` | Mosquitto persistent (retained messages, session) |
| `./data/mosquitto/log` | `/mosquitto/log` | Mosquitto log files |
| `./data/uploads` | `/app/data/uploads` | Camera clips (filesystem storage) |
| `./volumes/logs` | `/app/logs` | Backend Pino log files |

⚠️ `./data/` ไม่ commit ใน git ([../../.gitignore](../../.gitignore)) — backup ฝั่ง host แยก

---

## Build (CI/CD)

ดู [ci-cd-setup.md](../ci-cd-setup.md) — GitHub Actions build + push image ไป Docker Hub

```bash
# Manual local build
docker build -t my-username/smart-pole-backend:dev ./backend
docker build -t my-username/smart-pole-frontend:dev ./frontend
```

Backend image: alpine + Bun + non-root user + tini (PID 1 signal handler)
Frontend image: Next.js standalone build + accept `NEXT_PUBLIC_*` via build-args

---

## ดูเพิ่ม

- Port mapping: [./ports.md](./ports.md)
- Env vars per service: [./env-vars.md](./env-vars.md)
- Day-to-day operations: [./runbook.md](./runbook.md)
