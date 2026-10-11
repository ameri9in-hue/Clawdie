"""Have ACE-Step 1.5 perform UPDATE MY PRIORS from our lyrics (text2music with its 5Hz LM).

ACE-Step's planning LM turns our tagged lyrics into a sung performance (120 BPM,
A minor, our section layout). Each take is then checked with audio/lyric_check.py
(Whisper must hear our words), and audio/retime.py re-times the video to its singing.
(Cover mode, which re-performs our own mix, was tried first: it copied the source
vocal's mumbled words and Whisper heard only 48% of the lyrics.)

On CPU the weights must load in bfloat16: run audio/get_acestep.sh, which patches that in.

    ACESTEP_ROOT=... <acestep venv>/bin/python audio/acestep_song.py --seeds 11 23 37 [--lm acestep-5Hz-lm-1.7B]
        -> build/take_<seed>.wav
"""
import argparse, json, os, shutil, sys, time

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(HERE, 'build')
CAPTION = ('catchy electro-pop, bright female lead vocal, clear diction, warm supersaw pads, '
           'punchy four-on-the-floor drums, pulsing synth bass, sparkling arpeggios, '
           'playful and hopeful, 120 bpm, A minor')

TAGS = {'Intro': '[Intro]', 'Verse 1': '[Verse 1]', 'Verse 2': '[Verse 2]', 'Pre-Chorus 1': '[Pre-Chorus]',
        'Pre-Chorus 2': '[Pre-Chorus]', 'Chorus 1': '[Chorus]', 'Chorus 2': '[Chorus]', 'Bridge': '[Bridge - half-time]',
        'Final Chorus': '[Chorus - key change]', 'Tag': '[Outro]', 'Outro': '[Fade Out]'}

def lyrics(song):
    out = []
    for si, s in enumerate(song['sections']):
        out.append(TAGS[s['name']])
        out += [L['text'] for L in song['lines'] if L['section'] == si]
        out.append('')
    return '\n'.join(out).strip()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--seeds', type=int, nargs='+', default=[11])
    ap.add_argument('--lm', default='acestep-5Hz-lm-1.7B')
    ap.add_argument('--steps', type=int, default=8)
    a = ap.parse_args()
    root = os.environ['ACESTEP_ROOT']; sys.path.insert(0, root)
    import torch
    torch.set_num_threads(os.cpu_count() or 4)
    os.environ.setdefault('ACESTEP_CPU_BF16', '1')   # load straight into bfloat16 (see audio/get_acestep.sh patch)
    from acestep.handler import AceStepHandler
    from acestep.llm_inference import LLMHandler
    from acestep.inference import GenerationParams, GenerationConfig, generate_music
    song = json.load(open(os.path.join(BUILD, 'song.json')))
    t = time.time()
    dit = AceStepHandler()
    msg, ok = dit.initialize_service(project_root=root, config_path='acestep-v15-turbo', device='cpu')
    if not ok: sys.exit(f'DiT init failed: {msg}')
    dit.dtype = torch.bfloat16                      # float32 does not fit next to the LM in 16 GB
    dit.model.to(torch.bfloat16); dit.text_encoder.to(torch.bfloat16)
    dit.silence_latent = dit.silence_latent.to(torch.bfloat16)
    llm = LLMHandler()
    msg, ok = llm.initialize(checkpoint_dir=os.path.join(root, 'checkpoints'), lm_model_path=a.lm, backend='pt',
                             device='cpu', dtype=torch.bfloat16)
    if not ok: sys.exit(f'LM init failed: {msg}')
    print(f'loaded in {time.time() - t:.0f}s', flush=True)
    text = lyrics(song)
    for seed in a.seeds:
        t = time.time()
        params = GenerationParams(task_type='text2music', caption=CAPTION, lyrics=text, vocal_language='en',
                                  bpm=120, keyscale='A minor', timesignature='4', duration=song['duration'] + 2.5,
                                  inference_steps=a.steps, seed=seed, thinking=True,
                                  use_cot_metas=False, use_cot_caption=False, use_cot_language=False, use_cot_lyrics=False)
        config = GenerationConfig(batch_size=1, use_random_seed=False, seeds=[seed], audio_format='wav')
        res = generate_music(dit, llm, params, config, save_dir=os.path.join(BUILD, 'acestep_out'))
        if not res.success: print(f'seed {seed} failed: {res.error}', flush=True); continue
        out = os.path.join(BUILD, f'take_{seed}.wav')
        shutil.copy(res.audios[0]['path'], out)
        print(f'seed {seed}: {time.time() - t:.0f}s -> {out}', flush=True)

if __name__ == '__main__':
    main()
