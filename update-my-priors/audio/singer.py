"""PRIOR's neural singing voice.

Kokoro-82M (a local ONNX speech model) is used as a voicebank, and the WORLD
vocoder turns its speech into singing, the way UTAU-style engines do:

  1. Kokoro speaks each sung syllable from its phonemes (cached in build/voicebank/).
  2. WORLD splits it into pitch (f0), spectral envelope and aperiodicity.
  3. The vowel is stretched to the note length; consonants keep their natural speed.
     The vowel onset lands exactly on the beat, so onset consonants lead in before it.
  4. f0 is replaced by the melody, with scoops, portamento between legato notes,
     delayed vibrato, and a little of the speaker's own micro-intonation.
  5. WORLD resynthesizes the result at 44.1 kHz.

    render_note(key, midi, dur, prev_midi) -> (samples @ 44.1 kHz, offset seconds)
"""
import hashlib, os
import numpy as np
import pyworld as pw
from scipy.signal import resample_poly

from voice import LEXICON

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS = os.path.join(ROOT, 'models')
CACHE = os.path.join(ROOT, 'build', 'voicebank')
KSR, SR, FP = 24000, 44100, 5.0          # kokoro rate, output rate, WORLD frame period (ms)
FPS = 1000 / FP

def available():
    return os.path.exists(os.path.join(MODELS, 'kokoro-q8.onnx'))

# ---------------------------------------------------------------- phonemes
# Our ARPAbet lexicon -> the IPA symbols Kokoro v1.0 was trained on (misaki style: A I O W Y are diphthongs).
IPA = dict(AA='ɑ', AE='æ', AH='ʌ', AO='ɔ', AW='W', AX='ə', AY='I', EH='ɛ', ER='ɜɹ', EY='A', IH='ɪ', IY='i',
           OW='O', OY='Y', UH='ʊ', UW='u', B='b', CH='ʧ', D='d', DH='ð', F='f', G='ɡ', HH='h', JH='ʤ', K='k',
           L='l', M='m', N='n', NG='ŋ', P='p', R='ɹ', S='s', SH='ʃ', T='t', TH='θ', V='v', W='w', Y='j', Z='z', ZH='ʒ')
VOWELS = {'AA', 'AE', 'AH', 'AO', 'AW', 'AX', 'AY', 'EH', 'ER', 'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW'}
VOICED_C = {'L', 'M', 'N', 'NG', 'R', 'W', 'Y', 'V', 'Z', 'DH', 'B', 'D', 'G'}
UNSTRESSED = {'a', 'the', 'to', 'at', 'and', 'it', 'is', 'er', 'ing', 'ly', 'ty', 'na', 'nal', 'del', 'dle\'s', 'dence',
              'ery', 'ber', 'ues', 'ors', 'al', 'or', 'te', 'i', 'cu', 'la', 'ting', 'ring', "n't", 'per'}

def ipa(key):
    phones = LEXICON[key].split()
    out, stressed = '', key not in UNSTRESSED
    for p in phones:
        if p in VOWELS and stressed: out += 'ˈ'; stressed = False
        out += IPA[p]
    return out

# ---------------------------------------------------------------- the voicebank
class Voicebank:
    def __init__(self, voice='af_heart'):
        import onnxruntime as ort
        from kokoro_onnx.tokenizer import Tokenizer
        self.voice = voice
        self.style = np.fromfile(os.path.join(MODELS, f'{voice}.bin'), dtype=np.float32).reshape(-1, 1, 256)
        self.sess = None; self._ort = ort; self.tok = Tokenizer()
        os.makedirs(os.path.join(CACHE, voice), exist_ok=True)
        self.mem = {}

    def speak(self, phon):
        if self.sess is None:
            o = self._ort.SessionOptions(); o.intra_op_num_threads = os.cpu_count() or 4
            self.sess = self._ort.InferenceSession(os.path.join(MODELS, 'kokoro-q8.onnx'), o)
        t = self.tok.tokenize(phon)
        return self.sess.run(None, {'input_ids': np.array([[0, *t, 0]], dtype=np.int64), 'style': self.style[len(t) - 1],
                                    'speed': np.array([.9], dtype=np.float32)})[0][0].astype(np.float64)

    def analysis(self, key):
        """WORLD features + segmentation for one syllable, cached on disk."""
        if key in self.mem: return self.mem[key]
        phon = ipa(key)
        path = os.path.join(CACHE, self.voice, hashlib.md5(phon.encode()).hexdigest()[:16] + '.npz')
        if os.path.exists(path):
            d = dict(np.load(path)); self.mem[key] = d; return d
        x = self.speak(phon)
        env = np.sqrt(np.convolve(x ** 2, np.ones(240) / 240, 'same'))
        act = np.where(env > env.max() * .03)[0]
        a, b = max(0, act[0] - 240), min(len(x), act[-1] + 480)
        x = x[a:b]
        f0, t = pw.harvest(x, KSR, f0_floor=70, f0_ceil=600, frame_period=FP)
        sp = pw.cheaptrick(x, f0, t, KSR)
        ap = pw.d4c(x, f0, t, KSR)
        hop = int(KSR * FP / 1000)
        rms = np.array([np.sqrt(np.mean(x[i * hop:i * hop + hop] ** 2) + 1e-12) for i in range(len(f0))])
        d = dict(f0=f0, sp=sp, ap=ap, rms=rms)
        np.savez_compressed(path, **d)
        self.mem[key] = d
        return d

# ---------------------------------------------------------------- note rendering
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)

def segment(key, d):
    """Return frame indices (vowel_start, core_start, core_end, end) for stretching."""
    f0, rms = d['f0'], d['rms']
    loud = np.where((rms > rms.max() * .3) & (f0 > 0))[0]
    if len(loud) == 0: loud = np.where(rms > rms.max() * .3)[0]
    v0, v1 = loud[0], loud[-1]
    phones = LEXICON[key].split()
    vi = [i for i, p in enumerate(phones) if p in VOWELS]
    lead_voiced = any(p in VOICED_C for p in phones[:vi[0]])
    tail_voiced = any(p in VOICED_C for p in phones[vi[-1] + 1:])
    span = v1 - v0
    if lead_voiced: v0 = v0 + int(span * .2)          # skip the /l m n w r/ glide: the vowel starts later
    c0 = v0 + int(span * .12)
    c1 = v1 - int(span * (.35 if tail_voiced else .15))
    if len(vi) > 1:                                    # two vowels (fi-re): stretch the first, keep the second
        c1 = v0 + int((v1 - v0) * .45)
    c1 = max(c1, c0 + 2)
    return v0, c0, c1, len(f0)

def render_note(vb, key, midi, dur, prev_midi=None, vibrato=1.0, legato_next=False):
    d = vb.analysis(key)
    f0s, sp, ap = d['f0'], d['sp'], d['ap']
    v0, c0, c1, n = segment(key, d)
    lead = v0                                   # frames before the vowel: sung ahead of the beat
    pre = c0 - v0                               # vowel attack, natural speed
    tail = n - c1                               # release + coda, natural speed
    gap = 1 if legato_next else 4
    target = int(dur * FPS) - pre - gap
    k = 1.0
    if target < tail + 4:                       # short note: squeeze the tail
        k = max(.45, (target - 4) / max(tail, 1)); target_core = 4
    else:
        target_core = target - tail
    # frame map: output frame -> fractional source frame
    src = np.concatenate([np.arange(0, c0, 1.0),
                          np.linspace(c0, c1, target_core, endpoint=False),
                          c1 + np.arange(0, int(tail * k)) / k])
    src = np.clip(src, 0, n - 1)
    i0 = np.floor(src).astype(int); i1 = np.minimum(i0 + 1, n - 1); w = (src - i0)[:, None]
    lsp = np.log(sp[i0] + 1e-12) * (1 - w) + np.log(sp[i1] + 1e-12) * w
    sp2 = np.exp(lsp); ap2 = ap[i0] * (1 - w) + ap[i1] * w
    voiced = f0s[np.rint(src).astype(int)] > 0
    m = len(src)
    tf = (np.arange(m) - lead) / FPS            # seconds from the beat
    voiced |= (np.arange(m) >= c0) & (np.arange(m) < c0 + target_core)
    # pitch: scoop in, glide from the previous note, delayed vibrato, a hint of the speaker's own wobble
    p = np.full(m, float(midi))
    if prev_midi is not None:
        g = np.clip((tf + .02) / .08, 0, 1); p = prev_midi + (midi - prev_midi) * g * g * (3 - 2 * g)
    else:
        p -= .6 * np.exp(-np.clip(tf, 0, None) / .045)
    depth = vibrato * .32 * np.clip((tf - .28) / .3, 0, 1)
    p += depth * np.sin(2 * np.pi * 5.4 * np.maximum(tf, 0))
    own = np.where(f0s[np.rint(src).astype(int)] > 0, 12 * np.log2(np.maximum(f0s[np.rint(src).astype(int)], 1) /
                   np.median(f0s[f0s > 0])), 0)
    p += np.clip(own, -1.5, 1.5) * .12
    f0 = np.where(voiced, hz(p), 0.0)
    ap2[voiced & (np.arange(m) >= c0)] *= .55   # sung vowels are less breathy than speech
    y = pw.synthesize(f0, np.ascontiguousarray(sp2), np.ascontiguousarray(ap2), KSR, frame_period=FP)
    y = resample_poly(y, 147, 80)
    fade = int(.008 * SR)
    y[:fade] *= np.linspace(0, 1, fade); y[-fade * 2:] *= np.linspace(1, 0, fade * 2)
    return y, -lead / FPS
