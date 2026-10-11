"""UPDATE MY PRIORS: the whole song as data.

This file is the single source of truth. The synth (audio/) and the video
(video/) both read the build/song.json it exports, so every note, syllable,
lyric highlight and needle swing comes from the same timeline.

    python3 song.py          -> build/song.json + build/song.js, prints a summary

Time units: 120 BPM in 4/4, so 1 bar = 2.0 s and 1 eighth note = 0.25 s.
A melody token is  syllable:NOTE:eighths . A rest is  _:eighths .
A syllable ending in '-' is joined to the next one into a single word on screen;
'=' joins them with a visible hyphen (brand=new -> brand-new).
"""
import json, os, re

BPM = 120
BEATS_PER_BAR = 4
SEC_PER_BAR = 60 / BPM * BEATS_PER_BAR       # 2.0
SEC_PER_EIGHTH = SEC_PER_BAR / 8              # 0.25
KEY = 'A minor (final chorus lifts to B minor)'

# ---------------------------------------------------------------- melody lines
# Verse: 4 lines x 2 bars. Chords Am F C G | Am F C G
VERSE1 = [
    "_:1 Woke:E4:1 up:E4:1 at:D4:1 three:C4:2 A.:D4:1 M.:E4:1 to:E4:1 a:D4:1 brand=:C4:1 new:C4:1 mo-:A3:1 del:C4:1 drop.:C4:2",
    "_:1 Bench-:G4:1 marks:G4:1 climb-:E4:1 ing:D4:1 like:E4:1 they:G4:2 nev-:G4:1 er:A4:1 learned:G4:1 to:E4:1 stop.:D4:3 _:1",
    "_:1 My:E4:1 cof-:E4:1 fee's:D4:1 cold,:C4:2 the:D4:1 feed:E4:1 is:E4:1 burn-:F4:1 ing:E4:1 bright.:C4:3 _:2",
    "_:1 Some-:G4:1 one:G4:1 says:E4:1 it's:G4:1 fine,:A4:2 _:1 some-:G4:1 one:G4:1 says:E4:1 it's:D4:1 not:D4:1 to-:C4:1 night.:D4:2",
]
VERSE2 = [  # same tune, same syllable counts
    "_:1 It:E4:1 passed:E4:1 the:D4:1 bar:C4:2 ex-:D4:1 am:E4:1 and:E4:1 it:D4:1 passed:C4:1 the:C4:1 Tu-:A3:1 ring:C4:1 test,:C4:2",
    "_:1 then:G4:1 it:G4:1 asked:E4:1 me,:D4:1 kind-:E4:1 ly,:G4:2 if:G4:1 I'd:A4:1 like:G4:1 to:E4:1 rest.:D4:3 _:1",
    "_:1 A:E4:1 lab:E4:1 out:D4:1 west:C4:2 is:D4:1 work-:E4:1 ing:E4:1 through:F4:1 the:E4:1 night,:C4:3 _:2",
    "_:1 writ-:G4:1 ing:G4:1 ev-:E4:1 ery:G4:1 test,:A4:2 _:1 try-:G4:1 na:G4:1 get:E4:1 the:D4:1 val-:D4:1 ues:C4:1 right.:D4:2",
]
# Pre-chorus: 2 lines x 2 bars. Chords Dm F G E
PRE1 = [
    "_:2 And:A4:1 I:A4:1 don't:C5:1 know,:A4:3 _:1 and:A4:1 I:A4:1 don't:C5:1 know:A4:4",
    "_:1 which:B4:1 way:B4:1 the:A4:1 nee-:D5:2 dle's:B4:2 gon-:B4:1 na:G#4:1 go.:B4:6",
]
PRE2 = [
    "_:2 And:A4:1 I:A4:1 don't:C5:1 know,:A4:3 _:1 and:A4:1 you:A4:1 don't:C5:1 know:A4:4",
    PRE1[1],
]
# Chorus: 8 lines x 1 bar. Chords F G C Am | F G C Am
_C1 = "I:C5:1 up-:A4:1 date:C5:1 my:D5:1 pri-:E5:2 ors:C5:2"
CHORUS = [
    _C1,
    "ev-:B4:1 ery:B4:1 head-:D5:1 line:D5:1 lights:D5:1 a:C5:1 wire.:B4:2",
    "Ten:E5:1 per-:D5:1 cent,:C5:1 then:C5:1 twen-:E5:1 ty=:G5:1 five,:E5:2",
    "re-:C5:.5 cal-:C5:.5 cu-:C5:.5 la-:B4:.5 ting,:A4:1 still:C5:1 a-:B4:1 live.:A4:3",
    _C1,
    "One:B4:1 more:B4:1 pa-:D5:1 per,:D5:1 one:D5:1 more:C5:1 fire.:B4:2",
    "It's:E5:1 a:D5:1 fore-:C5:1 cast,:C5:1 not:E5:1 a:G5:1 fate,:E5:2",
    "so:C5:1 I'm:B4:1 stay-:A4:1 ing:B4:1 up:C5:1 late.:A4:3",
]
FINAL_CHORUS = [
    _C1,
    CHORUS[1],
    "We:E5:1 can:D5:1 turn:C5:1 the:C5:1 num-:E5:1 ber:G5:1 down,:E5:2",
    CHORUS[3],
    _C1,
    "One:B4:1 less:B4:1 pa-:D5:1 per,:D5:1 one:D5:1 less:C5:1 fire.:B4:2",
    CHORUS[6],
    "and:C5:1 it:B4:1 is-:A4:1 n't:B4:1 too:C5:1 late.:A4:3",
]
# Bridge (half-time): 4 lines x 2 bars. Chords Am Am F F Dm Dm E E
BRIDGE = [
    "Ev-:A4:2 i-:A4:1 dence:G4:1 in,:E4:4 be-:A4:2 lief:C5:2 out.:A4:4",
    "Weigh:A4:2 the:A4:1 sig-:C5:1 nal,:A4:4 doubt:G4:2 the:A4:2 doubt.:F4:4",
    "Pos-:D4:1 te-:F4:1 ri-:A4:1 or,:D5:5 pos-:D4:1 te-:F4:1 ri-:A4:1 or.:C5:5",
    "If:B4:1 it's:B4:1 a:B4:1 di-:D5:2 al,:B4:3 then:G#4:2 turn:B4:2 it:D5:1 down.:E5:3",
]
TAG = [
    "It's:E5:1 a:D5:1 fore-:C5:1 cast,:C5:1 not:E5:1 a:G5:1 fate,:E5:2",
    "and:C5:1 it:B4:1 is-:A4:1 n't:B4:1 too:C5:1 late.:A4:3",
]

# ---------------------------------------------------------------- arrangement
# Each section: bars, chords (one per bar), lines as (bar offset, line, bars spanned),
# transpose in semitones, and an arrangement dict the synth reads.
#   drums: none | intro | verse | build | chorus | half
#   pad / arp / bass: 0..1 levels.  filt: pad lowpass in Hz.  riser: noise riser into next section.
#   ooh: backing 'ooh' vocal pad.  shot: storyboard shot id (see STORYBOARD.md).
def lines(src, bars_each):
    return [(i * bars_each, l, bars_each) for i, l in enumerate(src)]

SECTIONS = [
    dict(name='Intro', bars=8, chords='Am F C G Am F C G', lines=[],
         arr=dict(drums='intro', bass=.0, pad=.8, arp=.7, filt=700, riser=True), shots=['S01', 'S02']),
    dict(name='Verse 1', bars=8, chords='Am F C G Am F C G', lines=lines(VERSE1, 2),
         arr=dict(drums='verse', bass=.9, pad=.5, arp=.5, filt=1400), shots=['S03', 'S04']),
    dict(name='Pre-Chorus 1', bars=4, chords='Dm F G E', lines=lines(PRE1, 2),
         arr=dict(drums='build', bass=.9, pad=.8, arp=.8, filt=2200, riser=True), shots=['S05']),
    dict(name='Chorus 1', bars=8, chords='F G C Am F G C Am', lines=lines(CHORUS, 1),
         arr=dict(drums='chorus', bass=1, pad=1, arp=.8, filt=4000, ooh=True), shots=['S06', 'S07']),
    dict(name='Verse 2', bars=8, chords='Am F C G Am F C G', lines=lines(VERSE2, 2),
         arr=dict(drums='verse', bass=.9, pad=.55, arp=.6, filt=1600), shots=['S08', 'S09']),
    dict(name='Pre-Chorus 2', bars=4, chords='Dm F G E', lines=lines(PRE2, 2),
         arr=dict(drums='build', bass=.9, pad=.8, arp=.8, filt=2200, riser=True), shots=['S10']),
    dict(name='Chorus 2', bars=8, chords='F G C Am F G C Am', lines=lines(CHORUS, 1),
         arr=dict(drums='chorus', bass=1, pad=1, arp=.9, filt=4000, ooh=True), shots=['S11', 'S12']),
    dict(name='Bridge', bars=8, chords='Am Am F F Dm Dm E E', lines=lines(BRIDGE, 2),
         arr=dict(drums='half', bass=.7, pad=.9, arp=.0, filt=1100, riser=True, glitch=True), shots=['S13', 'S14']),
    dict(name='Final Chorus', bars=8, chords='F G C Am F G C Am', lines=lines(FINAL_CHORUS, 1), transpose=2,
         arr=dict(drums='chorus', bass=1, pad=1, arp=1, filt=5000, ooh=True), shots=['S15', 'S16']),
    dict(name='Tag', bars=4, chords='F G C Am', lines=[(2, TAG[0], 1), (3, TAG[1], 1)], transpose=2,
         arr=dict(drums='verse', bass=.8, pad=1, arp=.6, filt=3000, ooh=True), shots=['S17']),
    dict(name='Outro', bars=4, chords='Am F G Am', lines=[], transpose=2,
         arr=dict(drums='none', bass=.0, pad=.7, arp=.5, filt=900), shots=['S18']),
]

# ---------------------------------------------------------------- storyboard (one line per shot)
SHOTS = {
    'S01': 'BOOT: black screen, a terminal types "loading priors...". A single dial flickers on.',
    'S02': 'PRIOR wakes up: a round robot whose face is a p(doom) gauge. Needle idles at 50%.',
    'S03': '3 A.M. bedroom-lab: PRIOR at a desk, model-release notifications pile up like confetti.',
    'S04': 'Benchmark bar charts grow off-screen; PRIOR shrugs between "fine" and "not tonight" signs.',
    'S05': 'Camera pushes into the gauge; the needle trembles. The world drains to two colors.',
    'S06': 'CHORUS: kinetic type. Every headline hits the dial and knocks the needle 10% -> 25%.',
    'S07': 'Bell curves (prior -> posterior) morph on the beat; PRIOR dances with a coffee mug.',
    'S08': 'Exam hall: an AI aces the bar and the Turing test, then politely tucks PRIOR in.',
    'S09': 'A lab window at night far away, lights on; tiny figures write tests on whiteboards.',
    'S10': 'Same push-in, now a second gauge appears: "you don\'t know" either.',
    'S11': 'CHORUS 2: split screen of many gauges (the audience), all twitching to the beat.',
    'S12': 'Paper and fire icons rain down; PRIOR catches them and feeds them into the dial.',
    'S13': 'BRIDGE: black and white, half-time. Evidence -> belief pipeline diagram, glitch cuts.',
    'S14': '"Posterior" chant: the dial detaches from PRIOR\'s face and becomes a knob anyone can turn.',
    'S15': 'KEY LIFT: color floods back. Crowds of hands turn the dial; needle drops for the first time.',
    'S16': '"One less paper, one less fire": the confetti reverses, fires go out one by one.',
    'S17': '"It isn\'t too late": PRIOR at sunrise, the gauge reads low but never zero.',
    'S18': 'Title card UPDATE MY PRIORS; the needle keeps breathing. Fade.',
}

# p(doom) needle keyframes: (bar, value 0..1). Free-floating between, with wobble added by the video.
NEEDLE = [
    (0, .50), (8, .50), (9, .55), (11, .62), (13, .58), (15, .66), (17, .70),      # intro, verse 1: drifting up
    (19, .60), (20, .75), (21, .45), (22, .10), (22.5, .25), (24, .35), (26, .55), (28, .50),  # chorus 1: "ten percent, then twenty-five"
    (30, .62), (33, .70), (36, .74), (39, .80),                                     # verse 2, pre 2: creeping
    (40, .60), (41, .50), (42, .10), (42.5, .25), (44, .45), (46, .50), (48, .55),  # chorus 2
    (49, .80), (50, .30), (51, .90), (52, .20), (53, .70), (54, .75), (55, .40),    # bridge: evidence whiplash
    (56, .35), (58, .15), (60, .12), (62, .09), (64, .07), (72, .07),               # final: "we can turn the number down"
]

# ---------------------------------------------------------------- compile
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}

def midi(name):
    m = re.fullmatch(r'([A-G])([#b]?)(-?\d)', name)
    if not m: raise ValueError(f'bad note {name!r}')
    return NOTE[m[1]] + {'#': 1, 'b': -1, '': 0}[m[2]] + 12 * (int(m[3]) + 1)

def chord(sym, transpose):
    m = re.fullmatch(r'([A-G][#b]?)(m?)(7?)', sym)
    root = (NOTE[m[1][0]] + {'#': 1, 'b': -1}.get(m[1][1:], 0) + transpose) % 12
    tones = [0, 3, 7] if m[2] else [0, 4, 7]
    if m[3]: tones.append(10)
    names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
    return dict(sym=names[root] + m[2] + m[3], root=root, tones=tones)

def clean(s):
    """Syllable text -> the key used by the phonetic dictionary (audio/voice.py LEXICON)."""
    bare = s.rstrip('-,.')
    if bare == 'I': return 'I'                       # the pronoun, not the vowel in "ev-i-dence"
    if re.fullmatch(r'[A-Z]\.', s): return s.lower()  # spelled letters: "A. M."
    return re.sub(r"[^a-z']", '', s.lower())

def compile_song():
    out_sections, notes, words, line_list = [], [], [], []
    bar = 0
    for si, s in enumerate(SECTIONS):
        tr = s.get('transpose', 0)
        chords = s['chords'].split()
        assert len(chords) == s['bars'], s['name']
        t0 = bar * SEC_PER_BAR
        for off, text, span in s['lines']:
            pos = (bar + off) * 8           # in eighths
            end = pos + span * 8
            li = len(line_list)
            line_notes, word = [], None
            for tok in text.split():
                parts = tok.split(':')
                if parts[0] == '_':
                    pos += float(parts[1]); continue
                syl, nm, d = parts[0], parts[1], float(parts[2])
                joined = syl.endswith(('-', '='))
                shown = syl[:-1] + ('-' if syl.endswith('=') else '') if joined else syl
                n = dict(syl=shown, key=clean(syl), midi=midi(nm) + tr,
                         t=pos * SEC_PER_EIGHTH, dur=d * SEC_PER_EIGHTH, line=li, section=si)
                notes.append(n); line_notes.append(len(notes) - 1)
                if word is None:
                    word = dict(text='', notes=[], line=li)
                word['text'] += shown; word['notes'].append(len(notes) - 1)
                if not joined:
                    words.append(word); word = None
                pos += d
            assert abs(pos - end) < 1e-6, f"{s['name']} line {off}: {pos - (bar + off) * 8} eighths, want {span * 8}\n  {text}"
            line_list.append(dict(t0=(bar + off) * SEC_PER_BAR, t1=end * SEC_PER_EIGHTH, section=si,
                                  text=' '.join(w['text'] for w in words if w['line'] == li)))
        out_sections.append(dict(name=s['name'], bar=bar, bars=s['bars'], t0=t0, t1=t0 + s['bars'] * SEC_PER_BAR,
                                 transpose=tr, chords=[chord(c, tr) for c in chords], arr=s['arr'], shots=s['shots']))
        bar += s['bars']
    return dict(title='Update My Priors', bpm=BPM, bar_sec=SEC_PER_BAR, key=KEY, bars=bar,
                duration=bar * SEC_PER_BAR, sections=out_sections, notes=notes, words=words,
                lines=line_list, shots=SHOTS, needle=NEEDLE)

if __name__ == '__main__':
    song = compile_song()
    root = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(os.path.join(root, 'build'), exist_ok=True)
    js = json.dumps(song, separators=(',', ':'))
    open(os.path.join(root, 'build', 'song.json'), 'w').write(js)
    open(os.path.join(root, 'build', 'song.js'), 'w').write('window.SONG=' + js + ';\n')
    print(f"{song['title']}: {song['bars']} bars, {song['duration']:.0f}s, {len(song['notes'])} sung syllables, {len(song['lines'])} lines")
    for s in song['sections']:
        print(f"  {s['t0']:6.1f}s  bar {s['bar'] + 1:2d}  {s['name']:<13} {' '.join(c['sym'] for c in s['chords'])}")
