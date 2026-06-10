#!/bin/bash
# Smart Pole — sync recorded clips จาก Pi → DO ทุก 5 นาที (cron)
#
# Sync เฉพาะไฟล์ที่ปิด write แล้วเกิน 2 นาที (กัน rsync ไฟล์ที่ ffmpeg กำลังเขียนอยู่)
# ใช้ rsync --ignore-existing → ไฟล์ที่ sync ไปแล้วไม่ต้องส่งซ้ำ
# ใช้ SSH key (~/.ssh/id_ed25519) ที่ติดตั้งไว้แล้วใน root@DO

SRC="/home/pi/smartpole/recordings/"
DST_HOST="root@152.42.242.162"
DST_PATH="/var/www/smart-pole/data/uploads/camera/"
LOCK="/tmp/smartpole-sync.lock"

# Single-instance lock
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "[$(date -Is)] sync already running — skip"
  exit 0
fi

# ── Pre-create date directories on DO ──
# rsync --ignore-existing ไม่สร้าง parent dir โดยอัตโนมัติถ้า path มี subdir ใหม่
# pre-create directories ตามที่จะ sync
cd "$SRC" || exit 1
find . -name "*.mp4" -type f -mmin +2 -printf '%P\n' | \
  awk -F'/' '{print $1"/"$2}' | sort -u | \
  ssh -o BatchMode=yes -o ConnectTimeout=10 "$DST_HOST" "xargs -I {} mkdir -p '${DST_PATH}{}'"

# ── rsync files only files older than 2 min ──
FILES=$(find . -name "*.mp4" -type f -mmin +2 -printf '%P\n')
if [ -z "$FILES" ]; then
  echo "[$(date -Is)] no new files to sync"
  exit 0
fi

COUNT=$(echo "$FILES" | wc -l)
echo "[$(date -Is)] syncing $COUNT file(s)..."

echo "$FILES" | rsync -a \
  --files-from=- \
  --ignore-existing \
  --timeout=300 \
  -e "ssh -o BatchMode=yes -o ConnectTimeout=10" \
  . "$DST_HOST:$DST_PATH"

echo "[$(date -Is)] sync done"
