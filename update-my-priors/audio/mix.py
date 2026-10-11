"""The band and the mix for UPDATE MY PRIORS. Numpy only, no samples.

Reads build/song.json (from song.py) and writes:
    build/audio.wav           the full mix, 44.1 kHz stereo
    build/stems/<name>.wav    vocal, ooh, drums, bass, pad, arp, fx (for remixing / karaoke)
"""
import json, os, sys, wave
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from voice import sing, SR, bandnoise

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(ROOT, 'build')
song = json.load(open(os.path.join(BUILD, 'song.json')))
BAR = song['bar_sec']; BEAT = BAR / 4; STEP = BAR / 16
N = int((song['duration'] + 3) * SR)
rng = np.random.default_rng(5)

BUSES = {k: np.zeros((2, N)) for k in ('vocal', 'ooh', 'drums', 'bass', 'pad', 'arp', 'fx')}
SEND = dict(vocal=.22, ooh=.4, drums=.06, bass=0, pad=.18, arp=.3, fx=.25)   # reverb sends
LEVEL = dict(vocal=1.0, ooh=.5, drums=.5, bass=.7, pad=.8, arp=.45, fx=.5)

# ---------------------------------------------------------------- helpers
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def tt(d): return np.arange(int(d * SR)) / SR

def add(bus, x, t, gain=1.0, pan=0.0):
    """Mix mono or stereo x into BUSES[bus] at time t (s); pan -1..1 for mono."""
    x = np.atleast_2d(x)
    if x.shape[0] == 1:
        x = np.vstack([x[0] * np.sqrt((1 - pan) / 2) * 1.414, x[0] * np.sqrt((1 + pan) / 2) * 1.414])
    i = int(round(t * SR)); B = BUSES[bus]
    if i < 0: x = x[:, -i:]; i = 0
    j = min(N, i + x.shape[1])
    if j > i: B[:, i:j] += x[:, :j - i] * gain

def lowpass(x, fc, q=.7):
    """Zero-phase FFT lowpass with a soft knee (fine for one-shot buffers)."""
    n = len(x); X = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR)
    X /= np.sqrt(1 + (f / fc) ** 4)
    return np.fft.irfft(X, n)

def highpass(x, fc):
    n = len(x); X = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR)
    X *= 1 / np.sqrt(1 + (fc / np.maximum(f, 1)) ** 4)
    return np.fft.irfft(X, n)

def saw(f, d, phase=0.0):
    ph = (np.cumsum(np.broadcast_to(f, (int(d * SR),))) / SR + phase) % 1
    return 2 * ph - 1

def adsr(n, a, d, s, r):
    e = np.full(n, s, float); ia, idd, ir = int(a * SR), int(d * SR), int(r * SR)
    ia = min(ia, n); e[:ia] = np.linspace(0, 1, ia, endpoint=False)
    j = min(n, ia + idd); e[ia:j] = np.linspace(1, s, j - ia, endpoint=False)
    if 0 < ir < n: e[-ir:] *= np.linspace(1, 0, ir)
    return e

def section_at(bar):
    for s in song['sections']:
        if s['bar'] <= bar < s['bar'] + s['bars']: return s

# ---------------------------------------------------------------- drums
def kick():
    t = tt(.35)
    return np.sin(2 * np.pi * np.cumsum(48 + 140 * np.exp(-t * 38)) / SR) * np.exp(-t * 9) \
        + highpass(rng.standard_normal(len(t)), 3000) * np.exp(-t * 300) * .3
def clap():
    t = tt(.3); n = bandnoise(len(t), 900, 5000)
    e = np.exp(-t * 18) + sum(np.exp(-np.maximum(t - k * .011, 0) * 160) * (t >= k * .011) for k in range(3)) * .6
    return n * e * .45
def hat(open_=False):
    t = tt(.25 if open_ else .05)
    return bandnoise(len(t), 7000, 15000) * np.exp(-t * (14 if open_ else 80)) * (.22 if open_ else .18)
def crash():
    t = tt(2.5)
    return bandnoise(len(t), 3000, 14000) * np.exp(-t * 1.8) * .35

KICK, CLAP, HATC, HATO, CRASH = kick(), clap(), hat(), hat(True), crash()
KICK_TIMES = []

PATTERNS = {   # 16 steps per bar
    'intro':  dict(k='x...............', c='................', h='..x...x...x...x.', o='................'),
    'verse':  dict(k='x.......x.x.....', c='....x.......x...', h='x.xxx.xxx.xxx.xx', o='..............x.'),
    'build':  dict(k='x...x...x...x...', c='....x.......x...', h='xxxxxxxxxxxxxxxx', o='................'),
    'chorus': dict(k='x...x...x...x...', c='....x.......x...', h='x.x.x.x.x.x.x.x.', o='..x...x...x...x.'),
    'half':   dict(k='x.........x.....', c='........x.......', h='x...x...x...x...', o='................'),
}

def drums():
    for s in song['sections']:
        mode = s['arr']['drums']
        if s['name'] in ('Chorus 1', 'Chorus 2', 'Final Chorus', 'Verse 2', 'Bridge'):
            add('drums', CRASH, s['t0'], .8, .2)
        if mode == 'none': continue
        for b in range(s['bars']):
            if mode == 'intro' and b < 4: continue
            t0 = s['t0'] + b * BAR
            p = PATTERNS[mode]
            last = b == s['bars'] - 1
            for i in range(16):
                t = t0 + i * STEP
                swing = .012 if i % 2 else 0
                if p['k'][i] == 'x':
                    add('drums', KICK, t, 1.0); KICK_TIMES.append(t)
                if p['c'][i] == 'x': add('drums', CLAP, t, .9, -.05)
                if p['h'][i] == 'x': add('drums', HATC, t + swing, .8 if i % 4 == 2 else .5, .3)
                if p['o'][i] == 'x': add('drums', HATO, t + swing, .7, -.3)
            if mode == 'build' and last:      # snare roll into the chorus
                for i in range(32):
                    add('drums', CLAP[:int(.1 * SR)], t0 + i * STEP / 2, .15 + .6 * i / 31, .1 * np.sin(i))

def duck_env():
    """Sidechain: everything melodic breathes with the kick."""
    e = np.ones(N); t = np.arange(N) / SR
    for k in KICK_TIMES:
        i = int(k * SR); j = min(N, i + int(.3 * SR))
        e[i:j] = np.minimum(e[i:j], 1 - .55 * np.exp(-(t[i:j] - k) / .09))
    return e

# ---------------------------------------------------------------- harmony instruments
def bass():
    for s in song['sections']:
        lvl = s['arr']['bass']
        if not lvl: continue
        for b, ch in enumerate(s['chords']):
            t0 = s['t0'] + b * BAR
            root = 40 + (ch['root'] - 4) % 12          # E2..D#3
            if s['arr']['drums'] == 'half':
                steps = [(0, 7, root)]
            elif s['arr']['drums'] == 'chorus':
                steps = [(i, 1.6, root + (12 if i % 4 == 2 else 0)) for i in range(0, 16, 2)]
            else:
                steps = [(i, 1.5, root) for i in (0, 2, 4, 6, 8, 10, 11, 14)]
            for st, ln, m in steps:
                d = ln * STEP + .05; f = hz(m)
                x = saw(f, d) * .6 + saw(f * 1.004, d, .3) * .4 + np.sin(2 * np.pi * f / 2 * tt(d)) * .5
                x = lowpass(x, 300 + 900 * lvl) * adsr(len(x), .004, .12, .7, .03)
                add('bass', x, t0 + st * STEP, .55 * lvl)

def voicing(ch, lo=55, hi=69):
    ms = sorted(m for m in range(lo, hi) if (m - ch['root']) % 12 in ch['tones'])
    return [36 + 12 + ch['root'] - (12 if ch['root'] > 7 else 0)] + ms

def pad():
    secs = song['sections']
    for si, s in enumerate(secs):
        lvl = s['arr']['pad']
        if not lvl: continue
        f_end = secs[si + 1]['arr']['filt'] if s['name'] == 'Intro' else s['arr']['filt']
        for b, ch in enumerate(s['chords']):
            fc = s['arr']['filt'] + (f_end - s['arr']['filt']) * b / s['bars']
            d = BAR + .5
            L = np.zeros(int(d * SR)); R = np.zeros(int(d * SR))
            for m in voicing(ch):
                for v in range(3):
                    det = (v - 1) * .11
                    L += saw(hz(m + det), d, rng.random())
                    R += saw(hz(m - det * .8), d, rng.random())
            e = adsr(len(L), .12, .3, .8, .45)
            st = np.vstack([lowpass(L, fc) * e, lowpass(R, fc) * e]) / 14
            add('pad', st, s['t0'] + b * BAR, lvl)

def arp():
    for s in song['sections']:
        lvl = s['arr']['arp']
        if not lvl: continue
        for b, ch in enumerate(s['chords']):
            tones = [72 + (ch['root'] - 12 if ch['root'] > 7 else ch['root']) + iv for iv in ch['tones'][:3]]
            seq = tones + [tones[0] + 12] + tones[::-1]
            for i in range(16):
                m = seq[i % len(seq)] + (12 if (b % 2 and i >= 12) else 0)
                d = .16; f = hz(m)
                ph = np.cumsum(np.full(int(d * SR), f)) / SR % 1
                x = np.where(ph < .3, 1.0, -1.0) * .5 + np.sin(2 * np.pi * ph) * .5
                x = lowpass(x, 2500 + 2500 * lvl) * np.exp(-tt(d) * 22)
                t = s['t0'] + b * BAR + i * STEP
                pan = .45 if i % 2 else -.45
                add('arp', x, t, lvl * .5, pan)
                add('arp', x, t + 3 * STEP, lvl * .2, -pan)      # dotted-eighth echo
                add('arp', x, t + 6 * STEP, lvl * .08, pan)

def oohs():
    for s in song['sections']:
        if not s['arr'].get('ooh'): continue
        for b, ch in enumerate(s['chords']):
            for j, m in enumerate(voicing(ch, 60, 72)[1:4]):
                y, off = sing('ooh', m, BAR - .05, vibrato=.25, breath=.05, attack=.3)
                add('ooh', lowpass(y, 2800), s['t0'] + b * BAR + off, .5, (j - 1) * .6)

# ---------------------------------------------------------------- lead vocal
def lead():
    notes = song['notes']; prev = None
    for i, n in enumerate(notes):
        pm = prev['midi'] if prev and n['t'] - (prev['t'] + prev['dur']) < .06 else None
        y, off = sing(n['key'], n['midi'], n['dur'], prev_midi=pm)
        add('vocal', y, n['t'] + off, .9, -.04)
        add('vocal', y, n['t'] + off + .013, .35, .7)          # Haas double for width
        if song['sections'][n['section']]['arr']['drums'] == 'chorus':   # octave-down double in choruses
            y2, off2 = sing(n['key'], n['midi'] - 12, n['dur'], prev_midi=pm and pm - 12, vibrato=.5)
            add('vocal', y2, n['t'] + off2, .28, .3)
        prev = n

# ---------------------------------------------------------------- fx
def fx():
    for si, s in enumerate(song['sections']):
        if s['arr'].get('riser'):
            d = BAR * 2; t0 = s['t1'] - d; t = tt(d)
            nz = np.zeros(len(t))
            for k in range(8):   # stepped band sweep
                a, b = int(k * len(t) / 8), int((k + 1) * len(t) / 8)
                nz[a:b] = bandnoise(b - a, 400 * 1.5 ** k, 1200 * 1.5 ** k)
            tone = saw(hz(45 + 30 * (t / d) ** 2), d) * .1
            add('fx', (nz * .25 + lowpass(tone, 3000)) * (t / d) ** 2.5, t0, .6)
        if s['name'] == 'Final Chorus':    # key-lift impact
            t = tt(2.0)
            boom = np.sin(2 * np.pi * np.cumsum(30 + 80 * np.exp(-t * 6)) / SR) * np.exp(-t * 2)
            add('fx', boom, s['t0'], 1.0)

def bridge_glitch(master):
    """Stutter the last beat of every second bridge bar, then drop out right before the final chorus."""
    b = next(s for s in song['sections'] if s['name'] == 'Bridge')
    for k in range(1, b['bars'], 2):
        t = b['t0'] + (k + 1) * BAR - BEAT
        i = int(t * SR); sl = int(STEP / 2 * SR)
        chunk = master[:, i:i + sl].copy()
        for r in range(int(BEAT / (STEP / 2))):
            fade = np.linspace(1, .6, sl)
            master[:, i + r * sl:i + (r + 1) * sl] = chunk * fade
    i = int((b['t1'] - BEAT) * SR); j = int(b['t1'] * SR)
    master[:, i:j] *= np.linspace(.15, 0, j - i) ** 2

# ---------------------------------------------------------------- reverb + master
def reverb(x, secs=1.9):
    n = int(secs * SR); t = np.arange(n) / SR
    ir = np.stack([lowpass(rng.standard_normal(n), 5000) * np.exp(-t * 6.9 / secs) for _ in range(2)])
    ir[:, :int(.02 * SR)] = 0
    L = x.shape[1] + n
    F = np.fft.rfft(x, L) * np.fft.rfft(ir, L)
    return np.fft.irfft(F, L)[:, :x.shape[1]] / np.sqrt(n) * 2.2

def compress(x, thresh=.25, ratio=3.0, win=.02):
    k = int(win * SR)
    p = np.convolve((x ** 2).mean(0), np.ones(k) / k, 'same') ** .5
    g = np.where(p > thresh, (np.maximum(p, 1e-9) / thresh) ** (1 / ratio - 1), 1.0)
    return x * g

def write(path, x):
    x = np.clip(x, -1, 1)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x.T * 32767).astype('<i2').tobytes())

if __name__ == '__main__':
    steps = [('drums', drums), ('bass', bass), ('pad', pad), ('arp', arp), ('ooh', oohs), ('lead vocal', lead), ('fx', fx)]
    for name, fn in steps:
        print('  rendering', name, flush=True); fn()
    duck = duck_env()
    for k in ('bass', 'pad', 'arp', 'ooh'):
        BUSES[k] *= duck if k != 'bass' else (.4 + .6 * duck)
    BUSES['vocal'] = compress(BUSES['vocal'], .12, 3.5)
    print('  bus rms (dB):', ', '.join(f"{k} {20 * np.log10(np.sqrt((BUSES[k] ** 2).mean()) * LEVEL[k] + 1e-9):.1f}" for k in BUSES))
    dry = sum(BUSES[k] * LEVEL[k] for k in BUSES)
    wet = reverb(sum(BUSES[k] * LEVEL[k] * SEND[k] for k in BUSES))
    master = dry + wet
    bridge_glitch(master)
    master = compress(master, np.sqrt((master ** 2).mean()) * 1.4, 2.5, .03)
    master = np.tanh(master / np.abs(master).max() * 1.6) / np.tanh(1.6) * .89
    end = int((song['duration'] + 2.5) * SR)
    master = master[:, :end]
    master[:, -int(2 * SR):] *= np.linspace(1, 0, int(2 * SR))
    os.makedirs(os.path.join(BUILD, 'stems'), exist_ok=True)
    write(os.path.join(BUILD, 'audio.wav'), master)
    for k, b in BUSES.items():
        write(os.path.join(BUILD, 'stems', f'{k}.wav'), b[:, :end] / max(1e-9, np.abs(b).max()) * .9)
    print(f'wrote build/audio.wav ({master.shape[1] / SR:.1f}s) + {len(BUSES)} stems')
