#!/usr/bin/env bash
# Rebuild everything from source: song data -> audio (synth band + singing voice) -> frames (Chromium) -> mux.
#   ./build.sh                 the music video at 1080p   -> update-my-priors.mp4
#   RES=540 ./build.sh         fast draft
#   ANIMATIC=1 ./build.sh      with the storyboard overlay -> update-my-priors-animatic.mp4
#   ./build.sh audio           only the song (build/audio.wav + stems)
#   VOICE=formant ./build.sh   use the formant robot voice instead of the Kokoro singer
#   SINGER=acestep ./build.sh  ACE-Step 1.5 sings our lyrics; takes are scored by Whisper and the video is re-timed to the best
#                              needs ACESTEP_ROOT (ACE-Step-1.5 clone with checkpoints/) and ACESTEP_PYTHON (its venv)
# The Kokoro singer needs models/ (audio/get_models.sh) and: pip install kokoro-onnx pyworld scipy
set -euo pipefail
cd "$(dirname "$0")"
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
python3 song.py
python3 audio/mix.py
AUDIO=build/audio.wav
rm -f build/timemap.js
if [ "${SINGER:-}" = "acestep" ]; then
  # ACE-Step performs our lyrics (text2music + its planning LM); every take is transcribed by Whisper,
  # the take that sings the most of our words wins, and the video is re-timed to its singing.
  PY="${ACESTEP_PYTHON:-python3}"
  "$PY" audio/acestep_song.py --seeds ${SEEDS:-11 23 37}
  for f in build/take_*.wav; do "$PY" audio/lyric_check.py "$f" | tail -2; done
  BEST=$("$PY" -c "import json,glob; r=[(json.load(open(f))['word_accuracy'], f) for f in glob.glob('build/take_*.lyrics.json')]; print(max(r)[1].replace('.lyrics.json','.wav'))")
  ACC=$("$PY" -c "import json; print(json.load(open('${BEST%.wav}.lyrics.json'))['word_accuracy'])")
  echo "best take: $BEST (Whisper hears ${ACC} of our lyric words)"
  "$PY" -c "import sys; sys.exit(0 if $ACC >= ${MIN_LYRIC_ACC:-0.75} else 'no take sings enough of the lyrics; try more SEEDS')"
  "$PY" audio/retime.py "$BEST"
  AUDIO="$BEST"
fi
[ "${1:-}" = "audio" ] && exit 0
node video/render.js video "${WORKERS:-4}"
OUT=update-my-priors$([ "${SINGER:-}" = "acestep" ] && echo -acestep)$([ -n "${ANIMATIC:-}" ] && echo -animatic).mp4
ffmpeg -y -loglevel error -i build/frames.mp4 -i "$AUDIO" -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart "$OUT"
if [ "${SINGER:-}" = "acestep" ]; then cp "${AUDIO%.wav}.srt" "${OUT%.mp4}.srt"; else cp build/lyrics.srt "${OUT%.mp4}.srt"; fi
echo "wrote $OUT ($(du -h "$OUT" | cut -f1)) + captions"
