// UPDATE MY PRIORS: the 18 shots from STORYBOARD.md.
// Each scene is draw(g, t, x) where t is song time and x = { lt (seconds into the shot), p (needle), S (song), lyric helpers }.
// A scene may set x.ownLyrics = true when it draws the words itself.
(() => {
const { W, H, C, F, clamp, lerp, inv, smooth, easeOut, easeIn, easeInOut, back, elastic, hash, hash2, noise1, BAR, BEAT,
  pulse, kickPulse, mix, rgba, text, measure, rr, circle, poly, glow, vgrad, star, extrude, gauge, prior, stars, skyline,
  vignette, scanlines, rays, halftone, paperIcon, fireIcon, hand, person } = window.K;

const shake = (g, t, amt) => { if (amt > 0) g.translate(noise1(t * 30) * amt, noise1(t * 30 + 50) * amt); };
const zoomAt = (g, cx, cy, z) => { g.translate(cx, cy); g.scale(z, z); g.translate(-cx, -cy); };
const beatIdx = t => Math.floor(t / BEAT);

// ============================================================ S01 boot terminal (bars 1-4)
const BOOT = ['PRIOR v0.9  //  bayesian companion unit', '[ ok ] mounting /dev/evidence', '[ ok ] indexing 1,204 headlines',
  '[ ok ] calibrating dread .........', '[warn] coffee level: low', '[ ok ] p(doom) estimator online', '> loading priors'];
function S01(g, t, x) {
  g.fillStyle = C.black; g.fillRect(0, 0, W, H);
  glow(g, W / 2, H / 2, 1100, C.mint2, .08);
  const lines = Math.min(BOOT.length, Math.floor(t / .75) + 1);
  for (let i = 0; i < lines; i++) {
    const age = t - i * .75, s = BOOT[i];
    const n = Math.floor(clamp(age / .35) * s.length);
    const col = s.startsWith('[warn]') ? C.sun : i === 0 ? C.cream : C.mint;
    text(g, s.slice(0, n), 140, 170 + i * 62, 38, col, { align: 'left', font: F.mono });
  }
  // progress bar keyed to the arp
  if (t > 4.5) {
    const u = clamp((t - 4.5) / 3.2), y = 170 + 7 * 62;
    g.strokeStyle = C.mint; g.lineWidth = 3; g.strokeRect(140, y - 20, 700, 40);
    const seg = Math.floor(u * 28);
    for (let i = 0; i < seg; i++) { g.fillStyle = i % 4 === 0 ? C.sun : C.mint; g.fillRect(146 + i * 24.6, y - 14, 20, 28); }
    text(g, `${Math.round(u * 100)}%`, 870, y, 34, C.mint, { align: 'left', font: F.mono });
  }
  { const li = lines - 1, n = Math.floor(clamp((t - li * .75) / .35) * BOOT[li].length);
    if ((t * 2) % 1 < .55 && t < 4.5) { g.fillStyle = C.mint; g.fillRect(146 + measure(g, BOOT[li].slice(0, n), 38, F.mono), 150 + li * 62, 20, 40); } }
  // CRT turn-on of the first dial
  if (t > 5.4) {
    const u = (t - 5.4) / .5;
    g.save();
    g.translate(1420, 520);
    if (u < 1) { g.fillStyle = C.cream; g.fillRect(-300 * easeOut(u), -3, 600 * easeOut(u), 6); }
    else {
      const fl = (t > 6.3 && t < 6.42) || (t > 6.8 && t < 6.86) ? .2 : 1;
      g.scale(1, clamp((u - 1) * 3)); g.globalAlpha = fl;
      gauge(g, 0, 0, 220, .5 + Math.sin(t * 12) * .03, { face: C.night, rim: C.cream });
    }
    g.restore();
  }
  scanlines(g, .22);
}

// ============================================================ S02 title + PRIOR boots (bars 5-8)
function S02(g, t, x) {
  const lt = x.lt;
  rays(g, 700, 560, 18, t * .05, C.ink, C.ink2);
  stars(g, t, 90, 4);
  glow(g, 560, 520, 700, C.violet, .25);
  g.save(); zoomAt(g, 560, 560, 1 + lt * .012);
  const wake = smooth(inv(.4, 2.2, lt));
  prior(g, 520, 560, .95, lerp(.5, .5, 1), t, {
    eyes: lt < 1.2 ? 'closed' : lt < 1.6 ? 'wide' : 'open', glowAmt: wake, armL: .2 + .6 * pulse(t, 1, 4), armR: .25,
    squash: kickPulse(t) * .4 * inv(4, 4.2, lt), antenna: Math.sin(lt * 9) * .2 * (1 - wake) });
  g.restore();
  // stamped title words
  const words = [['UPDATE', 0, C.cream, C.coral2], ['MY', 1, C.sun, C.sun2], ['PRIORS', 2, C.sun, C.sun2]];
  const ts = 150, wMy = measure(g, 'MY', ts, F.display, 400), wPr = measure(g, 'PRIORS', ts, F.display, 400), tot = wMy + 50 + wPr, cxT = 1330;
  const pos = [[cxT, 410, ts], [cxT - tot / 2 + wMy / 2, 590, ts], [cxT + tot / 2 - wPr / 2, 590, ts]];
  words.forEach(([w, at, face, side], i) => {
    const u = lt - at; if (u < 0) return;
    const s = back(u / .45);
    g.save(); g.translate(pos[i][0], pos[i][1]); g.scale(s, s); g.rotate((1 - smooth(u / .45)) * -.2);
    extrude(g, w, 0, 0, pos[i][2], face, side, 16);
    g.restore();
    if (u < .5) for (let k = 0; k < 8; k++) {
      const a = k / 8 * 6.28 + i, r = 120 + u * 600;
      g.fillStyle = rgba(C.sun, 1 - u * 2); star(g, pos[i][0] + Math.cos(a) * r, pos[i][1] + Math.sin(a) * r * .5, 18, 4, .3, a); g.fill();
    }
  });
  if (lt > 3) text(g, 'a song about updating on evidence', 1330, 740, 40, rgba(C.cream, .7), { alpha: smooth((lt - 3) / .8) });
  // sparkles on beats
  for (let i = 0; i < 14; i++) {
    const tw = pulse(t + hash(i) * 2, 1, 5);
    g.fillStyle = rgba(C.cream, tw * .9); star(g, 900 + hash(i * 3) * 950, 160 + hash(i * 5) * 760, 10 + 16 * tw, 4, .25, t); g.fill();
  }
}

// ============================================================ S03 bedroom lab at 3 a.m. (bars 9-12)
const NOTIFS = ['NEW MODEL OUT', '+12% ON EVALS', 'PAPER DROP', 'OPEN WEIGHTS', 'BREAKING', 'v5.5 RELEASED', 'AGENTS NOW', '3:00 AM UPDATE',
  'CONTEXT x10', 'SCALING LAWS', 'NEW SOTA', 'DEMO VIDEO', 'ANNOUNCEMENT', 'LEAKED MEMO'];
function room(g, t, lt, { lamp = 1 } = {}) {
  // wall
  g.fillStyle = '#1d1a3f'; g.fillRect(0, 0, W, H);
  halftone(g, 0, 0, W, 700, 'rgba(255,244,224,.035)', (px, py) => .35, 40);
  // window with night city
  g.save(); rr(g, 120, 110, 620, 470, 10); g.clip();
  g.fillStyle = vgrad(g, 110, 580, [[0, '#0a0b22'], [1, '#2a1f55']]); g.fillRect(120, 110, 620, 470);
  stars(g, t, 50, 7, 400);
  circle(g, 620, 200, 46, C.cream); circle(g, 640, 190, 42, '#1a1846');
  g.translate(lt * -4, 0);
  skyline(g, t, { seed: 3, y0: 600, hMin: 80, hMax: 260, color: '#14123a', win: C.sun, winRate: .3, wMin: 40, wMax: 90 });
  skyline(g, t, { seed: 9, y0: 640, hMin: 40, hMax: 150, color: '#0c0b26', win: C.coral, winRate: .2, wMin: 50, wMax: 120 });
  g.restore();
  g.strokeStyle = '#3d356f'; g.lineWidth = 22; rr(g, 120, 110, 620, 470, 10); g.stroke();
  g.lineWidth = 10; g.beginPath(); g.moveTo(430, 110); g.lineTo(430, 580); g.moveTo(120, 345); g.lineTo(740, 345); g.stroke();
  // curtains
  for (const [cx, sd] of [[95, 1], [765, -1]]) {
    g.fillStyle = C.violet2; g.beginPath(); g.moveTo(cx - 40 * sd, 80);
    for (let y = 80; y <= 640; y += 40) g.lineTo(cx + sd * (20 + 14 * Math.sin(y * .05 + t)), y);
    g.lineTo(cx - 60 * sd, 640); g.closePath(); g.fill();
  }
  // shelf + books + plant
  g.fillStyle = '#4a2f3f'; g.fillRect(1120, 300, 520, 22);
  const books = [C.coral, C.sun, C.mint, C.violet, C.sky, C.cream, C.coral2, C.mint2];
  for (let i = 0; i < 12; i++) { const h = 90 + hash(i) * 60, w = 26 + hash(i + 4) * 16; g.fillStyle = books[i % 8]; g.fillRect(1140 + i * 36, 300 - h, w, h); }
  g.fillStyle = C.coral2; rr(g, 1580, 240, 50, 60, 6); g.fill();
  for (let i = 0; i < 6; i++) { const a = -2.6 + i * .42 + Math.sin(t * 1.5 + i) * .05; g.strokeStyle = C.mint2; g.lineWidth = 12; g.beginPath(); g.moveTo(1605, 245); g.quadraticCurveTo(1605 + Math.cos(a) * 40, 200 + Math.sin(a) * 30, 1605 + Math.cos(a) * 80, 245 + Math.sin(a) * 90); g.stroke(); }
  // poster
  g.save(); g.translate(930, 260); g.rotate(-.04); g.fillStyle = C.paper; g.fillRect(-110, -140, 220, 280);
  text(g, 'P(A|B)', 0, -70, 44, C.ink, { font: F.display, weight: 400 }); text(g, '= P(B|A)P(A)', 0, -10, 26, C.coral2, { font: F.mono });
  text(g, '/ P(B)', 0, 30, 26, C.coral2, { font: F.mono }); text(g, 'STAY CALIBRATED', 0, 100, 18, C.ink, { font: F.ui });
  g.restore();
  // clock at 3:00, second hand ticks on the beat
  g.save(); g.translate(1760, 160); circle(g, 0, 0, 80, C.cream); circle(g, 0, 0, 70, '#fff9ee');
  g.strokeStyle = C.ink; g.lineCap = 'round';
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; g.lineWidth = 4; g.beginPath(); g.moveTo(Math.cos(a) * 56, Math.sin(a) * 56); g.lineTo(Math.cos(a) * 64, Math.sin(a) * 64); g.stroke(); }
  g.lineWidth = 8; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -48); g.stroke();
  g.beginPath(); g.moveTo(0, 0); g.lineTo(36, 0); g.stroke();
  const sa = (beatIdx(t) / 60) * 6.28 - 1.57; g.strokeStyle = C.coral; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(sa) * 60, Math.sin(sa) * 60); g.stroke();
  circle(g, 0, 0, 7, C.coral); g.restore();
}
function desk(g, t, laptopX = 1180) {
  g.fillStyle = '#3a2440'; g.fillRect(0, 760, W, 320);
  g.fillStyle = '#4e3052'; g.fillRect(0, 740, W, 34);
  // laptop
  g.save(); g.translate(laptopX, 740);
  g.fillStyle = '#c9c3d6'; poly(g, [[-260, 0], [260, 0], [230, -20], [-230, -20]]); g.fill();
  g.fillStyle = '#2b2a3d'; rr(g, -230, -330, 460, 310, 14); g.fill();
  const scr = vgrad(g, -320, -30, [[0, '#9fe8ff'], [1, C.sky]]); g.fillStyle = scr; rr(g, -214, -314, 428, 278, 8); g.fill();
  // feed on the screen, scrolling
  g.save(); rr(g, -214, -314, 428, 278, 8); g.clip();
  for (let i = 0; i < 9; i++) { const y = -300 + ((i * 60 - t * 90) % 540 + 540) % 540; g.fillStyle = 'rgba(18,20,43,.25)'; rr(g, -190, y, 380, 44, 8); g.fill();
    g.fillStyle = i % 3 ? C.coral : C.violet; circle(g, -165, y + 22, 12); g.fill(); g.fillStyle = 'rgba(18,20,43,.5)'; g.fillRect(-140, y + 14, 160 + hash(i) * 120, 8); }
  g.restore();
  g.restore();
  // mug with steam
  g.save(); g.translate(860, 700); g.fillStyle = C.coral; rr(g, -40, -60, 80, 90, 12); g.fill();
  g.strokeStyle = C.coral; g.lineWidth = 12; g.beginPath(); g.arc(44, -15, 22, -1.4, 1.4); g.stroke();
  for (let i = 0; i < 3; i++) { const k = (t * .6 + i / 3) % 1; g.strokeStyle = `rgba(255,244,224,${.45 * (1 - k)})`; g.lineWidth = 6;
    g.beginPath(); g.moveTo(-15 + i * 15, -70 - k * 90); g.bezierCurveTo(-35 + i * 15, -90 - k * 90, 5 + i * 15, -110 - k * 90, -15 + i * 15, -140 - k * 90); g.stroke(); }
  g.restore();
}
function S03(g, t, x) {
  const lt = x.lt;
  g.save(); zoomAt(g, 900, 600, 1.02 + lt * .006);
  room(g, t, lt);
  // laptop light cone on PRIOR
  prior(g, 640, 600, .78, x.p, t, { eyes: 'wide', armL: .5, armR: 1.4 + Math.sin(t * 9) * .15, look: 1, squash: kickPulse(t) * .15 });
  desk(g, t);
  glow(g, 1180, 560, 700, C.sky, .22);
  // notifications: every kick launches one; they arc out of the screen and pile up
  const kicks = []; for (let b = 0; b < 4; b++) for (const st of [0, 8, 10]) kicks.push(b * BAR + st * BAR / 16);
  kicks.forEach((k, i) => {
    const age = lt - k; if (age < 0) return;
    const col = Math.floor(i / 3), row = i % 3;
    const tx = 1530 + (i % 3) * 140 + (Math.floor(i / 3) % 2) * 50 + hash(i) * 20, ty = 712 - Math.floor(i / 3) * 56;
    const u = easeOut(age / .6), sx = 1180, sy = 500;
    const px = lerp(sx, tx, u), py = lerp(sy, ty, u) - Math.sin(u * Math.PI) * 260;
    const rot = (1 - u) * 3 + (hash(i * 7) - .5) * .5;
    g.save(); g.translate(px, py); g.rotate(rot); const sc = .6 + .4 * back(age / .3); g.scale(sc, sc);
    const s = NOTIFS[i % NOTIFS.length], w = measure(g, s, 26, F.ui) + 70;
    g.fillStyle = 'rgba(0,0,0,.25)'; rr(g, -w / 2 + 6, -26 + 8, w, 52, 26); g.fill();
    g.fillStyle = C.cream; rr(g, -w / 2, -26, w, 52, 26); g.fill();
    circle(g, -w / 2 + 28, 0, 13, [C.coral, C.violet, C.mint][i % 3]);
    text(g, s, 14, 2, 26, C.ink, { font: F.ui });
    g.restore();
  });
  g.restore();
}

// ============================================================ S04 benchmark charts + FINE/NOT TONIGHT (bars 13-16)
const BENCH = [['MATH', C.coral], ['CODE', C.mint], ['LAW', C.sun], ['BIO', C.violet], ['CHESS', C.sky], ['VIBES', C.coral2]];
function S04(g, t, x) {
  const lt = x.lt;
  const camY = easeInOut(inv(3.5, 7.5, lt)) * 520;
  g.fillStyle = C.paper; g.fillRect(0, 0, W, H);
  g.save(); g.translate(0, camY);
  g.strokeStyle = 'rgba(18,20,43,.08)'; g.lineWidth = 2;
  for (let xg = 0; xg < W; xg += 48) { g.beginPath(); g.moveTo(xg, -800); g.lineTo(xg, H); g.stroke(); }
  for (let yg = -800; yg < H; yg += 48) { g.beginPath(); g.moveTo(0, yg); g.lineTo(W, yg); g.stroke(); }
  g.strokeStyle = C.ink; g.lineWidth = 6; g.beginPath(); g.moveTo(640, 940); g.lineTo(1840, 940); g.stroke();
  const human = 520;
  BENCH.forEach(([name, col], i) => {
    const bx = 700 + i * 190, steps = Math.floor(lt / (BAR / 8)) - i;
    const h = Math.max(0, steps) * 46 + 80 * smooth(lt * 2);
    const pop = pulse(t, BAR / 8, 8);
    g.fillStyle = 'rgba(18,20,43,.15)'; g.fillRect(bx + 12, 940 - h + 12, 130, h);
    g.fillStyle = col; g.fillRect(bx, 940 - h, 130, h);
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(bx, 940 - h, 24, h);
    text(g, name, bx + 65, 985, 34, C.ink, { font: F.display, weight: 400 });
    text(g, `${Math.round(h / 4.4)}`, bx + 65, 940 - h - 30 - pop * 6, 32, C.ink, { font: F.mono });
  });
  g.setLineDash([24, 16]); g.strokeStyle = C.ink; g.lineWidth = 5; g.beginPath(); g.moveTo(640, 940 - human); g.lineTo(1860, 940 - human); g.stroke(); g.setLineDash([]);
  text(g, 'HUMAN EXPERT', 1850, 940 - human - 30, 28, C.ink, { align: 'right', font: F.mono });
  g.restore();
  g.fillStyle = rgba(C.paper, .85); rr(g, 40, 50, 640, 180, 20); g.fill();
  text(g, 'BENCHMARKS', 60, 120, 84, C.ink, { align: 'left', font: F.display, weight: 400 });
  text(g, 'scores, by week (no ceiling)', 64, 190, 32, C.coral2, { align: 'left', font: F.ui });
  // PRIOR flips the sign on the claps (beats 2 and 4)
  const b = beatIdx(lt), ph = (lt % BEAT) / BEAT;
  const sign = b % 2 ? 'NOT TONIGHT' : 'FINE';
  const flip = Math.abs(Math.cos(Math.min(1, ph * 4) * Math.PI / 2 + Math.PI / 2)) ;
  g.save(); g.translate(330, 700 + (1 - flip) * 8);
  prior(g, 0, 0, .78, x.p, t, { hold: 'sign', sign, armR: 2.6, armL: .4 + .5 * kickPulse(t), eyes: b % 2 ? 'wide' : 'happy', lean: (b % 2 ? .06 : -.06), squash: kickPulse(t) * .3 });
  g.restore();
}

// ============================================================ S05 / S10 push into the gauge (pre-chorus)
function preChorus(g, t, x, second) {
  const lt = x.lt, z = 1 + easeIn(lt / 8) * .9;
  const roll = inv(6, 8, lt);
  g.fillStyle = second ? '#2a1450' : '#3a1022'; g.fillRect(0, 0, W, H);
  halftone(g, 0, 0, W, H, rgba(second ? C.violet : C.coral, .5), (px, py) => {
    const d = Math.hypot(px - W / 2, py - H / 2) / 1100; return clamp(d * 1.4 - .15 + Math.sin(d * 18 - t * 6) * .12);
  }, 30);
  // echoing outline words
  const word = second ? "YOU DON'T KNOW" : "I DON'T KNOW";
  for (let r = 0; r < 7; r++) {
    const y = 80 + r * 160, off = ((t * 120 * (r % 2 ? 1 : -1)) % 1400);
    for (let k = -1; k < 3; k++) text(g, word, off + k * 1400, y, 130, null, { font: F.display, weight: 400, stroke: rgba(C.cream, .14), strokeW: 3, align: 'left' });
  }
  g.save(); shake(g, t, roll * 26); zoomAt(g, W / 2, H / 2, z);
  // shock rings on the beat
  for (let i = 0; i < 4; i++) { const k = ((t / BEAT) + i / 4) % 1; g.strokeStyle = rgba(C.cream, .35 * (1 - k)); g.lineWidth = 6; g.beginPath(); g.arc(second ? 620 : W / 2, H / 2, 300 + k * 700, 0, 6.28); g.stroke(); }
  // speed lines
  for (let i = 0; i < 70; i++) { const a = hash(i) * 6.28, r0 = 520 + ((hash(i * 3) + t * (1 + roll * 4)) % 1) * 900; g.strokeStyle = rgba(C.cream, .2 + roll * .4);
    g.lineWidth = 3; g.beginPath(); g.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0); g.lineTo(W / 2 + Math.cos(a) * (r0 + 120 + roll * 200), H / 2 + Math.sin(a) * (r0 + 120 + roll * 200)); g.stroke(); }
  const tremble = Math.sin(t * 50) * .02 * (1 + roll * 3);
  if (!second) {
    gauge(g, W / 2, H / 2 - 40, 330, x.p + tremble, { face: C.night, rim: C.cream });
  } else {
    gauge(g, 620, H / 2 + 20, 300, x.p + tremble, { face: C.night, rim: C.cream });
    const slide = easeOut(inv(.2, 1.4, lt));
    g.save(); g.translate(lerp(W + 400, 1330, slide), H / 2 + 40); g.rotate(.06);
    g.fillStyle = '#0d0d16'; rr(g, -250, -430, 500, 860, 60); g.fill(); g.strokeStyle = '#3c3c55'; g.lineWidth = 10; rr(g, -250, -430, 500, 860, 60); g.stroke();
    gauge(g, 0, -40, 180, .5 + Math.sin(t * 2.3) * .3 + tremble, { face: C.ink2, rim: null, label: 'yours' });
    text(g, 'YOURS', 0, 300, 50, C.cream, { font: F.display, weight: 400 });
    g.restore();
  }
  g.restore();
  if (lt > 7.85) { g.fillStyle = rgba(C.cream, (lt - 7.85) / .15); g.fillRect(0, 0, W, H); }
}
const S05 = (g, t, x) => preChorus(g, t, x, false);
const S10 = (g, t, x) => preChorus(g, t, x, true);

// ============================================================ S06 chorus kinetic type (bars 21-24) and shared chorus bits
const HEADLINES = ['NEW MODEL DROPS AT 3 A.M.', 'BENCHMARK SATURATED (AGAIN)', 'LAB PUBLISHES SAFETY CASE', 'EVAL FINDS A SURPRISE',
  'COMPUTE DOUBLES', 'RESEARCHERS: "WE ARE HIRING"', 'TREATY TALKS RESUME', 'INTERPRETABILITY BREAKTHROUGH'];
function headlineCard(g, t, k, cx, cy, size = 40) {
  const u = (t / BAR) % 1, h = HEADLINES[k % HEADLINES.length];
  const fly = easeIn(clamp(u / .22));
  const x = lerp(W + 600, cx, fly), y = lerp(cy - 300, cy, fly);
  const after = u > .22 ? (u - .22) : 0;
  g.save(); g.translate(x + after * 300, y + after * after * 1400); g.rotate(-.08 + after * 1.5 * (k % 2 ? 1 : -1));
  g.globalAlpha = 1 - clamp((u - .6) / .3);
  const w = measure(g, h, size, F.display, 400) + 70;
  g.fillStyle = 'rgba(0,0,0,.3)'; rr(g, -w / 2 + 10, -size + 12, w, size * 2, 12); g.fill();
  g.fillStyle = C.cream; rr(g, -w / 2, -size, w, size * 2, 12); g.fill();
  g.fillStyle = C.coral; g.fillRect(-w / 2, -size, 18, size * 2);
  text(g, h, 8, 2, size, C.ink, { font: F.display, weight: 400 });
  g.restore();
  return u > .2 && u < .3;   // impact window
}
function kineticWords(g, t, x, ox, oy, size = 118) {
  const L = x.line(t); if (!L) return;
  const words = x.words(L);
  let row = 0, cx = 0; const rows = [[]];
  const maxW = W - ox - 80;
  const widest = Math.max(...words.map(w => measure(g, w.text.toUpperCase(), size, F.display, 400)));
  if (widest > maxW) size *= maxW / widest;
  words.forEach(w => { const ww = measure(g, w.text.toUpperCase(), size, F.display, 400); if (cx + ww > maxW && rows[row].length) { rows.push([]); row++; cx = 0; } rows[row].push([w, cx, ww]); cx += ww + size * .3; });
  const fade = 1 - clamp((t - L.t1 - .1) / .25);
  rows.forEach((r, ri) => r.forEach(([w, wx, ww], i) => {
    const n0 = x.S.notes[w.notes[0]], age = t - n0.t + .05;
    if (age < 0) return;
    const s = back(age / .28), rot = (1 - smooth(age / .28)) * (i % 2 ? .3 : -.3);
    const cols = [C.cream, C.sun, C.mint, C.cream, C.coral];
    g.save(); g.translate(ox + wx + ww / 2, oy + ri * size * 1.1); g.rotate(rot); g.scale(s, s); g.globalAlpha = fade;
    text(g, w.text.toUpperCase(), 7, 9, size, 'rgba(0,0,0,.35)', { font: F.display, weight: 400 });
    text(g, w.text.toUpperCase(), 0, 0, size, cols[(ri * 3 + i) % cols.length], { font: F.display, weight: 400 });
    g.restore();
  }));
}
function S06(g, t, x) {
  x.ownLyrics = true;
  const lt = x.lt, k = Math.floor(lt / BAR);
  rays(g, 520, 560, 24, t * .25, '#5a1530', '#771a3a');
  glow(g, 520, 560, 800, C.coral, .35);
  const hit = headlineCard(g, t, k * 3 + 1, 520, 300, 34);
  g.save(); shake(g, t, hit ? 18 : 0);
  gauge(g, 520, 600, 280, x.p, { face: C.night, rim: C.cream });
  if (hit) { glow(g, 520, 600, 600, C.cream, .5); }
  g.restore();
  // giant percentage readout
  text(g, `${Math.round(x.p * 100)}%`, 520, 1000, 120, null, { font: F.display, weight: 400, stroke: C.cream, strokeW: 5 });
  kineticWords(g, t, x, 980, 380);
}

// ============================================================ S07 / S12 / S16 helpers: bell curves and confetti
function confetti(g, t, n = 90, seed = 1, colors = [C.coral, C.sun, C.mint, C.violet, C.cream]) {
  for (let i = 0; i < n; i++) {
    const sp = 120 + hash(i + seed) * 160, x0 = hash(i * 3 + seed) * W;
    const y = ((hash(i * 5 + seed) * (H + 200) + t * sp) % (H + 200)) - 100;
    const xx = x0 + Math.sin(t * 2 + i) * 40;
    g.save(); g.translate(xx, y); g.rotate(t * 3 + i); g.scale(1, Math.cos(t * 5 + i));
    g.fillStyle = colors[i % colors.length]; g.fillRect(-9, -5, 18, 10); g.restore();
  }
}
function S07(g, t, x) {
  const lt = x.lt;
  g.fillStyle = '#2c1233'; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(79,227,181,.12)'; g.lineWidth = 2;
  for (let xg = 0; xg < W; xg += 60) { g.beginPath(); g.moveTo(xg, 0); g.lineTo(xg, H); g.stroke(); }
  for (let yg = 0; yg < H; yg += 60) { g.beginPath(); g.moveTo(0, yg); g.lineTo(W, yg); g.stroke(); }
  confetti(g, t, 60, 2);
  // Bayes, live: prior x likelihood -> posterior. Evidence moves every bar.
  const ox = 120, oy = 820, w = 1080, h = 520;
  const k = Math.floor(lt / BAR), u = (lt % BAR) / BAR;
  const ev = [.15, .4, .7, .3][k % 4], mu0 = x.p, s0 = .2, s1 = .1;
  const mu1 = mu0 + (ev - mu0) * (s0 * s0 / (s0 * s0 + s1 * s1)) * smooth(u * 3);
  const sP = Math.sqrt(1 / (1 / (s0 * s0) + 1 / (s1 * s1)));
  const curve = (mu, sd, amp) => { const pts = []; for (let i = 0; i <= 160; i++) { const v = i / 160; pts.push([ox + v * w, oy - amp * Math.exp(-((v - mu) ** 2) / (2 * sd * sd)) * h]); } return pts; };
  g.strokeStyle = C.cream; g.lineWidth = 5; g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + w, oy); g.stroke();
  const draw = (pts, stroke, fill, dash) => {
    g.beginPath(); g.moveTo(ox, oy); pts.forEach(([a, b]) => g.lineTo(a, b)); g.lineTo(ox + w, oy);
    if (fill) { g.fillStyle = fill; g.fill(); }
    g.setLineDash(dash || []); g.strokeStyle = stroke; g.lineWidth = 6; g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.stroke(); g.setLineDash([]);
  };
  draw(curve(mu0, s0, .5), C.cream, null, [18, 14]);
  draw(curve(ev, s1, .65 * smooth(u * 4)), C.violet, rgba(C.violet, .18));
  const gr = g.createLinearGradient(ox, 0, ox + w, 0); gr.addColorStop(0, rgba(C.mint, .85)); gr.addColorStop(.5, rgba(C.sun, .85)); gr.addColorStop(1, rgba(C.coral, .85));
  draw(curve(mu1, lerp(s0, sP, smooth(u * 3)), lerp(.5, .95, smooth(u * 3)) * (1 + kickPulse(t) * .05)), C.cream, gr);
  const lab = (s, xx, yy, c) => { g.fillStyle = c; rr(g, xx - 110, yy - 28, 220, 56, 28); g.fill(); text(g, s, xx, yy + 2, 26, C.ink, { font: F.mono }); };
  lab('PRIOR', ox + mu0 * w - 160, oy - h * .55, C.cream);
  lab('EVIDENCE', ox + ev * w + 140, oy - h * .72, C.violet);
  lab('POSTERIOR', ox + mu1 * w, oy - h * 1.02, C.sun);
  for (let i = 0; i <= 10; i++) text(g, `${i * 10}`, ox + i * w / 10, oy + 34, 22, rgba(C.cream, .6), { font: F.mono });
  // PRIOR dances with a mug
  const b = beatIdx(t), side = b % 2 ? 1 : -1;
  prior(g, 1560, 560, .82, x.p, t, { hold: 'mug', armR: 2.2 + Math.sin(t * Math.PI * 2) * .3, armL: 1.2 + side * .8, lean: side * .1 * (1 - kickPulse(t)),
    squash: kickPulse(t) * .45, eyes: 'happy' });
}

// ============================================================ S08 exam hall + tuck-in (bars 29-32)
function oracle(g, x, y, s, t, armUp = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(0, 330, 120, 22, 0, 0, 6.28); g.fill();
  const body = g.createLinearGradient(-90, 0, 90, 0); body.addColorStop(0, '#5b47e0'); body.addColorStop(.5, '#8f7bff'); body.addColorStop(1, '#3a2aa8');
  g.fillStyle = body; rr(g, -90, -40, 180, 360, 80); g.fill();
  g.fillStyle = '#2a1d7a'; rr(g, -80, -230, 160, 190, 70); g.fill();
  g.fillStyle = C.ink; rr(g, -64, -170, 128, 50, 25); g.fill();
  const sc = (t * 1.5) % 1; g.fillStyle = C.mint; rr(g, -60 + sc * 90, -160, 30, 30, 15); g.fill(); glow(g, -45 + sc * 90, -145, 60, C.mint, .5);
  g.strokeStyle = '#8f7bff'; g.lineWidth = 26; g.lineCap = 'round';
  g.beginPath(); g.moveTo(80, 20); g.lineTo(150, 110 - armUp * 160); g.stroke();
  g.beginPath(); g.moveTo(-80, 20); g.lineTo(-130, 150); g.stroke();
  text(g, 'ORACLE-9', 0, 100, 26, C.cream, { font: F.mono });
  g.restore();
}
function S08(g, t, x) {
  const lt = x.lt;
  const tuck = inv(4, 4.6, lt);
  if (tuck < 1 || lt < 4) {
    const dolly = lt * 30;
    g.fillStyle = '#20264a'; g.fillRect(0, 0, W, H);
    // chalkboard
    g.fillStyle = '#1d3b33'; rr(g, 360 - dolly * .3, 70, 1200, 330, 12); g.fill();
    g.strokeStyle = '#6b4a2b'; g.lineWidth = 18; rr(g, 360 - dolly * .3, 70, 1200, 330, 12); g.stroke();
    const items = [['BAR EXAM', 0], ['TURING TEST', 1.0], ['EVERY BENCHMARK', 2.0]];
    items.forEach(([s, at], i) => {
      text(g, s, 460 - dolly * .3, 140 + i * 90, 54, rgba(C.cream, .9), { align: 'left', font: F.display, weight: 400 });
      if (lt > at + .4) { const u = clamp((lt - at - .4) / .2); g.strokeStyle = C.mint; g.lineWidth = 12; g.lineCap = 'round'; const cx = 1320 - dolly * .3, cy = 140 + i * 90;
        g.beginPath(); g.moveTo(cx - 30, cy); g.lineTo(cx - 30 + 25 * Math.min(1, u * 2), cy + 25 * Math.min(1, u * 2)); if (u > .5) g.lineTo(cx - 5 + 60 * (u - .5) * 2, cy + 25 - 70 * (u - .5) * 2); g.stroke(); }
    });
    // floor in perspective
    const vx = W / 2 - dolly * .5, vy = 430;
    g.fillStyle = '#2d2350'; g.fillRect(0, vy + 30, W, H);
    g.strokeStyle = 'rgba(255,244,224,.08)'; g.lineWidth = 3;
    for (let i = -14; i <= 14; i++) { g.beginPath(); g.moveTo(vx + i * 30, vy + 30); g.lineTo(vx + i * 260, H); g.stroke(); }
    for (let j = 0; j < 9; j++) { const y = vy + 30 + (H - vy) * (j / 9) ** 1.6; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    // rows of desks with nervous students (small dials)
    for (let r = 3; r >= 0; r--) for (let c = -3; c <= 3; c++) {
      const depth = 1 - r * .2, y = 560 + (3 - r) * 120 - r * 10, xx = vx + c * 300 * depth;
      if (c === 0 && r === 0) continue;
      g.fillStyle = '#5b3a2e'; rr(g, xx - 90 * depth, y, 180 * depth, 24 * depth, 6); g.fill();
      gauge(g, xx, y - 60 * depth, 42 * depth, .5 + .4 * Math.sin(t * 3 + c * 2 + r), { face: C.night, rim: C.cream, readout: false });
    }
    // ORACLE aces it
    oracle(g, vx + 40, 690, .9, t, pulse(t, BEAT, 5));
    g.fillStyle = '#6a4434'; rr(g, vx - 200, 820, 480, 40, 8); g.fill();
    for (let i = 0; i < 10; i++) {
      const at = i * .4, age = lt - at; if (age < 0 || age > 2) continue;
      const px = vx + 120 + age * (300 + hash(i) * 500) * (i % 2 ? 1 : -1), py = 790 - age * 600 + age * age * 380;
      g.save(); g.translate(px, py); g.rotate(age * 4 * (i % 2 ? 1 : -1));
      g.fillStyle = C.cream; g.fillRect(-45, -60, 90, 120); text(g, 'A+', 0, 0, 52, C.coral, { font: F.display, weight: 400 }); g.restore();
    }
    if (lt < 4) return;
  }
  // tuck-in: "then it asked me, kindly, if I'd like to rest"
  g.save(); g.globalAlpha = tuck;
  g.fillStyle = '#151634'; g.fillRect(0, 0, W, H);
  glow(g, 1100, 300, 900, C.violet, .25);
  stars(g, t, 60, 11, 500);
  // bed
  g.fillStyle = '#5b3a2e'; rr(g, 520, 560, 980, 60, 12); g.fill(); rr(g, 480, 380, 60, 420, 12); g.fill(); rr(g, 1480, 480, 60, 320, 12); g.fill();
  prior(g, 780, 540, .62, x.p, t, { eyes: lt > 6.2 ? 'sleepy' : 'wide', armL: .2, armR: .2, legs: false });
  const pull = easeInOut(inv(5, 6.5, lt));
  g.fillStyle = C.coral; g.beginPath(); g.moveTo(560, lerp(700, 520, pull)); g.quadraticCurveTo(1000, lerp(680, 480, pull), 1470, lerp(690, 540, pull)); g.lineTo(1470, 780); g.lineTo(560, 780); g.closePath(); g.fill();
  g.fillStyle = C.coral2; for (let i = 0; i < 6; i++) g.fillRect(620 + i * 150, lerp(720, 560, pull), 70, 220);
  oracle(g, 1360, 520, .85, t, .7);
  // speech bubble
  const sb = back(inv(4.4, 4.9, lt));
  g.save(); g.translate(1450, 160); g.scale(sb, sb);
  g.fillStyle = C.cream; rr(g, -320, -70, 640, 140, 70); g.fill(); poly(g, [[-40, 60], [0, 60], [-60, 130]]); g.fill();
  text(g, 'would you like to rest?', 0, 4, 40, C.ink, { font: F.ui }); g.restore();
  if (lt > 6.2) for (let i = 0; i < 3; i++) { const k = ((lt - 6.2) * .8 + i / 3) % 1; text(g, 'z', 860 + k * 120 + i * 20, 300 - k * 160, 40 + i * 14, rgba(C.cream, 1 - k), { font: F.display, weight: 400 }); }
  g.restore();
}

// ============================================================ S09 lab on the hill at night (bars 33-36)
function S09(g, t, x) {
  const lt = x.lt, z = 1 + easeInOut(inv(1, 8, lt)) * 2.6;
  const wx = 1290, wy = 470;
  g.save(); zoomAt(g, wx, wy, z);
  g.fillStyle = vgrad(g, 0, H, [[0, '#070820'], [.6, '#1a1640'], [1, '#3a2050']]); g.fillRect(0, 0, W, H);
  stars(g, t, 200, 5, 700);
  // aurora
  for (let a = 0; a < 3; a++) {
    g.beginPath(); for (let i = 0; i <= 40; i++) { const xx = i * W / 40, yy = 180 + a * 50 + Math.sin(i * .35 + t * .6 + a) * 40; i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
    g.strokeStyle = rgba(a === 1 ? C.violet : C.mint, .18); g.lineWidth = 60; g.stroke();
  }
  circle(g, 300, 180, 70, C.cream); glow(g, 300, 180, 260, C.cream, .2);
  const ss = (lt - 2.5); if (ss > 0 && ss < .8) { g.strokeStyle = rgba(C.cream, 1 - ss / .8); g.lineWidth = 4; g.beginPath(); g.moveTo(1500 - ss * 900, 80 + ss * 300); g.lineTo(1500 - ss * 900 + 140, 80 + ss * 300 - 46); g.stroke(); }
  // hills
  const hill = (y0, amp, col, f, ph) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, H); for (let i = 0; i <= 60; i++) g.lineTo(i * W / 60, y0 - Math.sin(i * f + ph) * amp - Math.sin(i * f * 2.3 + ph) * amp * .3); g.lineTo(W, H); g.closePath(); g.fill(); };
  hill(720, 60, '#211a48', .18, 1);
  // the lab
  g.fillStyle = '#2b2160'; g.fillRect(1100, 380, 380, 300); g.fillRect(1180, 300, 140, 80);
  g.fillStyle = '#3a2c7a'; poly(g, [[1090, 380], [1490, 380], [1450, 350], [1130, 350]]); g.fill();
  g.strokeStyle = '#3a2c7a'; g.lineWidth = 8; g.beginPath(); g.moveTo(1250, 300); g.lineTo(1250, 200); g.stroke();
  circle(g, 1250, 196, 10, Math.sin(t * 5) > 0 ? C.coral : '#552'); glow(g, 1250, 196, 60, C.coral, Math.sin(t * 5) > 0 ? .5 : 0);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) {
    const on = !(r === 1 && c === 3) && hash2(r, c) > .2;
    g.fillStyle = on ? rgba(C.sun, .8 + .2 * Math.sin(t * 2 + r + c)) : '#1a1440'; g.fillRect(1125 + c * 58, 410 + r * 62, 36, 40);
  }
  // the window we zoom into (r1 c3): tiny people at whiteboards
  g.save(); g.beginPath(); g.rect(1299, 472, 36, 40); g.clip();
  g.fillStyle = '#ffe9b8'; g.fillRect(1299, 472, 36, 40);
  g.fillStyle = '#fff'; g.fillRect(1302, 476, 30, 18);
  g.strokeStyle = C.ink; g.lineWidth = .7;
  for (let i = 0; i < 6; i++) { const len = clamp((lt * 1.2 - i * .5)) * 24; g.beginPath(); g.moveTo(1305, 479 + i * 2.6); for (let k = 0; k < len; k++) g.lineTo(1305 + k, 479 + i * 2.6 + Math.sin(k * 1.7 + i) * .8); g.stroke(); }
  for (let i = 0; i < 3; i++) { const px = 1306 + i * 10 + Math.sin(t * 2 + i) * 2; g.fillStyle = [C.coral, C.violet, C.mint2][i]; rr(g, px - 2.5, 499, 5, 10, 2); g.fill(); circle(g, px, 497, 2, '#f1c7a0'); }
  text(g, 'EVALS', 1317, 507, 3, C.ink, { font: F.mono });
  g.restore();
  hill(860, 40, '#140f30', .25, 3);
  for (let i = 0; i < 18; i++) { const tx = hash(i) * W, ty = 840 + hash(i * 2) * 60; g.fillStyle = '#0d0a24'; poly(g, [[tx, ty - 90], [tx - 30, ty], [tx + 30, ty]]); g.fill(); }
  g.restore();
}

// ============================================================ S11 the audience: many gauges (bars 41-44)
function S11(g, t, x) {
  const lt = x.lt, k = Math.min(3, Math.floor(lt / BAR)), n = [1, 2, 4, 8][k], into = (lt % BAR) / BAR;
  g.fillStyle = C.ink; g.fillRect(0, 0, W, H);
  const cols = n * 2, rows = n, cw = W / cols, ch = H / rows;
  const grow = back(into / .25);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c, cx = (c + .5) * cw, cy = (r + .5) * ch;
    const d = Math.hypot(c - cols / 2 + .5, r - rows / 2 + .5);
    const wave = Math.exp(-((((t / BEAT) % 1) * 6 - d * .5) ** 2));
    g.fillStyle = [C.ink2, '#24183f', '#1b2a44', '#2d1530'][(r + c) % 4]; g.fillRect(c * cw + 2, r * ch + 2, cw - 4, ch - 4);
    const rad = Math.min(cw, ch) * .32 * (n === 1 ? 1 : grow) * (1 + wave * .08);
    const p = n === 1 ? x.p : clamp(x.p + (hash(i) - .5) * .7 + Math.sin(t * (2 + hash(i * 3) * 4) + i) * .08);
    gauge(g, cx, cy, rad, p, { face: C.night, rim: wave > .5 ? C.sun : C.cream, readout: n <= 2 });
  }
  headlineCard(g, t, 5 + k, W / 2, 140, 36);
}

// ============================================================ S12 rain of papers and fires (bars 45-48)
function S12(g, t, x) {
  const lt = x.lt;
  g.fillStyle = vgrad(g, 0, H, [[0, '#2a0f2f'], [1, '#5a1a2e']]); g.fillRect(0, 0, W, H);
  rays(g, W / 2, 1300, 30, t * .1, 'rgba(0,0,0,0)', 'rgba(255,93,93,.07)');
  // three parallax layers
  for (let layer = 0; layer < 3; layer++) {
    const s = .45 + layer * .3, sp = 220 + layer * 160;
    for (let i = 0; i < 16; i++) {
      const id = layer * 100 + i, x0 = hash(id) * W, ph = hash(id * 3) * (H + 300);
      const y = (ph + lt * sp) % (H + 300) - 150, xx = x0 + Math.sin(lt * 1.3 + id) * 50;
      if (i % 3 === 0) fireIcon(g, xx, y, s * .8, t); else paperIcon(g, xx, y, s, lt * (1 + hash(id)) * (i % 2 ? 1 : -1));
    }
    if (layer === 1) {
      const catchP = pulse(t, BEAT, 6);
      prior(g, W / 2, 640, .85, x.p, t, { armL: 2.6 - catchP * .5, armR: 2.6 - catchP * .5, eyes: 'wide', squash: kickPulse(t) * .4, look: Math.sin(t * 2) });
      glow(g, W / 2, 640, 500, C.coral, .15 + catchP * .2);
    }
  }
}

// ============================================================ S13 bridge: evidence -> belief pipeline (bars 49-52)
function S13(g, t, x) {
  const lt = x.lt;
  g.fillStyle = '#0a0a0a'; g.fillRect(0, 0, W, H);
  for (let r = 0; r < 6; r++) { const off = (t * 60 * (r % 2 ? 1 : -1)) % 1600;
    for (let k = -1; k < 3; k++) text(g, r % 2 ? 'BELIEF OUT' : 'EVIDENCE IN', off + k * 1600, 90 + r * 190, 150, null, { align: 'left', font: F.display, weight: 400, stroke: 'rgba(255,255,255,.07)', strokeW: 3 }); }
  const nodes = [['EVIDENCE', 330, 540], ['LIKELIHOOD', 960, 330], ['BELIEF', 1590, 540]];
  const reveal = i => back(inv(i * 1.0, i * 1.0 + .4, lt));
  // flowing edges
  g.lineWidth = 8;
  [[0, 1], [1, 2], [0, 2]].forEach(([a, b], e) => {
    const [, x0, y0] = nodes[a], [, x1, y1] = nodes[b];
    const u = clamp(reveal(Math.max(a, b)));
    const cx = (x0 + x1) / 2, cy = e === 2 ? 820 : (y0 + y1) / 2 - 60;
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.setLineDash([2, 22]); g.lineDashOffset = -t * 120; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, lerp(x0, x1, u), lerp(y0, y1, u)); g.stroke(); g.setLineDash([]);
    for (let d = 0; d < 5; d++) { const s = ((t * .5 + d / 5) % 1) * u; const px = (1 - s) ** 2 * x0 + 2 * (1 - s) * s * cx + s * s * x1, py = (1 - s) ** 2 * y0 + 2 * (1 - s) * s * cy + s * s * y1; circle(g, px, py, 10, '#fff'); }
  });
  nodes.forEach(([s, nx, ny], i) => {
    const sc = reveal(i); if (sc <= 0) return;
    g.save(); g.translate(nx, ny); g.scale(sc, sc);
    const w = measure(g, s, 54, F.display, 400) + 90;
    g.fillStyle = '#fff'; rr(g, -w / 2, -60, w, 120, 18); g.fill();
    text(g, s, 0, 4, 54, '#0a0a0a', { font: F.display, weight: 400 });
    g.restore();
  });
  // belief meter under BELIEF follows the needle
  g.strokeStyle = '#fff'; g.lineWidth = 4; g.strokeRect(1390, 640, 400, 40);
  g.fillStyle = '#fff'; g.fillRect(1396, 646, 388 * x.p, 28);
  text(g, `${(x.p).toFixed(2)}`, 1590, 720, 40, '#fff', { font: F.mono });
  scanlines(g, .25);
}

// ============================================================ S14 the dial becomes a knob (bars 53-56)
function S14(g, t, x) {
  const lt = x.lt;
  g.fillStyle = '#0c0c10'; g.fillRect(0, 0, W, H);
  glow(g, W / 2, H / 2, 900, '#ffffff', .07);
  const cx = W / 2, cy = 470, R = 250;
  const ang = lerp(-2.4, 2.4, x.p);
  // scale ring
  for (let i = 0; i <= 50; i++) { const a = lerp(-2.4, 2.4, i / 50) - Math.PI / 2, big = i % 5 === 0;
    g.strokeStyle = big ? '#fff' : 'rgba(255,255,255,.4)'; g.lineWidth = big ? 6 : 3;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * (R + 40), cy + Math.sin(a) * (R + 40)); g.lineTo(cx + Math.cos(a) * (R + (big ? 90 : 65)), cy + Math.sin(a) * (R + (big ? 90 : 65))); g.stroke();
    if (big) text(g, `${i * 2}`, cx + Math.cos(a) * (R + 130), cy + Math.sin(a) * (R + 130), 30, '#fff', { font: F.mono }); }
  // circular lettering
  const word = 'POSTERIOR · POSTERIOR · POSTERIOR · ';
  g.save(); g.translate(cx, cy); g.rotate(t * .3);
  for (let i = 0; i < word.length; i++) { g.save(); g.rotate(i / word.length * 6.28); text(g, word[i], 0, -R - 175, 30, 'rgba(255,255,255,.55)', { font: F.display, weight: 400 }); g.restore(); }
  g.restore();
  // the knob
  g.save(); g.translate(cx, cy); g.rotate(ang);
  for (let i = 0; i < 48; i++) { g.save(); g.rotate(i / 48 * 6.28); g.fillStyle = i % 2 ? '#d8d8d8' : '#9a9a9a'; g.fillRect(-12, -R - 18, 24, 40); g.restore(); }
  const met = g.createRadialGradient(-80, -100, 20, 0, 0, R);
  met.addColorStop(0, '#ffffff'); met.addColorStop(.6, '#bdbdbd'); met.addColorStop(1, '#6d6d6d');
  circle(g, 0, 0, R, met);
  for (let i = 0; i < 18; i++) { g.strokeStyle = `rgba(255,255,255,${.12 + .1 * Math.sin(i)})`; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 40 + i * 14, 0, 6.28); g.stroke(); }
  g.fillStyle = '#111'; rr(g, -16, -R + 20, 32, 120, 16); g.fill();
  g.restore();
  // the hand reaches in on "then turn it down"
  const reach = easeOut(inv(5.2, 6.2, lt));
  if (reach > 0) hand(g, cx + 260, lerp(H + 500, cy + 330, reach), 1.1, -.35 + (ang + 2.4) * .08, '#f1e3c8');
  if (lt > 7.75) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); }
  scanlines(g, .2);
}

// ============================================================ S15 color floods back: crowd turns the dial (bars 57-60)
function crowdScene(g, t, x, { sky = ['#4b2a7a', '#ff6f61', '#ffc94d'], dial = true } = {}) {
  const lt = x.lt;
  g.fillStyle = vgrad(g, 0, H, [[0, sky[0]], [.6, sky[1]], [1, sky[2]]]); g.fillRect(0, 0, W, H);
  rays(g, W / 2, 1000, 28, t * .08, 'rgba(0,0,0,0)', 'rgba(255,244,224,.08)');
  glow(g, W / 2, 1000, 900, C.sun, .4);
  if (dial) {
    g.save(); shake(g, t, kickPulse(t) * 4);
    gauge(g, W / 2, 380, 250, x.p, { face: C.night, rim: C.cream });
    g.restore();
    // hands from the crowd pushing the needle down
    for (let i = 0; i < 5; i++) { const ph = pulse(t + i * .1, BEAT, 4); hand(g, 520 + i * 220, 820 - ph * 40, .55, (i - 2) * .15, [C.paper, '#e8b98f', '#a9714b', '#f1d0b5', '#7a4a2b'][i]); }
  }
  for (let r = 0; r < 3; r++) for (let i = 0; i < 22; i++) {
    const xx = (i + .5) * W / 22 + (r % 2) * 40 + Math.sin(i * 7) * 20, yy = 1010 + r * 50;
    const wave = Math.sin(t * 4 - i * .5) * .5 + .5;
    person(g, xx, yy, .8 + r * .12, hash(i * 3 + r), t, .4 + .6 * wave, i);
  }
}
function S15(g, t, x) {
  const lt = x.lt;
  crowdScene(g, t, x);
  if (lt < 1.2) { confetti(g, lt * 1.8, 140, 9); }
  confetti(g, t, 50, 4);
  if (lt < .35) { g.fillStyle = rgba(C.cream, 1 - lt / .35); g.fillRect(0, 0, W, H); }
}

// ============================================================ S16 reversal: one less paper, one less fire (bars 61-64)
function S16(g, t, x) {
  const lt = x.lt;
  g.fillStyle = vgrad(g, 0, H, [[0, '#123b49'], [.7, '#1f6b6a'], [1, '#f2b880']]); g.fillRect(0, 0, W, H);
  skyline(g, t, { seed: 21, y0: 980, hMin: 120, hMax: 420, color: '#0f2d3a', win: C.sun, winRate: lerp(.1, .6, lt / 8), wMin: 70, wMax: 160 });
  // papers fly back up
  for (let i = 0; i < 26; i++) {
    const x0 = hash(i * 2) * W, y = H + 100 - ((hash(i * 9) * (H + 300) + lt * 260) % (H + 300));
    paperIcon(g, x0 + Math.sin(lt + i) * 40, y, .6, -lt * (1 + hash(i)), .9);
  }
  // fires go out one per beat, leaving smoke
  for (let i = 0; i < 12; i++) {
    const fx = 180 + i * 140, fy = 620 + Math.sin(i * 2.1) * 60, out = i * BEAT * 1.25;
    const age = lt - out;
    if (age < 0) fireIcon(g, fx, fy, .8, t);
    else {
      const k = clamp(age / 1.2);
      fireIcon(g, fx, fy, .8 * (1 - easeOut(age / .25)), t);
      for (let s = 0; s < 3; s++) circle(g, fx + Math.sin(s + age * 3) * 20, fy - k * 160 - s * 30, (20 + s * 10) * (1 - k * .5), rgba(C.cream, .35 * (1 - k)));
      if (age < .4) { g.fillStyle = rgba(C.mint, 1 - age / .4); star(g, fx, fy, 50 + age * 120, 4, .3, 0); g.fill(); }
    }
  }
  prior(g, 1640, 760, .55, x.p, t, { eyes: 'happy', armL: 2.4, armR: 2.4 - kickPulse(t) * .4, squash: kickPulse(t) * .3 });
}

// ============================================================ S17 rooftop sunrise (bars 65-68)
function S17(g, t, x) {
  const lt = x.lt, crane = easeInOut(lt / 8) * 120;
  g.fillStyle = vgrad(g, 0, H, [[0, '#2b4f8a'], [.45, '#f49a7a'], [.75, '#ffd28a'], [1, '#ffe7b5']]); g.fillRect(0, 0, W, H);
  const sunY = lerp(860, 560, easeOut(lt / 8));
  glow(g, 1300, sunY, 700, C.sun, .55); circle(g, 1300, sunY, 170, '#fff1c2');
  for (let i = 0; i < 6; i++) { const cx = ((hash(i) * W + lt * (20 + i * 8)) % (W + 600)) - 300, cy = 160 + i * 70;
    for (let k = 0; k < 5; k++) circle(g, cx + k * 60, cy + Math.sin(k * 1.7) * 12 - (k === 2 ? 20 : 0), 52 - Math.abs(k - 2) * 9, rgba('#fff4ec', .55));
    g.fillStyle = rgba('#fff4ec', .55); rr(g, cx - 40, cy, 320, 40, 20); g.fill(); }
  for (let i = 0; i < 7; i++) { const bx = ((lt * 90 + i * 70) % (W + 300)) - 100, by = 260 + Math.sin(i * 2) * 60 + i * 12, f = Math.sin(t * 10 + i) * 12;
    g.strokeStyle = '#2b2b4a'; g.lineWidth = 4; g.beginPath(); g.moveTo(bx - 18, by - f); g.lineTo(bx, by); g.lineTo(bx + 18, by - f); g.stroke(); }
  g.save(); g.translate(0, crane);
  skyline(g, t, { seed: 31, y0: 900, hMin: 120, hMax: 380, color: '#6a4a7a', win: '#ffe7b5', winRate: .08, wMin: 80, wMax: 170, alpha: .8 });
  skyline(g, t, { seed: 37, y0: 960, hMin: 60, hMax: 240, color: '#3e2b55', win: C.sun, winRate: .1, wMin: 90, wMax: 180 });
  // rooftop ledge
  g.fillStyle = '#2a1d3c'; g.fillRect(0, 830, W, 400); g.fillStyle = '#3a2a52'; g.fillRect(0, 812, W, 26);
  prior(g, 560, 690, .62, x.p, t, { sit: true, eyes: 'happy', armL: .9, armR: .9, look: 1 });
  g.restore();
}

// ============================================================ S18 end card (bars 69-72 + tail)
function S18(g, t, x) {
  const lt = x.lt;
  rays(g, W / 2, 470, 20, t * .04, C.ink, '#1a1d3d');
  stars(g, t, 120, 13);
  gauge(g, W / 2, 330, 150, x.p + Math.sin(t * 1.4) * .02, { face: C.night, rim: C.cream });
  const s = back(lt / .6);
  g.save(); g.translate(W / 2, 640); g.scale(s, s);
  extrude(g, 'UPDATE MY PRIORS', 0, 0, 130, C.sun, C.sun2, 14);
  g.restore();
  const lines = ['words, music, voice and pictures: made from code', 'voice: Kokoro-82M through the WORLD vocoder, sung by PRIOR', "it's a forecast, not a fate"];
  lines.forEach((l, i) => text(g, l, W / 2, 790 + i * 56, i === 2 ? 40 : 30, i === 2 ? C.cream : rgba(C.cream, .65), { font: i === 2 ? F.display : F.ui, weight: i === 2 ? 400 : 700, alpha: smooth(inv(1 + i * .8, 1.8 + i * .8, lt)) }));
  const fade = inv(8.5, 10.4, lt); if (fade > 0) { g.fillStyle = `rgba(0,0,0,${fade})`; g.fillRect(0, 0, W, H); }
}

window.SCENES = { S01, S02, S03, S04, S05, S06, S07, S08, S09, S10, S11, S12, S13, S14, S15, S16, S17, S18,
  _: { headlineCard, kineticWords, confetti, crowdScene } };
})();
