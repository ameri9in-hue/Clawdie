"""PRIOR's singing voice: a small formant synthesizer, numpy only.

Voiced sound is additive. Every harmonic of f0 is weighted by three formant
resonances that glide between phone targets, so vowels morph into each other.
Consonants are band-passed noise bursts, stop closures and nasal murmurs.
The result is intentionally a bit robotic: the singer is a robot.

    sing(phones, f0, t_note, dur, prev_f0=None) -> (samples, start_time)
"""
import numpy as np

SR = 44100
rng = np.random.default_rng(11)

# ---------------------------------------------------------------- phonetic dictionary (ARPAbet-ish)
# One entry per sung syllable key (see song.clean). 'I' is the pronoun, 'i' the vowel in "ev-i-dence".
LEXICON = dict(line.split(':') for line in '''
a:AX|a.:EY|m.:EH M|al:AX L|am:AE M|and:AE N D|asked:AE S K T|at:AE T|bar:B AA R|be:B IH|bench:B EH N CH
ber:B ER|brand:B R AE N D|bright:B R AY T|burn:B ER N|cal:K AE L|can:K AE N|cast:K AE S T|cent:S EH N T
climb:K L AY M|cof:K AA F|cold:K OW L D|cu:K Y AX|date:D EY T|del:D AX L|dence:D AX N S|di:D AY|dle's:D AX L Z
don't:D OW N T|doubt:D AW T|down:D AW N|drop:D R AA P|er:ER|ery:R IY|ev:EH V|ex:IH G Z|fate:F EY T|fee's:F IY Z
feed:F IY D|fine:F AY N|fire:F AY ER|five:F AY V|fore:F AO R|get:G EH T|go:G OW|gon:G AA N|head:HH EH D
i:IH|I:AY|i'd:AY D|i'm:AY M|if:IH F|in:IH N|ing:IH NG|is:IH Z|it:IH T|it's:IH T S|kind:K AY N D|know:N OW
la:L EY|lab:L AE B|late:L EY T|learned:L ER N D|less:L EH S|lief:L IY F|lights:L AY T S|like:L AY K
line:L AY N|live:L AY V|ly:L IY|marks:M AA R K S|me:M IY|mo:M AA|more:M AO R|my:M AY|n't:AX N T|na:N AX
nal:N AX L|nee:N IY|nev:N EH V|new:N UW|night:N AY T|not:N AA T|num:N AH M|one:W AH N|or:ER|ors:ER Z
out:AW T|pa:P EY|passed:P AE S T|per:P ER|pos:P AA S|pri:P R AY|re:R IY|rest:R EH S T|ri:R IY|right:R AY T
ring:R IH NG|says:S EH Z|sig:S IH G|so:S OW|some:S AH M|stay:S T EY|still:S T IH L|stop:S T AA P|te:T IY
ten:T EH N|test:T EH S T|the:DH AX|then:DH EH N|they:DH EY|three:TH R IY|through:TH R UW|ting:T IH NG
to:T UW|too:T UW|try:T R AY|tu:T UW|turn:T ER N|twen:T W EH N|ty:T IY|ues:Y UW Z|up:AH P|val:V AE L
way:W EY|we:W IY|weigh:W EY|west:W EH S T|which:W IH CH|wire:W AY ER|woke:W OW K|work:W ER K|writ:R IH T
you:Y UW|ooh:UW
'''.replace('\n', '|').strip('|').split('|'))

# Vowel formants (F1, F2, F3) in Hz, roughly an adult female voice. Diphthongs are (start, end).
V = dict(IY=(310, 2790, 3310), IH=(430, 2480, 3070), EH=(610, 2330, 2990), AE=(860, 2050, 2850),
         AA=(850, 1220, 2810), AO=(590, 920, 2710), UH=(470, 1160, 2680), UW=(370, 950, 2670),
         AH=(760, 1400, 2780), ER=(500, 1640, 1960), AX=(560, 1500, 2700))
DIPH = dict(AY=('AA', 'IY'), EY=('EH', 'IY'), OW=('AO', 'UW'), AW=('AA', 'UH'), OY=('AO', 'IY'))
VOWELS = set(V) | set(DIPH)

# Consonants: dur (s), voiced amp, formant target, closure (s of silence before burst),
# noise band (lo, hi) Hz and noise amp. Nasals damp the upper formants.
C = {
    'P': dict(dur=.035, av=0, close=.05, band=(500, 2500), na=.5),
    'B': dict(dur=.02, av=.15, close=.035, band=(400, 2000), na=.3, F=(250, 900, 2300)),
    'T': dict(dur=.035, av=0, close=.045, band=(3000, 8000), na=.55),
    'D': dict(dur=.02, av=.15, close=.03, band=(2500, 6500), na=.3, F=(280, 1700, 2600)),
    'K': dict(dur=.04, av=0, close=.05, band=(1500, 4000), na=.5),
    'G': dict(dur=.025, av=.15, close=.035, band=(1400, 3500), na=.3, F=(280, 2000, 2600)),
    'F': dict(dur=.09, av=0, band=(1500, 8000), na=.22),
    'V': dict(dur=.07, av=.45, band=(1500, 7000), na=.1, F=(300, 1400, 2400)),
    'TH': dict(dur=.08, av=0, band=(2500, 8000), na=.18),
    'DH': dict(dur=.05, av=.5, band=(2000, 6000), na=.06, F=(320, 1500, 2600)),
    'S': dict(dur=.10, av=0, band=(4500, 10000), na=.42),
    'Z': dict(dur=.08, av=.4, band=(4000, 9000), na=.22, F=(300, 1700, 2600)),
    'SH': dict(dur=.10, av=0, band=(1800, 5500), na=.42),
    'CH': dict(dur=.08, av=0, close=.04, band=(1800, 5500), na=.45),
    'HH': dict(dur=.06, av=0, band=(600, 4000), na=.2),
    'M': dict(dur=.07, av=.55, F=(280, 1100, 2500), nasal=True),
    'N': dict(dur=.065, av=.55, F=(280, 1700, 2600), nasal=True),
    'NG': dict(dur=.08, av=.55, F=(280, 2300, 2750), nasal=True),
    'L': dict(dur=.06, av=.7, F=(380, 1300, 2900)),
    'R': dict(dur=.06, av=.7, F=(350, 1150, 1600)),
    'W': dict(dur=.06, av=.7, F=(320, 700, 2200)),
    'Y': dict(dur=.055, av=.7, F=(290, 2300, 3000)),
}

def midi_hz(m): return 440.0 * 2 ** ((m - 69) / 12)

def bandnoise(n, lo, hi):
    x = rng.standard_normal(n)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    X *= np.exp(-((np.maximum(lo - f, 0) / 300) ** 2)) * np.exp(-((np.maximum(f - hi, 0) / 800) ** 2))
    y = np.fft.irfft(X, n)
    return y / (np.std(y) + 1e-9)

def plan(key, dur):
    """Split a syllable into timed segments: (phone, length) for onset, nucleus and coda."""
    phones = LEXICON[key].split()
    vi = [i for i, p in enumerate(phones) if p in VOWELS]
    onset, nucleus, coda = phones[:vi[0]], phones[vi[0]:vi[-1] + 1], phones[vi[-1] + 1:]
    on_len = [C[p]['dur'] + C[p].get('close', 0) for p in onset]
    co_len = [C[p]['dur'] + C[p].get('close', 0) for p in coda]
    vow = dur - sum(co_len) - .02
    if vow < .07:                       # short note: squeeze the coda
        k = max(.2, (dur - .09) / max(sum(co_len), 1e-3)); co_len = [c * k for c in co_len]
        vow = dur - sum(co_len) - .02
    vlen = [vow * w for w in ([1] if len(nucleus) == 1 else [.62, .38])]
    return onset, on_len, nucleus, vlen, coda, co_len

def sing(key, f0_midi, dur, prev_midi=None, vibrato=1.0, breath=.006, attack=.012):
    """Render one syllable. Returns (samples, offset) where offset <= 0 is how early it starts
    relative to the note time (onset consonants are anticipated so the vowel lands on the beat)."""
    onset, on_len, nucleus, vlen, coda, co_len = plan(key, dur)
    pre = sum(on_len)
    total = pre + dur + .03
    n = int(total * SR)
    t = np.arange(n) / SR

    # --- segment timeline: (t0, t1, formants, voiced amp, nasal, noise spec)
    segs, cur = [], 0.0
    def push(ph, L, kind):
        nonlocal cur
        if kind == 'C':
            c = C[ph]; cl = c.get('close', 0)
            if cl: segs.append((cur, cur + cl, None, c['av'] * .4, False, None)); cur += cl
            segs.append((cur, cur + c['dur'] * (L / (c['dur'] + cl) if c['dur'] + cl else 1), c.get('F'), c['av'], c.get('nasal', False),
                         (c['band'], c['na']) if 'band' in c else None))
            cur = segs[-1][1]
        else:
            if ph in DIPH:
                a, b = DIPH[ph]
                segs.append((cur, cur + L * .45, V[a], 1.0, False, None))
                segs.append((cur + L * .45, cur + L, V[b], 1.0, False, None))
            else:
                segs.append((cur, cur + L, V[ph], 1.0, False, None))
            cur += L
    for p, L in zip(onset, on_len): push(p, L, 'C')
    for p, L in zip(nucleus, vlen): push(p, L, 'V')
    for p, L in zip(coda, co_len): push(p, L, 'C')

    # --- formant + amplitude tracks: hold each target over the middle of its segment, interpolate between
    kt, kf, ka, kn = [], [], [], []
    vowel_F = [s[2] for s in segs if s[2] is not None and s[3] == 1.0][0]
    for (a, b, F, av, nasal, _) in segs:
        F = F or vowel_F
        m = min(.012, (b - a) / 3)
        for tk in (a + m, b - m):
            kt.append(tk); kf.append(F); ka.append(av); kn.append(1.0 if nasal else 0.0)
    kt = np.array(kt); kf = np.array(kf, dtype=float)
    Ft = np.stack([np.interp(t, kt, kf[:, i]) for i in range(3)])
    Av = np.interp(t, kt, ka)
    Nas = np.interp(t, kt, kn)
    end = segs[-1][1]
    Av *= np.clip(t / attack, 0, 1) * np.clip((end + .02 - t) / .03, 0, 1)

    # --- pitch: glide in from the previous note, delayed vibrato, a little drift
    f0 = np.full(n, float(f0_midi))
    if prev_midi is not None:
        g = np.clip((t - pre + .02) / .07, 0, 1)
        f0 = prev_midi + (f0_midi - prev_midi) * (g * g * (3 - 2 * g))
    vib = vibrato * .32 * np.sin(2 * np.pi * 5.6 * t) * np.clip((t - pre - .22) / .25, 0, 1)
    f0 = midi_hz(f0 + vib + .05 * np.sin(2 * np.pi * .9 * t + f0_midi))
    phase = np.cumsum(f0) / SR

    # --- additive voiced source through the formants
    out = np.zeros(n)
    K = int(6500 / midi_hz(f0_midi))
    bw = np.array([80.0, 110.0, 160.0])[:, None] + .15 * f0[None, :]
    gains = np.stack([np.ones(n), .7 * (1 - .8 * Nas), .45 * (1 - .9 * Nas)])
    for k in range(1, K + 1):
        fk = k * f0
        H = (gains / (1 + ((fk[None, :] - Ft) / (bw / 2)) ** 2)).sum(0) + .015
        H *= (1 - .55 * Nas * (fk > 500))                  # nasal murmur: dark
        out += np.sin(2 * np.pi * k * phase) * H * k ** -.35
    out *= Av / 1.6
    if breath:
        out += bandnoise(n, 1200, 7000) * Av * breath

    # --- consonant noise
    for (a, b, F, av, nasal, ns) in segs:
        if not ns: continue
        (lo, hi), na = ns
        i0, i1 = int(a * SR), min(n, int(b * SR))
        if i1 - i0 < 16: continue
        L = i1 - i0
        e = np.minimum(1, np.minimum(np.arange(L) / (.006 * SR), (L - np.arange(L)) / (.012 * SR)))
        out[i0:i1] += bandnoise(L, lo, hi) * e * na * .5
    return out, -pre
