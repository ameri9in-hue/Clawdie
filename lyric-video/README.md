# 把晚風留給我 · Lyric Video

A 3:00 lyric video for the original song *把晚風留給我* ("Leave the Evening Breeze to Me"), with lyrics in
Traditional Chinese. It has a soft, painterly night-time look and a full layer of motion design. Nothing in it is pixel art.
**[Watch `wanfeng-lyric-video.mp4`](wanfeng-lyric-video.mp4)**

## Scenes

Each scene follows what the lyrics are describing at that point in the song:

| Time | Lyrics | Scene |
|---|---|---|
| 0:00 | intro | Dusk over a rainy skyline as the city lights come on. The title fades in and the rain eases. |
| 0:12 | 雨停在末班車經過以後 / 路燈把影子… | The last bus pulls away from a wet street. A streetlamp casts a long, soft shadow. |
| 0:18 | 便利店的門… / 沒送出的問候 / 城市總催著… | A glowing corner store. A figure holds an unsent letter while car light trails rush past. |
| 0:27 | 舊巷盡頭 / 偶爾回頭 / 還在等候 | An old lantern-lit alley. The figure walks to the end, turns back and waits. |
| 0:42 | Chorus 1: 把晚風留給我… | Rooftops at blue hour with ribbons of breeze. The city's lights go out on 等滿城燈火都沉默 while one window stays lit, and two stars drift together for the promise. |
| 0:56 | 吹過你窗前那盞燈火 | A lamp-lit window with curtains billowing in the wind. |
| 0:59 | 哪怕世界匆匆走過 / 沿著思念找到我 | The city from above in time-lapse. A ribbon of wind finds one window. |
| 1:05 | 杯子還放在窗口 / 一半是月光，一半是以後 | A cup on the sill, lit half by moonlight and half by lamplight. Mist rolls in for "走丟". |
| 1:16 | 繞遠的路口 / 牽一次你的手 | A lantern travels a winding road. Two people meet and join hands. |
| 1:24 | 如果時間能夠倒流 / 向你的方向走 | Star trails that spin backwards. A figure walks toward a lit window. |
| 1:35 | Chorus 2 | Rooftops, window and city again, with a deeper night palette. |
| 1:58 | 也許… / 推開那扇門 / 夜色的另一邊 | Vertical lyric columns and letterbox bars. A door in the night swings open and warm light floods out. |
| 2:07 | 唱成一首歌 / 第一束晨光 / 不再害怕錯過 | A starlit meadow. Motes of light rise from the singer, a beam of first light comes down and gathers them, and a second person arrives. |
| 2:23 | 吹散所有遲到的寂寞 | Wind scatters heavy clouds and the moon comes out. |
| 2:31 | 沿著你的目光 / 找到我 | Two people find each other under a streetlamp. The camera then rises into the sky. |
| 2:44 | outro | A quiet sky over the city and the closing title. |

## Motion design

- **Kinetic lyrics.** Verse lines rise in out of a blur. Chorus lines float in on the wind with a small overshoot.
  Title-phrase lines track in from wide letter spacing and get an underline that draws itself.
  Each character pops when it is sung, a glint travels along the line, and sparks drift off sung characters.
  Lines leave by blowing away on the breeze.
- **Bridge.** The lines become vertical poem columns, and letterbox bars slide in for the moment.
- **Transitions.** Wind wipes with ribbons and petals, push-in zooms, whip pans with motion blur,
  an iris that opens out of a lit window, and dips through the night.
- **Camera.** It floats and rolls slightly, and breathes on the beat (89.6 BPM, detected from the track),
  more strongly in the choruses.
- **Light and depth.** Light leaks, lens flares on lamps and the moon, light rays, swaying foreground branches,
  bokeh and drifting dust.

## How it's made

Everything you see is drawn in code. The only assets are the song and a subset of
[LXGW WenKai TC](https://github.com/lxgw/LxgwWenkaiTC) (SIL OFL) used for the lyrics.

- `lyrics.js` holds the lyrics from the songwriter's lyric sheet, in Traditional Chinese. Timings came from separating
  the vocals (Spleeter), running VAD, and cross-checking ASR models (Paraformer, SenseVoice, Whisper).
- `scene.js` is a time-driven canvas engine: 18 scenes, motion transitions, a camera rig, kinetic typography and post effects.
- `tools/envelope.py` writes `env.js`: per-frame loudness plus a beat grid from spectral-flux onsets
  and a dynamic-programming beat tracker.
- `render.js` renders frames in headless Chromium with Playwright and sends them to ffmpeg.

```bash
./build.sh            # needs node + playwright, python3 + numpy, ffmpeg
open index.html       # live preview: click to play with audio (index.html?t=42 shows a single frame)
```

`tools/subset_font.py` rebuilds the font subset if the lyrics change.
