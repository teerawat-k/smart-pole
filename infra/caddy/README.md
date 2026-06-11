# Caddy reverse proxy — HTTPS termination

Caddy nginx-style reverse proxy ทำหน้าที่:
- HTTPS termination ที่ port 443
- HTTP → HTTPS redirect ที่ port 80
- Reverse proxy ไป backend/frontend/SRS/WebSocket

## Architecture

```
                ┌─────────────────────────────────┐
   internet     │       Caddy (port 80 + 443)     │
   ────────────▶│  ┌───────────────────────────┐  │
                │  │ TLS termination           │  │
                │  └───┬───────────────────────┘  │
                │      │ /api/*  → backend:7766   │
                │      │ /ws*    → backend:7766   │
                │      │ /hls/*  → srs:8080       │
                │      │ /       → frontend:7765  │
                └──────┴──────────────────────────┘
```

## Mode: IP-based self-signed cert (current)

ใช้ `tls internal` — Caddy generate self-signed cert จาก local CA

**ข้อดี:**
- ไม่ต้องมี domain
- ใช้งานได้ทันที
- traffic encrypted จริง (TLS 1.3)

**ข้อเสีย:**
- Browser แสดง warning ครั้งแรก ("Connection not private")
- ต้องคลิก "Advanced → Proceed" (1 ครั้งต่อ browser)
- iOS Safari + Android Chrome อาจไม่ยอม proceed ในบาง version

### กำจัด browser warning (optional)

Import Caddy root CA cert ที่เครื่อง:

```bash
# 1. ดึง root CA จาก server
scp root@152.42.242.162:/var/www/smart-pole/volumes/caddy-data/caddy/pki/authorities/local/root.crt ./caddy-root.crt

# 2. Install (Windows)
certutil -addstore -f "ROOT" caddy-root.crt

# Linux
sudo cp caddy-root.crt /usr/local/share/ca-certificates/caddy-root.crt
sudo update-ca-certificates

# macOS
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain caddy-root.crt
```

## Upgrade: Let's Encrypt cert (production)

เมื่อมี domain พร้อม → swap 4 ขั้น:

### 1. ตั้ง DNS A record

```
smartpole.your-domain.com.    IN    A    152.42.242.162
api.smartpole.your-domain.com IN    A    152.42.242.162   (optional — ถ้าจะแยก subdomain)
```

### 2. แก้ Caddyfile

```caddyfile
# เดิม:
152.42.242.162:443 {
    tls internal
    ...

# ใหม่:
smartpole.your-domain.com {
    # ลบ tls internal ออก — Caddy auto-issue Let's Encrypt
    ...
```

### 3. ตั้ง email ใน Caddy (สำหรับ expiry notification)

```caddyfile
{
    email admin@your-domain.com
    # Optional: production ACME (เริ่มจาก staging แล้วค่อย switch)
    # acme_ca https://acme-staging-v02.api.letsencrypt.org/directory
}
```

### 4. Restart Caddy

```bash
ssh root@152.42.242.162 "cd /var/www/smart-pole && docker compose restart caddy"
docker compose logs -f caddy | grep -E 'obtain|certificate'
```

Caddy จะทำ HTTP-01 challenge ผ่าน port 80 → ออก cert ครบใน ~30 วินาที

## Update GitHub vars (สำหรับ frontend rebuild)

หลัง Caddy ขึ้น → ต้อง rebuild frontend ด้วย HTTPS URLs:

```bash
# Repository Settings → Secrets and variables → Actions → Variables tab
# แก้ 3 ตัว:

# เดิม:
NEXT_PUBLIC_API_URL=http://152.42.242.162:7766
NEXT_PUBLIC_WS_URL=ws://152.42.242.162:7766/ws
NEXT_PUBLIC_HLS_BASE=http://152.42.242.162:7780

# ใหม่ (IP mode):
NEXT_PUBLIC_API_URL=https://152.42.242.162
NEXT_PUBLIC_WS_URL=wss://152.42.242.162/ws
NEXT_PUBLIC_HLS_BASE=https://152.42.242.162/hls

# ใหม่ (domain mode — เมื่อ swap แล้ว):
NEXT_PUBLIC_API_URL=https://smartpole.your-domain.com
NEXT_PUBLIC_WS_URL=wss://smartpole.your-domain.com/ws
NEXT_PUBLIC_HLS_BASE=https://smartpole.your-domain.com/hls
```

แล้ว push commit ใดก็ได้เพื่อ trigger frontend rebuild

## Update backend CORS_ORIGIN

```bash
# SSH ไป DO แก้ /var/www/smart-pole/backend/.env:
CORS_ORIGIN=https://152.42.242.162

# หรือ domain mode:
CORS_ORIGIN=https://smartpole.your-domain.com

# restart backend
docker compose restart backend
```

## Troubleshooting

### Caddy start fail
```bash
docker compose logs caddy | tail -50
```

### Port 80/443 already in use
```bash
ss -tlnp | grep -E ':80 |:443 '
# kill conflicting process
```

### Browser stuck loading หลัง update GH vars
```bash
# Frontend ยังไม่ rebuild — รอ CI หรือ:
docker compose pull frontend && docker compose up -d frontend
```

### Let's Encrypt failed: "no valid challenge"
```bash
# ตรวจ DNS resolve ถูก IP ไหม
dig smartpole.your-domain.com +short
# ต้องเห็น 152.42.242.162

# ตรวจ port 80 เปิดให้ public ไหม
curl -I http://152.42.242.162
```
