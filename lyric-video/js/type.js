// Lyrics as ink on the paper: each character is brushed on, a watercolour stroke grows under the
// sung words, the title phrase gets a vermilion seal, and the bridge is a vertical poem in the margin.
'use strict';
const FONT = '"WenKaiTC", "WenQuanYi Zen Hei", serif';
let ctxT = null; // set by main.js

const GLY = new Map();
function glyph(ch, size, bold = false) {
  const key = ch + size + (bold ? 'b' : '');
  if (GLY.has(key)) return GLY.get(key);
  const w = Math.ceil(size * 1.6), h = w, sharp = mk(w, h), g = sharp.getContext('2d');
  g.font = `${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = rgba(P.ink); g.fillText(ch, w / 2, h / 2 + size * .04);
  if (bold) { g.lineJoin = 'round'; g.lineWidth = size * .045; g.strokeStyle = rgba(P.ink); g.strokeText(ch, w / 2, h / 2 + size * .04); }
  const bleed = mk(w, h), bg = bleed.getContext('2d');
  bg.filter = `blur(${(size * .045).toFixed(1)}px)`; bg.drawImage(sharp, 0, 0); bg.drawImage(sharp, 0, 0);
  const out = { sharp, bleed, w, h };
  GLY.set(key, out); return out;
}
const TMP = mk(260, 260), tmpg = TMP.getContext('2d');
// one character: q = how much of it has been brushed on (0..1), ex = how far it has dissolved away
function drawChar(ch, x, y, size, { q = 1, a = 1, ex = 0, bold = false, vertical = false } = {}) {
  if (q <= 0 || a <= 0 || ex >= 1) return;
  const G = glyph(ch, size, bold), c = ctxT;
  const e = easeIn(ex);
  c.save(); c.translate(x + e * 14, y - e * 12);
  // ink feathering into the paper (stronger while wet and while dissolving)
  c.globalAlpha = a * (.16 + .25 * (1 - ss(0, .9, q)) * (q < 1 ? 1 : 0) + .5 * e) * Math.min(1, q * 2);
  c.drawImage(G.bleed, -G.w / 2, -G.h / 2);
  const sa = a * (1 - e);
  if (q >= 1) { c.globalAlpha = sa; c.drawImage(G.sharp, -G.w / 2, -G.h / 2); }
  else {
    tmpg.setTransform(1, 0, 0, 1, 0, 0); tmpg.globalCompositeOperation = 'source-over'; tmpg.clearRect(0, 0, G.w, G.h); tmpg.drawImage(G.sharp, 0, 0);
    tmpg.globalCompositeOperation = 'destination-in';
    const gr = vertical ? tmpg.createLinearGradient(0, 0, G.w * .35, G.h) : tmpg.createLinearGradient(0, 0, G.w, G.h * .4);
    const p = q * 1.3 - .15;
    gr.addColorStop(clamp(p - .14), 'rgba(0,0,0,1)'); gr.addColorStop(clamp(p + .14), 'rgba(0,0,0,0)');
    tmpg.fillStyle = gr; tmpg.fillRect(0, 0, G.w, G.h);
    c.globalAlpha = sa; c.drawImage(TMP, 0, 0, G.w, G.h, -G.w / 2, -G.h / 2, G.w, G.h);
  }
  c.restore();
}

// watercolour "highlighter" stroke that grows under the sung words
const STRIPS = new Map();
function strip(key, w, h, col, vertical, seed) {
  if (STRIPS.has(key)) return STRIPS.get(key);
  const cw = vertical ? h : w, ch = vertical ? w : h, cv = mk(cw, ch), g = cv.getContext('2d');
  const pts = vertical ? rectP(ch * 0 + cw * .22, 16, cw * .56, ch - 32, .5) : rectP(16, ch * .3, cw - 32, ch * .48, .5);
  wash(g, pts, col, { layers: 16, alpha: .075, amt: .3, seed, sub: 40, edge: .8, gran: .25 });
  STRIPS.set(key, cv); return cv;
}
const TS = mk(1400, 1000), tsg = TS.getContext('2d');
function drawStrip(cv, x, y, prog, a, vertical) {
  if (prog <= 0 || a <= 0) return;
  tsg.setTransform(1, 0, 0, 1, 0, 0); tsg.globalCompositeOperation = 'source-over'; tsg.clearRect(0, 0, cv.width, cv.height); tsg.drawImage(cv, 0, 0);
  tsg.globalCompositeOperation = 'destination-in';
  const gr = vertical ? tsg.createLinearGradient(0, 0, 0, cv.height) : tsg.createLinearGradient(0, 0, cv.width, 0);
  const p = prog * 1.06;
  gr.addColorStop(clamp(p - .05), 'rgba(0,0,0,1)'); gr.addColorStop(clamp(p + .02), 'rgba(0,0,0,0)');
  tsg.fillStyle = gr; tsg.fillRect(0, 0, cv.width, cv.height);
  ctxT.save(); ctxT.globalCompositeOperation = 'multiply'; ctxT.globalAlpha = a;
  ctxT.drawImage(TS, 0, 0, cv.width, cv.height, x, y, cv.width, cv.height); ctxT.restore();
}

// the vermilion seal 晚風, carved in white
const SEAL = (() => {
  const s = 92, c = mk(s + 30, s + 30), g = c.getContext('2d');
  wash(g, rectP(15, 15, s, s, .15), P.verm, { layers: 26, alpha: .1, amt: .05, seed: 401, sub: 30, edge: 1 });
  g.globalCompositeOperation = 'destination-out';
  g.font = `${s * .42}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#000';
  g.lineWidth = 2; g.strokeStyle = '#000';
  g.fillText('晚', 15 + s / 2, 15 + s * .29); g.strokeText('晚', 15 + s / 2, 15 + s * .29);
  g.fillText('風', 15 + s / 2, 15 + s * .73); g.strokeText('風', 15 + s / 2, 15 + s * .73);
  g.lineWidth = 3; g.strokeRect(22, 22, s - 14, s - 14);
  const r = rng(402); for (let i = 0; i < 120; i++) { g.globalAlpha = .3 + r() * .5; g.beginPath(); g.arc(15 + r() * s, 15 + r() * s, .5 + r() * 1.6, 0, TAU); g.fill(); }
  return c;
})();
function stamp(x, y, t0, t, a = 1, scale = 1) {
  if (t < t0 || a <= 0) return;
  const k = clamp((t - t0) / .18), s = scale * lerp(1.4, 1, easeOut(k));
  ctxT.save(); ctxT.globalCompositeOperation = 'multiply'; ctxT.globalAlpha = a * Math.min(1, k * 2.5);
  ctxT.translate(x, y); ctxT.rotate(-.04); ctxT.scale(s, s); ctxT.drawImage(SEAL, -SEAL.width / 2, -SEAL.height / 2); ctxT.restore();
}

// ---------------------------------------------------------------- lyric timeline
const SECTION_COL = t => t < 41 ? P.peach : t < 65 ? P.rose : t < 95 ? P.sky : t < 118 ? P.rose : t < 132 ? P.gold : t < 160 ? P.peach : P.blush;
const LINES = window.LYRICS.map(([s, e, text, kind]) => ({ s, e, text, chars: [...text], hook: kind === 'hook', vert: kind === 'vert' }));
{
  let prev = null, col = 0;
  LINES.forEach((L, i) => {
    L.col = SECTION_COL(L.s);
    if (L.vert) { L.c = col++; L.tin = L.s - .6; L.out = 130.2 + L.c * .12; return; }
    const next = LINES[i + 1] && !LINES[i + 1].vert ? LINES[i + 1] : null;
    L.out = next ? Math.min(next.s - .9, L.e + 2.6) : L.e + 2.2;
    L.tin = prev ? Math.max(L.s - .85, prev.out + .55) : L.s - .85;
    prev = L;
  });
}
const BAND_Y = 968;
function drawLine(L, t, i) {
  if (t < L.tin || t > L.out + 1.2) return;
  const n = L.chars.length, dur = Math.max(.5, L.e - L.s), size = L.hook ? 74 : L.vert ? 58 : 56, gap = L.hook ? 18 : L.vert ? 12 : 6;
  const step = .055, wr = .32;
  if (L.vert) {
    const x = 1740 - L.c * 104, y0 = 150, adv = size + gap;
    const st = strip('v' + i, n * adv + 40, size * 1.25, L.col, true, 500 + i);
    drawStrip(st, x - st.width / 2, y0 - adv / 2 - 20, clamp((t - L.s) / dur), 1 - ss(L.out, L.out + .8, t), true);
    L.chars.forEach((ch, k) => {
      const ts = L.s + dur * k / n, sung = ss(ts - .05, ts + .15, t);
      drawChar(ch, x, y0 + k * adv, size, { q: clamp((t - L.tin - k * .07) / .4), a: lerp(.7, .96, sung), ex: clamp((t - L.out - k * .03) / .7), vertical: true });
    });
    if (L.c === 3) stamp(x, y0 + n * adv + 40, L.e - .2, t, 1 - ss(L.out, L.out + .6, t), .8);
    return;
  }
  ctxT.font = `${size}px ${FONT}`;
  const ws = L.chars.map(ch => ch === '　' ? size * .6 : size * 1.0);
  const total = ws.reduce((p, q) => p + q, 0) + gap * (n - 1);
  let x = W / 2 - total / 2 - (L.hook ? 40 : 0);
  const x0 = x;
  const st = strip('h' + i, total + 70, size * 1.3, L.col, false, 600 + i);
  drawStrip(st, x0 - 35, BAND_Y - st.height / 2 + size * .12, clamp((t - L.s) / dur), 1 - ss(L.out, L.out + .8, t), false);
  L.chars.forEach((ch, k) => {
    const w = ws[k], cx = x + w / 2; x += w + gap;
    if (ch === '　') return;
    const ts = L.s + dur * k / n, sung = ss(ts - .05, ts + .15, t);
    drawChar(ch, cx, BAND_Y, size, { q: clamp((t - L.tin - k * step) / wr), a: lerp(.68, .96, sung), ex: clamp((t - L.out - k * .03) / .7), bold: L.hook });
  });
  if (L.hook) stamp(x0 + total + 64, BAND_Y + 2, L.s + .35, t, 1 - ss(L.out, L.out + .6, t), .82);
}

// title page: brushed on, sealed, then dissolved (intro) or left on the page (ending)
function drawTitle(t, t0, t1) {
  if (t < t0 || t > t1 + 1.5) return;
  const chars = [...window.SONG.title], size = 108, gap = 26, y = 760;
  const total = chars.length * size + gap * (chars.length - 1), x0 = W / 2 - total / 2 - 30;
  const st = strip('title' + t0, total + 120, size * 1.25, P.peach, false, 700);
  drawStrip(st, x0 - 60, y - st.height / 2 + 14, ss(t0, t0 + 1.4, t), 1 - ss(t1, t1 + .8, t), false);
  chars.forEach((ch, k) => drawChar(ch, x0 + size / 2 + k * (size + gap), y, size, { q: clamp((t - t0 - .3 - k * .2) / .55), a: .95, ex: clamp((t - t1 - k * .05) / .8), bold: true }));
  stamp(x0 + total + 80, y + 4, t0 + 1.9, t, 1 - ss(t1, t1 + .6, t), 1);
  const sa = ss(t0 + 2.2, t0 + 3.4, t) * (1 - ss(t1, t1 + .7, t));
  if (sa > 0) {
    ctxT.save(); ctxT.textAlign = 'center'; ctxT.textBaseline = 'middle'; ctxT.font = `italic 30px ${FONT}`;
    ctxT.letterSpacing = `${lerp(16, 6, easeOut(sa)).toFixed(1)}px`; ctxT.fillStyle = rgba(P.ink, .7 * sa);
    ctxT.fillText(window.SONG.subtitle, W / 2, y + 96); ctxT.letterSpacing = '0px'; ctxT.restore();
  }
}
function drawType(t) {
  drawTitle(t, 1.2, 10.6);
  drawTitle(t, 174.6, 999);
  LINES.forEach((L, i) => drawLine(L, t, i));
}
