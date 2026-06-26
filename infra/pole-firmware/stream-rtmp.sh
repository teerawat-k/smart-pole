#!/bin/bash
# Smart Pole — Live RTMP push (mobile-optimized + resilient retry loop)
#
# วิดีโอสดวิ่งบน 4G ต่อเนื่อง = flow ที่เปราะสุด (MQTT/rsync ทนกว่า)
# → ทำให้ "เบา" (res/bitrate/fps ต่ำ) + "reconnect เองเมื่อหลุด" (retry loop)
# Recording (mp4 คุณภาพสูงกว่า) แยกใน smartpole-record.service — เก็บ local + rsync resumable

POLE_NAME="pole-01"
RTSP_URL='rtsp://admin:!@34ZXcv@192.168.1.108/cam/realmonitor?channel=1&subtype=1'
RTMP_URL="rtmp://152.42.242.162:7735/live/${POLE_NAME}"

# ── Live profile — เบาเพื่อ 4G uplink เสถียร (override ผ่าน env / fleet config) ──
# เดิม 704x576/15fps/150k → ลดเป็น 640x360/12fps/100k (live monitoring พอ + ทน 4G jitter)
SCALE="${SMARTPOLE_LIVE_SCALE:-640:360}"
FPS="${SMARTPOLE_LIVE_FPS:-12}"
MAXRATE="${SMARTPOLE_LIVE_MAXRATE:-100k}"
BUFSIZE="${SMARTPOLE_LIVE_BUFSIZE:-200k}"
CRF="${SMARTPOLE_LIVE_CRF:-28}"
GOP=$(( FPS * 2 ))   # keyframe ~2 วินาที (HLS/FLV aligned)

# retry loop — RTMP/RTSP หลุดบน 4G → reconnect เองใน 3s
# (ไม่พึ่ง systemd restart อย่างเดียว → กัน start-limit + recover เร็ว)
while true; do
  ffmpeg -hide_banner -loglevel warning -nostats \
    -rtsp_transport tcp -thread_queue_size 1024 \
    -i "$RTSP_URL" \
    -thread_queue_size 512 -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 \
    -map 0:v:0 -map 1:a:0 \
    -vf "scale=${SCALE}" \
    -c:v libx264 -preset veryfast -profile:v baseline -level 3.0 \
    -pix_fmt yuv420p \
    -crf "$CRF" -maxrate "$MAXRATE" -bufsize "$BUFSIZE" \
    -r "$FPS" -g "$GOP" -keyint_min "$FPS" -sc_threshold 0 -bf 0 \
    -c:a aac -ar 44100 -b:a 32k \
    -flush_packets 1 -max_muxing_queue_size 1024 \
    -f flv "$RTMP_URL" || true
  echo "[$(date -Is)] stream ended/dropped — reconnect in 3s..."
  sleep 3
done
