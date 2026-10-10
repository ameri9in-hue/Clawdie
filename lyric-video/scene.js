// 把晚风留给我: a soft, painterly lyric video drawn on canvas.
// Every frame is a pure function of t (seconds), so the offline renderer can jump anywhere.
'use strict';
const W = 1920, H = 1080, FPS = 30;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const FONT = '"WenKaiTC", "WenQuanYi Zen Hei", serif';

// ---------------------------------------------------------------- math & colour
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const TAU = Math.PI * 2;
function rng(seed) {
  return () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const C = {
  night: hx('#0d1530'), deep: hx('#070b1c'), indigo: hx('#1d2550'), violet: hx('#4a3a72'),
  dusk: hx('#c9839a'), peach: hx('#f2b48c'), amber: hx('#ffc77a'), warm: hx('#ffdca6'),
  cream: hx('#fff3dc'), teal: hx('#3e7f8f'), mint: hx('#bff0e0'), moon: hx('#f4f1e6'),
  blue: hx('#3b5b9a'), sky: hx('#6f8fc8'), rose: hx('#f0a3b5'), ink: hx('#0a0e1e'),
};
function env(t, key = 'level') {
  const e = window.ENV; if (!e) return .5;
  const a = e[key], f = t * e.fps, i = Math.floor(f);
  if (i < 0 || i >= a.length - 1) return 0;
  return lerp(a[i], a[i + 1], f - i);
}
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// ---------------------------------------------------------------- shared painters
function vgrad(c, y0, y1, stops) {
  const g = c.createLinearGradient(0, y0, 0, y1);
  stops.forEach(([o, col, a]) => g.addColorStop(o, rgba(col, a ?? 1)));
  return g;
}
function sky(c, stops, y0 = 0, y1 = H) { c.fillStyle = vgrad(c, y0, y1, stops); c.fillRect(-W, -H, W * 3, H * 3); }
function glow(c, x, y, r, col, a = 1, inner = 0) {
  if (a <= 0 || r <= 0) return;
  const g = c.createRadialGradient(x, y, r * inner, x, y, r);
  g.addColorStop(0, rgba(col, a)); g.addColorStop(.35, rgba(col, a * .45)); g.addColorStop(1, rgba(col, 0));
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
}
function addGlow(c, ...args) { c.save(); c.globalCompositeOperation = 'lighter'; glow(c, ...args); c.restore(); }
function ellipseGlow(c, x, y, rx, ry, col, a) {
  c.save(); c.translate(x, y); c.scale(1, ry / rx); glow(c, 0, 0, rx, col, a); c.restore();
}

const STARS = (() => { const r = rng(7), s = []; for (let i = 0; i < 700; i++) s.push({ x: r(), y: r(), m: r() ** 3, ph: r() * TAU, sp: .5 + r() * 2 }); return s; })();
function stars(c, t, a, yMax = .7, ox = 0, oy = 0) {
  if (a <= 0) return;
  c.save(); c.globalCompositeOperation = 'lighter';
  for (const s of STARS) {
    if (s.y > yMax) continue;
    const tw = .55 + .45 * Math.sin(t * s.sp + s.ph);
    const x = ((s.x * W * 1.2 + ox) % (W * 1.2) + W * 1.2) % (W * 1.2) - W * .1, y = s.y * H + oy;
    const al = a * (.25 + .75 * s.m) * tw * (1 - ss(yMax * .7, yMax, s.y) * .8);
    c.fillStyle = rgba(C.cream, al);
    const r = .6 + s.m * 1.8;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    if (s.m > .55) glow(c, x, y, r * 7, C.warm, al * .25);
  }
  c.restore();
}
function moon(c, x, y, r, a = 1, half = 0) {
  if (a <= 0) return;
  addGlow(c, x, y, r * 9, hx('#8fa6d8'), .18 * a);
  addGlow(c, x, y, r * 3, C.moon, .22 * a);
  c.save(); c.globalAlpha = a;
  const g = c.createRadialGradient(x - r * .3, y - r * .3, r * .1, x, y, r);
  g.addColorStop(0, '#fffdf4'); g.addColorStop(1, '#e6e2d2');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.fillStyle = 'rgba(170,165,150,.18)';
  [[-.3, -.1, .22], [.25, .2, .16], [.05, -.4, .1], [-.1, .35, .12]].forEach(([dx, dy, rr]) => { c.beginPath(); c.arc(x + dx * r, y + dy * r, rr * r, 0, TAU); c.fill(); });
  if (half > 0) { // soft terminator for a half / crescent moon
    c.beginPath(); c.arc(x, y, r + .5, 0, TAU); c.clip();
    const sg = c.createLinearGradient(x - r, 0, x + r, 0);
    sg.addColorStop(clamp(.5 - half * .5), 'rgba(20,28,60,0)'); sg.addColorStop(clamp(.62 - half * .5 + .25), 'rgba(20,28,60,.88)');
    c.fillStyle = sg; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  c.restore();
}

// soft clouds are pre-rendered sprites, tinted per use
const cloudCache = new Map();
function cloudSprite(seed, col) {
  const key = seed + ':' + col.join(',');
  if (cloudCache.has(key)) return cloudCache.get(key);
  const r = rng(seed), cw = 900, ch = 320, cc = mk(cw, ch), g = cc.getContext('2d');
  for (let i = 0; i < 26; i++) {
    const x = cw * (.15 + .7 * r()), y = ch * (.45 + .25 * (r() - .5)) + Math.abs(x - cw / 2) / cw * 60, rr = 60 + r() * 110;
    glow(g, x, y, rr, col, .16 + r() * .1);
  }
  cloudCache.set(key, cc); return cc;
}
function clouds(c, t, { n = 6, y = .25, spread = .2, speed = 12, col = C.violet, a = .8, seed = 3, scale = 1 } = {}) {
  const r = rng(seed);
  c.save(); c.globalAlpha = a;
  for (let i = 0; i < n; i++) {
    const sp = cloudSprite(seed * 10 + (i % 4), col), s = scale * (.7 + r() * .8);
    const w = sp.width * s, span = W + w;
    const x = ((r() * span + t * speed * (.6 + r() * .8)) % span + span) % span - w;
    c.drawImage(sp, x, H * (y + (r() - .5) * spread) - sp.height * s / 2, w, sp.height * s);
  }
  c.restore();
}

// skyline layers are cached to offscreen canvases; windows light up as `lit` rises
const skyCache = new Map();
function skylineLayer(seed, { w = W * 1.6, hMin = 120, hMax = 420, col = C.ink, win = C.amber, winP = .35, bw = [60, 160], win2 = C.mint }) {
  const key = seed;
  if (skyCache.has(key)) return skyCache.get(key);
  const r = rng(seed), hh = hMax + 60, cc = mk(w, hh), g = cc.getContext('2d'), wins = [];
  let x = -20;
  while (x < w) {
    const bW = bw[0] + r() * (bw[1] - bw[0]), bH = hMin + r() ** 1.4 * (hMax - hMin), top = hh - bH;
    g.fillStyle = rgba(col);
    g.fillRect(x, top, bW, bH);
    if (r() < .35) g.fillRect(x + bW * .2, top - bH * .08, bW * .6, bH * .08 + 1);
    if (r() < .25) { g.fillRect(x + bW * .5 - 1.5, top - 40, 3, 40); wins.push({ x: x + bW * .5, y: top - 40, s: 2, red: 1, th: r() }); }
    const cols = Math.floor(bW / 16), rows = Math.floor(bH / 22);
    for (let i = 1; i < cols; i++) for (let j = 1; j < rows; j++) if (r() < winP) wins.push({ x: x + i * 16 - 4, y: top + j * 22 - 6, s: 6, th: r(), cool: r() < .25 });
    x += bW + r() * 6;
  }
  const L = { canvas: cc, wins, col, win, win2, h: hh, w };
  skyCache.set(key, L); return L;
}
function skyline(c, L, x, baseY, lit = 1, a = 1, t = 0) {
  c.save(); c.globalAlpha = a;
  c.drawImage(L.canvas, x, baseY - L.h);
  c.globalCompositeOperation = 'lighter';
  for (const w of L.wins) {
    if (w.th > lit) continue;
    const wx = x + w.x, wy = baseY - L.h + w.y;
    if (wx < -20 || wx > W + 20) continue;
    if (w.red) { const b = .5 + .5 * Math.sin(t * 2 + w.th * 20); glow(c, wx, wy, 10, hx('#ff6b6b'), .6 * b); continue; }
    const flick = .8 + .2 * Math.sin(t * .7 + w.th * 50);
    c.fillStyle = rgba(w.cool ? L.win2 : L.win, (.35 + .4 * w.th) * flick);
    c.fillRect(wx, wy, w.s, w.s * 1.3);
  }
  c.restore();
}

function rain(c, t, amt, { angle = .12, len = 26, a = .35 } = {}) {
  if (amt <= 0) return;
  const r = rng(11), n = Math.floor(500 * amt);
  c.save(); c.strokeStyle = rgba(hx('#cfe0ff'), a); c.lineWidth = 1.2; c.beginPath();
  for (let i = 0; i < n; i++) {
    const sp = 900 + r() * 700, x0 = r() * W * 1.2, y0 = r() * (H + 200), z = .4 + r() * .6;
    const y = (y0 + t * sp) % (H + 200) - 100, x = x0 - y * angle;
    c.moveTo(x, y); c.lineTo(x - angle * len * z, y + len * z);
  }
  c.stroke(); c.restore();
}

// out-of-focus lights drifting in front of the scene
function bokeh(c, t, { n = 14, col = C.amber, a = .12, seed = 5, rMin = 30, rMax = 110, drift = 8, y0 = 0, y1 = 1 } = {}) {
  const r = rng(seed);
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const rr = rMin + r() * (rMax - rMin), x = ((r() * W + t * drift * (r() - .3)) % (W + 200) + W + 200) % (W + 200) - 100;
    const y = H * lerp(y0, y1, r()) + Math.sin(t * .3 + i) * 12;
    const al = a * (.5 + .5 * Math.sin(t * .4 + i * 1.7));
    const g = c.createRadialGradient(x, y, rr * .55, x, y, rr);
    g.addColorStop(0, rgba(col, al)); g.addColorStop(.85, rgba(col, al * .9)); g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, rr, 0, TAU); c.fill();
  }
  c.restore();
}
function fireflies(c, t, { n = 30, x0 = 0, x1 = W, y0 = .4, y1 = .9, a = 1, seed = 9, col = hx('#ffe9a0') } = {}) {
  if (a <= 0) return;
  const r = rng(seed);
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const bx = lerp(x0, x1, r()), by = H * lerp(y0, y1, r()), ph = r() * TAU, sp = .2 + r() * .4;
    const x = bx + Math.sin(t * sp + ph) * 40 + Math.sin(t * sp * 2.3 + ph) * 15, y = by + Math.cos(t * sp * .8 + ph) * 30;
    const bl = Math.pow(.5 + .5 * Math.sin(t * (1 + r()) + ph), 2);
    glow(c, x, y, 16, col, .5 * a * bl); c.fillStyle = rgba(C.cream, a * bl); c.beginPath(); c.arc(x, y, 1.8, 0, TAU); c.fill();
  }
  c.restore();
}

// petals and leaves riding the breeze
function petals(c, t, { n = 40, a = 1, wind = 1, seed = 21, col = C.rose, y0 = 0, y1 = 1, size = 1 } = {}) {
  if (a <= 0) return;
  const r = rng(seed);
  c.save();
  for (let i = 0; i < n; i++) {
    const sp = (80 + r() * 140) * wind, ph = r() * TAU, z = .5 + r() * .8, span = W + 300;
    const x = ((r() * span + t * sp * z) % span + span) % span - 150;
    const y = H * lerp(y0, y1, r()) + Math.sin(t * .9 + ph) * 60 * z + Math.sin(x * .004 + ph) * 40;
    const rot = t * (1 + r() * 2) + ph, s = (5 + r() * 6) * z * size;
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(1, .45 + .4 * Math.sin(t * 2 + ph));
    c.fillStyle = rgba(mixc(col, C.cream, r() * .5), a * (.55 + .4 * z));
    c.beginPath(); c.ellipse(0, 0, s, s * .55, 0, 0, TAU); c.fill(); c.restore();
  }
  c.restore();
}

// the breeze: luminous ribbons with fading tails
function ribbon(c, t, { y = .5, amp = 60, k = .004, w = .8, ph = 0, col = C.warm, a = .5, width = 3, head = null, len = 900, speed = 420, tilt = 0 } = {}) {
  if (a <= 0) return;
  const hx_ = head ?? (((t * speed + ph * 300) % (W + len + 400)) - 200);
  c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
  const seg = 40, step = len / seg;
  let px = null, py = null;
  for (let i = 0; i <= seg; i++) {
    const x = hx_ - len + i * step;
    const yy = H * y + amp * Math.sin(x * k + t * w + ph) + amp * .4 * Math.sin(x * k * 2.7 - t * w * 1.3 + ph * 2) + (x - W / 2) * tilt;
    if (px !== null) {
      const f = i / seg, al = a * Math.pow(f, 1.6) * (1 - ss(.92, 1, f) * .3);
      c.strokeStyle = rgba(col, al * .35); c.lineWidth = width * 5 * f; c.beginPath(); c.moveTo(px, py); c.lineTo(x, yy); c.stroke();
      c.strokeStyle = rgba(mixc(col, C.cream, .5), al); c.lineWidth = width * (.3 + f); c.beginPath(); c.moveTo(px, py); c.lineTo(x, yy); c.stroke();
    }
    px = x; py = yy;
  }
  glow(c, px, py, 26 * width / 3, col, a * .7);
  c.restore();
}
function breeze(c, t, a = 1, { y = .45, spread = .3, seed = 2, cols = [C.warm, C.mint, C.rose], n = 5, speed = 380, amp = 70 } = {}) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) ribbon(c, t, { y: y + (r() - .5) * spread, amp: amp * (.5 + r()), k: .002 + r() * .003, w: .5 + r() * .6, ph: r() * 10, col: cols[i % cols.length], a: a * (.3 + r() * .35), width: 1.5 + r() * 2.5, len: 600 + r() * 700, speed: speed * (.7 + r() * .6) });
}

// silhouette of a person; y = feet. Options: look (head turn -1..1), walk phase, hold (letter), scarf flutter
function person(c, x, y, h, { col = hx('#141a33'), look = 0, walk = null, hold = 0, scarf = C.rose, wind = 1, t = 0, hair = 1, flip = 1, reach = 0, alpha = 1 } = {}) {
  c.save(); c.translate(x, y); c.scale(flip * h / 300, h / 300); c.globalAlpha = alpha;
  const sw = walk === null ? 0 : Math.sin(walk);
  c.fillStyle = rgba(col);
  // legs
  c.strokeStyle = rgba(col); c.lineCap = 'round'; c.lineWidth = 17;
  c.beginPath(); c.moveTo(-9, -120); c.lineTo(-9 + sw * 22, -4); c.stroke();
  c.beginPath(); c.moveTo(9, -120); c.lineTo(9 - sw * 22, -4); c.stroke();
  // coat
  c.beginPath(); c.moveTo(-30, -222); c.quadraticCurveTo(-46, -150, -44 - sw * 4, -98); c.lineTo(44 + sw * 4, -98); c.quadraticCurveTo(46, -150, 30, -222); c.quadraticCurveTo(0, -236, -30, -222); c.fill();
  // arms
  c.lineWidth = 14;
  c.beginPath(); c.moveTo(-30, -212); c.quadraticCurveTo(-44 - sw * 10, -170, -38 - sw * 14, -128); c.stroke();
  if (reach > 0) { c.beginPath(); c.moveTo(30, -212); c.quadraticCurveTo(52, -180, 30 + 50 * reach, -140 + 10 * reach); c.stroke(); }
  else if (hold > 0) { c.beginPath(); c.moveTo(30, -212); c.quadraticCurveTo(52, -180, 26, -150); c.stroke(); }
  else { c.beginPath(); c.moveTo(30, -212); c.quadraticCurveTo(44 + sw * 10, -170, 38 + sw * 14, -128); c.stroke(); }
  // head & hair
  const hx0 = look * 6;
  c.beginPath(); c.ellipse(hx0, -258, 21, 24, 0, 0, TAU); c.fill();
  if (hair) { c.beginPath(); c.moveTo(hx0 - 23, -262); c.quadraticCurveTo(hx0 - 26 - wind * 6, -226, hx0 - 18 - wind * 10, -214); c.lineTo(hx0 + 18, -228); c.quadraticCurveTo(hx0 + 25, -272, hx0, -284); c.quadraticCurveTo(hx0 - 22, -282, hx0 - 23, -262); c.fill(); }
  // scarf tail in the wind
  if (scarf) {
    c.fillStyle = rgba(scarf, .95);
    c.beginPath(); c.ellipse(0, -228, 26, 9, 0, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(-14, -230);
    for (let i = 0; i <= 8; i++) { const f = i / 8; c.lineTo(-14 - f * 70 * wind, -232 + f * 18 + Math.sin(t * 6 - f * 5) * 9 * f * wind); }
    for (let i = 8; i >= 0; i--) { const f = i / 8; c.lineTo(-14 - f * 70 * wind, -220 + f * 22 + Math.sin(t * 6 - f * 5 + .5) * 9 * f * wind); }
    c.fill();
  }
  if (hold > 0) { // a small envelope held to the chest
    c.save(); c.translate(26, -152); c.rotate(-.2); c.globalAlpha = alpha * hold;
    c.fillStyle = rgba(C.cream); c.fillRect(-14, -10, 28, 19);
    c.strokeStyle = rgba(C.dusk); c.lineWidth = 1.5; c.beginPath(); c.moveTo(-14, -10); c.lineTo(0, 2); c.lineTo(14, -10); c.stroke();
    c.restore();
  }
  c.restore();
}

function streetlamp(c, x, gy, h, { on = 1, t = 0, col = C.amber, cone = 1, arm = 1 } = {}) {
  const hx_ = x + 38 * arm, hy = gy - h;
  c.save();
  c.fillStyle = '#0a0d1a'; c.strokeStyle = '#0a0d1a';
  c.fillRect(x - 5, gy - h, 10, h); c.fillRect(x - 12, gy - 18, 24, 18);
  c.lineWidth = 7; c.beginPath(); c.moveTo(x, hy + 10); c.quadraticCurveTo(x, hy - 14, hx_, hy - 6); c.stroke();
  c.beginPath(); c.moveTo(hx_ - 22, hy + 4); c.lineTo(hx_ + 22, hy + 4); c.lineTo(hx_ + 12, hy - 10); c.lineTo(hx_ - 12, hy - 10); c.fill();
  if (on > 0) {
    const fl = on * (.96 + .04 * Math.sin(t * 13) * Math.sin(t * 7.1));
    c.globalCompositeOperation = 'lighter';
    if (cone > 0) {
      const g = c.createLinearGradient(0, hy, 0, gy);
      g.addColorStop(0, rgba(col, .22 * fl * cone)); g.addColorStop(1, rgba(col, .03 * fl * cone));
      c.fillStyle = g; c.beginPath(); c.moveTo(hx_ - 16, hy + 6); c.lineTo(hx_ + 16, hy + 6); c.lineTo(hx_ + h * .42, gy); c.lineTo(hx_ - h * .42, gy); c.fill();
    }
    ellipseGlow(c, hx_, gy, h * .5, h * .09, col, .35 * fl);
    glow(c, hx_, hy + 6, 220, col, .35 * fl);
    glow(c, hx_, hy + 6, 50, C.cream, .9 * fl);
  }
  c.restore();
  return [hx_, hy + 6];
}

// vertical shimmering reflections of lights on wet asphalt
function reflection(c, x, gy, w, len, col, a, t = 0) {
  if (a <= 0) return;
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const yy = gy + i * len / 6, wob = Math.sin(t * 2 + i * 1.3 + x * .01) * w * .25, al = a * (1 - i / 6) * .5;
    const g = c.createLinearGradient(x - w + wob, 0, x + w + wob, 0);
    g.addColorStop(0, rgba(col, 0)); g.addColorStop(.5, rgba(col, al)); g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g; c.fillRect(x - w + wob, yy, w * 2, len / 6 * .7);
  }
  c.restore();
}

function hills(c, pts, col, a = 1) {
  c.save(); c.globalAlpha = a; c.fillStyle = typeof col === 'string' ? col : rgba(col);
  c.beginPath(); c.moveTo(0, H);
  pts.forEach(([x, y], i) => { if (i === 0) c.lineTo(x, y); else { const [px, py] = pts[i - 1]; c.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2); } });
  c.lineTo(W, pts[pts.length - 1][1]); c.lineTo(W, H); c.closePath(); c.fill(); c.restore();
}
function grass(c, t, gy, { n = 260, h = 50, col = '#060914', wind = 1, seed = 31, x0 = -20, x1 = W + 20 } = {}) {
  const r = rng(seed);
  c.save(); c.strokeStyle = col; c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, r()), hh = h * (.5 + r()), sway = Math.sin(t * 1.2 + x * .01) * 10 * wind + 6 * wind;
    c.lineWidth = 2 + r() * 2;
    c.beginPath(); c.moveTo(x, gy + 4); c.quadraticCurveTo(x + sway * .3, gy - hh * .6, x + sway, gy - hh); c.stroke();
  }
  c.restore();
}
function house(c, x, gy, w, h, { col = '#0b0f20', win = 1, roof = .45, t = 0, winCol = C.amber } = {}) {
  c.save(); c.fillStyle = col;
  c.fillRect(x, gy - h, w, h);
  c.beginPath(); c.moveTo(x - w * .08, gy - h); c.lineTo(x + w / 2, gy - h - h * roof); c.lineTo(x + w * 1.08, gy - h); c.fill();
  if (win > 0) {
    const wx = x + w * .3, wy = gy - h * .7, ww = w * .4, wh = h * .38;
    c.fillStyle = rgba(winCol, .9 * win); c.fillRect(wx, wy, ww, wh);
    c.fillStyle = col; c.fillRect(wx + ww / 2 - 1.5, wy, 3, wh); c.fillRect(wx, wy + wh / 2 - 1.5, ww, 3);
    addGlow(c, wx + ww / 2, wy + wh / 2, w * 1.4, winCol, .3 * win * (.9 + .1 * Math.sin(t * 1.3)));
  }
  c.restore();
}

// anamorphic streak + ghosts along the axis through the frame centre
function flare(c, x, y, a = 1, col = C.amber) {
  if (a <= 0) return;
  c.save(); c.globalCompositeOperation = 'lighter';
  ellipseGlow(c, x, y, 520, 5, col, .5 * a);
  ellipseGlow(c, x, y, 260, 2, C.cream, .6 * a);
  const dx = W / 2 - x, dy = H / 2 - y;
  [[.35, 28, C.mint, .1], [.7, 14, C.warm, .16], [1.25, 60, C.rose, .07], [1.6, 22, C.mint, .1], [1.9, 90, C.peach, .05]].forEach(([f, r, cl, al]) => {
    const g = c.createRadialGradient(x + dx * f, y + dy * f, r * .6, x + dx * f, y + dy * f, r);
    g.addColorStop(0, rgba(cl, al * a * .6)); g.addColorStop(.85, rgba(cl, al * a)); g.addColorStop(1, rgba(cl, 0));
    c.fillStyle = g; c.beginPath(); c.arc(x + dx * f, y + dy * f, r, 0, TAU); c.fill();
  });
  c.restore();
}
// slowly turning shafts of light from a source
function rays(c, t, x, y, { n = 9, len = 1400, a = .08, col = C.amber, spread = TAU, dir = 0, seed = 71 } = {}) {
  if (a <= 0) return;
  const r = rng(seed);
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const ang = dir + (r() - .5) * spread + Math.sin(t * .15 + i) * .05, w = .03 + r() * .07, al = a * (.5 + .5 * Math.sin(t * .5 + i * 1.7));
    const g = c.createRadialGradient(x, y, 0, x, y, len);
    g.addColorStop(0, rgba(col, al)); g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g; c.beginPath(); c.moveTo(x, y); c.arc(x, y, len, ang - w, ang + w); c.closePath(); c.fill();
  }
  c.restore();
}
// dark foreground bough with swaying leaves, for depth
function branch(c, t, x, y, s, flip = 1, wind = 1) {
  const r = rng(601);
  c.save(); c.translate(x, y); c.scale(flip * s, s); c.rotate(Math.sin(t * .7) * .025 * wind);
  c.strokeStyle = c.fillStyle = '#04050c'; c.lineCap = 'round';
  const curves = [[[0, 0], [-200, 60], [-430, 40], 16], [[-180, 50], [-260, 140], [-340, 175], 8], [[-300, 45], [-360, -20], [-450, -40], 6]];
  curves.forEach(([p0, p1, p2, w]) => { c.lineWidth = w; c.beginPath(); c.moveTo(...p0); c.quadraticCurveTo(...p1, ...p2); c.stroke(); });
  for (let i = 0; i < 60; i++) {
    const [p0, p1, p2] = curves[i % 3], f = .25 + r() * .8, u = 1 - f;
    const px = u * u * p0[0] + 2 * u * f * p1[0] + f * f * p2[0] + (r() - .5) * 40, py = u * u * p0[1] + 2 * u * f * p1[1] + f * f * p2[1] + (r() - .5) * 40;
    c.save(); c.translate(px, py); c.rotate(r() * TAU + Math.sin(t * 2.2 + i) * .18 * wind);
    c.beginPath(); c.ellipse(16, 0, 18 + r() * 10, 7 + r() * 3, 0, 0, TAU); c.fill(); c.restore();
  }
  c.restore();
}

// ---------------------------------------------------------------- scenes
// each scene: draw(c, t, lt) where lt = t - start
const L1 = () => skylineLayer(101, { hMin: 140, hMax: 460, col: hx('#1a2148'), win: hx('#ffd59a'), winP: .28, bw: [70, 170] });
const L2 = () => skylineLayer(102, { hMin: 200, hMax: 560, col: hx('#10162f'), win: C.amber, winP: .32, bw: [90, 210] });
const L3 = () => skylineLayer(103, { hMin: 90, hMax: 300, col: hx('#26305e'), win: hx('#ffe2b8'), winP: .2, bw: [50, 120] });

function sceneIntro(c, t, lt) {
  const k = ss(0, 12, lt);
  sky(c, [[0, mixc(hx('#2b2c5e'), C.night, k)], [.55, mixc(C.dusk, C.violet, k)], [.8, mixc(C.peach, hx('#6b5a8e'), k)], [1, mixc(C.peach, C.dusk, k)]]);
  stars(c, t, k * .6, .5);
  clouds(c, t, { n: 7, y: .22, col: mixc(C.rose, C.violet, k), a: .55, seed: 4, speed: 10 });
  const cam = lt * 6;
  skyline(c, L3(), -200 - cam * .4, H * .78, ss(1, 11, lt), .9, t);
  ellipseGlow(c, W / 2, H * .8, W * .7, 120, C.peach, .25 * (1 - k * .6));
  skyline(c, L1(), -300 - cam * .8, H * .9, ss(3, 12, lt) * .9, 1, t);
  skyline(c, L2(), -150 - cam * 1.2, H + 30, ss(4, 12.5, lt), 1, t);
  rain(c, t, 1 - ss(8, 12.6, lt), { a: .28 });
  bokeh(c, t, { n: 10, col: C.amber, a: .07, seed: 3, y0: .6, y1: 1 });
}

function wetStreet(c, t, gy, lit = 1) {
  const g = c.createLinearGradient(0, gy, 0, H);
  g.addColorStop(0, '#1a1f3d'); g.addColorStop(1, '#090c1a');
  c.fillStyle = g; c.fillRect(0, gy, W, H - gy);
  c.save(); c.globalAlpha = .25; c.fillStyle = '#c9d6ff';
  for (let i = 0; i < 9; i++) { const x = ((i * 260 - t * 0) % W); c.fillRect(x + 60, gy + (H - gy) * .55, 120, 4); }
  c.restore();
}
function sceneStreet(c, t, lt) {
  const push = easeIO(ss(3, 6, lt)), zoom = 1 + push * .08 + lt * .004;
  c.save(); c.translate(W * .62, H * .6); c.scale(zoom, zoom); c.translate(-W * .62, -H * .6);
  sky(c, [[0, hx('#0b1230')], [.6, hx('#2a2d5c')], [1, hx('#4c3f6e')]]);
  stars(c, t, .35, .45);
  clouds(c, t, { n: 5, y: .2, col: hx('#3a3a6a'), a: .6, seed: 8, speed: 6 });
  const gy = H * .72;
  skyline(c, L3(), -380, gy - 40, .7, .9, t);
  skyline(c, L1(), -520, gy + 10, .8, 1, t);
  wetStreet(c, t, gy);
  // bus pulling away to the left
  const bx = lerp(980, -900, easeIO(ss(.6, 4.2, lt)) ), by = gy + 34;
  if (bx > -800) {
    c.save();
    c.fillStyle = '#1c3d4a'; roundRect(c, bx, by - 150, 640, 140, 22); c.fill();
    c.fillStyle = '#0f2530'; c.fillRect(bx, by - 40, 640, 12);
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) { c.fillStyle = rgba(C.warm, .55); roundRect(c, bx + 30 + i * 100, by - 132, 82, 56, 8); c.fill(); }
    glow(c, bx + 630, by - 50, 70, hx('#ff5a5a'), .7); glow(c, bx + 10, by - 50, 60, C.cream, .4);
    reflection(c, bx + 630, by + 4, 30, 150, hx('#ff5a5a'), .7, t);
    c.restore();
    c.fillStyle = '#05070f'; [110, 520].forEach(o => { c.beginPath(); c.arc(bx + o, by - 8, 26, 0, TAU); c.fill(); });
  }
  // streetlamp with a long soft shadow
  const [lx, ly] = streetlamp(c, 1300, gy + 60, 420, { t });
  reflection(c, lx, gy + 70, 40, 260, C.amber, .6, t);
  flare(c, lx, ly, .7 + .3 * env(t));
  const px = 1190, py = gy + 110;
  c.save(); c.globalAlpha = .55; const shg = c.createRadialGradient(px - 160, py, 10, px - 160, py, 260); shg.addColorStop(0, 'rgba(3,4,12,.8)'); shg.addColorStop(1, 'rgba(3,4,12,0)'); c.fillStyle = shg; c.beginPath(); c.ellipse(px - 120 - push * 60, py + 4, 220 + push * 80, 16, 0, 0, TAU); c.fill(); c.restore();
  person(c, px, py, 260, { t, wind: .4, look: -.3 });
  rain(c, t, .25 * (1 - ss(0, 3, lt)), { a: .22 });
  drips(c, t, gy + 40);
  c.restore();
  bokeh(c, t, { n: 12, col: C.amber, a: .08, seed: 12, y0: .1, y1: .9, rMin: 50, rMax: 140 });
}
function drips(c, t, gy) {
  const r = rng(77);
  c.save(); c.strokeStyle = 'rgba(220,230,255,.25)'; c.lineWidth = 1.5;
  for (let i = 0; i < 14; i++) {
    const x = r() * W, y = gy + r() * (H - gy), per = 1.5 + r() * 2, f = ((t + r() * per) % per) / per;
    c.globalAlpha = 1 - f; c.beginPath(); c.ellipse(x, y, 10 + f * 60, (10 + f * 60) * .22, 0, 0, TAU); c.stroke();
  }
  c.restore();
}
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

function sceneStore(c, t, lt) {
  const cam = lt * 9;
  c.save(); c.translate(-cam, 0);
  sky(c, [[0, hx('#0a1029')], [.7, hx('#24295a')], [1, hx('#3a3368')]]);
  stars(c, t, .3, .4);
  const gy = H * .74;
  skyline(c, L1(), -700, gy - 30, .85, 1, t);
  wetStreet(c, t, gy);
  // the convenience store on the corner
  const sx = 1060, sw = 760, sh = 360;
  c.fillStyle = '#151a33'; c.fillRect(sx - 40, gy - sh - 280, sw + 400, sh + 280);
  c.fillStyle = '#0e1226'; c.fillRect(sx - 40, gy - sh - 60, sw + 400, 40);
  c.save(); c.globalCompositeOperation = 'lighter';
  const sg = c.createLinearGradient(0, gy - sh, 0, gy);
  sg.addColorStop(0, 'rgba(255,248,228,.95)'); sg.addColorStop(1, 'rgba(255,226,180,.85)');
  c.fillStyle = sg; c.fillRect(sx, gy - sh + 20, sw, sh - 20);
  c.restore();
  c.fillStyle = 'rgba(80,90,120,.55)';
  for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) c.fillRect(sx + 40 + i * 120, gy - sh + 90 + r * 80, 90, 10);
  c.fillStyle = 'rgba(60,70,100,.35)';
  for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) c.fillRect(sx + 44 + i * 120 + j * 17, gy - sh + 62 + r * 80, 12, 28);
  c.fillStyle = '#151a33'; [0, 1, 2, 3].forEach(i => c.fillRect(sx + i * sw / 3 - 6, gy - sh + 20, 12, sh - 20));
  // sign band with a stripe
  c.save(); c.globalCompositeOperation = 'lighter';
  c.fillStyle = rgba(C.mint, .8); c.fillRect(sx - 40, gy - sh - 20, sw + 400, 14);
  c.fillStyle = rgba(C.amber, .7); c.fillRect(sx - 40, gy - sh - 4, sw + 400, 10);
  glow(c, sx + sw / 2, gy - sh / 2, 900, hx('#fff0d0'), .28);
  ellipseGlow(c, sx + sw / 2, gy + 60, 700, 90, C.warm, .35);
  reflection(c, sx + sw * .25, gy + 20, 120, 280, C.warm, .5, t);
  reflection(c, sx + sw * .75, gy + 20, 120, 280, C.warm, .5, t);
  c.restore();
  // the city hurries past: car light trails
  const rush = ss(5.1, 6.2, lt) * (1 - ss(9.2, 10, lt) * .4);
  if (rush > 0) {
    const r = rng(41);
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) {
      const dir = r() < .5 ? 1 : -1, y = gy + 40 + r() * 60, sp = 1800 + r() * 1400, L = 300 + r() * 500;
      const x = ((r() * 4000 + dir * lt * sp) % 4000 + 4000) % 4000 - 1000 + cam;
      const col = dir > 0 ? hx('#ff6f6f') : C.cream;
      const g = c.createLinearGradient(x - L * dir, 0, x, 0);
      g.addColorStop(0, rgba(col, 0)); g.addColorStop(1, rgba(col, .6 * rush));
      c.fillStyle = g; c.fillRect(Math.min(x, x - L * dir), y, L, 3 + r() * 3);
    }
    c.restore();
  }
  // a figure outside, letter held close
  person(c, 820, gy + 90, 280, { t, hold: 1, look: .5, wind: .5, scarf: hx('#e9a07f') });
  c.restore();
  bokeh(c, t, { n: 14, col: C.warm, a: .07, seed: 15, rMin: 40, rMax: 120 });
}

function sceneAlley(c, t, lt) {
  const dolly = 1 + lt * .012;
  c.save(); c.translate(W / 2, H * .55); c.scale(dolly, dolly); c.translate(-W / 2, -H * .55);
  sky(c, [[0, hx('#0b1029')], [1, hx('#2a2556')]]);
  stars(c, t, .4, .3);
  const vx = W / 2, vy = H * .52;
  // walls converging
  const wall = (side) => {
    const x0 = side < 0 ? -50 : W + 50, xv = vx + side * 120;
    const g = c.createLinearGradient(x0, 0, xv, 0); g.addColorStop(0, '#120f22'); g.addColorStop(1, '#2a2340');
    c.fillStyle = g; c.beginPath(); c.moveTo(x0, -50); c.lineTo(xv, vy - 260); c.lineTo(xv, vy + 40); c.lineTo(x0, H + 50); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 2;
    for (let i = 1; i < 12; i++) { const f = 1 - Math.pow(.82, i), x = lerp(x0, xv, f); c.beginPath(); c.moveTo(x, lerp(-50, vy - 260, f)); c.lineTo(x, lerp(H + 50, vy + 40, f)); c.stroke(); }
  };
  wall(-1); wall(1);
  const g = c.createLinearGradient(0, vy + 40, 0, H); g.addColorStop(0, '#2d2742'); g.addColorStop(1, '#0d0b18');
  c.fillStyle = g; c.beginPath(); c.moveTo(vx - 120, vy + 40); c.lineTo(vx + 120, vy + 40); c.lineTo(W + 50, H + 50); c.lineTo(-50, H + 50); c.fill();
  // lamp at the end of the alley
  addGlow(c, vx, vy - 60, 380, C.amber, .45);
  addGlow(c, vx, vy - 60, 40, C.cream, .9);
  // hanging lanterns swinging in the rising breeze
  const wind = ss(10, 14, lt);
  for (let i = 0; i < 7; i++) {
    const f = 1 - Math.pow(.78, i + 1);
    [-1, 1].forEach(s => {
      const x = lerp(s < 0 ? 140 : W - 140, vx + s * 120, f), y = lerp(150, vy - 200, f), sc = lerp(1, .15, f);
      const sw = Math.sin(t * 1.6 + i + s) * (.05 + wind * .18);
      c.save(); c.translate(x, y); c.rotate(sw);
      c.strokeStyle = '#05050a'; c.lineWidth = 2 * sc; c.beginPath(); c.moveTo(0, -60 * sc); c.lineTo(0, 0); c.stroke();
      c.fillStyle = hx('#d9583f') ? 'rgba(232,96,70,.95)' : 0; c.beginPath(); c.ellipse(0, 40 * sc, 32 * sc, 42 * sc, 0, 0, TAU); c.fill();
      c.globalCompositeOperation = 'lighter'; glow(c, 0, 40 * sc, 160 * sc, hx('#ff8a5a'), .4); glow(c, 0, 40 * sc, 30 * sc, C.warm, .6);
      c.restore();
    });
  }
  // the figure walks to the end, then turns back and waits
  const wk = ss(0, 5, lt), f = lerp(.18, .62, wk), sc = lerp(1, .25, f);
  const px = vx + 20, py = lerp(H * .98, vy + 40, f);
  const turn = ss(5.3, 6.4, lt);
  person(c, px, py, 330 * sc, { t, walk: wk < 1 ? lt * 5.5 : null, look: lerp(0, -1, turn), wind: .3 + wind, scarf: hx('#e98b7a'), flip: turn > .5 ? -1 : 1 });
  fireflies(c, t, { n: 24, y0: .35, y1: .85, a: .8, seed: 13 });
  petals(c, t, { n: 30, a: wind, seed: 23, y0: .1, y1: .9 });
  c.restore();
  bokeh(c, t, { n: 10, col: hx('#ff9a6a'), a: .07, seed: 19 });
}

// rooftops at blue hour, with the breeze sweeping through: chorus scene
function sceneBreeze(c, t, lt, v = 0) {
  const push = easeIO(ss(v ? 9 : 10, v ? 14 : 14, lt));
  const zoom = 1 + push * .35;
  c.save(); c.translate(W * .76, H * .56); c.scale(zoom, zoom); c.translate(-W * .76, -H * .56);
  const top = v ? hx('#0b1233') : hx('#1b2459'), mid = v ? hx('#2c3a78') : hx('#4b4f90');
  sky(c, [[0, top], [.55, mid], [.8, v ? hx('#4d5a9a') : hx('#9a7fb0')], [1, v ? hx('#7f78a8') : hx('#e3a59a')]]);
  // the warm rim of sunset fades: "until the fire falls silent"
  const ember = (v ? .35 : 1) * (1 - ss(5.2, 8.6, lt) * .85);
  ellipseGlow(c, W * .35, H * .72, W * .8, 220, hx('#ffb37a'), .45 * ember);
  stars(c, t, .25 + (1 - ember) * .5, .55);
  moon(c, W * .2, H * (v ? .2 : .26), 46, .95, .2);
  // the promise: two stars drawing close
  const pr = ss(8, 9, lt) * (1 - ss(13, 15, lt));
  if (pr > 0) { const d = lerp(80, 22, ss(8, 10.4, lt)); addGlow(c, W * .52 - d, H * .18, 60, C.warm, .7 * pr); addGlow(c, W * .52 + d, H * .18, 60, C.mint, .7 * pr); addGlow(c, W * .52, H * .18, 140, C.cream, .25 * pr * ss(9.5, 10.5, lt)); }
  clouds(c, t, { n: 6, y: .3, col: v ? hx('#3d4685') : hx('#8c6f9e'), a: .55, seed: 6, speed: 14 });
  const cityLit = 1 - ss(6.0, 7.8, lt) * .93 + ss(10.4, 12.6, lt) * .93;
  skyline(c, L3(), -300 - lt * 4, H * .74, cityLit, .85, t);
  // rows of rooftops
  const roofs = (y, col, seed, sc) => {
    const r = rng(seed); c.fillStyle = col; let x = -60 - lt * 6 * sc;
    while (x < W + 100) {
      const w = (120 + r() * 160) * sc, h = (60 + r() * 80) * sc;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + w * .15, y - h); c.lineTo(x + w * .85, y - h); c.lineTo(x + w, y); c.fill();
      c.fillRect(x + w * .1, y - 2, w * .8, 400);
      if (r() < .4) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = rgba(C.amber, .7 * cityLit); c.fillRect(x + w * .4, y + 26 * sc, 18 * sc, 24 * sc); glow(c, x + w * .4 + 9 * sc, y + 38 * sc, 60 * sc, C.amber, .3 * cityLit); c.restore(); c.fillStyle = col; }
      x += w + r() * 20;
    }
  };
  roofs(H * .8, '#1a1c3c', 51, .7);
  roofs(H * .9, '#121430', 52, 1);
  // the house with the lamp-lit window
  house(c, W * .68, H + 20, 330, 300, { col: '#0b0d22', roof: .5, t, win: 1 });
  rays(c, t, W * .68 + 165, H + 20 - 210, { n: 7, len: 700, a: .05 + .07 * (1 - cityLit), dir: -Math.PI / 2, spread: 2.4, seed: 73 });
  breeze(c, t, .9, { y: .45, spread: .35, seed: v ? 5 : 2 });
  // a brighter ribbon carrying the name
  if (lt > 2.4) ribbon(c, t, { y: .38, amp: 50, col: C.warm, a: .9 * ss(2.4, 3, lt) * (1 - ss(5.2, 6, lt)), width: 4, head: lerp(-100, W + 900, ss(2.4, 5.4, lt)), len: 1100 });
  petals(c, t, { n: 46, a: .9, seed: 27, y0: .1, y1: .95, wind: 1.3 });
  c.restore();
  branch(c, t, W + 70, 30, 1.7, 1, 1.3);
  bokeh(c, t, { n: 9, col: C.peach, a: .06, seed: 29, rMin: 60, rMax: 160 });
}

function sceneWindow(c, t, lt) {
  const zoom = 1.04 + lt * .01;
  c.save(); c.translate(W / 2, H / 2); c.scale(zoom, zoom); c.translate(-W / 2, -H / 2);
  sky(c, [[0, hx('#141a40')], [1, hx('#2b2f62')]]);
  c.fillStyle = '#1b1a33'; c.fillRect(0, 0, W, H);
  // plaster texture
  const r = rng(61); c.fillStyle = 'rgba(255,255,255,.015)';
  for (let i = 0; i < 300; i++) c.fillRect(r() * W, r() * H, 3 + r() * 30, 2);
  const wx = W * .3, wy = H * .14, ww = W * .4, wh = H * .62;
  // warm room through the glass
  const g = c.createRadialGradient(wx + ww * .65, wy + wh * .6, 20, wx + ww * .5, wy + wh * .5, ww);
  g.addColorStop(0, '#ffe2ae'); g.addColorStop(.4, '#e79a62'); g.addColorStop(1, '#5a3240');
  c.fillStyle = g; c.fillRect(wx, wy, ww, wh);
  // lamp inside
  const lx = wx + ww * .66, ly = wy + wh * .52;
  c.fillStyle = '#3a2230'; c.fillRect(lx - 4, ly, 8, wh * .38);
  c.fillStyle = '#ffe9c4'; c.beginPath(); c.moveTo(lx - 55, ly); c.lineTo(lx + 55, ly); c.lineTo(lx + 32, ly - 70); c.lineTo(lx - 32, ly - 70); c.fill();
  addGlow(c, lx, ly - 30, 420, C.amber, .55 * (.92 + .08 * env(t)));
  // frame
  c.fillStyle = '#0f0c1c'; c.lineWidth = 0;
  c.fillRect(wx - 26, wy - 26, ww + 52, 26); c.fillRect(wx - 26, wy + wh, ww + 52, 30); c.fillRect(wx - 26, wy, 26, wh); c.fillRect(wx + ww, wy, 26, wh);
  c.fillRect(wx + ww / 2 - 8, wy, 16, wh); c.fillRect(wx, wy + wh * .42, ww, 14);
  c.fillStyle = '#0a0814'; c.fillRect(wx - 60, wy + wh + 24, ww + 120, 22);
  // potted plant on the sill
  c.fillStyle = '#0a0814'; c.fillRect(wx + 40, wy + wh - 50, 60, 52);
  [[0, -40, 34], [-26, -26, 24], [26, -28, 26], [-10, -66, 22], [14, -60, 20]].forEach(([dx, dy, rr], i) => { c.beginPath(); c.arc(wx + 70 + dx + Math.sin(t * 1.5 + i) * 2, wy + wh - 50 + dy, rr, 0, TAU); c.fill(); });
  // curtains billowing out through the open window
  [-1, 1].forEach(s => {
    const bx = s < 0 ? wx : wx + ww;
    c.fillStyle = 'rgba(250,236,220,.55)';
    c.beginPath(); c.moveTo(bx, wy);
    for (let i = 0; i <= 12; i++) { const f = i / 12, bil = Math.sin(t * 1.8 + f * 3 + s) * 30 * f + 60 * f * (.6 + .4 * Math.sin(t * .9)); c.lineTo(bx - s * (70 + bil), wy + f * wh); }
    c.lineTo(bx, wy + wh); c.fill();
  });
  addGlow(c, W / 2, wy + wh * .5, W * .5, C.amber, .12);
  rays(c, t, lx, ly - 30, { n: 12, len: 1500, a: .06, seed: 75 });
  flare(c, lx, ly - 30, .45);
  breeze(c, t, .8, { y: .5, spread: .5, seed: 9, n: 4 });
  petals(c, t, { n: 30, seed: 33, wind: 1.2 });
  c.restore();
}

// the world rushing by from above: time-lapse clouds, rivers of traffic, the breeze finds one window
function sceneRush(c, t, lt) {
  sky(c, [[0, hx('#070b1f')], [1, hx('#1c2250')]]);
  const tilt = H * .25;
  // city grid in perspective
  c.save();
  const r = rng(71);
  for (let i = 0; i < 1400; i++) {
    const u = r(), v = r(), z = .15 + v * .85;
    const x = W / 2 + (u - .5) * W * 2.2 * z, y = tilt + Math.pow(v, 1.4) * (H - tilt) * 1.05;
    const s = 1 + z * 3, warm = r() < .7;
    c.fillStyle = rgba(warm ? C.amber : C.mint, (.25 + r() * .5) * (.8 + .2 * Math.sin(t * 3 + i)));
    c.fillRect(x, y, s, s);
  }
  c.globalCompositeOperation = 'lighter';
  // roads as flowing light
  for (let k = 0; k < 7; k++) {
    const r2 = rng(80 + k), a0 = (r2() - .5) * 1.4, y0 = tilt + 30 + Math.pow(k / 6, 1.5) * 620;
    const pts = []; for (let i = 0; i <= 40; i++) { const f = i / 40; pts.push([lerp(-200, W + 200, f), y0 + Math.sin(f * (3 + k) + a0 * 3) * (30 + k * 25) + f * a0 * 260]); }
    c.strokeStyle = 'rgba(255,200,140,.08)'; c.lineWidth = 6; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
    for (let j = 0; j < 14; j++) {
      const f = ((j / 14 + r2() * .05 + lt * (.12 + r2() * .1) * (k % 2 ? 1 : -1)) % 1 + 1) % 1, i = Math.floor(f * 40), p = pts[i];
      glow(c, p[0], p[1], 8 + k * 2.5, k % 2 ? hx('#ff7a7a') : C.cream, .55);
    }
  }
  c.restore();
  // horizon haze and racing clouds
  ellipseGlow(c, W / 2, tilt, W, 180, hx('#6a6aa8'), .35);
  clouds(c, t * 6, { n: 8, y: .22, spread: .3, col: hx('#454c8a'), a: .5, seed: 12, speed: 30 });
  // the breeze threads through to one window
  const find = ss(2.2, 5, lt), tx = W * .66, ty = H * .62;
  if (lt > 2) {
    ribbon(c, t, { y: .4, amp: 60, col: C.warm, a: .9 * (1 - ss(5.2, 6, lt)), width: 4, head: lerp(-100, tx, find), len: 1200, tilt: .1 });
    addGlow(c, tx, ty, 260 * find, C.amber, .6 * ss(4.4, 5.2, lt));
    addGlow(c, tx, ty, 30, C.cream, ss(4.4, 5.2, lt));
  }
  breeze(c, t, .5, { y: .35, spread: .4, seed: 14, n: 3, speed: 700 });
}

// interior: a cup on the sill, half moonlight half lamplight
function sceneRoom(c, t, lt) {
  const zoom = 1.02 + lt * .006, pan = lt * 3;
  c.save(); c.translate(W / 2 - pan, H / 2); c.scale(zoom, zoom); c.translate(-W / 2, -H / 2);
  // outside: night with a half moon
  sky(c, [[0, hx('#0d1538')], [1, hx('#2b3a72')]]);
  stars(c, t, .6, .6);
  moon(c, W * .33, H * .3, 70, 1, .55);
  skyline(c, L3(), -500, H * .78, .8, .7, t);
  const fog = ss(8, 10.5, lt);
  if (fog > 0) clouds(c, t, { n: 7, y: .62, spread: .25, col: hx('#8a93c0'), a: .55 * fog, seed: 17, speed: 20, scale: 1.5 });
  // room wall with a big window cut out
  c.save();
  c.beginPath(); c.rect(-200, -200, W + 400, H + 400); c.rect(W * .14, H * .08, W * .62, H * .64); c.clip('evenodd');
  const wg = c.createLinearGradient(0, 0, W, 0); wg.addColorStop(0, '#1d2445'); wg.addColorStop(.6, '#3a2a3c'); wg.addColorStop(1, '#6a4038');
  c.fillStyle = wg; c.fillRect(-200, -200, W + 400, H + 400);
  c.restore();
  // window frame & cross bar dividing moonlight from lamplight
  c.fillStyle = '#120e1c';
  c.fillRect(W * .14 - 18, H * .08 - 18, W * .62 + 36, 18); c.fillRect(W * .14 - 18, H * .72, W * .62 + 36, 26);
  c.fillRect(W * .14 - 18, H * .08, 18, H * .64); c.fillRect(W * .76, H * .08, 18, H * .64); c.fillRect(W * .45 - 7, H * .08, 14, H * .64);
  // sill
  c.fillStyle = '#2a1f2c'; c.fillRect(W * .1, H * .745, W * .72, 30);
  c.fillStyle = '#140f1a'; c.fillRect(-200, H * .77, W + 400, H);
  // lamp glow from the right, moonlight from the left
  addGlow(c, W * .95, H * .45, 900, C.amber, .45 * (.95 + .05 * env(t)));
  c.save(); c.globalCompositeOperation = 'lighter';
  const mg = c.createLinearGradient(W * .14, 0, W * .5, H); mg.addColorStop(0, 'rgba(150,180,255,.18)'); mg.addColorStop(1, 'rgba(150,180,255,0)');
  c.fillStyle = mg; c.beginPath(); c.moveTo(W * .14, H * .08); c.lineTo(W * .45, H * .08); c.lineTo(W * .62, H); c.lineTo(W * .2, H); c.fill();
  c.restore();
  // the cup, half lit by each light
  const cx = W * .46, cy = H * .745;
  c.fillStyle = '#e9e4ef'; roundRect(c, cx - 50, cy - 100, 100, 100, 14); c.fill();
  c.strokeStyle = '#e9e4ef'; c.lineWidth = 12; c.beginPath(); c.arc(cx + 56, cy - 52, 24, -1.3, 1.3); c.stroke();
  const cg = c.createLinearGradient(cx - 50, 0, cx + 50, 0); cg.addColorStop(0, 'rgba(120,150,230,.45)'); cg.addColorStop(.5, 'rgba(0,0,0,0)'); cg.addColorStop(1, 'rgba(255,170,90,.5)');
  c.fillStyle = cg; roundRect(c, cx - 50, cy - 100, 100, 100, 14); c.fill();
  // steam
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    c.strokeStyle = `rgba(255,240,225,${.12 + .05 * i})`; c.lineWidth = 6; c.beginPath();
    for (let j = 0; j <= 20; j++) { const f = j / 20, x = cx - 20 + i * 20 + Math.sin(t * 1.2 + f * 6 + i * 2) * 14 * f, y = cy - 110 - f * 200; j ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.stroke();
  }
  c.restore();
  // a sketchbook of tomorrow
  const sk = ss(5.3, 6.4, lt);
  if (sk > 0) {
    c.save(); c.globalAlpha = sk; c.translate(W * .64, H * .75); c.rotate(-.06);
    c.fillStyle = '#f2ead8'; c.fillRect(-120, -16, 240, 16);
    c.strokeStyle = 'rgba(80,60,90,.6)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-100, -8); c.lineTo(lerp(-100, 100, ss(5.6, 8, lt)), -8); c.stroke();
    c.restore();
  }
  c.restore();
  bokeh(c, t, { n: 8, col: C.amber, a: .06, seed: 37, rMin: 70, rMax: 160 });
}

// a winding road at night, a lantern travelling the long way round
function scenePath(c, t, lt) {
  const zoom = 1 + lt * .01;
  c.save(); c.translate(W / 2, H * .6); c.scale(zoom, zoom); c.translate(-W / 2, -H * .6);
  sky(c, [[0, hx('#0a1030')], [.7, hx('#2a3470')], [1, hx('#5a5a90')]]);
  stars(c, t, .8, .5);
  moon(c, W * .82, H * .16, 40, .9, .1);
  hills(c, [[0, H * .52], [W * .3, H * .46], [W * .6, H * .5], [W, H * .44]], '#1a2050');
  hills(c, [[0, H * .62], [W * .25, H * .58], [W * .7, H * .6], [W, H * .56]], '#121637');
  hills(c, [[0, H * .78], [W * .4, H * .72], [W, H * .76]], '#0b0e24');
  // the house at the end of the road
  house(c, W * .7, H * .565, 70, 50, { col: '#0b0e24', t, win: 1 });
  // the winding road
  const P = []; for (let i = 0; i <= 120; i++) { const f = i / 120, y = lerp(H * 1.02, H * .57, Math.pow(f, .8)), amp = lerp(520, 30, f); P.push([W * .45 + Math.sin(f * 11) * amp + f * W * .25, y, lerp(70, 4, f)]); }
  const edge = (side, n) => { const out = []; for (let i = 0; i <= n; i++) { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; out.push([P[i][0] - dy / l * P[i][2] * side * .5, P[i][1] + dx / l * P[i][2] * side * .5]); } return out; };
  const road = (n, fill) => { const L = edge(1, n), R = edge(-1, n).reverse(); c.fillStyle = fill; c.beginPath(); [...L, ...R].forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.fill(); };
  c.save(); c.globalCompositeOperation = 'lighter';
  road(120, 'rgba(200,190,230,.10)');
  const prog = ss(.2, 5.5, lt), idx = Math.min(119, Math.floor(prog * 119));
  if (idx > 1) { const P0 = P.map(q => q.slice()); P.forEach(q => q[2] *= .3); road(idx, 'rgba(255,205,130,.22)'); P.forEach((q, i) => q[2] = P0[i][2]); }
  const p = P[idx]; glow(c, p[0], p[1], 90, C.amber, .7 * (1 - ss(5.5, 6.5, lt))); glow(c, p[0], p[1], 14, C.cream, 1 - ss(5.5, 6.5, lt));
  c.restore();
  // two figures by the house, hands joined
  const meet = ss(2.4, 4.5, lt), hold = ss(4, 5.6, lt);
  const hy = H * .6, sc = 70;
  person(c, W * .7 - 60 + lerp(-60, 0, meet), hy, sc, { t, alpha: meet, reach: hold, scarf: C.rose, col: hx('#080a18') });
  person(c, W * .7 + 60 - lerp(-60, 0, meet), hy, sc, { t, alpha: meet, reach: hold, flip: -1, scarf: C.mint, col: hx('#080a18') });
  if (hold > .5) addGlow(c, W * .7, hy - 34, 60, C.warm, .5 * (hold - .5) * 2);
  fireflies(c, t, { n: 40, y0: .55, y1: .95, seed: 43 });
  c.restore();
}

// star trails that run backwards: time flowing back
function sceneStarTrails(c, t, lt) {
  sky(c, [[0, hx('#050818')], [.7, hx('#141c44')], [1, hx('#2c2f62')]]);
  const px = W * .3, py = H * .1;
  // angle runs forward, slows, then rewinds from the moment the line starts (86.66s)
  const back = t - 86.66;
  const ang = back < 0 ? back * .05 : -Math.sin(Math.min(back, 6) / 6 * Math.PI / 2) * 1.4 - Math.max(0, back - 6) * .02;
  const trail = Math.min(Math.abs(ang) + .06, 1.1);
  const r = rng(91);
  c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
  for (let i = 0; i < 360; i++) {
    const rad = 40 + Math.pow(r(), .8) * W * 1.1, a0 = r() * TAU, br = r() ** 2, col = r() < .2 ? C.warm : r() < .3 ? hx('#a8c4ff') : C.cream;
    const a1 = a0 + ang, a2 = a1 + trail * Math.sign(ang || 1) * -1;
    c.strokeStyle = rgba(col, .1 + br * .45); c.lineWidth = .8 + br * 1.8;
    c.beginPath(); c.arc(px, py, rad, Math.min(a1, a2), Math.max(a1, a2)); c.stroke();
    const sx = px + Math.cos(a1) * rad, sy = py + Math.sin(a1) * rad;
    c.fillStyle = rgba(C.cream, .4 + br * .6); c.beginPath(); c.arc(sx, sy, 1 + br * 1.6, 0, TAU); c.fill();
  }
  c.restore();
  hills(c, [[0, H * .74], [W * .35, H * .7], [W * .7, H * .76], [W, H * .7]], '#0f1330');
  hills(c, [[0, H * .86], [W * .5, H * .8], [W, H * .84]], '#070915');
  // a lit window on the far hill; the figure walks toward it
  house(c, W * .82, H * .705, 60, 46, { col: '#0f1330', t, win: 1 });
  const go = ss(3.2, 11, lt);
  person(c, lerp(W * .3, W * .55, go), H * .83, 170, { t, walk: go > 0 && go < 1 ? lt * 4 : null, scarf: C.rose, wind: .6, look: .4 });
  fireflies(c, t, { n: 20, y0: .7, y1: .95, seed: 47, a: .7 });
}

// the bridge: a door in the night, pushed open
function sceneDoor(c, t, lt) {
  const open = easeIO(ss(6.4, 8.4, lt)), push = ss(7.6, 8.8, lt);
  const zoom = 1 + lt * .012 + push * .5;
  c.save(); c.translate(W / 2, H * .5); c.scale(zoom, zoom); c.translate(-W / 2, -H * .5);
  sky(c, [[0, hx('#0a0f2c')], [1, hx('#1b2148')]]);
  // wall
  const wg = c.createLinearGradient(0, 0, 0, H); wg.addColorStop(0, '#1e2140'); wg.addColorStop(1, '#14162c');
  c.fillStyle = wg; c.fillRect(0, H * .1, W, H);
  c.fillStyle = 'rgba(255,255,255,.025)'; const r = rng(97); for (let i = 0; i < 120; i++) c.fillRect(r() * W, H * .1 + r() * H, 60 + r() * 80, 3);
  c.fillStyle = '#0d0f22'; c.fillRect(0, H * .1 - 20, W, 24);
  c.fillStyle = '#10122a'; c.fillRect(0, H * .86, W, H);
  // doorway with warm light behind
  const dx = W / 2 - 150, dy = H * .3, dw = 300, dh = H * .56;
  const lg = c.createLinearGradient(0, dy, 0, dy + dh); lg.addColorStop(0, '#ffeccb'); lg.addColorStop(1, '#ffc98a');
  c.fillStyle = lg; c.fillRect(dx, dy, dw, dh);
  // door panel swings inward
  const pw = dw * Math.cos(open * Math.PI * .45);
  c.fillStyle = '#3a2a2e'; c.fillRect(dx, dy, pw, dh);
  c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(dx + pw * .12, dy + dh * .08, pw * .76, dh * .36); c.fillRect(dx + pw * .12, dy + dh * .52, pw * .76, dh * .4);
  c.fillStyle = '#e8c27a'; c.beginPath(); c.arc(dx + pw * .86, dy + dh * .52, 7, 0, TAU); c.fill();
  // light spilling out once it opens
  if (open > 0) {
    c.save(); c.globalCompositeOperation = 'lighter';
    const sg = c.createLinearGradient(0, dy + dh, 0, H); sg.addColorStop(0, rgba(C.warm, .5 * open)); sg.addColorStop(1, rgba(C.warm, 0));
    c.fillStyle = sg; c.beginPath(); c.moveTo(dx + pw, dy + dh); c.lineTo(dx + dw, dy + dh); c.lineTo(dx + dw + 500, H); c.lineTo(dx + pw - 200, H); c.fill();
    glow(c, W / 2, dy + dh * .5, 900 * open, C.amber, .45 * open);
    c.restore();
    rays(c, t, W / 2, dy + dh * .45, { n: 14, len: 1600, a: .09 * open, seed: 77 });
  }
  // a small lamp above the door
  c.fillStyle = '#0a0b18'; c.fillRect(W / 2 - 18, dy - 60, 36, 30);
  addGlow(c, W / 2, dy - 40, 260, C.amber, .5); addGlow(c, W / 2, dy - 40, 24, C.cream, .9);
  flare(c, W / 2, dy - 40, .5 + .5 * open);
  c.fillStyle = '#0d0f22'; c.fillRect(dx - 24, dy - 20, dw + 48, 20); c.fillRect(dx - 24, dy, 24, dh); c.fillRect(dx + dw, dy, 24, dh);
  // dust in the light
  fireflies(c, t, { n: 30, x0: dx - 100, x1: dx + dw + 100, y0: .3, y1: .9, col: C.warm, a: .4 + open * .6, seed: 101 });
  c.restore();
  // fade to warm white as we step through
  if (push > 0) { c.fillStyle = rgba(C.cream, push * .85); c.fillRect(0, 0, W, H); }
}

// the other side of the night: a starlit meadow; longing sung into light
function sceneMeadow(c, t, lt) {
  const zoom = 1.06 - lt * .004 + ss(13.6, 17, lt) * .06;
  c.save(); c.translate(W * .48, H * .6); c.scale(zoom, zoom); c.translate(-W * .48, -H * .6);
  const dawn = ss(11.85, 15.5, lt);
  sky(c, [[0, hx('#060a22')], [.55, mixc(hx('#1b2560'), hx('#3a3a78'), dawn)], [.8, mixc(hx('#3a3f80'), hx('#c98aa0'), dawn)], [1, mixc(hx('#4a4c8c'), hx('#ffc89a'), dawn)]]);
  c.save(); c.translate(W / 2, H * .35); c.rotate(-.35);
  ellipseGlow(c, 0, 0, W * .8, 120, hx('#9fa8ff'), .16 * (1 - dawn * .5));
  ellipseGlow(c, 0, 0, W * .6, 60, C.warm, .1);
  c.restore();
  stars(c, t, 1 - dawn * .45, .7);
  moon(c, W * .6, H * .2, 80, 1 - dawn * .3, 0);
  flare(c, W * .6, H * .2, .35 * (1 - dawn));
  ellipseGlow(c, W * .5, H * .7, W * .9, 200, hx('#ffb98a'), .4 * dawn);
  hills(c, [[0, H * .7], [W * .4, H * .64], [W * .8, H * .69], [W, H * .66]], '#141a44');
  hills(c, [[0, H * .82], [W * .5, H * .77], [W, H * .8]], '#0a0d24');
  // the first beam of morning light comes down beside them
  const bx = W * .5, fy = H * .8, beam = easeOut(ss(11.85, 13.4, lt));
  if (beam > 0) {
    c.save(); c.globalCompositeOperation = 'lighter';
    const by = lerp(-100, fy, beam), g = c.createLinearGradient(0, -100, 0, by);
    g.addColorStop(0, rgba(C.warm, 0)); g.addColorStop(.6, rgba(C.warm, .18)); g.addColorStop(1, rgba(C.cream, .45));
    c.fillStyle = g; c.beginPath(); c.moveTo(bx - 60, -100); c.lineTo(bx + 60, -100); c.lineTo(bx + 130, by); c.lineTo(bx - 130, by); c.fill();
    const land = ss(.85, 1, beam);
    ellipseGlow(c, bx, fy, 420, 60, C.warm, .5 * land);
    glow(c, bx, by, 160, C.cream, .5 * beam * (1 - land * .5));
    c.restore();
  }
  grass(c, t, H * .8, { n: 360, h: 60, wind: 1.2 });
  // they stand together: no longer afraid of missing each other
  const fx = W * .4, come = ss(14.0, 16.2, lt), hold = ss(15.8, 16.8, lt);
  const f2x = lerp(W * .78, W * .6, easeOut(come));
  person(c, fx + hold * 30, fy, 230, { t, scarf: C.rose, wind: 1, look: lerp(.6, 1, come), col: hx('#05060f'), reach: hold });
  if (come > 0) person(c, f2x - hold * 30, fy, 236, { t, scarf: C.mint, wind: 1, flip: -1, alpha: ss(13.8, 14.6, lt), walk: come < 1 ? lt * 4.6 : null, col: hx('#05060f'), reach: hold });
  // longing becomes motes of light; at first light they pour into the beam
  const sing = ss(6.2, 7.5, lt), gather = easeIO(ss(11.85, 13.8, lt));
  const r = rng(111);
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 90; i++) {
    const d = r(), ph = r() * TAU, life = 4 + r() * 3, start = 6.2 + r() * 6;
    const age = lt - start; if (age < 0) continue;
    const f = (age % life) / life;
    const rx = fx + Math.sin(f * 5 + ph) * 80 * f + (d - .5) * 300 * f, ry = fy - 230 - f * 600;
    const spin = lt * 1.5 + ph, tx = bx + Math.cos(spin) * (40 + d * 60), ty = lerp(40, fy - 60, (d + lt * .08) % 1);
    const x = lerp(rx, tx, gather), y = lerp(ry, ty, gather);
    const al = sing * (gather > 0 ? lerp(Math.sin(f * Math.PI), 1, gather) : Math.sin(f * Math.PI)) * (.6 + .4 * env(t));
    glow(c, x, y, 22, r() < .5 ? C.warm : C.mint, .5 * al); c.fillStyle = rgba(C.cream, al); c.beginPath(); c.arc(x, y, 2.2, 0, TAU); c.fill();
  }
  c.restore();
  breeze(c, t, .5 + ss(6, 8, lt) * .4, { y: .45, spread: .3, seed: 113, n: 4 });
  fireflies(c, t, { n: 40, y0: .65, y1: .95, seed: 117, a: 1 - dawn * .6 });
  c.restore();
  if (lt < 1.5) { c.fillStyle = rgba(C.cream, .85 * (1 - ss(0, 1.5, lt))); c.fillRect(0, 0, W, H); }
}

// the breeze scatters heavy clouds; the sky clears over the city
function sceneScatter(c, t, lt) {
  const clear = ss(2.6, 7.5, lt);
  sky(c, [[0, mixc(hx('#141424'), hx('#0b1336'), clear)], [.7, mixc(hx('#2a2a40'), hx('#2c3a7a'), clear)], [1, mixc(hx('#3c3a52'), hx('#6a6aa8'), clear)]]);
  stars(c, t, clear, .6);
  moon(c, W * .5, H * .26, 64, clear, 0);
  // heavy clouds pushed out to the sides
  const r = rng(131);
  for (let i = 0; i < 14; i++) {
    const bx = r() * W, by = H * (.1 + r() * .45), dir = bx < W / 2 ? -1 : 1, sp = sloth(clear) * (500 + r() * 700);
    const sp2 = cloudSprite(130 + (i % 4), mixc(hx('#3a3a55'), hx('#4c5590'), clear));
    const s = 1.2 + r() * .8;
    c.save(); c.globalAlpha = .9 * (1 - clear * .7);
    c.drawImage(sp2, bx - sp2.width * s / 2 + dir * sp, by - sp2.height * s / 2, sp2.width * s, sp2.height * s); c.restore();
  }
  skyline(c, L1(), -400 - lt * 5, H * .92, .5 + clear * .5, 1, t);
  skyline(c, L2(), -200 - lt * 8, H + 40, .4 + clear * .6, 1, t);
  breeze(c, t, .6 + .4 * ss(.5, 2, lt), { y: .35, spread: .5, seed: 137, n: 7, speed: 520, amp: 90 });
  petals(c, t, { n: 50, seed: 139, wind: 1.6, a: .9 });
  bokeh(c, t, { n: 10, col: C.amber, a: .06, seed: 141 });
}
const sloth = x => x * x * (3 - 2 * x);

// under the streetlamp, two people find each other; then the camera rises to the sky
function sceneMeet(c, t, lt) {
  const rise = easeIO(ss(6.5, 13, lt));
  c.save(); c.translate(0, rise * H * .55);
  sky(c, [[0, hx('#060a22')], [.3, hx('#0f1840')], [.75, hx('#2a3270')], [1, hx('#4a4a88')]], -H * .6, H);
  c.fillStyle = '#060a22'; c.fillRect(0, -H, W, H * .6);
  stars(c, t, .9, .7, 0, -H * .55);
  stars(c, t + 3, .7, .8, 300, 0);
  const gy = H * .76;
  skyline(c, L3(), -600, gy - 30, 1, .85, t);
  skyline(c, L1(), -260, gy + 10, .9, 1, t);
  const g = c.createLinearGradient(0, gy, 0, H); g.addColorStop(0, '#1a1f3d'); g.addColorStop(1, '#0a0d1d');
  c.fillStyle = g; c.fillRect(0, gy, W, H - gy + 10);
  const [lx, ly] = streetlamp(c, W * .5, gy + 22, 440, { t, arm: 0 });
  flare(c, lx, ly, .6);
  reflection(c, lx, gy + 100, 40, 200, C.amber, .5, t);
  // your gaze: a soft line of light guiding the way
  const walk = ss(0, 3.4, lt), gaze = ss(0, 2.2, lt) * (1 - ss(3.4, 4.4, lt));
  const ax = W * .5 + 70, bx = lerp(W * .12, W * .5 - 70, walk), fy = gy + 22;
  if (gaze > 0) ribbon(c, t, { y: (fy - 150) / H, amp: 10, col: C.warm, a: .7 * gaze, width: 2.5, head: lerp(ax, bx, ss(0, 2, lt)), len: 600, k: .01 });
  person(c, ax, fy, 250, { t, flip: -1, scarf: C.mint, look: .3, reach: ss(3.2, 4.2, lt) });
  person(c, bx, fy, 250, { t, walk: walk < 1 ? lt * 5 : null, scarf: C.rose, reach: ss(3.2, 4.2, lt) });
  addGlow(c, W * .5, fy - 140, 140, C.warm, .5 * ss(3.6, 4.6, lt));
  petals(c, t, { n: 40, seed: 151, wind: 1, a: .9, y0: .2, y1: 1 });
  c.restore();
  breeze(c, t, .4 + rise * .4, { y: .4, spread: .4, seed: 153, n: 5 });
  fireflies(c, t, { n: 20, y0: .1, y1: .9, a: .5 * rise, seed: 157 });
}

function sceneOutro(c, t, lt) {
  sky(c, [[0, hx('#050818')], [.6, hx('#17205a')], [1, hx('#3c3c80')]]);
  stars(c, t, 1, .85);
  c.save(); c.translate(W / 2, H * .4); c.rotate(-.3);
  ellipseGlow(c, 0, 0, W * .9, 140, hx('#9fa8ff'), .14); ellipseGlow(c, 0, 0, W * .6, 60, C.warm, .1); c.restore();
  moon(c, W * .76, H * .28, 70, 1, .3);
  clouds(c, t, { n: 5, y: .55, col: hx('#3a4380'), a: .5, seed: 161, speed: 8 });
  skyline(c, L3(), -300 - lt * 3, H * 1.02, 1, .8, t);
  breeze(c, t, .7 * (1 - ss(10, 14, lt)), { y: .45, spread: .5, seed: 163, n: 5 });
  petals(c, t, { n: 24, seed: 167, a: 1 - ss(9, 13, lt), wind: .8 });
  branch(c, t, -70, 40, 1.6, -1, .8);
}

// ---------------------------------------------------------------- music: beats & sections
const BEATS = (window.ENV && window.ENV.beats) || [];
const DOWN = (window.ENV && window.ENV.down) || 0;
function lastBeat(t) { let lo = 0, hi = BEATS.length - 1, i = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (BEATS[m] <= t) { i = m; lo = m + 1; } else hi = m - 1; } return i; }
// exponential pulse after each beat (every = 4 -> downbeats only)
function beat(t, decay = 5, every = 1) {
  let i = lastBeat(t); while (i >= 0 && ((i - DOWN) % every + every) % every) i--;
  return i < 0 ? 0 : Math.exp(-(t - BEATS[i]) * decay);
}
const CHORUS = [[42.4, 65.6], [95.6, 118.4], [133.4, 158]];
const chorus = t => CHORUS.reduce((m, [a, b]) => Math.max(m, ss(a - 1, a + .5, t) * (1 - ss(b - 1, b + .5, t))), 0);

// ---------------------------------------------------------------- timeline
// [start, draw, transition type, transition seconds, focus point]
const breezeA = (c, t, lt) => sceneBreeze(c, t, lt, 0), breezeB = (c, t, lt) => sceneBreeze(c, t, lt, 1);
const SCENES = [
  [0, sceneIntro],
  [12.2, sceneStreet, 'zoom', 1.4, [W * .62, H * .55]],
  [18.0, sceneStore, 'whip', .9],
  [27.4, sceneAlley, 'fade', 1.4],
  [42.4, breezeA, 'wind', 1.8],
  [56.0, sceneWindow, 'zoom', 1.0, [W * .76, H * .66]],
  [58.8, sceneRush, 'whip', .9],
  [65.6, sceneRoom, 'iris', 1.6, [W * .66, H * .62]],
  [76.6, scenePath, 'fade', 1.4],
  [84.6, sceneStarTrails, 'dip', 1.8],
  [95.6, breezeB, 'wind', 1.8],
  [109.3, sceneWindow, 'zoom', 1.0, [W * .76, H * .66]],
  [112.0, sceneRush, 'whip', .9],
  [118.4, sceneDoor, 'dip', 1.6],
  [127.2, sceneMeadow, 'fade', .6],
  [143.4, sceneScatter, 'wind', 1.6],
  [151.6, sceneMeet, 'zoom', 1.6, [W * .5, H * .5]],
  [164.6, sceneOutro, 'fade', 2.2],
];
const DURATION = window.SONG.duration;

const stage = mk(W, H), sctx = stage.getContext('2d');
const bufA = mk(W, H), bufB = mk(W, H);
function drawScene(i, c, t) {
  const [s, fn] = SCENES[i];
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none';
  c.clearRect(0, 0, W, H); fn(c, t, t - s); c.restore();
}
function drawScaled(c, img, s, alpha = 1, cx = W / 2, cy = H / 2, dx = 0) {
  c.save(); c.globalAlpha = alpha; c.translate(cx + dx, cy); c.scale(s, s); c.drawImage(img, -cx, -cy); c.restore();
}
const TRANS = {
  fade(c, a, b, k, e) { c.drawImage(bufA, 0, 0); c.globalAlpha = e; c.drawImage(bufB, 0, 0); c.globalAlpha = 1; },
  // dip through deep night
  dip(c, a, b, k, e) {
    drawScaled(c, bufA, 1 + e * .08); c.globalAlpha = ss(.35, .65, k); drawScaled(c, bufB, 1.08 - e * .08); c.globalAlpha = 1;
    c.fillStyle = `rgba(4,5,14,${Math.sin(k * Math.PI) * .9})`; c.fillRect(0, 0, W, H);
  },
  // push through the frame toward a focus point
  zoom(c, a, b, k, e, t, pt) {
    const [cx, cy] = pt || [W / 2, H / 2];
    drawScaled(c, bufA, 1 + e * .45, 1, cx, cy);
    drawScaled(c, bufB, lerp(1.22, 1, e), ss(.2, .8, k), cx, cy);
    addGlow(c, cx, cy, W * .6, C.cream, .28 * Math.sin(k * Math.PI));
  },
  // whip pan: both frames slide with directional motion blur and a light streak at the seam
  whip(c, a, b, k, e) {
    const off = e * W, blur = Math.sin(k * Math.PI) * 160;
    for (const [img, base] of [[bufA, -off], [bufB, W - off]]) {
      for (let j = 0; j < 6; j++) { c.globalAlpha = 1 / (j + 1); c.drawImage(img, base + blur * (j / 5 - .5), 0); }
    }
    c.globalAlpha = 1;
    c.save(); c.globalCompositeOperation = 'lighter';
    const sx = W - off, g = c.createLinearGradient(sx - 260, 0, sx + 260, 0);
    g.addColorStop(0, rgba(C.warm, 0)); g.addColorStop(.5, rgba(C.cream, .35 * Math.sin(k * Math.PI))); g.addColorStop(1, rgba(C.warm, 0));
    c.fillStyle = g; c.fillRect(sx - 260, 0, 520, H);
    const r = rng(701);
    for (let i = 0; i < 40; i++) { const y = r() * H, L = 200 + r() * 600; c.fillStyle = rgba(r() < .5 ? C.warm : C.mint, .25 * Math.sin(k * Math.PI)); c.fillRect(sx - L / 2 + (r() - .5) * 400, y, L, 1 + r() * 2); }
    c.restore();
  },
  // the breeze carries the next scene in behind a soft diagonal front
  wind(c, a, b, k, e, t) {
    const edge = lerp(-600, W + 600, e);
    drawScaled(c, bufA, 1 + e * .06, 1, W / 2, H / 2, e * 90);
    b.save(); b.globalCompositeOperation = 'destination-in';
    const g = b.createLinearGradient(edge - 320, H / 2 - 180, edge + 320, H / 2 + 180);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    b.fillStyle = g; b.fillRect(0, 0, W, H); b.restore();
    c.drawImage(bufB, 0, 0);
    const s = Math.sin(k * Math.PI);
    c.save(); c.globalCompositeOperation = 'lighter';
    const fg = c.createLinearGradient(edge - 200, H / 2 - 110, edge + 200, H / 2 + 110);
    fg.addColorStop(0, rgba(C.warm, 0)); fg.addColorStop(.5, rgba(C.peach, .22 * s)); fg.addColorStop(1, rgba(C.warm, 0));
    c.fillStyle = fg; c.fillRect(0, 0, W, H);
    c.restore();
    for (let i = 0; i < 6; i++) ribbon(c, t, { y: .1 + i * .16, amp: 40, col: [C.warm, C.mint, C.rose][i % 3], a: .8 * s, width: 3, head: edge + 300 - i * 50 + Math.sin(i * 3) * 80, len: 900, tilt: .55 });
    const r = rng(703);
    c.save();
    for (let i = 0; i < 60; i++) {
      const x = edge + (r() - .7) * 700 + Math.sin(t * 2 + i) * 30, y = r() * H + (x - edge) * .55, sz = 4 + r() * 7;
      c.save(); c.translate(x, y); c.rotate(t * 3 + i); c.fillStyle = rgba(mixc(C.rose, C.cream, r() * .6), .8 * s);
      c.beginPath(); c.ellipse(0, 0, sz, sz * .5, 0, 0, TAU); c.fill(); c.restore();
    }
    c.restore();
  },
  // iris: open a circle of the next scene out of a light source
  iris(c, a, b, k, e, t, pt) {
    const [cx, cy] = pt || [W / 2, H / 2];
    drawScaled(c, bufA, 1 + e * .6, 1, cx, cy);
    const R = Math.pow(e, 1.5) * W * 1.3;
    b.save(); b.globalCompositeOperation = 'destination-in';
    const g = b.createRadialGradient(cx, cy, Math.max(0, R - 280), cx, cy, R + 1);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    b.fillStyle = g; b.fillRect(0, 0, W, H); b.restore();
    c.drawImage(bufB, 0, 0);
    c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba(C.warm, .35 * (1 - e)); c.lineWidth = 60;
    c.filter = 'blur(20px)'; c.beginPath(); c.arc(cx, cy, Math.max(1, R - 140), 0, TAU); c.stroke(); c.restore();
  },
};
function renderScenes(t, out) {
  let i = 0; while (i + 1 < SCENES.length && SCENES[i + 1][0] <= t) i++;
  const [s, , type, dur, pt] = SCENES[i];
  if (!type || t >= s + dur) { drawScene(i, out, t); return; }
  const k = clamp((t - s) / dur), e = easeIO(k);
  const a = bufA.getContext('2d'), b = bufB.getContext('2d');
  drawScene(i - 1, a, t); drawScene(i, b, t);
  out.save(); out.setTransform(1, 0, 0, 1, 0, 0); out.clearRect(0, 0, W, H);
  TRANS[type](out, a, b, k, e, t, pt);
  out.restore();
}

// ---------------------------------------------------------------- post: grade, vignette, grain, light leaks, dust, letterbox
const vign = (() => { const v = mk(W, H), g = v.getContext('2d'); const gr = g.createRadialGradient(W / 2, H * .48, H * .35, W / 2, H / 2, H * 1.05); gr.addColorStop(0, 'rgba(5,6,20,0)'); gr.addColorStop(1, 'rgba(5,6,20,.62)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); return v; })();
const grain = (() => { const n = mk(512, 512), g = n.getContext('2d'), id = g.createImageData(512, 512), r = rng(3); for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } g.putImageData(id, 0, 0); return n; })();
function post(t) {
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(255,190,150,.10)'; ctx.fillRect(0, 0, W, H);
  // drifting light leaks, warmer in the choruses
  ctx.globalCompositeOperation = 'screen';
  const la = .05 + .07 * chorus(t) + .03 * env(t);
  glow(ctx, W * (.5 + .58 * Math.sin(t * .07)), H * (.12 + .1 * Math.sin(t * .11)), W * .42, hx('#ff9e6e'), la);
  glow(ctx, W * (.5 - .62 * Math.sin(t * .05 + 2)), H * (.92 + .08 * Math.cos(t * .09)), W * .38, hx('#c77ad6'), la * .8);
  ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(vign, 0, 0);
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = .06;
  const f = Math.floor(t * FPS), ox = (f * 137) % 512, oy = (f * 251) % 512;
  for (let x = -ox; x < W; x += 512) for (let y = -oy; y < H; y += 512) ctx.drawImage(grain, x, y);
  ctx.restore();
  // foreground dust at three depths
  const r = rng(501);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 46; i++) {
    const z = r(), x = ((r() * (W + 80) + t * (8 + z * 26)) % (W + 80) + W + 80) % (W + 80) - 40;
    const y = ((r() * H - t * (3 + z * 9) + Math.sin(t * .4 + i) * 20) % H + H) % H;
    const tw = .5 + .5 * Math.sin(t * (.6 + r()) + i);
    if (z > .85) glow(ctx, x, y, 22 + z * 20, C.warm, .05 * tw);
    else { ctx.fillStyle = rgba(C.cream, (.12 + .3 * z) * tw); ctx.beginPath(); ctx.arc(x, y, .8 + z * 2, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
}
function letterbox(t) {
  const k = easeIO(ss(118.6, 120.0, t)) * (1 - easeIO(ss(131.0, 133.0, t)));
  if (k <= 0) return;
  const h = 128 * k;
  ctx.fillStyle = '#03040b'; ctx.fillRect(0, 0, W, h); ctx.fillRect(0, H - h, W, h);
}

// ---------------------------------------------------------------- kinetic lyrics
const easeOut = x => 1 - Math.pow(1 - x, 3), easeIn = x => x * x * x;
const easeBack = x => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const LINES = window.LYRICS.map(([s, e, text, kind]) => ({ s, e, text, hook: kind === 'hook', vert: kind === 'vert' }));
{
  let prev = null, col = 0;
  LINES.forEach((L, i) => {
    L.chorus = chorus(L.s) > .5;
    L.style = L.vert ? 'vert' : L.hook ? 'hook' : L.chorus ? 'drift' : 'rise';
    if (L.vert) { L.col = col++; L.tin = L.s - .5; L.out = 130.6 + L.col * .14; return; }
    let next = LINES.slice(i + 1).find(n => !n.vert);
    if (next && LINES[i + 1].vert) next = null;
    L.out = next ? Math.min(next.s - .6, L.e + 2.4) : L.e + 1.8;
    L.tin = prev ? Math.max(L.s - .5, prev.out + .55) : L.s - .5;
    prev = L;
  });
}
function glyph(ch, x, y, size, { a = 1, blur = 0, rot = 0, sc = 1, sung = 0, extra = 0 }) {
  if (a < .004) return;
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (sc !== 1) ctx.scale(sc, sc);
  ctx.font = `${size}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (blur > .4) ctx.filter = `blur(${blur.toFixed(1)}px)`;
  ctx.shadowColor = `rgba(6,8,26,${.6 * a})`; ctx.shadowBlur = 16; ctx.shadowOffsetY = 3;
  ctx.fillStyle = rgba(mixc(hx('#e8ecf7'), hx('#ffe3b0'), sung), a * (.8 + .2 * sung)); ctx.fillText(ch, 0, 0);
  const gl = Math.min(1, .7 * sung + extra);
  if (gl > .01) {
    ctx.shadowColor = `rgba(255,176,96,${gl * a})`; ctx.shadowBlur = 26 + 12 * env(window.__t || 0); ctx.shadowOffsetY = 0;
    ctx.fillStyle = rgba(hx('#fff2d8'), a * (.45 * sung + .3 * extra)); ctx.fillText(ch, 0, 0);
  }
  ctx.restore();
}
// little sparks lifting off a character once it is sung
function sparks(x, y, ts, t, i, a, size) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 3; k++) {
    const age = t - ts - k * .09; if (age < 0 || age > 1.5) continue;
    const f = age / 1.5, px = x + Math.sin(k * 2.1 + i) * 18 * f + age * 34, py = y - size * .4 - age * (50 + k * 14);
    glow(ctx, px, py, 9, k % 2 ? C.mint : C.warm, .55 * (1 - f) * a);
    ctx.fillStyle = rgba(C.cream, (1 - f) * a * .9); ctx.beginPath(); ctx.arc(px, py, 1.4, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
function sparkle(x, y, r, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x, y);
  glow(ctx, 0, 0, r * 2.2, C.warm, .5 * a);
  ctx.fillStyle = rgba(C.cream, a);
  ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(0, 0, r, 0); ctx.quadraticCurveTo(0, 0, 0, r); ctx.quadraticCurveTo(0, 0, -r, 0); ctx.quadraticCurveTo(0, 0, 0, -r); ctx.fill();
  ctx.restore();
}
// one character's motion: enter (per style), sung pop, then blown away by the wind
function charMotion(L, i, n, t, cx, cy, size) {
  const dur = Math.max(.4, L.e - L.s), st = L.style;
  const ti = L.tin + i * (st === 'drift' ? .05 : st === 'vert' ? .07 : .035);
  const ap = clamp((t - ti) / (st === 'drift' ? .75 : st === 'hook' ? .7 : .55));
  const ts = L.s + dur * i / n, sung = ss(ts - .05, ts + dur / n * .9, t);
  let x = cx, y = cy, a, blur, rot = 0, sc = 1;
  if (st === 'rise') { const e = easeOut(ap); y += (1 - e) * 34; blur = (1 - e) * 10; sc = lerp(1.2, 1, e); a = Math.min(1, ap * 1.6); }
  else if (st === 'drift') { const e = easeBack(ap); x = lerp(cx - 190, cx, e); y += Math.sin((1 - ap) * 5 + i) * 46 * (1 - ap); rot = (1 - ap) * -.7; blur = (1 - ap) * 9; a = Math.min(1, ap * 1.5); }
  else if (st === 'hook') { const e = easeOut(ap); y += (1 - e) * 18; blur = (1 - e) * 16; sc = lerp(.82, 1, e); a = ap; }
  else { const e = easeOut(ap); y -= (1 - e) * 46; blur = (1 - e) * 12; a = ap; }
  if (t > ts) sc *= 1 + (st === 'hook' ? .12 : .07) * Math.exp(-(t - ts) * 5);
  const ex = clamp((t - L.out - i * .025) / .55);
  if (ex > 0) {
    const e = easeIn(ex);
    if (st === 'vert') { x -= e * (60 + 40 * Math.sin(i * 5)); y -= e * 50; }
    else { x += e * (100 + 40 * Math.sin(i * 7)); y -= e * (36 + 24 * Math.cos(i * 3)); }
    rot += e * .55; blur += e * 12; a *= 1 - ex;
  }
  return { x, y, a, blur, rot, sc, sung, ts };
}
function drawLine(L, t) {
  if (t < L.tin || t > L.out + 1.0) return;
  const chars = [...L.text], n = chars.length;
  const size = L.hook ? 88 : L.vert ? 58 : 64;
  ctx.save(); ctx.font = `${size}px ${FONT}`;
  if (L.vert) {
    const x = W * .87 - L.col * 116, y0 = H * .2, step = size * 1.24;
    // hairline that grows beside each column
    const rl = easeOut(ss(L.tin, L.tin + 1.2, t)) * (1 - ss(L.out, L.out + .6, t));
    if (rl > 0) { ctx.strokeStyle = rgba(C.warm, .35 * rl); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 46, y0 - 30); ctx.lineTo(x + 46, y0 - 30 + (n * step) * rl); ctx.stroke(); }
    chars.forEach((ch, i) => {
      const m = charMotion(L, i, n, t, x, y0 + i * step, size);
      glyph(ch, m.x, m.y, size, m);
      if (t > m.ts) sparks(m.x, m.y, m.ts, t, i, m.a, size);
    });
    ctx.restore(); return;
  }
  const ws = chars.map(ch => ch === '　' ? size * .55 : ctx.measureText(ch).width);
  const track = L.hook ? easeOut(ss(L.tin, L.tin + 1.5, t)) : 1;
  const gap = L.hook ? lerp(64, 18, track) : 5;
  const total = ws.reduce((p, q) => p + q, 0) + gap * (n - 1);
  const cy = L.hook ? H * .83 : H * .865;
  const fade = 1 - ss(L.out, L.out + .7, t);
  if (L.hook) { // bloom behind the title phrase, breathing on the beat
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ellipseGlow(ctx, W / 2, cy, total * .75, 90, C.peach, (.08 + .07 * beat(t, 4)) * ss(L.tin, L.tin + 1, t) * fade);
    ctx.restore();
  }
  let x = W / 2 - total / 2;
  const dur = Math.max(.4, L.e - L.s);
  chars.forEach((ch, i) => {
    const w = ws[i], cx = x + w / 2; x += w + gap;
    if (ch === '　') return;
    const m = charMotion(L, i, n, t, cx, cy, size);
    glyph(ch, m.x, m.y, size, m);
    if (t > m.ts) sparks(m.x, m.y, m.ts, t, i, m.a, size);
  });
  // a glint riding the sung position
  const p = (t - L.s) / dur;
  if (p > 0 && p < 1.05) sparkle(W / 2 - total / 2 + clamp(p) * total, cy - size * .62, 9 + 3 * Math.sin(t * 9), Math.sin(Math.PI * clamp(p)) * .9 * fade);
  if (L.hook) { // an underline that draws itself out from the centre, with two little diamonds
    const u = easeOut(ss(L.tin + .3, L.tin + 1.4, t)) * fade, hw = total * .5 * u, uy = cy + size * .66;
    if (u > 0) {
      const g = ctx.createLinearGradient(W / 2 - hw, 0, W / 2 + hw, 0);
      g.addColorStop(0, rgba(C.warm, 0)); g.addColorStop(.5, rgba(C.warm, .75)); g.addColorStop(1, rgba(C.warm, 0));
      ctx.fillStyle = g; ctx.fillRect(W / 2 - hw, uy, hw * 2, 1.6);
      [-1, 1].forEach(sg => { ctx.save(); ctx.translate(W / 2 + sg * (hw + 14), uy + 1); ctx.rotate(Math.PI / 4 + t * .5 * sg); ctx.fillStyle = rgba(C.warm, .8 * u); ctx.fillRect(-4, -4, 8, 8); ctx.restore(); });
    }
  }
  ctx.restore();
}

// title: each character condenses out of drifting light, then is carried off by the breeze
function titleCard(t, t0, t1, big = 1) {
  if (t < t0 - .1 || t > t1 + 2) return;
  const chars = [...window.SONG.title], size = 132 * big, gap = 28 * big, cy = H * .45;
  ctx.save(); ctx.font = `${size}px ${FONT}`;
  const ws = chars.map(ch => ctx.measureText(ch).width), total = ws.reduce((p, q) => p + q, 0) + gap * (chars.length - 1);
  let x = W / 2 - total / 2;
  const r = rng(801);
  chars.forEach((ch, i) => {
    const cx = x + ws[i] / 2; x += ws[i] + gap;
    const ti = t0 + i * .26, ap = ss(ti + .8, ti + 1.8, t);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 18; k++) {
      const ox = (r() - .5) * 700, oy = (r() - .5) * 420, f = easeIO(clamp((t - ti - r() * .3) / 1.4));
      const al = Math.sin(Math.PI * f) * .8 * (t1 > t ? 1 : 0);
      if (al <= 0) continue;
      const px = cx + ox * (1 - f) + Math.sin(f * 6 + k) * 30 * (1 - f), py = cy + oy * (1 - f);
      glow(ctx, px, py, 12, k % 3 ? C.warm : C.mint, al * .6); ctx.fillStyle = rgba(C.cream, al); ctx.beginPath(); ctx.arc(px, py, 1.6, 0, TAU); ctx.fill();
    }
    ctx.restore();
    const ex = clamp((t - (t1 - 1.2) - i * .08) / .9), e = easeIn(ex);
    glyph(ch, cx + e * 160, cy - e * 60, size, { a: ap * (1 - ex), blur: (1 - easeOut(ap)) * 18 + e * 14, rot: e * .6, sc: lerp(1.15, 1, easeOut(ap)), sung: ss(t0 + 2.4, t0 + 4, t) * .6, extra: .3 * beat(t, 3) * ap });
  });
  const sa = ss(t0 + 2.2, t0 + 3.6, t) * (1 - ss(t1 - 1.2, t1 - .2, t));
  if (sa > 0) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `italic ${30 * big}px ${FONT}`;
    ctx.letterSpacing = `${lerp(18, 4, easeOut(sa)).toFixed(1)}px`;
    ctx.fillStyle = rgba(hx('#f3d9c4'), .85 * sa); ctx.fillText(window.SONG.subtitle, W / 2, cy + 104 * big);
    ctx.letterSpacing = '0px';
    const hw = 200 * easeOut(sa);
    const g = ctx.createLinearGradient(W / 2 - hw, 0, W / 2 + hw, 0);
    g.addColorStop(0, rgba(C.warm, 0)); g.addColorStop(.5, rgba(C.warm, .7 * sa)); g.addColorStop(1, rgba(C.warm, 0));
    ctx.fillStyle = g; ctx.fillRect(W / 2 - hw, cy + 72 * big, hw * 2, 1.5);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- frame
window.renderAt = function (t) {
  window.__t = t;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  renderScenes(t, sctx);
  // floating camera: slow drift, slight roll, and a breath on the beat (stronger in the choruses)
  const ch = chorus(t);
  const z = 1.04 + .012 * beat(t, 4.5) * (.35 + .65 * ch) + .01 * beat(t, 2.5, 4) * ch;
  const fx = Math.sin(t * .21) * 10 + Math.sin(t * .53 + 1) * 4, fy = Math.cos(t * .17) * 7 + Math.sin(t * .41) * 3, roll = Math.sin(t * .13) * .004;
  ctx.save(); ctx.translate(W / 2 + fx, H / 2 + fy); ctx.rotate(roll); ctx.scale(z, z); ctx.drawImage(stage, -W / 2, -H / 2); ctx.restore();
  post(t);
  letterbox(t);
  titleCard(t, 1.4, 11.6, 1);
  titleCard(t, 174.4, 190, .8);
  for (const L of LINES) drawLine(L, t);
  const black = Math.max(1 - ss(0, 2.2, t), ss(DURATION - 1.4, DURATION, t));
  if (black > 0) { ctx.fillStyle = `rgba(0,0,0,${black})`; ctx.fillRect(0, 0, W, H); }
};
window.META = { duration: DURATION, fps: FPS, events: [] };

// ---------------------------------------------------------------- boot: wait for the font, then live preview or render mode
(async () => {
  try { await document.fonts.load(`66px ${FONT}`, window.LYRICS.map(l => l[2]).join('') + window.SONG.title); } catch (e) { }
  window.READY = true;
  const q = new URLSearchParams(location.search);
  if (q.has('render')) return;
  if (q.has('t')) { window.renderAt(parseFloat(q.get('t'))); return; }
  const audio = new Audio('audio/wanfeng.mp3');
  const start = () => { audio.play(); const loop = () => { window.renderAt(audio.currentTime); requestAnimationFrame(loop); }; loop(); };
  window.renderAt(0);
  document.addEventListener('click', start, { once: true });
})();
