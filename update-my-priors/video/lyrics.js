// UPDATE MY PRIORS: kinetic lyrics. Every word appears on its own sung time, in a style per section.
//   verse   editorial: words rise out of a mask, the sung word gets a highlighter swipe
//   pre     centered: words blur in and swell
//   chorus  stamped: huge stacked display type, each word slams in with a hard shadow
//   bridge  terminal: monospace typewriter with glitch jitter
(() => {
const { W, H, C, F, clamp, lerp, smooth, easeOut, back, hash, noise1, text, measure, rr, rgba, pulse, BEAT } = window.K;

const STYLE = { 'Verse 1': 'verse', 'Verse 2': 'verse', 'Pre-Chorus 1': 'pre', 'Pre-Chorus 2': 'pre', 'Chorus 1': 'chorus',
  'Chorus 2': 'chorus', 'Final Chorus': 'chorus', 'Tag': 'chorus', 'Bridge': 'bridge' };
// where the chorus block sits in each shot, so it frames the picture instead of covering it
const SPOT = { S06: [1330, 470, 980, 132], S07: [960, 190, 1750, 104], S11: [960, 540, 1500, 150], S12: [960, 250, 1650, 120],
  S15: [960, 720, 1700, 112], S16: [760, 300, 1300, 118], S17: [1300, 330, 1100, 104] };
const CHORUS_COLORS = [C.cream, C.sun, C.mint, C.cream, C.coral];
const BIG = new Set(['PRIORS', 'FIRE.', 'FATE,', 'LATE.', 'DOWN,', 'WIRE.', 'ALIVE.', 'TWENTY-FIVE,']);

function wordTimes(S, w) {
  const n0 = S.notes[w.notes[0]], n1 = S.notes[w.notes[w.notes.length - 1]];
  return [n0.t, n1.t + n1.dur];
}
function lineWindow(S, L) {
  const i = S.lines.indexOf(L), next = S.lines[i + 1];
  const end = next && next.t0 - L.t1 < 1.2 ? next.t0 - .02 : L.t1 + .7;
  return [L.t0 - .15, end];
}
function current(S, t) {
  for (const L of S.lines) { const [a, b] = lineWindow(S, L); if (t >= a && t < b) return L; }
  return null;
}
function layout(g, words, size, font, maxW, gapK = .28) {
  const rows = [[]]; let x = 0;
  for (const w of words) {
    const ww = measure(g, w.label, size, font, font === F.display ? 400 : 700);
    if (x + ww > maxW && rows[rows.length - 1].length) { rows.push([]); x = 0; }
    rows[rows.length - 1].push({ w, x, ww }); x += ww + size * gapK;
  }
  rows.forEach(r => { const last = r[r.length - 1]; r.width = last.x + last.ww; });
  return rows;
}

function verse(g, t, S, L, words, sec) {
  const size = 74, x0 = 110, maxW = 1180;
  const items = words.map(w => ({ ...w, label: w.text }));
  const rows = layout(g, items, size, F.ui, maxW);
  const y0 = 1000 - (rows.length - 1) * size * 1.12;
  const [, end] = lineWindow(S, L), out = clamp((t - (end - .25)) / .25);
  text(g, `${sec.name.toUpperCase()}  /  ${['03:00', '03:04', '03:09', '03:15'][S.lines.indexOf(L) % 4]} AM`, x0, y0 - size * .95, 24, rgba(C.sun, .9 * (1 - out)), { align: 'left', font: F.mono });
  rows.forEach((r, ri) => {
    const y = y0 + ri * size * 1.12;
    g.save(); g.beginPath(); g.rect(x0 - 30, y - size * .82, W, size * 1.25); g.clip();
    r.forEach(({ w, x, ww }) => {
      const [a, b] = wordTimes(S, w);
      const u = easeOut((t - a + .08) / .22); if (u <= 0) return;
      const dy = (1 - u) * size * 1.1 + out * -size * 1.2;
      const prog = clamp((t - a) / Math.max(.12, b - a));
      if (prog > 0 && t < b + .35) {      // highlighter swipe on the word being sung
        const fade = 1 - clamp((t - b) / .35);
        g.fillStyle = rgba(C.coral, .85 * fade); g.fillRect(x0 + x - 8, y - size * .52 + dy, (ww + 16) * easeOut(prog * 1.6), size * 1.02);
      }
      text(g, w.label, x0 + x + 4, y + 5 + dy, size, 'rgba(0,0,0,.45)', { align: 'left' });
      text(g, w.label, x0 + x, y + dy, size, C.cream, { align: 'left' });
    });
    g.restore();
  });
}

function pre(g, t, S, L, words) {
  const size = 110;
  const items = words.map(w => ({ ...w, label: w.text.toUpperCase() }));
  const rows = layout(g, items, size, F.display, 1500, .32);
  const y0 = 975 - (rows.length - 1) * size * 1.05;
  const [, end] = lineWindow(S, L), out = clamp((t - (end - .2)) / .2);
  rows.forEach((r, ri) => r.forEach(({ w, x, ww }) => {
    const [a] = wordTimes(S, w), u = clamp((t - a + .05) / .3); if (u <= 0) return;
    const cx = W / 2 - r.width / 2 + x + ww / 2, cy = y0 + ri * size * 1.05;
    g.save(); g.translate(cx, cy); const s = lerp(1.35, 1, easeOut(u)) * (1 + out * .3); g.scale(s, s);
    g.globalAlpha = smooth(u) * (1 - out);
    if (u < 1) g.filter = `blur(${(1 - u) * 14}px)`;
    text(g, w.label, 0, 0, size, C.cream, { font: F.display, weight: 400 });
    g.restore();
  }));
}

function chorus(g, t, S, L, words, shot) {
  const [cx, cy, maxW, base] = SPOT[shot] || [960, 520, 1600, 130];
  const items = words.map(w => ({ ...w, label: w.text.toUpperCase() }));
  const rows = layout(g, items, base, F.display, maxW, .26);
  const lh = base * 1.06, y0 = cy - (rows.length - 1) * lh / 2;
  const [, end] = lineWindow(S, L), out = clamp((t - (end - .18)) / .18);
  const li = S.lines.indexOf(L);
  rows.forEach((r, ri) => r.forEach(({ w, x, ww }, wi) => {
    const [a, b] = wordTimes(S, w), age = t - a + .04; if (age < 0) return;
    const big = BIG.has(w.label) ? 1.12 : 1;
    const s = (lerp(2.3, 1, back(age / .26)) * big) * (1 - out * .4) * (1 + .05 * pulse(t, BEAT, 8) * (t < b ? 1 : 0));
    const rot = (hash(li * 31 + wi) - .5) * .12 + (1 - smooth(age / .26)) * (wi % 2 ? .35 : -.35);
    const col = CHORUS_COLORS[(li + wi) % CHORUS_COLORS.length];
    const px = cx - r.width / 2 + x + ww / 2, py = y0 + ri * lh;
    g.save(); g.translate(px, py - out * 60); g.rotate(rot); g.scale(s, s); g.globalAlpha = 1 - out;
    text(g, w.label, 10, 12, base, C.ink, { font: F.display, weight: 400 });
    if ((li + wi) % 4 === 3) text(g, w.label, 0, 0, base, null, { font: F.display, weight: 400, stroke: col, strokeW: 5 });
    else text(g, w.label, 0, 0, base, col, { font: F.display, weight: 400 });
    g.restore();
    if (age < .2) {                         // impact ring
      g.strokeStyle = rgba(col, 1 - age / .2); g.lineWidth = 6; g.beginPath(); g.ellipse(px, py, ww * .6 * (1 + age * 3), base * .6 * (1 + age * 3), 0, 0, 6.28); g.stroke();
    }
  }));
}

function bridge(g, t, S, L, words) {
  const size = 64, y = 900;
  const full = L.text.toUpperCase();
  let shown = '';
  words.forEach(w => { const [a, b] = wordTimes(S, w); const u = clamp((t - a) / Math.max(.1, b - a)); const s = w.text.toUpperCase();
    shown += s.slice(0, Math.ceil(u * s.length)) + (u >= 1 ? ' ' : ''); });
  const width = measure(g, full, size, F.mono), x0 = W / 2 - width / 2;
  const jit = pulse(t, BEAT, 14) > .7 ? (hash(Math.floor(t * 30)) - .5) * 24 : 0;
  g.fillStyle = 'rgba(0,0,0,.75)'; g.fillRect(x0 - 40, y - size * .9, width + 80, size * 1.8);
  text(g, shown, x0 + jit + 3, y, size, rgba(C.coral, .7), { align: 'left', font: F.mono });
  text(g, shown, x0 + jit, y, size, '#ffffff', { align: 'left', font: F.mono });
  if ((t * 2.5) % 1 < .6) g.fillStyle = '#fff', g.fillRect(x0 + jit + measure(g, shown, size, F.mono) + 4, y - size * .45, size * .5, size * .9);
}

function draw(g, t, S, sec, shot) {
  const L = current(S, t); if (!L) return;
  const style = STYLE[S.sections[L.section].name] || 'verse';
  const words = S.words.filter(w => w.line === S.lines.indexOf(L));
  g.save();
  if (style === 'verse') verse(g, t, S, L, words, S.sections[L.section]);
  else if (style === 'pre') pre(g, t, S, L, words);
  else if (style === 'chorus') chorus(g, t, S, L, words, shot);
  else bridge(g, t, S, L, words);
  g.restore();
}

window.LYRICS = { draw };
})();
