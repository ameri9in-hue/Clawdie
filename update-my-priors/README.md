# Update My Priors

An original electro-pop music video about p(doom). PRIOR, a little robot whose
face is a p(doom) gauge, stays up all night updating its estimate with every
AI headline, and learns the number is a dial, not a verdict.

Lyrics, melody, chords, drums, synths and every frame are made from scratch in code.
PRIOR sings through a local open-weights speech model (Kokoro-82M) that our own
code turns into a singer, with a hand-built formant robot voice doubling it.

**Status: v1 music video, in two performances of the same song:**
- [`update-my-priors.mp4`](update-my-priors.mp4): our own production, sung by PRIOR through a local neural voice (Kokoro + WORLD).
- [`update-my-priors-acestep.mp4`](update-my-priors-acestep.mp4): the same mix re-performed by **ACE-Step 1.5** in cover mode
  (vocals and production regenerated, our structure and timing kept; `audio/check_sync.py` verifies it sits within 10 ms of our grid).
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
| `audio/acestep_cover.py` | Re-performs our mix with ACE-Step 1.5 (cover mode, our lyrics + section tags, CPU in bfloat16) |
| `audio/check_sync.py` | Checks a re-performance still sits on our beat grid, so the video stays in sync |
| `audio/get_acestep.sh` | Sets up ACE-Step 1.5 for CPU (clone, Python 3.12 venv, ~6 GB of weights) |
| `video/kit.js` | Drawing kit: PRIOR's rig and poses, gauges, skylines, particles, grain, post FX |
| `video/scenes.js` | The 18 shots |
| `video/mv.js` | Engine: shot routing, karaoke lyrics, wipes/flashes, bridge glitch. Every frame is a pure function of `t` |
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
audio/get_acestep.sh                # once, for the ACE-Step version
SINGER=acestep ACESTEP_ROOT=../.acestep/ACE-Step-1.5 ACESTEP_PYTHON=../.acestep/venv/bin/python ./build.sh
                                    # -> update-my-priors-acestep.mp4 (~8 min of ACE-Step on a 4-core CPU)
# live preview: open video/index.html after building, press space to play with audio;
# video/index.html?t=42 shows one frame
```

Needs python3 with numpy, node with playwright (Chromium), and ffmpeg.
Fonts (Archivo Black, Space Grotesk, JetBrains Mono) are OFL-licensed, from @fontsource.
