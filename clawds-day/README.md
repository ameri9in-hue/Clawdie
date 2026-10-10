# CLAWD'S DAY

A ~3 minute pixel-art short about a full day in the life of a whole town of tiny Clawds,
from 6 AM alarm clocks to lights-out. **[Watch `clawds-day.mp4`](clawds-day.mp4)**

| Time | Scene | What happens |
|---|---|---|
| 4:15 AM | **Title** | A hill of sleeping Clawds in nightcaps |
| 5:36 AM | **Wake up, Clawds!** | Alarm clocks ring through the village and Clawds pop out of their houses to stretch and yawn. One sleeps through it, so the neighbours wake them up by banging pots |
| 7:00 AM | **Morning stretch** | 55 Clawds do jumping jacks, squats and a stadium wave in time with the music. One falls over and two others help it up |
| 7:36 AM | **Breakfast time** | Chefs flip pancakes, a line forms at the coffee machine, and the sleepy one nods off again until a friend brings coffee |
| 8:18 AM | **Off to work** | A rush-hour crowd waits for the walk signal, and passengers hop off the Clawd Bus |
| 9:12 AM | **Ship it!** | A bug jumps out of the test screen. Clawds chase it and pile up, a Clawd with a net catches it, and then the tests pass |
| 12:12 PM | **Pizza picnic** | Six Clawds carry a giant pizza and twelve share it, one slice each. An apple drops on the reader under the tree |
| 2:30 PM | **Beach day** | Volleyball, a sandcastle, a surfer, and a 10-Clawd pyramid that wobbles, collapses, and then everyone runs into the sea |
| 6:12 PM | **Clawdstock!** | A sunset concert with a crowd of 75, a conga line, crowd surfing and fireworks |
| 9:00 PM | **Campfire stories** | Toasted marshmallows (one catches fire), a shooting star, and yawns |
| 10:30 PM | **Lights out** | A 20-room dorm with brushing teeth, pillow fights and bed jumping. The lights go out one room at a time, and the last Clawd still at a laptop finally goes to bed |
| 11:57 PM | **Good night, Clawds** | |

## How it's made

Everything is generated from code. The only assets are two pixel fonts, shared with `../video`.

- `engine.js` sets up low-res pixel buffers that are scaled up with nearest-neighbour. It also
  holds the Clawd sprite generator (about 25 poses, eye styles, hats and props, all cached),
  the actor scripting (`walk`/`hop`/`wait`/`fn` steps), sky and day-cycle lighting, and props.
- `scenes1.js` and `scenes2.js` contain the 12 scenes. Every frame is a pure function of time.
- `main.js` handles layout, the clock badge, transitions, and the event and cue timeline export.
- `render.js` renders the frames in headless Chromium (Playwright) and pipes them to ffmpeg.
- `audio.py` synthesizes six chiptune songs and about 60 sound effects with numpy, timed from the
  event timeline.

```bash
./build.sh            # needs node + playwright, python3 + numpy, ffmpeg
open index.html       # live preview (index.html?t=42 shows one frame, ?from=42 plays from there)
```
