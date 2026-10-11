#!/usr/bin/env bash
# Rebuild everything from source: song data -> audio (synth band + singing voice) -> frames (Chromium) -> mux.
#   ./build.sh                 the music video at 1080p   -> update-my-priors.mp4
#   RES=540 ./build.sh         fast draft
#   ANIMATIC=1 ./build.sh      with the storyboard overlay -> update-my-priors-animatic.mp4
#   ./build.sh audio           only the song (build/audio.wav + stems)
#   VOICE=formant ./build.sh   use the formant robot voice instead of the Kokoro singer
#   SINGER=acestep ./build.sh  ACE-Step 1.5 re-performs our mix (cover mode), checked against our timeline
#                              needs ACESTEP_ROOT (ACE-Step-1.5 clone with checkpoints/) and ACESTEP_PYTHON (its venv)
# The Kokoro singer needs models/ (audio/get_models.sh) and: pip install kokoro-onnx pyworld scipy
set -euo pipefail
cd "$(dirname "$0")"
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
python3 song.py
python3 audio/mix.py
AUDIO=build/audio.wav
if [ "${SINGER:-}" = "acestep" ]; then
  "${ACESTEP_PYTHON:-python3}" audio/acestep_cover.py --strength "${COVER_STRENGTH:-1.0}" --seed "${SEED:-7}" --out build/acestep.wav
  python3 audio/check_sync.py build/acestep.wav
  AUDIO=build/acestep.wav
fi
[ "${1:-}" = "audio" ] && exit 0
node video/render.js video "${WORKERS:-4}"
OUT=update-my-priors$([ "${SINGER:-}" = "acestep" ] && echo -acestep)$([ -n "${ANIMATIC:-}" ] && echo -animatic).mp4
ffmpeg -y -loglevel error -i build/frames.mp4 -i "$AUDIO" -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart "$OUT"
cp build/lyrics.srt "${OUT%.mp4}.srt"
echo "wrote $OUT ($(du -h "$OUT" | cut -f1)) + captions"
