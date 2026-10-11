# Update My Priors

An original electro-pop music video about p(doom). PRIOR, a little robot whose
face is a p(doom) gauge, stays up all night updating its estimate with every
AI headline, and learns the number is a dial, not a verdict.

Lyrics, melody, chords, drums, synths and every frame are made from scratch in code.
PRIOR sings through a local open-weights speech model (Kokoro-82M) that our own
code turns into a singer, with a hand-built formant robot voice doubling it.

**Status: v2 music video, in two performances of the same song:**
- [`update-my-priors-acestep.mp4`](update-my-priors-acestep.mp4): **ACE-Step 1.5** sings our lyrics. Whisper, given no hint
  of the words, hears **92%** of them; the video is re-timed so every word appears as it is sung.
- [`update-my-priors.mp4`](update-my-priors.mp4): our own production, sung by PRIOR through Kokoro + WORLD
  (Whisper hears 51% of the words, so treat it as the robot-voice cut).

Every performance is checked by ear-proxy: `audio/lyric_check.py` separates the vocal (Demucs),
transcribes it (Whisper) and scores it line by line against the lyrics.
The production path and what is left are in [PLAN.md](PLAN.md).

| File | What it is |
|---|---|
| [PLAN.md](PLAN.md) | The production path: concept, look, architecture, phases, risks |
| [LYRICS.md](LYRICS.md) | The lyrics |
| [STORYBOARD.md](STORYBOARD.md) | 18 shots keyed to bars, plus the character sheet |
| `song.py` | **The song as data**: sections, chords, melody with syllables, needle keyframes, shots |
| `audio/singer.py` | **Neural singing voice**: Kokoro-82M (local ONNX) as a voicebank, turned into singing with the WORLD vocoder |
| `audio/voice.py` | The from-scratch formant robot voice (fallback, and PRIOR's robotic double in the choruses) |
| `audio/mix.py` | Drums, bass, pads, arp, backing oohs, FX, de-esser, reverb, mix → `build/audio.wav`, stems, vocal envelope |
| `audio/get_models.sh` | Fetches the Kokoro weights + voice styles from npm and verifies the checksum |
| `audio/acestep_song.py` | ACE-Step 1.5 sings our tagged lyrics (text2music + planning LM, CPU in bfloat16), one take per seed |
| `audio/lyric_check.py` | Demucs + Whisper transcription of a take, scored against the lyrics; records when each word is sung |
| `audio/retime.py` | Re-times the video to a take: song time per frame, plus each word's sung time, captions and vocal glow |
| `audio/get_acestep.sh` | Sets up ACE-Step 1.5 for CPU (clone, Python 3.12 venv, ~6 GB of weights) |
| `video/kit.js` | Drawing kit: PRIOR's rig and poses, gauges, skylines, particles, grain, post FX |
| `video/scenes.js` | The 18 shots |
| `video/lyrics.js` | Kinetic lyrics: every word on its sung time; editorial verses, stamped choruses, typewriter bridge |
| `video/mv.js` | Engine: shot routing, living camera, bloom and light leaks, wipes, bridge glitch, performance re-timing |
| `video/render.js` | Headless Chromium → ffmpeg frame renderer |
| `build.sh` | Builds everything |

```bash
audio/get_models.sh                 # once: Kokoro-82M weights (92 MB) + voices into models/
pip install kokoro-onnx pyworld scipy
./build.sh audio                    # just the song (~4 min first time, ~45 s once the voicebank is cached)
RES=540 ./build.sh                  # quick draft video
./build.sh                          # 1080p music video
ANIMATIC=1 ./build.sh               # same, with the storyboard overlay
VOICE=formant ./build.sh            # the old robot voice instead of the neural singer
audio/get_acestep.sh                # once, for the ACE-Step version (+ pip install demucs faster-whisper in its venv)
SINGER=acestep ACESTEP_ROOT=../.acestep/ACE-Step-1.5 ACESTEP_PYTHON=../.acestep/venv/bin/python ./build.sh
                                    # renders takes (SEEDS="11 23 37", ~10 min each on 4 CPU cores), keeps the one
                                    # Whisper understands best (must reach MIN_LYRIC_ACC=0.75), re-times the video to it
# live preview: open video/index.html after building, press space to play with audio;
# video/index.html?t=42 shows one frame
```

Needs python3 with numpy, node with playwright (Chromium), and ffmpeg.
Fonts (Archivo Black, Space Grotesk, JetBrains Mono) are OFL-licensed, from @fontsource.
