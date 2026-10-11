// UPDATE MY PRIORS: video engine.
// Every frame is a pure function of t (seconds), driven by window.SONG from song.py.
// Routes time to the 18 shots in scenes.js, then adds lyrics, transitions and post FX.
//   index.html?t=42      one frame       ?animatic=1   storyboard overlay      ?res=540   smaller canvas
(() => {
const S = window.SONG, { W, H, C, F, clamp, lerp, inv, smooth, easeInOut, hash, noise1, BAR, BEAT, pulse, mix, rgba, text, measure, rr,
  vignette, grain, scanlines } = window.K;
const FPS = 30;
// TIMEMAP (audio/retime.py) gives the song time for each video frame of a performance whose
// timing differs from song.py (an ACE-Step take). Anchored on the words Whisper heard sung.
const TM = window.TIMEMAP || null;
// WORD_TIMES: when each word is actually sung in that performance (song time). Re-time notes and lines to it.
if (window.WORD_TIMES) {
  S.words.forEach((w, i) => {
    const [a, b] = window.WORD_TIMES[i], n = w.notes.length;
    w.notes.forEach((ni, k) => { S.notes[ni].t = a + (b - a) * k / n; S.notes[ni].dur = (b - a) / n; });
  });
  S.lines.forEach((L, li) => { const ws = S.words.filter(w => w.line === li); if (!ws.length) return;
    const f = S.notes[ws[0].notes[0]], l = S.notes[ws[ws.length - 1].notes.slice(-1)[0]]; L.t0 = f.t; L.t1 = l.t + l.dur; });
}
const DURATION = TM ? TM.length / FPS : S.duration + 2.5;
const songTime = tv => { if (!TM) return tv; const f = clamp(tv * FPS, 0, TM.length - 1), i = Math.floor(f);
  return lerp(TM[i], TM[Math.min(TM.length - 1, i + 1)], f - i); };
const q = new URLSearchParams(location.search);
const RES = parseInt(q.get('res') || '1080'), ANIMATIC = q.has('animatic');
const cv = document.getElementById('c');
cv.width = Math.round(W * RES / 1080); cv.height = RES;
const g = cv.getContext('2d');
const SC = cv.width / W;

// ------------------------------------------------------------ timeline
const SHOTS = [];
S.sections.forEach(sec => sec.shots.forEach((id, i) => {
  const n = sec.shots.length, t0 = sec.t0 + (sec.t1 - sec.t0) * i / n, t1 = sec.t0 + (sec.t1 - sec.t0) * (i + 1) / n;
  SHOTS.push({ id, t0, t1: id === 'S18' ? DURATION : t1, sec });
}));
const shotAt = t => SHOTS.find(s => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
// how each cut is made: wipe | flash | none (the scene handles it)
const CUT = { S02: 'none', S03: 'wipe', S04: 'flash', S05: 'wipe', S06: 'none', S07: 'flash', S08: 'wipe', S09: 'flash', S10: 'wipe',
  S11: 'none', S12: 'flash', S13: 'wipe', S14: 'flash', S15: 'none', S16: 'flash', S17: 'wipe', S18: 'wipe' };

function needle(t) {
  const b = t / S.bar_sec, K = S.needle;
  let v = K[K.length - 1][1];
  for (let i = 0; i < K.length - 1; i++) if (b >= K[i][0] && b < K[i + 1][0]) {
    const u = clamp((b - K[i][0]) / Math.min(1.2, K[i + 1][0] - K[i][0]));
    const e = u < 1 ? 1 - (1 - u) ** 3 * (1 - 2.2 * u) : 1;       // a little overshoot, like a real needle
    v = lerp(K[i][1], K[i + 1][1], clamp(e, -.1, 1.15)); break;
  }
  return clamp(v + Math.sin(t * 9.1) * .007 + Math.sin(t * 23.7) * .004 + pulse(t, BEAT, 9) * .01, .01, .99);
}
function lineAt(t) { let best = null; for (const L of S.lines) if (t >= L.t0 - .6 && t < L.t1 + .25) best = L; return best; }
const wordsOf = L => S.words.filter(w => w.line === S.lines.indexOf(L));

// ------------------------------------------------------------ transitions + post
function wipe(t, tb) {
  // cover (leading edge sweeps right), then reveal (trailing edge follows): a band of palette stripes
  const u = (t - (tb - .3)) / .6; if (u <= 0 || u >= 1) return;
  const lead = lerp(-700, W + 700, easeInOut(Math.min(1, u * 2))), trail = lerp(-700, W + 700, easeInOut(Math.max(0, u * 2 - 1)));
  const sk = 420, band = 70, cols = [C.coral, C.sun, C.mint, C.violet];
  const quad = (x0, x1, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(x0 + sk, 0); g.lineTo(x1 + sk, 0); g.lineTo(x1 - sk, H); g.lineTo(x0 - sk, H); g.closePath(); g.fill(); };
  quad(trail - 1200 * (1 - Math.min(1, u * 2)) - 3000 * (u < .5), lead, C.ink);
  cols.forEach((c, i) => { quad(lead - band * (i + 1), lead - band * i, c); if (u > .5) quad(trail + band * i, trail + band * (i + 1), c); });
}
function flash(t, tb) { const u = (t - tb) / .14; if (u >= 0 && u < 1) { g.fillStyle = rgba(C.cream, (1 - u) * .85); g.fillRect(0, 0, W, H); } }
function glitch(t, amt, seed) {
  const n = Math.floor(6 + amt * 14);
  for (let i = 0; i < n; i++) {
    const y = hash(seed * 31 + i) * H, h = 8 + hash(seed * 17 + i) * 90, dx = (hash(seed * 7 + i) - .5) * 260 * amt;
    g.drawImage(cv, 0, y * SC, cv.width, h * SC, dx, y, W, h);
  }
  g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = .35 * amt;
  g.drawImage(cv, 14 * amt * SC, 0, cv.width, cv.height, 0, 0, W, H);
  g.fillStyle = rgba(C.coral, .25 * amt); g.fillRect(0, 0, W, H);
  g.restore();
}

function overlay(t, shot) {
  const b = t / S.bar_sec;
  g.save(); g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, 0, W, 96);
  const mm = Math.floor(t / 60), ss = (t % 60).toFixed(1).padStart(4, '0');
  text(g, `${shot.id}  |  ${shot.sec.name}  |  bar ${Math.min(S.bars, Math.floor(b) + 1)}/${S.bars}  |  ${mm}:${ss}`, 28, 30, 26, C.sun, { align: 'left', font: F.mono });
  text(g, S.shots[shot.id] || '', 28, 70, 21, C.cream, { align: 'left', font: F.mono, weight: 400 });
  g.restore();
}

// ------------------------------------------------------------ camera + light
// A living camera: slow drift, a hint of roll, and a punch-zoom on the kick (harder in choruses).
function camera(t, sec) {
  const chorus = sec.arr.drums === 'chorus', punch = pulse(t, BEAT, 10) * (chorus ? .028 : sec.arr.drums === 'none' ? 0 : .01);
  const z = 1.035 + .012 * Math.sin(t * .23) + punch;
  g.translate(W / 2, H / 2); g.scale(z, z); g.rotate(noise1(t * .11 + 3) * .006);
  g.translate(-W / 2 + noise1(t * .17) * 16, -H / 2 + noise1(t * .17 + 9) * 11);
}
let BLOOM = null;
function bloom(amount) {             // bright parts glow: blurred, contrast-crushed copy screened on top
  if (!BLOOM) { BLOOM = document.createElement('canvas'); BLOOM.width = cv.width / 4; BLOOM.height = cv.height / 4; }
  const b = BLOOM.getContext('2d');
  b.globalCompositeOperation = 'copy'; b.filter = 'brightness(0.75) contrast(2.4) blur(5px)';
  b.drawImage(cv, 0, 0, BLOOM.width, BLOOM.height); b.filter = 'none';
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'screen'; g.globalAlpha = amount;
  g.drawImage(BLOOM, 0, 0, cv.width, cv.height); g.restore();
}
const LEAK = { 'Intro': C.violet, 'Verse 1': C.sky, 'Pre-Chorus 1': C.coral, 'Chorus 1': C.sun, 'Verse 2': C.violet, 'Pre-Chorus 2': C.coral,
  'Chorus 2': C.sun, 'Bridge': '#ffffff', 'Final Chorus': C.sun, 'Tag': C.coral, 'Outro': C.violet };
function lightLeak(t, sec) {         // two soft colored lights drifting across the frame
  g.save(); g.globalCompositeOperation = 'screen';
  for (let i = 0; i < 2; i++) {
    const x = W * (.5 + .55 * Math.sin(t * .09 + i * 2.6)), y = H * (.5 + .45 * Math.cos(t * .07 + i * 1.7)), r = 900;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgba(LEAK[sec.name] || C.sun, sec.name === 'Bridge' ? .05 : .13)); gr.addColorStop(1, rgba(C.ink, 0));
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  g.restore();
}

// ------------------------------------------------------------ frame
function renderAt(tv) {
  const t = songTime(tv);
  g.setTransform(SC, 0, 0, SC, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
  const shot = shotAt(t), p = needle(t);
  const x = { lt: t - shot.t0, p, S, line: lineAt, words: wordsOf, ownLyrics: false };
  g.save(); camera(t, shot.sec); window.SCENES[shot.id](g, t, x); g.restore();
  const bridge = shot.sec.name === 'Bridge';
  if (bridge) {
    const bb = t / S.bar_sec - shot.sec.bar;
    const stutter = [1, 3, 5].some(k => bb > k + .75 && bb < k + 1);
    const beatGlitch = pulse(t, BEAT, 14) > .6 && hash(Math.floor(t / BEAT)) > .55;
    if (stutter || beatGlitch) glitch(t, stutter ? 1 : .35, Math.floor(t * 24));
  }
  lightLeak(t, shot.sec);
  if (!x.ownLyrics) window.LYRICS.draw(g, t, S, shot.sec, shot.id);
  bloom(bridge ? .35 : .55);
  vignette(g, bridge ? .7 : .42);
  grain(g, t, .07);
  // cuts
  for (const s of SHOTS) {
    const kind = CUT[s.id]; if (!kind || kind === 'none') continue;
    if (Math.abs(t - s.t0) < .3) { if (kind === 'wipe') wipe(t, s.t0); else flash(t, s.t0); }
  }
  if (ANIMATIC) overlay(t, shot);
}

window.META = { duration: DURATION, fps: FPS };
window.renderAt = renderAt;
const go = () => {
  if (q.has('t')) renderAt(parseFloat(q.get('t')));
  else if (!q.has('render')) {
    const audio = document.getElementById('a'), start = performance.now();
    const loop = () => { const t = audio && !audio.paused ? audio.currentTime : ((performance.now() - start) / 1000) % DURATION; renderAt(t); requestAnimationFrame(loop); };
    addEventListener('keydown', e => { if (e.code === 'Space') audio.paused ? audio.play() : audio.pause(); });
    loop();
  }
  window.READY = true;
};
document.fonts.ready.then(() => Promise.all(['400 40px "Archivo Black"', '700 40px "Space Grotesk"', '700 40px "JetBrains Mono"'].map(f => document.fonts.load(f)))).then(go);
})();
