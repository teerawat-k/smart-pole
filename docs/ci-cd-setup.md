# CI/CD Setup Guide

> ขั้นตอนที่ต้องทำใน GitHub repo + secrets + branch protection ก่อนเปิด CI/CD

---

## 1. Branch Strategy

```
main         ← production (protected, deploy ผ่าน workflow_dispatch หรือ merge)
└── uat-dev  ← UAT auto-deploy ทุก push
    └── feature/* / fix/* / chore/*
```

---

## 2. GitHub Secrets ที่ต้องตั้ง

ไปที่ **Settings → Secrets and variables → Actions**

### Secrets ทั่วไป (Repository secrets)

| Name | ตัวอย่างค่า | ใช้ที่ |
|---|---|---|
| `DOCKERHUB_USERNAME` | `teerawatk` | build-and-push |
| `DOCKERHUB_TOKEN` | Docker Hub access token | build-and-push |

### Secrets ของ UAT (Environment: `uat-dev`)

ไปที่ **Settings → Environments → New environment** ชื่อ `uat-dev`

| Name | ตัวอย่างค่า |
|---|---|
| `UAT_HOST` | `uat.smart-pole.example.com` |
| `UAT_USER` | `deploy` |
| `UAT_SSH_KEY` | private key (PEM, full content) |
| `UAT_DEPLOY_PATH` | `/home/deploy/smart-pole` |
| `UAT_NEXT_PUBLIC_API_URL` | `https://api-uat.smart-pole.example.com` |
| `UAT_NEXT_PUBLIC_WS_URL` | `wss://api-uat.smart-pole.example.com/ws` |
| `UAT_NEXT_PUBLIC_HLS_BASE` | `https://stream-uat.smart-pole.example.com` |

### Secrets ของ Production (Environment: `production`)

สร้าง environment `production` + ตั้ง **Required reviewers** (อย่างน้อย 1 คน)

| Name | ตัวอย่างค่า |
|---|---|
| `PROD_HOST` | `smart-pole.example.com` |
| `PROD_USER` | `deploy` |
| `PROD_SSH_KEY` | private key (PEM) — แยกจาก UAT |
| `PROD_DEPLOY_PATH` | `/opt/smart-pole` |
| `PROD_NEXT_PUBLIC_API_URL` | `https://api.smart-pole.example.com` |
| `PROD_NEXT_PUBLIC_WS_URL` | `wss://api.smart-pole.example.com/ws` |
| `PROD_NEXT_PUBLIC_HLS_BASE` | `https://stream.smart-pole.example.com` |

---

## 3. Environment Variables บน Host (ไม่ผ่าน GitHub Secrets)

ค่าเหล่านี้อยู่ใน `.env` ของแต่ละ host (mounted via `env_file`):

### Backend (`backend/.env` บน UAT/Production host)

| Key | ดู template |
|---|---|
| `NODE_ENV` | `staging` / `production` |
| `PORT` | `7766` |
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | random ≥ 32 chars (แยกแต่ละ env) |
| `JWT_ACCESS_EXPIRES` | `15m` |
| `JWT_REFRESH_EXPIRES` | `7d` |
| `CORS_ORIGIN` | URL ของ frontend |
| `UPLOAD_DIR` | `data/uploads` |
| `RECORDINGS_DIR` | `data/recordings` |
| `MQTT_BROKER_URL` | `mqtt://mosquitto:1883` (UAT) / `mqtts://...:8883` (Prod) |
| `MQTT_USERNAME` | backend subscriber username |
| `MQTT_PASSWORD` | backend subscriber password |
| `MQTT_CLIENT_ID` | unique per environment |
| `MQTT_TIMESTAMP_DRIFT_MAX_SEC` | `300` |
| `POLE_OFFLINE_THRESHOLD_MINUTES` | `5` |
| `SRS_HLS_BASE` | URL HLS playback |
| `SRS_DVR_TOKEN` | shared secret กับ SRS |
| `LOG_LEVEL` | `info` (UAT) / `warn` (Prod) |

> Template: `backend/.env.uat.example`, `backend/.env.production.example`

### Frontend (build-time only — inject ตอน Docker build)

| Key | ผ่าน |
|---|---|
| `NEXT_PUBLIC_API_URL` | GitHub secret → Docker build-arg |
| `NEXT_PUBLIC_WS_URL` | GitHub secret → Docker build-arg |
| `NEXT_PUBLIC_HLS_BASE` | GitHub secret → Docker build-arg |
| `NEXT_PUBLIC_PROJECT_PREFIX` | hardcoded ใน workflow |

> **สำคัญ:** Next.js inline `NEXT_PUBLIC_*` ตอน build — ต้อง rebuild image ถ้า URL เปลี่ยน

---

## 4. Branch Protection (Settings → Branches)

### `main`
- ✅ Require pull request before merging
- ✅ Require approvals: **1**
- ✅ Dismiss stale reviews on new commits
- ✅ Require status checks: `Backend · typecheck + test`, `Frontend · typecheck`, `Secret leak scan (gitleaks)`
- ✅ Require branches up to date before merging
- ❌ Allow force pushes
- ❌ Allow deletions
- ❌ Allow bypass

### `uat-dev`
- ✅ Require pull request (จาก feature branches)
- ✅ Require status checks: เหมือน main
- ❌ Allow force pushes

---

## 5. Pre-flight Checklist ก่อน enable workflow

```bash
# 1. Lockfile ครบ
ls backend/bun.lock frontend/bun.lock                              # ทั้งคู่ต้องมี

# 2. ไม่มี .env หลุด history
git log --all --full-history -- backend/.env frontend/.env.local   # ต้องว่าง

# 3. .gitignore ครอบคลุม secret
git check-ignore .env .env.production secrets/                      # ต้อง print path

# 4. Docker build ผ่าน
docker build -t test backend/
docker build -t test frontend/ \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:7766 \
  --build-arg NEXT_PUBLIC_WS_URL=ws://localhost:7766/ws \
  --build-arg NEXT_PUBLIC_HLS_BASE=http://localhost:7780 \
  --build-arg NEXT_PUBLIC_PROJECT_PREFIX=smart-pole-test

# 5. TypeScript + test pass
cd backend && bunx tsc --noEmit && bun test --pattern '*.service.test.ts'
cd frontend && bunx tsc --noEmit
```

---

## 6. ขั้นตอน First Deploy (UAT)

```bash
# บน UAT host
ssh deploy@uat.smart-pole.example.com

mkdir -p /home/deploy/smart-pole/backups
cd /home/deploy/smart-pole

# 1. ใส่ .env ของ backend + frontend (ใช้ template เป็นแบบ)
nano backend/.env             # คัด backend/.env.uat.example
nano frontend/.env.local      # คัด frontend/.env.uat.example

# 2. เตรียม mosquitto password file
docker run --rm -v $(pwd)/infra/mosquitto/config:/mosquitto/config \
  eclipse-mosquitto:2 mosquitto_passwd -b -c /mosquitto/config/passwordfile \
  backend-subscriber __PASSWORD__

# 3. Login docker
docker login -u $DOCKERHUB_USERNAME -p $DOCKERHUB_TOKEN

# 4. Push branch uat-dev → workflow รันอัตโนมัติ
```

---

## 7. Rollback

```bash
# ใช้ image tag เดิม (workflow tag = uat-{sha} / prod-{sha})
ssh deploy@host
cd /opt/smart-pole
export IMAGE_TAG=prod-<previous-sha>
docker compose pull && docker compose up -d --force-recreate
```

---

## 8. Workflows ในโปรเจค

| ไฟล์ | trigger | จุดประสงค์ |
|---|---|---|
| `.github/workflows/ci.yml` | push/PR ทุก branch | typecheck + test + secret scan |
| `.github/workflows/uat-dev.yml` | push to `uat-dev` | build → push → deploy UAT |
| `.github/workflows/production.yml` | push to `main` (manual approval) | build → backup DB → migrate → deploy production |
| `.github/dependabot.yml` | weekly | npm + docker + actions updates |

---

## 9. Monitoring Post-Deploy

หลัง deploy ควรเช็ค:

```bash
# Health
curl -fsS https://api-uat.smart-pole.example.com/health/ready

# Logs
docker compose logs -f --tail 100 backend frontend

# DB migrations applied
docker compose run --rm backend bunx prisma migrate status --config prisma/prisma.config.ts

# MQTT broker accepting connections
mosquitto_sub -h broker -p 1883 -u backend-subscriber -P "$MQTT_PASSWORD" -t '$SYS/broker/uptime' -C 1
```
