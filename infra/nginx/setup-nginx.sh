#!/bin/bash
# setup-nginx.sh — install nginx server block + self-signed cert บน DO host
# รันบน DO server ภายใต้ root (หรือ sudo)
#
# Usage:
#   curl -sf https://raw.githubusercontent.com/.../setup-nginx.sh | bash
#   OR
#   scp setup-nginx.sh root@152.42.242.162:/tmp/ && ssh root@152.42.242.162 'bash /tmp/setup-nginx.sh'

set -euo pipefail

SERVER_IP="${SMARTPOLE_SERVER_IP:-152.42.242.162}"
REPO_DIR="${SMARTPOLE_REPO_DIR:-/var/www/smart-pole}"
NGINX_CONF_SRC="${REPO_DIR}/infra/nginx/smart-pole.conf"
NGINX_AVAILABLE="/etc/nginx/sites-available/smart-pole.conf"
NGINX_ENABLED="/etc/nginx/sites-enabled/smart-pole.conf"
SSL_DIR="/etc/nginx/ssl"
SSL_CRT="${SSL_DIR}/smart-pole.crt"
SSL_KEY="${SSL_DIR}/smart-pole.key"

echo "═══════════════════════════════════════════════════════"
echo "  Smart Pole · nginx setup (HTTPS reverse proxy)"
echo "═══════════════════════════════════════════════════════"

# ── 1. nginx installed? ──
if ! command -v nginx &>/dev/null; then
  echo "ERROR: nginx not installed. Install ก่อน: apt install nginx"
  exit 1
fi

# ── 2. Generate self-signed cert ──
if [[ ! -f "$SSL_CRT" || ! -f "$SSL_KEY" ]]; then
  echo "[1/4] Generating self-signed cert for IP $SERVER_IP..."
  mkdir -p "$SSL_DIR"
  chmod 700 "$SSL_DIR"
  openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout "$SSL_KEY" \
    -out "$SSL_CRT" \
    -subj "/C=TH/ST=Bangkok/O=BuffTech/OU=SmartPole/CN=$SERVER_IP" \
    -addext "subjectAltName=IP:$SERVER_IP" \
    2>/dev/null
  chmod 600 "$SSL_KEY"
  echo "  ✓ cert valid 10 years"
else
  echo "[1/4] Self-signed cert exists — skip"
fi

# ── 3. Install server block ──
echo "[2/4] Installing nginx server block..."
if [[ ! -f "$NGINX_CONF_SRC" ]]; then
  echo "ERROR: ไม่พบ $NGINX_CONF_SRC — repo cloned ที่ $REPO_DIR ไหม?"
  exit 2
fi
cp "$NGINX_CONF_SRC" "$NGINX_AVAILABLE"
ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"
echo "  ✓ symlinked $NGINX_ENABLED"

# ── 4. Test + reload ──
echo "[3/4] nginx config test..."
nginx -t 2>&1 | tail -3

echo "[4/4] Reloading nginx..."
systemctl reload nginx
echo "  ✓ reloaded"

echo
echo "═══════════════════════════════════════════════════════"
echo "  ✅ nginx HTTPS proxy ready"
echo "═══════════════════════════════════════════════════════"
echo
echo "Test:"
echo "  curl -k https://$SERVER_IP/api/health"
echo "  Browser: https://$SERVER_IP  (accept self-signed warning)"
echo
echo "Upgrade to Let's Encrypt (เมื่อมี domain):"
echo "  1. ตั้ง DNS A record: <domain> → $SERVER_IP"
echo "  2. แก้ server_name ใน $NGINX_AVAILABLE"
echo "  3. apt install certbot python3-certbot-nginx"
echo "  4. certbot --nginx -d <domain>"
echo "  5. certbot จะแก้ ssl_certificate path อัตโนมัติ + reload"
