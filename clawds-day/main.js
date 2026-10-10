'use strict';
// CLAWD'S DAY - layout, clock overlay, transitions, entry point.

let SCENES = [], EV = [], CUES = [], DURATION = 0;
function layout() {
  let t = 0;
  for (const def of SC) {
    const S = { ...def, t0: t, t1: t + def.dur };
    S.ev = (lt, s, v = 1, x = {}) => EV.push({ t: S.t0 + lt, s, v, ...x });
    S.cue = (lt, c, x = {}) => { const g = S.t0 + lt; CUES.push({ t: g, c, bpm: BPM[c] || BPM[c.replace(/\d+$/, '')] || 0, ...x }); if (!(c in MS)) MS[c] = g; };
    def.build && def.build(S);
    SCENES.push(S); t += def.dur;
  }
  EV.sort((a, b) => a.t - b.t); CUES.sort((a, b) => a.t - b.t);
  return t;
}

// ---------------------------------------------------------------- clock badge
function clockText(h) {
  h = ((h % 24) + 24) % 24;
  const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
  const h12 = ((hh + 11) % 12) + 1;
  return `${h12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`;
}
function clockBadge(S, a) {
  if (!S.cap) return;
  const k = E.back(clamp((a - .35) / .5)), out = clamp((a - (S.dur - .6)) / .4);
  const x = lerp(-520, 40, k) - out * 560, y = 36;
  const h = lerp(S.h[0], S.h[1], a / S.dur);
  const night = h >= 19.5 || h < 6;
  pbox(x, y, 470, 120, '#fff7ec', '#2b130a', 8);
  ctx.fillStyle = '#2b130a'; ctx.fillRect(x + 8, y + 112, 454, 0);
  // sun / moon icon
  const ix = x + 52, iy = y + 60;
  if (night) {
    ctx.fillStyle = '#ffd86b'; ctx.beginPath(); ctx.arc(ix, iy, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff7ec'; ctx.beginPath(); ctx.arc(ix + 12, iy - 8, 22, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = '#ffb21a';
    for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4 + h; ctx.fillRect(ix + Math.cos(an) * 30 - 4, iy + Math.sin(an) * 30 - 4, 8, 8); }
    ctx.beginPath(); ctx.arc(ix, iy, 20, 0, Math.PI * 2); ctx.fill();
  }
  T(clockText(h), x + 102, y + 44, 38, '#2b130a', { a: 'left' });
  T(S.cap, x + 104, y + 90, 28, '#D97757', { a: 'left', f: 'SilkB' });
}

// ---------------------------------------------------------------- post + main
let POST;
function buildPost() {
  const c = mk(W, H), pg = c.getContext('2d');
  const v = pg.createRadialGradient(W / 2, H / 2, H * .5, W / 2, H / 2, H * 1.1);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.35)');
  pg.fillStyle = v; pg.fillRect(0, 0, W, H);
  return c;
}
function wipe(p) {
  // a field of tiny Clawd-orange squares closing / opening
  const C2 = 120;
  for (let y = 0; y < H; y += C2) for (let x = 0; x < W; x += C2) {
    const d = (x / W + y / H) / 2; const s = clamp(p * 2 - d) * C2 * 1.02;
    if (s > 0) { ctx.fillStyle = ((x + y) / C2) % 2 ? '#1a0c06' : '#2b130a'; ctx.fillRect(x + C2 / 2 - s / 2, y + C2 / 2 - s / 2, s, s); }
  }
}
function renderAt(t) {
  TG = t;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const S = SCENES.find(s => t >= s.t0 && t < s.t1) || SCENES[SCENES.length - 1];
  const a = Math.min(t - S.t0, S.dur - 1e-6);
  begin(S.px);
  ctx.save(); S.draw(a, S); ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  clockBadge(S, a);
  for (const s of SCENES) { if (s.t0 === 0) continue; const d = t - s.t0; if (Math.abs(d) < .35) wipe(1 - Math.abs(d) / .35); }
  ctx.drawImage(POST, 0, 0);
  const fi = 1 - clamp(t / .6); if (fi > 0) { ctx.fillStyle = `rgba(0,0,0,${fi})`; ctx.fillRect(0, 0, W, H); }
  const fo = clamp((t - (DURATION - 1.2)) / 1.2); if (fo > 0) { ctx.fillStyle = `rgba(0,0,0,${fo})`; ctx.fillRect(0, 0, W, H); }
}
async function init() {
  await Promise.all(['32px P2P', '32px Silk', '32px SilkB'].map(f => document.fonts.load(f)));
  POST = buildPost();
  DURATION = layout();
  window.META = { duration: DURATION, fps: FPS, events: EV, cues: CUES, clawds: CLAWDS, scenes: SCENES.map(s => ({ name: s.name, t0: s.t0, t1: s.t1 })) };
  window.renderAt = renderAt;
  const q = new URLSearchParams(location.search);
  if (q.has('t')) { renderAt(parseFloat(q.get('t'))); }
  else if (!q.has('render')) {
    const start = performance.now() - (parseFloat(q.get('from')) || 0) * 1000;
    const loop = () => { const t = ((performance.now() - start) / 1000) % DURATION; renderAt(t); requestAnimationFrame(loop); };
    loop();
  }
  window.READY = true;
}
init();
