#!/usr/bin/env bash
# Rebuild the lyric video: frames (Playwright + Chromium) -> mux with the original track.
set -euo pipefail
cd "$(dirname "$0")"
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
python3 tools/envelope.py
node render.js video "${WORKERS:-4}"
ffmpeg -y -loglevel error -i build/frames.mp4 -i audio/wanfeng.mp3 -map 0:v -map 1:a -c:v libx264 -preset slow -b:v 3800k -maxrate 6000k -bufsize 12000k -pix_fmt yuv420p -c:a aac -b:a 256k -shortest -movflags +faststart wanfeng-lyric-video.mp4
echo "wrote wanfeng-lyric-video.mp4"
