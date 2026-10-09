#!/usr/bin/env bash
# Rebuild the video from source: frames (Playwright + Chromium) -> audio (numpy synth) -> mux.
set -euo pipefail
cd "$(dirname "$0")"
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
node render.js video "${WORKERS:-4}"
python3 audio.py
ffmpeg -y -loglevel error -i build/frames.mp4 -i build/audio.wav -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart ai-fighter-2026.mp4
echo "wrote ai-fighter-2026.mp4"
