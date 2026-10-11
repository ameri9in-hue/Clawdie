"""Re-time the video to a performance: song time for every video frame of that performance.

Uses the anchors from audio/lyric_check.py (each lyric word Whisper heard, with its
song.py time and its sung time). Keeps the longest consistent run of anchors, then
interpolates piecewise-linearly. Writes build/timemap.js for mv.js, and captions
timed to the performance.

    python3 audio/retime.py build/take_11.wav
"""
import json, os, sys
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(ROOT, 'build')
FPS = 30

def lis(vals):
    """Indices of the longest strictly increasing subsequence."""
    import bisect
    tails, idx, prev = [], [], [-1] * len(vals)
    for i, v in enumerate(vals):
        k = bisect.bisect_left(tails, v)
        if k == len(tails): tails.append(v); idx.append(i)
        else: tails[k] = v; idx[k] = i
        prev[i] = idx[k - 1] if k else -1
    out, i = [], idx[-1] if idx else -1
    while i >= 0: out.append(i); i = prev[i]
    return out[::-1]

def main():
    perf = sys.argv[1]
    name = os.path.splitext(os.path.basename(perf))[0]
    chk = json.load(open(os.path.join(BUILD, name + '.lyrics.json')))
    song = json.load(open(os.path.join(BUILD, 'song.json')))
    A = sorted(chk['anchors'])
    keep = lis([a[1] for a in A]); A = np.array([A[i] for i in keep])
    # the offset (performance - song) should drift smoothly; drop words far from their neighbours' median
    for _ in range(3):
        off = A[:, 1] - A[:, 0]
        med = np.array([np.median(off[max(0, i - 5):i + 6]) for i in range(len(off))])
        ok = np.abs(off - med) < .3
        if ok.all(): break
        A = A[ok]
    import soundfile as sf
    info = sf.info(perf); dur = info.frames / info.samplerate
    pt = np.arange(0, dur, 1 / FPS)
    s_of_p = np.interp(pt, A[:, 1], A[:, 0])
    s_of_p[pt < A[0, 1]] = A[0, 0] - (A[0, 1] - pt[pt < A[0, 1]])          # slope 1 before the first anchor
    end = song['duration'] + 2.5                                           # after the last sung word: spread the
    tail = pt > A[-1, 1]                                                   # performance's outro over our outro
    s_of_p[tail] = A[-1, 0] + (pt[tail] - A[-1, 1]) * (end - A[-1, 0]) / max(1e-3, dur - A[-1, 1])
    # word times as actually sung (Whisper), expressed in song time, so on-screen words land on the voice;
    # words Whisper missed are spread between their heard neighbours in the same line
    s_of = lambda x: float(np.interp(x, pt, s_of_p))
    heard = {int(a[2]): (s_of(a[1]), s_of(a[3])) for a in A}
    WT = []
    for wi, w in enumerate(song['words']):
        n0, n1 = song['notes'][w['notes'][0]], song['notes'][w['notes'][-1]]
        WT.append(list(heard.get(wi, (None, None))) + [n0['t'], n1['t'] + n1['dur']])
    for li in range(len(song['lines'])):
        idx = [i for i, w in enumerate(song['words']) if w['line'] == li]
        known = [i for i in idx if WT[i][0] is not None]
        for i in idx:
            if WT[i][0] is not None: continue
            if known:   # shift by the nearest heard word's offset
                k = min(known, key=lambda j: abs(j - i)); d = WT[k][0] - WT[k][2]
            else:
                d = s_of(float(np.interp(WT[i][2], s_of_p, pt))) - WT[i][2]
            WT[i][0], WT[i][1] = WT[i][2] + d, WT[i][3] + d
        for a, b in zip(idx, idx[1:]):    # keep words in order and non-overlapping
            WT[b][0] = max(WT[b][0], WT[a][0] + .05); WT[a][1] = min(max(WT[a][1], WT[a][0] + .12), WT[b][0] + .3)
    open(os.path.join(BUILD, 'timemap.js'), 'w').write('window.TIMEMAP=[' + ','.join(f'{x:.3f}' for x in s_of_p) + '];\n'
        + "window.PERFORMER='ACE-Step 1.5';\n"
        + 'window.WORD_TIMES=' + json.dumps([[round(a, 3), round(b, 3)] for a, b, _, _ in WT]) + ';\n')
    # captions at the performance's own times
    def p_of_s(x): return float(np.interp(x, s_of_p, pt))
    def ts(x): x = max(0, x); return f"{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{int(x % 60):02d},{int(round(x % 1 * 1000)) % 1000:03d}"
    Ls = song['lines']; srt = []
    for i, L in enumerate(Ls):
        a, b = p_of_s(L['t0']) - .2, p_of_s(L['t1']) + .2
        if i + 1 < len(Ls): b = min(b, p_of_s(Ls[i + 1]['t0']) - .25)
        srt.append(f"{i + 1}\n{ts(a)} --> {ts(b)}\n{L['text']}\n")
    open(os.path.join(BUILD, name + '.srt'), 'w').write('\n'.join(srt))
    # PRIOR's singing glow follows this performance's (separated) vocal, indexed by song time
    vp = os.path.join(BUILD, name + '.vocals.wav')
    if os.path.exists(vp):
        v, r = sf.read(vp, always_2d=True); v = v.mean(1); hop = r // FPS
        rms = np.sqrt(np.add.reduceat(v ** 2, np.arange(0, len(v), hop)) / hop)
        rms = np.clip(rms / (np.percentile(rms[rms > 1e-4], 95) + 1e-9), 0, 1)
        sf_t = np.arange(0, song['duration'] + 2.5, 1 / FPS)
        env = np.interp([p_of_s(x) for x in sf_t], np.arange(len(rms)) / FPS, rms)
        open(os.path.join(BUILD, 'vocal_env.js'), 'w').write('window.VOCAL_ENV=[' + ','.join(f'{x:.2f}' for x in env) + '];\n')
    off = (pt - s_of_p)
    print(f'{len(A)} anchors kept of {len(chk["anchors"])}; performance - song offset {off.min():+.2f} .. {off.max():+.2f} s '
          f'-> build/timemap.js, build/{name}.srt')

if __name__ == '__main__':
    main()
