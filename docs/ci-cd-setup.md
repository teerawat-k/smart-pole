# CI/CD Setup Guide

> Pattern: เลียนแบบ `pmk-psom-v2-remark` — สร้าง `.env` บน server on-the-fly จาก secrets/vars
> Workflow ที่ deploy: `.github/workflows/uat-dev.yml` + `production.yml`

---

## 1. Branch Strategy

```
main         ← production deploy (manual approval)
└── uat-dev  ← UAT auto-deploy ทุก push
    └── feature/* / fix/* / chore/*
```

---

## 2. GitHub Environments

สร้าง 2 environments ที่ **Settings → Environments → New**:

| Name | Branch ที่ใช้ | Required reviewers |
|---|---|---|
| `uat_dev_site` | `uat-dev` | ไม่ต้อง |
| `production` | `main` | **ต้องมี** ≥ 1 |

---

## 3. Variables (🟢 public — log ได้, ไม่ mask)

ตั้งที่ **Environment → Variables**

### Environment `uat_dev_site` — Variables

| Name | ตัวอย่าง | คำอธิบาย |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api-uat.smart-pole.example.com` | URL backend (frontend bundle) |
| `NEXT_PUBLIC_WS_URL` | `wss://api-uat.smart-pole.example.com/ws` | URL WebSocket |
| `NEXT_PUBLIC_HLS_BASE` | `https://stream-uat.smart-pole.example.com` | URL HLS playback |
| `NEXT_PUBLIC_PROJECT_PREFIX` | `smart-pole-uat` | ใช้เป็น localStorage prefix |
| `BACKEND_PORT` | `7766` | port backend container (host) |
| `FRONTEND_PORT` | `7765` | port frontend container (host) |
| `SRS_API_PORT` | `7785` | SRS HTTP API port (สำหรับ health check) |
| `CORS_ORIGIN` | `https://uat.smart-pole.example.com` | URL frontend (สำหรับ CORS) |
| `MQTT_BROKER_URL` | `mqtt://mosquitto:1883` | Override default ใน compose |
| `SRS_HLS_BASE` | `http://srs:8080` | Override SRS internal URL |
| `JWT_ACCESS_EXPIRES` | `15m` | (optional) |
| `JWT_REFRESH_EXPIRES` | `7d` | (optional) |
| `LOG_LEVEL` | `info` | `debug`/`info`/`warn` |
| `POLE_OFFLINE_THRESHOLD_MINUTES` | `5` | นาที |

### Environment `production` — Variables

ตัวเดียวกันแต่ใช้ค่า production (URLs, prefix `smart-pole`)

---

## 4. Secrets (🔴 private — masked ใน log)

### Repository Secrets (Settings → Secrets and variables → Actions → Secrets)

ใช้ทุก environment:

| Name | คำอธิบาย |
|---|---|
| `DOCKERHUB_USERNAME` | username สำหรับ docker push |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `DISCORD_WEBHOOK` | webhook URL สำหรับ notification |

### Environment `uat_dev_site` — Secrets

| Name | คำอธิบาย |
|---|---|
| `SERVER_HOST` | hostname/IP UAT server |
| `SERVER_USER` | SSH user (เช่น `deploy`) |
| `SERVER_PORT` | SSH port (default 22) — optional |
| `SSH_PRIVATE_KEY` | private key (PEM full content) |
| `COMPOSE_PATH` | path บน server เช่น `/home/deploy/smart-pole` |
| `DATABASE_URL` | `postgresql://USER:PASS@host:5432/db_uat` |
| `JWT_SECRET` | random ≥ 32 chars |
| `MQTT_USERNAME` | backend MQTT subscriber username |
| `MQTT_PASSWORD` | backend MQTT subscriber password |
| `SRS_DVR_TOKEN` | shared secret กับ SRS callback |

### Environment `production` — Secrets

ตัวเดียวกันแต่ใช้ค่า production:

| Name | คำอธิบายเพิ่มเติม |
|---|---|
| `SERVER_HOST` | production hostname |
| `SERVER_USER` | SSH user |
| `SERVER_PORT` | SSH port |
| `SSH_PRIVATE_KEY` | **แยกจาก UAT** |
| `COMPOSE_PATH` | path บน production |
| `DATABASE_URL` | production DB |
| `JWT_SECRET` | **ต่างจาก UAT** — random ≥ 32 chars |
| `MQTT_USERNAME` | production username |
| `MQTT_PASSWORD` | production password |
| `SRS_DVR_TOKEN` | production shared secret |

---

## 5. วิธีที่ workflow ใช้ secrets/vars

```yaml
# Build args (ตอน Docker build)
build-args: |
  NEXT_PUBLIC_API_URL=${{ vars.NEXT_PUBLIC_API_URL }}      # 🟢 vars
  NEXT_PUBLIC_PROJECT_PREFIX=${{ vars.NEXT_PUBLIC_PROJECT_PREFIX }}

# SSH script — สร้าง backend/.env on-the-fly
cat > backend/.env << EOF
NODE_ENV=production
DATABASE_URL=${{ secrets.DATABASE_URL }}                   # 🔴 secret
JWT_SECRET=${{ secrets.JWT_SECRET }}
JWT_ACCESS_EXPIRES=${{ vars.JWT_ACCESS_EXPIRES || '15m' }} # 🟢 vars
CORS_ORIGIN=${{ vars.CORS_ORIGIN }}
MQTT_USERNAME=${{ secrets.MQTT_USERNAME }}                 # 🔴 secret
MQTT_PASSWORD=${{ secrets.MQTT_PASSWORD }}
LOG_LEVEL=${{ vars.LOG_LEVEL || 'info' }}
EOF
```

> **กฎ:** ค่าใดก็ตามที่ frontend bundle (`NEXT_PUBLIC_*`) จะถูก inline ลง JS — ใส่ `vars` ไม่ต้อง secret
> ค่าอะไรที่ใช้ฝั่ง backend หรือ login ที่ host — ใช้ `secrets`

---

## 6. Branch Protection (Settings → Branches)

### `main`
- ✅ Require pull request before merging
- ✅ Require approvals: **1**
- ✅ Require status checks: `Backend · typecheck + test`, `Frontend · typecheck`, `Secret leak scan`
- ✅ Require branches up to date
- ❌ Allow force pushes / deletions

### `uat-dev`
- ✅ Require status checks (เหมือน main)
- ❌ Allow force pushes

---

## 7. Pre-flight Checklist

```bash
# 1. ไม่มี .env หลุด history
git log --all --full-history -- backend/.env frontend/.env.local   # ต้องว่าง

# 2. .gitignore ครอบคลุม secret
git check-ignore .env .env.production secrets/                      # ต้อง print path

# 3. Docker build ผ่าน (local test)
docker build -t test backend/
docker build -t test frontend/ \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:7766 \
  --build-arg NEXT_PUBLIC_WS_URL=ws://localhost:7766/ws \
  --build-arg NEXT_PUBLIC_HLS_BASE=http://localhost:7780 \
  --build-arg NEXT_PUBLIC_PROJECT_PREFIX=smart-pole-test

# 4. TypeScript + test pass
cd backend && bunx tsc --noEmit && bun test --pattern '*.service.test.ts'
cd frontend && bunx tsc --noEmit
```

---

## 8. First Deploy (UAT)

```bash
# บน UAT host
ssh deploy@uat.smart-pole.example.com
mkdir -p /home/deploy/smart-pole/data/{uploads,recordings,mosquitto/{data,log}}
cd /home/deploy/smart-pole

# Mosquitto password file (production auth)
docker run --rm -v $(pwd)/infra/mosquitto/config:/mosquitto/config \
  eclipse-mosquitto:2 mosquitto_passwd -b -c /mosquitto/config/passwordfile \
  backend-subscriber __PASSWORD__

# จากนั้น push branch uat-dev → workflow รันอัตโนมัติ
# workflow จะสร้าง backend/.env บน server เอง
```

---

## 9. Rollback

```bash
ssh deploy@host
cd /home/deploy/smart-pole

# Pull image tag เก่า (workflow ใช้ tag = uat-dev / prod-latest, แต่ build cache มี SHA)
# วิธี: rerun workflow เดิม (Actions → re-run) หรือ
docker compose pull
docker compose up -d --force-recreate
```

---

## 10. Workflows

| ไฟล์ | trigger | จุดประสงค์ |
|---|---|---|
| `.github/workflows/ci.yml` | push/PR ทุก branch | typecheck + test + gitleaks |
| `.github/workflows/uat-dev.yml` | push to `uat-dev` | path-filter + build + deploy + Discord |
| `.github/workflows/production.yml` | push to `main` (manual approval) | build + DB backup + migrate + deploy |
| `.github/dependabot.yml` | weekly | npm + docker + actions updates |

---

## 11. Discord Notification

Webhook ส่ง notification ที่:
- 🔵 Build Started
- 🟣 Deploying
- 🟢 Deploy Completed
- 🔴 Deploy Failed (พร้อม FAILED_STEP)

ตั้ง `DISCORD_WEBHOOK` เป็น Repository Secret (ไม่ต้องแยก env)

---

## 12. Mosquitto + SRS Streaming (เพิ่มเติมจาก PMK)

โปรเจคนี้รวม services นอกจาก backend/frontend:

### Mosquitto MQTT broker
- Image: `eclipse-mosquitto:2`
- Port: `1883` (TCP) + `9001` (WebSocket)
- Config: `infra/mosquitto/config/mosquitto.conf` (commit ใน repo)
- ACL: `infra/mosquitto/config/aclfile` (commit ใน repo)
- Password: `infra/mosquitto/config/passwordfile` (✋ **gitignored** — workflow generate ครั้งแรก)

### SRS streaming server
- Image: `ossrs/srs:5`
- Port: `1935` (RTMP ingest) + `8080` (HLS playback) + `1985` (HTTP API)
- Config: `infra/srs/srs.conf` (commit ใน repo)
- Recordings: `data/recordings/` (volume — gitignored)

### Workflow handles automatically:

1. **First deploy:** สร้าง Mosquitto password file จาก secret `MQTT_USERNAME`/`MQTT_PASSWORD`
2. **ทุก deploy:** SCP `infra/` → server, แล้วส่ง `SIGHUP` ให้ Mosquitto + SRS reload config (ไม่ต้อง restart)
3. **Health check:** ตรวจ Mosquitto port 1883 + SRS HTTP API port 1985 (ผ่าน `vars.SRS_API_PORT`)
4. **Volume permissions:** `chmod -R 777` ให้ `data/{uploads,recordings,mosquitto/{data,log}}` (เฉพาะ host volume)

### หากต้องเปลี่ยน Mosquitto password ระหว่าง runtime:

```bash
# update secret ใน GitHub
# rerun workflow → จะ overwrite passwordfile (ไม่สร้างใหม่)
```

### หากต้องลบ Mosquitto password file (force regenerate):

```bash
ssh deploy@host
rm /home/deploy/smart-pole/infra/mosquitto/config/passwordfile
# rerun workflow
```
