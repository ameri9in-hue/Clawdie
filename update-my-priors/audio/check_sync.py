"""Check that a re-performed track (ACE-Step cover) still sits on our song timeline.

The video is drawn from song.py timing, so a performance must keep our beat grid.
This compares onset envelopes of our mix (build/audio.wav) and the performance in
8 s windows and prints the best lag per window (searched within +-120 ms, since
the hi-hats repeat every 250 ms). It fails if the vocal sections drift.

    python3 audio/check_sync.py build/acestep.wav [--max-lag-ms 60]
"""
import argparse, json, os, sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(ROOT, 'build')
SR, HOP, WIN = 22050, 220, 800            # 10 ms frames, 8 s windows

def onset_env(path):
    r, x = wavfile.read(path)
    x = x.astype(np.float64); x = x.mean(1) if x.ndim > 1 else x
    if np.abs(x).max() > 2: x /= 32768.0
    g = np.gcd(int(r), SR); x = resample_poly(x, SR // g, int(r) // g)
    fr = np.lib.stride_tricks.sliding_window_view(x, 1024)[::HOP] * np.hanning(1024)
    S = np.log1p(np.abs(np.fft.rfft(fr, axis=1)) * 10)
    f = np.maximum(np.diff(S, axis=0), 0).sum(1)
    return (f - f.mean()) / (f.std() + 1e-9)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('perf'); ap.add_argument('--max-lag-ms', type=float, default=60)
    a = ap.parse_args()
    song = json.load(open(os.path.join(BUILD, 'song.json')))
    ours, theirs = onset_env(os.path.join(BUILD, 'audio.wav')), onset_env(a.perf)
    n = min(len(ours), len(theirs)); bad = []
    for s in range(0, n - WIN, WIN):
        x, y = ours[s:s + WIN], theirs[s:s + WIN]
        lags = np.arange(-12, 13)          # +-120 ms: under half an eighth note, so the hats' 250 ms period can't alias
        c = np.array([np.dot(x[max(0, -l):WIN - max(0, l)], y[max(0, l):WIN - max(0, -l)]) / WIN for l in lags])
        lag, t = lags[c.argmax()] * 10, s / 100
        sec = next(z['name'] for z in song['sections'] if z['t0'] <= t + 4 < z['t1'])
        sung = any(L['t0'] < t + 8 and L['t1'] > t for L in song['lines'])
        flag = sung and c.max() > .25 and abs(lag) > a.max_lag_ms
        if flag: bad.append(t)
        print(f'{t:6.1f}s  {sec:<13} lag {lag:+4d} ms  corr {c.max():.2f}' + ('  <-- drift' if flag else ''))
    if bad: sys.exit(f'performance drifts off the song timeline at {bad}')
    print('in sync with the song timeline')

if __name__ == '__main__':
    main()
