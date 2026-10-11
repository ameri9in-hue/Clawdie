// UPDATE MY PRIORS: drawing kit shared by every scene.
// Pure functions of their inputs (no state between frames), so any frame can be rendered alone.
(() => {
const W = 1920, H = 1080;
const C = {
  ink: '#12142b', ink2: '#1c1f3f', ink3: '#2a2e5c', cream: '#fff4e0', paper: '#f3e6cc',
  coral: '#ff5d5d', coral2: '#c93a4f', mint: '#4fe3b5', mint2: '#1fa384', sun: '#ffc94d', sun2: '#ff9a3d',
  violet: '#7a5cff', violet2: '#4b33c9', sky: '#6ec8ff', night: '#0b0d1f', black: '#08080c', white: '#ffffff',
};
const F = { display: '"Archivo Black", "Arial Black", sans-serif', ui: '"Space Grotesk", Helvetica, Arial, sans-serif',
  mono: '"JetBrains Mono", "DejaVu Sans Mono", monospace' };

// ------------------------------------------------------------ math + time
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, u) => a + (b - a) * u;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const smooth = u => { u = clamp(u); return u * u * (3 - 2 * u); };
const easeOut = u => 1 - (1 - clamp(u)) ** 3;
const easeIn = u => clamp(u) ** 3;
const easeInOut = u => { u = clamp(u); return u < .5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2; };
const back = u => { u = clamp(u); const c = 1.9; return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2; };
const elastic = u => { u = clamp(u); return u === 0 || u === 1 ? u : 2 ** (-10 * u) * Math.sin((u * 10 - .75) * 2.094) + 1; };
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const hash2 = (a, b) => hash(a * 57.3 + b * 13.9);
const noise1 = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; };

const BAR = 2.0, BEAT = .5;
const beatOf = t => t / BEAT;
const pulse = (t, every = BEAT, decay = 7) => Math.exp(-((t % every) / every) * decay);
const kickPulse = t => pulse(t, BEAT, 9);

const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, u) => { const A = hexRgb(a), B = hexRgb(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], clamp(u)))).join(',')})`; };
const rgba = (h, a) => { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; };

// ------------------------------------------------------------ primitives
function text(g, s, x, y, size, color, o = {}) {
  const { align = 'center', font = F.ui, weight = 700, alpha = 1, baseline = 'middle', spacing = 0, stroke = null, strokeW = 0 } = o;
  g.save(); g.globalAlpha *= alpha; g.font = `${weight} ${size}px ${font}`;
  g.textAlign = align; g.textBaseline = baseline;
  if (spacing) g.letterSpacing = `${spacing}px`;
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = strokeW; g.lineJoin = 'round'; g.strokeText(s, x, y); }
  if (color) { g.fillStyle = color; g.fillText(s, x, y); }
  g.restore();
}
function measure(g, s, size, font = F.ui, weight = 700) { g.save(); g.font = `${weight} ${size}px ${font}`; const w = g.measureText(s).width; g.restore(); return w; }
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function circle(g, x, y, r, fill) { g.beginPath(); g.arc(x, y, Math.max(0, r), 0, Math.PI * 2); if (fill) { g.fillStyle = fill; g.fill(); } }
function poly(g, pts) { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); }
function glow(g, x, y, r, color, a = .5) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(color, a)); gr.addColorStop(1, rgba(color, 0));
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}
function vgrad(g, y0, y1, stops) {
  const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr;
}
function star(g, x, y, r, n = 4, inner = .35, rot = 0) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, rad = i % 2 ? r * inner : r; g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
  g.closePath();
}
// Stacked "extruded" display type.
function extrude(g, s, x, y, size, face, side, depth = 14, o = {}) {
  for (let i = depth; i > 0; i--) text(g, s, x + i * .7, y + i, size, side, { font: F.display, weight: 400, ...o });
  text(g, s, x, y, size, face, { font: F.display, weight: 400, ...o });
}

// ------------------------------------------------------------ the gauge (PRIOR's face, and every other dial)
function gauge(g, x, y, r, p, o = {}) {
  const { face = C.ink, rim = C.cream, needle = C.cream, readout = true, ticks = 10, lw = r * .2, label = 'p(doom)', alpha = 1 } = o;
  g.save(); g.translate(x, y); g.globalAlpha *= alpha;
  if (face) circle(g, 0, 0, r * 1.18, face);
  const a0 = Math.PI * 1.08, a1 = Math.PI * 1.92, cy = r * .18;
  const N = 36;
  for (let i = 0; i < N; i++) {
    const u = i / N;
    g.strokeStyle = u < .5 ? mix(C.mint, C.sun, u * 2) : mix(C.sun, C.coral, (u - .5) * 2);
    g.lineWidth = lw; g.beginPath(); g.arc(0, cy, r * .78, lerp(a0, a1, u), lerp(a0, a1, u + 1 / N) + .012); g.stroke();
  }
  g.strokeStyle = face || C.ink; g.lineWidth = Math.max(1.5, r * .025);
  for (let i = 0; i <= ticks; i++) {
    const a = lerp(a0, a1, i / ticks);
    g.beginPath(); g.moveTo(Math.cos(a) * r * .66, cy + Math.sin(a) * r * .66); g.lineTo(Math.cos(a) * r * .9, cy + Math.sin(a) * r * .9); g.stroke();
  }
  const na = lerp(a0, a1, clamp(p));
  g.strokeStyle = needle; g.lineWidth = r * .06; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-Math.cos(na) * r * .12, cy - Math.sin(na) * r * .12); g.lineTo(Math.cos(na) * r * .86, cy + Math.sin(na) * r * .86); g.stroke();
  circle(g, 0, cy, r * .11, needle);
  if (readout) text(g, `${label} ${Math.round(clamp(p) * 100)}%`, 0, cy + r * .58, r * .22, p > .5 ? C.coral : C.mint, { font: F.mono, weight: 700 });
  if (rim) { g.strokeStyle = rim; g.lineWidth = r * .1; g.beginPath(); g.arc(0, 0, r * 1.18, 0, Math.PI * 2); g.stroke(); }
  g.restore();
}

// ------------------------------------------------------------ PRIOR, the character
// pose: { armL, armR (radians, 0 = down, + = raise outward), lean, squash, eyes: 'open'|'happy'|'sleepy'|'wide'|'closed',
//         hold: null|'mug'|'sign', sign: 'FINE', legs: true, sit: false, blink: t, look: -1..1 }
function prior(g, x, y, s, p, t, pose = {}) {
  const { armL = .3, armR = .3, lean = 0, squash = 0, eyes = 'open', hold = null, sign = '', legs = true, sit = false,
    look = 0, glowAmt = 1, antenna = 0 } = pose;
  g.save(); g.translate(x, y); g.scale(s, s);
  // ground shadow
  if (!sit) { g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(0, 300, 190 * (1 + squash * .3), 26, 0, 0, Math.PI * 2); g.fill(); }
  g.rotate(lean);
  g.scale(1 + squash * .12, 1 - squash * .12);
  g.translate(0, squash * 30);
  const hi = p > .5 ? C.coral : C.mint;
  // legs
  g.lineCap = 'round'; g.strokeStyle = C.paper; g.lineWidth = 26;
  if (legs && !sit) {
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 70, 180); g.lineTo(sd * 80, 275); g.stroke();
      g.fillStyle = C.paper; rr(g, sd * 80 - 38 + sd * 10, 262, 76, 34, 17); g.fill(); }
  } else if (sit) {
    const sw = Math.sin(t * 3) * .3;
    for (const sd of [-1, 1]) { const a = sw * sd; g.beginPath(); g.moveTo(sd * 70, 170); g.lineTo(sd * 75 + Math.sin(a) * 90, 170 + Math.cos(a) * 110); g.stroke(); }
  }
  // antenna
  const sway = Math.sin(t * 3.1) * .22 + antenna;
  g.strokeStyle = C.paper; g.lineWidth = 9;
  const ax = Math.sin(sway) * 78, ay = -205 - Math.cos(sway) * 78;
  g.beginPath(); g.moveTo(0, -205); g.quadraticCurveTo(ax * .3, -250, ax, ay); g.stroke();
  // singing: antenna and a halo follow the vocal envelope exported by audio/mix.py
  const env = window.VOCAL_ENV, v = env ? env[Math.max(0, Math.min(env.length - 1, Math.round(t * 30)))] || 0 : 0;
  glow(g, ax, ay, (70 + 90 * v) * glowAmt, hi, .55);
  circle(g, ax, ay, 18 + 8 * v, hi); circle(g, ax - 5, ay - 6, 6, 'rgba(255,255,255,.7)');
  // arms (+ held props)
  const arm = (sd, a) => {
    const sx = sd * 190, sy = 20, L = 120;
    const ex = sx + sd * Math.sin(a) * L, ey = sy + Math.cos(a) * L;
    g.strokeStyle = C.paper; g.lineWidth = 24; g.beginPath(); g.moveTo(sx - sd * 20, sy); g.lineTo(ex, ey); g.stroke();
    circle(g, ex, ey, 22, C.paper);
    return [ex, ey];
  };
  const hL = arm(-1, armL), hR = arm(1, armR);
  // body: cream shell with shading + rim light
  const body = g.createRadialGradient(-70, -90, 20, 0, 0, 230);
  body.addColorStop(0, '#fffaf0'); body.addColorStop(.7, C.cream); body.addColorStop(1, '#d9c9a8');
  if (v > .05) for (let k = 0; k < 3; k++) { g.strokeStyle = rgba(hi, v * (.45 - k * .13)); g.lineWidth = 8 - k * 2; g.beginPath(); g.arc(0, 0, 228 + k * 22 + v * 18, 0, Math.PI * 2); g.stroke(); }
  circle(g, 0, 0, 212, body);
  g.strokeStyle = rgba(hi, .55); g.lineWidth = 6; g.beginPath(); g.arc(0, 0, 210, -.6, .9); g.stroke();
  // face screen
  const scr = g.createLinearGradient(0, -180, 0, 180); scr.addColorStop(0, C.ink2); scr.addColorStop(1, C.night);
  circle(g, 0, 0, 180, scr);
  g.save(); g.beginPath(); g.arc(0, 0, 180, 0, Math.PI * 2); g.clip();
  g.fillStyle = 'rgba(255,255,255,.05)'; g.beginPath(); g.ellipse(-60, -110, 140, 60, -.4, 0, Math.PI * 2); g.fill();
  g.restore();
  gauge(g, 0, 22, 150, p, { face: null, rim: null, readout: true, lw: 26 });
  // eyes
  const blinkT = (t + x * .001) % 4.3, blink = blinkT < .12 ? .1 : 1;
  g.fillStyle = C.cream; g.strokeStyle = C.cream; g.lineWidth = 9; g.lineCap = 'round';
  for (const sd of [-1, 1]) {
    const ex = sd * 54 + look * 10, ey = -118;
    if (eyes === 'happy') { g.beginPath(); g.arc(ex, ey + 8, 16, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    else if (eyes === 'sleepy' || eyes === 'closed') { g.beginPath(); g.moveTo(ex - 15, ey); g.lineTo(ex + 15, ey); g.stroke(); }
    else { g.beginPath(); g.ellipse(ex, ey, eyes === 'wide' ? 18 : 14, (eyes === 'wide' ? 24 : 18) * blink, 0, 0, Math.PI * 2); g.fill(); }
  }
  // props
  if (hold === 'mug') {
    const [mx, my] = hR;
    g.fillStyle = C.coral; rr(g, mx - 30, my - 70, 60, 70, 10); g.fill();
    g.strokeStyle = C.coral; g.lineWidth = 9; g.beginPath(); g.arc(mx + 32, my - 36, 16, -1.3, 1.3); g.stroke();
    text(g, 'P(H|E)', mx, my - 36, 14, C.cream, { font: F.mono });
    for (let i = 0; i < 3; i++) { const k = (t * .8 + i / 3) % 1; g.strokeStyle = `rgba(255,244,224,${.5 * (1 - k)})`; g.lineWidth = 5;
      g.beginPath(); g.moveTo(mx - 12 + i * 12, my - 80 - k * 60); g.bezierCurveTo(mx - 25 + i * 12, my - 95 - k * 60, mx + i * 12, my - 110 - k * 60, mx - 12 + i * 12, my - 130 - k * 60); g.stroke(); }
  }
  if (hold === 'sign') {
    const [mx, my] = hR;
    g.strokeStyle = '#8a6a3a'; g.lineWidth = 12; g.beginPath(); g.moveTo(mx, my); g.lineTo(mx, my - 230); g.stroke();
    const good = sign === 'FINE';
    g.fillStyle = good ? C.mint : C.coral; rr(g, mx - 150, my - 370, 300, 150, 18); g.fill();
    g.strokeStyle = C.ink; g.lineWidth = 6; rr(g, mx - 150, my - 370, 300, 150, 18); g.stroke();
    text(g, sign, mx, my - 295, sign.length > 6 ? 46 : 70, C.ink, { font: F.display, weight: 400 });
  }
  g.restore();
}

// ------------------------------------------------------------ backgrounds + atmosphere
function stars(g, t, n = 160, seed = 1, h = H, alpha = 1) {
  for (let i = 0; i < n; i++) {
    const x = hash(i * 3.1 + seed) * W, y = hash(i * 7.7 + seed) * h;
    const tw = .5 + .5 * Math.sin(t * (1 + hash(i) * 3) + i);
    g.fillStyle = `rgba(255,244,224,${(.25 + .6 * tw) * alpha})`;
    g.fillRect(x, y, 2 + (i % 7 === 0 ? 1.5 : 0), 2 + (i % 7 === 0 ? 1.5 : 0));
  }
}
// City skyline layer: deterministic buildings, lit windows twinkle.
function skyline(g, t, { seed = 1, y0 = 800, hMin = 120, hMax = 420, color = C.ink2, win = C.sun, winRate = .35, scroll = 0, wMin = 60, wMax = 150, alpha = 1 }) {
  g.save(); g.globalAlpha *= alpha;
  let x = -((scroll % 2400) + 2400) % 2400 - 200, i = 0;
  while (x < W + 200) {
    const w = lerp(wMin, wMax, hash(i * 1.7 + seed)), h = lerp(hMin, hMax, hash(i * 3.3 + seed) ** 1.5);
    g.fillStyle = color; g.fillRect(x, y0 - h, w, h + 400);
    if (hash(i * 5.1 + seed) > .7) { g.fillRect(x + w * .4, y0 - h - 40, 6, 40); circle(g, x + w * .4 + 3, y0 - h - 42, 5, Math.sin(t * 4 + i) > 0 ? C.coral : color); }
    for (let wy = y0 - h + 18; wy < y0 - 10; wy += 26) for (let wx = x + 10; wx < x + w - 14; wx += 20) {
      const k = hash2(wx + seed * 13, wy);
      const on = k < winRate * (.6 + .4 * Math.sin(t * .3 + k * 40));
      if (on) { g.fillStyle = rgba(win, .55 + .4 * hash(k * 9)); g.fillRect(wx, wy, 9, 13); }
    }
    x += w + 6; i++;
  }
  g.restore();
}
function vignette(g, amt = .55) {
  const gr = g.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .95);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${amt})`);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
}
let GRAIN = null;
function grain(g, t, amt = .06) {
  if (!GRAIN) {
    GRAIN = document.createElement('canvas'); GRAIN.width = 256; GRAIN.height = 256;
    const c = GRAIN.getContext('2d'), d = c.createImageData(256, 256);
    for (let i = 0; i < d.data.length; i += 4) { const v = hash(i * .013) * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    c.putImageData(d, 0, 0);
  }
  g.save(); g.globalAlpha = amt; g.globalCompositeOperation = 'overlay';
  const f = Math.floor(t * 24), ox = hash(f) * 256, oy = hash(f + 9) * 256;
  g.translate(-ox, -oy); g.fillStyle = g.createPattern(GRAIN, 'repeat'); g.fillRect(0, 0, W + 256, H + 256);
  g.restore();
}
function scanlines(g, a = .18) { g.fillStyle = `rgba(0,0,0,${a})`; for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 2); }
// Rotating sunburst rays.
function rays(g, x, y, n, rot, c1, c2, r = 2400) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.fillStyle = c1; g.fillRect(-r, -r, 2 * r, 2 * r); g.fillStyle = c2;
  for (let i = 0; i < n; i++) { const a = i * Math.PI * 2 / n; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, a, a + Math.PI / n); g.closePath(); g.fill(); }
  g.restore();
}
function halftone(g, x0, y0, w, h, color, f, step = 26) {
  g.fillStyle = color;
  for (let y = y0; y < y0 + h; y += step) for (let x = x0 + ((y / step) % 2) * step / 2; x < x0 + w; x += step) {
    const r = f(x, y) * step * .5; if (r > .4) circle(g, x, y, r);
  }
}
// Paper / fire icons.
function paperIcon(g, x, y, s, rot, a = 1) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); g.globalAlpha *= a;
  g.fillStyle = C.cream; poly(g, [[-40, -52], [22, -52], [40, -34], [40, 52], [-40, 52]]); g.fill();
  g.fillStyle = C.paper; poly(g, [[22, -52], [40, -34], [22, -34]]); g.fill();
  g.fillStyle = 'rgba(18,20,43,.35)'; for (let i = 0; i < 5; i++) g.fillRect(-28, -28 + i * 15, i === 4 ? 30 : 56, 6);
  text(g, 'arXiv', 0, -42, 11, C.coral, { font: F.mono });
  g.restore();
}
function fireIcon(g, x, y, s, t, a = 1) {
  g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha *= a;
  const f = 1 + .12 * Math.sin(t * 18 + x);
  glow(g, 0, 0, 90, C.sun2, .45);
  g.fillStyle = C.coral; g.beginPath(); g.moveTo(0, -70 * f); g.bezierCurveTo(50, -20, 45, 40, 0, 45); g.bezierCurveTo(-45, 40, -50, -20, 0, -70 * f); g.fill();
  g.fillStyle = C.sun; g.beginPath(); g.moveTo(0, -30 * f); g.bezierCurveTo(26, 0, 24, 36, 0, 40); g.bezierCurveTo(-24, 36, -26, 0, 0, -30 * f); g.fill();
  g.restore();
}
function hand(g, x, y, s, rot, color = C.paper) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  g.fillStyle = color; g.strokeStyle = C.ink; g.lineWidth = 6;
  rr(g, -60, 0, 120, 400, 40); g.fill(); g.stroke();
  rr(g, -70, -80, 140, 120, 40); g.fill(); g.stroke();
  for (let i = 0; i < 4; i++) { rr(g, -66 + i * 34, -170 + (i === 0 || i === 3 ? 30 : 0), 30, 110, 15); g.fill(); g.stroke(); }
  rr(g, 52, -60, 30, 90, 15); g.save(); g.translate(70, -20); g.rotate(.5); rr(g, -15, -60, 30, 90, 15); g.fill(); g.stroke(); g.restore();
  g.restore();
}
// A small crowd person (capsule body + head), with raised arms.
function person(g, x, y, s, hue, t, raise = 1, seed = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const bob = Math.sin(t * Math.PI * 2 + seed) * 6 * raise;
  g.translate(0, bob);
  const cols = [C.coral, C.mint, C.sun, C.violet, C.sky, C.cream];
  const col = cols[Math.floor(hue * cols.length) % cols.length];
  g.strokeStyle = col; g.lineWidth = 16; g.lineCap = 'round';
  const a = lerp(.3, 2.6, raise) + Math.sin(t * 6 + seed) * .15 * raise;
  for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 22, -70); g.lineTo(sd * (22 + Math.sin(a) * 55), -70 + Math.cos(a) * 55); g.stroke(); }
  g.fillStyle = col; rr(g, -34, -100, 68, 110, 30); g.fill();
  circle(g, 0, -128, 26, mix(col, C.cream, .35));
  g.restore();
}

window.K = { W, H, C, F, clamp, lerp, inv, smooth, easeOut, easeIn, easeInOut, back, elastic, hash, hash2, noise1,
  BAR, BEAT, beatOf, pulse, kickPulse, mix, rgba, text, measure, rr, circle, poly, glow, vgrad, star, extrude, gauge, prior,
  stars, skyline, vignette, grain, scanlines, rays, halftone, paperIcon, fireIcon, hand, person };
})();
