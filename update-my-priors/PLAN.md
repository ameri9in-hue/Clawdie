# Production path: Update My Priors

An original music video in the "p(doom)" lineage of animated AI-safety pop songs,
built from zero: concept, lyrics, melody, harmony, rhythm, synth sounds and every
frame are written as code in this folder. There are no samples, stock assets or
AI music services. The only pretrained model is a local open-weights speech
model (Kokoro-82M, Apache-2.0), used as a voicebank that our own code makes sing.

## 1. What we take from the reference, and what we don't

| From the genre (shared) | Ours (original) |
|---|---|
| Upbeat pop about a grim AI-risk statistic, sung with a wink | New song, title, lyrics, melody and chord progression. No lines or hooks reused. |
| Animated video, lyrics on screen, a visible "doom number" | A character, **PRIOR**, whose face *is* the gauge. The needle acts out the lyrics. |
| Ends on a call to agency | Bayesian frame: the number is a *forecast, not a fate*, a dial people can turn. |

## 2. Concept

- **Logline:** a small robot stays up all night refreshing AI news, updating its
  p(doom) with every headline, until it realises the number is a dial and not a verdict.
- **Arc:** curiosity (verse 1) → anxiety (pre-chorus) → manic updating (chorus) →
  creeping dread (verse 2) → whiplash (bridge) → agency (final chorus, key lift) →
  quiet sunrise (tag/outro).
- **Tone:** bright and danceable, sincere under the jokes. Never fear-mongering.
  No real companies, products or people. Headlines are fictional and generic.

## 3. Look and sound

**Picture.** Flat vector motion graphics. 1920×1080, 30 fps.
- Palette: ink `#12142b`, cream `#fff4e0`, coral `#ff5d5d`, mint `#4fe3b5`, sun `#ffc94d`, violet `#7a5cff`.
- Bold heavy sans for lyrics, mono for data and readouts. Lyrics are always on
  screen, karaoke-highlighted per syllable.
- Motion rules: everything moves on the grid (beats, 8ths, 16ths). Cuts only on
  bar lines or on stutter FX. One big gesture per bar, not ten small ones.

**Sound.** Electro-pop, 120 BPM, A minor, 2:24. The final chorus lifts a whole tone to B minor.
- Drums: synthesized kick, clap and hats. A syncopated verse groove, four-on-the-floor
  choruses, a half-time bridge with glitch stutters.
- Bass: saw plus sub, eighth-note pulse, octave pops in the choruses. Sidechained to the kick.
- Pads: 3× detuned supersaw chords; the lowpass opens section by section.
- Arp: 16th-note square plucks with a dotted-eighth echo.
- Voice: PRIOR sings through a **local neural voicebank** (`audio/singer.py`).
  Kokoro-82M speaks each syllable from our phonetic dictionary. Then the WORLD
  vocoder stretches the vowel to the note, swaps in the melody's pitch (scoops,
  portamento, delayed vibrato) and resynthesizes it, like an UTAU-style engine.
  The from-scratch **formant synthesizer** (`audio/voice.py`) still sings a quiet
  robotic double in the choruses and the "ooh" pads, and is the fallback when the
  models are missing.

## 4. Architecture: one timeline, two renderers

```
 song.py  ── the composition: sections, chords, melody+syllables, needle keyframes, shot list
    │  python3 song.py
    ▼
 build/song.json  (+ song.js for the browser)
    │                                  │
    ▼ audio/mix.py                     ▼ video/mv.js  (pure function of t, canvas 2D)
 audio/voice.py  (singing)          video/render.js  (headless Chromium → ffmpeg)
    │                                  │
 build/audio.wav + stems/*.wav       build/frames.mp4
    └──────────────┬───────────────────┘
                   ▼ ffmpeg mux (build.sh)
       update-my-priors-animatic.mp4 / update-my-priors.mp4
```

Rule: **timing is only ever written in `song.py`.** Audio and video both derive
from it, so changing a syllable's rhythm moves the voice, the lyric highlight
and the needle together. Nothing is hand-synced.

## 5. The path, phase by phase

| Phase | Goal | Deliverables | Exit check | Status |
|---|---|---|---|---|
| **P0 Pre-production** | Everything needed to start | Concept, [LYRICS.md](LYRICS.md), composition in `song.py`, [STORYBOARD.md](STORYBOARD.md), working audio + video pipeline, animatic v0 | `./build.sh` runs end to end; every line's rhythm fits its bars (asserted) | **Done** |
| **P1 Song lock** | The song sounds finished | Neural singer (Kokoro + WORLD) **done**, de-esser **done**. Left: listen-through fixes per word, drum fills, counter-melody in the final chorus, master to about −14 LUFS | Human listen-through with lyrics hidden: at least 70% of words understood. No clipping. | **In progress** |
| **P2 Visual development** | Lock the look before animating | Fonts, palette, PRIOR rig with poses, motion kit (`video/kit.js`) | Stills of every shot reviewed | **Done** |
| **P3 Shot production** | All 18 shots animated | `video/scenes.js` (S01 to S18). Vocal envelope drives PRIOR's antenna and halo | Every shot plays in sequence at final timing | **Done (v1)** |
| **P4 Polish** | Feels like one piece | Wipes and flashes on bar lines **done**, bridge glitch on the stutters **done**, grain and vignette **done**. Left: `.srt` captions, more secondary motion per shot | Full watch-through, no dead frames | **In progress** |
| **P5 Delivery** | Ship it | `FINAL=1 ./build.sh` at 1080p, thumbnail (S06 frame), description, captions, credits | Plays on phone and desktop; file under 200 MB | |

### P1 detail (start here)
1. `./build.sh audio`, then listen to `build/stems/vocal.wav` alone.
2. For each muddy word, adjust its entry in `LEXICON` (`audio/voice.py`), or the
   consonant timing in `C`, or move the note in `song.py`.
3. Arrangement: add a drum fill in the last bar of each verse, a reverse-crash
   before the choruses, and a counter-melody in the final chorus.
4. Master: measure loudness (`ffmpeg -af ebur128`) and tune `LEVEL` in `audio/mix.py`.

### P3 detail
- `video/mv.js` keeps the frame loop and routes song time to a shot (each section's
  `shots` in `song.py` split it evenly). `video/scenes.js` holds one draw function per shot.
- `video/kit.js` is shared: `prior()` (rig with poses: arms, lean, squash, eyes, props,
  sitting), `gauge()`, `skyline()`, `stars()`, `rays()`, `halftone()`, icons, hands, crowd, grain, vignette.
- A scene can draw the lyrics itself (S06 kinetic type) by setting `x.ownLyrics`.

## 6. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Synthesized voice not intelligible enough | Switched the lead to a neural voicebank. Lyrics are always on screen. Per-word lexicon tuning in P1. The stems are separate, so a human vocal can replace `vocal.wav` without touching anything else. |
| Model weights unavailable (HuggingFace and GitHub were blocked in the build environment) | Weights come from npm (`kokoro-q8-shards`, checksum-verified). `VOICE=formant` falls back to the built-in synth. |
| Mixing without ears in the loop | Per-bus and per-section loudness printed on every build. A human listen gate ends P1. |
| Render time at 1080p | Drafts with `RES=540`. 4 parallel Chromium workers. Every frame is a pure function of `t`, so single stills render instantly (`node video/render.js stills 45.2`). |
| Drifting too close to the reference | Section 1 is the contract: no reused lyrics, melody, title or character. |
| Scope creep in P3 | Shots are ranked: S06, S13, S15 are must-haves; the others can fall back to the animatic layout plus one extra element. |

## 7. Rough effort
P1 ≈ 1 session · P2 ≈ 1 session · P3 ≈ 3–4 sessions (≈5 shots each) · P4–P5 ≈ 1 session.
