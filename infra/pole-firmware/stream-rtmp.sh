#!/bin/bash
# Smart Pole — single ffmpeg with tee muxer:
#   • Output 1: RTMP push → SRS (live playback via dashboard)
#   • Output 2: mp4 segment 30 นาที → local disk (รี-sync ไป DO)
# ทำ transcode ครั้งเดียว (HEVC → H.264 baseline + silent AAC) — ใช้ CPU ประหยัด

POLE_NAME="pole-01"
RTSP_URL='rtsp://admin:!@34ZXcv@192.168.1.108/cam/realmonitor?channel=1&subtype=1'
RTMP_URL="rtmp://152.42.242.162:7735/live/${POLE_NAME}"
RECORD_BASE="/home/pi/smartpole/recordings/${POLE_NAME}"

# ── Pre-create today + tomorrow directories (ffmpeg segment muxer ไม่ auto-create) ──
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

# กัน orphan: ฆ่า background loop เมื่อ script จบ
trap "kill $DIR_PID 2>/dev/null" SIGTERM SIGINT EXIT

# ── ffmpeg with tee muxer ──
# -map: เลือก video จาก RTSP (input 0) + silent audio จาก lavfi (input 1)
# -f tee: ส่ง encoded stream ไปยัง 2 ปลายทาง โดย encode ครั้งเดียว
#   [f=flv:onfail=ignore]   RTMP — onfail=ignore ถ้า SRS ดับ ไม่ทำให้ ffmpeg ตาย
#   [f=segment:...]         segment muxer 30 นาที, strftime สำหรับ filename
ffmpeg \
  -rtsp_transport tcp \
  -i "$RTSP_URL" \
  -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 \
  -map 0:v:0 -map 1:a:0 \
  -c:v libx264 -preset veryfast -profile:v baseline -level 3.0 \
  -pix_fmt yuv420p \
  -r 25 -g 50 -keyint_min 25 -sc_threshold 0 -bf 0 \
  -c:a aac -ar 44100 -b:a 64k \
  -f tee \
  "[f=flv:onfail=ignore]${RTMP_URL}|[f=segment:segment_time=1800:segment_format=mp4:segment_atclocktime=1:reset_timestamps=1:strftime=1:segment_format_options=movflags=+faststart]${RECORD_BASE}/%Y-%m-%d/%H-%M-%S.mp4"
