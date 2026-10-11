"""Does the performance actually sing our lyrics? Transcribe it and score it.

1. Demucs (htdemucs) separates the vocal from the mix.
2. Whisper (faster-whisper, medium.en) transcribes the vocal with word timestamps.
   It gets no hint of our lyrics, so it can't hear what it expects.
3. The transcript is aligned to LYRICS (from build/song.json) and scored:
   word accuracy overall and per line.

Writes build/<name>.lyrics.json (transcript words with times, per-line scores).

    <venv>/bin/python audio/lyric_check.py build/acestep.wav [--model medium.en]
"""
import argparse, json, os, re, sys, time
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(ROOT, 'build')

def norm(w):
    w = w.lower().replace('’', "'")
    w = re.sub(r"[^a-z0-9' ]", ' ', w)
    return [x for x in w.split() if x]

def separate(path, out_dir):
    import torch, soundfile as sf
    from demucs.pretrained import get_model
    from demucs.apply import apply_model
    import torchaudio
    m = get_model('htdemucs'); m.eval()
    x, sr = sf.read(path, always_2d=True)
    wav = torch.tensor(x.T, dtype=torch.float32)
    if sr != m.samplerate: wav = torchaudio.functional.resample(wav, sr, m.samplerate)
    if wav.shape[0] == 1: wav = wav.repeat(2, 1)
    ref = wav.mean(0); wav = (wav - ref.mean()) / (ref.std() + 1e-8)
    with torch.no_grad():
        src = apply_model(m, wav[None], device='cpu', progress=False, num_workers=0)[0]
    src = src * (ref.std() + 1e-8) + ref.mean()
    voc = src[m.sources.index('vocals')].mean(0).numpy()
    p = os.path.join(out_dir, os.path.splitext(os.path.basename(path))[0] + '.vocals.wav')
    sf.write(p, voc / (np.abs(voc).max() + 1e-9) * .9, m.samplerate)
    return p

def transcribe(path, model):
    from faster_whisper import WhisperModel
    wm = WhisperModel(model, device='cpu', compute_type='int8', cpu_threads=os.cpu_count() or 4)
    import soundfile as sf
    from scipy.signal import resample_poly
    x, sr = sf.read(path, always_2d=True); x = x.mean(1)
    g = np.gcd(sr, 16000); x = resample_poly(x, 16000 // g, sr // g).astype(np.float32)
    segs, _ = wm.transcribe(x, language='en', beam_size=5, word_timestamps=True, vad_filter=False,
                            condition_on_previous_text=False)
    words = []
    for s in segs:
        for w in s.words or []:
            for t in norm(w.word): words.append(dict(w=t, t0=round(w.start, 2), t1=round(w.end, 2)))
    return words

def align(ref, hyp):
    """Levenshtein alignment of word lists; returns list of (ref_index or None, hyp_index or None)."""
    n, m = len(ref), len(hyp)
    D = np.zeros((n + 1, m + 1), int); D[:, 0] = range(n + 1); D[0, :] = range(m + 1)
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            D[i, j] = min(D[i - 1, j - 1] + (ref[i - 1] != hyp[j - 1]), D[i - 1, j] + 1, D[i, j - 1] + 1)
    i, j, path = n, m, []
    while i or j:
        if i and j and D[i, j] == D[i - 1, j - 1] + (ref[i - 1] != hyp[j - 1]): path.append((i - 1, j - 1)); i -= 1; j -= 1
        elif i and D[i, j] == D[i - 1, j] + 1: path.append((i - 1, None)); i -= 1
        else: path.append((None, j - 1)); j -= 1
    return path[::-1]

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('audio'); ap.add_argument('--model', default='medium.en')
    ap.add_argument('--no-separate', action='store_true')
    a = ap.parse_args()
    song = json.load(open(os.path.join(BUILD, 'song.json')))
    t = time.time()
    cached = os.path.join(BUILD, os.path.splitext(os.path.basename(a.audio))[0] + '.vocals.wav')
    voc = a.audio if a.no_separate else cached if os.path.exists(cached) and os.path.getmtime(cached) > os.path.getmtime(a.audio) else separate(a.audio, BUILD)
    print(f'vocals separated in {time.time() - t:.0f}s', flush=True); t = time.time()
    words = transcribe(voc, a.model)
    print(f'transcribed in {time.time() - t:.0f}s: {len(words)} words', flush=True)
    ref, owner, song_t, widx = [], [], [], []   # reference tokens in sung order: line, song time, index into song['words']
    for wi, w in enumerate(song['words']):
        for tok in norm(w['text']):
            ref.append(tok); owner.append(w['line']); song_t.append(song['notes'][w['notes'][0]]['t']); widx.append(wi)
    path = align(ref, [w['w'] for w in words])
    hit = [False] * len(ref); match = [None] * len(ref)
    for r, h in path:
        if r is not None and h is not None and ref[r] == words[h]['w']: hit[r] = True; match[r] = h
    lines = []
    for li, L in enumerate(song['lines']):
        idx = [k for k in range(len(ref)) if owner[k] == li]
        got = [words[match[k]] for k in idx if match[k] is not None]
        lines.append(dict(text=L['text'], acc=round(sum(hit[k] for k in idx) / len(idx), 2),
                          t0=got[0]['t0'] if got else None, t1=got[-1]['t1'] if got else None))
    acc = sum(hit) / len(ref)
    anchors = [[round(song_t[k], 3), words[match[k]]['t0'], widx[k], words[match[k]]['t1']] for k in range(len(ref)) if match[k] is not None]
    out = dict(audio=a.audio, model=a.model, word_accuracy=round(acc, 3), lines=lines, words=words, anchors=anchors,
               transcript=' '.join(w['w'] for w in words))
    p = os.path.join(BUILD, os.path.splitext(os.path.basename(a.audio))[0] + '.lyrics.json')
    json.dump(out, open(p, 'w'), indent=1)
    for L in lines: print(f"  {int(L['acc'] * 100):3d}%  {L['text']}")
    print(f'\nWORD ACCURACY {acc * 100:.0f}%  ({sum(hit)}/{len(ref)} lyric words heard)  -> {p}')
    print('heard:', out['transcript'][:600])

if __name__ == '__main__':
    main()
