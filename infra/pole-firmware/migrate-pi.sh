#!/bin/bash
# migrate-pi.sh — สลับ Pi hardware ของเสาที่มีอยู่แล้ว (Pi 4 → Pi 5)
#
# ต่างจาก provision-pi.sh:
#   - skip backend create-pole (เสามีในระบบแล้ว)
#   - keep MQTT credentials เดิม (user=pole-01 / mqtt_dev_2025) — ต้องตรงกับ broker passwordfile + ACL pattern smartpole/%u/#
#   - รวม Pi initial setup (apt install + venv) สำหรับ fresh OS
#
# Workflow:
#   1. apt install dependencies (Python venv, ffmpeg, rsync) บน Pi ใหม่
#   2. สร้าง Python venv + pip install paho-mqtt, minimalmodbus, pyserial
#   3. SCP scripts ทั้งหมดไป Pi ใหม่
#   4. Patch RTSP_URL ใน stream/record scripts (POLE_NAME ใน repo = pole-01 อยู่แล้ว)
#   5. Setup SSH key Pi → DO (สำหรับ rsync recordings)
#   6. Install systemd units + crontab
#   7. Start services + verify pipeline ครบทั้ง MQTT/RTMP/HLS
#
# Prerequisites บน Pi ใหม่:
#   - Raspberry Pi OS Lite 64-bit (Bookworm) — flash ด้วย Raspberry Pi Imager
#   - SSH enabled + user pi กับ password ที่ตั้ง
#   - Network connectivity (ping DO host ได้)
#
# Usage:
#   ./migrate-pi.sh \
#     --pole-name pole-01 \
#     --pi-host 192.168.1.147 \
#     --pi-pass 'ABcd12!!' \
#     --rtsp-ip 192.168.1.108 \
#     --rtsp-pass '!@34ZXcv'

set -euo pipefail

# ── Defaults ──
DO_HOST="${SMARTPOLE_DO_HOST:-root@152.42.242.162}"
MQTT_HOST="${SMARTPOLE_MQTT_HOST:-152.42.242.162}"
MQTT_PORT="${SMARTPOLE_MQTT_PORT:-7783}"
RTMP_HOST="${SMARTPOLE_RTMP_HOST:-152.42.242.162}"
RTMP_PORT="${SMARTPOLE_RTMP_PORT:-7735}"
HLS_HOST="${SMARTPOLE_HLS_HOST:-152.42.242.162}"
HLS_PORT="${SMARTPOLE_HLS_PORT:-7780}"
PI_SSH_USER="${PI_SSH_USER:-pi}"

POLE_NAME=""
PI_HOST=""
PI_PASS=""
RTSP_IP=""
RTSP_USER="admin"
RTSP_PASS=""

usage() {
  cat <<'USAGE'
Usage: migrate-pi.sh [options]

Required:
  --pole-name <name>       e.g. pole-01 (มีในระบบแล้ว)
  --pi-host <ip>           IP ของ Pi ใหม่ (fresh OS)
  --pi-pass <password>     sudo password ของ user pi
  --rtsp-ip <ip>           IP กล้อง CCTV เช่น 192.168.1.108
  --rtsp-pass <password>   รหัสกล้อง

Optional:
  --rtsp-user <user>       default: admin
  --skip-apt               ข้าม apt install (ถ้าทำเองแล้ว)
  --skip-verify            ข้าม verify pipeline ตอนจบ

Env override (เหมือน provision-pi.sh):
  SMARTPOLE_DO_HOST          (default: root@152.42.242.162)
  SMARTPOLE_MQTT_HOST/PORT
  SMARTPOLE_RTMP_HOST/PORT
  SMARTPOLE_HLS_HOST/PORT
USAGE
  exit 1
}

SKIP_APT=""
SKIP_VERIFY=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --pole-name)     POLE_NAME="$2"; shift 2;;
    --pi-host)       PI_HOST="$2"; shift 2;;
    --pi-pass)       PI_PASS="$2"; shift 2;;
    --rtsp-ip)       RTSP_IP="$2"; shift 2;;
    --rtsp-user)     RTSP_USER="$2"; shift 2;;
    --rtsp-pass)     RTSP_PASS="$2"; shift 2;;
    --skip-apt)      SKIP_APT="yes"; shift;;
    --skip-verify)   SKIP_VERIFY="yes"; shift;;
    -h|--help)       usage;;
    *)               echo "unknown arg: $1"; usage;;
  esac
done

if [[ -z "$POLE_NAME" || -z "$PI_HOST" || -z "$PI_PASS" || -z "$RTSP_IP" || -z "$RTSP_PASS" ]]; then
  echo "ERROR: missing required arg"
  usage
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RTSP_URL="rtsp://${RTSP_USER}:${RTSP_PASS}@${RTSP_IP}/cam/realmonitor?channel=1&subtype=1"
SUDO_CMD="echo '$PI_PASS' | sudo -S"

echo "═══════════════════════════════════════════════════════"
echo "  Migrating Pole: $POLE_NAME → new Pi ($PI_HOST)"
echo "  Mode: REPLACE (keep DB record + MQTT credentials)"
echo "═══════════════════════════════════════════════════════"
echo

# ── 0. Pre-flight: ตรวจ SSH ได้ ───────────────────────
echo "[0/7] Checking SSH connectivity to Pi..."
if ! ssh -o BatchMode=yes -o ConnectTimeout=5 -o StrictHostKeyChecking=accept-new "${PI_SSH_USER}@${PI_HOST}" "uname -a" >/dev/null 2>&1; then
  echo "  ⚠️  SSH key-auth ไม่ผ่าน — ทดสอบ password auth"
  if ! sshpass -p "$PI_PASS" ssh -o StrictHostKeyChecking=accept-new "${PI_SSH_USER}@${PI_HOST}" "uname -a" >/dev/null 2>&1; then
    echo "  ❌ SSH failed (key + password) — ตรวจ network/firewall"
    exit 2
  fi
  echo "  ✓ Password auth works — จะ setup SSH key ใน step 5"
fi
PI_MODEL=$(ssh -o BatchMode=yes "${PI_SSH_USER}@${PI_HOST}" "tr -d '\\0' < /proc/device-tree/model")
echo "  ✓ Pi connected: $PI_MODEL"
echo

# ── 1. Install dependencies (fresh Pi OS) ─────────────
if [[ -z "$SKIP_APT" ]]; then
  echo "[1/7] Installing dependencies (apt + venv) — อาจใช้เวลา 3-5 นาที..."
  ssh -o BatchMode=yes "${PI_SSH_USER}@${PI_HOST}" "bash -s" <<APT
set -e
$SUDO_CMD apt-get update -qq
$SUDO_CMD apt-get install -y -qq python3-venv python3-pip ffmpeg rsync curl iproute2 mosquitto-clients
echo '  ✓ apt packages installed'
APT
else
  echo "[1/7] Skipped apt install (--skip-apt)"
fi
echo

# ── 2. Python venv + packages ────────────────────────
echo "[2/7] Creating Python venv + installing packages..."
ssh -o BatchMode=yes "${PI_SSH_USER}@${PI_HOST}" "bash -s" <<VENV
set -e
if [[ ! -d /home/${PI_SSH_USER}/smartpole-env ]]; then
  python3 -m venv /home/${PI_SSH_USER}/smartpole-env
fi
/home/${PI_SSH_USER}/smartpole-env/bin/pip install --quiet --upgrade pip
/home/${PI_SSH_USER}/smartpole-env/bin/pip install --quiet paho-mqtt==2.1.0 minimalmodbus==2.1.1 pyserial==3.5
echo '  Installed:'
/home/${PI_SSH_USER}/smartpole-env/bin/pip list --format=columns | grep -E "paho-mqtt|minimalmodbus|pyserial"
VENV
echo

# ── 3. SCP firmware scripts ──────────────────────────
echo "[3/7] Copying firmware files to Pi..."
ssh -o BatchMode=yes "${PI_SSH_USER}@${PI_HOST}" "mkdir -p /home/${PI_SSH_USER}/smartpole"
for f in main.py sensor.py stream-rtmp.sh record-mp4.sh sync-recordings.sh cleanup-recordings.sh; do
  scp -o BatchMode=yes "$SCRIPT_DIR/$f" "${PI_SSH_USER}@${PI_HOST}:/home/${PI_SSH_USER}/smartpole/$f"
done
ssh -o BatchMode=yes "${PI_SSH_USER}@${PI_HOST}" "chmod +x /home/${PI_SSH_USER}/smartpole/*.sh"
echo "  ✓ 6 files copied + chmod +x"
echo

# ── 4. Patch RTSP_URL + verify POLE_NAME ──────────────
echo "[4/7] Patching RTSP credentials..."
RTSP_URL_ESCAPED=$(printf '%s\n' "$RTSP_URL" | sed -e 's/[\/&]/\\&/g')
ssh -o BatchMode=yes "${PI_SSH_USER}@${PI_HOST}" "
set -e
cd /home/${PI_SSH_USER}/smartpole
sed -i \"s|^RTSP_URL=.*|RTSP_URL='$RTSP_URL_ESCAPED'|\" stream-rtmp.sh record-mp4.sh
# POLE_NAME ใน main.py + scripts ควรเป็น $POLE_NAME จาก repo อยู่แล้ว — verify
if ! grep -q '^POLE_NAME *=  *\"$POLE_NAME\"' main.py; then
  echo '  ⚠️  POLE_NAME ใน main.py ไม่ตรง — patch ด้วย sed'
  sed -i 's|^POLE_NAME *=.*|POLE_NAME  = \"$POLE_NAME\"|' main.py
fi
if ! grep -q \"^POLE_NAME=\\\"$POLE_NAME\\\"\" stream-rtmp.sh; then
  sed -i 's|^POLE_NAME=.*|POLE_NAME=\"$POLE_NAME\"|' stream-rtmp.sh record-mp4.sh sync-recordings.sh cleanup-recordings.sh
fi
echo '  --- verify ---'
grep -E '^POLE_NAME' main.py *.sh | head
"
echo

# ── 5. SSH key Pi → DO (สำหรับ rsync recordings) ─────
echo "[5/7] Setting up SSH key Pi → DO (rsync)..."
ssh -o BatchMode=yes "${PI_SSH_USER}@${PI_HOST}" "[ -f ~/.ssh/id_ed25519 ] || ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N '' -C 'pi-${POLE_NAME}-rsync' -q"
PI_PUBKEY=$(ssh -o BatchMode=yes "${PI_SSH_USER}@${PI_HOST}" "cat ~/.ssh/id_ed25519.pub")
ssh -o BatchMode=yes "$DO_HOST" "
mkdir -p ~/.ssh && chmod 700 ~/.ssh
grep -qxF '$PI_PUBKEY' ~/.ssh/authorized_keys 2>/dev/null || echo '$PI_PUBKEY' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
"
# Test
ssh -o BatchMode=yes "${PI_SSH_USER}@${PI_HOST}" "ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new $DO_HOST 'echo OK from Pi: \$(hostname)'"
echo "  ✓ Pi → DO SSH ready"
echo

# ── 6. Install systemd units + crontab ───────────────
echo "[6/7] Installing systemd units + crontab..."
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
0 */6 * * * /home/$PI_SSH_USER/smartpole/cleanup-recordings.sh >> /home/$PI_SSH_USER/smartpole/cleanup.log 2>&1
CRON
crontab /tmp/cron-new
rm /tmp/cron-new
echo '  --- service status ---'
systemctl is-active smartpole smartpole-stream smartpole-record
echo '  --- crontab ---'
crontab -l | grep smartpole
UNITSETUP
echo

# ── 7. Verify pipeline ───────────────────────────────
if [[ -z "$SKIP_VERIFY" ]]; then
  echo "[7/7] Verifying pipeline (รอ 15 วินาที ให้ services ขึ้น)..."
  sleep 15
  HLS_STATUS=$(curl -sk -o /dev/null -w "%{http_code}" "https://${HLS_HOST}/hls/live/${POLE_NAME}.m3u8")
  TCP_RTMP=$(ssh -o BatchMode=yes "${PI_SSH_USER}@${PI_HOST}" "ss -tn | grep ${RTMP_HOST}:${RTMP_PORT} | wc -l")
  TCP_MQTT=$(ssh -o BatchMode=yes "${PI_SSH_USER}@${PI_HOST}" "ss -tn | grep ${MQTT_HOST}:${MQTT_PORT} | wc -l")

  # MQTT publish ตัวอย่าง
  SENSOR_LOG=$(ssh -o BatchMode=yes "${PI_SSH_USER}@${PI_HOST}" "$SUDO_CMD journalctl -u smartpole -n 5 --no-pager 2>/dev/null | grep -E 'ok —|MQTT connected' | tail -2")

  [[ "$HLS_STATUS" == "200" ]] && HLS_OK="✓" || HLS_OK="✗"
  [[ "$TCP_RTMP" -ge 1 ]] && RTMP_OK="✓" || RTMP_OK="✗"
  [[ "$TCP_MQTT" -ge 1 ]] && MQTT_OK="✓" || MQTT_OK="✗"
  echo "  $HLS_OK HLS endpoint:   HTTP $HLS_STATUS"
  echo "  $RTMP_OK Pi RTMP conn:    $TCP_RTMP open"
  echo "  $MQTT_OK Pi MQTT conn:    $TCP_MQTT open"
  echo
  echo "  smartpole log:"
  echo "$SENSOR_LOG" | sed 's/^/    /'
else
  echo "[7/7] Skipped verify (--skip-verify)"
fi
echo

echo "═══════════════════════════════════════════════════════"
echo "  ✅ Pole $POLE_NAME migrated successfully"
echo "═══════════════════════════════════════════════════════"
echo
echo "📋 Quick checks:"
echo "  Dashboard:     https://${HLS_HOST}/dashboard"
echo "  HLS playback:  https://${HLS_HOST}/hls/live/${POLE_NAME}.m3u8"
echo "  Grafana:       https://${HLS_HOST}/grafana (sensor_reads_total)"
echo
echo "🧹 Old Pi cleanup (after 24h stable):"
echo "  • Image old SD card for archive (optional)"
echo "  • Wipe + reuse for next pole"
