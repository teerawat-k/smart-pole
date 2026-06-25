#!/bin/bash
# Smart Pole — ลบ clip เก่าบน Pi เกิน N ชั่วโมง (cron ทุก 6 ชม.)
# Default: 36 ชั่วโมง — จำกัดพื้นที่ SD card; buffer พอสำหรับ network outage ไปยัง DO
# Override: SMARTPOLE_PI_RETENTION_HOURS

RETENTION_HOURS=${SMARTPOLE_PI_RETENTION_HOURS:-36}
RECORD_BASE="/home/pi/smartpole/recordings"

if [ ! -d "$RECORD_BASE" ]; then
  echo "[$(date -Is)] record base $RECORD_BASE not found — skip"
  exit 0
fi

# ลบไฟล์เก่า (find ใช้หน่วยนาที — 36h = 2160 min)
RETENTION_MIN=$(( RETENTION_HOURS * 60 ))
DELETED=$(find "$RECORD_BASE" -name "*.mp4" -type f -mmin +"$RETENTION_MIN" -print -delete | wc -l)
echo "[$(date -Is)] deleted $DELETED file(s) older than ${RETENTION_HOURS}h"

# ลบ folder ว่าง (depth >=2 เพื่อไม่ลบ pole-XX root folder; เก่ากว่า 1 วัน)
find "$RECORD_BASE" -mindepth 2 -type d -empty -mmin +1440 -delete 2>/dev/null

# แสดง disk usage ปัจจุบัน
echo "[$(date -Is)] current usage:"
du -sh "$RECORD_BASE"/* 2>/dev/null | head -10
