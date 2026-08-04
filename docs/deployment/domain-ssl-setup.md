# Domain + SSL Setup — Cloudflare Proxied (Full strict + mTLS)

> วิธีตั้งค่า `www.thaiurbanconnect.com` → smart-pole ผ่าน Cloudflare · **ทำบน host เท่านั้น ไม่แตะเสา**
> nginx config (สำเนาอ้างอิง): [`smartpole-domain.conf`](./smartpole-domain.conf) — live อยู่ที่ host `/etc/nginx/sites-available/smartpole-domain.conf`

---

## สถาปัตยกรรม

```
Browser ──HTTPS(Universal SSL)──► Cloudflare ──HTTPS(Origin cert + mTLS)──► nginx origin ──► app
         cert: Google Trust Services          Full(strict) + Authenticated Origin Pulls
```
- **Proxied (orange)** → ได้ DDoS/WAF + ซ่อน origin IP
- **Full (strict)** → เข้ารหัส 2 ขา + verify origin cert
- **mTLS (Authenticated Origin Pulls)** → origin รับเฉพาะ Cloudflare (บล็อก bypass ตรง IP)
- web/API/HLS/FLV ผ่าน domain · **MQTT(7783)/RTMP(7735)/VPN(51820) ยังใช้ IP ตรง — เสาไม่กระทบ**

---

## Part A — Cloudflare (dashboard)

1. **Add site** `thaiurbanconnect.com` (Free) → เปลี่ยน NS ที่ registrar → รอ active
2. **DNS → Records:**
   | Type | Name | Content | Proxy |
   |---|---|---|---|
   | A | `www` | `152.42.242.162` | 🟠 Proxied |
   | A | `@` | `152.42.242.162` | 🟠 Proxied |
3. **SSL/TLS → Overview → Full (strict)**
4. **SSL/TLS → Origin Server → Create Certificate** (RSA, hostnames `*.thaiurbanconnect.com` + apex + www, 15y) → เก็บ cert + key
5. **SSL/TLS → Origin Server → Authenticated Origin Pulls** → **ON** + **Global** → **ON** (ใช้ shared cert `origin-pull.cloudflare.net`)
6. **SSL/TLS → Edge Certificates:** Always Use HTTPS = ON · Min TLS 1.2

---

## Part B — Host (nginx)

### 1. Origin cert (จาก A-4)
```bash
# วาง cert + key ที่ได้จาก Cloudflare
/etc/nginx/ssl/smartpole-origin.crt   (chmod 600 root)
/etc/nginx/ssl/smartpole-origin.key   (chmod 600 root)
# ตรวจจับคู่: openssl x509 -modulus ... | md5  ==  openssl rsa -modulus ... | md5
```

### 2. Cloudflare Origin-Pull CA (สำหรับ mTLS)
```bash
curl -s https://developers.cloudflare.com/ssl/static/authenticated_origin_pull_ca.pem \
  -o /etc/nginx/ssl/cloudflare-origin-pull-ca.pem
chmod 644 /etc/nginx/ssl/cloudflare-origin-pull-ca.pem
```

### 3. Real-IP snippet (ให้ log เห็น IP จริง client)
```bash
# regen เมื่อ Cloudflare เปลี่ยน IP ranges
{
  echo "# Cloudflare real client IP restore — auto-generated"
  curl -s https://www.cloudflare.com/ips-v4 | while read ip; do echo "set_real_ip_from $ip;"; done
  curl -s https://www.cloudflare.com/ips-v6 | while read ip; do echo "set_real_ip_from $ip;"; done
  echo "real_ip_header CF-Connecting-IP;"
} > /etc/nginx/snippets/cloudflare-realip.conf
```

### 4. server block
```bash
# วางเนื้อหาจาก smartpole-domain.conf (ไฟล์ข้างกัน) → /etc/nginx/sites-available/smartpole-domain.conf
ln -sf ../sites-available/smartpole-domain.conf /etc/nginx/sites-enabled/smartpole-domain.conf
nginx -t && systemctl reload nginx   # graceful — ไม่กระทบ IP block / wanasub
```

> ⚠️ **ลำดับสำคัญ:** เปิด Authenticated Origin Pulls (A-5) **ก่อน** ใส่ `ssl_verify_client on` — ไม่งั้น domain พัง (CF ไม่ยื่น client cert)

---

## Part C — App config
```bash
# backend/.env — เพิ่ม domain (ควรอัป CI var CORS_ORIGIN ด้วย)
CORS_ORIGIN=...,https://www.thaiurbanconnect.com,https://thaiurbanconnect.com
docker compose restart backend   # ~10s เฉพาะ smart-pole · เสา publish ต่อได้ (reconnect)
```
- Frontend เรียก API แบบ **relative (same-origin)** → **ไม่ต้อง rebuild**

---

## Verify
```bash
# ผ่าน CF (ต้องทำงาน)
curl -s -o /dev/null -w '%{http_code}' https://www.thaiurbanconnect.com/api/poles   # 401
# ยิงตรง origin ไม่มี client cert (ต้องถูกปฏิเสธ = mTLS ทำงาน)
curl -sk --resolve www.thaiurbanconnect.com:443:127.0.0.1 -o /dev/null -w '%{http_code}' \
  https://www.thaiurbanconnect.com/                                                  # 400
# real-IP: ยิงจาก external → grep access log เห็น IP จริง ไม่ใช่ 104.x/172.67.x
```

---

## Rollback
```bash
rm /etc/nginx/sites-enabled/smartpole-domain.conf
nginx -t && systemctl reload nginx   # domain หาย · IP + wanasub เดิมไม่กระทบ
```

## หมายเหตุ
- ไม่มีการ **restart host** ทั้งกระบวนการ (graceful reload ล้วน)
- host reboot → containers (`unless-stopped`) + nginx/wg-quick (`enabled`) ขึ้นเอง · เสา reconnect เอง
- ดู [decision-log](../decision-log.md) · nginx IP block เดิม: [`infra/nginx/smart-pole.conf`](../../infra/nginx/smart-pole.conf)
