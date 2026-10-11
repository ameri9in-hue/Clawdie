"""Re-perform UPDATE MY PRIORS with ACE-Step 1.5 (cover mode).

Our own composition stays the source of truth. ACE-Step's "cover" task takes
our full mix (build/audio.wav, with the Kokoro vocal) as the source audio, plus
our lyrics with section tags. It then re-sings and re-produces the song while
keeping its structure and 120 BPM timing, so the video stays in sync.

    ACESTEP_ROOT=/path/to/ACE-Step-1.5  <acestep venv>/bin/python audio/acestep_cover.py \
        [--strength 0.7] [--seed 7] [--start 0 --dur 146.5] [--steps 8] [--out build/acestep.wav]

ACESTEP_ROOT is a clone of github.com/ace-step/ACE-Step-1.5 whose checkpoints/ holds
acestep-v15-turbo, vae and Qwen3-Embedding-0.6B (from huggingface.co/ACE-Step/Ace-Step1.5).
Cover mode skips ACE-Step's 5Hz language model, so the LM weights are not needed.
"""
import argparse, json, os, shutil, sys, time

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(HERE, 'build')

CAPTION = ('catchy electro-pop, bright female lead vocal, clear diction, warm supersaw pads, '
           'punchy four-on-the-floor drums, pulsing synth bass, sparkling arpeggios, '
           'playful and hopeful, 120 bpm, A minor')

def tagged_lyrics(song, t0, t1):
    """Our lyrics with ACE-Step structure tags, limited to sections that overlap [t0, t1)."""
    tags = {'Intro': '[Intro - instrumental]', 'Pre-Chorus 1': '[Pre-Chorus]', 'Pre-Chorus 2': '[Pre-Chorus]',
            'Bridge': '[Bridge - half-time]', 'Final Chorus': '[Chorus - key change, anthemic]', 'Tag': '[Outro]',
            'Outro': '[Outro - instrumental]'}
    out = []
    for si, s in enumerate(song['sections']):
        if s['t1'] <= t0 or s['t0'] >= t1: continue
        out.append(tags.get(s['name'], f"[{s['name'].rstrip(' 12')}]"))
        out += [L['text'] for L in song['lines'] if L['section'] == si and L['t1'] > t0 and L['t0'] < t1]
        out.append('')
    return '\n'.join(out).strip()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--strength', type=float, default=0.7)
    ap.add_argument('--seed', type=int, default=7)
    ap.add_argument('--start', type=float, default=0.0)
    ap.add_argument('--dur', type=float, default=None)
    ap.add_argument('--steps', type=int, default=8)
    ap.add_argument('--src', default=os.path.join(BUILD, 'audio.wav'))
    ap.add_argument('--out', default=os.path.join(BUILD, 'acestep.wav'))
    a = ap.parse_args()

    root = os.environ['ACESTEP_ROOT']
    sys.path.insert(0, root)
    import soundfile as sf
    import torch
    torch.set_num_threads(os.cpu_count() or 4)
    from acestep.handler import AceStepHandler
    from acestep.inference import GenerationParams, GenerationConfig, generate_music

    song = json.load(open(os.path.join(BUILD, 'song.json')))
    x, sr = sf.read(a.src)
    dur = a.dur or (len(x) / sr - a.start)
    src = a.src
    if a.start or a.dur:   # clip the source for a quick test
        src = os.path.join(BUILD, 'acestep_src.wav')
        sf.write(src, x[int(a.start * sr):int((a.start + dur) * sr)], sr)

    t = time.time()
    dit = AceStepHandler()
    msg, ok = dit.initialize_service(project_root=root, config_path='acestep-v15-turbo', device='cpu')
    if not ok: sys.exit(f'init failed: {msg}')
    # On CPU ACE-Step loads everything in float32 (about 14 GB at peak, more than a 16 GB box can spare).
    # bfloat16 halves that and is fast on CPUs with AVX512-BF16/AMX. The VAE stays float32.
    if os.environ.get('ACESTEP_CPU_BF16', '1') == '1':
        dit.dtype = torch.bfloat16
        dit.model.to(torch.bfloat16)
        dit.text_encoder.to(torch.bfloat16)
        dit.silence_latent = dit.silence_latent.to(torch.bfloat16)
    print(f'loaded in {time.time() - t:.0f}s ({dit.dtype})', flush=True)

    params = GenerationParams(task_type='cover', src_audio=src, caption=CAPTION,
                              lyrics=tagged_lyrics(song, a.start, a.start + dur), vocal_language='en',
                              bpm=120, keyscale='A minor', timesignature='4', duration=dur,
                              audio_cover_strength=a.strength, inference_steps=a.steps, seed=a.seed, thinking=False)
    config = GenerationConfig(batch_size=1, use_random_seed=False, seeds=[a.seed], audio_format='wav')
    t = time.time()
    res = generate_music(dit, None, params, config, save_dir=os.path.join(BUILD, 'acestep_out'))
    if not res.success: sys.exit(f'generation failed: {res.error}')
    shutil.copy(res.audios[0]['path'], a.out)
    print(f'generated {dur:.1f}s of audio in {time.time() - t:.0f}s -> {a.out}')

if __name__ == '__main__':
    main()
