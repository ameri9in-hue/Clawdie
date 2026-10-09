# AI FIGHTER '26: Claude vs ChatGPT

A ~1:45 pixel-art arcade fighting game "match" between the two chatbots' mascots,
based on their 2026 rivalry. **[Watch `ai-fighter-2026.mp4`](ai-fighter-2026.mp4)**

| | Round | Based on | Result |
|---|---|---|---|
| 1 | **The Big Game Ad War** | Feb 2026: Anthropic's Super Bowl ads about ChatGPT getting ads | Claude (*Ad-Free Shield* reflects pop-up ads) |
| 2 | **Launch Day** | Feb 5 2026: Claude Opus 4.6 and GPT-5.3 Codex launched about 20 minutes apart | ChatGPT (*900M User Rush*) |
| 3 | **The IPO Race** | Jun 2026: both companies reportedly filed to go public in the same week | Double K.O. |

The winner? The users.

## How it's made

Everything is generated from code. There are no image or audio assets apart from two pixel fonts.

- `game.js`: a time-driven canvas engine. It has pixel-art sprites drawn per pose,
  three stages, choreography written as timed moves, hit-stop, super-move cut-ins,
  combos, a HUD, particles and a CRT post-process. Every frame is a pure function of `t`.
- `render.js`: renders frames in headless Chromium (Playwright) and pipes them to ffmpeg.
- `audio.py`: synthesizes the chiptune score and all SFX with numpy. It reads the
  event timeline that `game.js` exports, so sound is frame-accurate.

```bash
./build.sh            # needs node + playwright, python3 + numpy, ffmpeg
open index.html       # live preview in a browser (index.html?t=42 shows a single frame)
```

*A fan-made parody. Not affiliated with OpenAI or Anthropic.*
