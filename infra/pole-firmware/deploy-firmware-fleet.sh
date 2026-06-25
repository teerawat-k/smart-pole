#!/bin/bash
# deploy-firmware-fleet.sh — push firmware ที่ pole-agnostic ไปทุกเสาใน inventory พร้อมกัน
#
# รันจาก dev machine — loop scp+ssh ทุกเสา, per-pole error isolation, สรุปผลท้าย
# เสาที่ offline จะถูกข้าม (ConnectTimeout) ไม่ล้มทั้ง fleet
#
# ⚠️ Fleet-push ปลอดภัยเฉพาะไฟล์ "pole-agnostic" (ไม่มี per-pole credential)
#    ไฟล์ที่ถูก patch ต่อเสา — main.py / stream-rtmp.sh / record-mp4.sh / sync-recordings.sh
#    (มี POLE_NAME + MQTT/RTSP creds) → ใช้ provision-pi.sh / migrate-pi.sh เท่านั้น
#    push ตรงจะทับ credential ของเสา
#
# Inventory file (default: fleet.txt ข้างสคริปต์ — 1 เสา/บรรทัด, '#' = comment):
#   <pi-host>            เช่น  pole-001
#   <pi-host> <pole>     เช่น  pole-001  pole-01      (มี pole → จะ patch POLE_NAME ให้)
#   <pi-host> <pole> <ssh-user>

set -uo pipefail   # ไม่ใช้ -e — เสา 1 ตัวพังไม่ล้มทั้ง fleet

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Defaults (override ผ่าน env หรือ flag) ──
INVENTORY="${SMARTPOLE_FLEET_INVENTORY:-$SCRIPT_DIR/fleet.txt}"
SSH_KEY="${SMARTPOLE_SSH_KEY:-$HOME/.ssh/id_ed25519}"
SSH_USER_DEFAULT="${PI_SSH_USER:-pi}"
CONNECT_TIMEOUT="${SMARTPOLE_SSH_TIMEOUT:-8}"

FILES="cleanup-recordings.sh"   # default = pole-agnostic เท่านั้น
RESTART_SERVICES=""             # เช่น "smartpole-record" — ต้องตั้ง NOPASSWD sudo บน Pi
DRY_RUN=0

usage() {
  cat <<'USAGE'
Usage: deploy-firmware-fleet.sh [options]

Options:
  --files "<a.sh b.sh>"   ไฟล์ที่จะ push (default: cleanup-recordings.sh)
                          ⚠️ ใส่เฉพาะไฟล์ pole-agnostic — ห้าม main.py/stream/record/sync
  --restart "<svc ...>"   systemd service ที่ restart หลัง push (ต้องมี NOPASSWD sudo บน Pi)
  --inventory <file>      override inventory (default: ./fleet.txt)
  --dry-run               แสดงสิ่งที่จะทำ ไม่ลงมือจริง

Env override:
  SMARTPOLE_FLEET_INVENTORY   (default: ./fleet.txt)
  SMARTPOLE_SSH_KEY           (default: ~/.ssh/id_ed25519)
  SMARTPOLE_SSH_TIMEOUT       (default: 8)
  PI_SSH_USER                 (default: pi)

Example:
  ./deploy-firmware-fleet.sh --files "cleanup-recordings.sh"
  ./deploy-firmware-fleet.sh --files "cleanup-recordings.sh" --restart "smartpole-record" --dry-run
USAGE
  exit 1
}

# ── Parse args ──
while [ $# -gt 0 ]; do
  case "$1" in
    --files)     FILES="$2"; shift 2 ;;
    --restart)   RESTART_SERVICES="$2"; shift 2 ;;
    --inventory) INVENTORY="$2"; shift 2 ;;
    --dry-run)   DRY_RUN=1; shift ;;
    -h|--help)   usage ;;
    *) echo "unknown option: $1"; usage ;;
  esac
done

# ── Pre-flight ──
[ -f "$INVENTORY" ] || { echo "❌ inventory not found: $INVENTORY (ดู fleet.example.txt)"; exit 1; }
[ -f "$SSH_KEY" ]   || { echo "❌ ssh key not found: $SSH_KEY"; exit 1; }
for f in $FILES; do
  [ -f "$SCRIPT_DIR/$f" ] || { echo "❌ file not found: $SCRIPT_DIR/$f"; exit 1; }
done

echo "── Fleet deploy ──"
echo "inventory : $INVENTORY"
echo "files     : $FILES"
echo "restart   : ${RESTART_SERVICES:-(none)}"
[ "$DRY_RUN" = 1 ] && echo "mode      : DRY-RUN (ไม่ลงมือจริง)"
echo

OK=(); FAILED=(); SKIPPED=()

# ── Loop inventory ──
while read -r host pole user _rest; do
  [ -z "${host:-}" ] && continue          # บรรทัดว่าง
  case "$host" in \#*) continue ;; esac    # comment
  user="${user:-$SSH_USER_DEFAULT}"
  remote="/home/$user/smartpole"
  ssh_base=(ssh -i "$SSH_KEY" -o BatchMode=yes -o ConnectTimeout="$CONNECT_TIMEOUT" "$user@$host")

  echo "▶ $host (pole=${pole:-?} user=$user)"

  if [ "$DRY_RUN" = 1 ]; then
    for f in $FILES; do echo "    would scp $f → $remote/$f"; done
    [ -n "$pole" ] && echo "    would patch POLE_NAME=$pole (ไฟล์ที่มี)"
    [ -n "$RESTART_SERVICES" ] && echo "    would restart: $RESTART_SERVICES"
    OK+=("$host"); echo; continue
  fi

  # reachability (ข้ามเสา offline เร็ว ๆ)
  if ! "${ssh_base[@]}" true 2>/dev/null; then
    echo "    ⏭  unreachable — skip"; SKIPPED+=("$host"); echo; continue
  fi

  pole_failed=0
  for f in $FILES; do
    if ! scp -i "$SSH_KEY" -o BatchMode=yes -o ConnectTimeout="$CONNECT_TIMEOUT" \
        "$SCRIPT_DIR/$f" "$user@$host:$remote/$f" 2>/dev/null; then
      echo "    ✗ scp $f failed"; pole_failed=1; break
    fi
    "${ssh_base[@]}" "chmod +x '$remote/$f'" 2>/dev/null
    # patch POLE_NAME เฉพาะไฟล์ที่ประกาศตัวแปรนี้ (no-op ถ้าไม่มี)
    [ -n "$pole" ] && "${ssh_base[@]}" "sed -i 's|^POLE_NAME=.*|POLE_NAME=\"$pole\"|' '$remote/$f' 2>/dev/null || true"
    echo "    ✓ $f"
  done

  if [ "$pole_failed" = 0 ] && [ -n "$RESTART_SERVICES" ]; then
    for s in $RESTART_SERVICES; do
      if "${ssh_base[@]}" "sudo -n systemctl restart '$s'" 2>/dev/null; then
        echo "    ✓ restart $s"
      else
        echo "    ✗ restart $s failed (ต้องตั้ง NOPASSWD sudo บน Pi)"; pole_failed=1
      fi
    done
  fi

  if [ "$pole_failed" = 0 ]; then OK+=("$host"); else FAILED+=("$host"); fi
  echo
done < "$INVENTORY"

# ── Summary ──
echo "── Summary ──"
echo "✅ ok        : ${#OK[@]}   ${OK[*]:-}"
echo "⏭  skipped   : ${#SKIPPED[@]}   ${SKIPPED[*]:-}"
echo "❌ failed    : ${#FAILED[@]}   ${FAILED[*]:-}"

# exit nonzero ถ้ามีเสา fail (offline ไม่นับ fail — retry รอบหน้า)
[ "${#FAILED[@]}" -eq 0 ]
