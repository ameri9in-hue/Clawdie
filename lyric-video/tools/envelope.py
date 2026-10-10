"""Write env.js: per-frame loudness (full mix + low end) and a beat grid, for audio-reactive motion."""
import subprocess, json, pathlib, numpy as np
root = pathlib.Path(__file__).resolve().parent.parent
FPS, SR = 30, 16000
raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', str(root / 'audio/wanfeng.mp3'), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                     capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32)

# loudness per video frame
hop = SR // FPS
n = len(x) // hop
fr = x[:n * hop].reshape(n, hop)
rms = np.sqrt((fr ** 2).mean(1))
spec = np.abs(np.fft.rfft(fr * np.hanning(hop), axis=1))
low = spec[:, 1:int(180 / (SR / hop))].mean(1)
def norm(v, k):
    v = np.convolve(v, np.ones(k) / k, 'same')
    return np.round(np.clip(v / np.percentile(v, 98), 0, 1), 3).tolist()

# onset strength (log spectral flux) at 100 Hz
oh, win = 160, 1024
frames = np.lib.stride_tricks.sliding_window_view(np.pad(x, (win // 2, win)), win)[::oh][:len(x) // oh]
S = np.log1p(30 * np.abs(np.fft.rfft(frames * np.hanning(win), axis=1)))
flux = np.maximum(0, np.diff(S, axis=0)).sum(1)
flux = np.concatenate([[0], flux]); flux -= np.convolve(flux, np.ones(50) / 50, 'same'); flux = np.maximum(flux, 0)
flux /= flux.max()

# tempo by autocorrelation (70-160 bpm), then a dynamic-programming beat tracker
ac = np.correlate(flux, flux, 'full')[len(flux) - 1:]
lags = np.arange(len(ac)); bpm = 6000 / np.maximum(lags, 1)
ok = (bpm > 70) & (bpm < 160)
period = lags[ok][np.argmax(ac[ok] * np.exp(-0.5 * (np.log2(bpm[ok] / 100)) ** 2))]
score = flux.copy(); back = np.zeros(len(flux), int)
for i in range(len(flux)):
    lo, hi = i - int(period * 1.15), i - int(period * .87)
    if lo < 0: back[i] = -1; continue
    cand = np.arange(lo, hi + 1)
    pen = -4 * np.log((i - cand) / period) ** 2
    j = cand[np.argmax(score[cand] + pen)]
    score[i] += score[j] + pen[j - lo]; back[i] = j
i = int(np.argmax(score[-int(period):]) + len(score) - int(period))
beats = []
while i >= 0: beats.append(i); i = back[i]
beats = np.array(beats[::-1]) / 100.0
# downbeat phase: which of every 4th beat carries the most low end
lowf = np.interp(beats, np.arange(n) / FPS, low)
phase = int(np.argmax([lowf[k::4].mean() for k in range(4)]))
out = {'fps': FPS, 'level': norm(rms, 9), 'low': norm(low, 3), 'bpm': round(6000 / period, 2),
       'beats': np.round(beats, 3).tolist(), 'down': phase}
(root / 'env.js').write_text('window.ENV=' + json.dumps(out, separators=(',', ':')) + ';\n')
print(n, 'frames,', len(beats), 'beats at', out['bpm'], 'bpm, downbeat phase', phase)
