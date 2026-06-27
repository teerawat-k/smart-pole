#!/bin/bash
# Smart Pole — Live RTMP push (mobile-optimized + watchdog auto-recover)
#
# วิดีโอสดวิ่งบน 4G ต่อเนื่อง = flow ที่เปราะสุด (MQTT/rsync ทนกว่า)
# ปัญหาจริงบน 4G: RTMP connection หลุด → ffmpeg "ค้าง" (CLOSE-WAIT) ไม่ exit
#   → retry loop ธรรมดาไม่ช่วย (มันทำงานตอน ffmpeg exit เท่านั้น)
# วิธีแก้: watchdog ตรวจว่ามี ESTAB connection ไป host:port ไหม — ถ้าค้าง → kill → reconnect
#
# Recording (mp4 คุณภาพสูงกว่า) แยกใน smartpole-record.service — local + rsync resumable

POLE_NAME="pole-01"
RTSP_URL='rtsp://admin:!@34ZXcv@192.168.1.108/cam/realmonitor?channel=1&subtype=1'
RTMP_URL="rtmp://152.42.242.162:7735/live/${POLE_NAME}"
RTMP_HOSTPORT=$(echo "$RTMP_URL" | sed -E 's#rtmp://([^/]+)/.*#\1#')   # เช่น 152.42.242.162:7735

# ── Live profile — เบาเพื่อ 4G uplink เสถียร (override ผ่าน env / fleet config) ──
SCALE="${SMARTPOLE_LIVE_SCALE:-640:360}"
FPS="${SMARTPOLE_LIVE_FPS:-12}"
MAXRATE="${SMARTPOLE_LIVE_MAXRATE:-100k}"
BUFSIZE="${SMARTPOLE_LIVE_BUFSIZE:-200k}"
CRF="${SMARTPOLE_LIVE_CRF:-28}"
GOP=$(( FPS * 2 ))

# watchdog tuning
GRACE="${SMARTPOLE_LIVE_GRACE:-20}"        # รอ ffmpeg connect ก่อนเริ่มตรวจ (วินาที)
CHECK_INTERVAL="${SMARTPOLE_LIVE_CHECK:-10}"
MISS_LIMIT="${SMARTPOLE_LIVE_MISS:-2}"     # miss ติดกันกี่ครั้งถึง kill (2×10s = ~20s)

rtmp_established() {
  ss -tn 2>/dev/null | awk -v hp="$RTMP_HOSTPORT" '$1=="ESTAB" && $5==hp' | grep -q .
}

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
    -f flv "$RTMP_URL" &
  FFPID=$!

  # ── Watchdog: kill ffmpeg ถ้า RTMP connection ค้าง (ไม่ ESTAB) ──
  sleep "$GRACE"
  miss=0
  while kill -0 "$FFPID" 2>/dev/null; do
    if rtmp_established; then
      miss=0
    else
      miss=$((miss + 1))
      echo "[$(date -Is)] RTMP ไม่ ESTAB → host (miss=${miss}/${MISS_LIMIT})"
      if [ "$miss" -ge "$MISS_LIMIT" ]; then
        echo "[$(date -Is)] RTMP ค้าง → kill ffmpeg เพื่อ reconnect"
        kill "$FFPID" 2>/dev/null
        sleep 2
        kill -9 "$FFPID" 2>/dev/null
        break
      fi
    fi
    sleep "$CHECK_INTERVAL"
  done

  wait "$FFPID" 2>/dev/null
  echo "[$(date -Is)] stream ended/killed — reconnect in 3s..."
  sleep 3
done
