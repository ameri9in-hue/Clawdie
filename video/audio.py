"""Chiptune score + SFX for AI FIGHTER '26.

Reads build/meta.json (sfx events and music cues exported by game.js) and
writes build/audio.wav, so sound is locked to the exact frames it belongs to.
"""
import json, wave, os
import numpy as np

SR = 44100
ROOT = os.path.dirname(os.path.abspath(__file__))
meta = json.load(open(os.path.join(ROOT, 'build', 'meta.json')))
DUR = meta['duration'] + 0.5
N = int(DUR * SR)
rng = np.random.default_rng(7)

# ----------------------------------------------------------------- primitives
def tt(d): return np.arange(int(d * SR)) / SR
def midi(n): return 440.0 * 2 ** ((n - 69) / 12)
NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
def nn(s): return NOTE[s[:-1]] + 12 * (int(s[-1]) + 1)

def box(x, k):
    """Moving-average lowpass (k samples)."""
    if k <= 1: return x
    c = np.cumsum(np.concatenate([np.zeros(k), x]))
    return (c[k:] - c[:-k]) / k

def phase_of(freq, d):
    f = np.broadcast_to(np.asarray(freq, dtype=float), (int(d * SR),)) if np.ndim(freq) == 0 else freq
    return np.cumsum(f) / SR

def square(freq, d, duty=.5):
    ph = phase_of(freq, d)
    return np.where((ph % 1) < duty, 1.0, -1.0)

def tri(freq, d):
    ph = phase_of(freq, d) % 1
    return 4 * np.abs(ph - .5) - 1

def saw(freq, d):
    ph = phase_of(freq, d) % 1
    return 2 * ph - 1

def sine(freq, d):
    return np.sin(2 * np.pi * phase_of(freq, d))

def noise(d): return rng.uniform(-1, 1, int(d * SR))
def hpn(d): return np.diff(rng.uniform(-1, 1, int(d * SR) + 1))

def env(n, a=.004, dec=.06, sus=.7, rel=.04):
    e = np.ones(n) * sus
    ia, idc, ir = int(a * SR), int(dec * SR), int(rel * SR)
    ia = min(ia, n)
    e[:ia] = np.linspace(0, 1, ia, endpoint=False)
    j = min(n, ia + idc)
    e[ia:j] = np.linspace(1, sus, j - ia, endpoint=False)
    if ir and n > ir: e[-ir:] *= np.linspace(1, 0, ir)
    return e

def expd(d, rate): return np.exp(-tt(d) * rate)

def sweep(f0, f1, d, curve='exp'):
    t = tt(d) / d
    return f0 * (f1 / f0) ** t if curve == 'exp' else f0 + (f1 - f0) * t

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
def kick(d=.2):
    return sine(45 + 120 * expd(d, 32), d) * expd(d, 16)
def snare(d=.18):
    return box(noise(d), 2) * expd(d, 20) * .7 + sine(185, d) * expd(d, 35) * .45
def hat(d=.05):
    return hpn(d) * expd(d, 90) * .35
def crash(d=1.2):
    n = hpn(d)
    return n * expd(d, 3.2) * .45

# ----------------------------------------------------------------- songs
def bars(s): return [b.split() for b in s.strip().split('|')]

SONGS = {
    'fight': dict(
        bpm=160,
        sections=[
            dict(chords=[('A2', 'm'), ('F2', 'M'), ('G2', 'M'), ('E2', 'M')] * 2, mel=bars('''
                A4 . C5 E5 A5 . G5 E5 | F5 . E5 C5 A4 . C5 D5 | D5 . B4 G4 D5 . E5 F5 | E5 - G#5 - B5 - G#5 E5 |
                A5 . A5 G5 E5 . C5 E5 | F5 . F5 E5 C5 . A4 C5 | D5 E5 F5 G5 A5 . G5 F5 | E5 - - - G#4 - B4 -''')),
            dict(chords=[('D2', 'm'), ('A2', 'm'), ('Bb2', 'M'), ('E2', 'M'), ('D2', 'm'), ('A2', 'm'), ('F2', 'M'), ('E2', 'M')], mel=bars('''
                D5 - F5 - A5 - F5 D5 | E5 - C5 - A4 - C5 E5 | F5 - D5 - Bb4 - D5 F5 | G#5 - - E5 B4 - G#4 - |
                A5 - - G5 F5 - E5 D5 | E5 - - D5 C5 - B4 A4 | C5 D5 E5 F5 G5 A5 B5 C6 | B5 - G#5 - E5 - - -''')),
        ]),
    'title': dict(
        bpm=132,
        sections=[dict(chords=[('C3', 'm'), ('Ab2', 'M'), ('Bb2', 'M'), ('G2', 'M')] * 2, mel=bars('''
            C5 - - G4 C5 D5 Eb5 - | Eb5 - D5 C5 Ab4 - - - | Bb4 - D5 F5 Bb5 - Ab5 G5 | G5 - - - B4 - D5 - |
            G5 - - F5 Eb5 - D5 C5 | Eb5 - - D5 C5 - Ab4 C5 | D5 - F5 - Bb5 - D6 - | B5 - - - G5 - - -'''))]),
    'select': None,  # continues the title song
    'ending': dict(
        bpm=112,
        sections=[dict(chords=[('C3', 'M'), ('G2', 'M'), ('A2', 'm'), ('F2', 'M'), ('C3', 'M'), ('G2', 'M'), ('F2', 'M'), ('G2', 'M')], mel=bars('''
            E5 - G5 - C6 - B5 G5 | D5 - G5 - B5 - A5 G5 | C5 - E5 - A5 - G5 E5 | F5 - A5 - C6 - - - |
            E6 - D6 C6 B5 - C6 D6 | B5 - G5 - D5 - G5 - | A5 - C6 - F5 - A5 - | G5 - - - - - - -'''))]),
}
VARIANT = {'fight1': (0, 160, 0), 'fight2': (2, 166, 0), 'fight3': (3, 176, 1)}

def lead_note(f, d, duty=.25, vol=.2):
    n = int(d * SR)
    t = np.arange(n) / SR
    vib = 1 + .006 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - .12) * 6, 0, 1)
    x = square(f * vib, d, duty) * .7 + square(f * 1.003 * vib, d, .5) * .3
    return box(x, 3) * env(n, .003, .08, .6, .03) * vol

def render_song(name, dur, offset=0.0, transpose=0, bpm=None, intense=0):
    S = SONGS[name]
    bpm = bpm or S['bpm']
    bar = 240 / bpm; e8 = bar / 8; e16 = bar / 16
    out = np.zeros(int((dur + 1) * SR))
    # flatten sections into a bar list, looped
    seq = []
    for sec in S['sections']:
        for i in range(len(sec['chords'])): seq.append((sec['chords'][i], sec['mel'][i]))
    b0 = int(offset // bar)
    nb = int((offset + dur) // bar) + 2
    for bi in range(b0, nb):
        (root, q), mel = seq[bi % len(seq)]
        T0 = bi * bar - offset
        r = nn(root) + transpose
        tri3 = [0, 3, 7] if q == 'm' else [0, 4, 7]
        # lead
        i = 0
        while i < 8:
            tok = mel[i]
            if tok not in '.-':
                L = 1
                while i + L < 8 and mel[i + L] == '-': L += 1
                if T0 + i * e8 + L * e8 > 0:
                    add(out, lead_note(midi(nn(tok) + transpose), L * e8 * .95), T0 + i * e8)
                    # echo for space
                    add(out, lead_note(midi(nn(tok) + transpose), L * e8 * .9, vol=.06), T0 + i * e8 + e8 * .75)
                i += L
            else: i += 1
        # bass
        pat = [0, 0, 12, 0, 0, 12, 0, 12]
        for k, o in enumerate(pat):
            f = midi(r + o)
            x = (tri(f, e8 * .9) * .8 + square(f, e8 * .9, .5) * .2) * env(int(e8 * .9 * SR), .002, .05, .8, .02) * .26
            add(out, x, T0 + k * e8)
        # arp
        notes = [r + 24 + tri3[k % 3] + (12 if (k // 3) % 2 else 0) for k in range(16)]
        for k, m in enumerate(notes):
            x = box(square(midi(m), e16 * .8, .125), 2) * env(int(e16 * .8 * SR), .001, .03, .5, .01) * .055
            add(out, x, T0 + k * e16)
        # pad
        for m in tri3:
            x = tri(midi(r + 12 + m), bar) * env(int(bar * SR), .05, .2, .6, .1) * .035
            add(out, x, T0)
        # drums
        if name != 'ending' or bi % 8 >= 1:
            for k in range(16):
                if k in (0, 6, 8, 11) or (intense and k in (14,)): add(out, kick(), T0 + k * e16, .55)
                if k in (4, 12): add(out, snare(), T0 + k * e16, .4)
                if k % 2 == 0 or intense: add(out, hat(), T0 + k * e16, .5 if k % 4 == 2 else .3)
            if bi % 8 == 7:
                for k in (13, 14, 15): add(out, snare(.1), T0 + k * e16, .3)
            if bi % 8 == 0: add(out, crash(), T0, .25)
    s = int(dur * SR)
    return out[:s]

def jingle():
    seq = [('C5', .09), ('E5', .09), ('G5', .09), ('C6', .09), ('G5', .09), ('C6', .5)]
    out = np.zeros(int(2.2 * SR)); t = 0
    for n, d in seq:
        add(out, lead_note(midi(nn(n)), d * 1.6, .5, .22), t); add(out, lead_note(midi(nn(n) - 12), d * 1.6, .25, .1), t); t += d
    for m in ['C4', 'E4', 'G4']:
        add(out, tri(midi(nn(m)), 1.2) * env(int(1.2 * SR), .01, .3, .5, .4) * .12, t - .5)
    add(out, crash(1.5), t - .5, .3)
    return out

# ----------------------------------------------------------------- sfx
def S_hit():
    return mx(sine(60 + 160 * expd(.14, 40), .14) * expd(.14, 22) * .9, hpn(.07) * expd(.07, 45) * .7)
def S_bighit():
    d = .35
    x = sine(40 + 200 * expd(d, 25), d) * expd(d, 9) * 1.0
    n = hpn(d) * expd(d, 14) * .8
    crunch = np.round(square(70, d, .5) * expd(d, 12) * 4) / 4 * .25
    return mx(x, n, crunch)
def S_block():
    d = .22
    return mx(sum(sine(f, d) * expd(d, 18 + i * 6) for i, f in enumerate([1250, 1880, 2700])) * .25, hpn(.02) * .4)
def S_whoosh(d=.16, lo=2, hi=8):
    n = noise(d); t = tt(d) / d
    shape = np.sin(np.pi * t) ** 2
    return (box(n, lo) - box(n, hi)) * shape * 1.4
def S_jump(): return box(square(sweep(280, 900, .13), .13, .5), 2) * expd(.13, 8) * .25
def S_land(): return mx(sine(50 + 80 * expd(.1, 40), .1) * expd(.1, 25) * .6, box(noise(.06), 6) * expd(.06, 40) * .3)
def S_toss(): return mx(box(square(sweep(700, 300, .09), .09, .25), 2) * .18, S_whoosh(.12) * .6)
def S_pew(): return box(square(sweep(1500, 260, .17), .17, .25), 2) * expd(.17, 6) * .25
def S_blip(f, kind='sq'):
    d = .035
    x = square(f, d, .5) if kind == 'sq' else tri(f, d)
    return box(x, 2) * env(int(d * SR), .001, .01, .7, .01) * .25
def S_coin():
    a = box(square(988, .07, .5), 2) * .25
    b = box(square(1319, .4, .5), 2) * expd(.4, 7) * .25
    return np.concatenate([a, b])
def S_slam():
    return mx(kick(.4), crash(1.2)[:int(.4 * SR)] * .8, np.round(square(55, .4, .5) * expd(.4, 8) * 3) / 3 * .25)
def S_stamp(): return mx(sine(70 + 120 * expd(.2, 30), .2) * expd(.2, 14) * .8, box(noise(.12), 3) * expd(.12, 25) * .5)
def S_arp(notes, step=.06, duty=.5, vol=.22, last=.3):
    out = np.zeros(int((len(notes) * step + last + .1) * SR))
    for i, n in enumerate(notes):
        d = last if i == len(notes) - 1 else step * 1.2
        add(out, box(square(midi(nn(n)), d, duty), 2) * env(int(d * SR), .002, .03, .7, .03) * vol, i * step)
    return out
def S_lock(): return np.concatenate([box(square(784, .05, .5), 2) * .2, box(square(1568, .18, .5), 2) * expd(.18, 12) * .2])
def S_vs():
    d = 1.2
    zap = hpn(d) * (np.sin(2 * np.pi * 23 * tt(d)) > 0) * expd(d, 3) * .5
    return mx(kick(.5) * 1.1, crash(d) * .9, zap)
def S_roundcard():
    d = .6
    x = S_whoosh(d, 2, 20) * .9
    y = np.zeros(int(1.0 * SR)); y[:len(x)] += x
    for i, m in enumerate(['A3', 'E4', 'A4']):
        add(y, box(square(midi(nn(m)), .3, .5), 2) * env(int(.3 * SR), .002, .05, .6, .1) * .12, .45)
    add(y, kick(), .45, .8)
    return y
def S_fight():
    d = .8
    y = np.zeros(int(1.5 * SR))
    for m in ['A3', 'E4', 'A4', 'C5']:
        add(y, box(square(midi(nn(m)), d, .5), 2) * env(int(d * SR), .002, .1, .6, .3) * .1, 0)
    add(y, kick(.4), 0, 1.0); add(y, crash(1.4), 0, .7)
    return y
def S_caption():
    d = .55
    f = 700 * (200 / 700) ** (tt(d) / d) * (1 + .08 * np.sin(2 * np.pi * 12 * tt(d)))
    return tri(f, d) * env(int(d * SR), .01, .1, .8, .1) * .35
def S_clash():
    d = .5
    ring = sum(sine(f, d) * expd(d, 8 + i * 3) for i, f in enumerate([900, 1370, 2050, 3100])) * .2
    return mx(ring, kick(.3) * .9, hpn(.15) * expd(.15, 20) * .6)
def S_beam(d):
    t = tt(d)
    f = 95 * (1 + .25 * t / d)
    x = saw(f, d) * .35 + saw(f * 1.5, d) * .25 + square(f * 2.01, d, .3) * .12
    trem = .7 + .3 * np.sin(2 * np.pi * 28 * t)
    n = box(noise(d), 4) * .25
    fade = np.clip(t * 8, 0, 1) * np.clip((d - t) * 6, 0, 1)
    return box(x * trem + n, 3) * fade * .7
def S_explode():
    d = 1.8
    boom = sine(30 + 70 * expd(d, 6), d) * expd(d, 3) * 1.0
    n = noise(d); rum = box(n, 30) * 3 * expd(d, 2.2) + box(n, 4) * expd(d, 6) * .6
    return boom + rum
def S_swarm(d):
    out = np.zeros(int(d * SR))
    for i in range(int(d * 22)):
        t0 = i / 22 + rng.uniform(-.02, .02)
        add(out, box(noise(.03), 3) * expd(.03, 80) * rng.uniform(.3, .7), max(0, t0))
        if rng.uniform() < .2: add(out, S_blip(rng.uniform(900, 1500)) * .6, max(0, t0))
    mur = box(noise(d), 25) * 2.5 * np.clip(tt(d) * 4, 0, 1) * np.clip((d - tt(d)) * 4, 0, 1)
    return out + mur
def S_cutin():
    d = .4
    rise = box(square(sweep(180, 1600, d), d, .25), 2) * .15
    y = np.zeros(int(1.0 * SR)); y[:len(rise)] += rise
    add(y, sum(sine(f, .6) * expd(.6, 6) for f in [3000, 4520, 6100]) * .12, .05)
    add(y, kick(.3), 0, .8); add(y, crash(.8), 0, .35)
    return y
def S_shield():
    d = 1.0; t = tt(d)
    x = sum(sine(f * (1 + .1 * t), d) for f in [880, 1320, 1760]) / 3 * (.6 + .4 * np.sin(2 * np.pi * 14 * t))
    return x * np.clip(t * 6, 0, 1) * np.clip((d - t) * 3, 0, 1) * .3
def S_reflect():
    return mx(sum(sine(f, .25) * expd(.25, 14) for f in [2000, 3010]) * .2, box(square(sweep(400, 1600, .12), .12, .25), 2) * .15)
def S_ko():
    y = np.zeros(int(2.5 * SR))
    add(y, S_bighit(), 0, 1.0); add(y, crash(2.0), 0, .8)
    add(y, sine(35 + 60 * expd(1.2, 4), 1.2) * expd(1.2, 2.5), 0, .9)
    for i, n in enumerate(['E5', 'C5', 'A4', 'E4', 'C4', 'A3']):
        add(y, box(square(midi(nn(n)), .16, .5), 2) * env(int(.16 * SR), .002, .03, .6, .04) * .16, .15 + i * .12)
    return y
def S_thud(): return mx(sine(35 + 70 * expd(.3, 20), .3) * expd(.3, 10) * 1.0, box(noise(.2), 10) * expd(.2, 15) * .7)
def S_crowd(d):
    t = tt(d)
    n = noise(d)
    x = box(n, 18) * 2.2 + box(n, 6) * .5
    mod = .7 + .3 * np.sin(2 * np.pi * .7 * t) * np.sin(2 * np.pi * .23 * t + 1)
    fade = np.clip(t * 1.5, 0, 1) * np.clip((d - t) * 1.5, 0, 1)
    return x * mod * fade * .5
def S_tick(): return mx(hpn(.01) * .5, S_blip(1500))
def S_start(): return S_arp(['C5', 'E5', 'G5', 'C6', 'E6', 'G6'], .05, .5, .2, .4)
def S_fanfare(): return S_arp(['G4', 'C5', 'E5', 'G5', 'C6', 'E6', 'G6'], .07, .5, .2, .9)

SFX = {
    'hit': S_hit, 'bighit': S_bighit, 'block': S_block, 'swing': lambda: S_whoosh(.15), 'dash': lambda: S_whoosh(.25, 2, 12),
    'jump': S_jump, 'land': S_land, 'toss': S_toss, 'pew': S_pew,
    'blipC': lambda: S_blip(880), 'blipG': lambda: S_blip(587, 'tri'), 'blipT': lambda: S_blip(1046),
    'coin': S_coin, 'slam': S_slam, 'stamp': S_stamp, 'start': S_start, 'move': lambda: S_blip(620) * 1.2, 'lock': S_lock,
    'whoosh': lambda: S_whoosh(.45, 2, 16), 'vs': S_vs, 'roundcard': S_roundcard, 'fight': S_fight, 'caption': S_caption,
    'clash': S_clash, 'explode': S_explode, 'cutin': S_cutin, 'shield': S_shield, 'reflect': S_reflect, 'ko': S_ko,
    'thud': S_thud, 'tick': S_tick, 'fanfare': S_fanfare,
}
DURFX = {'beam': S_beam, 'swarm': S_swarm, 'crowd': S_crowd}
GAIN = {'blipC': .55, 'blipG': .7, 'blipT': .6, 'swing': .55, 'crowd': .35, 'hit': .9, 'beam': .6, 'swarm': .7, 'explode': 1.0, 'ko': 1.0}

# ----------------------------------------------------------------- mix
music = np.zeros(N)
cues = meta['cues']
title_t0 = None
for i, c in enumerate(cues):
    t0 = c['t']; t1 = cues[i + 1]['t'] if i + 1 < len(cues) else DUR
    name = c['c']
    if name == 'stop':
        continue
    if name == 'jingle':
        add(music, jingle(), t0, 1.0); continue
    if name == 'title': title_t0 = t0
    if name == 'select':
        seg = render_song('title', t1 - t0, offset=t0 - title_t0)
    elif name.startswith('fight'):
        tr, bpm, intense = VARIANT[name]
        seg = render_song('fight', t1 - t0, transpose=tr, bpm=bpm, intense=intense)
    elif name == 'ending':
        seg = render_song('ending', t1 - t0)
        fo = int(2.5 * SR); seg[-fo:] *= np.linspace(1, 0, fo)
    else:
        seg = render_song(name, t1 - t0)
    f = int(.03 * SR)
    seg[:f] *= np.linspace(0, 1, f); seg[-f:] *= np.linspace(1, 0, f)
    add(music, seg, t0)

sfx = np.zeros(N)
cache = {}
for e in meta['events']:
    s = e['s']
    if s in DURFX:
        x = DURFX[s](e.get('d', 1.0))
    else:
        if s not in SFX: print('missing sfx', s); continue
        # re-synthesize noisy ones for variation, cache tonal ones
        x = SFX[s]() if s in ('hit', 'bighit', 'swing', 'dash', 'land') or s not in cache else cache[s]
        cache[s] = x
    add(sfx, x, e['t'], e.get('v', 1) * GAIN.get(s, 1.0))

# small room ambience on sfx
amb = np.zeros_like(sfx)
for dl, g in [(.031, .22), (.053, .16), (.079, .11), (.113, .07)]:
    k = int(dl * SR); amb[k:] += sfx[:-k] * g
sfx = sfx + amb

k = int(.009 * SR)
musR = np.zeros_like(music); musR[k:] = music[:-k]
L = music * .5 + sfx * .75
R = (music * .3 + musR * .2) + sfx * .75
st = np.stack([L, R], 1)
st = np.tanh(st * 1.1) / np.tanh(1.1)
st /= max(1e-9, np.max(np.abs(st))) / .89
pcm = (st * 32767).astype('<i2')
with wave.open(os.path.join(ROOT, 'build', 'audio.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('audio written', DUR, 's')
