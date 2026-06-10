#!/bin/bash
# Smart Pole — Record mp4 segments (30 นาที clock-aligned) สำหรับ DVR
# แยกจาก stream-rtmp.sh เพราะ ffmpeg tee + FLV/RTMP มีปัญหา timing
# Pi 4 มี 4 cores — รัน 2 ffmpeg พร้อมกัน ใช้ CPU ~25% ของ 1 core ต่อ process ก็ยังสบาย

POLE_NAME="pole-01"
RTSP_URL='rtsp://admin:!@34ZXcv@192.168.1.108/cam/realmonitor?channel=1&subtype=1'
RECORD_BASE="/home/pi/smartpole/recordings/${POLE_NAME}"

# ── Pre-create today + tomorrow directories ──
mkdir -p "${RECORD_BASE}/$(date +%Y-%m-%d)"
mkdir -p "${RECORD_BASE}/$(date -d 'tomorrow' +%Y-%m-%d)"

# Background loop: refresh ทุก 30 นาที กัน midnight roll-over miss
(
  while true; do
    mkdir -p "${RECORD_BASE}/$(date +%Y-%m-%d)"
    mkdir -p "${RECORD_BASE}/$(date -d 'tomorrow' +%Y-%m-%d)"
    sleep 1800
  done
) &
DIR_PID=$!

trap "kill $DIR_PID 2>/dev/null" SIGTERM SIGINT EXIT

# ffmpeg: RTSP → transcode HEVC→H.264 baseline + silent AAC → segment mp4 30 นาที
# segment_atclocktime=1 → segment ขึ้นต้นที่ clock boundary (00:00, 00:30, 01:00, ...)
# segment_format_options=movflags=+faststart → moov atom ที่ต้น (browser stream-ready)
ffmpeg \
  -rtsp_transport tcp \
  -i "$RTSP_URL" \
  -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 \
  -map 0:v:0 -map 1:a:0 \
  -c:v libx264 -preset veryfast -profile:v baseline -level 3.0 \
  -pix_fmt yuv420p \
  -r 25 -g 50 -keyint_min 25 -sc_threshold 0 -bf 0 \
  -c:a aac -ar 44100 -b:a 64k \
  -f segment \
  -segment_time 1800 \
  -segment_format mp4 \
  -segment_atclocktime 1 \
  -reset_timestamps 1 \
  -strftime 1 \
  -segment_format_options "movflags=+faststart" \
  "${RECORD_BASE}/%Y-%m-%d/%H-%M-%S.mp4"
