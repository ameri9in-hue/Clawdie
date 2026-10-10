// Timeline, baking, watercolour bleed transitions and the final composite onto paper.
'use strict';
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
ctxT = ctx;

// [start, scene, transition seconds, where the new painting blooms from: [x,y] | 'L' | 'T']
const TIMELINE = [
  [0, 'intro', 3.2, [960, 330]],
  [11.0, 'street', 2.0, [640, 400]],
  [26.3, 'alley', 2.0, [960, 380]],
  [40.6, 'roof', 2.4, 'L'],
  [54.9, 'window', 1.9, [1000, 420]],
  [64.3, 'room', 2.0, [980, 640]],
  [75.4, 'road', 2.0, [420, 820]],
  [84.0, 'trails', 2.4, [320, 160]],
  [94.2, 'roof2', 2.4, 'L'],
  [107.9, 'window2', 1.9, [1000, 420]],
  [117.2, 'door', 2.4, [700, 260]],
  [130.2, 'meadow', 2.6, [960, 520]],
  [143.4, 'scatter', 2.0, 'L'],
  [150.3, 'meet', 2.0, [1010, 330]],
  [163.0, 'outro', 2.6, 'T'],
];
const DURATION = window.SONG.duration, END_FADE = [177.4, 179.6];

// ---------------------------------------------------------------- scene runtime: lazy bake, eviction
const RT = new Map();
function layerXf(c, L, cam) {
  const z = 1 + (cam.z - 1) * (.4 + .6 * L.par);
  c.translate(W / 2, H / 2); c.scale(z, z);
  c.translate((L.cx ?? W / 2) - W / 2 - cam.x * L.par - L.w / 2, (L.cy ?? H / 2) - H / 2 - cam.y * L.par - L.h / 2);
}
const MASKS = new Map();
function bakeMask(m, seed) {
  const key = m.join(',') + ':' + seed;
  if (MASKS.has(key)) return MASKS.get(key);
  const c = mk(W, H), g = c.getContext('2d'), [x0, y0, x1, y1] = m;
  wash(g, rectP(x0, y0, x1 - x0, y1 - y0, .7), [0, 0, 0], { layers: 36, alpha: .08, amt: .22, seed, sub: 90, edge: 0, gran: .5 });
  g.filter = 'blur(22px)'; g.fillStyle = '#000'; g.fillRect(x0 + 60, y0 + 60, x1 - x0 - 120, y1 - y0 - 120); g.filter = 'none';
  MASKS.set(key, c); return c;
}
function getScene(id) {
  if (RT.has(id)) return RT.get(id);
  const def = SCENES_DEF[id], data = {};
  const layers = def.layers.map(L => { const c = mk(L.w, L.h), g = c.getContext('2d'); L.bake(g, L.w, L.h, data); return c; });
  if (def.bakeExtra) def.bakeExtra(data);
  const s = { id, def, data, layers, mask: bakeMask(def.mask, def.mseed) };
  RT.set(id, s); return s;
}
function evict(t) {
  for (const [id] of RT) {
    const idx = TIMELINE.findIndex(e => e[1] === id), next = TIMELINE[idx + 1];
    if (next && t > next[0] + next[2] + 1 && !TIMELINE.some((e, j) => j > idx && e[1] === id)) RT.delete(id);
  }
}

// ---------------------------------------------------------------- noise fields for the bleed transitions
const FW = 480, FH = 270, FIELDS = new Map();
function field(seed, origin) {
  const key = seed + ':' + origin;
  if (FIELDS.has(key)) return FIELDS.get(key);
  const f = new Float32Array(FW * FH), n = makeNoise(seed);
  let mn = 1e9, mx = -1e9;
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const sx = x * W / FW, sy = y * H / FH;
    const d = origin === 'L' ? sx / W : origin === 'T' ? sy / H : Math.hypot(sx - origin[0], sy - origin[1]) / 1300;
    const v = fbm(n, x / 38, y / 38, 4) * .42 + fbm(n, x / 7 + 40, y / 7, 2) * .07 + d * 1.0, i = y * FW + x;
    f[i] = v; mn = Math.min(mn, v); mx = Math.max(mx, v);
  }
  for (let i = 0; i < f.length; i++) f[i] = (f[i] - mn) / (mx - mn);
  FIELDS.set(key, f); return f;
}
const MC = mk(FW, FH), mcg = MC.getContext('2d'), MID = mcg.createImageData(FW, FH);
const EC = mk(FW, FH), ecg = EC.getContext('2d'), EID = ecg.createImageData(FW, FH);
// grow: visible where v < p ; erode: visible where v > p
function fieldMask(f, p, soft, erode) {
  const md = MID.data, ed = EID.data;
  for (let i = 0, j = 3; i < f.length; i++, j += 4) {
    const v = f[i], u = clamp((v - (p - soft)) / soft), a = 1 - u * u * (3 - 2 * u);
    md[j] = (erode ? 1 - a : a) * 255;
    const e = (v - p + soft * .3) / (soft * .28); ed[j] = erode ? 0 : Math.exp(-e * e) * 255;
  }
  mcg.putImageData(MID, 0, 0); ecg.putImageData(EID, 0, 0);
}

// ---------------------------------------------------------------- composite
const SB = mk(W, H), sbg = SB.getContext('2d');
const EB = mk(W, H), ebg = EB.getContext('2d');
function paintScene(id, t, lt) {
  const s = getScene(id), def = s.def, base = def.cam(lt);
  const cam = { x: base.x + Math.sin(t * .21) * 8 + Math.sin(t * .47) * 3, y: base.y + Math.cos(t * .17) * 5, z: base.z };
  sbg.setTransform(1, 0, 0, 1, 0, 0); sbg.globalCompositeOperation = 'source-over'; sbg.globalAlpha = 1; sbg.filter = 'none';
  sbg.fillStyle = '#fff'; sbg.fillRect(0, 0, W, H);
  def.layers.forEach((L, i) => { if (L.hidden) return; sbg.save(); layerXf(sbg, L, cam); sbg.drawImage(s.layers[i], 0, 0); sbg.restore(); });
  s.data.at = (c, i) => { c.save(); layerXf(c, def.layers[i], cam); };
  s.data.drawLayer = (c, i) => { c.save(); layerXf(c, def.layers[i], cam); c.drawImage(s.layers[i], 0, 0); c.restore(); };
  sbg.save(); def.live(sbg, t, lt, s.data, cam); sbg.restore();
  sbg.setTransform(1, 0, 0, 1, 0, 0); sbg.globalAlpha = 1;
  sbg.globalCompositeOperation = 'destination-in'; sbg.drawImage(s.mask, 0, 0);
  return s;
}
function applyField(erode) {
  sbg.globalCompositeOperation = 'destination-in'; sbg.imageSmoothingQuality = 'high'; sbg.drawImage(MC, 0, 0, W, H);
  sbg.globalCompositeOperation = 'source-over';
}
const CB = mk(W, H), cbg = CB.getContext('2d');
function addSB() { cbg.drawImage(SB, 0, 0); }
// the slightly darker "tide line" at the front of the spreading paint
function tideLine(mask, col, a) {
  if (a <= .01) return;
  ebg.setTransform(1, 0, 0, 1, 0, 0); ebg.globalCompositeOperation = 'source-over'; ebg.clearRect(0, 0, W, H);
  ebg.drawImage(EC, 0, 0, W, H);
  ebg.globalCompositeOperation = 'destination-in'; ebg.drawImage(mask, 0, 0);
  ebg.globalCompositeOperation = 'source-in'; ebg.fillStyle = rgba(col); ebg.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = a; ctx.drawImage(EB, 0, 0); ctx.restore();
}
// both paintings are layered together first, then laid onto the paper in a single multiply,
// so the bleed reads as one wet front instead of two stacked stains
function renderPaintings(t) {
  let i = 0; while (i + 1 < TIMELINE.length && TIMELINE[i + 1][0] <= t) i++;
  const [s, id, dur, origin] = TIMELINE[i];
  const inTrans = t < s + dur, k = clamp((t - s) / dur), pNew = lerp(-.1, 1.12, sine(k)), soft = .09;
  cbg.setTransform(1, 0, 0, 1, 0, 0); cbg.globalCompositeOperation = 'source-over'; cbg.globalAlpha = 1; cbg.clearRect(0, 0, W, H);
  let sc = null, f = null;
  if (t > END_FADE[0]) {
    const pe = lerp(-.1, 1.12, sine((t - END_FADE[0]) / (END_FADE[1] - END_FADE[0])));
    paintScene(id, t, t - s); fieldMask(field(999, 'T'), pe, soft, true); applyField(); addSB();
  } else {
    if (inTrans) {
      f = field(100 + i, origin);
      if (i > 0) { const [ps, pid] = TIMELINE[i - 1]; paintScene(pid, t, t - ps); fieldMask(f, pNew, soft, true); applyField(); addSB(); }
    }
    sc = paintScene(id, t, t - s);
    if (inTrans) { fieldMask(f, pNew, soft, false); applyField(); }
    addSB();
  }
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(CB, 0, 0); ctx.restore();
  if (sc && inTrans) tideLine(sc.mask, mixc(P.violet, P.paper, .35), .16 * Math.sin(Math.PI * k));
}

window.renderAt = function (t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.drawImage(PAPER.base, 0, 0);
  renderPaintings(t);
  drawType(t);
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(PAPER.tex, 0, 0); ctx.restore();
  evict(t);
};
window.META = { duration: DURATION, fps: FPS, events: [] };

(async () => {
  try { await document.fonts.load(`60px ${FONT}`, window.LYRICS.map(l => l[2]).join('') + window.SONG.title); } catch (e) { }
  window.READY = true;
  const q = new URLSearchParams(location.search);
  if (q.has('render')) return;
  if (q.has('t')) { window.renderAt(parseFloat(q.get('t'))); return; }
  const audio = new Audio('audio/wanfeng.mp3');
  const start = () => { audio.play(); const loop = () => { window.renderAt(audio.currentTime); requestAnimationFrame(loop); }; loop(); };
  window.renderAt(0);
  document.addEventListener('click', start, { once: true });
})();
