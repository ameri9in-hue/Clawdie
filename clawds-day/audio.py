"""Chiptune score + SFX for CLAWD'S DAY.

Reads build/meta.json (sfx events and music cues exported by the scenes) and
writes build/audio.wav, so every sound lands on the frame it belongs to.
"""
import json, wave, os
import numpy as np

SR = 44100
ROOT = os.path.dirname(os.path.abspath(__file__))
meta = json.load(open(os.path.join(ROOT, 'build', 'meta.json')))
DUR = meta['duration'] + 0.5
N = int(DUR * SR)
rng = np.random.default_rng(11)

# ----------------------------------------------------------------- primitives
def tt(d): return np.arange(int(d * SR)) / SR
def midi(n): return 440.0 * 2 ** ((n - 69) / 12)
NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
def nn(s): return NOTE[s[:-1]] + 12 * (int(s[-1]) + 1)

def box(x, k):
    if k <= 1: return x
    c = np.cumsum(np.concatenate([np.zeros(k), x]))
    return (c[k:] - c[:-k]) / k

def phase_of(freq, d):
    n = int(d * SR)
    f = np.full(n, float(freq)) if np.ndim(freq) == 0 else np.asarray(freq, dtype=float)[:n]
    if len(f) < n: f = np.concatenate([f, np.full(n - len(f), f[-1])])
    return np.cumsum(f) / SR

def square(freq, d, duty=.5): return np.where((phase_of(freq, d) % 1) < duty, 1.0, -1.0)
def tri(freq, d): return 4 * np.abs((phase_of(freq, d) % 1) - .5) - 1
def saw(freq, d): return 2 * (phase_of(freq, d) % 1) - 1
def sine(freq, d): return np.sin(2 * np.pi * phase_of(freq, d))
def noise(d): return rng.uniform(-1, 1, int(d * SR))
def hpn(d): return np.diff(rng.uniform(-1, 1, int(d * SR) + 1))

def env(n, a=.004, dec=.06, sus=.7, rel=.04):
    e = np.ones(n) * sus
    ia, idc, ir = min(int(a * SR), n), int(dec * SR), int(rel * SR)
    e[:ia] = np.linspace(0, 1, ia, endpoint=False)
    j = min(n, ia + idc)
    e[ia:j] = np.linspace(1, sus, j - ia, endpoint=False)
    if ir and n > ir: e[-ir:] *= np.linspace(1, 0, ir)
    return e

def expd(d, rate): return np.exp(-tt(d) * rate)
def sweep(f0, f1, d): t = tt(d) / d; return f0 * (f1 / f0) ** t
def fade(x, a=.01, r=.05):
    n = len(x); ia, ir = min(n, int(a * SR)), min(n, int(r * SR))
    x = x.copy(); x[:ia] *= np.linspace(0, 1, ia); x[n - ir:] *= np.linspace(1, 0, ir); return x

def mx(*xs):
    n = max(len(x) for x in xs); out = np.zeros(n)
    for x in xs: out[:len(x)] += x
    return out

def add(buf, x, t, gain=1.0):
    i = int(round(t * SR))
    if i >= len(buf) or i + len(x) <= 0: return
    if i < 0: x = x[-i:]; i = 0
    j = min(len(buf), i + len(x))
    buf[i:j] += x[:j - i] * gain

# ----------------------------------------------------------------- drums
def kick(d=.2): return sine(45 + 120 * expd(d, 32), d) * expd(d, 16)
def snare(d=.16): return box(noise(d), 2) * expd(d, 22) * .7 + sine(190, d) * expd(d, 35) * .4
def clap(d=.15):
    x = np.zeros(int(d * SR))
    for o in (0, .008, .016): add(x, box(hpn(d), 3) * expd(d, 30) * .6, o)
    return x
def hat(d=.04): return hpn(d) * expd(d, 100) * .35
def ohat(d=.18): return hpn(d) * expd(d, 18) * .25
def shaker(d=.05): return box(hpn(d), 2) * np.sin(np.pi * tt(d) / d) * .25

# ----------------------------------------------------------------- songs
def bars(s): return [b.split() for b in s.strip().split('|')]
SONGS = {
    'lull': dict(chords=[('F2', 'M'), ('D2', 'm'), ('Bb2', 'M'), ('C3', 'M'), ('F2', 'M'), ('A2', 'm'), ('Bb2', 'M'), ('C3', 'M')], mel=bars('''
        A4 - - C5 F5 - E5 - | D5 - - F5 A5 - - - | G5 - F5 - D5 - Bb4 - | C5 - - - - - . . |
        A4 - C5 - F5 - A5 - | G5 - E5 - C5 - - - | D5 - F5 - Bb5 - A5 G5 | F5 - - - - - . . '''),
        lead='bell', drums=None, bass='long', arp='box'),
    'morning': dict(chords=[('C3', 'M'), ('G2', 'M'), ('A2', 'm'), ('F2', 'M'), ('C3', 'M'), ('E2', 'm'), ('F2', 'M'), ('G2', 'M')], mel=bars('''
        E5 . G5 . C6 . G5 E5 | D5 . G5 . B5 . G5 D5 | C5 . E5 A5 C6 - B5 A5 | F5 . A5 . C6 . A5 F5 |
        G5 . E5 . C5 . E5 G5 | B4 . E5 G5 B5 - A5 G5 | A5 . F5 . C5 . F5 A5 | G5 - B5 - D6 - . . '''),
        lead='sq25', drums='bouncy', bass='bounce', arp='sq'),
    'city': dict(chords=[('A2', 'm'), ('A2', 'm'), ('F2', 'M'), ('G2', 'M'), ('A2', 'm'), ('A2', 'm'), ('F2', 'M'), ('E2', 'M')], mel=bars('''
        A4 . C5 . E5 D5 C5 A4 | . . G4 A4 C5 . A4 . | F4 . A4 . C5 D5 C5 A4 | G4 . B4 . D5 - . . |
        A4 . C5 . E5 G5 E5 D5 | C5 . A4 . G4 A4 C5 . | F5 - E5 - D5 - C5 A4 | B4 - G#4 - E4 - . . '''),
        lead='sq50', drums='funk', bass='funk', arp='sq'),
    'picnic': dict(chords=[('G2', 'M'), ('C3', 'M'), ('D3', 'M'), ('G2', 'M'), ('E2', 'm'), ('C3', 'M'), ('D3', 'M'), ('D3', 'M')], mel=bars('''
        B4 - D5 - G5 - F#5 E5 | E5 - - C5 E5 - G5 - | F#5 - E5 - D5 - A4 - | G4 - B4 - D5 - - - |
        E5 - G5 - B5 - A5 G5 | E5 - C5 - E5 - G5 - | A5 - G5 - F#5 - D5 - | A5 - - - F#5 - D5 - '''),
        lead='tri', drums='light', bass='bounce', arp='box'),
    'beach': dict(chords=[('D3', 'M'), ('B2', 'm'), ('G2', 'M'), ('A2', 'M'), ('D3', 'M'), ('B2', 'm'), ('G2', 'M'), ('A2', 'M')], mel=bars('''
        F#5 . A5 . D6 . A5 . | F#5 . D5 . B4 . D5 F#5 | G5 . B5 . D6 . B5 G5 | A5 - - E5 C#5 - E5 - |
        F#5 A5 D6 A5 F#5 . D5 . | B4 D5 F#5 D5 B4 . F#5 . | G5 - B5 - A5 - G5 E5 | D5 - - - D6 - . . '''),
        lead='sq25', drums='beach', bass='bounce', arp='sq'),
    'party': dict(chords=[('E2', 'm'), ('C3', 'M'), ('G2', 'M'), ('D3', 'M'), ('E2', 'm'), ('C3', 'M'), ('G2', 'M'), ('D3', 'M')], mel=bars('''
        E5 . E5 G5 . E5 D5 B4 | C5 . C5 E5 . G5 E5 C5 | D5 . D5 G5 . B5 A5 G5 | F#5 . A5 . D6 . A5 F#5 |
        G5 . E5 . B5 . E5 . | C6 - B5 - G5 - E5 - | D5 G5 B5 D6 B5 G5 D5 G5 | F#5 - - - A5 - B5 - '''),
        lead='sq50', drums='four', bass='octave', arp='sq'),
}
CUESONG = {'lull': ('lull', 0), 'lull2': ('lull', -2), 'morning': ('morning', 0), 'city': ('city', 0), 'city2': ('city', 0),
           'chase': ('city', 2), 'picnic': ('picnic', 0), 'beach': ('beach', 0), 'party': ('party', 0)}

def lead_note(f, d, kind, vol=.18):
    n = int(d * SR); t = np.arange(n) / SR
    vib = 1 + .006 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - .12) * 6, 0, 1)
    if kind == 'bell':
        x = sine(f, d) * .7 + sine(f * 2, d) * .25 * np.exp(-t * 6) + tri(f, d) * .2
        return x * env(n, .005, .3, .45, .15) * vol * 1.3
    if kind == 'tri':
        x = tri(f * vib, d) * .8 + square(f * vib, d, .125) * .15
        return box(x, 2) * env(n, .004, .08, .7, .04) * vol * 1.2
    duty = .25 if kind == 'sq25' else .5
    x = square(f * vib, d, duty) * .7 + square(f * 1.003 * vib, d, .5) * .3
    return box(x, 3) * env(n, .003, .08, .6, .03) * vol

def render_song(name, dur, bpm, transpose=0, intense=False):
    S = SONGS[name]
    bar = 240 / bpm; e8 = bar / 8; e16 = bar / 16
    out = np.zeros(int((dur + 2) * SR))
    seq = list(zip(S['chords'], S['mel']))
    nb = int(dur // bar) + 2
    for bi in range(nb):
        (root, q), mel = seq[bi % len(seq)]
        T0 = bi * bar
        r = nn(root) + transpose
        tri3 = [0, 3, 7] if q == 'm' else [0, 4, 7]
        # lead (skip the very first bar of a song for an intro)
        if bi > 0 or name == 'lull':
            i = 0
            while i < 8:
                tok = mel[i]
                if tok not in '.-':
                    L = 1
                    while i + L < 8 and mel[i + L] == '-': L += 1
                    f = midi(nn(tok) + transpose)
                    add(out, lead_note(f, L * e8 * .95, S['lead']), T0 + i * e8)
                    add(out, lead_note(f, L * e8 * .9, S['lead'], vol=.05), T0 + i * e8 + e8 * .75)
                    i += L
                else: i += 1
        # bass
        bs = S['bass']
        if bs == 'long':
            for half in (0, 1):
                f = midi(r); d = bar / 2 * .95
                add(out, (tri(f, d) * .8 + sine(f / 2, d) * .4) * env(int(d * SR), .02, .2, .6, .15) * .22, T0 + half * bar / 2)
        else:
            pat = {'bounce': [0, None, 12, None, 7, None, 12, None], 'funk': [0, None, 0, 12, None, 0, 10, 12], 'octave': [0, 12, 0, 12, 0, 12, 0, 12]}[bs]
            for k, o in enumerate(pat):
                if o is None: continue
                f = midi(r + o); d = e8 * .85
                x = (tri(f, d) * .8 + square(f, d, .5) * .2) * env(int(d * SR), .002, .05, .8, .02) * .24
                add(out, x, T0 + k * e8)
        # arp
        if S['arp'] == 'box':
            for k in range(8):
                m = r + 24 + tri3[k % 3] + (12 if k >= 4 else 0)
                d = e8 * 1.6
                add(out, sine(midi(m), d) * np.exp(-tt(d) * 7) * .05 + sine(midi(m) * 3, d) * np.exp(-tt(d) * 14) * .012, T0 + k * e8)
        else:
            for k in range(16):
                m = r + 24 + tri3[k % 3] + (12 if (k // 3) % 2 else 0)
                x = box(square(midi(m), e16 * .8, .125), 2) * env(int(e16 * .8 * SR), .001, .03, .5, .01) * .045
                add(out, x, T0 + k * e16)
        # pad
        for m in tri3:
            x = tri(midi(r + 12 + m), bar) * env(int(bar * SR), .08, .2, .6, .15) * .03
            add(out, x, T0)
        # drums
        dr = S['drums']
        if dr and bi > 0:
            for k in range(16):
                t = T0 + k * e16
                if dr == 'four':
                    if k % 4 == 0: add(out, kick(), t, .7)
                    if k in (4, 12): add(out, clap(), t, .45)
                    if k % 4 == 2: add(out, ohat(), t, .5)
                    elif k % 2 == 0: add(out, hat(), t, .3)
                elif dr == 'funk':
                    if k in (0, 3, 8, 10) or (intense and k in (6, 14)): add(out, kick(), t, .6)
                    if k in (4, 12): add(out, snare(), t, .42)
                    add(out, hat(), t, .32 if k % 2 == 0 else .16)
                elif dr == 'bouncy':
                    if k in (0, 8, 10): add(out, kick(), t, .55)
                    if k in (4, 12): add(out, snare(), t, .35)
                    if k % 2 == 0: add(out, hat(), t, .28)
                elif dr == 'beach':
                    if k in (0, 6, 8): add(out, kick(), t, .55)
                    if k in (4, 12): add(out, clap(), t, .35)
                    add(out, shaker(), t, .3 if k % 2 else .18)
                elif dr == 'light':
                    if k in (0, 8): add(out, kick(.15), t, .4)
                    if k in (4, 12): add(out, shaker(.08), t, .45)
                    if k % 4 == 2: add(out, hat(), t, .2)
            if bi % 8 == 7 and dr != 'light':
                for k in (13, 14, 15): add(out, snare(.08), T0 + k * e16, .28)
    return out[:int(dur * SR)]

# ----------------------------------------------------------------- sfx
def S_blip(f=1046, d=.035, kind='sq'):
    x = square(f, d, .5) if kind == 'sq' else tri(f, d)
    return box(x, 2) * env(int(d * SR), .001, .01, .7, .01) * .25
def S_arp(notes, step=.06, vol=.2, last=.3, duty=.5):
    out = np.zeros(int((len(notes) * step + last + .1) * SR))
    for i, n in enumerate(notes):
        d = last if i == len(notes) - 1 else step * 1.2
        add(out, box(square(midi(nn(n)), d, duty), 2) * env(int(d * SR), .002, .03, .7, .03) * vol, i * step)
    return out
def S_whoosh(d=.3, lo=2, hi=12):
    n = noise(d); t = tt(d) / d
    return (box(n, lo) - box(n, hi)) * np.sin(np.pi * t) ** 2 * 1.4
def S_chime():
    out = np.zeros(int(2.5 * SR))
    for i, m in enumerate(['C6', 'G5', 'E6', 'C7']):
        add(out, (sine(midi(nn(m)), 2) * .5 + sine(midi(nn(m)) * 2.01, 2) * .15) * expd(2, 2.5), i * .12, .3)
    return out
def S_boing():
    d = .22; return box(square(sweep(180, 720, d) * (1 + .15 * np.sin(2 * np.pi * 28 * tt(d))), d, .5), 3) * expd(d, 9) * .3
def S_pop(): d = .07; return sine(sweep(300, 1100, d), d) * expd(d, 30) * .6
def S_alarm():
    d = .9; t = tt(d)
    f = np.where((t * 18) % 1 < .5, 1900, 2350)
    return box(square(f, d, .5), 3) * (np.sin(2 * np.pi * 24 * t) > 0) * .14 * np.clip((d - t) * 8, 0, 1)
def S_yawn():
    d = .7; t = tt(d)
    f = sweep(520, 220, d) * (1 + .03 * np.sin(2 * np.pi * 6 * t))
    return box(tri(f, d) * .8 + square(f, d, .3) * .2, 4) * np.sin(np.pi * t / d) * .3
def S_bang():
    d = .3
    return mx(sum(sine(f, d) * expd(d, 12 + i * 5) for i, f in enumerate([520, 1230, 1890, 2710])) * .22, hpn(.03) * .6)
def S_whistle():
    d = .55; t = tt(d)
    f = 2400 * (1 + .04 * np.sin(2 * np.pi * 32 * t))
    return (sine(f, d) * .8 + box(noise(d), 2) * .08) * np.clip(t * 30, 0, 1) * np.clip((d - t) * 10, 0, 1) * .35
def S_tweet():
    out = np.zeros(int(.5 * SR))
    for i in range(3):
        d = .06; add(out, sine(sweep(2800 + rng.uniform(0, 600), 4300, d), d) * np.sin(np.pi * tt(d) / d) * .25, i * .09)
    return out
def S_birds(d):
    out = np.zeros(int(d * SR))
    t = rng.uniform(.2, 1.0)
    while t < d - .6:
        add(out, S_tweet(), t, rng.uniform(.4, 1)); t += rng.uniform(.6, 2.2)
    return out
def S_excl(): return S_arp(['E6', 'B6'], .06, .16, .12)
def S_cheer(d):
    t = tt(d); n = noise(d)
    x = (box(n, 6) - box(n, 30)) * 1.8 * np.clip(t * 6, 0, 1) * np.clip((d - t) * 1.5, 0, 1)
    out = x * .4
    for i in range(int(d * 14)):
        f0 = rng.uniform(500, 1100); dd = rng.uniform(.1, .2)
        add(out, tri(sweep(f0, f0 * 1.5, dd), dd) * np.sin(np.pi * tt(dd) / dd) * .06, rng.uniform(0, d - .2))
    return out
def S_snore(d):
    t = tt(d); br = np.clip(np.sin(2 * np.pi * t / 2.6), 0, 1) ** 2
    n = box(noise(d), 40) * 4
    return n * br * (.6 + .4 * np.sin(2 * np.pi * 38 * t)) * .25
def S_thud(): return mx(sine(40 + 80 * expd(.25, 20), .25) * expd(.25, 12), box(noise(.15), 10) * expd(.15, 20) * .6)
def S_sizzle(d):
    t = tt(d); n = hpn(d) * .25
    for i in range(int(d * 30)): add(n, hpn(.008) * rng.uniform(.4, 1.2), rng.uniform(0, d))
    return n * np.clip(t * 3, 0, 1) * np.clip((d - t) * 2, 0, 1) * .5
def S_flip(): return mx(S_whoosh(.18, 2, 8) * .5, box(square(sweep(400, 900, .1), .1, .25), 2) * expd(.1, 15) * .12)
def S_pour():
    d = .8; t = tt(d); n = noise(d)
    return (box(n, 3) - box(n, 9)) * (.6 + .4 * np.sin(2 * np.pi * 9 * t)) * np.sin(np.pi * t / d) * .5
def S_ding(): d = 1.0; return (sine(1568, d) * .5 + sine(2352, d) * .25 + sine(3136, d) * .1) * expd(d, 4) * .45
def S_slurp():
    d = .5; n = noise(d); t = tt(d)
    return (box(n, 2) - box(n, 6)) * np.sin(np.pi * t / d) * (1 + np.sin(2 * np.pi * sweep(8, 20, d) * t)) * .4
def S_sparkle(): return S_arp(['C6', 'E6', 'G6', 'C7', 'E7', 'G7'], .045, .1, .4, .25)
def S_city(d):
    t = tt(d); n = noise(d)
    x = box(n, 60) * 6 + box(n, 12) * .3
    return x * (.75 + .25 * np.sin(2 * np.pi * .3 * t)) * np.clip(t * 2, 0, 1) * np.clip((d - t) * 2, 0, 1) * .35
def S_tick(): return mx(hpn(.008) * .5, S_blip(1800, .02))
def S_walkchirp(): return S_arp(['G6', 'C7', 'G6', 'C7'], .07, .14, .1)
def S_hiss(): d = .8; return hpn(d) * np.clip((d - tt(d)) * 2, 0, 1) * .3
def S_vroom():
    d = 1.6; t = tt(d); f = sweep(55, 140, d)
    return box(saw(f, d) * .6 + square(f * 1.5, d, .3) * .2, 8) * np.clip(t * 4, 0, 1) * np.clip((d - t) * 2, 0, 1) * .5
def S_zip(): d = .6; return box(square(sweep(300, 900, d) * (1 + .1 * np.sin(2 * np.pi * 40 * tt(d))), d, .3), 3) * np.sin(np.pi * tt(d) / d) * .2
def S_flap():
    out = np.zeros(int(1.0 * SR))
    for i in range(12): add(out, box(noise(.04), 4) * expd(.04, 50) * .5, i * .07 + rng.uniform(0, .02))
    return out
def S_honk(): d = .35; return box(saw(350, d) * .5 + saw(440, d) * .5, 3) * env(int(d * SR), .01, .05, .8, .05) * .3
def S_typing(d):
    out = np.zeros(int(d * SR))
    t = 0
    while t < d:
        add(out, mx(hpn(.012) * expd(.012, 200), sine(rng.uniform(2500, 3500), .01) * .2) * rng.uniform(.3, .8), t)
        t += rng.uniform(.03, .11)
    return out
def S_bugalarm():
    out = np.zeros(int(1.0 * SR))
    for i in range(4): add(out, box(square(600 if i % 2 == 0 else 900, .12, .5), 2) * .18, i * .15)
    return out
def S_squeak(): d = .22; return sine(np.concatenate([sweep(1200, 2600, d / 2), sweep(2600, 1500, d / 2)]), d) * np.sin(np.pi * tt(d) / d) * .35
def S_skitter(d):
    out = np.zeros(int(d * SR)); t = 0
    while t < d: add(out, hpn(.006) * .5, t); t += rng.uniform(.03, .06)
    return out
def S_tumble():
    out = np.zeros(int(1.2 * SR))
    for i in range(6): add(out, S_thud(), i * .09 + rng.uniform(0, .03), rng.uniform(.5, 1))
    add(out, S_bang(), .1, .5)
    return out
def S_dizzy(d):
    out = np.zeros(int(d * SR))
    for i in range(int(d / .25)): add(out, sine(sweep(1800, 2600, .12), .12) * np.sin(np.pi * tt(.12) / .12) * .16, i * .25)
    return out
def S_gotcha(): return np.concatenate([box(square(988, .07, .5), 2) * .22, box(square(1319, .4, .5), 2) * expd(.4, 7) * .22])
def S_clink(): d = .6; return (sine(2800, d) * .4 + sine(4100, d) * .25) * expd(d, 9) * .5
def S_progress(p): return S_blip(midi(72 + p), .05) * .9
def S_tada(): return S_arp(['C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7'], .06, .2, .8)
def S_rocket():
    d = 1.5; t = tt(d)
    return (box(noise(d), 5) * .6 + box(square(sweep(200, 1400, d), d, .25), 3) * .1) * np.clip(t * 4, 0, 1) * np.clip((d - t) * 2, 0, 1) * .5
def S_step(): d = .08; return sine(140, d) * expd(d, 40) * .4
def S_bonk(): return mx(sine(sweep(900, 400, .12), .12) * expd(.12, 20) * .5, hpn(.02) * .3)
def S_chomp():
    out = np.zeros(int(.3 * SR))
    for i in range(2): add(out, box(noise(.05), 3) * expd(.05, 60) * .6 + sine(160, .05) * expd(.05, 40) * .3, i * .13)
    return out
def S_quack():
    out = np.zeros(int(.5 * SR))
    for i in range(2):
        d = .12; f = sweep(650, 450, d)
        add(out, box(saw(f, d) * .6 + square(f * 2, d, .2) * .3, 2) * np.sin(np.pi * tt(d) / d) * .25, i * .18)
    return out
def S_waves(d):
    t = tt(d); n = noise(d)
    sw = .45 + .55 * np.sin(2 * np.pi * t / 5.5) ** 2
    return (box(n, 25) * 4 + box(n, 4) * .25 * sw) * sw * np.clip(t, 0, 1) * np.clip(d - t, 0, 1) * .35
def S_gull():
    out = np.zeros(int(1.0 * SR))
    for i in range(2):
        d = .28; add(out, box(tri(sweep(1900, 1100, d), d) * .7 + square(sweep(1900, 1100, d), d, .2) * .2, 2) * np.sin(np.pi * tt(d) / d) * .25, i * .33)
    return out
def S_pong(): d = .12; return mx(sine(620, d) * expd(d, 25) * .5, box(noise(.02), 3) * .3)
def S_stack(p): return box(square(midi(67 + p * 2), .09, .25), 2) * env(int(.09 * SR), .002, .02, .6, .02) * .22
def S_creak(d):
    t = tt(d); f = 70 + 25 * np.sin(2 * np.pi * 1.7 * t)
    return box(saw(f, d), 6) * (.5 + .5 * np.sin(2 * np.pi * 11 * t)) * np.clip(t * 3, 0, 1) * np.clip((d - t) * 3, 0, 1) * .2
def S_laugh():
    out = np.zeros(int(1.4 * SR))
    for i in range(7): add(out, box(square(midi(84 - i), .08, .5), 2) * env(int(.08 * SR), .002, .02, .6, .02) * .14, i * .13)
    return out
def S_splash(): d = .7; return (box(noise(d), 2) - box(noise(d), 10) * .5) * expd(d, 6) * .5
def S_crowd(d):
    t = tt(d); n = noise(d)
    x = box(n, 18) * 2.2 + box(n, 6) * .5
    return x * (.7 + .3 * np.sin(2 * np.pi * .7 * t)) * np.clip(t * 1.5, 0, 1) * np.clip((d - t) * 1.5, 0, 1) * .5
def S_launch(): d = .7; return sine(sweep(500, 1900, d), d) * np.sin(np.pi * tt(d) / d) * .12 + box(hpn(d), 2) * .05
def S_boom():
    d = 1.4
    x = sine(35 + 60 * expd(d, 8), d) * expd(d, 4) * .9 + box(noise(d), 20) * 2 * expd(d, 3)
    for i in range(18): add(x, hpn(.01) * .5, rng.uniform(.15, 1.2))
    return x
def S_crackle(d):
    out = box(noise(d), 30) * 1.5 * .3
    t = 0
    while t < d: add(out, hpn(.006) * rng.uniform(.2, .9), t); t += rng.exponential(.08)
    tt_ = tt(d); return out * np.clip(tt_ * 2, 0, 1) * np.clip((d - tt_) * 1.5, 0, 1)
def S_blow(): d = .6; return box(noise(d), 4) * np.sin(np.pi * tt(d) / d) * .35
def S_ooh():
    d = 1.4; t = tt(d)
    return sum(tri(midi(nn(m)) * (1 + .01 * np.sin(2 * np.pi * 5 * t)), d) for m in ['C4', 'E4', 'G4']) / 3 * np.sin(np.pi * t / d) * .3
def S_sizzle2(): return S_sizzle(1.4) * 1.6
def S_click(): return mx(hpn(.006) * .8, sine(2000, .015) * expd(.015, 200) * .3)
def S_poof(): d = .25; return box(noise(d), 6) * np.sin(np.pi * tt(d) / d) * .3

SFX = {'chime': S_chime, 'boing': S_boing, 'blip': lambda: S_blip(1046), 'pop': S_pop, 'alarm': S_alarm, 'yawn': S_yawn, 'bang': S_bang,
       'excl': S_excl, 'whistle': S_whistle, 'thud': S_thud, 'flip': S_flip, 'pour': S_pour, 'ding': S_ding, 'slurp': S_slurp,
       'sparkle': S_sparkle, 'tick': S_tick, 'walkchirp': S_walkchirp, 'hiss': S_hiss, 'vroom': S_vroom, 'zip': S_zip, 'flap': S_flap,
       'honk': S_honk, 'bugalarm': S_bugalarm, 'squeak': S_squeak, 'tumble': S_tumble, 'swoosh': lambda: S_whoosh(.3), 'gotcha': S_gotcha,
       'clink': S_clink, 'tada': S_tada, 'rocket': S_rocket, 'step': S_step, 'bonk': S_bonk, 'chomp': S_chomp, 'quack': S_quack,
       'gull': S_gull, 'pong': S_pong, 'laugh': S_laugh, 'whoosh': lambda: S_whoosh(.4), 'splash': S_splash, 'launch': S_launch,
       'boom': S_boom, 'blow': S_blow, 'ooh': S_ooh, 'sizzle2': S_sizzle2, 'click': S_click, 'poof': S_poof}
DURFX = {'snore': S_snore, 'birds': S_birds, 'cheer': S_cheer, 'sizzle': S_sizzle, 'city': S_city, 'typing': S_typing, 'skitter': S_skitter,
         'dizzy': S_dizzy, 'waves': S_waves, 'creak': S_creak, 'crowd': S_crowd, 'crackle': S_crackle}
PARAM = {'progress': S_progress, 'stack': S_stack}

# ----------------------------------------------------------------- mix
music = np.zeros(N)
cues = meta['cues']
for i, c in enumerate(cues):
    t0 = c['t']; t1 = cues[i + 1]['t'] if i + 1 < len(cues) else DUR
    if c['c'] == 'stop' or t1 - t0 < .05: continue
    song, tr = CUESONG[c['c']]
    seg = render_song(song, t1 - t0, c['bpm'], tr, intense=c['c'] == 'chase')
    if i + 1 == len(cues):
        fo = min(len(seg), int(5 * SR)); seg[-fo:] *= np.linspace(1, 0, fo) ** 1.5
    seg = fade(seg, .03, .25 if i + 1 < len(cues) and cues[i + 1]['c'] != 'stop' else .6)
    add(music, seg, t0, .8 if song == 'lull' else 1.0)

sfx = np.zeros(N)
cache = {}
for e in meta['events']:
    s = e['s']
    if s in DURFX: x = DURFX[s](e.get('d', 1.0))
    elif s in PARAM: x = PARAM[s](e.get('p', 0))
    elif s in SFX:
        if s not in cache or s in ('thud', 'bang', 'chomp', 'splash', 'boom', 'tumble', 'tweet'): cache[s] = SFX[s]()
        x = cache[s]
    else:
        print('missing sfx', s); continue
    add(sfx, x, e['t'], e.get('v', 1))

amb = np.zeros_like(sfx)
for dl, gn in [(.031, .2), (.053, .14), (.079, .1), (.113, .06)]:
    k = int(dl * SR); amb[k:] += sfx[:-k] * gn
sfx = sfx + amb
k = int(.011 * SR)
musR = np.zeros_like(music); musR[k:] = music[:-k]
L = music * .55 + sfx * .7
Rr = (music * .3 + musR * .25) + sfx * .7
st = np.stack([L, Rr], 1)
st = np.tanh(st * 1.1) / np.tanh(1.1)
st /= max(1e-9, np.max(np.abs(st))) / .89
pcm = (st * 32767).astype('<i2')
with wave.open(os.path.join(ROOT, 'build', 'audio.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('audio written', round(DUR, 1), 's')
