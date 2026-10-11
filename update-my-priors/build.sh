#!/usr/bin/env bash
# Rebuild everything from source: song data -> audio (numpy synth + voice) -> frames (Chromium) -> mux.
#   ./build.sh                 animatic at 1080p
#   RES=540 ./build.sh         fast draft
#   FINAL=1 ./build.sh         no animatic overlay (for the finished video)
#   ./build.sh audio           only the song (build/audio.wav + stems)
set -euo pipefail
cd "$(dirname "$0")"
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
python3 song.py
python3 audio/mix.py
[ "${1:-}" = "audio" ] && exit 0
node video/render.js video "${WORKERS:-4}"
OUT=$([ -n "${FINAL:-}" ] && echo update-my-priors.mp4 || echo update-my-priors-animatic.mp4)
ffmpeg -y -loglevel error -i build/frames.mp4 -i build/audio.wav -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart "$OUT"
echo "wrote $OUT"
