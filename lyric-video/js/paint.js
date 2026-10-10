// Watercolour & ink toolkit: noise, paper, layered washes, wobbly ink lines, baked sprites.
// Everything is deterministic (seeded), so any frame can be rendered on its own.
'use strict';
const W = 1920, H = 1080, FPS = 30, TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3), easeIn = t => t * t * t;
const sine = t => .5 - .5 * Math.cos(Math.PI * clamp(t));

function rng(seed) {
  return () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function gauss(r) { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * r()); }
function makeNoise(seed) {
  const r = rng(seed), P = new Uint8Array(512), V = new Float32Array(256);
  for (let i = 0; i < 256; i++) { P[i] = i; V[i] = r(); }
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [P[i], P[j]] = [P[j], P[i]]; }
  for (let i = 0; i < 256; i++) P[i + 256] = P[i];
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = V[P[P[X] + Y]], b = V[P[P[X + 1] + Y]], c = V[P[P[X] + Y + 1]], d = V[P[P[X + 1] + Y + 1]];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
function fbm(n, x, y, oct = 4) { let s = 0, a = .5, f = 1, norm = 0; for (let i = 0; i < oct; i++) { s += a * n(x * f + i * 17.3, y * f - i * 9.1); norm += a; a *= .5; f *= 2.03; } return s / norm; }

const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
// pigments
const P = {
  paper: hx('#f4ede0'), ink: hx('#29252f'), indigo: hx('#3d4a80'), prussian: hx('#2f5b78'), ultra: hx('#5068b2'),
  violet: hx('#7d69a8'), lilac: hx('#b9a6d0'), rose: hx('#e59aa4'), blush: hx('#f2c6c2'), peach: hx('#f2bd92'),
  ochre: hx('#dda957'), gold: hx('#f0c66e'), sienna: hx('#b8704a'), umber: hx('#6e4e3c'), sap: hx('#7f9b62'),
  olive: hx('#9aa36a'), teal: hx('#4e9594'), mint: hx('#9fd0bf'), verm: hx('#cd3e2b'), grey: hx('#8c8b98'),
  slate: hx('#5d6680'), warm: hx('#fff1c9'), cream: hx('#fffaf0'), night: hx('#2a3158'), sky: hx('#a9c2e2'),
};
function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }

// ---------------------------------------------------------------- washes
const rectP = (x, y, w, h, v = 1) => [[x, y, v], [x + w, y, v], [x + w, y + h, v], [x, y + h, v]];
const ellP = (cx, cy, rx, ry, n = 20, v = 1) => Array.from({ length: n }, (_, i) => [cx + Math.cos(i / n * TAU) * rx, cy + Math.sin(i / n * TAU) * ry, v]);
function subdivide(pts, maxLen) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / maxLen));
    for (let k = 0; k < n; k++) out.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n), lerp(a[2] ?? 1, b[2] ?? 1, k / n)]);
  }
  return out;
}
// recursive midpoint displacement (the classic generative watercolour recipe)
function deform(pts, depth, r, amt) {
  for (let d = 0; d < depth; d++) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), v = (a[2] + b[2]) / 2;
      out.push(a, [(a[0] + b[0]) / 2 + gauss(r) * L * amt * v, (a[1] + b[1]) / 2 + gauss(r) * L * amt * v, v * (.55 + r() * .8)]);
    }
    pts = out;
  }
  return pts;
}
function polyPath(g, pts) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); }
let GRAN = null;
function granPattern(g) {
  if (!GRAN) {
    const c = mk(256, 256), cg = c.getContext('2d'), id = cg.createImageData(256, 256), r = rng(41), n = makeNoise(43);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const i = (y * 256 + x) * 4, v = fbm(n, x / 5, y / 5, 3) * .75 + r() * .25;
      id.data[i + 3] = Math.max(0, v - .58) * 260;
    }
    cg.putImageData(id, 0, 0); GRAN = c;
  }
  return g.createPattern(GRAN, 'repeat');
}
// one wash: many translucent, slightly different deformations of the same shape -> soft bleeding edges and pooled pigment
function wash(g, pts, col, o = {}) {
  const { layers = 20, alpha = .05, amt = .5, seed = 1, edge = .6, sub = 70, gran = 0 } = o;
  const r = rng(seed);
  let b = deform(subdivide(pts.map(p => [p[0], p[1], p[2] ?? 1]), sub), 2, r, amt * .5);
  g.save(); g.fillStyle = rgba(col, alpha);
  for (let i = 0; i < layers; i++) { polyPath(g, deform(b, 3, r, amt * .32)); g.fill(); }
  if (edge > 0) { g.strokeStyle = rgba(mixc(col, P.ink, .3), .09 * edge); g.lineWidth = 2.2; polyPath(g, b); g.stroke(); }
  if (gran > 0) { g.globalCompositeOperation = 'destination-out'; g.globalAlpha = gran; polyPath(g, b); g.fillStyle = granPattern(g); g.fill(); }
  g.restore();
}
// a quick flat-ish wash for small details (cheaper)
function dab(g, pts, col, a = .5, seed = 1, amt = .25) {
  const r = rng(seed), b = deform(subdivide(pts.map(p => [p[0], p[1], 1]), 30), 2, r, amt);
  g.save(); g.fillStyle = rgba(col, a * .55); polyPath(g, b); g.fill();
  g.fillStyle = rgba(col, a * .5); polyPath(g, deform(b, 1, r, amt * .5)); g.fill();
  g.strokeStyle = rgba(mixc(col, P.ink, .35), a * .25); g.lineWidth = 1.2; polyPath(g, b); g.stroke();
  g.restore();
}
// soft vertical gradient wash that still looks hand-laid
function gradWash(g, x, y, w, h, stops, seed = 1) {
  const gr = g.createLinearGradient(0, y, 0, y + h);
  stops.forEach(([p, c, a]) => gr.addColorStop(p, rgba(c, a ?? 1)));
  g.save(); g.fillStyle = gr;
  const r = rng(seed), b = deform(subdivide(rectP(x, y, w, h), 120), 2, r, .25);
  for (let i = 0; i < 3; i++) { g.globalAlpha = .4; polyPath(g, deform(b, 2, r, .1)); g.fill(); }
  g.restore();
}

// ---------------------------------------------------------------- ink
// hand-drawn line: small wander along the normal, pressure-varying width, a lighter second pass
function ink(g, pts, o = {}) {
  const { w = 2, col = P.ink, a = .8, seed = 1, wob = 1, closed = false, step = 9, passes = 2 } = o;
  const r = rng(seed), src = closed ? [...pts, pts[0]] : pts, path = [];
  for (let i = 0; i < src.length - 1; i++) {
    const [x0, y0] = src[i], [x1, y1] = src[i + 1], L = Math.hypot(x1 - x0, y1 - y0) || 1, k = Math.max(1, Math.ceil(L / step));
    for (let j = 0; j < k; j++) path.push([lerp(x0, x1, j / k), lerp(y0, y1, j / k), (y1 - y0) / L, -(x1 - x0) / L]);
  }
  const last = src[src.length - 1]; path.push([last[0], last[1], 0, 0]);
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  for (let p = 0; p < passes; p++) {
    let off = gauss(r) * wob * .3, pw = .9, px = null, py = null;
    g.strokeStyle = rgba(col, a * (p ? .4 : 1));
    for (let i = 0; i < path.length; i++) {
      const [x, y, nx, ny] = path[i];
      off = off * .82 + gauss(r) * wob * .35; pw = clamp(pw * .8 + (.55 + r() * .9) * .2, .35, 1.5);
      const qx = x + nx * off + (p ? .8 : 0), qy = y + ny * off + (p ? .6 : 0);
      if (px !== null) { g.lineWidth = w * pw * (p ? .55 : 1); g.beginPath(); g.moveTo(px, py); g.lineTo(qx, qy); g.stroke(); }
      px = qx; py = qy;
    }
  }
  g.restore();
}
const inkRect = (g, x, y, w, h, o = {}) => ink(g, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], { ...o, closed: true });

// ---------------------------------------------------------------- paper
const PAPER = (() => {
  const base = mk(W, H), g = base.getContext('2d');
  g.fillStyle = rgba(P.paper); g.fillRect(0, 0, W, H);
  const lw = 240, lh = 135, lo = mk(lw, lh), lg = lo.getContext('2d'), id = lg.createImageData(lw, lh), n = makeNoise(5);
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
    const i = (y * lw + x) * 4, v = fbm(n, x / 26, y / 26, 4);
    id.data[i] = 150; id.data[i + 1] = 120; id.data[i + 2] = 90; id.data[i + 3] = Math.max(0, v - .42) * 90;
  }
  lg.putImageData(id, 0, 0); g.imageSmoothingQuality = 'high'; g.drawImage(lo, 0, 0, W, H);
  // warm edges, as if the sheet had sat in the sun
  const eg = g.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, H * 1.1);
  eg.addColorStop(0, 'rgba(160,120,80,0)'); eg.addColorStop(1, 'rgba(160,120,80,.16)');
  g.fillStyle = eg; g.fillRect(0, 0, W, H);
  // cold-press tooth + grain, used as a multiply layer over everything
  const tex = mk(W, H), tg = tex.getContext('2d'), td = tg.createImageData(W, H), r = rng(9), tn = makeNoise(11);
  const tooth = new Float32Array(480 * 270);
  for (let y = 0; y < 270; y++) for (let x = 0; x < 480; x++) tooth[y * 480 + x] = tn(x / 1.7, y / 1.7) * .6 + tn(x / 4.1 + 50, y / 4.1) * .4;
  for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i += 4) {
    const tv = tooth[((y >> 2) * 480) + (x >> 2)], v = 232 + tv * 18 + r() * 9;
    td.data[i] = v; td.data[i + 1] = v - 1.5; td.data[i + 2] = v - 4; td.data[i + 3] = 255;
  }
  tg.putImageData(td, 0, 0);
  tg.lineCap = 'round';
  for (let i = 0; i < 1100; i++) {
    const x = r() * W, y = r() * H, a = r() * TAU, L = 6 + r() * 26;
    tg.strokeStyle = `rgba(150,130,110,${.05 + r() * .09})`; tg.lineWidth = .6 + r() * .6;
    tg.beginPath(); tg.moveTo(x, y); tg.quadraticCurveTo(x + Math.cos(a) * L * .5 + (r() - .5) * 6, y + Math.sin(a) * L * .5 + (r() - .5) * 6, x + Math.cos(a) * L, y + Math.sin(a) * L); tg.stroke();
  }
  for (let i = 0; i < 260; i++) { tg.fillStyle = `rgba(120,100,80,${.08 + r() * .14})`; tg.beginPath(); tg.arc(r() * W, r() * H, .5 + r() * 1.3, 0, TAU); tg.fill(); }
  return { base, tex };
})();

// ---------------------------------------------------------------- light (lifted paper) & small live helpers
function lift(c, x, y, r, col = P.warm, a = 1) {
  if (a <= 0 || r <= 0) return;
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(col, a)); g.addColorStop(.4, rgba(col, a * .45)); g.addColorStop(1, rgba(col, 0));
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
}
function liftEll(c, x, y, rx, ry, col, a) { c.save(); c.translate(x, y); c.scale(1, ry / rx); lift(c, 0, 0, rx, col, a); c.restore(); }

// petals: small baked washes
const PETALS = (() => {
  const out = [], cols = [P.rose, P.blush, P.peach, P.rose, P.cream, P.lilac];
  for (let i = 0; i < 6; i++) { const c = mk(44, 28), g = c.getContext('2d'); dab(g, ellP(22, 14, 15, 8, 12), cols[i], .9, 300 + i, .18); out.push(c); }
  return out;
})();
function petals(c, t, { n = 30, a = 1, seed = 21, y0 = .05, y1 = .8, wind = 1, x0 = -60, x1 = W + 60, size = 1 } = {}) {
  if (a <= 0) return;
  const r = rng(seed); c.save();
  for (let i = 0; i < n; i++) {
    const sp = (70 + r() * 120) * wind, ph = r() * TAU, z = .5 + r() * .8, span = x1 - x0;
    const x = x0 + ((r() * span + t * sp * z) % span + span) % span;
    const y = H * lerp(y0, y1, r()) + Math.sin(t * .8 + ph) * 50 * z + Math.sin(x * .004 + ph) * 30;
    const sp_ = PETALS[i % PETALS.length], s = z * size * (.7 + r() * .5);
    c.save(); c.translate(x, y); c.rotate(t * (1 + r() * 2) + ph); c.scale(s, s * (.5 + .45 * Math.abs(Math.sin(t * 2 + ph))));
    c.globalAlpha = a * (.6 + .4 * z); c.drawImage(sp_, -22, -14); c.restore();
  }
  c.restore();
}
// dry-brush wind stroke travelling along a gentle curve (pale, like lifted paint)
function windStroke(c, t, head, { y = 300, amp = 40, k = .004, len = 700, col = P.cream, a = .5, width = 14, ph = 0, tilt = 0 } = {}) {
  if (a <= 0) return;
  const r = rng(Math.floor(ph * 1000) + 7), seg = 36;
  c.save(); c.lineCap = 'round';
  for (let s = 0; s < 5; s++) {
    const oy = (s - 2) * width * .3, sa = .35 + r() * .5;
    let px = null, py = null;
    for (let i = 0; i <= seg; i++) {
      const f = i / seg, x = head - len + f * len;
      const yy = y + oy * (.4 + f * .6) + amp * Math.sin(x * k + ph) + (x - W / 2) * tilt;
      if (px !== null) {
        const gap = Math.sin(f * 23 + s * 3 + ph * 5) > -.55 ? 1 : 0;
        c.strokeStyle = rgba(col, a * sa * gap * Math.pow(f, 1.3) * (1 - ss(.9, 1, f) * .5));
        c.lineWidth = width * .22 * (.4 + f); c.beginPath(); c.moveTo(px, py); c.lineTo(x, yy); c.stroke();
      }
      px = x; py = yy;
    }
  }
  c.restore();
}

// ---------------------------------------------------------------- people (baked watercolour sprites, back views)
const PEOPLE = new Map();
// kind: 'girl' | 'boy'; pose: { walk: -1..1, arm: 'down'|'letter'|'reachR'|'reachL', turn: 0..1, wind: 0..1 }
function person(kind, pose = {}) {
  const key = kind + JSON.stringify(pose);
  if (PEOPLE.has(key)) return PEOPLE.get(key);
  const { walk = 0, arm = 'down', turn = 0, wind = .5 } = pose;
  const cw = 300, chh = 460, c = mk(cw, chh), g = c.getContext('2d'), ox = 150, oy = 440;
  const boy = kind === 'boy', s = boy ? 1.06 : 1;
  g.translate(ox, oy); g.scale(s, s);
  const coat = boy ? hx('#4e6189') : hx('#c99a68'), scarf = boy ? P.teal : P.verm, hair = boy ? hx('#2e2a2c') : hx('#3a2c2a');
  const legs = boy ? hx('#55576a') : hx('#3f4157'), sd = 7 + Math.floor(walk * 10);
  // legs & shoes
  const lx = [-14 - walk * 9, 14 + walk * 9], ly = [-4 + Math.max(0, walk) * 6, -4 + Math.max(0, -walk) * 6];
  lx.forEach((x, i) => {
    g.save(); g.strokeStyle = rgba(legs, .92); g.lineCap = 'round';
    for (let k = 0; k < 3; k++) { g.lineWidth = 15 - k * 3; g.beginPath(); g.moveTo(x * .7, -126); g.lineTo(x, ly[i] - 12); g.stroke(); }
    g.restore();
    dab(g, ellP(x + 2, ly[i] - 6, 12, 6, 10), hx('#3b2a2a'), .95, sd + 5 + i, .12);
    ink(g, [[x * .7 - 7, -126], [x - 6, ly[i] - 12]], { w: 1, a: .45, seed: sd + 9 + i });
  });
  // coat
  const hem = boy ? -118 : -112, coatP = boy
    ? [[-44, -282], [44, -282], [50, hem], [-50, hem]]
    : [[-40, -280], [40, -280], [62, hem], [-62, hem]];
  wash(g, coatP, coat, { layers: 14, alpha: .11, amt: .07, seed: sd + 20, sub: 30, edge: 1 });
  wash(g, [[8, -276], [40, -276], [60, hem], [20, hem]], mixc(coat, P.ink, .25), { layers: 8, alpha: .06, amt: .08, seed: sd + 21, sub: 30, edge: 0 });
  ink(g, [...coatP, coatP[0]], { w: 1.6, a: .7, seed: sd + 22 });
  if (!boy) ink(g, [[0, -270], [0, hem + 4]], { w: 1, a: .35, seed: sd + 23 });
  // bag on the left hip
  if (!boy) { dab(g, [[-70, -175], [-44, -175], [-44, -140], [-70, -140]], P.ochre, .8, sd + 24); ink(g, [[-30, -278], [-60, -176]], { w: 1.1, a: .6, seed: sd + 25 }); }
  // arms
  const sleeve = mixc(coat, P.ink, .12), skin = hx('#f1c4a6');
  const armL = [[-40, -272], [-54, -230], [-56, -176]];
  let armR = [[40, -272], [54, -230], [56, -176]];
  if (arm === 'letter') armR = [[40, -272], [58, -226], [34, -184]];
  if (arm === 'reachR') armR = [[40, -272], [66, -228], [92, -190]];
  const armLL = arm === 'reachL' ? [[-40, -272], [-66, -228], [-92, -190]] : armL;
  [armLL, armR].forEach((A, i) => {
    g.save(); g.strokeStyle = rgba(sleeve, .9); g.lineWidth = 20; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(...A[0]); g.quadraticCurveTo(...A[1], ...A[2]); g.stroke(); g.restore();
    dab(g, ellP(A[2][0], A[2][1] + 8, 8, 10, 10), skin, .95, sd + 30 + i);
    ink(g, A, { w: 1.1, a: .45, seed: sd + 32 + i });
  });
  if (arm === 'letter') { g.save(); g.translate(30, -178); g.rotate(-.25); dab(g, rectP(-18, -12, 36, 24), P.cream, 1, sd + 40, .08); inkRect(g, -18, -12, 36, 24, { w: 1, a: .7, seed: sd + 41 }); ink(g, [[-18, -12], [0, 2], [18, -12]], { w: .9, a: .6, seed: sd + 42 }); g.restore(); }
  // scarf with a tail lifting in the wind
  dab(g, [[-36, -292], [36, -292], [38, -270], [-38, -270]], scarf, .95, sd + 50);
  const tail = []; for (let i = 0; i <= 8; i++) { const f = i / 8; tail.push([-20 - f * 70 * wind, -284 + f * (60 - 50 * wind) + Math.sin(f * 4) * 6]); }
  for (let i = 8; i >= 0; i--) { const f = i / 8; tail.push([-6 - f * 70 * wind, -270 + f * (64 - 48 * wind) + Math.sin(f * 4 + .6) * 6]); }
  dab(g, tail, scarf, .9, sd + 51, .1);
  ink(g, [[-38, -292], [38, -292]], { w: 1, a: .5, seed: sd + 52 });
  // head: hair from behind, a cheek and ear when turning back
  if (turn > 0) { dab(g, ellP(16 * turn, -322, 24, 30, 16), skin, .95, sd + 60); ink(g, [[34 * turn - 2, -340], [40 * turn, -322], [34 * turn - 2, -304]], { w: 1.1, a: .7, seed: sd + 61 }); }
  const hairP = boy
    ? ellP(-4 * turn, -326, 30, 33, 22)
    : [[-36, -350], [-26, -372], [0, -380], [26, -372], [36, -350], [38, -296], [20, -288], [-20, -288], [-40, -296]];
  wash(g, hairP.map(([x, y]) => [x - turn * 6, y]), hair, { layers: 12, alpha: .16, amt: .1, seed: sd + 62, sub: 20, edge: 1 });
  ink(g, [...hairP.map(([x, y]) => [x - turn * 6, y]), [hairP[0][0] - turn * 6, hairP[0][1]]], { w: 1.4, a: .7, seed: sd + 63 });
  g.setTransform(1, 0, 0, 1, 0, 0);
  const out = { cv: c, ox, oy };
  PEOPLE.set(key, out); return out;
}
// draw a person sprite at feet position (x,y) with height scale h (1 = ~400px tall)
function drawPerson(c, spr, x, y, h = 1, { alpha = 1, flip = 1 } = {}) {
  c.save(); c.globalAlpha = alpha; c.translate(x, y); c.scale(flip * h, h); c.drawImage(spr.cv, -spr.ox, -spr.oy); c.restore();
}
