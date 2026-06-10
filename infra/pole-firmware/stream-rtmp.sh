#!/bin/bash
POLE_NAME="pole-01"
RTSP_URL='rtsp://admin:!@34ZXcv@192.168.1.108/cam/realmonitor?channel=1&subtype=1'
RTMP_URL="rtmp://152.42.242.162:7735/live/${POLE_NAME}"

exec ffmpeg   -rtsp_transport tcp   -i "$RTSP_URL"   -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100   -c:v libx264 -preset veryfast -profile:v baseline -level 3.0   -pix_fmt yuv420p   -r 25 -g 50 -keyint_min 25 -sc_threshold 0 -bf 0   -c:a aac -ar 44100 -b:a 64k   -map 0:v:0 -map 1:a:0   -f flv   "$RTMP_URL"
