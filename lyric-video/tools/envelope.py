"""Write env.js: per-frame loudness of the track (full mix and low end), used for gentle audio-reactive glow."""
import subprocess, json, pathlib, numpy as np
root = pathlib.Path(__file__).resolve().parent.parent
FPS, SR = 30, 16000
raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', str(root / 'audio/wanfeng.mp3'), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                     capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32)
hop = SR // FPS
n = len(x) // hop
fr = x[:n * hop].reshape(n, hop)
rms = np.sqrt((fr ** 2).mean(1))
spec = np.abs(np.fft.rfft(fr * np.hanning(hop), axis=1))
low = spec[:, 1:int(180 / (SR / hop))].mean(1)
def norm(v, k):
    v = np.convolve(v, np.ones(k) / k, 'same')
    return np.round(np.clip(v / np.percentile(v, 98), 0, 1), 3).tolist()
out = {'fps': FPS, 'level': norm(rms, 9), 'low': norm(low, 3)}
(root / 'env.js').write_text('window.ENV=' + json.dumps(out, separators=(',', ':')) + ';\n')
print(n, 'frames')
