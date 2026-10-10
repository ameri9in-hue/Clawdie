'use strict';
// CLAWD'S DAY - engine: low-res pixel buffers, Clawd sprites, actor scripts,
// shared scenery. Every frame is a pure function of time, so the film can be
// rendered offline frame by frame (render.js) or previewed live.

const W = 1920, H = 1080, FPS = 30;
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ---------------------------------------------------------------- utils
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').imageSmoothingEnabled = false; return c; };
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const fr = x => x - Math.floor(x);
const E = {
  in: t => t * t,
  out: t => 1 - (1 - t) * (1 - t),
  io: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};
function rnd(a, b = 0) {
  let t = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + 0x9E3779B9) | 0;
  t = Math.imul(t ^ (t >>> 15), 2246822519); t = Math.imul(t ^ (t >>> 13), 3266489917); t ^= t >>> 16;
  return (t >>> 0) / 4294967296;
}
const pick = (arr, s1, s2 = 0) => arr[Math.floor(rnd(s1, s2) * arr.length)];
const hx = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
function mixc(a, b, t) {
  const A = hx(a), B = hx(b); t = clamp(t);
  return '#' + [0, 1, 2].map(i => Math.round(lerp(A[i], B[i], t)).toString(16).padStart(2, '0')).join('');
}
// global time of the frame being drawn (for twinkles etc.)
let TG = 0;

// ---------------------------------------------------------------- full-res text
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
function gradV(y0, y1, stops) { const gr = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); return gr; }
function bigText(s, x, y, size, stops, o = {}) {
  ctx.font = `${size}px ${o.f || 'P2P'}`; ctx.textAlign = o.a || 'center'; ctx.textBaseline = 'middle';
  ctx.letterSpacing = (o.ls || 0) + 'px';
  const ex = o.ex ?? Math.round(size / 12), ow = o.ow ?? Math.round(size / 16);
  ctx.fillStyle = o.exc || '#2a0f05';
  for (let i = ex; i > 0; i -= 2) for (let dx = -ow; dx <= ow; dx += ow) ctx.fillText(s, x + dx, y + i + ow);
  ctx.fillStyle = o.ol || '#2a0f05';
  for (let dx = -ow; dx <= ow; dx += ow) for (let dy = -ow; dy <= ow; dy += ow) ctx.fillText(s, x + dx, y + dy);
  ctx.fillStyle = gradV(y - size / 2, y + size / 2, stops); ctx.fillText(s, x, y);
  ctx.letterSpacing = '0px';
}
function pbox(x, y, w, h, fill, border = '#000', b = 6) {
  ctx.fillStyle = border;
  ctx.fillRect(x + b, y, w - 2 * b, h); ctx.fillRect(x, y + b, w, h - 2 * b);
  ctx.fillStyle = fill;
  ctx.fillRect(x + b, y + b, w - 2 * b, h - 2 * b);
}

// ---------------------------------------------------------------- low-res pixel target
// Scenes draw into a small buffer (PX screen pixels per art pixel) that is
// blown up with nearest-neighbour scaling, so everything is crisp pixel art.
const BUF = {}; for (const p of [2, 3, 4]) BUF[p] = mk(W / p, H / p);
let g = BUF[4].getContext('2d'), PX = 4, LW = 480, LH = 270, LABELS = [], LYO = 0;
function begin(px) {
  PX = px; const c = BUF[px]; g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.imageSmoothingEnabled = false;
  LW = c.width; LH = c.height; g.clearRect(0, 0, LW, LH); LABELS = []; LYO = 0;
}
function finish() {
  ctx.drawImage(BUF[PX], 0, 0, W, H);
  for (const l of LABELS) T(l[0], l[1] * PX, l[2] * PX, l[3], l[4], l[5]);
}
// text drawn at full resolution on top, positioned in art pixels
const label = (s, x, y, size, color, o = {}) => LABELS.push([s, x, y + LYO, size, color, o]);

function R(x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function disc(cx, cy, r, c, sy = 1) {
  g.fillStyle = c; cx = Math.round(cx); cy = Math.round(cy);
  const ry = Math.max(0, Math.round(r * sy));
  if (ry === 0) { g.fillRect(cx - Math.round(r), cy, Math.round(r) * 2 + 1, 1); return; }
  for (let dy = -ry; dy <= ry; dy++) {
    const w = Math.round(Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)) * r);
    g.fillRect(cx - w, cy + dy, w * 2 + 1, 1);
  }
}
function bands(y0, y1, c0, c1, n = 14) {
  const h = (y1 - y0) / n;
  for (let i = 0; i < n; i++) R(0, y0 + Math.floor(i * h), LW, Math.ceil(h) + 1, mixc(c0, c1, i / (n - 1)));
}
function line(x0, y0, x1, y1, c, th = 1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) R(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, th, th, c);
}
function glowAt(x, y, r, color, a = 1) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.fillStyle = gr;
  g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
}
function shade(a, c = '#000') { g.save(); g.globalAlpha = a; R(0, 0, LW, LH, c); g.restore(); }

// ---------------------------------------------------------------- sky
const SKY = [
  [0, '#070a22', '#151a45'], [4.5, '#10153a', '#2a2a5c'], [5.5, '#33377a', '#b77796'], [6.3, '#6a87cc', '#ffbf96'],
  [7.4, '#62b0ee', '#ffe0ba'], [10, '#4cacf0', '#c6ecff'], [15, '#47a3ec', '#d0f0ff'], [17, '#5c9cdc', '#ffdca6'],
  [18.4, '#5a4b9c', '#ff9860'], [19.4, '#2c2668', '#d05d78'], [20.5, '#131744', '#3a2f68'], [22, '#070a22', '#151a45'], [24.01, '#070a22', '#151a45'],
];
function skyAt(h) {
  h = ((h % 24) + 24) % 24;
  let i = 0; while (i < SKY.length - 2 && SKY[i + 1][0] <= h) i++;
  const a = SKY[i], b = SKY[i + 1], k = (h - a[0]) / (b[0] - a[0]);
  return [mixc(a[1], b[1], k), mixc(a[2], b[2], k)];
}
const dayness = h => h < 5 ? 0 : h < 7.2 ? (h - 5) / 2.2 : h < 17.5 ? 1 : h < 20.5 ? 1 - (h - 17.5) / 3 : 0;
const starA = h => h < 5 ? 1 : h < 6.3 ? 1 - (h - 5) / 1.3 : h < 19.2 ? 0 : h < 21 ? (h - 19.2) / 1.8 : 1;
function drawSky(h, y1, o = {}) {
  const [a, b] = skyAt(h); bands(0, y1, a, b, 18);
  const sa = starA(h);
  if (sa > 0) {
    for (let i = 0; i < 160; i++) {
      const x = Math.floor(rnd(i, 11) * LW), y = Math.floor(rnd(i, 12) * y1 * .92);
      const tw = .55 + .45 * Math.sin(TG * (1.5 + rnd(i, 13) * 3) + i);
      g.globalAlpha = sa * tw * (.5 + rnd(i, 14) * .5);
      R(x, y, 1, 1, '#fff');
      if (rnd(i, 15) < .08) { R(x - 1, y, 3, 1, '#fff'); R(x, y - 1, 1, 3, '#fff'); }
    }
    g.globalAlpha = 1;
  }
  // sun travels left -> right across the day
  if (!o.noSun && h > 5.4 && h < 19.8) {
    const k = (h - 5.6) / 13.8, sx = LW * (.06 + .88 * k), sy = y1 - Math.sin(Math.PI * clamp(k)) * y1 * .78 + 8;
    const col = h < 7 || h > 17.6 ? '#ffb347' : '#fff3a0';
    glowAt(sx, sy, LW * .09, h < 7 || h > 17.6 ? 'rgba(255,140,60,.55)' : 'rgba(255,240,170,.45)');
    disc(sx, sy, Math.round(LW / 48), col);
  }
  if (!o.noMoon && (h > 19.5 || h < 6)) {
    const k = h > 12 ? (h - 19.5) / 10 : (h + 4.5) / 10;
    const mx = o.moonX ?? LW * (.15 + .7 * k), my = o.moonY ?? y1 * (.45 - Math.sin(Math.PI * clamp(k)) * .3);
    const r = Math.round(LW / 40);
    glowAt(mx, my, r * 4, 'rgba(200,210,255,.25)');
    disc(mx, my, r, '#f4f1dc');
    disc(mx - r * .35, my - r * .2, r * .22, '#dcd7bd'); disc(mx + r * .3, my + r * .35, r * .15, '#dcd7bd');
  }
}
function cloud(x, y, s, c = '#ffffff', a = 1) {
  g.globalAlpha = a;
  disc(x, y, 6 * s, c, .6); disc(x + 7 * s, y - 3 * s, 7 * s, c, .7); disc(x + 15 * s, y, 6 * s, c, .6); R(x - 2 * s, y, 22 * s, 3 * s, c);
  g.globalAlpha = 1;
}
function clouds(h, n, y0, y1, speed, seed) {
  const c = mixc('#5a5f8a', '#ffffff', dayness(h)), a = .35 + .55 * dayness(h);
  for (let i = 0; i < n; i++) {
    const s = 1 + Math.floor(rnd(i, seed) * 2);
    const x = ((rnd(i, seed + 1) * (LW + 120) + TG * speed * (.5 + rnd(i, seed + 2))) % (LW + 120)) - 60;
    cloud(x, lerp(y0, y1, rnd(i, seed + 3)), s, c, a);
  }
}
function hills(y, amp, freq, seed, c) {
  for (let x = 0; x < LW; x += 2) {
    const hy = y + Math.round(Math.sin((x + seed * 97) * freq) * amp + Math.sin((x + seed * 31) * freq * 2.7) * amp * .35);
    R(x, hy, 2, LH - hy, c);
  }
}
function tree(x, gy, s = 1, c1 = '#3e9b4f', c2 = '#2c7a3c', tr = '#7a4b2a') {
  R(x - 2 * s, gy - 14 * s, 4 * s, 14 * s, tr);
  disc(x, gy - 22 * s, 10 * s, c2); disc(x - 6 * s, gy - 16 * s, 7 * s, c2); disc(x + 6 * s, gy - 16 * s, 7 * s, c2);
  disc(x - 2 * s, gy - 24 * s, 7 * s, c1); disc(x - 7 * s, gy - 18 * s, 4 * s, c1);
}
function grassTufts(y0, y1, n, seed, c) {
  for (let i = 0; i < n; i++) {
    const x = Math.floor(rnd(i, seed) * LW), y = Math.floor(lerp(y0, y1, rnd(i, seed + 1)));
    R(x, y, 1, 2, c); R(x + 2, y - 1, 1, 3, c); R(x + 4, y, 1, 2, c);
  }
}

// ---------------------------------------------------------------- Clawd sprites
// Clawd is drawn into a small buffer (facing right), outlined, cached, and
// stamped into the scene. Anchor (SAX,SAY) is the point between the feet.
const SW = 38, SH = 34, SAX = 19, SAY = 31;
const CL = { O: '#D97757', D: '#B5603F', L: '#F3A889', K: '#1b1210', OL: '#2b130a', blush: '#ef6a6a' };
const sbuf = mk(SW, SH), sgc = sbuf.getContext('2d');
const SPRITES = new Map();
function sp(x, y, w, h, c) { sgc.fillStyle = c; sgc.fillRect(x, y, w, h); }
function paintClawd(o) {
  const { O, D, L, K } = CL;
  const f = o.f || 0;
  let bw = 14, bh = 8, lean = 0, bob = 0, legs = 'stand', arms = 'side', lh = 3, eyes = o.eyes || 'norm';
  let lxs = null;
  switch (o.pose) {
    case 'stand': bob = f % 2; break;
    case 'walk': legs = f % 2 ? 'wA' : 'wB'; bob = f % 2; break;
    case 'run': legs = f % 2 ? 'wA' : 'wB'; lean = 1; arms = 'back'; break;
    case 'jump': legs = 'tuck'; arms = 'up'; break;
    case 'cheer': arms = 'up'; bob = f % 2; if (!o.eyes) eyes = 'happy'; break;
    case 'wave': arms = f % 2 ? 'waveA' : 'waveB'; break;
    case 'jack': if (f % 2) { arms = 'up'; lxs = [-1, 1, bw - 2, bw]; } else { arms = 'low'; lxs = [2, 4, bw - 5, bw - 3]; } break;
    case 'squat': if (f % 2) { lh = 1; } arms = 'fwd2'; break;
    case 'sit': lh = 0; bob = f % 2; break;
    case 'sleep': lh = 0; bh = 7; arms = 'none'; if (!o.eyes) eyes = 'closed'; bob = f % 2; break;
    case 'type': arms = f % 2 ? 'typeA' : 'typeB'; break;
    case 'sittype': lh = 0; arms = f % 2 ? 'typeA' : 'typeB'; break;
    case 'carry': arms = 'hold'; legs = o.walk ? (f % 2 ? 'wA' : 'wB') : 'stand'; break;
    case 'push': lean = 1; arms = 'fwd'; legs = f % 2 ? 'wA' : 'wB'; break;
    case 'pat': arms = f % 2 ? 'fwd' : 'fwdUp'; lh = 1; break;
    case 'stretch': bh = f % 2 ? 9 : 8; arms = 'hold'; if (!o.eyes) eyes = 'closed'; break;
    case 'dance': {
      const q = f % 4;
      if (q === 0) { lean = -1; arms = 'waveB'; } else if (q === 1) { bob = 1; arms = 'side'; } else if (q === 2) { lean = 1; arms = 'waveA'; } else { arms = 'up'; }
      if (!o.eyes) eyes = 'happy'; break;
    }
    case 'splat': bw = 16; bh = 5; lh = 0; legs = 'splay'; arms = 'splay'; if (!o.eyes) eyes = 'x'; break;
    case 'point': arms = 'point'; break;
    case 'hold': arms = 'fwd'; bob = f % 2; break;
    case 'sithold': arms = 'fwd'; lh = 0; bob = f % 2; break;
    case 'eat': lh = o.stand ? 3 : 0; arms = f % 2 ? 'fwd' : 'mouth'; if (!o.eyes) eyes = 'happy'; break;
    case 'bang': arms = f % 2 ? 'fwdUp' : 'fwd'; bob = f % 2; break;
    case 'swim': arms = f % 2 ? 'waveA' : 'waveB'; break;
    case 'surf': arms = 'splay'; lh = 2; break;
    case 'drum': lh = 0; arms = f % 2 ? 'drumA' : 'drumB'; break;
    case 'strum': lh = o.stand ? 3 : 0; arms = 'strum'; bob = f % 2; break;
    case 'lie': lh = 0; bh = 6; bw = 15; arms = 'none'; legs = 'none'; if (!o.eyes) eyes = 'closed'; break;
  }
  const x0 = SAX - Math.floor(bw / 2) + lean;
  let y0 = SAY - lh - bh + bob; if (legs === 'tuck') y0 = SAY - 1 - bh;
  if (!lxs) lxs = [1, 3, bw - 4, bw - 2];
  // legs
  if (legs !== 'splay' && legs !== 'none' && lh > 0) {
    for (let i = 0; i < 4; i++) {
      let h = SAY - (y0 + bh);
      if (legs === 'tuck') h = 1;
      if (legs === 'wA' && i % 2 === 0) h -= 1;
      if (legs === 'wB' && i % 2 === 1) h -= 1;
      if (h > 0) sp(x0 + lxs[i], y0 + bh, 1, h, O);
    }
  }
  if (legs === 'splay') { sp(x0 - 2, y0 + bh - 2, 2, 1, O); sp(x0 - 3, y0 + bh - 1, 3, 1, O); sp(x0 + bw, y0 + bh - 2, 2, 1, O); sp(x0 + bw, y0 + bh - 1, 3, 1, O); }
  // back arm
  const A = (x, y, w, h) => sp(x, y, w, h, O);
  switch (arms) {
    case 'side': case 'fwd': case 'fwd2': case 'waveA': case 'waveB': case 'point': case 'back': case 'fwdUp': case 'mouth': A(x0 - 2, y0 + 3, 2, 2); break;
    case 'up': A(x0 - 2, y0 - 3, 2, 5); break;
    case 'hold': A(x0 - 2, y0 - 5, 2, 7); break;
    case 'low': A(x0 - 2, y0 + 5, 2, 2); break;
    case 'splay': A(x0 - 3, y0 + 1, 3, 2); break;
    case 'drumA': A(x0 - 2, y0 + 2, 2, 2); break;
    case 'drumB': A(x0 - 2, y0 + 4, 2, 2); break;
  }
  if (arms === 'back') A(x0 - 4, y0 + 3, 2, 2);
  // body
  sp(x0, y0, bw, bh, O);
  sp(x0, y0 + bh - 1, bw, 1, D);
  sp(x0 + 1, y0, 5, 1, L); sp(x0, y0 + 1, 1, 2, L);
  if (o.pose === 'lie') { sp(x0 + 2, y0 + bh - 1, 1, 1, O); }
  // front arm
  const xr = x0 + bw;
  switch (arms) {
    case 'side': A(xr, y0 + 3, 2, 2); break;
    case 'up': A(xr, y0 - 3, 2, 5); break;
    case 'hold': A(xr, y0 - 5, 2, 7); break;
    case 'low': A(xr, y0 + 5, 2, 2); break;
    case 'fwd': A(xr, y0 + 3, 4, 2); break;
    case 'fwd2': A(xr, y0 + 3, 3, 2); A(x0 - 4, y0 + 3, 2, 2); break;
    case 'fwdUp': A(xr, y0 + 1, 2, 2); A(xr + 2, y0, 2, 2); break;
    case 'mouth': A(xr - 1, y0 + 4, 2, 2); break;
    case 'back': A(xr, y0 + 3, 2, 2); break;
    case 'waveA': A(xr, y0 - 3, 2, 5); break;
    case 'waveB': A(xr, y0 + 1, 2, 2); A(xr + 1, y0 - 1, 2, 2); break;
    case 'typeA': A(xr, y0 + 4, 3, 2); break;
    case 'typeB': A(xr, y0 + 3, 3, 1); A(xr + 2, y0 + 4, 1, 1); break;
    case 'point': A(xr, y0 + 1, 2, 2); A(xr + 2, y0 - 1, 2, 2); A(xr + 4, y0 - 3, 2, 2); break;
    case 'splay': A(xr, y0 + 1, 3, 2); break;
    case 'drumA': A(xr, y0 + 4, 3, 2); break;
    case 'drumB': A(xr, y0 + 2, 3, 2); break;
    case 'strum': A(xr - 3, y0 + 5 + (f % 2), 3, 2); break;
  }
  // eyes
  const ey = y0 + (bh <= 6 ? 1 : 2);
  for (const [e, side] of [[x0 + 3, 0], [x0 + bw - 4, 1]]) {
    switch (eyes) {
      case 'norm': sp(e, ey, 1, 2, K); break;
      case 'look': sp(e + 1, ey, 1, 2, K); break;
      case 'up': sp(e + 1, ey - 1, 1, 2, K); break;
      case 'blink': sp(e, ey + 1, 1, 1, K); break;
      case 'closed': sp(side ? e : e - 1, ey + 1, 2, 1, K); break;
      case 'happy': sp(e - 1, ey + 1, 1, 1, K); sp(e, ey, 1, 1, K); sp(e + 1, ey + 1, 1, 1, K); break;
      case 'x': sp(e - 1, ey - 1, 1, 1, K); sp(e + 1, ey - 1, 1, 1, K); sp(e, ey, 1, 1, K); sp(e - 1, ey + 1, 1, 1, K); sp(e + 1, ey + 1, 1, 1, K); break;
      case 'wide': sp(e, ey - 1, 1, 3, K); break;
      case 'heart': sp(e - 1, ey - 1, 1, 1, '#ff3d7f'); sp(e + 1, ey - 1, 1, 1, '#ff3d7f'); sp(e - 1, ey, 3, 1, '#ff3d7f'); sp(e, ey + 1, 1, 1, '#ff3d7f'); break;
      case 'star': sp(e, ey - 1, 1, 3, '#fff6a0'); sp(e - 1, ey, 3, 1, '#fff6a0'); break;
      case 'angry': sp(e, ey, 1, 2, K); sp(side ? e - 1 : e + 1, ey - 1, 1, 1, K); break;
      case 'none': break;
    }
  }
  if (o.mouth === 'o') sp(x0 + Math.floor(bw / 2) - 1, ey + 3, 2, 2, K);
  if (o.mouth === 'smile') { sp(x0 + Math.floor(bw / 2) - 2, ey + 3, 1, 1, K); sp(x0 + Math.floor(bw / 2) - 1, ey + 4, 2, 1, K); sp(x0 + Math.floor(bw / 2) + 1, ey + 3, 1, 1, K); }
  if (o.blush && eyes !== 'none') { sp(x0 + 1, ey + 2, 2, 1, CL.blush); sp(x0 + bw - 3, ey + 2, 2, 1, CL.blush); }
  // accessories
  const acc = o.acc ? (Array.isArray(o.acc) ? o.acc : [o.acc]) : [];
  for (const a of acc) paintAcc(a, x0, y0, bw, ey, eyes === 'none');
  if (o.hold) paintItem(o.hold, arms, x0, y0, bw, f, o.ic);
}
function paintAcc(a, x0, y0, bw, ey, back) {
  const m = x0 + Math.floor(bw / 2);
  switch (a) {
    case 'nightcap':
      sp(x0 + 1, y0 - 1, 12, 1, '#eef1ff'); sp(x0 + 3, y0 - 2, 9, 1, '#4d6fd6'); sp(x0 + 5, y0 - 3, 7, 1, '#4d6fd6');
      sp(x0 + 8, y0 - 4, 5, 1, '#4d6fd6'); sp(x0 + 12, y0 - 3, 2, 1, '#4d6fd6'); sp(x0 + 6, y0 - 3, 1, 1, '#90a8ff'); sp(x0 + 14, y0 - 2, 2, 2, '#ffffff'); break;
    case 'chef':
      sp(x0 + 3, y0 - 2, 8, 2, '#f3f5fa'); sp(x0 + 2, y0 - 5, 10, 3, '#ffffff'); sp(x0 + 3, y0 - 6, 8, 1, '#ffffff');
      sp(x0 + 1, y0 - 4, 1, 2, '#ffffff'); sp(x0 + 12, y0 - 4, 1, 2, '#ffffff'); sp(x0 + 3, y0 - 1, 8, 1, '#d5dae6'); break;
    case 'hard':
      sp(x0, y0 - 1, bw, 1, '#d99a16'); sp(x0 + 2, y0 - 3, bw - 4, 2, '#ffc531'); sp(x0 + 4, y0 - 4, bw - 8, 1, '#ffc531'); break;
    case 'party':
      sp(m - 3, y0 - 1, 7, 1, '#ff5fa2'); sp(m - 2, y0 - 2, 5, 1, '#ffe14d'); sp(m - 1, y0 - 3, 3, 1, '#ff5fa2'); sp(m, y0 - 4, 1, 1, '#ffe14d'); sp(m, y0 - 5, 1, 1, '#ffffff'); break;
    case 'party2':
      sp(m - 3, y0 - 1, 7, 1, '#4fc3ff'); sp(m - 2, y0 - 2, 5, 1, '#b6ff5a'); sp(m - 1, y0 - 3, 3, 1, '#4fc3ff'); sp(m, y0 - 4, 1, 1, '#b6ff5a'); sp(m, y0 - 5, 1, 1, '#ffffff'); break;
    case 'phones':
      sp(x0 + 1, y0 - 2, bw - 2, 1, '#30343c'); sp(x0, y0 - 1, 1, 2, '#30343c'); sp(x0 + bw - 1, y0 - 1, 1, 2, '#30343c');
      sp(x0 - 2, y0 + 1, 2, 4, '#7c5cff'); sp(x0 + bw, y0 + 1, 2, 4, '#7c5cff'); break;
    case 'shades':
      if (back) break;
      sp(x0 + 2, ey, bw - 4, 1, CL.K); sp(x0 + 2, ey, 4, 2, CL.K); sp(x0 + bw - 6, ey, 4, 2, CL.K); sp(x0 + 3, ey, 1, 1, '#8a8aa0'); sp(x0 + bw - 5, ey, 1, 1, '#8a8aa0'); break;
    case 'crown':
      sp(x0 + 3, y0 - 2, 8, 2, '#ffd23f'); sp(x0 + 3, y0 - 4, 1, 2, '#ffd23f'); sp(x0 + 6, y0 - 4, 2, 2, '#ffd23f'); sp(x0 + 10, y0 - 4, 1, 2, '#ffd23f'); sp(x0 + 6, y0 - 2, 2, 1, '#e8403b'); break;
    case 'cap':
      sp(x0 + 2, y0 - 2, 9, 2, '#e2423b'); sp(x0 + 3, y0 - 3, 7, 1, '#e2423b'); sp(x0 + 11, y0 - 1, 5, 1, '#a8261f'); sp(x0 + 5, y0 - 2, 2, 1, '#ffffff'); break;
    case 'cap2':
      sp(x0 + 2, y0 - 2, 9, 2, '#2f6fe0'); sp(x0 + 3, y0 - 3, 7, 1, '#2f6fe0'); sp(x0 + 11, y0 - 1, 5, 1, '#1d4aa0'); break;
    case 'beanie':
      sp(x0 + 1, y0 - 2, bw - 2, 2, '#3fa36b'); sp(x0 + 3, y0 - 4, bw - 6, 2, '#3fa36b'); sp(x0 + 1, y0 - 1, bw - 2, 1, '#7ad19c'); sp(m - 1, y0 - 6, 2, 2, '#ffffff'); break;
    case 'band':
      sp(x0, y0, bw, 1, '#ff4a4a'); sp(x0 - 1, y0 + 1, 2, 1, '#ff4a4a'); break;
    case 'bow':
      sp(x0 + 9, y0 - 2, 2, 2, '#ff6fb1'); sp(x0 + 12, y0 - 2, 2, 2, '#ff6fb1'); sp(x0 + 11, y0 - 1, 1, 1, '#d63f86'); break;
    case 'tophat':
      sp(x0 + 1, y0 - 1, 12, 1, '#1d1d24'); sp(x0 + 3, y0 - 7, 8, 6, '#1d1d24'); sp(x0 + 3, y0 - 3, 8, 1, '#c0392b'); break;
    case 'goggles':
      if (back) { sp(x0, ey, bw, 1, '#2b5bd7'); break; }
      sp(x0, ey, bw, 1, '#2b5bd7'); sp(x0 + 2, ey - 1, 3, 3, '#5fd0ff'); sp(x0 + bw - 5, ey - 1, 3, 3, '#5fd0ff');
      sp(x0 + 3, ey, 1, 2, CL.K); sp(x0 + bw - 4, ey, 1, 2, CL.K); break;
    case 'tie':
      if (back) break;
      sp(m - 1, y0 + 4, 2, 1, '#9b1d2a'); sp(m - 1, y0 + 5, 2, 2, '#d83a3a'); sp(m - 1, y0 + 7, 1, 1, '#d83a3a'); break;
    case 'bluetie':
      if (back) break;
      sp(m - 1, y0 + 4, 2, 1, '#1d3f9b'); sp(m - 1, y0 + 5, 2, 2, '#3a6ed8'); sp(m - 1, y0 + 7, 1, 1, '#3a6ed8'); break;
    case 'flower':
      sp(x0 + 10, y0 - 3, 1, 1, '#ffffff'); sp(x0 + 9, y0 - 2, 3, 1, '#ffffff'); sp(x0 + 10, y0 - 1, 1, 1, '#ffffff'); sp(x0 + 10, y0 - 2, 1, 1, '#ffd23f'); break;
    case 'scarf':
      sp(x0, y0 + 5, bw, 2, '#e2423b'); sp(x0 + 2, y0 + 5, 2, 2, '#ffffff'); sp(x0 + 8, y0 + 5, 2, 2, '#ffffff'); sp(x0 + 1, y0 + 7, 2, 2, '#e2423b'); break;
    case 'sunhat':
      sp(x0 - 2, y0 - 1, bw + 4, 1, '#e0b65a'); sp(x0 + 2, y0 - 3, bw - 4, 2, '#f1cf7a'); sp(x0 + 2, y0 - 2, bw - 4, 1, '#e2423b'); break;
    case 'bowtie':
      if (back) break;
      sp(m - 2, y0 + 5, 2, 2, '#e2423b'); sp(m + 1, y0 + 5, 2, 2, '#e2423b'); sp(m, y0 + 5, 1, 1, '#a8261f'); break;
    case 'glasses':
      if (back) break;
      sp(x0 + 2, ey - 1, 3, 1, '#333a55'); sp(x0 + bw - 5, ey - 1, 3, 1, '#333a55'); sp(x0 + 5, ey - 1, bw - 10, 1, '#333a55'); break;
  }
}
function paintItem(it, arms, x0, y0, bw, f, ic) {
  const xr = x0 + bw;
  // hand position for the front arm
  let hx = xr + 3, hy = y0 + 3;
  if (arms === 'up' || arms === 'waveA') { hx = xr + 1; hy = y0 - 4; }
  if (arms === 'hold') { hx = x0 + Math.floor(bw / 2); hy = y0 - 6; }
  if (arms === 'mouth') { hx = xr; hy = y0 + 3; }
  if (arms === 'side') { hx = xr + 1; hy = y0 + 3; }
  switch (it) {
    case 'mug': sp(hx, hy - 2, 3, 4, '#ffffff'); sp(hx + 3, hy - 1, 1, 2, '#ffffff'); sp(hx, hy - 2, 3, 1, '#6b3b20'); break;
    case 'pan': sp(hx, hy, 3, 1, '#3a3a44'); sp(hx + 3, hy - 1, 6, 2, '#5a5f6e'); sp(hx + 3, hy - 2, 6, 1, '#8890a2'); break;
    case 'spoon': sp(hx, hy - 4, 1, 5, '#c9ced8'); sp(hx - 1, hy - 6, 3, 2, '#e2e6ee'); break;
    case 'stick': for (let i = 0; i < 7; i++) sp(hx + i, hy - Math.floor(i * .7), 1, 1, '#8a5a32'); break;
    case 'book': sp(hx - 1, hy - 3, 3, 5, '#3a6ed8'); sp(hx + 2, hy - 3, 3, 5, '#e2423b'); sp(hx - 1, hy - 2, 6, 1, '#ffffff'); sp(hx + 2, hy - 3 + (f % 2), 1, 4, '#fff8e0'); break;
    case 'slice': sp(hx, hy - 3, 4, 1, '#e3a857'); sp(hx, hy - 2, 3, 1, '#ffd66b'); sp(hx, hy - 1, 2, 1, '#ffd66b'); sp(hx, hy, 1, 1, '#ffd66b'); sp(hx + 1, hy - 2, 1, 1, '#c8452f'); break;
    case 'apple': sp(hx, hy - 2, 3, 3, '#e8403b'); sp(hx + 1, hy - 3, 1, 1, '#4a8a2a'); break;
    case 'glow': sp(hx, hy - 5, 1, 5, ic || '#b6ff5a'); sp(hx, hy - 6, 1, 1, '#ffffff'); break;
    case 'flag': sp(hx, hy - 8, 1, 10, '#6b4a2a'); sp(hx + 1, hy - 8, 5, 3, ic || '#e2423b'); sp(hx + 1, hy - 5, 3, 1, ic || '#e2423b'); break;
    case 'mic': sp(hx, hy - 1, 1, 3, '#3a3a44'); sp(hx - 1, hy - 3, 3, 2, '#8890a2'); break;
    case 'guitar': sp(x0 + 3, y0 + 4, 7, 4, '#c0392b'); sp(x0 + 4, y0 + 5, 2, 2, '#2a1a12'); sp(x0 + 10, y0 + 4, 7, 1, '#6b4a2a'); sp(x0 + 17, y0 + 3, 2, 2, '#3a2a1a'); break;
    case 'brush': sp(hx, hy - 1, 4, 1, '#4fc3ff'); sp(hx + 3, hy - 2, 1, 1, '#ffffff'); break;
    case 'pillow': sp(hx - 1, hy - 5, 7, 5, '#ffffff'); sp(hx - 1, hy - 1, 7, 1, '#d5dae6'); break;
    case 'plate': sp(hx - 1, hy, 7, 1, '#ffffff'); sp(hx, hy - 1, 5, 1, '#e8b25a'); sp(hx, hy - 2, 5, 1, '#d9963a'); sp(hx, hy - 3, 5, 1, '#e8b25a'); sp(hx + 2, hy - 4, 1, 1, '#fff2a8'); break;
    case 'icecream': sp(hx, hy - 1, 3, 3, '#e0a860'); sp(hx + 1, hy + 2, 1, 1, '#e0a860'); sp(hx - 1, hy - 4, 5, 3, '#ff9ccc'); break;
    case 'shovel': sp(hx, hy - 1, 5, 1, '#e2423b'); sp(hx + 5, hy - 2, 2, 3, '#ffc531'); break;
    case 'bucket': sp(hx, hy, 4, 4, '#4fc3ff'); sp(hx, hy, 4, 1, '#2b8fd6'); break;
    case 'laptop': sp(hx - 2, hy + 1, 7, 1, '#9aa3b5'); break;
    case 'phone': sp(hx, hy - 3, 2, 4, '#2a2d35'); sp(hx, hy - 2, 2, 2, '#7fd4ff'); break;
  }
}
// draw a Clawd. o: {pose,f,eyes,mouth,acc,hold,face,blush,alpha}
function C(x, y, o) {
  const face = o.face < 0 ? -1 : 1;
  const acc = o.acc ? (Array.isArray(o.acc) ? o.acc.join('+') : o.acc) : '';
  const key = `${o.pose}|${o.f || 0}|${o.eyes || ''}|${o.mouth || ''}|${acc}|${o.hold || ''}|${o.ic || ''}|${o.blush ? 1 : 0}|${face}|${o.stand ? 1 : 0}|${o.walk ? 1 : 0}`;
  let c = SPRITES.get(key);
  if (!c) {
    sgc.clearRect(0, 0, SW, SH); paintClawd(o);
    c = mk(SW, SH); const cg = c.getContext('2d');
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) cg.drawImage(sbuf, dx, dy);
    cg.globalCompositeOperation = 'source-in'; cg.fillStyle = CL.OL; cg.fillRect(0, 0, SW, SH);
    cg.globalCompositeOperation = 'source-over'; cg.drawImage(sbuf, 0, 0);
    if (face < 0) { const f2 = mk(SW, SH), fg = f2.getContext('2d'); fg.translate(SW, 0); fg.scale(-1, 1); fg.drawImage(c, 0, 0); c = f2; }
    SPRITES.set(key, c);
  }
  const ox = face < 0 ? SW - 1 - SAX : SAX;
  if (o.alpha !== undefined) g.globalAlpha = o.alpha;
  g.drawImage(c, Math.round(x) - ox, Math.round(y) - SAY);
  g.globalAlpha = 1;
}

// ---------------------------------------------------------------- icons, bubbles, Zzz
const ICON = {
  heart: [['#ff3d7f'], '.##.##.', '#######', '.#####.', '..###..', '...#...'],
  excl: [['#e8403b'], '..#..', '..#..', '..#..', '.....', '..#..'],
  q: [['#4a5cff'], '.###.', '#...#', '...#.', '.....', '..#..'],
  note: [['#7c5cff'], '..###', '..#.#', '..#.#', '##.##', '##.##'],
  star: [['#ffb21a'], '...#...', '..###..', '#######', '.#####.', '.##.##.'],
  zz: [['#5a6cff'], '#####', '...#.', '..#..', '.#...', '#####'],
  coffee: [['#6b3b20', '#ffffff'], '.2.2.', '11111', '1111.1', '1111.1', '.111.'],
  bulb: [['#ffc531', '#8890a2'], '.111.', '11111', '11111', '.111.', '.222.'],
  sweat: [['#4fc3ff'], '..#..', '.###.', '#####', '#####', '.###.'],
  pizza: [['#e3a857', '#ffd66b', '#c8452f'], '11111', '23222', '.222.', '.32..', '..2..'],
  sun: [['#ffb21a'], '#.#.#', '.###.', '#####', '.###.', '#.#.#'],
  bug: [['#b83cff', '#1b1210'], '1.2.1', '.111.', '11111', '.111.', '1...1'],
  check: [['#2ecc71'], '....#', '...##', '#.##.', '###..', '.#...'],
  music: [['#ff5fa2'], '.####', '.#..#', '.#..#', '##.##', '##.##'],
};
function icon(name, x, y) {
  const ic = ICON[name]; const cols = ic[0];
  for (let j = 1; j < ic.length; j++) for (let i = 0; i < ic[j].length; i++) {
    const ch = ic[j][i]; if (ch === '.') continue;
    R(x + i, y + j - 1, 1, 1, ch === '#' ? cols[0] : cols[(+ch) - 1]);
  }
}
function bubble(x, y, name, a = 1) {
  // x,y = point of the tail
  x = Math.round(x); y = Math.round(y);
  const pop = a < .12 ? 1 : 0;
  const w = 11, h = 9, bx = x - 5, by = y - h - 3 - pop;
  R(bx + 1, by - 1, w - 2, 1, CL.OL); R(bx + 1, by + h, w - 2, 1, CL.OL); R(bx - 1 + 1 - 1, by, 1, h, CL.OL); R(bx + w - 1 + 0, by, 1, h, CL.OL);
  R(bx, by, w - 1, h, '#ffffff'); R(bx + 3, by + h, 3, 1, '#ffffff'); R(bx + 3, by + h + 1, 2, 1, '#ffffff'); R(bx + 3, by + h + 2, 1, 1, CL.OL);
  R(bx + 5, by + h + 1, 1, 1, CL.OL); R(bx + 4, by + h + 2, 1, 1, CL.OL); R(bx + 2, by + h + 1, 1, 1, CL.OL);
  const ic = ICON[name]; const iw = ic[1].length;
  icon(name, bx + Math.floor((w - 1 - iw) / 2), by + 2);
}
const ZG = ['####', '..#.', '.#..', '####'];
function zzz(x, y, a, seed = 0, col = '#c9d3ff') {
  for (let i = 0; i < 3; i++) {
    const k = fr(a * .45 + i / 3 + rnd(seed, 3));
    const zx = x + 2 + k * 10 + Math.sin(k * 6 + seed) * 2, zy = y - k * 18;
    g.globalAlpha = Math.sin(Math.PI * k);
    for (let j = 0; j < 4; j++) for (let q = 0; q < 4; q++) if (ZG[j][q] === '#') R(zx + q, zy + j, 1, 1, col);
  }
  g.globalAlpha = 1;
}
function confetti(x0, x1, y0, a, n, seed, fall = 40) {
  const cols = ['#ff5fa2', '#ffe14d', '#4fc3ff', '#b6ff5a', '#ff9b2f', '#ffffff', '#b07cff'];
  for (let i = 0; i < n; i++) {
    const t = a - rnd(i, seed) * 1.2; if (t < 0) continue;
    const x = lerp(x0, x1, rnd(i, seed + 1)) + Math.sin(t * 3 + i) * 6, y = y0 + t * fall * (.7 + rnd(i, seed + 2) * .6);
    if (y > LH) continue;
    R(x, y, (Math.floor(t * 6 + i) % 2) + 1, 1 + (Math.floor(t * 6 + i + 1) % 2), cols[i % cols.length]);
  }
}
function sparkle(x, y, a, c = '#fff6a0') {
  const k = Math.floor(a * 10) % 3;
  if (k === 0) R(x, y, 1, 1, c);
  else if (k === 1) { R(x - 1, y, 3, 1, c); R(x, y - 1, 1, 3, c); }
  else { R(x - 2, y, 5, 1, c); R(x, y - 2, 1, 5, c); }
}

// ---------------------------------------------------------------- actors
// An actor is a Clawd with a script of timed steps:
//   ['hide', d] ['wait', d, {pose,eyes,...}] ['walk', d, {x,y}] ['run', d, {x,y}]
//   ['hop', d, {x,y,h}] ['fn', d, {fn(k, la, st) -> partial state}]
let CLAWDS = 0;
function actor(x, y, o = {}, steps = []) {
  CLAWDS++;
  const segs = []; let t = o.t0 ?? 0, cx = x, cy = y, face = o.face ?? 1;
  for (const s of steps) {
    const [kind, d] = s; const p = s[2] || {};
    const seg = { kind, t0: t, t1: t + d, x0: cx, y0: cy, x1: p.x ?? cx, y1: p.y ?? cy, p };
    if (seg.x1 !== cx) face = seg.x1 > cx ? 1 : -1;
    if (p.face) face = p.face;
    seg.face = face;
    cx = seg.x1; cy = seg.y1; segs.push(seg); t += d;
  }
  return { o, segs, seed: o.seed ?? CLAWDS * 7.31, x, y, t1: t };
}
function actorState(A, a) {
  const S = A.segs;
  if (!S.length) return { x: A.x, y: A.y, pose: 'stand', face: A.o.face ?? 1 };
  let s = S[0];
  if (a < S[0].t0) { if (A.o.hideBefore) return null; }
  else { s = S[S.length - 1]; for (const q of S) if (a >= q.t0 && a < q.t1) { s = q; break; } }
  if (s.kind === 'hide') return null;
  const la = a - s.t0, k = clamp(la / Math.max(1e-6, s.t1 - s.t0)), p = s.p, sd = A.seed;
  const st = { x: s.x0, y: s.y0, face: s.face, pose: p.pose || 'stand', eyes: p.eyes, mouth: p.mouth, acc: p.acc ?? A.o.acc, hold: p.hold ?? A.o.hold, ic: p.ic ?? A.o.ic, blush: p.blush ?? A.o.blush, bubble: p.bubble, zzz: p.zzz, net: p.net };
  const rate = p.rate ?? (s.kind === 'walk' ? 8 : s.kind === 'run' ? 13 : st.pose === 'cheer' ? 5 : st.pose === 'stand' ? 2.6 : 4);
  st.f = Math.floor(a * rate + sd) % 4;
  if (s.kind === 'walk' || s.kind === 'run') {
    const e = p.ease ? E.io(k) : k;
    st.x = lerp(s.x0, s.x1, e); st.y = lerp(s.y0, s.y1, e);
    st.pose = p.pose || s.kind; if (st.pose === 'carry') st.walk = 1;
  } else if (s.kind === 'hop') {
    st.x = lerp(s.x0, s.x1, k); st.y = lerp(s.y0, s.y1, k) - Math.sin(Math.PI * k) * (p.h ?? 10);
    st.pose = p.pose || 'jump';
  } else if (s.kind === 'fn') {
    Object.assign(st, p.fn(k, la, st, A, a));
  }
  if (p.stand) st.stand = 1;
  if (!st.eyes && !['sleep', 'splat', 'cheer', 'dance', 'eat', 'stretch', 'lie'].includes(st.pose)) {
    if (((a * 1000 + sd * 997) % 3300) < 120) st.eyes = 'blink';
  }
  if (A.o.back && !st.eyes) st.eyes = 'none';
  if (p.bubbleAt !== undefined && la >= p.bubbleAt && la < p.bubbleAt + (p.bubbleDur ?? 1.4)) st.bubbleK = la - p.bubbleAt; else if (st.bubble) st.bubbleK = la;
  if (p.bubbleAt !== undefined && !(la >= p.bubbleAt && la < p.bubbleAt + (p.bubbleDur ?? 1.4))) st.bubble = null;
  if (p.bubbleDur !== undefined && p.bubbleAt === undefined && la > p.bubbleDur) st.bubble = null;
  return st;
}
function drawState(st, a) {
  C(st.x, st.y, st);
  if (st.zzz) zzz(st.x + 4 * (st.face || 1), st.y - 12, a, Math.floor(st.x));
  if (st.bubble) bubble(st.x + 3 * (st.face || 1), st.y - 15 - (st.pose === 'cheer' || st.pose === 'stretch' || st.pose === 'carry' ? 3 : 0), st.bubble, st.bubbleK ?? 1);
}
// draw a set of actors (plus extra drawables {y, draw()}) in depth order
function drawCast(list, a, extra = []) {
  const items = [];
  for (const A of list) { const st = actorState(A, a); if (st) items.push({ y: (st.zy ?? st.y) + (A.o.z || 0), st }); }
  for (const e of extra) items.push(e);
  items.sort((p, q) => p.y - q.y);
  for (const it of items) { if (it.draw) it.draw(); else drawState(it.st, a); }
}
// helper: a Clawd that just does something forever
const still = (x, y, o, p = {}) => actor(x, y, o, [['wait', 999, p]]);

// ---------------------------------------------------------------- shared props
function house(x, gy, w, h, wall, roof, lit, door) {
  // roof
  const rh = Math.round(w * .42);
  for (let i = 0; i < rh; i++) { const ww = Math.round((w + 10) * (1 - i / rh)); R(x + (w - ww) / 2, gy - h - i, ww, 1, i === 0 ? mixc(roof, '#000000', .3) : roof); }
  R(x + w * .7, gy - h - rh * .75, 7, rh * .5, mixc(wall, '#000000', .35));
  R(x, gy - h, w, h, wall); R(x, gy - h, w, 2, mixc(wall, '#000000', .18)); R(x, gy - 2, w, 2, mixc(wall, '#000000', .25));
  const win = c => c;
  for (const wx of [x + 9, x + w - 23]) {
    R(wx - 1, gy - h + 14, 16, 14, '#ffffff'); R(wx, gy - h + 15, 14, 12, win(lit ? '#ffe27a' : '#2b3558'));
    R(wx + 6, gy - h + 15, 1, 12, '#ffffff'); R(wx, gy - h + 20, 14, 1, '#ffffff');
  }
  const dx = x + w / 2 - 7;
  R(dx - 1, gy - 23, 16, 23, '#ffffff');
  R(dx, gy - 22, 14, 22, door ? '#3a2a20' : mixc(roof, '#000000', .2));
  if (door) R(dx, gy - 22, 3, 22, mixc(roof, '#000000', .1));
  else R(dx + 10, gy - 11, 2, 2, '#ffd23f');
}
function nightTint(h) {
  // overall dimming for evening / night scenes
  const d = dayness(h);
  if (d < 1) { g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = mixc('#3a4580', '#ffffff', d); g.fillRect(0, 0, LW, LH); g.restore(); }
}
