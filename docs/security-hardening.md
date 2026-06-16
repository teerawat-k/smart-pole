# Security Hardening — Smart Pole

> สรุปมาตรการ security ที่ apply ใน production + วิธี maintain / rotate / verify
> สร้าง: 2026-06-17 หลัง P0 hardening session  
> อัปเดต: เพิ่ม entry ใหม่ด้านบนเสมอ (ไม่ลบของเก่า — mark `✅ done` + วันที่)

---

## 📋 สรุปสถานะปัจจุบัน

| Layer | Item | Status | Verified |
|---|---|---|---|
| **MQTT** | Mosquitto enforce auth (allow_anonymous=false) | ✅ enforced | 2026-06-17 |
| **MQTT** | Per-pole ACL — pole-X publish smartpole/<X>/# เท่านั้น | ✅ enforced | 2026-06-17 |
| **API** | JWT secret = 256-bit random | ✅ rotated | 2026-06-17 |
| **API** | Rate limit per IP — login 10/min, refresh 20/min | ✅ active | (เดิม) |
| **API** | Rate limit per IP — mutation 60/min, GET 200/min | ✅ active | 2026-06-17 |
| **Pi SSH** | Pi 5 = key-only auth (password disabled) | ✅ active | 2026-06-17 |
| **Pi SSH** | Pi 5 = root login disabled | ✅ active | 2026-06-17 |
| **DB** | Postgres dev password rotated | ⚠️ TBD | — |
| **HTTPS** | Caddy self-signed (waiting for domain) | ⏳ pending | — |
| **Admin** | Default password `12345` rotation | ⚠️ user action | — |

---

## 🔐 (1) Mosquitto Enforce Authentication

### Architecture

```
Pi pole-01 ─── username=pole-01 + password ──→ Mosquitto
Pi pole-02 ─── username=pole-02 + password ──→
                                                │
Backend ─── username=backend-subscriber + pw ──→
                                                │
                                                ▼
                                        passwordfile (PBKDF2-SHA512 hashed)
                                        aclfile     (per-username topic ACL)
```

### Config files

**`infra/mosquitto/config/mosquitto.conf`** (committed):
```conf
allow_anonymous false
password_file /mosquitto/config/passwordfile
acl_file /mosquitto/config/aclfile
```

**`infra/mosquitto/config/aclfile`** (committed):
```
# Backend — read all
user backend-subscriber
topic readwrite smartpole/#

# Per-pole — username = pole name (publish ของตัวเองเท่านั้น)
pattern readwrite smartpole/%u/#
```

**`infra/mosquitto/config/passwordfile`** (**gitignored** — only on DO server):
```
backend-subscriber:$7$1000$<salt>$<hash>
pole-01:$7$1000$<salt>$<hash>
```

### เพิ่ม pole ใหม่ + generate password

```bash
# 1. Generate strong random password
NEW_PASS=$(openssl rand -hex 16)
echo "pole-XX password: $NEW_PASS"   # save to vault!

# 2. Add to mosquitto passwordfile (PBKDF2-SHA512 hashed)
ssh root@152.42.242.162 "
docker run --rm \
  -v /var/www/smart-pole/infra/mosquitto/config:/conf \
  eclipse-mosquitto:2 \
  mosquitto_passwd -b /conf/passwordfile pole-XX '$NEW_PASS'

# 3. Fix permission (mosquitto user reads)
chmod 644 /var/www/smart-pole/infra/mosquitto/config/passwordfile

# 4. Reload mosquitto config (no restart)
docker compose -f /var/www/smart-pole/docker-compose.yml kill -s HUP mosquitto
"

# 5. Update Pi main.py credentials
ssh pi@<pi-host> "sed -i 's|^USERNAME .*|USERNAME = \"pole-XX\"|' /home/pi/smartpole/main.py
                   sed -i 's|^PASSWORD .*|PASSWORD = \"$NEW_PASS\"|' /home/pi/smartpole/main.py
                   sudo systemctl restart smartpole"
```

### Verify
```bash
# Wrong creds → reject
docker run --rm --network smart-pole-network eclipse-mosquitto:2 \
  mosquitto_pub -h mosquitto -u wrong -P wrong -t test -m hi
# Expected: "Connection Refused: not authorised"
```

### Rotate backend-subscriber password

```bash
# 1. Generate
NEW=$(openssl rand -hex 16)

# 2. Update passwordfile
ssh root@152.42.242.162 "
docker run --rm -v /var/www/smart-pole/infra/mosquitto/config:/conf eclipse-mosquitto:2 \
  mosquitto_passwd -b /conf/passwordfile backend-subscriber '$NEW'
"

# 3. Update backend env + force recreate
ssh root@152.42.242.162 "
cd /var/www/smart-pole
sed -i 's|^MQTT_PASSWORD=.*|MQTT_PASSWORD=$NEW|' backend/.env
docker compose up -d --force-recreate backend
"

# 4. Update GitHub repo secret MQTT_PASSWORD (manual via UI)
#    เพื่อให้ first-deploy ใหม่ใช้ค่าเดียวกัน
```

---

## 🔑 (2) JWT Secret Rotation

### Why rotate

- ทุก JWT access + refresh token ที่ออกอยู่ใน production ถูก invalidate → user re-login
- ทำเมื่อ: สงสัย leak / dev secret ค้างใน prod / policy quarterly rotation

### Generate strong secret

```bash
# 256-bit (64 bytes) random — encoded as 128 hex chars
NEW_JWT=$(openssl rand -hex 64)
echo "JWT_SECRET length: ${#NEW_JWT}"   # → 128
```

### Apply rotation

```bash
# 1. Pipe value via stdin (กัน Git Bash on Windows convert /path → C:/Program Files/Git/...)
echo "JWT_SECRET=$NEW_JWT" | ssh root@152.42.242.162 'cat > /tmp/jwt.tmp && \
  cd /var/www/smart-pole && \
  KEY=$(cut -d= -f1 < /tmp/jwt.tmp) && \
  VAL=$(cut -d= -f2- < /tmp/jwt.tmp) && \
  sed -i "s|^${KEY}=.*|${KEY}=${VAL}|" backend/.env && \
  rm /tmp/jwt.tmp && \
  grep "^${KEY}=" backend/.env | head -c 20'

# 2. Force recreate backend (reload env_file)
ssh root@152.42.242.162 'cd /var/www/smart-pole && docker compose up -d --force-recreate backend'

# 3. Update GitHub repo secret JWT_SECRET (manual via UI)
```

### Side effects

- Existing access tokens → 401 (invalid signature)
- Existing refresh tokens → 401 → user redirect /login
- Active WS connections via JWT → auto-reconnect → fail JWT verify → close

### Verify

```bash
# JWT_SECRET length on container
ssh root@152.42.242.162 'docker exec smart-pole-backend printenv JWT_SECRET | wc -c'
# Expected: 129 (128 chars + newline)
```

---

## 🔒 (3) SSH Hardening — Pi 5 (key-only)

### Config

`/etc/ssh/sshd_config.d/00-pole-hardening.conf` (สร้างผ่าน migrate-pi.sh):

```
PasswordAuthentication no
ChallengeResponseAuthentication no
PubkeyAuthentication yes
PermitRootLogin no
PermitEmptyPasswords no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
```

### Setup SSH key (initial)

```bash
# From dev machine (where ~/.ssh/id_ed25519 exists)
PUBKEY=$(cat ~/.ssh/id_ed25519.pub)

# Via plink (Windows) — needs password ONE TIME
"/c/Program Files/PuTTY/plink.exe" -batch -pw '<pi-password>' \
  -hostkey "<expected-ed25519-fingerprint>" \
  pi@<pi-ip> "
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo '$PUBKEY' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
"

# Verify key auth works
ssh -o BatchMode=yes pi@<pi-ip> 'whoami'
# Expected: pi

# Then apply hardening config (via key)
ssh pi@<pi-ip> "echo '<pi-password>' | sudo -S tee /etc/ssh/sshd_config.d/00-pole-hardening.conf << 'EOF'
PasswordAuthentication no
...
EOF
sudo systemctl restart ssh"
```

### Verify

```bash
# Password rejected
plink -batch -pw 'wrong' pi@<ip> 'echo'
# Expected: "No supported authentication methods available (server sent: publickey)"

# Key still works
ssh -o BatchMode=yes pi@<ip> 'whoami'
# Expected: pi
```

### Add new key (e.g. ops team member)

```bash
# จาก dev machine ที่ trust key อยู่แล้ว
NEW_KEY="<new-ops-pubkey>"
ssh pi@<ip> "echo '$NEW_KEY' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

### Remove access (offboarding)

```bash
ssh pi@<ip> "sed -i '/<email-or-comment-of-key>/d' ~/.ssh/authorized_keys"
```

---

## 🚦 (4) Global API Rate Limit

### Tiered limits

| Endpoint | Rate Limit | Why |
|---|---|---|
| `POST /api/auth/login` | 10 req/min per IP | กัน brute-force credentials |
| `POST /api/auth/refresh` | 20 req/min per IP | high traffic, but DDoS-able |
| `POST/PATCH/PUT/DELETE /api/*` | 60 req/min per IP | mutation cost (DB write) |
| `GET /api/*` | 200 req/min per IP | read-heavy, allow polling |

### Skip list (ไม่ rate limit)

- `/health`, `/health/ready` — system check
- `/metrics` — Prometheus scrape (internal network)
- `/uploads/*`, `/swagger` — static / API doc
- `OPTIONS *` — CORS preflight

### Code structure

```
backend/src/common/middleware/
├── rate-limit.ts            ← core: enforceRateLimit() + bucket map
├── global-rate-limit.ts     ← Elysia plugin: onRequest hook (per IP)
```

`enforceRateLimit(identity, opts)` throws `RateLimitError` (429) เมื่อเกิน

### Verify

```bash
# Hit 250 requests fast → expect ~50 returning 429
for i in $(seq 1 250); do
  curl -sk -o /dev/null -w "%{http_code} " https://152.42.242.162/api/poles
done | tr ' ' '\n' | sort | uniq -c
# Expected: 200×401 + 50×429
```

### Future: Multi-instance backend

Current: in-memory `Map<string, Bucket>` — works for single-instance dev/UAT  
Production scale: switch to Redis backend (replace `enforceRateLimit` impl, no API change)

---

## 🛡️ (5) CI/CD Safeguards (deploy pipeline)

### Pinned action versions

```yaml
# .github/workflows/uat-dev.yml
appleboy/scp-action@v0.1.7    # was @master (broken 2026-06-16)
appleboy/ssh-action@v1.0.3    # was @master
+ timeout: 60s + command_timeout: 10m
```

### `.env` rotation preservation

CI deploy script:
```bash
if [ ! -s backend/.env ]; then
  # First deploy — create from GitHub secrets
  cat > backend/.env << EOF ... EOF
else
  # Subsequent deploys — preserve manual rotation
  echo "preserving current backend/.env"
fi
```

หมายเหตุ: ถ้าต้องการ rotate ผ่าน CI:
1. SSH เข้า server: `rm /var/www/smart-pole/backend/.env`
2. Update GitHub repo secrets
3. Trigger workflow_dispatch → CI recreate .env

### Verify mosquitto using `.env` (not stale secrets)

```bash
# CI deploy script
MQTT_USER=$(grep '^MQTT_USERNAME=' backend/.env | cut -d= -f2-)
MQTT_PASS=$(grep '^MQTT_PASSWORD=' backend/.env | cut -d= -f2-)
docker exec smart-pole-mosquitto mosquitto_sub -u "$MQTT_USER" -P "$MQTT_PASS" ...
# warning-only (non-fatal) — ถ้า binary missing หรือ transient timing
```

### Backend health check — retry 6× (max 30s)

```bash
for i in 1 2 3 4 5 6; do
  curl -fsS http://localhost:7766/health/ready && break
  sleep 5
done
```

---

## 🚨 Threat Model + Mitigation Coverage

| Threat | Mitigation | Coverage |
|---|---|---|
| Login brute-force | Rate limit (10/min) + lockout policy | ✅ |
| Stolen JWT | Short access expiry (15m) + refresh rotation | ✅ |
| MQTT spoofing (เสียบ Pi เทียม) | enforce auth + per-pole ACL | ✅ |
| Cross-pole publish | ACL pattern `smartpole/%u/#` | ✅ |
| SSH brute-force Pi | key-only + MaxAuthTries 3 | ✅ |
| API DDoS | rate limit per IP (mutation 60, GET 200) | ✅ |
| SQL injection | Prisma parameterized queries | ✅ (framework) |
| XSS | React escape default + CSP via security-headers | ⚠️ partial (CSP TBD) |
| MQTT secret leak in repo | gitignore passwordfile + dev placeholder | ✅ |
| JWT secret leak in repo | Never commit `.env` | ✅ |
| Captcha bypass | sessionKey + expiry + cleanup | ✅ |
| Self-signed cert (dev/UAT) | accept warning manually → upgrade Let's Encrypt | ⏳ pending domain |
| Audit log gap | userId nullable for system events | ✅ (2026-06-12 fix) |

---

## 📋 Manual rotation Checklist (Quarterly)

ทำทุก 3 เดือน หรือเมื่อสงสัย secret leak:

```
[ ] JWT_SECRET rotate (256-bit) — all users re-login
[ ] MQTT backend-subscriber password rotate
[ ] MQTT pole-01..pole-NN passwords rotate (per-pole, ปรับ Pi เดียวต่อครั้ง)
[ ] Postgres password rotate (DB user — coordinate with backend/.env)
[ ] GitHub repo secrets sync (MQTT_PASSWORD, JWT_SECRET, DATABASE_URL)
[ ] Admin user password rotate (via Dashboard UI)
[ ] Docker Hub token rotate (if compromised) → update GitHub secret
[ ] Server SSH root password rotate (use long random)
[ ] Backup test — verify pg_dump + restore works
```

ขั้นตอนละเอียดดูในแต่ละ section ด้านบน

---

## 🔬 Verify all hardening — One-liner script

```bash
#!/bin/bash
# Run from dev machine — verify production hardening live

set -e
DO=root@152.42.242.162
PI=pi@192.168.1.52

echo "═══ Mosquitto enforce auth ═══"
ssh $DO "docker run --rm --network smart-pole-network eclipse-mosquitto:2 \
  mosquitto_pub -h mosquitto -u wrong -P wrong -t test -m hi 2>&1 | head -1"
# Expected: "Connection Refused: not authorised"

echo "═══ JWT secret ≥ 256-bit ═══"
LEN=$(ssh $DO 'docker exec smart-pole-backend printenv JWT_SECRET | wc -c')
[ "$LEN" -ge 64 ] && echo "  ✓ JWT_SECRET length OK ($LEN bytes)" || echo "  ✗ JWT_SECRET too short"

echo "═══ Pi SSH = key-only ═══"
"/c/Program Files/PuTTY/plink.exe" -batch -pw 'wrong' -ssh $PI 'echo' 2>&1 | grep -q "publickey" \
  && echo "  ✓ Password auth blocked" || echo "  ✗ Password auth still enabled"

echo "═══ Rate limit active ═══"
COUNT_429=$(for i in $(seq 1 250); do
  curl -sk -o /dev/null -w "%{http_code} " https://152.42.242.162/api/poles 2>/dev/null
done | tr ' ' '\n' | grep -c "^429" || true)
[ "$COUNT_429" -ge 1 ] && echo "  ✓ Rate limit fires ($COUNT_429 × 429)" || echo "  ✗ Rate limit not triggering"

echo "═══ Pole-01 sensor active ═══"
ssh $DO "sudo -u postgres psql -d smart_pole -t -c \"
SELECT 'pole-01: ' || \\\"poleStatus\\\" || ' last_reading=' || 
to_char(\\\"latestReadingAt\\\"/1000 * interval '1 second' + timestamp '1970-01-01' + interval '7 hours', 'HH24:MI:SS')
FROM \\\"Pole\\\" WHERE \\\"poleName\\\"='pole-01';
\""
```

---

## 📚 Related Docs

- [decision-log.md](./decision-log.md) — decision history
- [production-readiness.md](./production-readiness.md) — open P0/P1 items
- [deployment/runbook.md](./deployment/runbook.md) — day-to-day ops
- [ci-cd-setup.md](./ci-cd-setup.md) — pipeline overview
- [mqtt-spec.md](./mqtt-spec.md) — topic + payload spec
- [infra/pole-firmware/MIGRATION-CHECKLIST.md](../infra/pole-firmware/MIGRATION-CHECKLIST.md) — Pi hardware swap

---

## 🔄 Change Log

### 2026-06-17 · P0 hardening complete

- Mosquitto enforce auth + per-pole ACL ([commit 3d2f5b3](https://github.com/teerawat-k/smart-pole/commit/3d2f5b3))
- JWT secret rotated to 256-bit
- Pi 5 SSH key-only ([sshd_config.d/00-pole-hardening.conf])
- Global API rate limit (per IP, tiered) ([commit 3d2f5b3])
- CI/CD pipeline pinned + `.env` preserve safeguard ([commits 1fb00b2, 6b47da1, fce014e])

### 2026-06-12 · Audit log FK fix

- `SYSTEM_USER_ID = null` (was 0 → FK violation on heartbeat scan)
- [commit a18afb6]

### 2026-06-12 · Auto-resolve pole_offline alert

- Backend handle-sensor.ts auto-resolves alert เมื่อ pole transitions offline→online
- [commit d7cdef4]
