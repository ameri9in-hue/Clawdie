# 把晚風留給我 · Lyric Video

A 3:00 lyric video for the original song *把晚風留給我* ("Leave the Evening Breeze to Me"), painted in
watercolour and ink on paper, with lyrics in Traditional Chinese.
**[Watch `wanfeng-lyric-video.mp4`](wanfeng-lyric-video.mp4)**

Each scene is an illustration painted onto a cream page. The lyrics are inked on the paper below the painting.
When the scene changes, the old painting fades back into the paper while the next one bleeds in from a point
that matters in the story: a lamp, a window, the light of a door.

## Scenes

| Time | Lyrics | Painting |
|---|---|---|
| 0:00 | title | Dusk over the city, the rain easing, windows lighting up. The title is brushed on and sealed. |
| 0:11 | Verse 1 | One long pan down a street after rain: the last bus pulling away, a streetlamp, the corner store, and a girl holding an unsent letter while traffic streaks past. |
| 0:26 | 舊巷盡頭 / 回頭 / 等候 | An old lane of plaster walls, potted plants, red lanterns, laundry and a cat on the steps. She walks up the lane, turns back and waits. |
| 0:41 | Chorus 1 | Rooftops at blue hour with water tanks, laundry and mountains. Gusts of breeze arrive on the downbeats. On 等滿城燈火都沉默 the city's lights go out and only one window stays lit. Two stars draw together for the promise. |
| 0:55 | 窗前那盞燈火 / 匆匆走過 | A lamp-lit window with curtains, flower boxes and a wind chime. Clouds race across the glass, and the breeze rings the chime. |
| 1:04 | Verse 2 | Inside: a cup on the sill, half moonlight and half lamplight. A small sketch of "tomorrow" draws itself, then mist rolls in. |
| 1:15 | 繞遠的路口 / 牽一次你的手 | A lantern travels a winding road over the hills. Two people meet at the top and take each other's hand. |
| 1:24 | 時間倒流 / 你的方向 | Star trails turn backwards. She walks toward a lit house. |
| 1:34 | Chorus 2 | The rooftops and the window again, at night under a half moon. |
| 1:57 | Bridge | A door in the night, overgrown with ivy, opens onto a warm room. The lyrics become a vertical poem in the margin. |
| 2:10 | Final chorus | The other side of the night: a meadow. Her longing rises as light. First light comes down as a beam, and he walks through the grass to her. |
| 2:23 | 吹散所有遲到的寂寞 | The wind scatters heavy clouds, and the city lights come back on. |
| 2:30 | 沿著你的目光 / 找到我 | Under a streetlamp they find each other. The camera rises into the sky. |
| 2:43 | Outro | A quiet sky with birds. The painting fades back into the paper, leaving the title and the seal. |

## Design

- **Watercolour.** Washes are built from dozens of translucent, slightly different deformations of each shape
  (recursive midpoint displacement). That gives soft bleeding edges, pooled pigment and granulation.
  Ink lines wander a little and vary in pressure. Everything is laid onto a cold-press paper texture
  with a multiply blend, so the paper grain and fibres show through the paint.
- **Lyrics.** Each character is brushed on with a sweeping reveal and a little ink bleed. A watercolour
  "highlighter" stroke grows under the words as they are sung, with its colour changing by section.
  Sung characters darken from grey to full ink, and finished lines dilute away into the paper.
  Each 把晚風留給我 gets a vermilion 晚風 seal stamped beside it, and the bridge is written as vertical
  columns in the margin.
- **Pacing.** There are 15 scene changes in 3 minutes. Each painting holds through a whole phrase, and the camera
  moves slowly through layered parallax. All transitions are one organic watercolour bleed (a noise-field mask
  with a faint tide line), timed just ahead of the phrase it introduces.
- **Music.** The beat grid (89.6 BPM, detected from the track) times the gusts of wind in the choruses,
  and lamp glows breathe with the song's loudness.

## How it's made

Everything you see is drawn in code. The only assets are the song and a subset of
[LXGW WenKai TC](https://github.com/lxgw/LxgwWenkaiTC) (SIL OFL) for the lyrics.

- `lyrics.js` holds the lyrics from the songwriter's lyric sheet, in Traditional Chinese, with timings taken from the
  vocals (Spleeter separation, VAD, and cross-checked ASR).
- `js/paint.js` is the watercolour and ink toolkit: noise, paper, washes, ink lines, petals, wind strokes and
  painted people.
- `js/scenes.js` holds the paintings. Each one has baked parallax layers, a camera path and live elements.
- `js/type.js` handles the ink typography, wash highlights and the seal.
- `js/main.js` handles the timeline, lazy baking, bleed transitions and the composite onto paper.
- `tools/envelope.py` writes `env.js` (loudness and beat grid). `render.js` renders frames in headless Chromium.

```bash
./build.sh            # needs node + playwright, python3 + numpy, ffmpeg
open index.html       # live preview: click to play with audio (index.html?t=42 shows a single frame)
```

`tools/subset_font.py` rebuilds the font subset if the lyrics change.
