# Update My Priors

An original electro-pop music video about p(doom). PRIOR, a little robot whose
face is a p(doom) gauge, stays up all night updating its estimate with every
AI headline, and learns the number is a dial, not a verdict.

Everything is made from scratch in code: lyrics, melody, chords, drums, synths,
the singing voice (a hand-built formant synthesizer) and every frame.

**Status: P0 (pre-production) done.** The song plays end to end with the robot
voice, and [`update-my-priors-animatic.mp4`](update-my-priors-animatic.mp4) shows
final timing, lyrics, needle and character with the storyboard notes overlaid.
The full production path is in [PLAN.md](PLAN.md).

| File | What it is |
|---|---|
| [PLAN.md](PLAN.md) | The production path: concept, look, architecture, phases P0 to P5, risks |
| [LYRICS.md](LYRICS.md) | The lyrics |
| [STORYBOARD.md](STORYBOARD.md) | 18 shots keyed to bars, plus the character sheet |
| `song.py` | **The song as data**: sections, chords, melody with syllables, needle keyframes, shots |
| `audio/voice.py` | PRIOR's singing voice: formant synthesis and a phonetic dictionary |
| `audio/mix.py` | Drums, bass, pads, arp, backing oohs, FX, reverb, mix → `build/audio.wav` + stems |
| `video/mv.js` | Canvas engine. Each frame is a pure function of `t`. Draws the animatic today. |
| `video/render.js` | Headless Chromium → ffmpeg frame renderer |
| `build.sh` | Builds everything |

```bash
./build.sh audio           # just the song: build/audio.wav and build/stems/*.wav (~45 s)
RES=540 ./build.sh         # quick animatic draft
./build.sh                 # 1080p animatic
FINAL=1 ./build.sh         # final video without the overlay
# live preview: open video/index.html after building, press space to play with audio;
# video/index.html?t=42 shows one frame
```

Needs python3 with numpy, node with playwright (Chromium), and ffmpeg.
