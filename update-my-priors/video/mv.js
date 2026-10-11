// UPDATE MY PRIORS: video engine.
// Every frame is a pure function of t (seconds), driven by window.SONG from song.py.
// Right now this draws the ANIMATIC: final timing, lyrics, needle and the PRIOR character,
// with storyboard notes overlaid. Each shot in STORYBOARD.md replaces a scene function below.
(() => {
const S = window.SONG;
const W = 1920, H = 1080, FPS = 30;
const DURATION = S.duration + 2.5;
const q = new URLSearchParams(location.search);
const RES = parseInt(q.get('res') || '1080');
const FINAL = q.has('final');
const cv = document.getElementById('c');
cv.width = Math.round(W * RES / 1080); cv.height = RES;
const g = cv.getContext('2d');

// ------------------------------------------------------------ palette (see PLAN.md, "Look")
const C = { ink: '#12142b', ink2: '#1c1f3f', cream: '#fff4e0', coral: '#ff5d5d', mint: '#4fe3b5',
  sun: '#ffc94d', violet: '#7a5cff', dim: 'rgba(255,244,224,.28)' };
const SECTION_TINT = { 'Intro': '#12142b', 'Verse 1': '#1a1840', 'Pre-Chorus 1': '#2a1838', 'Chorus 1': '#3a1530',
  'Verse 2': '#16203f', 'Pre-Chorus 2': '#2a1838', 'Chorus 2': '#3a1530', 'Bridge': '#0b0b0b',
  'Final Chorus': '#103a35', 'Tag': '#173c4a', 'Outro': '#12142b' };
const FONT = '"Helvetica Neue", Helvetica, Arial, "Liberation Sans", "DejaVu Sans", sans-serif';
const MONO = '"DejaVu Sans Mono", "Liberation Mono", Menlo, monospace';

// ------------------------------------------------------------ math
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, u) => a + (b - a) * u;
const smooth = u => u * u * (3 - 2 * u);
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, u) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], u))).join(',')})`; };

// ------------------------------------------------------------ timeline queries
const bar = t => t / S.bar_sec;
const beatPulse = t => Math.exp(-((t / (S.bar_sec / 4)) % 1) * 6);
const sectionAt = t => S.sections.find(s => t >= s.t0 && t < s.t1) || S.sections[S.sections.length - 1];
function needle(t) {
  const b = bar(t), K = S.needle;
  let v = K[K.length - 1][1];
  for (let i = 0; i < K.length - 1; i++) {
    if (b >= K[i][0] && b < K[i + 1][0]) {
      const u = clamp((b - K[i][0]) / Math.min(1.2, K[i + 1][0] - K[i][0]));
      v = lerp(K[i][1], K[i + 1][1], smooth(u)); break;
    }
  }
  return clamp(v + Math.sin(t * 9.1) * .008 + Math.sin(t * 23.7) * .004 + beatPulse(t) * .012, .01, .99);
}
function lineAt(t) {   // the line being sung, or the next one during a short gap
  let best = null;
  for (const L of S.lines) { if (t >= L.t0 - .6 && t < L.t1 + .25) best = L; }
  return best;
}

// ------------------------------------------------------------ drawing kit
function text(s, x, y, size, color, { align = 'center', weight = 800, font = FONT, alpha = 1 } = {}) {
  g.save(); g.globalAlpha *= alpha; g.font = `${weight} ${size}px ${font}`; g.fillStyle = color;
  g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); g.restore();
}
function roundRect(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

function background(t) {
  const s = sectionAt(t), si = S.sections.indexOf(s), nx = S.sections[si + 1];
  let col = SECTION_TINT[s.name];
  if (nx && t > s.t1 - .5) col = mix(col, SECTION_TINT[nx.name], smooth((t - (s.t1 - .5)) / .5));
  g.fillStyle = col; g.fillRect(0, 0, W, H);
  // dotted grid that breathes on the beat
  const p = beatPulse(t), sp = 60;
  g.fillStyle = `rgba(255,244,224,${.05 + .06 * p})`;
  const off = (t * 12) % sp;
  for (let y = -sp; y < H + sp; y += sp) for (let x = -sp; x < W + sp; x += sp) {
    g.beginPath(); g.arc(x + off, y + off * .5, 2 + p * 1.2, 0, 7); g.fill();
  }
}

// PRIOR: a round robot whose face is a p(doom) gauge.
function prior(t, x, y, scale, p) {
  const b = beatPulse(t), sq = 1 + b * .04;
  g.save(); g.translate(x, y + b * 10 * scale); g.scale(scale * (2 - sq), scale * sq);
  // antenna
  g.strokeStyle = C.cream; g.lineWidth = 8;
  const sway = Math.sin(t * 3.1) * .25;
  g.beginPath(); g.moveTo(0, -205); g.lineTo(Math.sin(sway) * 70, -205 - Math.cos(sway) * 70); g.stroke();
  g.fillStyle = p > .5 ? C.coral : C.mint;
  g.beginPath(); g.arc(Math.sin(sway) * 70, -205 - Math.cos(sway) * 70, 16 + b * 6, 0, 7); g.fill();
  // arms
  g.lineCap = 'round'; g.lineWidth = 22;
  for (const s of [-1, 1]) {
    const a = Math.sin(t * Math.PI + (s > 0 ? 0 : Math.PI)) * .4;
    g.beginPath(); g.moveTo(s * 185, 20); g.lineTo(s * (245 + 20 * Math.cos(a)), 60 + 70 * Math.sin(a)); g.stroke();
  }
  // body
  g.fillStyle = C.cream; g.beginPath(); g.arc(0, 0, 210, 0, 7); g.fill();
  g.fillStyle = C.ink; g.beginPath(); g.arc(0, 0, 182, 0, 7); g.fill();
  // gauge arc
  const a0 = Math.PI * 1.08, a1 = Math.PI * 1.92;
  const steps = 40;
  for (let i = 0; i < steps; i++) {
    const u = i / steps;
    g.strokeStyle = u < .5 ? mix(C.mint, C.sun, u * 2) : mix(C.sun, C.coral, (u - .5) * 2);
    g.lineWidth = 26; g.lineCap = 'butt';
    g.beginPath(); g.arc(0, 30, 130, lerp(a0, a1, u), lerp(a0, a1, u + 1 / steps) + .01); g.stroke();
  }
  g.strokeStyle = C.ink; g.lineWidth = 4;
  for (let i = 0; i <= 10; i++) {
    const a = lerp(a0, a1, i / 10);
    g.beginPath(); g.moveTo(Math.cos(a) * 112, 30 + Math.sin(a) * 112); g.lineTo(Math.cos(a) * 148, 30 + Math.sin(a) * 148); g.stroke();
  }
  // needle
  const na = lerp(a0, a1, p);
  g.strokeStyle = C.cream; g.lineWidth = 10; g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, 30); g.lineTo(Math.cos(na) * 140, 30 + Math.sin(na) * 140); g.stroke();
  g.fillStyle = C.cream; g.beginPath(); g.arc(0, 30, 18, 0, 7); g.fill();
  // eyes blink every ~4 s
  const blink = (t % 4.3) < .12 ? .15 : 1;
  g.fillStyle = C.cream;
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 52, -112, 14, 18 * blink, 0, 0, 7); g.fill(); }
  // readout
  text(`p(doom) ${Math.round(p * 100)}%`, 0, 112, 40, p > .5 ? C.coral : C.mint, { font: MONO, weight: 700 });
  g.restore();
}

// Belief as a bell curve: centered on the needle, sharper when evidence lands.
function beliefCurve(t, x, y, w, h, p) {
  const s = sectionAt(t);
  const width = s.arr.drums === 'chorus' ? .09 : s.arr.drums === 'half' ? .22 : .14;
  g.save(); g.translate(x, y);
  g.strokeStyle = C.dim; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.stroke();
  text('0%', 0, 30, 22, C.dim, { font: MONO, weight: 400 }); text('100%', w, 30, 22, C.dim, { font: MONO, weight: 400 });
  g.beginPath(); g.moveTo(0, 0);
  for (let i = 0; i <= 120; i++) {
    const u = i / 120, d = Math.exp(-((u - p) ** 2) / (2 * width ** 2));
    g.lineTo(u * w, -d * h * (1 + beatPulse(t) * .08));
  }
  g.lineTo(w, 0); g.closePath();
  const grd = g.createLinearGradient(0, 0, w, 0);
  grd.addColorStop(0, C.mint); grd.addColorStop(.5, C.sun); grd.addColorStop(1, C.coral);
  g.globalAlpha = .85; g.fillStyle = grd; g.fill();
  g.restore();
}

function lyrics(t) {
  const L = lineAt(t); if (!L) return;
  const li = S.lines.indexOf(L);
  const words = S.words.filter(w => w.line === li);
  let size = 76; g.font = `900 ${size}px ${FONT}`;
  const raw = words.map(w => g.measureText(w.text).width);
  const fit = Math.min(1, (W - 200) / (raw.reduce((a, b) => a + b, 0) + size * .32 * (words.length - 1)));
  size *= fit;
  const gap = size * .32, widths = raw.map(w => w * fit);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (words.length - 1);
  let x = W / 2 - total / 2; const y = 905;
  const fadeIn = clamp((t - (L.t0 - .6)) / .3), fadeOut = 1 - clamp((t - L.t1) / .25);
  words.forEach((w, i) => {
    const n0 = S.notes[w.notes[0]], n1 = S.notes[w.notes[w.notes.length - 1]];
    const on = t >= n0.t, done = t >= n1.t + n1.dur;
    const pop = on && !done ? 1 + .12 * Math.exp(-(t - n0.t) * 8) : 1;
    g.save(); g.translate(x + widths[i] / 2, y - (on && !done ? 8 : 0)); g.scale(pop, pop);
    text(w.text, 0, 0, size, done ? C.cream : on ? C.sun : C.dim, { weight: 900, alpha: fadeIn * fadeOut });
    g.restore();
    x += widths[i] + gap;
  });
  const next = S.lines[li + 1];
  if (next && next.t0 - L.t1 < 2.5) text(next.text, W / 2, 985, 34, C.dim, { weight: 700, alpha: fadeIn * fadeOut * .8 });
}

// Fictional headlines that smack into the gauge on chorus downbeats.
const HEADLINES = ['NEW MODEL DROPS AT 3 A.M.', 'BENCHMARK SATURATED (AGAIN)', 'LAB PUBLISHES SAFETY CASE', 'EVAL FINDS A SURPRISE',
  'COMPUTE DOUBLES', 'RESEARCHERS: "WE ARE HIRING"', 'TREATY TALKS RESUME', 'INTERPRETABILITY BREAKTHROUGH'];
function headlines(t) {
  const s = sectionAt(t); if (s.arr.drums !== 'chorus') return;
  const b = bar(t), k = Math.floor(b), u = b - k;
  const h = HEADLINES[(k * 3) % HEADLINES.length];
  const x = lerp(W + 300, 1180, smooth(clamp(u / .18))) - (u > .5 ? (u - .5) * 900 : 0);
  const a = 1 - clamp((u - .7) / .3);
  g.save(); g.translate(x, 250 + (k % 3) * 70); g.rotate(-.04 + (k % 2) * .08);
  g.globalAlpha = a; g.font = `900 40px ${FONT}`;
  const w = g.measureText(h).width + 60;
  roundRect(-w / 2, -38, w, 76, 12); g.fillStyle = C.cream; g.fill();
  text(h, 0, 2, 40, C.ink, { weight: 900 });
  g.restore();
}

function titleCard(t, t0, t1) {
  const a = clamp((t - t0) / .6) * (1 - clamp((t - (t1 - .6)) / .6));
  if (a <= 0) return;
  g.save(); g.globalAlpha = a;
  text('UPDATE', W / 2 + 330, 430, 150, C.cream, { weight: 900 });
  text('MY PRIORS', W / 2 + 330, 580, 150, C.sun, { weight: 900 });
  text('a song by PRIOR', W / 2 + 330, 690, 40, C.dim, { weight: 600 });
  g.restore();
}

function bootTerminal(t) {
  const msg = '> loading priors...';
  const n = Math.floor(clamp(t / 3) * msg.length);
  text(msg.slice(0, n) + ((t * 2) % 1 < .5 ? '_' : ''), 120, 120, 44, C.mint, { align: 'left', font: MONO, weight: 700 });
}

// ------------------------------------------------------------ animatic overlay
function overlay(t) {
  const s = sectionAt(t), b = bar(t);
  const shot = s.shots[Math.min(s.shots.length - 1, Math.floor((b - s.bar) / s.bars * s.shots.length))];
  g.save();
  g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, 0, W, 104);
  const mm = Math.floor(t / 60), ss = (t % 60).toFixed(1).padStart(4, '0');
  text(`ANIMATIC v0  |  ${shot}  |  ${s.name}  |  bar ${Math.min(S.bars, Math.floor(b) + 1)}/${S.bars}  |  ${mm}:${ss}`, 28, 32, 26, C.sun,
    { align: 'left', font: MONO, weight: 700 });
  text(S.shots[shot] || '', 28, 76, 22, C.cream, { align: 'left', font: MONO, weight: 400, alpha: .85 });
  // section timeline
  const y = H - 14;
  S.sections.forEach((sec, i) => {
    const x0 = sec.t0 / S.duration * W, x1 = sec.t1 / S.duration * W;
    g.fillStyle = i % 2 ? 'rgba(255,244,224,.25)' : 'rgba(255,244,224,.4)'; g.fillRect(x0, y - 6, x1 - x0 - 2, 12);
  });
  g.fillStyle = C.coral; g.fillRect(clamp(t / S.duration) * W - 3, y - 14, 6, 28);
  g.restore();
}

// ------------------------------------------------------------ frame
function renderAt(t) {
  g.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
  background(t);
  const p = needle(t), s = sectionAt(t);
  if (t < 3.2) bootTerminal(t);
  const appear = smooth(clamp((t - 2.5) / 1.5));
  if (appear > 0) {
    const cx = s.name === 'Intro' || s.name === 'Outro' ? 620 : 560;
    prior(t, cx, 470, .95 * appear, t < 4 ? .5 : p);
  }
  if (t > 4 && !['Intro', 'Outro'].includes(s.name)) beliefCurve(t, 1080, 690, 680, 220, p);
  headlines(t);
  titleCard(t, 8, 16);
  titleCard(t, S.duration - 7, DURATION);
  lyrics(t);
  if (!FINAL) overlay(t);
}

window.META = { duration: DURATION, fps: FPS };
window.renderAt = renderAt;
if (q.has('t')) renderAt(parseFloat(q.get('t')));
else if (!q.has('render')) {
  const audio = document.getElementById('a'); let start = performance.now();
  const loop = () => {
    const t = audio && !audio.paused ? audio.currentTime : ((performance.now() - start) / 1000) % DURATION;
    renderAt(t); requestAnimationFrame(loop);
  };
  addEventListener('keydown', e => { if (e.code === 'Space') { audio.paused ? audio.play() : audio.pause(); } });
  loop();
}
window.READY = true;
})();
