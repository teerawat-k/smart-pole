#!/bin/bash
# provision-pi.sh — automate adding new pole on Pi (~3 นาที vs 30 นาที manual)
#
# รันจาก dev machine (Windows/Linux/Mac ที่มี ssh + scp + plink-PuTTY บน Windows)
#
# Workflow:
#   1. SSH ไป DO → รัน backend CLI สร้างเสาใน DB + รับ MQTT credential (plain password)
#   2. SCP scripts ทั้งหมดไป Pi ใหม่
#   3. sed แทน POLE_NAME, MQTT credentials, RTSP URL ใน scripts
#   4. Setup SSH key Pi → DO (สำหรับ rsync recordings)
#   5. Install systemd units + crontab
#   6. Restart services + verify HLS endpoint

set -euo pipefail

# ── Defaults ──
DO_HOST="${SMARTPOLE_DO_HOST:-root@152.42.242.162}"
DEPLOY_DIR="${SMARTPOLE_DEPLOY_DIR:-/var/www/smart-pole}"
MQTT_BROKER_HOST="${SMARTPOLE_MQTT_HOST:-152.42.242.162}"
MQTT_BROKER_PORT="${SMARTPOLE_MQTT_PORT:-7783}"
SRS_RTMP_HOST="${SMARTPOLE_RTMP_HOST:-152.42.242.162}"
SRS_RTMP_PORT="${SMARTPOLE_RTMP_PORT:-7735}"

POLE_NAME=""
INSTALL_PLACE=""
PI_HOST=""
PI_PASS=""           # only needed for first-time sudo (will install SSH key on Pi too)
PI_SSH_USER="${PI_SSH_USER:-pi}"
RTSP_IP=""
RTSP_USER="admin"
RTSP_PASS=""

usage() {
  cat <<'USAGE'
Usage: provision-pi.sh [options]

Required:
  --pole-name <name>       e.g. pole-02
  --install-place <thai>   เช่น "ทางเข้าอาคาร B"
  --pi-host <ip>           Pi IP address (ssh target)
  --pi-pass <password>     Pi sudo password (สำหรับ install systemd)
  --rtsp-ip <ip>           IP กล้อง CCTV (Dahua) เช่น 192.168.1.108
  --rtsp-pass <password>   รหัสกล้อง

Optional:
  --rtsp-user <user>       default: admin
  --has-camera             default: true (ใส่ flag = on)
  --has-pm25               default: off
  --has-temp-humidity      default: off
  --has-led                default: off

Env override:
  SMARTPOLE_DO_HOST          (default: root@152.42.242.162)
  SMARTPOLE_DEPLOY_DIR       (default: /var/www/smart-pole)
  SMARTPOLE_RTMP_HOST        (default: 152.42.242.162)
  SMARTPOLE_RTMP_PORT        (default: 7735)
  SMARTPOLE_MQTT_HOST        (default: 152.42.242.162)
  SMARTPOLE_MQTT_PORT        (default: 7783)
USAGE
  exit 1
}

# Capability flags
HAS_CAMERA="--has-camera"     # default on
HAS_PM25=""
HAS_TH=""
HAS_LED=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --pole-name)         POLE_NAME="$2"; shift 2;;
    --install-place)     INSTALL_PLACE="$2"; shift 2;;
    --pi-host)           PI_HOST="$2"; shift 2;;
    --pi-pass)           PI_PASS="$2"; shift 2;;
    --rtsp-ip)           RTSP_IP="$2"; shift 2;;
    --rtsp-user)         RTSP_USER="$2"; shift 2;;
    --rtsp-pass)         RTSP_PASS="$2"; shift 2;;
    --has-camera)        HAS_CAMERA="--has-camera"; shift;;
    --no-camera)         HAS_CAMERA=""; shift;;
    --has-pm25)          HAS_PM25="--has-pm25"; shift;;
    --has-temp-humidity) HAS_TH="--has-temp-humidity"; shift;;
    --has-led)           HAS_LED="--has-led"; shift;;
    -h|--help)           usage;;
    *)                   echo "unknown arg: $1"; usage;;
  esac
done

if [[ -z "$POLE_NAME" || -z "$INSTALL_PLACE" || -z "$PI_HOST" || -z "$PI_PASS" || -z "$RTSP_IP" || -z "$RTSP_PASS" ]]; then
  echo "ERROR: missing required arg"
  usage
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RTSP_URL="rtsp://${RTSP_USER}:${RTSP_PASS}@${RTSP_IP}/cam/realmonitor?channel=1&subtype=1"

echo "═══════════════════════════════════════════════════════"
echo "  Provisioning Pole: $POLE_NAME @ $INSTALL_PLACE"
echo "═══════════════════════════════════════════════════════"
echo

# ── 1. สร้างเสาผ่าน backend CLI ──────────────────────
echo "[1/6] Creating pole in DB + generating MQTT credential..."
RESULT=$(ssh -o BatchMode=yes "$DO_HOST" "cd $DEPLOY_DIR && docker compose exec -T backend bun scripts/create-pole.ts \
  --pole-name '$POLE_NAME' \
  --install-place '$INSTALL_PLACE' \
  --ip-camera '$RTSP_IP' \
  $HAS_CAMERA $HAS_PM25 $HAS_TH $HAS_LED")

if ! echo "$RESULT" | grep -q '"success": true'; then
  echo "ERROR: backend create-pole failed"
  echo "$RESULT"
  exit 3
fi

MQTT_USERNAME=$(echo "$RESULT" | python -c "import sys,json; print(json.load(sys.stdin)['mqttUsername'])")
MQTT_PASSWORD=$(echo "$RESULT" | python -c "import sys,json; print(json.load(sys.stdin)['mqttPassword'])")
echo "  ✓ pole created: mqttUsername=$MQTT_USERNAME"
echo "  ✓ MQTT password generated: ${MQTT_PASSWORD:0:12}... (full ใน final summary)"
echo

# ── 2. Setup Pi: SSH key (ถ้ายังไม่มี) ────────────────
echo "[2/6] Copying scripts to Pi ${PI_HOST}..."
ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new "${PI_SSH_USER}@${PI_HOST}" "mkdir -p /home/${PI_SSH_USER}/smartpole" 2>/dev/null || {
  echo "ERROR: SSH to Pi ${PI_HOST} failed — ตรวจ network/credentials"
  exit 4
}

for f in main.py stream-rtmp.sh record-mp4.sh sync-recordings.sh cleanup-recordings.sh; do
  scp -o BatchMode=yes "$SCRIPT_DIR/$f" "${PI_SSH_USER}@${PI_HOST}:/home/${PI_SSH_USER}/smartpole/$f"
done
echo "  ✓ 5 scripts copied"
echo

# ── 3. แก้ POLE_NAME, MQTT, RTSP ใน scripts ──────────
echo "[3/6] Patching scripts with pole-specific config..."
RTSP_URL_ESCAPED=$(printf '%s\n' "$RTSP_URL" | sed -e 's/[\/&]/\\&/g')
ssh -o BatchMode=yes "${PI_SSH_USER}@${PI_HOST}" "
set -e
cd /home/${PI_SSH_USER}/smartpole
# Patch POLE_NAME in all scripts
sed -i 's|^POLE_NAME=.*|POLE_NAME=\"$POLE_NAME\"|' *.sh main.py
# Patch RTSP_URL in stream + record scripts
sed -i \"s|^RTSP_URL=.*|RTSP_URL='$RTSP_URL_ESCAPED'|\" stream-rtmp.sh record-mp4.sh
# Patch MQTT credential in main.py
sed -i 's|^USERNAME .*|USERNAME  = \"$MQTT_USERNAME\"|' main.py
sed -i 's|^PASSWORD .*|PASSWORD  = \"$MQTT_PASSWORD\"|' main.py
# Patch MQTT broker host:port
sed -i 's|^BROKER .*|BROKER    = \"$MQTT_BROKER_HOST\"|' main.py
sed -i 's|^PORT .*|PORT      = $MQTT_BROKER_PORT|' main.py
chmod +x *.sh
echo '--- verify patched ---'
grep -E '^POLE_NAME|^USERNAME|^BROKER' main.py stream-rtmp.sh record-mp4.sh | head -10
"
echo "  ✓ scripts patched"
echo

# ── 4. SSH key Pi → DO (สำหรับ rsync recordings) ─────
echo "[4/6] Setting up SSH key Pi → DO for rsync..."
ssh -o BatchMode=yes "${PI_SSH_USER}@${PI_HOST}" "[ -f ~/.ssh/id_ed25519 ] || ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N '' -C 'pi-${POLE_NAME}-rsync' -q"
PI_PUBKEY=$(ssh -o BatchMode=yes "${PI_SSH_USER}@${PI_HOST}" "cat ~/.ssh/id_ed25519.pub")
ssh -o BatchMode=yes "$DO_HOST" "
mkdir -p ~/.ssh && chmod 700 ~/.ssh
grep -qxF '$PI_PUBKEY' ~/.ssh/authorized_keys 2>/dev/null || echo '$PI_PUBKEY' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
"
# Test
ssh -o BatchMode=yes "${PI_SSH_USER}@${PI_HOST}" "ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new $DO_HOST 'echo OK from Pi'"
echo "  ✓ Pi → DO SSH ready"
echo

# ── 5. Install systemd units + crontab ───────────────
echo "[5/6] Installing systemd units + crontab (sudo via plink)..."
SUDO_CMD="echo '$PI_PASS' | sudo -S"
ssh -o BatchMode=yes "${PI_SSH_USER}@${PI_HOST}" "bash -s" <<UNITSETUP
$SUDO_CMD tee /etc/systemd/system/smartpole.service > /dev/null <<'UNIT'
$(cat "$SCRIPT_DIR/smartpole.service")
UNIT
$SUDO_CMD tee /etc/systemd/system/smartpole-stream.service > /dev/null <<'UNIT'
$(cat "$SCRIPT_DIR/smartpole-stream.service")
UNIT
$SUDO_CMD tee /etc/systemd/system/smartpole-record.service > /dev/null <<'UNIT'
$(cat "$SCRIPT_DIR/smartpole-record.service")
UNIT
$SUDO_CMD systemctl daemon-reload
$SUDO_CMD systemctl enable --now smartpole smartpole-stream smartpole-record

# Cron sync + cleanup
(crontab -l 2>/dev/null | grep -v smartpole > /tmp/cron-new || true)
cat >> /tmp/cron-new <<'CRON'
*/5 * * * * /home/$PI_SSH_USER/smartpole/sync-recordings.sh >> /home/$PI_SSH_USER/smartpole/sync.log 2>&1
0 3 * * * /home/$PI_SSH_USER/smartpole/cleanup-recordings.sh >> /home/$PI_SSH_USER/smartpole/cleanup.log 2>&1
CRON
crontab /tmp/cron-new
rm /tmp/cron-new
echo '--- services + crontab ---'
systemctl is-active smartpole smartpole-stream smartpole-record
crontab -l | grep smartpole
UNITSETUP
echo "  ✓ systemd + crontab installed"
echo

# ── 6. Verify pipeline ───────────────────────────────
echo "[6/6] Verifying pipeline (รอ ~15 วินาที ให้ ffmpeg start + SRS ingest)..."
sleep 15
HLS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://${SRS_RTMP_HOST}:7780/live/${POLE_NAME}.m3u8")
TCP_RTMP=$(ssh -o BatchMode=yes "${PI_SSH_USER}@${PI_HOST}" "ss -tn | grep ${SRS_RTMP_HOST}:${SRS_RTMP_PORT} | wc -l")
TCP_MQTT=$(ssh -o BatchMode=yes "${PI_SSH_USER}@${PI_HOST}" "ss -tn | grep ${MQTT_BROKER_HOST}:${MQTT_BROKER_PORT} | wc -l")

[[ "$HLS_STATUS" == "200" ]] && HLS_OK="✓" || HLS_OK="✗"
[[ "$TCP_RTMP" -ge 1 ]] && RTMP_OK="✓" || RTMP_OK="✗"
[[ "$TCP_MQTT" -ge 1 ]] && MQTT_OK="✓" || MQTT_OK="✗"
echo "  $HLS_OK HLS m3u8 endpoint: HTTP $HLS_STATUS"
echo "  $RTMP_OK Pi → DO RTMP TCP connection: $TCP_RTMP"
echo "  $MQTT_OK Pi → DO MQTT TCP connection: $TCP_MQTT"
echo

echo "═══════════════════════════════════════════════════════"
echo "  ✅ Pole $POLE_NAME provisioned successfully"
echo "═══════════════════════════════════════════════════════"
echo
echo "📋 Save these credentials (will NOT be shown again):"
echo
echo "  Pole name        : $POLE_NAME"
echo "  MQTT username    : $MQTT_USERNAME"
echo "  MQTT password    : $MQTT_PASSWORD"
echo "  RTSP URL         : $RTSP_URL"
echo "  HLS playback     : http://${SRS_RTMP_HOST}:7780/live/${POLE_NAME}.m3u8"
echo "  Dashboard        : http://${SRS_RTMP_HOST}:7765/dashboard → เลือก $POLE_NAME"
echo
