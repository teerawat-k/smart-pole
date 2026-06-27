#!/bin/bash
# Smart Pole — Record mp4 segments (30 นาที clock-aligned) + watchdog auto-recover
#
# ปัญหาบน field/4G: RTSP hiccup → ffmpeg "ค้าง" (ถือ segment เปิดไว้แต่ไม่เขียน) ไม่ exit
#   → systemd ไม่ restart (process ยังอยู่) → recording หยุดเงียบ ไม่มี segment ใหม่
# วิธีแก้: watchdog เช็คว่า segment ล่าสุดถูกเขียนภายใน MAX_AGE วินาทีไหม — ถ้าไม่ → kill → restart
# (record เขียน local ไม่มี connection ให้เช็คแบบ live → ใช้ "ไฟล์ถูกเขียนล่าสุด" แทน)

POLE_NAME="pole-01"
RTSP_URL='rtsp://admin:!@34ZXcv@192.168.1.108/cam/realmonitor?channel=1&subtype=1'
RECORD_BASE="/home/pi/smartpole/recordings/${POLE_NAME}"

# ── Video quality (record คุณภาพสูงกว่า live — เก็บ local + rsync resumable) ──
FPS="${SMARTPOLE_FPS:-15}"
MAXRATE="${SMARTPOLE_MAXRATE:-150k}"
BUFSIZE="${SMARTPOLE_BUFSIZE:-300k}"
CRF="${SMARTPOLE_CRF:-26}"
GOP=$(( FPS * 2 ))

# ── watchdog tuning ──
GRACE="${SMARTPOLE_REC_GRACE:-30}"        # รอ ffmpeg สร้าง segment แรก
CHECK_INTERVAL="${SMARTPOLE_REC_CHECK:-15}"
MAX_AGE="${SMARTPOLE_REC_MAXAGE:-45}"     # segment ล่าสุดไม่ถูกเขียนเกินกี่วิ = stuck

# ── Pre-create today + tomorrow + refresh loop (กัน midnight roll-over) ──
mkdir -p "${RECORD_BASE}/$(date +%Y-%m-%d)" "${RECORD_BASE}/$(date -d 'tomorrow' +%Y-%m-%d)"
(
  while true; do
    mkdir -p "${RECORD_BASE}/$(date +%Y-%m-%d)" "${RECORD_BASE}/$(date -d 'tomorrow' +%Y-%m-%d)"
    sleep 1800
  done
) &
DIR_PID=$!

FFPID=""
cleanup() { kill "$DIR_PID" "$FFPID" 2>/dev/null; }
trap cleanup SIGTERM SIGINT EXIT

# อายุ (วินาที) ของ segment ล่าสุดที่ถูกเขียน — ใช้ตรวจว่า ffmpeg ยังเขียนอยู่ไหม
latest_seg_age() {
  local line mt
  line=$(find "$RECORD_BASE" -name "*.mp4" -printf "%T@ %p\n" 2>/dev/null | sort -n | tail -1)
  [ -z "$line" ] && { echo 9999; return; }
  mt=${line%% *}
  echo $(( $(date +%s) - ${mt%.*} ))
}

while true; do
  # ffmpeg: RTSP → H.264 baseline + silent AAC → segment mp4 30 นาที (clock-aligned, faststart)
  ffmpeg -hide_banner -loglevel warning -nostats \
    -rtsp_transport tcp -thread_queue_size 1024 \
    -i "$RTSP_URL" \
    -thread_queue_size 512 -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 \
    -map 0:v:0 -map 1:a:0 \
    -c:v libx264 -preset veryfast -profile:v baseline -level 3.0 \
    -pix_fmt yuv420p \
    -crf "$CRF" -maxrate "$MAXRATE" -bufsize "$BUFSIZE" \
    -r "$FPS" -g "$GOP" -keyint_min "$FPS" -sc_threshold 0 -bf 0 \
    -c:a aac -ar 44100 -b:a 64k \
    -f segment -segment_time 1800 -segment_format mp4 \
    -segment_atclocktime 1 -reset_timestamps 1 -strftime 1 \
    -segment_format_options "movflags=+faststart" \
    "${RECORD_BASE}/%Y-%m-%d/%H-%M-%S.mp4" &
  FFPID=$!

  # ── Watchdog: kill ffmpeg ถ้า segment ล่าสุดไม่ถูกเขียนเกิน MAX_AGE ──
  sleep "$GRACE"
  while kill -0 "$FFPID" 2>/dev/null; do
    age=$(latest_seg_age)
    if [ "$age" -gt "$MAX_AGE" ]; then
      echo "[$(date -Is)] record STUCK (segment ไม่ถูกเขียน ${age}s) → kill เพื่อ restart"
      kill "$FFPID" 2>/dev/null
      sleep 2
      kill -9 "$FFPID" 2>/dev/null
      break
    fi
    sleep "$CHECK_INTERVAL"
  done

  wait "$FFPID" 2>/dev/null
  echo "[$(date -Is)] record ended/killed — restart in 3s..."
  sleep 3
done
