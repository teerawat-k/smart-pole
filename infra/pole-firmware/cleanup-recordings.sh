#!/bin/bash
# Smart Pole — ลบ clip เก่าบน Pi เกิน N วัน (cron daily 3am)
# Default: 3 วัน (กัน buffer สูญหายระหว่าง network outage ไปยัง DO)

RETENTION_DAYS=${SMARTPOLE_PI_RETENTION_DAYS:-3}
RECORD_BASE="/home/pi/smartpole/recordings"

if [ ! -d "$RECORD_BASE" ]; then
  echo "[$(date -Is)] record base $RECORD_BASE not found — skip"
  exit 0
fi

# ลบไฟล์เก่า
DELETED=$(find "$RECORD_BASE" -name "*.mp4" -type f -mtime +"$RETENTION_DAYS" -print -delete | wc -l)
echo "[$(date -Is)] deleted $DELETED file(s) older than ${RETENTION_DAYS} days"

# ลบ folder ว่าง (depth >=2 เพื่อไม่ลบ pole-XX root folder)
find "$RECORD_BASE" -mindepth 2 -type d -empty -mtime +1 -delete 2>/dev/null

# แสดง disk usage ปัจจุบัน
echo "[$(date -Is)] current usage:"
du -sh "$RECORD_BASE"/* 2>/dev/null | head -10
