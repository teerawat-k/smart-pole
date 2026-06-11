# nginx HTTPS reverse proxy

Server เป็น shared host (BUFFTECH-SERVER) — nginx (native) ครอง 80/443 อยู่แล้ว สำหรับ project อื่น (wanasub.com)
แทนที่จะใส่ Caddy ใน docker (port conflict) → ใช้ nginx ที่มีอยู่เพิ่ม server block สำหรับ smart-pole

## Architecture

```
                    ┌──────────────────────────────┐
   internet         │   nginx (host, 80/443)       │
   ───────────────▶│  ┌─────────────────────────┐  │
                    │  │ TLS termination          │  │
                    │  │ self-signed cert (IP)    │  │
                    │  └────┬─────────────────────┘  │
                    │       │                        │
                    │       ├─ /api/  → 127.0.0.1:7766 (backend container)
                    │       ├─ /ws    → 127.0.0.1:7766 (WebSocket)
                    │       ├─ /hls/  → 127.0.0.1:7780 (SRS HLS)
                    │       └─ /      → 127.0.0.1:7765 (frontend Next.js)
                    └────────────────────────────────┘
```

## Setup

### ครั้งแรก

```bash
# SSH ไป DO
ssh root@152.42.242.162

# Clone repo (ถ้ายังไม่มี)
cd /var/www && git clone https://github.com/teerawat-k/smart-pole.git
cd smart-pole

# Run setup script
bash infra/nginx/setup-nginx.sh
```

Script จะ:
1. Generate self-signed cert สำหรับ IP 152.42.242.162 (10 ปี)
2. Copy `smart-pole.conf` ไป `/etc/nginx/sites-available/`
3. Symlink ไป `sites-enabled/`
4. `nginx -t` + `systemctl reload nginx`

### หลังแก้ Caddyfile equivalent (smart-pole.conf)

```bash
# จาก dev machine
scp infra/nginx/smart-pole.conf root@152.42.242.162:/etc/nginx/sites-available/smart-pole.conf
ssh root@152.42.242.162 "nginx -t && systemctl reload nginx"
```

## Access

```
https://152.42.242.162           # frontend
https://152.42.242.162/api/...   # backend REST
https://152.42.242.162/ws        # backend WebSocket
https://152.42.242.162/hls/...   # SRS HLS playback
```

> ⚠️ Self-signed cert — browser แสดง warning ครั้งแรก
> คลิก "Advanced → Proceed" (1 ครั้งต่อ browser)

### กำจัด browser warning (optional)

Download cert + import เป็น trusted root:

```bash
# จาก dev machine
scp root@152.42.242.162:/etc/nginx/ssl/smart-pole.crt ./smart-pole.crt

# Windows
certutil -addstore -f "ROOT" smart-pole.crt

# macOS
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain smart-pole.crt

# Linux
sudo cp smart-pole.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates
```

## Upgrade to Let's Encrypt (production)

เมื่อมี domain (เช่น `smartpole.your-domain.com`):

```bash
# 1. ตั้ง DNS A record
#    smartpole.your-domain.com.  IN  A  152.42.242.162

# 2. ติดตั้ง certbot
ssh root@152.42.242.162 "apt install -y certbot python3-certbot-nginx"

# 3. แก้ server_name ใน /etc/nginx/sites-available/smart-pole.conf
#    เดิม:  server_name 152.42.242.162;
#    ใหม่:  server_name smartpole.your-domain.com;

# 4. รัน certbot — auto-config nginx + cert + reload
ssh root@152.42.242.162 "certbot --nginx -d smartpole.your-domain.com"

# 5. ตรวจ auto-renewal
ssh root@152.42.242.162 "systemctl status certbot.timer"
```

certbot จะ:
- ออก cert จาก Let's Encrypt (HTTP-01 challenge ผ่าน port 80)
- แก้ `ssl_certificate` paths อัตโนมัติ
- ตั้ง auto-renewal (every 90 days)
- เพิ่ม HTTP→HTTPS redirect

## Update frontend env (GitHub vars)

หลัง nginx ขึ้น → ต้อง rebuild frontend ด้วย HTTPS URLs:

**Repository Settings → Secrets and variables → Actions → Variables**

```
# เดิม:
NEXT_PUBLIC_API_URL=http://152.42.242.162:7766
NEXT_PUBLIC_WS_URL=ws://152.42.242.162:7766/ws
NEXT_PUBLIC_HLS_BASE=http://152.42.242.162:7780

# ใหม่ (IP mode):
NEXT_PUBLIC_API_URL=https://152.42.242.162
NEXT_PUBLIC_WS_URL=wss://152.42.242.162/ws
NEXT_PUBLIC_HLS_BASE=https://152.42.242.162/hls
```

Push commit ใดก็ได้ → frontend rebuild

## Update backend CORS_ORIGIN

`/var/www/smart-pole/backend/.env`:
```
CORS_ORIGIN=http://152.42.242.162:7765,https://152.42.242.162
```

แล้ว `docker compose restart backend`

## Troubleshooting

### `nginx -t` fail
ดู error → ปกติเป็น typo ใน smart-pole.conf — แก้แล้วลองอีก

### 502 Bad Gateway
Container ภายในไม่ run:
```bash
docker ps | grep smart-pole
docker compose up -d
```

### Self-signed cert expired
```bash
bash /var/www/smart-pole/infra/nginx/setup-nginx.sh  # regenerate
```

### WebSocket disconnect บ่อย
proxy_read_timeout เพิ่ม (default 86400 = 24h ใน config นี้)
