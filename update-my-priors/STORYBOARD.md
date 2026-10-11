# Storyboard: Update My Priors

The 18 shots are keyed to bars, so every cut lands on the music. The one-line
version of each shot also lives in `song.py` (`SHOTS`), and the animatic shows it
on screen. This file is the full art direction.

**Recurring motifs**
- **The needle.** The p(doom) gauge on PRIOR's face. It follows `NEEDLE` in `song.py`
  and always reacts to the lyric being sung: *ten percent* sends it to 10%, *turn it down* drops it.
- **The belief curve.** A bell curve centred on the needle. It sharpens when evidence
  lands (choruses) and smears out in doubt (bridge).
- **Headline cards.** Fictional and generic, never real outlets or real companies.
  They hit the dial on chorus downbeats.
- **Color = mood.** Night navy (verses), magenta heat (pre/chorus), monochrome
  (bridge), teal sunrise (final chorus onward).

| Shot | Time | Bars | Section | Lyric | Picture | Motion / camera | Sound sync |
|---|---|---|---|---|---|---|---|
| S01 | 0:00–0:08 | 1–4 | Intro | – | Black. A terminal types `> loading priors...`. One dial flickers on. | Static. Type-on, cursor blink. | Filtered pad opens. Each arp note lights a tick. |
| S02 | 0:08–0:16 | 5–8 | Intro | – | PRIOR boots: eyes blink, antenna lights up, needle idles at 50%. Title card. | Slow push-in. Title slams on bar 5. | Hats enter on bar 5. Riser into the verse. |
| S03 | 0:16–0:24 | 9–12 | Verse 1 | *Woke up at three A.M....* | 3 A.M. bedroom lab: PRIOR at a desk lit by a laptop. Notifications pile up like confetti. | Locked-off wide. Each notification pops on a kick. | Kick pattern drives the pops. |
| S04 | 0:24–0:32 | 13–16 | Verse 1 | *...someone says it's fine...* | Benchmark bar charts grow past the top of frame. PRIOR flips between FINE and NOT TONIGHT signs. | Charts grow on 8ths. Sign flips on the claps. | Clap = sign flip. |
| S05 | 0:32–0:40 | 17–20 | Pre-Chorus 1 | *And I don't know...* | Push into the gauge. The needle trembles and the palette drains to two colors. | Continuous zoom; shake grows with the snare roll. | Snare roll, riser, then a hard cut on the downbeat. |
| S06 | 0:40–0:48 | 21–24 | Chorus 1 | *I update my priors...* | Kinetic type fills the frame. Headline cards smack the dial. *Ten percent* swings to 10%, *twenty-five* to 25%. | Cuts every bar. Words scale up on their syllable. | Four-on-the-floor. A card lands on each downbeat. |
| S07 | 0:48–0:56 | 25–28 | Chorus 1 | *...one more paper, one more fire* | Bell curves morph prior → posterior on the beat. PRIOR dances with a coffee mug. | Dance loop locked to beats. Curve morphs on beats 1 and 3. | Ooh pad = curve glow. |
| S08 | 0:56–1:04 | 29–32 | Verse 2 | *It passed the bar exam...* | Exam hall. A sleek AI aces every paper, then kindly tucks PRIOR into bed (the joke). | Side dolly across the desks. | Crash on bar 29. |
| S09 | 1:04–1:12 | 33–36 | Verse 2 | *A lab out west...* | Far-off lab window at night with the lights on. Tiny figures write tests on whiteboards. | Slow zoom toward the window. | Arp becomes the whiteboard scribble rhythm. |
| S10 | 1:12–1:20 | 37–40 | Pre-Chorus 2 | *...and you don't know* | Same push-in as S05, but a second gauge (the viewer's) slides in beside PRIOR's. | Mirror of S05. | Same as S05. |
| S11 | 1:20–1:28 | 41–44 | Chorus 2 | *I update my priors...* | Split screen of dozens of gauges (the audience), all twitching to the beat. | Grid grows from 1 to 4 to 16 to 64 tiles, one step per bar. | Each tile hit = kick. |
| S12 | 1:28–1:36 | 45–48 | Chorus 2 | *...one more paper, one more fire* | Paper and fire icons rain down. PRIOR catches them and feeds them into the dial; the needle climbs. | Vertical rain synced to 16th-note hats. | Riser into the bridge. |
| S13 | 1:36–1:44 | 49–52 | Bridge | *Evidence in, belief out...* | Black and white, half-time. A pipeline diagram: evidence → likelihood → belief. Glitch cuts. | Hard cuts on the glitch stutters (end of bars 50 and 52). | Stutter FX = frame repeats. |
| S14 | 1:44–1:52 | 53–56 | Bridge | *Posterior, posterior... turn it down* | The dial pops off PRIOR's face and becomes a big knob. On *turn it down*, a hand reaches in. | Slow orbit around the knob. Freeze on the drop. | The half-beat dropout before the final chorus is a cut to black. |
| S15 | 1:52–2:00 | 57–60 | Final Chorus | *We can turn the number down* | Key lift: color floods back. Crowds of hands turn the dial and the needle falls for the first time. | Whip-pan reveal. Hands enter on each beat. | Sub boom on bar 57. |
| S16 | 2:00–2:08 | 61–64 | Final Chorus | *One less paper, one less fire* | The S03 confetti plays in reverse and the S12 fires go out one by one. | Reverse animation timed to 8ths. | Ooh pad swells. |
| S17 | 2:08–2:16 | 65–68 | Tag | *It isn't too late* | Sunrise. PRIOR on a rooftop, gauge low but never zero. | Slow crane up. | Drums thin out. |
| S18 | 2:16–2:26 | 69–72 + tail | Outro | – | Title card. The needle keeps breathing. Fade to black. | Static. Fade. | Pad and arp ring out. |

## Character: PRIOR

- A round cream body with a navy face. The face **is** the gauge: arc from mint
  (low) through sun to coral (high), 10 ticks, a cream needle and a mono readout
  `p(doom) NN%`.
- Two dot eyes above the gauge that blink every ~4 s. An antenna whose bulb is
  mint below 50% and coral above.
- No mouth. While singing, the antenna bulb and the needle hub pulse with the
  vocal amplitude (planned: `build/vocal_env.json` exported by the mixer).
- Poses needed for P2: idle bounce, sing, shrug, sign-flip, dance (2 loops),
  sleep, catch, point-at-dial, rooftop sit.
