# 把晚风留给我 · Lyric Video

A 3:00 lyric video for the original song *把晚风留给我* ("Leave the Evening Breeze to Me").
It has a soft, painterly night-time look and smooth crossfades. Nothing in it is pixel art.
**[Watch `wanfeng-lyric-video.mp4`](wanfeng-lyric-video.mp4)**

## Scenes

Each scene follows what the lyrics are describing at that point in the song:

| Time | Lyrics | Scene |
|---|---|---|
| 0:00 | intro | Dusk over a rainy skyline as the city lights come on. The title fades in and the rain eases. |
| 0:12 | 雨停在末班车经过以后 / 路灯把影子… | The last bus pulls away from a wet street. A streetlamp casts a long, soft shadow. |
| 0:18 | 便利店的灯… / 没送出的问候 / 城市总催着… | A glowing corner store. A figure holds an unsent letter while car light trails rush past. |
| 0:27 | 旧巷尽头 / 偶尔回头 / 还在等候 | An old lantern-lit alley. The figure walks to the end, turns back and waits. |
| 0:42 | Chorus 1: 把晚风留给我… | Rooftops at blue hour with ribbons of breeze. The sunset fades out ("火都沉默") and two stars drift together for the promise. |
| 0:56 | 吹过你窗前那盏灯火 | A lamp-lit window with curtains billowing in the wind. |
| 0:59 | 哪怕世界匆匆走过 / 风会沿着思念找到我 | The city from above in time-lapse. A ribbon of wind finds one window. |
| 1:05 | 杯子还放在窗口 / 一半是月光，一半是以后 | A cup on the sill, lit half by moonlight and half by lamplight. Mist rolls in for "走丢". |
| 1:16 | 绕远的路 / 牵一次你的手 | A lantern travels a winding road. Two people meet and join hands. |
| 1:24 | 如果时间能够倒流 / 向你的方向走 | Star trails that spin backwards. A figure walks toward a lit window. |
| 1:35 | Chorus 2 | Rooftops, window and city again, with a deeper night palette. |
| 1:58 | 也许… / 推开那扇门 / 夜色的另一边 | A door in the night swings open and warm light floods out. |
| 2:07 | 唱成一首歌 / 熟成光亮 | A starlit meadow. Motes of light rise from the singer and gather into the Milky Way. |
| 2:23 | 吹散所有巨大的寂寞 | Wind scatters heavy clouds and the moon comes out. |
| 2:31 | 沿着你的目光 / 找到我 | Two people find each other under a streetlamp. The camera then rises into the sky. |
| 2:44 | outro | A quiet sky over the city and the closing title. |

## How it's made

Everything you see is drawn in code. The only assets are the song and a subset of
[LXGW WenKai](https://github.com/lxgw/LxgwWenKai) (SIL OFL) used for the lyrics.

- `lyrics.js` holds the lyric timeline. Timings came from separating the vocals (Spleeter), running VAD,
  and cross-checking three ASR models (Paraformer, SenseVoice, Whisper).
- `scene.js` is a time-driven canvas engine with 18 scenes and eased crossfades. It adds parallax and slow
  camera moves, glows, bokeh, petals and fireflies, plus a light colour grade, vignette and film grain.
  Lyrics appear one character at a time, and a warm highlight sweeps across them in time with the singing.
  Glows pulse gently with the music's loudness (`env.js`).
- `render.js` renders frames in headless Chromium with Playwright and sends them to ffmpeg.

```bash
./build.sh            # needs node + playwright, python3 + numpy, ffmpeg
open index.html       # live preview: click to play with audio (index.html?t=42 shows a single frame)
```

`tools/subset_font.py` rebuilds the font subset if the lyrics change.
