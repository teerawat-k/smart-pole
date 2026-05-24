# Operational Runbook

> คำสั่ง day-to-day สำหรับ dev / UAT — เก็บ command ที่ใช้ซ้ำๆ ไว้ที่นี่

---

## Dev — เริ่มทำงานทุกครั้ง

### Terminal 1 — Infra (Mosquitto + Postgres)

```powershell
# 1. ตรวจ Postgres รันอยู่ (Windows service)
Get-Service postgresql*

# 2. ตรวจ Docker network สร้างแล้ว
docker network ls | Select-String smart-pole-network
# ถ้าไม่มี:
docker network create smart-pole-network

# 3. รัน Mosquitto
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d mosquitto
```

### Terminal 2 — Backend

```bash
cd backend
bun dev                  # http://localhost:7766 + watch mode
```

ครั้งแรกเท่านั้น:
```bash
bun install
bun db:generate          # generate Prisma client
bun db:deploy            # apply migrations
bun db:seed              # seed admin (admin / 12345) + roles + permissions + 10 poles
```

### Terminal 3 — Frontend

```bash
cd frontend
bun install              # ครั้งแรก
bun dev                  # http://localhost:7765 (port ตั้งใน package.json)
```

### Login dev

- URL: http://localhost:7765/login
- Username: `admin`
- Password: `12345` (จาก [seeds/users.ts](../../backend/prisma/seeds/users.ts))

---

## Dev — Reset Database

```bash
cd backend

# Option A: drop schema + remigrate (preserve migration history)
bun db:deploy --force-reset    # ⚠️ ลบ data ทั้งหมด

# Option B: drop ทั้ง database + create ใหม่
psql -U postgres -c "DROP DATABASE IF EXISTS smart_pole;"
psql -U postgres -c "CREATE DATABASE smart_pole;"
bun db:deploy
bun db:seed
```

---

## Dev — รัน Test

```bash
cd backend

# Unit tests (mock-based)
bun test:unit            # รันผ่าน scripts/run-unit-tests.ts (แยก process กัน mock leak)

# Integration tests (ต่อ DB จริง)
bun test:integration     # ต้องมี Postgres + seed admin ก่อน

# ทั้งหมด (ใช้น้อย — ระวัง mock leak)
bun test:all

# เฉพาะไฟล์
bun test src/modules/pole/flow/generate-credential.test.ts
bun test src/plugins/mqtt/parse-topic.test.ts

# Watch mode
bun test:watch
```

### Frontend test
```bash
cd frontend
bun test                 # vitest (jsdom)
```

---

## Dev — Type Check

```bash
# Backend
cd backend
bunx tsc --noEmit

# Frontend
cd frontend
bunx tsc --noEmit
```

หลังเสร็จงานต้อง 0 errors ทั้งคู่ (ดู [00-root-CLAUDE.md](../../CLAUDE.md))

---

## Dev — Add New Prisma Migration

```bash
cd backend

# 1. แก้ schema.prisma
# 2. dev workflow: push schema → DB เพื่อทดสอบ
bunx prisma db push --config prisma/prisma.config.ts

# 3. ทดสอบเสร็จ → สร้าง migration formal
bun db:migrate           # = bunx prisma migrate dev --config prisma/prisma.config.ts
                          # จะ prompt ชื่อ migration

# 4. commit migration folder
git add prisma/migrations/<timestamp>_<name>/
```

---

## Dev — ทดสอบ MQTT Manually

```powershell
# Publish sensor packet จาก PowerShell
$ts = [int][DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$json = '{"timestamp":' + $ts + ',"seq":1,"pm25":35.2,"temperature":33.1,"humidity":74.5}'
$json | & "C:\Program Files\mosquitto\mosquitto_pub.exe" -h localhost -p 7783 -t "smartpole/pole-01/sensor" -l

# Subscribe ดูทุก message
& "C:\Program Files\mosquitto\mosquitto_sub.exe" -h localhost -p 7783 -t "smartpole/#" -v
```

หรือ Bash:
```bash
mosquitto_pub -h localhost -p 7783 \
  -t "smartpole/pole-01/sensor" \
  -m '{"timestamp":1777348800000,"seq":1,"pm25":35.2,"temperature":33.1,"humidity":74.5}'

mosquitto_sub -h localhost -p 7783 -t "smartpole/#" -v
```

---

## UAT — Deploy

### Push image (CI/CD ตามปกติ)

ดู [../ci-cd-setup.md](../ci-cd-setup.md) — GitHub Actions build + push บน merge to `uat-dev`

### Manual deploy บน UAT server

```bash
# SSH เข้า UAT server (152.42.242.162)
ssh deploy@152.42.242.162

cd /opt/smart-pole

# 1. Pull image ใหม่
docker compose pull

# 2. Apply migration (รันใน container แล้ว exit)
docker compose run --rm backend bun db:deploy

# 3. Restart services
docker compose up -d

# 4. ตรวจ health
curl http://localhost:7766/health           # liveness
curl http://localhost:7766/health/ready     # readiness (เช็ค DB)
curl http://localhost:7765/api/health       # frontend
```

### Tail logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mosquitto
```

---

## UAT — Stop / Restart

```bash
# Graceful stop ทุก service
docker compose stop

# Restart 1 service
docker compose restart backend

# Stop + remove containers (volumes คง — data ไม่หาย)
docker compose down

# Stop + remove containers + volumes (⚠️ data หาย!)
docker compose down -v
```

---

## UAT — Backup

```bash
# Postgres dump
pg_dump -U postgres smart_pole | gzip > backup_$(date +%Y%m%d).sql.gz

# Camera clips (rsync ไปเครื่องอื่น)
rsync -avz /opt/smart-pole/data/uploads/ backup@nas:/backup/smart-pole/uploads/

# Mosquitto persistent
tar czf mosquitto_$(date +%Y%m%d).tar.gz /opt/smart-pole/data/mosquitto/
```

---

## UAT — Restore

```bash
# Postgres
gunzip < backup_20260524.sql.gz | psql -U postgres smart_pole

# Camera clips
rsync -avz backup@nas:/backup/smart-pole/uploads/ /opt/smart-pole/data/uploads/
```

---

## Incident Response

### Backend ไม่ตอบ
```bash
# 1. ตรวจ health
curl http://localhost:7766/health

# 2. ตรวจ container status
docker ps | grep backend

# 3. ตรวจ logs
docker compose logs --tail 100 backend

# 4. ถ้า DB ปัญหา
curl http://localhost:7766/health/ready

# 5. Restart
docker compose restart backend
```

### MQTT packet ไม่เข้า DB
```bash
# 1. ทดสอบ MQTT broker
mosquitto_sub -h localhost -p 7783 -t "smartpole/#" -v

# 2. ทดสอบ publish จาก console
mosquitto_pub -h localhost -p 7783 -t "smartpole/pole-01/sensor" -m '{"timestamp":...}'

# 3. ตรวจ backend log — หา "MQTT sensor: pole not found" หรือ "validation failed"
docker compose logs backend | grep MQTT

# 4. ตรวจ pole exists ใน DB
psql -U postgres smart_pole -c "SELECT id, poleName, deletedAt FROM \"Pole\" WHERE poleName = 'pole-01';"
```

### Pole offline แต่ Pi รัน
```bash
# 1. ตรวจ Pi MQTT connect (ssh เข้า Pi)
sudo systemctl status smartpole
sudo journalctl -u smartpole -f

# 2. ตรวจ topic format — ต้องเป็น smartpole/<poleName>/sensor (v2)
# 3. ตรวจ MQTT credential ถูกต้อง — ลอง regenerate ผ่าน UI
```

### Disk เต็ม (camera clips)
```bash
# ตรวจการใช้
du -sh /opt/smart-pole/data/uploads/camera/*

# ลบ clip เก่ากว่า 30 วัน
find /opt/smart-pole/data/uploads/camera -type f -name "*.mp4" -mtime +30 -delete

# TODO: setup cron job auto-cleanup
```

---

## Git Workflow

```bash
# Branch ปัจจุบันใน dev: uat-dev
git checkout uat-dev
git pull --ff-only origin uat-dev

# สร้าง branch feature
git checkout -b feat/<scope>-<short-name>

# Commit ตาม convention
git commit -m "feat(pole): add maintenance reason field"

# Push + PR ไป uat-dev (ไม่ใช่ main)
git push -u origin feat/<scope>-<short-name>
```

⚠️ ใน Claude Code shell **push ไม่ได้** เพราะ Git Credential Manager ต้องการ popup → ต้องรัน git push ใน terminal Windows ปกติ

---

## ดูเพิ่ม

- Services + volumes: [./docker-services.md](./docker-services.md)
- Port mapping: [./ports.md](./ports.md)
- Env variables: [./env-vars.md](./env-vars.md)
- CI/CD pipeline: [../ci-cd-setup.md](../ci-cd-setup.md)
- Production readiness items: [../production-readiness.md](../production-readiness.md)
