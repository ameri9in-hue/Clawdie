'use strict';
// AI FIGHTER '26 - a deterministic, time-driven arcade animation.
// Every frame is a pure function of time t (seconds), so it can be rendered
// frame-by-frame offline (render.js) or previewed live in a browser.

const W = 1920, H = 1080, GROUND = 900, FPS = 30;
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ---------------------------------------------------------------- utils
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').imageSmoothingEnabled = false; return c; };
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const E = {
  lin: t => t,
  in: t => t * t,
  out: t => 1 - (1 - t) * (1 - t),
  io: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  out3: t => 1 - Math.pow(1 - t, 3),
  back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  elastic: t => t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI) / 3) + 1,
};
function rnd(a, b = 0) {
  let t = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + 0x9E3779B9) | 0;
  t = Math.imul(t ^ (t >>> 15), 2246822519); t = Math.imul(t ^ (t >>> 13), 3266489917); t ^= t >>> 16;
  return (t >>> 0) / 4294967296;
}
const COL = {
  cl: '#D97757', clD: '#A9502F', clL: '#F6B092',
  gp: '#10A37F', gpL: '#5DF2C6', gpD: '#0A6B54',
  gold: '#FFD23F', ink: '#0b0b12',
};
const NAME = { C: 'CLAUDE', G: 'CHATGPT' };

function T(s, x, y, size, fill, o = {}) {
  ctx.font = `${size}px ${o.f || 'P2P'}`;
  ctx.textAlign = o.a || 'center'; ctx.textBaseline = o.b || 'middle';
  ctx.letterSpacing = (o.ls || 0) + 'px';
  const ga = ctx.globalAlpha; ctx.globalAlpha = ga * (o.al ?? 1);
  if (o.sh) { ctx.fillStyle = o.shc || 'rgba(0,0,0,.55)'; ctx.fillText(s, x + o.sh, y + o.sh); }
  if (o.ow) {
    ctx.fillStyle = o.ol || '#000'; const w = o.ow;
    for (let dx = -w; dx <= w; dx += w) for (let dy = -w; dy <= w; dy += w) if (dx || dy) ctx.fillText(s, x + dx, y + dy);
  }
  ctx.fillStyle = fill; ctx.fillText(s, x, y);
  ctx.globalAlpha = ga; ctx.letterSpacing = '0px';
}
function gradV(y0, y1, stops) { const g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); return g; }
// Chunky "arcade logo" text: extruded, outlined, gradient filled.
function bigText(s, x, y, size, stops, o = {}) {
  ctx.font = `${size}px ${o.f || 'P2P'}`; ctx.textAlign = o.a || 'center'; ctx.textBaseline = 'middle';
  ctx.letterSpacing = (o.ls || 0) + 'px';
  const ex = o.ex ?? Math.round(size / 12), ow = o.ow ?? Math.round(size / 16);
  ctx.fillStyle = o.exc || '#1a0533';
  for (let i = ex; i > 0; i -= 2) for (let dx = -ow; dx <= ow; dx += ow) ctx.fillText(s, x + dx, y + i + ow);
  ctx.fillStyle = o.ol || '#1a0533';
  for (let dx = -ow; dx <= ow; dx += ow) for (let dy = -ow; dy <= ow; dy += ow) ctx.fillText(s, x + dx, y + dy);
  ctx.fillStyle = gradV(y - size / 2, y + size / 2, stops); ctx.fillText(s, x, y);
  if (o.shine) { // glint sweep
    ctx.save(); ctx.globalCompositeOperation = 'source-atop';
    ctx.restore();
  }
  ctx.letterSpacing = '0px';
}
function glow(x, y, r, color, a = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}
function hexPath(x, y, r, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = rot + i * Math.PI / 3 - Math.PI / 2; ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath();
}
function starPath(x, y, r1, r2, n, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n; const r = i % 2 ? r2 : r1; ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath();
}
// pixel-styled box (notched corners)
function pbox(x, y, w, h, fill, border = '#000', b = 6) {
  ctx.fillStyle = border;
  ctx.fillRect(x + b, y, w - 2 * b, h); ctx.fillRect(x, y + b, w, h - 2 * b);
  ctx.fillStyle = fill;
  ctx.fillRect(x + b, y + b, w - 2 * b, h - 2 * b);
  ctx.fillRect(x + 2 * b, y + b - b + b / 1, 0, 0);
}

// ---------------------------------------------------------------- sprites
// Characters are drawn as real pixel art into a 64x64 buffer, outlined, then
// blown up with nearest-neighbour scaling.
const SB = 64, AX = 32, AY = 58;
const sbuf = mk(SB, SB), sg = sbuf.getContext('2d');
const obuf = mk(SB, SB), og = obuf.getContext('2d');
function P(x, y, w, h, c) { sg.fillStyle = c; sg.fillRect(Math.round(x), Math.round(y), w, h); }
function LP(x0, y0, x1, y1, c, th = 2) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) P(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, th, th, c);
}
function blit(fn, p, x, y, s, face = 1, o = {}) {
  sg.clearRect(0, 0, SB, SB); fn(p);
  if (o.flash > 0) {
    sg.globalCompositeOperation = 'source-atop'; sg.fillStyle = `rgba(255,255,255,${o.flash})`;
    sg.fillRect(0, 0, SB, SB); sg.globalCompositeOperation = 'source-over';
  }
  if (o.tint) {
    sg.globalCompositeOperation = 'source-atop'; sg.fillStyle = o.tint;
    sg.fillRect(0, 0, SB, SB); sg.globalCompositeOperation = 'source-over';
  }
  og.clearRect(0, 0, SB, SB);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) og.drawImage(sbuf, dx, dy);
  og.globalCompositeOperation = 'source-in'; og.fillStyle = o.ol || '#0a0a12'; og.fillRect(0, 0, SB, SB);
  og.globalCompositeOperation = 'source-over'; og.drawImage(sbuf, 0, 0);
  ctx.save(); ctx.globalAlpha *= (o.alpha ?? 1);
  ctx.translate(Math.round(x), Math.round(y));
  if (o.rot) { const py = (o.py || 0) * s; ctx.translate(0, -py); ctx.rotate(o.rot * face); ctx.translate(0, py); }
  ctx.scale(face * s, s); ctx.drawImage(obuf, -AX, -AY); ctx.restore();
}

// Clawd - Claude's orange pixel critter.
function drawClawd(p) {
  const O = '#D97757', D = '#B5603F', L = '#F3A889', K = '#1b1210';
  const n = p.n, k = p.k || 0, t = p.t || 0;
  let bx = 25, by = 47, bw = 14, bh = 8, lean = 0, bob = 0, sq = 0, armF = 0, arms = 'side', eyes = 'norm', legs = 'stand', kick = 0;
  const swing = k < .3 ? k / .3 : Math.max(0, 1 - (k - .3) / .5);
  switch (n) {
    case 'idle': bob = Math.floor(t * 3.2) % 2; break;
    case 'walk': { const ph = Math.floor(t * 9) % 2; legs = ph ? 'wA' : 'wB'; bob = ph; break; }
    case 'dash': lean = 2; legs = 'back'; eyes = 'angry'; break;
    case 'punch': case 'throw': armF = Math.round(swing * 9); lean = Math.round(swing * 1.5); eyes = 'angry'; break;
    case 'rapid': armF = Math.round(2 + Math.abs(Math.sin(k * Math.PI * 8.5)) * 8); lean = 1; eyes = 'angry'; break;
    case 'kick': kick = Math.round(swing * 8); legs = 'kick'; lean = -1; eyes = 'angry'; break;
    case 'hit': lean = -2; eyes = 'hurt'; sq = k < .4 ? 1 : 0; break;
    case 'block': arms = 'block'; lean = -1; eyes = 'squint'; break;
    case 'special': arms = 'up'; eyes = 'glow'; bob = Math.floor(t * 14) % 2; break;
    case 'jump': legs = 'tuck'; break;
    case 'win': arms = 'up'; eyes = 'happy'; bob = Math.floor(t * 5) % 2; break;
    case 'taunt': arms = Math.floor(t * 6) % 2 ? 'up' : 'side'; eyes = 'happy'; bob = Math.floor(t * 6) % 2; break;
    case 'ko': eyes = 'x'; legs = 'flail'; break;
    case 'dizzy': eyes = 'x'; bob = Math.floor(t * 4) % 2; break;
    case 'glare': eyes = 'angry'; bob = Math.floor(t * 3.2) % 2; break;
  }
  const y0 = by + bob + sq, h0 = bh - sq, x0 = bx + lean;
  const lxs = [1, 3, bw - 4, bw - 2];
  for (let i = 0; i < 4; i++) {
    if (legs === 'kick' && i >= 2) continue;
    let lx = x0 + lxs[i]; const ly = y0 + h0; let lh = 58 - ly;
    if (legs === 'tuck') lh = 1;
    if (legs === 'wA' && i % 2 === 0) lh -= 1;
    if (legs === 'wB' && i % 2 === 1) lh -= 1;
    if (legs === 'back') lx -= 1;
    if (legs === 'flail') lh = 1 + ((Math.floor(t * 10) + i) % 2);
    if (lh > 0) P(lx, ly, 1, lh, O);
  }
  if (legs === 'kick') P(x0 + bw - 3, y0 + h0 - 1, 3 + kick, 2, O);
  if (arms === 'side' || arms === 'block') P(x0 - 2, y0 + 3, 2, 2, O);
  if (arms === 'up') { P(x0 - 2, y0 - 3, 2, 5, O); P(x0 + bw, y0 - 3, 2, 5, O); }
  P(x0, y0, bw, h0, O);
  P(x0, y0 + h0 - 1, bw, 1, D);
  P(x0 + 1, y0, 5, 1, L); P(x0, y0 + 1, 1, 2, L);
  if (arms === 'side') { P(x0 + bw, y0 + 3, 2 + armF, 2, O); if (armF > 3) P(x0 + bw + armF, y0 + 2, 2, 4, O); }
  if (arms === 'block') P(x0 + bw, y0 - 1, 2, 6, O);
  const ey = y0 + 2;
  const blink = ((t * 1000) % 3100) < 110;
  for (const [e, side] of [[x0 + 3, 0], [x0 + bw - 4, 1]]) {
    switch (eyes) {
      case 'norm': if (blink) P(e, ey + 1, 1, 1, K); else P(e, ey, 1, 2, K); break;
      case 'angry': P(e, ey + (side ? 0 : 0), 1, 2, K); P(side ? e - 1 : e + 1, ey - 1, 1, 1, K); break;
      case 'hurt': if (!side) { P(e - 1, ey - 1, 1, 1, K); P(e, ey, 1, 1, K); P(e - 1, ey + 1, 1, 1, K); } else { P(e + 1, ey - 1, 1, 1, K); P(e, ey, 1, 1, K); P(e + 1, ey + 1, 1, 1, K); } break;
      case 'x': P(e - 1, ey - 1, 1, 1, K); P(e + 1, ey - 1, 1, 1, K); P(e, ey, 1, 1, K); P(e - 1, ey + 1, 1, 1, K); P(e + 1, ey + 1, 1, 1, K); break;
      case 'happy': P(e - 1, ey + 1, 1, 1, K); P(e, ey, 1, 1, K); P(e + 1, ey + 1, 1, 1, K); break;
      case 'squint': P(e - 1, ey + 1, 3, 1, K); break;
      case 'glow': P(e, ey - 1, 1, 3, '#fff'); P(e - 1, ey, 3, 1, '#FFE6B0'); break;
    }
  }
}

// GPT - a chibi robot with a woven hexagonal head.
const headCache = {};
function gptHead(ang = 0) {
  const key = ((Math.round(ang / (Math.PI / 18)) % 12) + 12) % 12;
  if (headCache[key]) return headCache[key];
  const c = mk(23, 23), g = c.getContext('2d');
  const R = 10.5, r = R * 0.866, cx = 11.5, cy = 11.5, a0 = key * Math.PI / 18;
  const tri = off => [0, 1, 2].map(i => { const a = a0 + off + i * 2 * Math.PI / 3 - Math.PI / 2; return [cx + Math.cos(a) * 7.4, cy + Math.sin(a) * 7.4]; });
  const segs = [];
  for (const [ti, T3] of [[0, tri(0)], [1, tri(Math.PI / 3)]]) for (let i = 0; i < 3; i++) segs.push([T3[i], T3[(i + 1) % 3], ti]);
  const dseg = (px, py, [a, b]) => { const vx = b[0] - a[0], vy = b[1] - a[1]; const u = clamp(((px - a[0]) * vx + (py - a[1]) * vy) / (vx * vx + vy * vy)); const dx = a[0] + vx * u - px, dy = a[1] + vy * u - py; return Math.hypot(dx, dy); };
  for (let j = 0; j < 23; j++) for (let i = 0; i < 23; i++) {
    const dx = i + .5 - cx, dy = j + .5 - cy;
    const h = Math.max(Math.abs(dx), .5 * Math.abs(dx) + .866 * Math.abs(dy));
    if (h > r) continue;
    let col = '#202227';
    if (h > r - 1.3) col = '#f4f4f4';
    else if (h > r - 2.2) col = '#2f3238';
    else { for (const s of segs) if (dseg(i + .5, j + .5, s) < .62) { col = s[2] ? '#545966' : '#6f7584'; break; } }
    g.fillStyle = col; g.fillRect(i, j, 1, 1);
  }
  return headCache[key] = c;
}
function drawGPT(p) {
  const D = '#26282d', M = '#3d4047', Wt = '#f2f2f2', Tl = '#10A37F', TB = '#5DF2C6', K = '#08090b';
  const n = p.n, k = p.k || 0, t = p.t || 0, cx = 32;
  let lean = 0, bob = 0, armF = 0, arms = 'down', eyes = 'norm', legs = 'stand', kick = 0, ang = 0;
  const swing = k < .3 ? k / .3 : Math.max(0, 1 - (k - .3) / .5);
  switch (n) {
    case 'idle': bob = Math.floor(t * 3) % 2; break;
    case 'walk': { const ph = Math.floor(t * 9) % 2; legs = ph ? 'wA' : 'wB'; bob = ph; break; }
    case 'dash': lean = 2; legs = 'wA'; eyes = 'angry'; break;
    case 'punch': case 'throw': arms = 'punch'; armF = Math.round(swing * 10); lean = Math.round(swing * 1.5); eyes = 'angry'; break;
    case 'rapid': arms = 'punch'; armF = Math.round(2 + Math.abs(Math.sin(k * Math.PI * 8.5)) * 8); lean = 1; eyes = 'angry'; break;
    case 'kick': legs = 'kick'; kick = Math.round(swing * 9); lean = -1; eyes = 'angry'; break;
    case 'hit': lean = -2; eyes = 'hurt'; arms = 'flail'; break;
    case 'block': arms = 'block'; lean = -1; eyes = 'squint'; break;
    case 'special': arms = 'up'; eyes = 'glow'; ang = t * 5; bob = Math.floor(t * 14) % 2; break;
    case 'jump': legs = 'tuck'; arms = 'up'; break;
    case 'win': arms = 'up'; eyes = 'happy'; ang = t * 2; bob = Math.floor(t * 5) % 2; break;
    case 'taunt': arms = Math.floor(t * 6) % 2 ? 'up' : 'down'; eyes = 'happy'; bob = Math.floor(t * 6) % 2; break;
    case 'ko': eyes = 'x'; arms = 'flail'; break;
    case 'dizzy': eyes = 'x'; bob = Math.floor(t * 4) % 2; break;
    case 'glare': eyes = 'angry'; bob = Math.floor(t * 3) % 2; break;
  }
  const sx = cx - 6 + lean, sy = 44 + bob, fx = cx + 5 + lean, fy = 44 + bob;
  // legs
  for (const [lx0, front] of [[cx - 4, 0], [cx + 2, 1]]) {
    if (legs === 'kick' && front) continue;
    let lx = lx0, top = 53, lh = 3, shoeY = 56;
    if (legs === 'wA') { lx += front ? 1 : -1; if (front) { lh = 2; shoeY = 55; } }
    if (legs === 'wB') { lx += front ? -1 : 1; if (!front) { lh = 2; shoeY = 55; } }
    if (legs === 'tuck') { lh = 1; shoeY = 54; }
    P(lx, top, 2, lh, D); P(lx, shoeY, 3, 2, Wt);
  }
  if (legs === 'kick') { LP(cx + 2, 53, cx + 4 + kick, 52, D); P(cx + 4 + kick, 49, 2, 4, Wt); }
  // back arm
  const arm = (x0, y0, x1, y1, fs = 3) => { LP(x0, y0, x1, y1, D); P(x1 - (fs > 3 ? 1 : 0), y1, fs, fs, Wt); };
  if (arms === 'down') arm(sx, sy, sx - 2, sy + 6);
  if (arms === 'punch') arm(sx, sy, sx - 4, sy + 3);
  if (arms === 'block') arm(sx, sy, sx + 1, sy - 7);
  if (arms === 'up') arm(sx, sy, sx - 5, sy - 9);
  if (arms === 'flail') arm(sx, sy, sx - 6, sy - 5);
  // torso
  P(cx - 5 + lean, 43 + bob, 10, 10, D); P(cx - 5 + lean, 43 + bob, 1, 10, M); P(cx - 5 + lean, 52 + bob, 10, 1, '#1a1b1f');
  const pulse = (Math.floor(t * 4) % 2) || n === 'special';
  P(cx - 1 + lean, 46 + bob, 3, 3, pulse ? TB : Tl);
  // head
  sg.drawImage(gptHead(ang), cx - 11 + lean, 22 + bob);
  // front arm
  if (arms === 'down') arm(fx, fy, fx + 1, fy + 6);
  if (arms === 'punch') arm(fx, fy, fx + 2 + armF, fy, armF > 4 ? 4 : 3);
  if (arms === 'block') arm(fx, fy, fx + 3, fy - 8, 4);
  if (arms === 'up') arm(fx, fy, fx + 5, fy - 9);
  if (arms === 'flail') arm(fx, fy, fx + 4, fy - 6);
  // eyes
  const ex = cx - 3 + lean + 1, ey = 31 + bob;
  const blink = ((t * 1000) % 2700) < 110;
  for (const [e, side] of [[ex - 2, 0], [ex + 3, 1]]) {
    switch (eyes) {
      case 'norm': if (blink) P(e, ey + 2, 2, 1, TB); else { P(e, ey, 2, 3, TB); P(e, ey, 1, 1, '#fff'); } break;
      case 'angry': P(e, ey + 1, 2, 2, TB); P(side ? e - 1 : e + 1, ey, 2, 1, Wt); break;
      case 'hurt': if (!side) { P(e, ey, 1, 1, TB); P(e + 1, ey + 1, 1, 1, TB); P(e, ey + 2, 1, 1, TB); } else { P(e + 1, ey, 1, 1, TB); P(e, ey + 1, 1, 1, TB); P(e + 1, ey + 2, 1, 1, TB); } break;
      case 'x': P(e - 1, ey, 1, 1, TB); P(e + 1, ey, 1, 1, TB); P(e, ey + 1, 1, 1, TB); P(e - 1, ey + 2, 1, 1, TB); P(e + 1, ey + 2, 1, 1, TB); break;
      case 'happy': P(e - 1, ey + 2, 1, 1, TB); P(e, ey + 1, 2, 1, TB); P(e + 2, ey + 2, 1, 1, TB); break;
      case 'squint': P(e - 1, ey + 2, 3, 1, TB); break;
      case 'glow': P(e, ey, 2, 3, '#fff'); P(e - 1, ey + 1, 4, 1, '#c9fff0'); break;
    }
  }
  if (eyes === 'hurt' || eyes === 'x') P(cx + lean, 36 + bob, 2, 2, K);
  if (eyes === 'happy') P(cx - 1 + lean, 36 + bob, 4, 1, TB);
}
const SPR = {
  C: { fn: drawClawd, s: 14, ol: '#1a0c06', hitH: 100, headH: 175, hand: [135, 105] },
  G: { fn: drawGPT, s: 10, ol: '#e2fff4', hitH: 150, headH: 355, hand: [145, 142] },
};

// ---------------------------------------------------------------- rounds
class Round {
  constructor(o) {
    Object.assign(this, o);
    this.card = 3.0;
    const f = (id, x) => ({ id, keys: [{ t: -99, x, e: 'lin' }], lx: x, moves: [], jumps: [] });
    this.C = f('C', 560); this.G = f('G', 1360);
    for (const k of ['hits', 'projs', 'fx', 'bubbles', 'stops', 'banners', 'pops', 'beams', 'swarms', 'shields', 'zooms', 'ev', 'shakes', 'meter', 'flashes'])
      this[k] = [];
  }
  other(f) { return f === this.C ? this.G : this.C; }
  sfx(t, s, v = 1, extra) { this.ev.push({ t, s, v, ...extra }); }
  xAt(f, t) {
    const k = f.keys; let i = 0;
    while (i + 1 < k.length && k[i + 1].t <= t) i++;
    const a = k[i], b = k[i + 1];
    if (!b) return a.x;
    const u = (t - a.t) / (b.t - a.t);
    return lerp(a.x, b.x, E[b.e](clamp(u)));
  }
  yAt(f, t) { let y = 0; for (const j of f.jumps) if (t >= j.t && t <= j.t + j.d) { const u = (t - j.t) / j.d; y += j.h * 4 * u * (1 - u); } return y; }
  move(f, t, d, x, e = 'io') {
    const from = this.xAt(f, t);
    f.keys.push({ t, x: from, e: 'lin' }, { t: t + d, x, e });
    f.keys.sort((a, b) => a.t - b.t); f.lx = x;
    if (d <= .32 && Math.abs(x - from) > 120) { this.fxAdd(t, 'dust', from, GROUND, { dir: Math.sign(x - from) }); this.sfx(t, 'dash', .7); }
  }
  act(f, t, d, n, o = {}) {
    f.moves.push({ t, d, n, ...o });
    if (['punch', 'kick', 'throw'].includes(n)) this.sfx(t, 'swing', .6);
  }
  jump(f, t, d, h, quiet) {
    f.jumps.push({ t, d, h });
    if (!quiet) { this.sfx(t, 'jump', .6); this.sfx(t + d, 'land', .6); this.fxAdd(t + d, 'dust', this.xAt(f, t + d), GROUND, { dir: 0 }); }
  }
  hitPos(f, t) { return [this.xAt(f, t), GROUND - this.yAt(f, t) - SPR[f.id].hitH]; }
  hit(to, t, dmg, o = {}) {
    const by = this.other(to), dir = to === this.G ? 1 : -1;
    const [hx, hy] = this.hitPos(to, t);
    this.hits.push({ t, to: to.id, by: by.id, dmg, big: !!o.big, block: !!o.block, x: hx, y: hy, nodmg: o.nodmg });
    if (!o.noReact) this.act(to, t, o.block ? .26 : .32, o.block ? 'block' : 'hit');
    if (o.knock) this.move(to, t, o.big ? .32 : .2, this.xAt(to, t) + dir * o.knock, 'out');
    const fxx = hx - dir * (to === this.G ? 50 : 60);
    this.fxAdd(t, o.block ? 'block' : o.big ? 'bigspark' : 'spark', fxx, hy + (rnd(this.hits.length, 7) - .5) * 40, { c: by.id });
    this.sfx(t, o.block ? 'block' : o.big ? 'bighit' : 'hit', 1);
    this.shakes.push({ t, a: o.block ? 4 : o.big ? 18 : 8, d: o.big ? .35 : .2 });
    if (o.big && !o.nostop) this.stop(t, .12, { hs: 1 });
    this.meter.push({ t, f: by.id, add: o.block ? 2 : 7 }, { t, f: to.id, add: 4 });
  }
  fxAdd(t, kind, x, y, o = {}) { this.fx.push({ t, kind, x, y, seed: this.fx.length * 13 + 7, ...o }); }
  stop(t, d, o = {}) { this.stops.push({ t, d, ...o }); this.stops.sort((a, b) => a.t - b.t); }
  cut(f, t, d, name, sub) {
    this.stop(t, d, { cut: f.id, name, sub });
    this.sfx(t, 'cutin', 1);
    this.meter.push({ t: t - .9, f: f.id, set: 100 }, { t: t + .01, f: f.id, set: 0 });
  }
  dualcut(t, d, nC, nG) {
    this.stop(t, d, { cut: 'both', nC, nG });
    this.sfx(t, 'cutin', 1); this.sfx(t + .5, 'cutin', .8);
    for (const id of ['C', 'G']) this.meter.push({ t: t - .9, f: id, set: 100 }, { t: t + .01, f: id, set: 0 });
  }
  pt(src, t) {
    if (Array.isArray(src)) return src;
    const s = SPR[src.id], face = this.faceAt(src, t);
    return [this.xAt(src, t) + face * s.hand[0], GROUND - this.yAt(src, t) - s.hand[1]];
  }
  faceAt(f, t) { const o = this.other(f); return this.xAt(f, t) <= this.xAt(o, t) ? 1 : -1; }
  proj(t0, t1, kind, from, to, o = {}) {
    const [x0, y0] = this.pt(from, t0);
    const [x1, y1] = Array.isArray(to) ? to : this.hitPos(to, t1);
    this.projs.push({ t0, t1, kind, x0, y0, x1, y1, ...o });
    if (!o.quiet) this.sfx(t0, kind === 'ad' ? 'toss' : 'pew', .8);
  }
  bubble(f, t, d, text) {
    this.bubbles.push({ t, d, who: f.id, text, x: this.xAt(f, t) });
    for (let i = 0; i < text.length; i += 2) if (text[i] !== ' ') this.sfx(t + .12 + i / 30, f.id === 'C' ? 'blipC' : 'blipG', .35);
  }
  banner(t, d, kind, o = {}) { this.banners.push({ t, d, kind, ...o }); }
  pop(t, text, x, y, c = COL.gold) { this.pops.push({ t, text, x, y, c }); }
  zoom(t, d, z, x) { this.zooms.push({ t, d, z, x }); }
  ko(to, t, dist) {
    const dir = to === this.G ? 1 : -1;
    this.act(to, t, 99, 'ko');
    this.jump(to, t, .7, 190, true);
    this.move(to, t, .75, this.xAt(to, t) + dir * dist, 'out');
    this.jump(to, t + .7, .3, 34, true);
    this.fxAdd(t + .7, 'dust', this.xAt(to, t + .7), GROUND, { dir: 0, big: 1 });
    this.fxAdd(t + 1.0, 'dust', this.xAt(to, t + 1.0), GROUND, { dir: 0 });
    this.sfx(t + .7, 'thud', 1); this.sfx(t + 1.0, 'land', .6);
  }
  finalize(fightEnd) {
    this.fightEnd = fightEnd;
    for (const f of [this.C, this.G]) { f.keys.sort((a, b) => a.t - b.t); f.moves.sort((a, b) => a.t - b.t); }
    this.meter.sort((a, b) => a.t - b.t);
    this.dur = this.card + this.toReal(fightEnd);
  }
  toGame(rt) {
    let acc = 0;
    for (const s of this.stops) { const rs = s.t + acc; if (rt < rs) break; if (rt < rs + s.d) return s.t; acc += s.d; }
    return rt - acc;
  }
  toReal(gt) { let acc = 0; for (const s of this.stops) { if (s.t < gt) acc += s.d; else break; } return gt + acc; }
  stopAt(rt) {
    let acc = 0;
    for (const s of this.stops) { const rs = s.t + acc; if (rt < rs) return null; if (rt < rs + s.d) return { s, q: (rt - rs) / s.d, a: rt - rs }; acc += s.d; }
    return null;
  }
  state(f, gt, at) {
    const x = this.xAt(f, gt), jy = this.yAt(f, gt);
    let mv = null;
    for (const m of f.moves) if (gt >= m.t && gt < m.t + m.d) mv = m;
    let n = 'idle', k = 0, a = 0;
    if (mv) { n = mv.n; k = (gt - mv.t) / mv.d; a = gt - mv.t; }
    else {
      const v = (this.xAt(f, gt + .03) - this.xAt(f, gt - .03)) / .06;
      if (Math.abs(v) > 900) n = 'dash'; else if (Math.abs(v) > 40) n = 'walk';
      if (jy > 3) n = 'jump';
    }
    let face = this.faceAt(f, gt);
    if (mv && mv.face) face = mv.face;
    let flash = 0;
    for (const h of this.hits) if (h.to === f.id && !h.block && gt >= h.t && gt - h.t < .1) flash = Math.max(flash, 1 - (gt - h.t) / .1);
    return { x, y: GROUND - jy, jy, n, k, a, face, flash, mv };
  }
  hp(id, gt) {
    let v = 100, ghost = 0;
    for (const h of this.hits) if (h.to === id && gt >= h.t && !h.nodmg) {
      v -= h.dmg; const age = gt - h.t;
      if (age < .55) ghost += h.dmg; else if (age < 1.0) ghost += h.dmg * (1 - (age - .55) / .45);
    }
    return { v: Math.max(0, v), ghost: Math.max(0, Math.min(100, Math.max(0, v) + ghost)) };
  }
  meterAt(id, gt) {
    let m = 15, last = 0;
    for (const e of this.meter) {
      if (e.f !== id) continue; if (e.t > gt) break;
      m = clamp(m + (e.t - last) * 1.2, 0, 100); last = e.t;
      if (e.set !== undefined) m = e.set; else m = clamp(m + e.add, 0, 100);
    }
    return clamp(m + (gt - last) * 1.2, 0, 100);
  }
}

// ---------------------------------------------------------------- choreography
function buildR1() {
  const R = new Round({ n: 1, title: 'ROUND 1', sub: 'THE BIG GAME AD WAR', date: 'FEBRUARY 2026', stage: 'stadium', wins: { C: 0, G: 0 } });
  const { C, G } = R;
  R.act(G, .2, 1.6, 'taunt'); R.bubble(G, .2, 1.9, 'INTRODUCING... ADS IN YOUR CHATS!');
  R.move(C, 1.3, .8, 760); R.move(G, 1.5, .6, 1180);
  R.act(G, 2.0, .3, 'throw'); R.proj(2.08, 2.5, 'ad', G, C, { label: 'SPONSORED' });
  R.act(C, 2.25, .5, 'block'); R.hit(C, 2.5, 2, { block: true, knock: 20 });
  R.move(C, 2.85, .22, 1000, 'out');
  R.act(C, 3.1, .25, 'punch'); R.hit(G, 3.18, 8, { knock: 20 });
  R.act(C, 3.4, .25, 'punch'); R.hit(G, 3.48, 7, { knock: 20 });
  R.act(C, 3.7, .35, 'kick'); R.hit(G, 3.8, 10, { knock: 160, big: true });
  // pop-up barrage
  R.act(G, 4.45, .3, 'throw'); R.proj(4.55, 5.15, 'ad', G, [560, GROUND - 110], { label: 'BUY NOW!' });
  R.jump(C, 4.72, .6, 240);
  R.act(G, 4.8, .3, 'throw'); R.proj(4.88, 5.48, 'ad', G, [560, GROUND - 110], { label: '50% OFF' });
  R.act(G, 5.1, .3, 'throw'); R.proj(5.2, 5.55, 'ad', G, C, { label: 'CLICK ME' }); R.hit(C, 5.55, 9, { knock: 60 });
  R.act(G, 5.45, .3, 'throw'); R.proj(5.52, 5.88, 'ad', G, C, { label: 'SUBSCRIBE' }); R.hit(C, 5.88, 8, { knock: 120, big: true });
  R.bubble(C, 6.35, 1.4, 'ADS IN A CONVERSATION? NOPE.');
  R.cut(C, 7.85, 1.35, 'AD-FREE SHIELD', 'SUPER MOVE');
  R.act(C, 7.86, 2.3, 'special'); R.shields.push({ t0: 7.9, t1: 10.1, who: 'C' }); R.sfx(7.9, 'shield', 1);
  const labels = ['LIMITED OFFER', 'SPONSORED', 'BUY NOW!'];
  for (let i = 0; i < 3; i++) {
    const t0 = 8.15 + i * .25, ta = t0 + .35, tb = ta + .35;
    R.act(G, t0 - .08, .28, 'throw');
    R.proj(t0, ta, 'ad', G, [R.xAt(C, ta) + 150, GROUND - 120], { label: labels[i] });
    R.fxAdd(ta, 'reflect', R.xAt(C, ta) + 150, GROUND - 120); R.sfx(ta, 'reflect', .9);
    R.proj(ta, tb, 'ad', [R.xAt(C, ta) + 150, GROUND - 120], G, { label: 'AD BLOCKED', reflected: true, quiet: true });
    R.hit(G, tb, i < 2 ? 10 : 12, { knock: i < 2 ? 30 : 170, big: i === 2 });
  }
  R.pop(8.62, 'REFLECT!', 1020, GROUND - 330, COL.gold);
  R.move(G, 10.35, .28, 1000, 'out'); R.act(G, 10.35, .28, 'dash');
  R.act(G, 10.62, .3, 'punch'); R.hit(C, 10.72, 10, { knock: 140 }); R.jump(C, 10.72, .4, 70, true);
  R.move(C, 11.4, .22, 880, 'out');
  R.act(C, 11.65, 1.15, 'rapid');
  for (let i = 0; i < 8; i++) R.hit(G, 11.75 + i * .13, 3, { knock: 8 });
  R.pop(12.3, 'TOKEN BARRAGE!', 960, GROUND - 380, COL.clL);
  R.act(C, 13.05, .45, 'kick'); R.hit(G, 13.15, 19, { big: true, noReact: true, nostop: true });
  R.ko(G, 13.15, 430); R.stop(13.15, .7, { ko: 1 }); R.zoom(13.15, 1.6, 1.12, 1100);
  R.banner(13.15, 2.2, 'ko'); R.sfx(13.15, 'ko', 1); R.sfx(13.15, 'musicstop', 1);
  R.act(C, 14.5, 9, 'win'); R.jump(C, 14.5, .45, 90, true); R.jump(C, 15.0, .45, 90, true);
  R.banner(14.9, 2.8, 'win', { who: 'C', quote: 'MY CHATS STAY AD-FREE.' }); R.sfx(14.9, 'jingle', 1);
  R.finalize(17.7);
  return R;
}

function buildR2() {
  const R = new Round({ n: 2, title: 'ROUND 2', sub: 'LAUNCH DAY', date: 'FEB 5: TWO LAUNCHES, 20 MINUTES APART', stage: 'lab', wins: { C: 1, G: 0 } });
  const { C, G } = R;
  R.act(C, .3, 1.3, 'taunt'); R.bubble(C, .3, 1.5, 'OPUS 4.6 IS LIVE!');
  R.banner(1.85, 1.3, 'caption', { text: '20 MINUTES LATER...' }); R.sfx(1.85, 'caption', .9);
  R.act(G, 3.1, 1.3, 'taunt'); R.bubble(G, 3.1, 1.5, 'GPT-5.3 CODEX! ALSO LIVE!');
  R.move(C, 4.75, .28, 860, 'out'); R.move(G, 4.75, .28, 1060, 'out');
  R.act(C, 5.05, .25, 'punch'); R.act(G, 5.05, .25, 'punch');
  R.fxAdd(5.13, 'clash', 960, GROUND - 110); R.sfx(5.13, 'clash', 1); R.pop(5.13, 'CLASH!', 960, GROUND - 330, '#fff');
  R.shakes.push({ t: 5.13, a: 14, d: .3 }); R.stop(5.13, .14, { hs: 1 });
  R.move(C, 5.15, .25, 760, 'out'); R.move(G, 5.15, .25, 1160, 'out');
  R.move(G, 5.7, .22, 920, 'out');
  R.act(G, 5.95, .3, 'kick'); R.hit(C, 6.05, 9, { knock: 40 });
  R.act(G, 6.3, .25, 'punch'); R.hit(C, 6.38, 8, { knock: 40 });
  R.act(C, 6.62, .45, 'block'); R.act(G, 6.66, .25, 'punch'); R.hit(C, 6.74, 1, { block: true, knock: 10 });
  R.jump(C, 7.1, .55, 210); R.move(C, 7.1, .55, 800, 'io'); R.act(C, 7.32, .32, 'kick'); R.hit(G, 7.45, 10, { knock: 60 });
  R.act(C, 7.75, .25, 'punch'); R.hit(G, 7.84, 8, { knock: 230, big: true });
  // benchmark clash
  R.act(C, 8.5, 2.75, 'special'); R.act(G, 8.55, 2.7, 'special');
  R.pop(8.7, 'BENCHMARK CLASH!', 960, GROUND - 420, COL.gold);
  R.beams.push({ t0: 8.7, t1: 10.85, mid: 1000, amp: 70, freq: 2.1 });
  R.sfx(8.7, 'beam', 1, { d: 2.15 });
  R.fxAdd(10.85, 'explode', 1000, GROUND - 120); R.sfx(10.85, 'explode', 1); R.shakes.push({ t: 10.85, a: 26, d: .6 });
  R.flashes.push({ t: 10.85, d: .25 });
  R.hit(C, 10.9, 12, { knock: 190, big: true, nostop: true }); R.hit(G, 10.9, 12, { knock: 190, big: true, nostop: true });
  R.bubble(G, 11.7, 1.6, '900 MILLION WEEKLY USERS. TRY ME.');
  R.cut(G, 13.45, 1.35, '900M USER RUSH', 'SUPER MOVE');
  R.act(G, 13.46, 2.3, 'special');
  R.swarms.push({ t0: 13.6, t1: 15.9, x0: 1500, seed: 3 }); R.sfx(13.6, 'swarm', 1, { d: 2.2 });
  for (let i = 0; i < 10; i++) R.hit(C, 14.0 + i * .14, 4, { knock: 6, nostop: true });
  R.pop(14.3, '10 HITS!!', 700, GROUND - 330, COL.gpL);
  R.move(G, 16.05, .26, 760, 'out'); R.act(G, 16.05, .26, 'dash');
  R.act(G, 16.33, .32, 'punch'); R.hit(C, 16.43, 30, { big: true, noReact: true, nostop: true });
  R.ko(C, 16.43, 380); R.stop(16.43, .7, { ko: 1 }); R.zoom(16.43, 1.6, 1.12, 560);
  R.banner(16.43, 2.2, 'ko'); R.sfx(16.43, 'ko', 1); R.sfx(16.43, 'musicstop', 1);
  R.act(G, 17.8, 9, 'win'); R.jump(G, 17.8, .45, 90, true); R.jump(G, 18.3, .45, 90, true);
  R.banner(18.2, 2.8, 'win', { who: 'G', quote: 'SHIPPED. AND SHIPPED AGAIN.' }); R.sfx(18.2, 'jingle', 1);
  R.finalize(21.0);
  return R;
}

function buildR3() {
  const R = new Round({ n: 3, title: 'FINAL ROUND', sub: 'THE IPO RACE', date: 'JUNE 2026', stage: 'street', wins: { C: 1, G: 1 } });
  const { C, G } = R;
  R.bubble(C, .3, 1.3, 'WE FILED FOR OUR IPO.');
  R.bubble(G, 1.65, 1.3, 'SO DID WE. SAME WEEK.');
  R.move(C, 3.05, .26, 860, 'out'); R.move(G, 3.05, .26, 1060, 'out');
  R.act(C, 3.32, .25, 'punch'); R.act(G, 3.32, .25, 'punch');
  R.fxAdd(3.4, 'clash', 960, GROUND - 110); R.sfx(3.4, 'clash', 1); R.shakes.push({ t: 3.4, a: 14, d: .3 }); R.stop(3.4, .12, { hs: 1 });
  R.move(C, 3.42, .22, 800, 'out'); R.move(G, 3.42, .22, 1120, 'out');
  R.move(G, 3.7, .16, 1000, 'out');
  R.act(G, 3.88, .25, 'punch'); R.hit(C, 3.96, 7, { knock: 30 });
  R.act(C, 4.15, .25, 'punch'); R.hit(G, 4.23, 7, { knock: 30 });
  R.act(G, 4.42, .3, 'kick'); R.hit(C, 4.52, 8, { knock: 40 });
  R.act(C, 4.72, .32, 'kick'); R.hit(G, 4.82, 9, { knock: 120, big: true });
  R.jump(G, 5.3, .62, 270); R.move(G, 5.3, .62, 830, 'io'); R.act(G, 5.58, .4, 'kick'); R.hit(C, 5.88, 10, { knock: 190, big: true });
  R.jump(G, 6.05, .4, 90, true); R.move(G, 6.05, .4, 1100, 'out');
  for (let i = 0; i < 3; i++) {
    const t0 = 6.5 + i * .2; R.act(C, t0 - .05, .2, 'throw');
    R.proj(t0, t0 + .36, 'token', C, G); R.hit(G, t0 + .36, 6, { knock: 25 });
  }
  R.act(G, 7.55, .3, 'throw'); R.proj(7.6, 7.95, 'orb', G, C);
  R.act(C, 7.75, .4, 'block'); R.hit(C, 7.95, 2, { block: true, knock: 15 });
  R.act(G, 7.95, .3, 'throw'); R.proj(8.0, 8.32, 'orb', G, C); R.hit(C, 8.32, 8, { knock: 40 });
  R.move(C, 8.7, .55, 820); R.move(G, 8.7, .55, 1020);
  R.act(C, 9.32, .3, 'punch'); R.act(G, 9.32, .3, 'punch');
  R.hit(G, 9.42, 10, { big: true, nostop: true, knock: 80 }); R.hit(C, 9.42, 10, { big: true, nostop: true, knock: 80 });
  R.stop(9.42, .55, { hs: 1 }); R.pop(9.42, 'CROSS COUNTER!', 960, GROUND - 380, COL.gold);
  R.move(G, 9.95, .15, 980, 'out');
  const fl = [['C', 10.12, 'punch'], ['G', 10.37, 'punch'], ['C', 10.62, 'kick'], ['G', 10.87, 'kick'], ['C', 11.12, 'punch'], ['G', 11.37, 'punch']];
  for (const [w, t, a] of fl) { const f = R[w]; R.act(f, t, .25, a); R.hit(R.other(f), t + .08, 5, { knock: t > 11.3 ? 0 : 8 }); }
  R.move(C, 11.47, .3, 640, 'out'); R.jump(G, 11.5, .35, 80, true); R.move(G, 11.5, .35, 1280, 'out');
  R.jump(C, 12.95, .3, 70, true); R.move(C, 12.95, .3, 470, 'out'); R.jump(G, 12.95, .3, 70, true); R.move(G, 12.95, .3, 1450, 'out');
  R.act(C, 12.0, 1.0, 'glare'); R.act(G, 12.0, 1.0, 'glare');
  R.bubble(C, 12.0, 1.1, 'ALL IN.'); R.bubble(G, 12.0, 1.1, 'ALL IN.');
  R.dualcut(13.2, 1.75, 'ENTERPRISE ENGINE', 'HYPE TRAIN');
  R.act(C, 13.21, 2.3, 'special'); R.act(G, 13.21, 2.3, 'special');
  R.beams.push({ t0: 13.35, t1: 15.3, mid: 960, amp: 45, freq: 3.2, mega: true });
  R.sfx(13.35, 'beam', 1, { d: 1.95 });
  R.fxAdd(15.3, 'explode', 960, GROUND - 120, { mega: 1 }); R.sfx(15.3, 'explode', 1); R.sfx(15.3, 'bighit', 1);
  R.shakes.push({ t: 15.3, a: 34, d: .9 }); R.flashes.push({ t: 15.3, d: .9, white: 1 });
  R.hit(C, 15.32, 40, { big: true, noReact: true, nostop: true }); R.hit(G, 15.32, 41, { big: true, noReact: true, nostop: true });
  R.ko(C, 15.32, 330); R.ko(G, 15.32, 330); R.stop(15.32, .8, { ko: 1 }); R.zoom(15.32, 2.0, 1.1, 960);
  R.banner(15.32, 3.4, 'dko'); R.sfx(15.32, 'ko', 1); R.sfx(15.32, 'musicstop', 1);
  R.finalize(18.6);
  return R;
}

// ---------------------------------------------------------------- stages
const STAGE = {};
function buildStadium() {
  const c = mk(2240, 1080), g = c.getContext('2d');
  let gr = g.createLinearGradient(0, 0, 0, 700); gr.addColorStop(0, '#04071a'); gr.addColorStop(.6, '#160f3d'); gr.addColorStop(1, '#3a1b5e');
  g.fillStyle = gr; g.fillRect(0, 0, 2240, 1080);
  for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,255,255,${.3 + rnd(i, 1) * .7})`; const s = rnd(i, 4) < .15 ? 4 : 2; g.fillRect(rnd(i, 2) * 2240 | 0, rnd(i, 3) * 330 | 0, s, s); }
  // stands structure
  g.fillStyle = '#0b0c22'; g.beginPath(); g.moveTo(0, 360); g.quadraticCurveTo(1120, 250, 2240, 360); g.lineTo(2240, 760); g.lineTo(0, 760); g.fill();
  g.fillStyle = '#1b1e44'; g.beginPath(); g.moveTo(0, 352); g.quadraticCurveTo(1120, 242, 2240, 352); g.lineTo(2240, 362); g.quadraticCurveTo(1120, 252, 0, 362); g.fill();
  // light towers
  for (const x of [170, 640, 1600, 2070]) {
    g.fillStyle = '#12142e'; g.fillRect(x - 8, 120, 16, 260);
    g.fillStyle = '#23264d'; g.fillRect(x - 90, 70, 180, 70);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) { g.fillStyle = '#fffbe0'; g.fillRect(x - 80 + i * 28, 80 + j * 28, 22, 20); }
  }
  // wall
  g.fillStyle = '#0e1030'; g.fillRect(0, 720, 2240, 70);
  return c;
}
function buildLab() {
  const c = mk(2240, 1080), g = c.getContext('2d');
  let gr = g.createLinearGradient(0, 0, 0, 900); gr.addColorStop(0, '#050811'); gr.addColorStop(1, '#0f1a36');
  g.fillStyle = gr; g.fillRect(0, 0, 2240, 1080);
  // ceiling beams
  g.fillStyle = '#0a0f1f'; for (let x = 0; x < 2240; x += 280) g.fillRect(x, 0, 30, 380);
  g.fillStyle = '#121a33'; g.fillRect(0, 0, 2240, 40);
  // racks
  for (let i = 0; i < 16; i++) {
    const x = i * 150 + 10; g.fillStyle = '#10172b'; g.fillRect(x, 470, 130, 350);
    g.fillStyle = '#1d2744'; g.fillRect(x, 470, 130, 6); g.fillRect(x, 470, 6, 350); g.fillRect(x + 124, 470, 6, 350);
    for (let j = 0; j < 10; j++) { g.fillStyle = '#18223d'; g.fillRect(x + 12, 488 + j * 33, 106, 26); g.fillStyle = '#0c1222'; g.fillRect(x + 50, 496 + j * 33, 60, 3); g.fillRect(x + 50, 503 + j * 33, 60, 3); }
  }
  return c;
}
function buildStreet() {
  const c = mk(2240, 1080), g = c.getContext('2d');
  let gr = g.createLinearGradient(0, 0, 0, 760); gr.addColorStop(0, '#080420'); gr.addColorStop(.55, '#2a0f4a'); gr.addColorStop(.85, '#8a2a5a'); gr.addColorStop(1, '#ff7a45');
  g.fillStyle = gr; g.fillRect(0, 0, 2240, 1080);
  for (let i = 0; i < 140; i++) { g.fillStyle = `rgba(255,240,255,${.25 + rnd(i, 9) * .6})`; g.fillRect(rnd(i, 5) * 2240 | 0, rnd(i, 6) * 360 | 0, 2, 2); }
  // moon
  g.fillStyle = '#fff3d6'; g.beginPath(); g.arc(2010, 300, 54, 0, 7); g.fill(); g.fillStyle = '#ead9b6'; g.fillRect(1990, 280, 12, 12); g.fillRect(2025, 315, 10, 10);
  // far skyline
  for (let layer = 0; layer < 2; layer++) {
    let x = -20; let i = 0;
    while (x < 2240) {
      const w = 70 + rnd(i, 30 + layer) * 120, h = (layer ? 160 : 260) + rnd(i, 40 + layer) * (layer ? 240 : 300);
      const top = 780 - h;
      g.fillStyle = layer ? '#160a2c' : '#24123f'; g.fillRect(x, top, w, h);
      if (rnd(i, 70) < .3 && !layer) { g.fillRect(x + w / 2 - 3, top - 60, 6, 60); g.fillStyle = '#ff3d6e'; g.fillRect(x + w / 2 - 4, top - 66, 8, 8); }
      for (let wy = top + 14; wy < 770; wy += 22) for (let wx = x + 10; wx < x + w - 14; wx += 18)
        if (rnd(wx * 7 + layer, wy) < (layer ? .35 : .2)) { g.fillStyle = rnd(wx, wy * 3) < .5 ? '#ffd27a' : '#ffb35c'; g.globalAlpha = layer ? .9 : .45; g.fillRect(wx, wy, 8, 10); g.globalAlpha = 1; }
      x += w + 6; i++;
    }
  }
  // exchange facade
  const fx = 720, fw = 800;
  g.fillStyle = '#c9bfd6'; g.beginPath(); g.moveTo(fx - 30, 410); g.lineTo(fx + fw / 2, 300); g.lineTo(fx + fw + 30, 410); g.fill();
  g.fillStyle = '#9d92b3'; g.beginPath(); g.moveTo(fx + 30, 398); g.lineTo(fx + fw / 2, 325); g.lineTo(fx + fw - 30, 398); g.fill();
  g.fillStyle = '#b8adc9'; g.fillRect(fx - 40, 410, fw + 80, 36);
  g.fillStyle = '#6d6386'; g.fillRect(fx, 446, fw, 330);
  for (let i = 0; i < 7; i++) {
    const cx = fx + 40 + i * ((fw - 80) / 6);
    g.fillStyle = '#d8cfe4'; g.fillRect(cx - 24, 446, 48, 330); g.fillStyle = '#a99ec0'; g.fillRect(cx + 10, 446, 14, 330);
    g.fillStyle = '#e8e0f2'; g.fillRect(cx - 32, 446, 64, 14); g.fillRect(cx - 32, 762, 64, 14);
  }
  g.fillStyle = '#b8adc9'; g.fillRect(fx - 60, 776, fw + 120, 20);
  return c;
}

function drawStage(R, gt, at, camX) {
  const st = R.stage;
  ctx.save(); ctx.translate(-160 - camX * .35, 0);
  if (st === 'stadium') stadium(gt, at);
  if (st === 'lab') lab(R, gt, at);
  if (st === 'street') street(R, gt, at);
  ctx.restore();
}
const CROWD = ['#e94f37', '#f6bd60', '#84a59d', '#f28482', '#5e60ce', '#48bfe3', '#f1f1f1', '#ffd166', '#06d6a0', '#ef476f', '#D97757', '#10A37F'];
function stadium(gt, at) {
  ctx.drawImage(STAGE.stadium, 0, 0);
  // crowd with a travelling wave
  for (let r = 0; r < 24; r++) {
    const yb = 372 + r * 14.5;
    for (let c = 0; c < 186; c++) {
      const x = c * 12 + (r % 2) * 6; const arch = -110 * Math.sin(Math.PI * x / 2240) * (1 - r / 30);
      const wave = Math.max(0, Math.sin(at * 4 - c * .09 + r * .05)); const jumpy = (rnd(c, r) < .25) ? Math.abs(Math.sin(at * 9 + c)) * 3 : 0;
      const y = yb + arch + 0 - wave * 6 - jumpy;
      if (y < 300) continue;
      ctx.fillStyle = CROWD[(rnd(c, r + 100) * CROWD.length) | 0];
      ctx.globalAlpha = .22 + r / 24 * .3;
      ctx.fillRect(x, y, 9, 10);
      if (rnd(c * 3 + Math.floor(at * 30), r) > .9985) { ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.fillRect(x - 3, y - 3, 15, 15); }
    }
  }
  ctx.globalAlpha = 1;
  // signs in the crowd
  const signs = [['CLAUDE!', COL.cl, 260, 560], ['GPT!!', COL.gp, 980, 470], ['NO ADS', COL.cl, 1500, 600], ['AD BREAK?', COL.gp, 1880, 540], ['GO CLAWD', COL.cl, 620, 470], ['SHIP IT', COL.gp, 1300, 650]];
  signs.forEach(([s, c, x, y], i) => {
    const b = Math.round(Math.sin(at * 6 + i) * 6);
    ctx.globalAlpha = .6; ctx.fillStyle = '#f5f5f5'; ctx.fillRect(x - 70, y + b - 22, 140, 44); ctx.fillStyle = c; ctx.fillRect(x - 70, y + b - 22, 140, 6);
    T(s, x, y + b + 3, 16, c); ctx.globalAlpha = 1;
  });
  // light beams
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [i, x] of [170, 640, 1600, 2070].entries()) {
    const sw = Math.sin(at * .7 + i * 1.7) * 160;
    const gg = ctx.createLinearGradient(0, 100, 0, 900); gg.addColorStop(0, 'rgba(255,250,220,.22)'); gg.addColorStop(1, 'rgba(255,250,220,0)');
    ctx.fillStyle = gg; ctx.beginPath(); ctx.moveTo(x - 60, 120); ctx.lineTo(x + 60, 120); ctx.lineTo(x + 260 + sw, 900); ctx.lineTo(x - 260 + sw, 900); ctx.fill();
  }
  ctx.restore();
  for (const x of [170, 640, 1600, 2070]) glow(x, 105, 190, 'rgba(255,248,210,.55)');
  // jumbotron
  const jx = 900, jy = 90, jw = 440, jh = 230;
  ctx.fillStyle = '#20223f'; ctx.fillRect(jx - 14, jy - 14, jw + 28, jh + 28); ctx.fillRect(jx + jw / 2 - 12, jy + jh, 24, 120);
  ctx.fillStyle = '#05060f'; ctx.fillRect(jx, jy, jw, jh);
  const msgs = [['BIG GAME', '2026', '#fff'], ['AD BREAK!', 'BROUGHT TO YOU BY ADS', COL.gold], ['CHATGPT', 'NOW WITH ADS', COL.gpL], ['CLAUDE', 'STAYS AD-FREE', COL.clL]];
  const mi = Math.floor(at / 1.6) % msgs.length, m = msgs[mi];
  for (let yy = jy; yy < jy + jh; yy += 6) { ctx.fillStyle = 'rgba(255,255,255,.035)'; ctx.fillRect(jx, yy, jw, 3); }
  T(m[0], jx + jw / 2, jy + 82, 40, m[2]); T(m[1], jx + jw / 2, jy + 150, 20, '#fff');
  if (Math.floor(at * 2) % 2) { ctx.fillStyle = '#ff3355'; ctx.fillRect(jx + 18, jy + 18, 14, 14); T('LIVE', jx + 42, jy + 26, 14, '#ff3355', { a: 'left' }); }
  // LED ribbon board
  ctx.fillStyle = '#05060f'; ctx.fillRect(0, 728, 2240, 52);
  const ribbon = '  BIG GAME 2026  *  YOUR AD HERE  *  (BUT NOT IN CLAUDE)  *  ADS ARE COMING TO AI  *  ';
  ctx.save(); ctx.beginPath(); ctx.rect(0, 728, 2240, 52); ctx.clip();
  ctx.font = '28px P2P'; const rw = ctx.measureText(ribbon).width; const off = -((at * 260) % rw);
  for (let x = off; x < 2240; x += rw) T(ribbon, x, 756, 28, '#ffb547', { a: 'left' });
  ctx.restore();
  for (let x = 0; x < 2240; x += 4) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x, 728, 1, 52); }
  // field
  const fg = ctx.createLinearGradient(0, 780, 0, 1080); fg.addColorStop(0, '#1f6b3a'); fg.addColorStop(1, '#0f3b22');
  ctx.fillStyle = fg; ctx.fillRect(0, 780, 2240, 300);
  for (let i = 0; i < 14; i++) { ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.05)'; ctx.beginPath(); const x0 = i * 160, x1 = x0 + 160; ctx.moveTo(1120 + (x0 - 1120) * .6, 780); ctx.lineTo(1120 + (x1 - 1120) * .6, 780); ctx.lineTo(1120 + (x1 - 1120) * 1.6, 1080); ctx.lineTo(1120 + (x0 - 1120) * 1.6, 1080); ctx.fill(); }
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 6;
  for (let i = -6; i <= 6; i++) { const x0 = 1120 + i * 190; ctx.beginPath(); ctx.moveTo(1120 + (x0 - 1120) * .6, 784); ctx.lineTo(1120 + (x0 - 1120) * 1.6, 1080); ctx.stroke(); }
  T('50', 1120, 1010, 60, 'rgba(255,255,255,.45)');
}
function lab(R, gt, at) {
  ctx.drawImage(STAGE.lab, 0, 0);
  // blinking LEDs
  for (let i = 0; i < 16; i++) for (let j = 0; j < 10; j++) for (let k = 0; k < 3; k++) {
    const x = i * 150 + 26 + k * 8, y = 495 + j * 33;
    const on = rnd(i * 97 + j * 13 + k, Math.floor(at * (4 + k * 3) + i)) > .45;
    if (!on) continue;
    ctx.fillStyle = ['#38ff9c', '#3cc8ff', '#ffb347'][(i + j + k) % 3]; ctx.fillRect(x, y, 5, 5);
  }
  // monitors
  const screen = (x, y, w, h, col, title, sub, live, seed) => {
    ctx.fillStyle = '#1a2240'; ctx.fillRect(x - 12, y - 12, w + 24, h + 24); ctx.fillStyle = '#2a3560'; ctx.fillRect(x + w / 2 - 6, 0, 12, y - 12);
    ctx.fillStyle = '#04070f'; ctx.fillRect(x, y, w, h);
    if (!live) {
      T('COMING SOON...', x + w / 2, y + h / 2 - 10, 24, '#556'); const a = at * 6;
      for (let i = 0; i < 8; i++) { ctx.fillStyle = `rgba(150,160,200,${(i + 1) / 8})`; const aa = a + i * Math.PI / 4; ctx.fillRect(x + w / 2 + Math.cos(aa) * 26 - 4, y + h / 2 + 50 + Math.sin(aa) * 26 - 4, 8, 8); }
      return;
    }
    ctx.fillStyle = col; ctx.fillRect(x, y, w, 46); T(title, x + 18, y + 25, 20, '#08090f', { a: 'left' });
    if (Math.floor(at * 2.5) % 2) { ctx.fillStyle = '#ff2b4a'; ctx.beginPath(); ctx.arc(x + w - 100, y + 23, 9, 0, 7); ctx.fill(); }
    T('LIVE', x + w - 84, y + 25, 18, '#08090f', { a: 'left' });
    ctx.save(); ctx.beginPath(); ctx.rect(x, y + 50, w, h - 50); ctx.clip();
    const scroll = (at * 70) % 26;
    for (let i = 0; i < 14; i++) {
      const li = i + Math.floor(at * 70 / 26); const yy = y + 62 + i * 26 - scroll;
      let xx = x + 18 + (rnd(li, seed) * 4 | 0) * 22;
      const segs = 1 + (rnd(li, seed + 1) * 4 | 0);
      for (let s = 0; s < segs; s++) { const ww = 30 + rnd(li, s + seed) * 120; ctx.fillStyle = [col, '#c8d0ff', '#ff86c8', '#8affc1'][(rnd(li, s * 3 + seed) * 4) | 0]; ctx.globalAlpha = .75; ctx.fillRect(xx, yy, ww, 10); xx += ww + 14; }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    T(sub, x + w / 2, y + h + 34, 18, col);
  };
  screen(300, 190, 600, 230, COL.cl, 'CLAUDE OPUS 4.6', 'RELEASED  T+00:00', true, 11);
  screen(1340, 190, 600, 230, COL.gp, 'GPT-5.3 CODEX', 'RELEASED  T+00:20', gt > 2.45 || R.n !== 2, 23);
  if (R.n === 2 && gt > 2.45 && gt < 2.6) { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(1340, 190, 600, 230); }
  // benchmark board
  const bx = 1010, by = 215;
  ctx.fillStyle = '#1a2240'; ctx.fillRect(bx - 10, by - 10, 240, 200); ctx.fillStyle = '#04070f'; ctx.fillRect(bx, by, 220, 180);
  T('BENCHMARKS', bx + 110, by + 22, 14, '#9aa6d6');
  const surge = (R.beams[0] && gt > R.beams[0].t0 && gt < R.beams[0].t1) ? 1 : 0;
  const v1 = .62 + .1 * Math.sin(at * (surge ? 9 : 1.3)) + (surge ? .15 : 0), v2 = .62 + .1 * Math.sin(at * (surge ? 9 : 1.3) + 2.2) + (surge ? .15 : 0);
  ctx.fillStyle = COL.cl; ctx.fillRect(bx + 40, by + 165 - 120 * v1, 50, 120 * v1);
  ctx.fillStyle = COL.gp; ctx.fillRect(bx + 130, by + 165 - 120 * v2, 50, 120 * v2);
  // floor
  const fg = ctx.createLinearGradient(0, 820, 0, 1080); fg.addColorStop(0, '#0c1430'); fg.addColorStop(1, '#050812');
  ctx.fillStyle = fg; ctx.fillRect(0, 820, 2240, 260);
  ctx.strokeStyle = 'rgba(80,200,255,.22)'; ctx.lineWidth = 3;
  for (let i = -14; i <= 14; i++) { const x0 = 1120 + i * 120; ctx.beginPath(); ctx.moveTo(1120 + (x0 - 1120) * .7, 822); ctx.lineTo(1120 + (x0 - 1120) * 2.2, 1080); ctx.stroke(); }
  for (let i = 0; i < 7; i++) { const z = i / 7, y = 822 + 258 * z * z; ctx.globalAlpha = .6; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(2240, y); ctx.stroke(); }
  ctx.globalAlpha = 1;
  glow(630, 860, 380, 'rgba(217,119,87,.20)'); glow(1610, 860, 380, 'rgba(16,163,127,.20)');
  ctx.fillStyle = 'rgba(70,190,255,.5)'; ctx.fillRect(0, 818, 2240, 4);
}
function street(R, gt, at) {
  ctx.drawImage(STAGE.street, 0, 0);
  // stock chart in the sky
  const prog = clamp(gt / 15.3), spike = clamp((gt - 13.4) / 1.8);
  const line = (seed, col, off) => {
    ctx.strokeStyle = col; ctx.lineWidth = 8; ctx.lineJoin = 'miter'; ctx.beginPath();
    const n = 26, upto = Math.floor(prog * n) + 1;
    for (let i = 0; i <= Math.min(n, upto); i++) {
      const x = 420 + i * 62; let y = 330 - i * 5.2 - (rnd(i, seed) - .5) * 70 - off;
      if (i >= n - 4) y -= spike * (i - n + 5) * 34;
      ctx[i ? 'lineTo' : 'moveTo'](x, y);
    }
    ctx.stroke();
  };
  ctx.globalAlpha = .9; line(5, COL.cl, 0); line(9, COL.gp, 12); ctx.globalAlpha = 1;
  // banners between columns
  const ban = (x, col, t1, t2) => {
    const sway = Math.sin(at * 1.6 + x) * 4;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - 70, 460); ctx.lineTo(x + 70, 460); ctx.lineTo(x + 70 + sway, 700); ctx.lineTo(x + sway, 670); ctx.lineTo(x - 70 + sway, 700); ctx.fill();
    T(t1, x + sway / 2, 520, 22, '#fff'); T(t2, x + sway / 2, 580, 34, '#fff');
  };
  ban(890, COL.cl, 'CLAUDE', 'IPO'); ban(1350, COL.gp, 'CHATGPT', 'IPO');
  // golden bell
  const bs = Math.sin(at * (gt > 15.3 ? 14 : 1.5)) * (gt > 15.3 ? .35 : .05);
  ctx.save(); ctx.translate(1120, 470); ctx.rotate(bs);
  ctx.fillStyle = '#ffcf3f'; ctx.beginPath(); ctx.moveTo(-50, 110); ctx.quadraticCurveTo(-46, 10, 0, 6); ctx.quadraticCurveTo(46, 10, 50, 110); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d99a16'; ctx.fillRect(-58, 104, 116, 14); ctx.fillStyle = '#fff2b0'; ctx.fillRect(-28, 30, 10, 60); ctx.fillStyle = '#b07b10'; ctx.fillRect(-10, 116, 20, 18);
  ctx.restore(); glow(1120, 540, 160, 'rgba(255,210,80,.35)');
  // ticker
  ctx.fillStyle = '#05030c'; ctx.fillRect(0, 798, 2240, 50);
  const tick = '  CLAUDE +4.2%  *  CHATGPT +4.1%  *  AI INDEX +9.9%  *  IPO SEASON  *  COMPUTE +12%  *  HYPE +99%  *  ';
  ctx.save(); ctx.beginPath(); ctx.rect(0, 798, 2240, 50); ctx.clip();
  ctx.font = '26px P2P'; const rw = ctx.measureText(tick).width; const off = -((at * 230) % rw);
  for (let x = off; x < 2240; x += rw) T(tick, x, 824, 26, '#4dff9a', { a: 'left' });
  ctx.restore();
  for (let x = 0; x < 2240; x += 4) { ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(x, 798, 1, 50); }
  // street
  const fg = ctx.createLinearGradient(0, 848, 0, 1080); fg.addColorStop(0, '#2a1838'); fg.addColorStop(1, '#0c0814');
  ctx.fillStyle = fg; ctx.fillRect(0, 848, 2240, 232);
  ctx.globalAlpha = .18; ctx.fillStyle = '#ffb36b'; for (let i = 0; i < 40; i++) { ctx.fillRect(rnd(i, 50) * 2240, 860 + rnd(i, 51) * 200, 30 + rnd(i, 52) * 90, 4); }
  ctx.globalAlpha = 1;
  glow(1120, 900, 600, 'rgba(255,140,80,.13)');
  ctx.fillStyle = 'rgba(255,220,140,.35)'; for (let x = 0; x < 2240; x += 220) ctx.fillRect(x + ((at * 0) % 220), 1020, 110, 8);
}

// ---------------------------------------------------------------- fx
function drawFx(R, gt) {
  for (const f of R.fx) {
    const a = gt - f.t; if (a < 0) continue;
    const s = f.seed;
    if (f.kind === 'spark' || f.kind === 'bigspark' || f.kind === 'reflect' || f.kind === 'clash') {
      const big = f.kind !== 'spark', life = big ? .45 : .28; if (a > life) continue;
      const u = a / life;
      const col = f.kind === 'reflect' ? COL.cl : f.kind === 'clash' ? '#fff' : (f.c === 'C' ? '#ffb36b' : '#6dffd5');
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      glow(f.x, f.y, (big ? 220 : 130) * (1 - u * .5), col, 1 - u);
      ctx.fillStyle = '#fff'; ctx.globalAlpha = 1 - u;
      starPath(f.x, f.y, (big ? 120 : 70) * (1 - u), (big ? 34 : 20) * (1 - u), big ? 8 : 6, rnd(s, 1) * 3); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = big ? 10 : 7;
      const nr = big ? 14 : 9;
      for (let i = 0; i < nr; i++) {
        const an = rnd(s, i) * Math.PI * 2, sp = (big ? 900 : 650) * (.6 + rnd(s, i + 50) * .6);
        const r0 = a * sp, r1 = r0 + (big ? 80 : 50) * (1 - u);
        ctx.beginPath(); ctx.moveTo(f.x + Math.cos(an) * r0, f.y + Math.sin(an) * r0); ctx.lineTo(f.x + Math.cos(an) * r1, f.y + Math.sin(an) * r1); ctx.stroke();
      }
      if (big) { ctx.globalAlpha = (1 - u) * .8; ctx.lineWidth = 8; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(f.x, f.y, 30 + u * 260, 0, 7); ctx.stroke(); }
      if (f.kind === 'reflect') { ctx.globalAlpha = 1 - u; ctx.strokeStyle = COL.clL; ctx.lineWidth = 8; hexPath(f.x, f.y, 40 + u * 140, a * 3); ctx.stroke(); }
      ctx.restore();
    } else if (f.kind === 'block') {
      const life = .3; if (a > life) continue; const u = a / life;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - u;
      ctx.strokeStyle = '#9fe6ff'; ctx.lineWidth = 8; hexPath(f.x, f.y, 40 + u * 90); ctx.stroke();
      glow(f.x, f.y, 120, '#7fd8ff', 1 - u);
      for (let i = 0; i < 8; i++) { const an = rnd(s, i) * 6.28; const r = a * 700; ctx.fillStyle = '#e6fbff'; ctx.fillRect(f.x + Math.cos(an) * r - 5, f.y + Math.sin(an) * r - 5, 10, 10); }
      ctx.restore();
    } else if (f.kind === 'dust') {
      const life = f.big ? .8 : .5; if (a > life) continue; const u = a / life;
      for (let i = 0; i < (f.big ? 10 : 6); i++) {
        const side = f.dir ? -f.dir : (i % 2 ? 1 : -1);
        const sp = 140 + rnd(s, i) * 260; const x = f.x + side * a * sp * (f.dir ? 1 : .8), y = f.y - a * (40 + rnd(s, i + 9) * 80) - 10;
        const r = (16 + rnd(s, i + 3) * 18) * (.6 + u) * (f.big ? 1.6 : 1);
        ctx.fillStyle = `rgba(210,200,190,${.55 * (1 - u)})`; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    } else if (f.kind === 'explode') {
      const life = f.mega ? 1.8 : 1.3; if (a > life) continue; const u = a / life, M = f.mega ? 1.6 : 1;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      glow(f.x, f.y, 520 * M * (1 - u * .4), '#ffcf7a', 1 - u);
      ctx.globalAlpha = 1 - u; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(f.x, f.y, 160 * M * (1 - u), 0, 7); ctx.fill();
      ctx.strokeStyle = '#ffe9b0'; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(f.x, f.y, 60 + u * 1100 * M, 0, 7); ctx.stroke();
      ctx.strokeStyle = COL.gpL; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(f.x, f.y, 40 + u * 800 * M, 0, 7); ctx.stroke();
      ctx.strokeStyle = COL.cl; ctx.beginPath(); ctx.arc(f.x, f.y, 20 + u * 600 * M, 0, 7); ctx.stroke();
      for (let i = 0; i < 46; i++) {
        const an = rnd(s, i) * 6.28, sp = (500 + rnd(s, i + 99) * 900) * M;
        const x = f.x + Math.cos(an) * sp * a, y = f.y + Math.sin(an) * sp * a + 900 * a * a;
        ctx.fillStyle = [COL.gold, '#fff', COL.cl, COL.gpL][i % 4]; const z = 10 + (i % 3) * 6; ctx.fillRect(x - z / 2, y - z / 2, z, z);
      }
      ctx.restore();
    }
  }
  // word pops
  for (const p of R.pops) {
    const a = gt - p.t; if (a < 0 || a > 1.0) continue;
    const sc = a < .15 ? E.back(a / .15) : 1, al = a > .75 ? 1 - (a - .75) / .25 : 1;
    ctx.save(); ctx.translate(p.x, p.y - a * 30); ctx.scale(sc, sc); ctx.rotate(-.05);
    T(p.text, 0, 0, 44, p.c, { ow: 6, ol: '#1a0533', sh: 8, al });
    ctx.restore();
  }
  // damage numbers
  for (const h of R.hits) {
    const a = gt - h.t; if (a < 0 || a > .8 || h.block || h.dmg < 3) continue;
    T('-' + h.dmg, h.x + (h.to === 'G' ? 40 : -40), h.y - 120 - a * 70, 28, h.dmg >= 15 ? '#ff5a4a' : '#fff', { ow: 4, al: 1 - a / .8 });
  }
}

function drawProj(R, gt) {
  for (const p of R.projs) {
    if (gt < p.t0 || gt > p.t1) continue;
    const u = (gt - p.t0) / (p.t1 - p.t0);
    const pos = uu => [lerp(p.x0, p.x1, uu), lerp(p.y0, p.y1, uu) - (p.arc || 0) * 4 * uu * (1 - uu)];
    const [x, y] = pos(u);
    if (p.kind === 'ad') {
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(gt * 22 + p.t0 * 9) * .18 + (p.reflected ? .3 : 0));
      const w = 210, h = 120;
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-w / 2 + 10, -h / 2 + 10, w, h);
      ctx.fillStyle = '#111'; ctx.fillRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10);
      ctx.fillStyle = '#fff'; ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = p.reflected ? COL.cl : '#2f6bff'; ctx.fillRect(-w / 2, -h / 2, w, 26);
      ctx.fillStyle = '#ff3b3b'; ctx.fillRect(w / 2 - 24, -h / 2 + 4, 18, 18); T('x', w / 2 - 15, -h / 2 + 14, 12, '#fff');
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(-w / 2 + 6, -h / 2 + 4, 34, 18); T('AD', -w / 2 + 23, -h / 2 + 14, 10, '#111');
      T(p.label, 0, 12, p.label.length > 9 ? 16 : 20, p.reflected ? COL.clD : '#e0245e');
      ctx.restore();
    } else if (p.kind === 'token' || p.kind === 'orb') {
      const col = p.kind === 'token' ? COL.cl : COL.gp, core = p.kind === 'token' ? '#ffe2d2' : '#d8fff4';
      for (let i = 5; i >= 0; i--) {
        const [tx, ty] = pos(Math.max(0, u - i * .045)); const sc = 1 - i * .14;
        glow(tx, ty, 90 * sc, col, .5 * sc);
        ctx.fillStyle = i ? col : core; ctx.globalAlpha = i ? .4 * sc : 1;
        if (p.kind === 'token') { starPath(tx, ty, 46 * sc, 14 * sc, 6, gt * 12); ctx.fill(); }
        else { ctx.beginPath(); ctx.arc(tx, ty, 34 * sc, 0, 7); ctx.fill(); }
        ctx.globalAlpha = 1;
      }
      if (p.kind === 'orb') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - 8, y - 8, 10, 0, 7); ctx.fill(); }
    }
  }
}
function drawBeams(R, gt, sC, sG) {
  for (const b of R.beams) {
    if (gt < b.t0 || gt > b.t1) continue;
    const a = gt - b.t0, grow = clamp(a / .25);
    const cxp = b.mid + Math.sin(a * b.freq * 2.2) * b.amp + Math.sin(a * 7.3) * b.amp * .3;
    const cy = GROUND - 120;
    const ox = sC.x + sC.face * 110, oy = GROUND - 95, gx = sG.x + sG.face * 100, gy = GROUND - 150;
    const thick = b.mega ? 1.6 : 1;
    const beam = (x0, y0, x1, y1, col, colL) => {
      const xe = lerp(x0, x1, grow), ye = lerp(y0, y1, grow);
      const len = Math.hypot(xe - x0, ye - y0), an = Math.atan2(ye - y0, xe - x0);
      ctx.save(); ctx.translate(x0, y0); ctx.rotate(an); ctx.globalCompositeOperation = 'lighter';
      for (let x = 0; x < len; x += 16) {
        const wob = Math.sin(x * .05 - gt * 50) * 8 + Math.sin(x * .13 + gt * 30) * 5;
        const h1 = (90 + wob) * thick, h2 = (52 + wob * .5) * thick, h3 = 20 * thick;
        ctx.fillStyle = col; ctx.globalAlpha = .28; ctx.fillRect(x, -h1 / 2, 17, h1);
        ctx.globalAlpha = .8; ctx.fillStyle = colL; ctx.fillRect(x, -h2 / 2, 17, h2);
        ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.fillRect(x, -h3 / 2, 17, h3);
      }
      ctx.restore();
      glow(x0, y0, 120 * thick, colL, .9);
    };
    beam(ox, oy, cxp, cy, COL.cl, '#ffb08a');
    beam(gx, gy, cxp, cy, COL.gp, '#7dffd9');
    if (grow >= 1) {
      const pr = (110 + Math.sin(gt * 40) * 20) * thick;
      glow(cxp, cy, pr * 2.8, 'rgba(255,240,200,1)', 1);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#fff';
      starPath(cxp, cy, pr * 1.4, pr * .45, 10, gt * 3); ctx.fill();
      for (let i = 0; i < 28; i++) {
        const life = .4, ph = ((gt + rnd(i, 3) * life) % life) / life, an = rnd(i, Math.floor((gt + rnd(i, 3) * life) / life)) * 6.28;
        const r = ph * 380 * thick; ctx.globalAlpha = 1 - ph; ctx.fillStyle = i % 2 ? COL.gold : '#fff';
        ctx.fillRect(cxp + Math.cos(an) * r - 6, cy + Math.sin(an) * r - 6, 12, 12);
      }
      ctx.restore();
    }
  }
}
function drawSwarm(R, gt) {
  for (const sw of R.swarms) {
    if (gt < sw.t0 || gt > sw.t1) continue;
    const a = gt - sw.t0;
    const people = [];
    for (let i = 0; i < 70; i++) {
      const v = 1000 + rnd(i, sw.seed) * 700, start = rnd(i, sw.seed + 1) * 1.2;
      if (a < start) continue;
      const x = sw.x0 + rnd(i, 9) * 200 - v * (a - start); if (x < -100) continue;
      const lane = rnd(i, sw.seed + 2); people.push([lane, x, i]);
    }
    people.sort((p, q) => p[0] - q[0]);
    for (const [lane, x, i] of people) {
      const s = 5 + lane * 3, y = GROUND - 10 + lane * 60 - 40;
      const step = Math.floor(gt * 14 + i) % 2;
      const shirt = CROWD[i % CROWD.length], skin = ['#f2c9a0', '#c98d5e', '#8a5a3c', '#f7dcc0'][i % 4];
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x - 3 * s, y + s * .2, 6 * s, s);
      ctx.fillStyle = '#20202a'; ctx.fillRect(x - 2 * s - s * .2, y - 8 * s, s * 4.4, s * 8.6);
      ctx.fillStyle = '#26314f'; ctx.fillRect(x - 1.5 * s + (step ? -s : s) * .6, y - 3 * s, s, 3 * s); ctx.fillRect(x + .5 * s + (step ? s : -s) * .6, y - 3 * s, s, 3 * s);
      ctx.fillStyle = shirt; ctx.fillRect(x - 1.8 * s, y - 6.5 * s, 3.6 * s, 3.6 * s);
      ctx.fillStyle = skin; ctx.fillRect(x - 1.4 * s, y - 9.6 * s, 2.8 * s, 2.8 * s);
      ctx.fillStyle = '#bfc6d6'; ctx.fillRect(x - 3 * s, y - 6 * s, 1.2 * s, 1.8 * s);
    }
  }
}
function drawShield(R, gt, sC) {
  for (const sh of R.shields) {
    if (gt < sh.t0 || gt > sh.t1) continue;
    const a = gt - sh.t0, k = Math.min(1, a / .2) * Math.min(1, (sh.t1 - gt) / .2);
    const x = sC.x + 150, y = GROUND - 120;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(x, y, 260, 'rgba(217,119,87,.9)', .55 * k);
    ctx.globalAlpha = .25 * k; ctx.fillStyle = COL.cl; ctx.beginPath(); ctx.ellipse(x, y, 60, 190, 0, 0, 7); ctx.fill();
    ctx.globalAlpha = .9 * k; ctx.strokeStyle = '#ffc7ad'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.ellipse(x, y, 60 + Math.sin(gt * 20) * 4, 190, 0, 0, 7); ctx.stroke();
    for (let i = 0; i < 5; i++) { ctx.globalAlpha = .7 * k; ctx.strokeStyle = COL.clL; ctx.lineWidth = 4; hexPath(x, y - 120 + i * 60, 22, gt * 2); ctx.stroke(); }
    ctx.restore();
    ctx.save(); ctx.translate(x, y - 230); ctx.globalAlpha = k;
    T('AD-FREE', 0, 0, 22, '#fff', { ow: 4, ol: COL.clD });
    ctx.restore();
  }
}

// ---------------------------------------------------------------- HUD & overlays
function portrait(id, x, y, n, t) {
  ctx.fillStyle = '#0c0b1a'; ctx.fillRect(x, y, 104, 104);
  ctx.fillStyle = id === 'C' ? COL.cl : COL.gp; ctx.fillRect(x, y, 104, 6); ctx.fillRect(x, y + 98, 104, 6); ctx.fillRect(x, y, 6, 104); ctx.fillRect(x + 98, y, 6, 104);
  ctx.save(); ctx.beginPath(); ctx.rect(x + 6, y + 6, 92, 92); ctx.clip();
  if (id === 'C') blit(drawClawd, { n, t }, x + 52, y + 122, 8, 1, { ol: SPR.C.ol });
  else blit(drawGPT, { n, t }, x + 54, y + 172, 5, -1, { ol: SPR.G.ol });
  ctx.restore();
}
function drawHUD(R, gt, at, inCard) {
  const timer = inCard ? 99 : Math.max(0, 99 - Math.floor(gt * 1.5));
  for (const id of ['C', 'G']) {
    const L = id === 'C', hp = R.hp(id, gt);
    const bx = L ? 150 : 1050, bw = 720, by = 56, bh = 44;
    ctx.fillStyle = '#0a0918'; ctx.fillRect(bx - 8, by - 8, bw + 16, bh + 16);
    ctx.fillStyle = COL.gold; ctx.fillRect(bx - 8, by - 8, bw + 16, 4); ctx.fillRect(bx - 8, by + bh + 4, bw + 16, 4);
    ctx.fillStyle = '#3a0d14'; ctx.fillRect(bx, by, bw, bh);
    const gw = bw * hp.ghost / 100, vw = bw * hp.v / 100;
    ctx.fillStyle = '#ff3d3d'; L ? ctx.fillRect(bx + bw - gw, by, gw, bh) : ctx.fillRect(bx, by, gw, bh);
    const low = hp.v < 30 && Math.floor(at * 6) % 2;
    ctx.fillStyle = gradV(by, by + bh, L ? (low ? ['#fff3b0', '#ffd23f'] : ['#ffe08a', '#f2a65a', '#D97757']) : (low ? ['#fff3b0', '#ffd23f'] : ['#b6ffe9', '#3fd6a8', '#10A37F']));
    L ? ctx.fillRect(bx + bw - vw, by, vw, bh) : ctx.fillRect(bx, by, vw, bh);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; L ? ctx.fillRect(bx + bw - vw, by + 4, vw, 6) : ctx.fillRect(bx, by + 4, vw, 6);
    for (let i = 1; i < 10; i++) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(bx + i * bw / 10, by, 3, bh); }
    // portrait + name
    const last = R.hits.filter(h => h.to === id && h.t <= gt).pop();
    const pn = hp.v <= 0 ? 'ko' : (last && gt - last.t < .4 && !last.block) ? 'hit' : 'idle';
    portrait(id, L ? 26 : 1790, 30, pn, at);
    T(NAME[id], L ? 150 : 1770, 140, 30, '#fff', { a: L ? 'left' : 'right', ow: 4, ol: '#1a0533' });
    // round wins
    const w = R.wins[id] + ((R.winner === id && gt >= R.koT) ? 1 : 0);
    for (let i = 0; i < 2; i++) {
      const px = L ? 830 - i * 46 : 1090 + i * 46, py = 140;
      ctx.fillStyle = '#0a0918'; ctx.beginPath(); ctx.arc(px, py, 17, 0, 7); ctx.fill();
      ctx.fillStyle = i < w ? COL.gold : '#3b3a55'; ctx.beginPath(); ctx.arc(px, py, 12, 0, 7); ctx.fill();
      if (i < w) { ctx.fillStyle = '#fff6c2'; ctx.fillRect(px - 6, py - 7, 5, 5); }
    }
    // super meter
    const m = R.meterAt(id, gt), mx = L ? 60 : 1340, my = 1010, mw = 520;
    ctx.fillStyle = '#0a0918'; ctx.fillRect(mx - 6, my - 6, mw + 12, 36);
    ctx.fillStyle = '#1c1b3a'; ctx.fillRect(mx, my, mw, 24);
    const full = m >= 99.5, fl = full && Math.floor(at * 10) % 2;
    ctx.fillStyle = fl ? '#fff' : gradV(my, my + 24, L ? ['#ffd0b8', COL.cl] : ['#c4fff0', COL.gp]);
    L ? ctx.fillRect(mx, my, mw * m / 100, 24) : ctx.fillRect(mx + mw - mw * m / 100, my, mw * m / 100, 24);
    T(full ? 'MAX' : 'SUPER', L ? mx + mw + 20 : mx - 20, my + 13, 18, full ? COL.gold : '#c9c6ff', { a: L ? 'left' : 'right', ow: 3 });
  }
  // timer
  ctx.fillStyle = '#0a0918'; ctx.fillRect(900, 28, 120, 104); ctx.fillStyle = COL.gold; ctx.fillRect(900, 28, 120, 5); ctx.fillRect(900, 127, 120, 5);
  T(String(timer).padStart(2, '0'), 962, 84, 56, timer < 20 ? '#ff5a4a' : '#fff', { ow: 4, ol: '#1a0533' });
  // combos
  for (const id of ['C', 'G']) {
    const hs = R.hits.filter(h => h.by === id && !h.block && h.t <= gt);
    if (!hs.length) continue;
    let n = 1; for (let i = hs.length - 1; i > 0; i--) { if (hs[i].t - hs[i - 1].t < .75) n++; else break; }
    const age = gt - hs[hs.length - 1].t;
    if (n >= 2 && age < 1.1) {
      const L = id === 'C', sl = E.out3(clamp((gt - hs[hs.length - n].t) / .15));
      const x = L ? -300 + sl * 360 : W + 300 - sl * 360, al = age > .8 ? 1 - (age - .8) / .3 : 1;
      const bump = age < .08 ? 1.25 - age * 3 : 1;
      ctx.save(); ctx.translate(x, 330); ctx.scale(bump, bump);
      T(n + ' HITS', 0, 0, 52, L ? '#ffcf6b' : '#7dffd9', { a: L ? 'left' : 'right', ow: 6, ol: '#1a0533', al });
      T('COMBO!', 0, 52, 26, '#fff', { a: L ? 'left' : 'right', ow: 4, ol: '#1a0533', al });
      ctx.restore();
    }
  }
}
function wrap(text, size, maxW) {
  ctx.font = `${size}px P2P`; const words = text.split(' '); const lines = []; let cur = '';
  for (const w of words) { const tt = cur ? cur + ' ' + w : w; if (ctx.measureText(tt).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tt; }
  if (cur) lines.push(cur); return lines;
}
function drawBubbles(R, gt) {
  for (const b of R.bubbles) {
    const a = gt - b.t; if (a < 0 || a > b.d) continue;
    const id = b.who, size = 24;
    const chars = Math.floor((a - .1) * 30);
    const lines = wrap(b.text, size, 470);
    const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 56, h = lines.length * 38 + 40;
    let x = clamp(b.x - w / 2 + (id === 'C' ? 60 : -60), 30, W - 30 - w), y = GROUND - SPR[id].headH - h - 40;
    const sc = a < .12 ? E.back(a / .12) : (b.d - a < .12 ? (b.d - a) / .12 : 1);
    ctx.save(); ctx.translate(x + w / 2, y + h); ctx.scale(sc, sc); ctx.translate(-(x + w / 2), -(y + h));
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x + 10, y + 10, w, h);
    pbox(x - 6, y - 6, w + 12, h + 12, '#fff', '#111', 6);
    // tail
    const tx = clamp(b.x, x + 30, x + w - 30);
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(tx - 22, y + h); ctx.lineTo(tx + 22, y + h); ctx.lineTo(tx + (id === 'C' ? -10 : 10), y + h + 40); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(tx - 14, y + h - 6); ctx.lineTo(tx + 14, y + h - 6); ctx.lineTo(tx + (id === 'C' ? -8 : 8), y + h + 26); ctx.fill();
    ctx.fillStyle = id === 'C' ? COL.cl : COL.gp; ctx.fillRect(x, y, w, 8);
    let left = chars;
    lines.forEach((l, i) => { const s = l.slice(0, Math.max(0, left)); left -= l.length + 1; T(s, x + 28, y + 42 + i * 38, size, '#111', { a: 'left' }); });
    ctx.restore();
  }
}
function drawCut(st) {
  const { s, a } = st, d = s.d;
  const outK0 = E.in(clamp((a - (d - .18)) / .18));
  ctx.fillStyle = `rgba(5,3,15,${.62 * Math.min(1, a / .1) * (1 - outK0)})`; ctx.fillRect(0, 0, W, H);
  if (s.cut === 'both') {
    cutBand('C', 110, 500, s.nC, true, a, d);
    if (a > .35) cutBand('G', 590, 980, s.nG, false, a - .35, d - .35);
  } else cutBand(s.cut, 290, 790, s.name, s.cut === 'C', a, d);
  if (a < .07) { ctx.fillStyle = `rgba(255,255,255,${1 - a / .07})`; ctx.fillRect(0, 0, W, H); }
}
function cutBand(id, y0, y1, name, fromLeft, a, d) {
  const inK = E.out3(clamp(a / .18)), outK = E.in(clamp((a - (d - .18)) / .18));
  const col = id === 'C' ? [COL.clD, COL.cl] : [COL.gpD, COL.gp];
  const off = (fromLeft ? -1 : 1) * W * (1 - inK) + (fromLeft ? 1 : -1) * W * outK;
  ctx.save(); ctx.translate(off, 0);
  ctx.beginPath(); ctx.moveTo(-100, y0 + 50); ctx.lineTo(W + 100, y0 - 30); ctx.lineTo(W + 100, y1 - 50); ctx.lineTo(-100, y1 + 30); ctx.closePath();
  const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, col[0]); g.addColorStop(.5, col[1]); g.addColorStop(1, col[0]);
  ctx.fillStyle = g; ctx.fill(); ctx.save(); ctx.clip();
  for (let i = 0; i < 40; i++) {
    const ly = y0 + rnd(i, 1) * (y1 - y0), lw = 200 + rnd(i, 2) * 600, sp = 3000 + rnd(i, 3) * 3000;
    const lx = ((rnd(i, 4) * 3000 + a * sp * (fromLeft ? 1 : -1)) % 3000 + 3000) % 3000 - 500;
    ctx.fillStyle = `rgba(255,255,255,${.12 + rnd(i, 5) * .25})`; ctx.fillRect(lx, ly, lw, 4 + (i % 3) * 3);
  }
  const hgt = y1 - y0, sx = fromLeft ? 430 + a * 60 : W - 430 - a * 60;
  if (id === 'C') blit(drawClawd, { n: 'special', t: a }, sx, y1 + hgt * .02, hgt / 16, 1, { ol: SPR.C.ol });
  else blit(drawGPT, { n: 'special', t: a }, sx, y1 + hgt * .35, hgt / 30, -1, { ol: SPR.G.ol });
  ctx.restore();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-100, y0 + 50); ctx.lineTo(W + 100, y0 - 30); ctx.moveTo(-100, y1 + 30); ctx.lineTo(W + 100, y1 - 50); ctx.stroke();
  const ls = clamp((a - .12) / .2), size = name.length > 14 ? 60 : 72;
  ctx.save(); ctx.translate(fromLeft ? 1280 : 640, (y0 + y1) / 2); ctx.scale(lerp(2.2, 1, E.out3(ls)), lerp(2.2, 1, E.out3(ls))); ctx.globalAlpha = ls;
  T('SUPER MOVE', 0, -size - 14, 26, '#fff', { ow: 4, ol: '#1a0533' });
  bigText(name, 0, 10, size, ['#ffffff', '#fff1a8', COL.gold], { ex: 8, ow: 6 });
  ctx.restore();
  ctx.restore();
}
function drawCard(R, lt) {
  // ROUND N
  if (lt > .15 && lt < 1.95) {
    const a = lt - .15, k = E.out3(clamp(a / .35)), out = clamp((lt - 1.7) / .25);
    ctx.fillStyle = `rgba(5,3,15,${.45 * (1 - out)})`; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(W / 2, 420); const sc = lerp(3, 1, k); ctx.scale(sc, sc); ctx.globalAlpha = k * (1 - out);
    const sp = (1 - k) * 30;
    T(R.title, -sp, 0, 120, 'rgba(255,40,80,.6)'); T(R.title, sp, 0, 120, 'rgba(40,200,255,.6)');
    bigText(R.title, 0, 0, 120, ['#ffffff', '#ffe27a', '#ff9a3c'], { ex: 12, ow: 7 });
    ctx.restore();
    const b = clamp((lt - .45) / .3);
    if (b > 0) {
      ctx.globalAlpha = 1 - out;
      const bw = 1300 * E.out3(b);
      ctx.fillStyle = 'rgba(10,8,30,.9)'; ctx.fillRect(W / 2 - bw / 2, 530, bw, 130);
      ctx.fillStyle = COL.gold; ctx.fillRect(W / 2 - bw / 2, 530, bw, 5); ctx.fillRect(W / 2 - bw / 2, 655, bw, 5);
      const n = Math.floor((lt - .6) * 40);
      T(R.sub.slice(0, Math.max(0, n)), W / 2, 578, 44, '#fff', { ow: 4, ol: '#1a0533' });
      T(R.date.slice(0, Math.max(0, n - 4)), W / 2, 628, 22, COL.gold);
      ctx.globalAlpha = 1;
    }
  }
  // FIGHT!
  if (lt >= 1.9) {
    const a = lt - 1.9, k = E.elastic(clamp(a / .5)), out = clamp((lt - 2.75) / .25);
    ctx.save(); ctx.globalAlpha = 1 - out;
    ctx.translate(W / 2, 480);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.rotate(a * .8);
    for (let i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8); ctx.fillStyle = `rgba(255,210,80,${.18 * (1 - out)})`; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1400, -90); ctx.lineTo(1400, 90); ctx.fill(); }
    ctx.restore();
    ctx.scale(k * 1.0, k * 1.0); ctx.rotate(-.06);
    bigText('FIGHT!', 0, 0, 200, ['#ffffff', '#ffd23f', '#ff4d2e'], { ex: 18, ow: 10 });
    ctx.restore();
    if (a < .08) { ctx.fillStyle = `rgba(255,255,255,${.8 * (1 - a / .08)})`; ctx.fillRect(0, 0, W, H); }
  }
}
function drawBanners(R, rt, gt) {
  for (const b of R.banners) {
    const a = rt - R.toReal(b.t); if (a < 0 || a > b.d) continue;
    const out = clamp((a - (b.d - .3)) / .3);
    if (b.kind === 'ko' || b.kind === 'dko') {
      if (a < .12) { ctx.fillStyle = `rgba(255,255,255,${1 - a / .12})`; ctx.fillRect(0, 0, W, H); }
      const k = clamp(a / .18), sc = lerp(4, 1, E.out3(k));
      ctx.save(); ctx.globalAlpha = 1 - out; ctx.translate(W / 2 + (a < .4 ? Math.sin(a * 90) * 10 * (1 - a / .4) : 0), 470); ctx.scale(sc, sc);
      if (b.kind === 'dko') T('DOUBLE', 0, -200, 80, '#fff', { ow: 8, ol: '#1a0533', sh: 10 });
      const pulse = 1 + Math.sin(a * 10) * .02; ctx.scale(pulse, pulse);
      bigText('K.O.', 0, 0, 260, ['#fff6c2', '#ffd23f', '#ff3b1f', '#a3001a'], { ex: 22, ow: 12 });
      ctx.restore();
    } else if (b.kind === 'win') {
      const k = E.out3(clamp(a / .35)); const col = b.who === 'C' ? COL.cl : COL.gp;
      ctx.save(); ctx.globalAlpha = 1 - out;
      ctx.translate((1 - k) * -W, 0);
      ctx.fillStyle = 'rgba(8,6,24,.85)'; ctx.beginPath(); ctx.moveTo(0, 420); ctx.lineTo(W, 380); ctx.lineTo(W, 600); ctx.lineTo(0, 640); ctx.fill();
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, 420); ctx.lineTo(W, 380); ctx.lineTo(W, 392); ctx.lineTo(0, 432); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, 628); ctx.lineTo(W, 588); ctx.lineTo(W, 600); ctx.lineTo(0, 640); ctx.fill();
      bigText(NAME[b.who] + ' WINS', W / 2, 480, 100, b.who === 'C' ? ['#fff', '#ffd2b8', COL.cl] : ['#fff', '#c8fff0', COL.gp], { ex: 10, ow: 7 });
      const n = Math.floor((a - .5) * 30);
      if (n > 0) T('"' + b.quote.slice(0, n) + (n < b.quote.length ? '' : '"'), W / 2, 575, 28, '#fff');
      ctx.restore();
    } else if (b.kind === 'caption') {
      const k = clamp(a / .2) * (1 - out);
      ctx.save(); ctx.globalAlpha = k;
      ctx.fillStyle = 'rgba(30,10,60,.82)'; ctx.fillRect(0, 380, W, 220);
      ctx.fillStyle = COL.gold; ctx.fillRect(0, 380, W, 6); ctx.fillRect(0, 594, W, 6);
      const wob = Math.sin(a * 8) * 4;
      T(b.text, W / 2, 490 + wob, 84, '#ffe066', { f: 'SilkB', ow: 6, ol: '#5a2a00', sh: 10 });
      ctx.restore();
    }
  }
}

// ---------------------------------------------------------------- round scene
function drawRound(R, lt) {
  const rt = lt - R.card, inCard = rt < 0;
  const gt = inCard ? 0 : R.toGame(rt);
  const at = inCard ? lt : gt + 3;
  const stp = inCard ? null : R.stopAt(rt);
  const sC = R.state(R.C, gt, at), sG = R.state(R.G, gt, at);
  // camera
  let shake = 0;
  if (!inCard) for (const s of R.shakes) { const a = rt - R.toReal(s.t); if (a >= 0 && a < s.d) shake += s.a * (1 - a / s.d); }
  let zoom = 1, zx = W / 2;
  if (!inCard) for (const z of R.zooms) { const a = rt - R.toReal(z.t); if (a >= 0 && a < z.d) { const u = a / z.d; const k = u < .15 ? E.out(u / .15) : 1 - E.io((u - .15) / .85); zoom = lerp(1, z.z, k); zx = z.x; } }
  const camX = ((sC.x + sG.x) / 2 - W / 2);
  const shx = Math.sin(rt * 97) * shake, shy = Math.cos(rt * 83) * shake * .7;
  ctx.save();
  ctx.translate(zx + shx, H * .62 + shy); ctx.scale(zoom, zoom); ctx.translate(-zx, -H * .62);
  drawStage(R, gt, at, camX * .6);
  // in-stage dim during supers
  const order = (sG.mv && ['punch', 'kick', 'throw', 'rapid', 'dash'].includes(sG.mv.n)) ? [['C', sC], ['G', sG]] : [['G', sG], ['C', sC]];
  if (R.n === 3 && R.beams[0] && gt > 13.2 && gt < 15.32) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-200, 0, W + 400, H); }
  for (const [id, s] of order) drawFighter(id, s, at);
  drawShield(R, gt, sC);
  drawSwarm(R, gt);
  drawBeams(R, gt, sC, sG);
  drawProj(R, gt);
  drawFx(R, gt);
  drawBubbles(R, gt);
  ctx.restore();
  for (const f of R.flashes) { const a = rt - R.toReal(f.t); if (a >= 0 && a < f.d) { ctx.fillStyle = `rgba(255,255,255,${f.white ? (a < .5 ? 1 : 1 - (a - .5) / (f.d - .5)) : .7 * (1 - a / f.d)})`; ctx.fillRect(0, 0, W, H); } }
  drawHUD(R, gt, at, inCard);
  if (stp && stp.s.cut) drawCut(stp);
  drawBanners(R, rt, gt);
  if (inCard || lt < R.card + .1) drawCard(R, lt);
  // final round coin rain
  if (R.n === 3 && gt > 15.6) coinRain(rt - R.toReal(15.6));
}
function drawFighter(id, s, at) {
  const sp = SPR[id];
  const hgt = GROUND - s.y;
  ctx.fillStyle = `rgba(0,0,0,${.4 * Math.max(.25, 1 - hgt / 400)})`;
  ctx.beginPath(); ctx.ellipse(s.x, GROUND + 4, (id === 'C' ? 125 : 95) * Math.max(.4, 1 - hgt / 700), 16, 0, 0, 7); ctx.fill();
  if (s.n === 'special') { glow(s.x, s.y - sp.hitH, 260, id === 'C' ? 'rgba(217,119,87,.9)' : 'rgba(16,163,127,.9)', .6 + .2 * Math.sin(at * 30)); }
  const o = { flash: s.flash, ol: sp.ol };
  let dy = 0;
  if (s.n === 'ko') {
    const e = E.out(clamp(s.a / .45));
    if (id === 'C') { o.rot = Math.PI * e; o.py = 7; dy = 3 * sp.s * e; } else { o.rot = -Math.PI / 2 * e; o.py = 10; }
  }
  blit(sp.fn, { n: s.n, k: s.k, t: at }, s.x, s.y + dy, sp.s, s.face, o);
}
function coinRain(a) {
  for (let i = 0; i < 60; i++) {
    const st = rnd(i, 77) * 2.5; if (a < st) continue;
    const x = rnd(i, 78) * W, y = -40 + (a - st) * (500 + rnd(i, 79) * 400); if (y > H + 40) continue;
    const w = Math.abs(Math.cos((a + i) * 6)) * 26 + 4;
    ctx.fillStyle = '#b07b10'; ctx.fillRect(x - w / 2 - 3, y - 15, w + 6, 30);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(x - w / 2, y - 12, w, 24);
    ctx.fillStyle = '#fff3b0'; ctx.fillRect(x - w / 4, y - 8, Math.max(2, w / 4), 6);
  }
}

// ---------------------------------------------------------------- title / select / ending
function synthBG(t, hue = 0) {
  const g = ctx.createLinearGradient(0, 0, 0, 640); g.addColorStop(0, '#07021a'); g.addColorStop(.7, '#2b0a4a'); g.addColorStop(1, '#ff3d8b');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 640);
  for (let i = 0; i < 120; i++) { ctx.fillStyle = `rgba(255,255,255,${.3 + .7 * Math.abs(Math.sin(t * 2 + i))})`; ctx.fillRect(rnd(i, 1) * W, rnd(i, 2) * 480, 3, 3); }
  // sun
  const sg2 = ctx.createLinearGradient(0, 330, 0, 640); sg2.addColorStop(0, '#fff27a'); sg2.addColorStop(1, '#ff2fa0');
  ctx.fillStyle = sg2; ctx.beginPath(); ctx.arc(W / 2, 600, 270, Math.PI, 0); ctx.fill();
  for (let i = 0; i < 8; i++) { const y = 470 + i * 20 + ((t * 30) % 20); ctx.fillStyle = '#2b0a4a'; ctx.fillRect(W / 2 - 280, y, 560, 3 + i * 1.2); }
  // mountains
  ctx.fillStyle = '#16052e'; ctx.beginPath(); ctx.moveTo(0, 640);
  for (let x = 0; x <= W; x += 60) ctx.lineTo(x, 640 - 40 - Math.abs(Math.sin(x * .004 + 1)) * 120 * (Math.abs(x - W / 2) > 300 ? 1 : .2) - rnd(x, 3) * 30);
  ctx.lineTo(W, 640); ctx.fill();
  // grid
  ctx.fillStyle = '#0b0218'; ctx.fillRect(0, 640, W, 440);
  ctx.strokeStyle = '#ff2bd6'; ctx.lineWidth = 3;
  for (let i = -20; i <= 20; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 40, 640); ctx.lineTo(W / 2 + i * 260, H); ctx.stroke(); }
  for (let i = 0; i < 14; i++) { const z = ((i + (t * 1.6) % 1) / 14); const y = 640 + 440 * z * z; ctx.globalAlpha = Math.min(1, z * 3); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.globalAlpha = 1;
  glow(W / 2, 640, 900, 'rgba(255,60,180,.25)');
}
function drawTitle(lt) {
  const S = SCENE_META.title;
  if (lt < 1.45) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (Math.floor(lt * 3) % 2 === 0 || lt > 1.0) T('INSERT COIN', W / 2, H / 2, 48, lt > 1.0 ? COL.gold : '#fff');
    T('CREDIT ' + (lt > 1.0 ? 1 : 0), W - 60, H - 60, 24, '#aaa', { a: 'right' });
    T('(C) 2026 FAN-MADE ARCADE', 60, H - 60, 20, '#666', { a: 'left' });
    if (lt > 1.0) { const a = lt - 1.0; coinSprite(W / 2, H / 2 - 160 + a * 300, 1 - a * 2); }
    return;
  }
  const a = lt - 1.45;
  synthBG(lt);
  // mascots rising
  const r = E.out3(clamp((a - 1.0) / .7));
  if (r > 0) {
    blit(drawClawd, { n: a > 2.4 ? 'taunt' : 'idle', t: lt }, 250, H + 60 - r * 240, 18, 1, { ol: SPR.C.ol });
    blit(drawGPT, { n: a > 2.4 ? 'taunt' : 'idle', t: lt }, W - 250, H + 120 - r * 240, 11, -1, { ol: SPR.G.ol });
  }
  // title letters
  const shake = a < .5 ? Math.sin(a * 80) * 16 * (1 - a / .5) : 0;
  ctx.save(); ctx.translate(shake, 0);
  const k1 = E.out3(clamp(a / .2)), k2 = E.out3(clamp((a - .25) / .2));
  if (k1 > 0) { ctx.save(); ctx.translate(W / 2, 250); ctx.scale(lerp(4, 1, k1), lerp(4, 1, k1)); ctx.globalAlpha = k1; bigText('AI', 0, 0, 170, ['#ffffff', '#c9f6ff', '#5ad7ff', '#2b6cff'], { ex: 18, ow: 10 }); ctx.restore(); }
  if (k2 > 0) { ctx.save(); ctx.translate(W / 2, 430); ctx.scale(lerp(4, 1, k2), lerp(4, 1, k2)); ctx.globalAlpha = k2; bigText('FIGHTER', 0, 0, 170, ['#ffffff', '#fff1a8', '#ffb03a', '#ff4d2e'], { ex: 18, ow: 10, ls: 14 }); ctx.restore(); }
  // shine sweep
  if (a > .7 && a < 1.3) { const sx = lerp(-200, W + 200, (a - .7) / .6); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(sx - 40, 120); ctx.lineTo(sx + 40, 120); ctx.lineTo(sx - 60, 540); ctx.lineTo(sx - 140, 540); ctx.fill(); ctx.restore(); }
  // stamp
  const k3 = clamp((a - .9) / .15);
  if (k3 > 0) { ctx.save(); ctx.translate(1450, 540); ctx.rotate(-.18); ctx.scale(lerp(3, 1, k3), lerp(3, 1, k3)); ctx.globalAlpha = k3; ctx.fillStyle = '#ff2b5e'; ctx.fillRect(-150, -42, 300, 84); ctx.fillStyle = '#fff'; ctx.fillRect(-142, -34, 284, 68); ctx.fillStyle = '#ff2b5e'; ctx.fillRect(-136, -28, 272, 56); T("'26 EDITION", 0, 2, 26, '#fff'); ctx.restore(); }
  ctx.restore();
  // subtitle
  if (a > 1.6) {
    const n = Math.floor((a - 1.6) * 28);
    const parts = [['CLAUDE', COL.cl], [' VS ', '#fff'], ['CHATGPT', COL.gpL]]; ctx.font = '52px P2P';
    const full = 'CLAUDE VS CHATGPT'; let x = W / 2 - ctx.measureText(full).width / 2, used = 0;
    for (const [s, c] of parts) { const v = s.slice(0, Math.max(0, n - used)); T(v, x, 650, 52, c, { a: 'left', ow: 5, ol: '#1a0533' }); ctx.font = '52px P2P'; x += ctx.measureText(s).width; used += s.length; }
  }
  if (a > 2.6 && a < 4.2 && Math.floor(a * 3.5) % 2 === 0) T('PRESS START', W / 2, 860, 40, '#fff', { ow: 4, ol: '#1a0533' });
  if (a >= 4.2) { const f = clamp((a - 4.2) / .2); T('PRESS START', W / 2, 860, 40, Math.floor(a * 20) % 2 ? COL.gold : '#fff', { ow: 4, ol: '#1a0533' }); }
  if (a < .1) { ctx.fillStyle = `rgba(255,255,255,${1 - a / .1})`; ctx.fillRect(0, 0, W, H); }
}
function coinSprite(x, y, al) {
  if (al <= 0) return; ctx.globalAlpha = clamp(al);
  ctx.fillStyle = '#b07b10'; ctx.fillRect(x - 33, y - 33, 66, 66); ctx.fillStyle = COL.gold; ctx.fillRect(x - 27, y - 27, 54, 54); T('$', x, y + 3, 32, '#b07b10');
  ctx.globalAlpha = 1;
}
function stripes(t, c1, c2) {
  ctx.fillStyle = c1; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = c2; const off = (t * 120) % 160;
  for (let x = -H - 160; x < W + 160; x += 160) { ctx.beginPath(); ctx.moveTo(x + off, 0); ctx.lineTo(x + off + 70, 0); ctx.lineTo(x + off + 70 + H, H); ctx.lineTo(x + off + H, H); ctx.fill(); }
}
function statBar(x, y, label, v, col, k) {
  T(label, x, y, 20, '#cfd2ff', { a: 'left' });
  for (let i = 0; i < 10; i++) { ctx.fillStyle = i < v * k ? col : '#2a2850'; ctx.fillRect(x + 180 + i * 30, y - 12, 24, 24); }
}
function drawSelect(lt) {
  if (lt < 4.5) {
    stripes(lt, '#0d0a26', '#130f33');
    bigText('SELECT YOUR AI', W / 2, 90, 64, ['#fff', '#ffe27a', '#ff9a3c'], { ex: 8, ow: 5 });
    // roster
    const tiles = ['C', '?', '?', '?', '?', 'G'];
    const tx0 = W / 2 - (6 * 130) / 2;
    tiles.forEach((tl, i) => {
      const x = tx0 + i * 130, y = 860;
      ctx.fillStyle = '#1c1946'; ctx.fillRect(x, y, 116, 116);
      if (tl === '?') T('?', x + 58, y + 60, 48, '#3f3a7a');
      else { ctx.save(); ctx.beginPath(); ctx.rect(x, y, 116, 116); ctx.clip(); if (tl === 'C') blit(drawClawd, { n: 'idle', t: lt }, x + 58, y + 112, 6, 1, { ol: SPR.C.ol }); else blit(drawGPT, { n: 'idle', t: lt }, x + 58, y + 150, 4, -1, { ol: SPR.G.ol }); ctx.restore(); }
    });
    // cursors
    const p1 = lt < .6 ? 2 : lt < 1.0 ? 1 : 0, p2 = lt < 1.5 ? 3 : lt < 2.0 ? 4 : 5;
    const cur = (i, col, lab, locked) => {
      const x = tx0 + i * 130, y = 860, bl = locked ? Math.floor(lt * 12) % 2 : 1;
      ctx.strokeStyle = bl ? col : '#fff'; ctx.lineWidth = 8; ctx.strokeRect(x - 6, y - 6, 128, 128);
      T(lab, x + 58, y - 26, 22, col, { ow: 3 });
    };
    cur(p1, COL.cl, '1P', lt > 1.4); cur(p2, COL.gp, '2P', lt > 2.5);
    // panels
    const panel = (id, L, lock, show) => {
      const x = L ? 80 : W - 80 - 760, y = 190;
      ctx.fillStyle = 'rgba(8,6,24,.85)'; ctx.fillRect(x, y, 760, 620);
      ctx.fillStyle = L ? COL.cl : COL.gp; ctx.fillRect(x, y, 760, 8); ctx.fillRect(x, y + 612, 760, 8);
      const k = clamp(show);
      if (k <= 0) { T('???', x + 380, y + 310, 60, '#3f3a7a'); return; }
      glow(L ? x + 200 : x + 560, y + 420, 260, L ? 'rgba(217,119,87,.5)' : 'rgba(16,163,127,.5)');
      if (id === 'C') blit(drawClawd, { n: lock ? 'taunt' : 'idle', t: lt }, x + 200, y + 560, 16, 1, { ol: SPR.C.ol });
      else blit(drawGPT, { n: lock ? 'taunt' : 'idle', t: lt }, x + 560, y + 590, 11, -1, { ol: SPR.G.ol });
      const sx = L ? x + 390 : x + 30;
      T(NAME[id], sx, y + 60, 44, L ? COL.clL : COL.gpL, { a: 'left', ow: 4, ol: '#1a0533' });
      T('HOME: SAN FRANCISCO', sx, y + 120, 16, '#fff', { a: 'left' });
      T(id === 'C' ? 'STYLE: HELPFUL+HONEST' : 'STYLE: SHIP IT FAST', sx, y + 152, 16, '#fff', { a: 'left' });
      T(id === 'C' ? 'SUPER: AD-FREE SHIELD' : 'SUPER: 900M USER RUSH', sx, y + 184, 16, COL.gold, { a: 'left' });
      const st = id === 'C' ? [['CODING', 10], ['SAFETY', 10], ['ADS', 0]] : [['USERS', 10], ['HYPE', 10], ['ADS', 6]];
      st.forEach(([l, v], i) => statBar(sx, y + 250 + i * 50, l, v, L ? COL.cl : COL.gp, k));
    };
    panel('C', true, lt > 1.4, (lt - .9) / .5);
    panel('G', false, lt > 2.5, (lt - 1.9) / .5);
    if (lt > 1.4 && lt < 1.5) { ctx.fillStyle = 'rgba(255,200,170,.5)'; ctx.fillRect(0, 0, W / 2, H); }
    if (lt > 2.5 && lt < 2.6) { ctx.fillStyle = 'rgba(170,255,230,.5)'; ctx.fillRect(W / 2, 0, W / 2, H); }
    if (lt > 3.3) { const a = lt - 3.3; T('GET READY...', W / 2, 820, 28, Math.floor(a * 8) % 2 ? '#fff' : COL.gold, { ow: 3 }); }
    return;
  }
  // VS splash
  const a = lt - 4.5, k = E.out3(clamp(a / .3));
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(-(1 - k) * W, 0);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W / 2 + 160, 0); ctx.lineTo(W / 2 - 160, H); ctx.lineTo(0, H); ctx.closePath();
  let g = ctx.createLinearGradient(0, 0, W / 2, H); g.addColorStop(0, '#5a1f0c'); g.addColorStop(1, COL.cl); ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  for (let i = 0; i < 30; i++) { ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(((rnd(i, 1) * 2400 + a * 1600) % 2400) - 400, rnd(i, 2) * H, 300, 6); }
  blit(drawClawd, { n: 'glare', t: lt }, 470 + a * 20, 900, 30, 1, { ol: SPR.C.ol });
  ctx.restore();
  T('CLAUDE', 120, 160, 80, '#fff', { a: 'left', ow: 7, ol: '#3a1206' });
  ctx.restore();
  ctx.save(); ctx.translate((1 - k) * W, 0);
  ctx.beginPath(); ctx.moveTo(W / 2 + 160, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H); ctx.lineTo(W / 2 - 160, H); ctx.closePath();
  g = ctx.createLinearGradient(W / 2, 0, W, H); g.addColorStop(0, '#04261d'); g.addColorStop(1, COL.gp); ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  for (let i = 0; i < 30; i++) { ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(W - (((rnd(i, 3) * 2400 + a * 1600) % 2400) - 400), rnd(i, 4) * H, 300, 6); }
  blit(drawGPT, { n: 'glare', t: lt }, W - 470 - a * 20, 1020, 19, -1, { ol: SPR.G.ol });
  ctx.restore();
  T('CHATGPT', W - 120, H - 160, 80, '#fff', { a: 'right', ow: 7, ol: '#02261c' });
  ctx.restore();
  // lightning seam
  if (a > .25) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 10; ctx.beginPath();
    const seed = Math.floor(a * 20);
    for (let i = 0; i <= 12; i++) { const y = i * H / 12; const x = lerp(W / 2 + 160, W / 2 - 160, i / 12) + (rnd(seed, i) - .5) * 60; ctx[i ? 'lineTo' : 'moveTo'](x, y); }
    ctx.stroke(); ctx.restore();
    const vk = E.elastic(clamp((a - .3) / .6));
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(vk, vk); ctx.rotate(-.08);
    bigText('VS', 0, 0, 260, ['#ffffff', '#ffe27a', '#ff3b1f'], { ex: 24, ow: 12 });
    ctx.restore();
  }
  if (a > 1.1) {
    const n = Math.floor((a - 1.1) * 30); const s = 'SAME CITY. SAME ROOTS. ONE CROWN.';
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, H - 90, W, 70);
    T(s.slice(0, n), W / 2, H - 54, 30, '#fff');
  }
  if (a < .08 && a > 0) { ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(0, 0, W, H); }
  if (a > .3 && a < .38) { ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(0, 0, W, H); }
}
function drawEnding(lt) {
  if (lt < 5.0) {
    // WINNER: THE USERS
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#120634'); g.addColorStop(1, '#3b0f5e'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(W / 2, 360); ctx.rotate(lt * .3);
    for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.fillStyle = 'rgba(255,220,120,.08)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1500, -150); ctx.lineTo(1500, 150); ctx.fill(); }
    ctx.restore();
    // jumping crowd
    for (let r = 0; r < 4; r++) for (let i = 0; i < 34; i++) {
      const s = 6 + r * 2, x = i * 60 + (r % 2) * 30 - 20, jump = Math.abs(Math.sin(lt * 8 + i * 1.3 + r)) * (lt > 1.6 ? 30 : 4), y = 860 + r * 60 - jump;
      ctx.fillStyle = CROWD[(i + r * 5) % CROWD.length]; ctx.fillRect(x - 1.8 * s, y - 6.5 * s, 3.6 * s, 4.6 * s);
      ctx.fillStyle = ['#f2c9a0', '#c98d5e', '#8a5a3c', '#f7dcc0'][(i + r) % 4]; ctx.fillRect(x - 1.4 * s, y - 9.6 * s, 2.8 * s, 2.8 * s);
      if (lt > 1.6) { ctx.fillRect(x - 3 * s, y - 11 * s, s, 4 * s); ctx.fillRect(x + 2 * s, y - 11 * s, s, 4 * s); }
    }
    // dizzy mascots
    blit(drawClawd, { n: 'dizzy', t: lt }, 420, 1010, 13, 1, { ol: SPR.C.ol });
    blit(drawGPT, { n: 'dizzy', t: lt }, 1500, 1010, 8, -1, { ol: SPR.G.ol });
    for (const [x, y] of [[420, 820], [1500, 700]]) for (let i = 0; i < 3; i++) { const an = lt * 5 + i * 2.1; ctx.fillStyle = COL.gold; starPath(x + Math.cos(an) * 90, y + Math.sin(an) * 22, 22, 9, 5, lt * 4); ctx.fill(); }
    T('WINNER...', W / 2, 200, 56, '#fff', { ow: 5, ol: '#1a0533', al: clamp(lt / .3) });
    if (lt > 1.6) {
      const k = E.elastic(clamp((lt - 1.6) / .7));
      ctx.save(); ctx.translate(W / 2, 360); ctx.scale(k, k);
      const hue = (lt * 200) % 360;
      bigText('THE USERS!', 0, 0, 120, [`hsl(${hue},100%,85%)`, `hsl(${(hue + 60) % 360},100%,65%)`, `hsl(${(hue + 120) % 360},100%,55%)`], { ex: 14, ow: 9 });
      ctx.restore();
      T('MORE CHOICE. BETTER MODELS. EVERYONE WINS.', W / 2, 480, 26, '#fff', { al: clamp((lt - 2.4) / .3) });
    }
    if (lt > 1.6 && lt < 1.7) { ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(0, 0, W, H); }
    confetti(lt - 1.6);
    return;
  }
  if (lt < 10.5) {
    const a = lt - 5.0;
    stripes(lt, '#0a0820', '#0f0c2c');
    bigText('BATTLE REPORT', W / 2, 140, 72, ['#fff', '#ffe27a', '#ff9a3c'], { ex: 8, ow: 6 });
    const rows = [
      ['ROUND 1', 'THE BIG GAME AD WAR', 'CLAUDE', COL.cl],
      ['ROUND 2', 'LAUNCH DAY', 'CHATGPT', COL.gpL],
      ['FINAL', 'THE IPO RACE', 'DOUBLE K.O.', COL.gold],
    ];
    rows.forEach(([r, n, w, c], i) => {
      const s = a - .4 - i * .6; if (s < 0) return;
      const k = E.out3(clamp(s / .3)), y = 320 + i * 130;
      ctx.save(); ctx.translate((1 - k) * -400, 0); ctx.globalAlpha = k;
      ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(220, y - 50, 1480, 100);
      ctx.fillStyle = c; ctx.fillRect(220, y - 50, 10, 100);
      T(r, 270, y, 30, '#9fa6ff', { a: 'left' }); T(n, 560, y, 30, '#fff', { a: 'left' });
      T(w, 1660, y, 34, c, { a: 'right', ow: 4, ol: '#1a0533' });
      ctx.restore();
      if (s >= 0 && s < .05) { ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(0, 0, W, H); }
    });
    if (a > 2.5) {
      const k = E.back(clamp((a - 2.5) / .4));
      ctx.save(); ctx.translate(W / 2, 800); ctx.scale(k, k);
      T('FINAL SCORE', 0, -70, 30, '#cfd2ff');
      bigText('1  -  1', 0, 10, 110, ['#fff', '#ffe27a', '#ff9a3c'], { ex: 12, ow: 8 });
      T('DRAW', 0, 110, 48, COL.gold, { ow: 5, ol: '#1a0533' });
      ctx.restore();
      blit(drawClawd, { n: 'glare', t: lt }, 420, 900, 11, 1, { ol: SPR.C.ol });
      blit(drawGPT, { n: 'glare', t: lt }, 1500, 900, 7, -1, { ol: SPR.G.ol });
    }
    return;
  }
  const a = lt - 10.5;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (a < 2.4) {
    T('CONTINUE?', W / 2, 330, 80, '#fff', { ow: 6, ol: '#301050' });
    const n = 9 - Math.floor(a / .45);
    const k = (a % .45) / .45;
    ctx.save(); ctx.translate(W / 2, 600); ctx.scale(lerp(1.4, 1, E.out3(clamp(k / .3))), lerp(1.4, 1, E.out3(clamp(k / .3))));
    bigText(String(n), 0, 0, 260, ['#fff', '#ffe27a', '#ff3b1f'], { ex: 20, ow: 10 });
    ctx.restore();
    blit(drawClawd, { n: 'idle', t: lt }, 420, 1000, 10, 1, { ol: SPR.C.ol });
    blit(drawGPT, { n: 'idle', t: lt }, 1500, 1000, 6, -1, { ol: SPR.G.ol });
    return;
  }
  const b = a - 2.4;
  synthBG(lt);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 0, W, H);
  const k = E.out3(clamp(b / .5));
  blit(drawClawd, { n: b > 1.2 ? 'taunt' : 'glare', t: lt }, lerp(-200, 640, k), 980, 18, 1, { ol: SPR.C.ol });
  blit(drawGPT, { n: b > 1.2 ? 'taunt' : 'glare', t: lt }, lerp(W + 200, 1280, k), 990, 11, -1, { ol: SPR.G.ol });
  const k2 = E.back(clamp((b - .4) / .4));
  ctx.save(); ctx.translate(W / 2, 230); ctx.scale(k2, k2);
  bigText('TO BE CONTINUED...', 0, 0, 84, ['#ffffff', '#fff1a8', '#ffb03a', '#ff4d2e'], { ex: 10, ow: 7 });
  ctx.restore();
  if (b > 1.0) T('THE RIVALRY CONTINUES IN 2027', W / 2, 340, 26, '#fff', { ow: 3, al: clamp((b - 1) / .3) });
  if (b > 1.4 && Math.floor(b * 3) % 2 === 0) T('INSERT COIN', W / 2, 470, 40, COL.gold, { ow: 4, ol: '#1a0533' });
  T('A FAN-MADE PARODY. NOT AFFILIATED WITH OPENAI OR ANTHROPIC.', W / 2, H - 40, 16, 'rgba(255,255,255,.7)');
}
function confetti(a) {
  if (a < 0) return;
  for (let i = 0; i < 140; i++) {
    const st = rnd(i, 5) * 1.5; if (a < st) continue;
    const t = a - st, x = rnd(i, 6) * W + Math.sin(t * 3 + i) * 40, y = -30 + t * (220 + rnd(i, 7) * 260);
    if (y > H) continue;
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 6 + i);
    ctx.fillStyle = CROWD[i % CROWD.length]; ctx.fillRect(-9, -5, 18, 10 * Math.abs(Math.cos(t * 7 + i)) + 2);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- layout
let ROUNDS, SCENES, EV = [], CUES = [], SCENE_META = {};
function layout() {
  STAGE.stadium = buildStadium(); STAGE.lab = buildLab(); STAGE.street = buildStreet();
  ROUNDS = [buildR1(), buildR2(), buildR3()];
  // who won each round, and when (for HUD round pips)
  ROUNDS[0].winner = 'C'; ROUNDS[0].koT = 13.15;
  ROUNDS[1].winner = 'G'; ROUNDS[1].koT = 16.43;
  SCENES = []; let t = 0;
  const add = (name, dur, draw, extra = {}) => { const s = { name, t0: t, t1: t + dur, draw, ...extra }; SCENES.push(s); SCENE_META[name] = s; t += dur; return s; };
  const title = add('title', 6.2, lt => drawTitle(lt));
  EV.push({ t: 1.0, s: 'coin', v: 1 }, { t: 1.45, s: 'slam', v: 1 }, { t: 1.7, s: 'slam', v: 1 }, { t: 2.35, s: 'stamp', v: .9 }, { t: 5.65, s: 'start', v: 1 });
  for (let i = 0; i < 17; i++) EV.push({ t: 1.45 + 1.6 + i / 28, s: 'blipT', v: .3 });
  CUES.push({ t: 1.45, c: 'title' });
  const sel = add('select', 7.6, lt => drawSelect(lt));
  CUES.push({ t: sel.t0, c: 'select' });
  EV.push({ t: sel.t0 + .6, s: 'move', v: .7 }, { t: sel.t0 + 1.0, s: 'move', v: .7 }, { t: sel.t0 + 1.4, s: 'lock', v: 1 },
    { t: sel.t0 + 1.5, s: 'move', v: .7 }, { t: sel.t0 + 2.0, s: 'move', v: .7 }, { t: sel.t0 + 2.5, s: 'lock', v: 1 },
    { t: sel.t0 + 4.5, s: 'whoosh', v: 1 }, { t: sel.t0 + 4.8, s: 'vs', v: 1 });
  for (const R of ROUNDS) {
    const sc = add('round' + R.n, R.dur, lt => drawRound(R, lt), { R });
    R.t0 = sc.t0;
    CUES.push({ t: sc.t0, c: 'stop' });
    EV.push({ t: sc.t0 + .2, s: 'roundcard', v: 1 }, { t: sc.t0 + 1.9, s: 'fight', v: 1 });
    CUES.push({ t: sc.t0 + 1.9, c: 'fight' + R.n });
    for (const e of R.ev) {
      const g = sc.t0 + R.card + R.toReal(e.t);
      if (e.s === 'musicstop') { CUES.push({ t: g, c: 'stop' }); continue; }
      if (e.s === 'jingle') { CUES.push({ t: g, c: 'jingle' }); continue; }
      EV.push({ ...e, t: g });
    }
  }
  const end = add('ending', 16.5, lt => drawEnding(lt));
  CUES.push({ t: end.t0, c: 'ending' });
  EV.push({ t: end.t0 + 1.6, s: 'fanfare', v: 1 }, { t: end.t0 + 1.6, s: 'crowd', v: .8, d: 3 });
  [0, .6, 1.2].forEach(d => EV.push({ t: end.t0 + 5.4 + d, s: 'lock', v: .8 }));
  EV.push({ t: end.t0 + 7.5, s: 'slam', v: 1 });
  for (let i = 0; i < 6; i++) EV.push({ t: end.t0 + 10.5 + i * .45, s: 'tick', v: .8 });
  EV.push({ t: end.t0 + 12.9, s: 'stamp', v: 1 });
  // R1 crowd ambience
  EV.push({ t: ROUNDS[0].t0 + .1, s: 'crowd', v: .45, d: ROUNDS[0].dur - .2 });
  EV.push({ t: ROUNDS[0].t0 + ROUNDS[0].card + ROUNDS[0].toReal(13.15), s: 'crowd', v: .9, d: 4 });
  EV.sort((a, b) => a.t - b.t); CUES.sort((a, b) => a.t - b.t);
  return t;
}

// ---------------------------------------------------------------- post + main
let POST;
function buildPost() {
  const c = mk(W, H), g = c.getContext('2d');
  for (let y = 0; y < H; y += 4) { g.fillStyle = 'rgba(0,0,0,.10)'; g.fillRect(0, y + 2, W, 2); }
  const v = g.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, H * 1.05);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  return c;
}
function wipe(p) {
  const C = 96; ctx.fillStyle = '#000';
  for (let y = 0; y < H; y += C) for (let x = 0; x < W; x += C) {
    const d = (x / W + y / H) / 2; const s = clamp(p * 2 - d) * C * 1.02;
    if (s > 0) ctx.fillRect(x + C / 2 - s / 2, y + C / 2 - s / 2, s, s);
  }
}
let DURATION = 0;
function renderAt(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const sc = SCENES.find(s => t >= s.t0 && t < s.t1) || SCENES[SCENES.length - 1];
  ctx.save(); sc.draw(Math.min(t - sc.t0, sc.t1 - sc.t0 - 1e-6)); ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  for (const s of SCENES) { if (s.t0 === 0 || s.name === 'title') continue; const d = t - s.t0; if (Math.abs(d) < .3) wipe(1 - Math.abs(d) / .3); }
  ctx.drawImage(POST, 0, 0);
  const fo = clamp((t - (DURATION - .8)) / .8); if (fo > 0) { ctx.fillStyle = `rgba(0,0,0,${fo})`; ctx.fillRect(0, 0, W, H); }
}
async function init() {
  await Promise.all(['32px P2P', '32px Silk', '32px SilkB'].map(f => document.fonts.load(f)));
  POST = buildPost();
  DURATION = layout();
  window.META = { duration: DURATION, fps: FPS, events: EV, cues: CUES, scenes: SCENES.map(s => ({ name: s.name, t0: s.t0, t1: s.t1 })) };
  window.renderAt = renderAt;
  const q = new URLSearchParams(location.search);
  if (q.has('t')) { renderAt(parseFloat(q.get('t'))); }
  else if (!q.has('render')) {
    const start = performance.now();
    const loop = () => { const t = ((performance.now() - start) / 1000) % DURATION; renderAt(t); requestAnimationFrame(loop); };
    loop();
  }
  window.READY = true;
}
init();
