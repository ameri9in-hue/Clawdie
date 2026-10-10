// The paintings. Each scene = a page-shaped mask, baked watercolour layers at different depths
// (parallax), a slow camera, and live elements painted every frame (light, wind, people, weather).
'use strict';

// ---------------------------------------------------------------- shared painters
function cloud(g, x, y, s, [lit, shade], seed) {
  const r = rng(seed);
  for (let k = 0; k < 5; k++) {
    const cx = x + (r() - .5) * s * 1.3, cy = y + (r() - .5) * s * .22;
    wash(g, ellP(cx, cy, s * (.32 + r() * .3), s * (.15 + r() * .1)), lit, { layers: 10, alpha: .055, amt: .7, seed: seed * 7 + k, sub: 40, edge: .4 });
  }
  wash(g, ellP(x, y + s * .15, s * .75, s * .1), shade, { layers: 12, alpha: .05, amt: .7, seed: seed * 13, sub: 40, edge: .7 });
}
function skyWash(g, w, h, o) {
  const { stops, bands = [], clouds = 0, cloudCols = [P.blush, P.lilac], seed = 1, cy0 = .12, cyr = .35, cs = 1 } = o;
  gradWash(g, -80, -80, w + 160, h + 160, stops, seed);
  const r = rng(seed);
  bands.forEach((col, i) => { const y = h * (.06 + r() * .75), bh = 50 + r() * 160; wash(g, rectP(-150, y, w + 300, bh, 1.3), col, { layers: 12, alpha: .04, amt: 1, seed: seed * 10 + i, sub: 180, edge: .15 }); });
  for (let i = 0; i < clouds; i++) cloud(g, r() * w, h * (cy0 + r() * cyr), (150 + r() * 260) * cs, cloudCols, seed * 100 + i);
}
function waterTank(g, cx, top, s, seed) {
  dab(g, rectP(cx - s, top - s * 2.3, s * 2, s * 1.7), hx('#a9b3c6'), .8, seed);
  dab(g, ellP(cx, top - s * 2.3, s, s * .3, 12), hx('#d3dae6'), .8, seed + 1);
  ink(g, [[cx - s, top - s * 2.3], [cx - s, top - s * .6], [cx + s, top - s * .6], [cx + s, top - s * 2.3]], { w: 1, a: .5, seed: seed + 2 });
  ink(g, [[cx - s * .8, top - s * .6], [cx - s, top]], { w: 1, a: .45, seed: seed + 3 });
  ink(g, [[cx + s * .8, top - s * .6], [cx + s, top]], { w: 1, a: .45, seed: seed + 4 });
}
// a row of buildings; returns window positions so lights can be switched on and off live
function cityRow(g, x0, x1, base, o) {
  const { hMin = 120, hMax = 380, wMin = 70, wMax = 170, cols = [P.slate], seed = 1, alpha = .07, winP = .5, winCol = P.indigo, inkA = .4, tanks = .3, detail = 1, layers = 10 } = o;
  const r = rng(seed), wins = [];
  let x = x0;
  while (x < x1) {
    const w = wMin + r() * (wMax - wMin), h = hMin + Math.pow(r(), 1.3) * (hMax - hMin), col = cols[Math.floor(r() * cols.length)], top = base - h, sd = (seed * 1000 + x) | 0;
    wash(g, rectP(x, top, w, h + 40, .25), col, { layers, alpha, amt: .07, seed: sd, sub: 50, edge: .8, gran: .1 });
    wash(g, rectP(x + w * .68, top, w * .32, h + 40, .2), mixc(col, P.ink, .3), { layers: 5, alpha: alpha * .8, amt: .06, seed: sd + 1, sub: 50, edge: 0 });
    if (detail) {
      const cw = 8 + r() * 6, ch = 11 + r() * 6, gx = cw + 7 + r() * 9, gy = ch + 9 + r() * 9;
      for (let yy = top + 16; yy < base - 18; yy += gy) for (let xx = x + 9; xx < x + w - cw - 5; xx += gx) {
        if (r() < winP) { g.fillStyle = rgba(winCol, .1 + r() * .14); g.fillRect(xx + (r() - .5) * 2, yy + (r() - .5) * 2, cw, ch); wins.push([xx + cw / 2, yy + ch / 2, r(), cw, ch]); }
      }
      if (r() < tanks) waterTank(g, x + w * (.2 + r() * .5), top, 14 + r() * 12, sd + 5);
      if (r() < .3) ink(g, [[x + w * .75, top], [x + w * .75, top - 28 - r() * 40]], { w: 1.1, a: .45, seed: sd + 6 });
    }
    ink(g, [[x, base], [x, top], [x + w, top], [x + w, base]], { w: 1.2, a: inkA, seed: sd + 7, wob: .6 });
    x += w + r() * 10 - 4;
  }
  return wins;
}
function foliage(g, cx, cy, rad, cols, seed, n = 9) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) { const a = r() * TAU, d = r() * rad * .6; dab(g, ellP(cx + Math.cos(a) * d, cy + Math.sin(a) * d * .7, rad * (.3 + r() * .3), rad * (.25 + r() * .22), 12), cols[i % cols.length], .55 + r() * .3, seed * 31 + i, .3); }
  for (let i = 0; i < 5; i++) { const a = r() * TAU, d = r() * rad * .5; ink(g, [[cx + Math.cos(a) * d, cy + Math.sin(a) * d], [cx + Math.cos(a) * d + (r() - .5) * 14, cy + Math.sin(a) * d + 10]], { w: .9, a: .3, seed: seed * 17 + i, passes: 1 }); }
}
function lampPost(g, x, gy, h, seed) {
  ink(g, [[x, gy], [x, gy - h]], { w: 5, a: .85, seed, wob: .3 });
  ink(g, [[x, gy - h + 12], [x + 6, gy - h - 14], [x + 40, gy - h - 18]], { w: 3, a: .85, seed: seed + 1, wob: .3 });
  dab(g, [[x + 22, gy - h - 22], [x + 60, gy - h - 22], [x + 54, gy - h - 7], [x + 28, gy - h - 7]], P.ink, .9, seed + 2, .05);
  return [x + 41, gy - h - 4];
}
function wire(g, x0, y0, x1, y1, sag, seed, a = .55) { const pts = []; for (let i = 0; i <= 24; i++) { const f = i / 24; pts.push([lerp(x0, x1, f), lerp(y0, y1, f) + Math.sin(f * Math.PI) * sag]); } ink(g, pts, { w: 1.1, a, seed, wob: .25, passes: 1 }); }
function litWindows(c, wins, lit, t, a = 1, col = P.warm) {
  if (a <= 0) return;
  for (const [x, y, th, w, h] of wins) {
    if (th > lit) continue;
    c.fillStyle = rgba(col, .85 * a * (.85 + .15 * Math.sin(t * .6 + th * 40))); c.fillRect(x - w / 2, y - h / 2, w, h);
  }
}
function starsLive(c, t, w, h, n, a, seed = 7, y1 = .6) {
  if (a <= 0) return;
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h * y1, m = r() ** 2, tw = .6 + .4 * Math.sin(t * (.6 + r() * 1.5) + i);
    c.fillStyle = rgba(P.cream, a * (.35 + .65 * m) * tw); c.beginPath(); c.arc(x, y, .8 + m * 2.2, 0, TAU); c.fill();
    if (m > .6) lift(c, x, y, 12, P.cream, .25 * a * tw);
  }
}
function moonPaint(g, x, y, r, phase = 0) {
  lift(g, x, y, r * 4, P.cream, .35);
  dab(g, ellP(x, y, r, r, 24), hx('#fbf3df'), 1, 901, .03);
  dab(g, ellP(x - r * .3, y - r * .1, r * .25, r * .2, 10), hx('#d9cfbd'), .5, 902);
  dab(g, ellP(x + r * .25, y + r * .3, r * .18, r * .14, 10), hx('#d9cfbd'), .45, 903);
  if (phase > 0) { g.save(); g.beginPath(); g.arc(x, y, r + 1, 0, TAU); g.clip(); dab(g, ellP(x + r * (1.25 - phase), y, r * 1.02, r * 1.05, 24), P.indigo, .55, 904, .02); g.restore(); }
  ink(g, ellP(x, y, r, r, 30), { w: 1, a: .35, seed: 905, closed: true, wob: .3 });
}
// smooth camera through keyframes [[t, value], ...]
function keys(t, ks) {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 0; i < ks.length - 1; i++) {
    const [t0, v0] = ks[i], [t1, v1] = ks[i + 1];
    if (t <= t1) return lerp(v0, v1, sine((t - t0) / (t1 - t0)));
  }
  return ks[ks.length - 1][1];
}
const MASK_STD = [70, 46, 1850, 850];
const MASK_PAGE = [300, 64, 1620, 610];

// ---------------------------------------------------------------- scenes
const SCENES_DEF = {};

// 0:00 intro: dusk over the city, rain easing, lights coming on
SCENES_DEF.intro = {
  mask: MASK_PAGE, mseed: 3,
  layers: [
    { w: 1500, h: 720, par: .3, cy: 337, bake(g, w, h) { skyWash(g, w, h, { stops: [[0, P.violet, .55], [.45, P.rose, .55], [.85, P.peach, .65], [1, P.peach, .7]], bands: [P.lilac, P.rose, P.blush, P.lilac], clouds: 6, cloudCols: [P.blush, P.violet], seed: 3, cs: .8 }); } },
    { w: 1600, h: 720, par: .6, cy: 337, bake(g, w, h, S) {
      wash(g, [[-50, 520], [300, 470], [700, 500], [1100, 450], [1650, 490], [1650, 760], [-50, 760]], P.lilac, { layers: 14, alpha: .05, amt: .3, seed: 31 });
      cityRow(g, -20, w + 20, 640, { hMin: 90, hMax: 230, cols: [P.lilac, P.violet], seed: 33, alpha: .06, winP: .3, inkA: .25, detail: 0 });
      S.wins = cityRow(g, -20, w + 20, 740, { hMin: 120, hMax: 300, cols: [P.slate, P.violet, P.grey], seed: 34, alpha: .07, winP: .55 });
    } },
  ],
  cam: lt => ({ x: lt * 5 - 30, y: -lt * 2, z: 1 + lt * .005 }),
  live(c, t, lt, S) {
    S.at(c, 1); litWindows(c, S.wins, ss(2, 11, lt), t); c.restore();
    // fine ink rain, thinning out as the song begins
    const amt = 1 - ss(7, 11.5, lt), r = rng(11);
    if (amt > 0) { c.save(); c.strokeStyle = rgba(P.slate, .35); c.lineWidth = 1; c.beginPath();
      for (let i = 0; i < 160 * amt; i++) { const x = 300 + r() * 1350, sp = 700 + r() * 400, y = (r() * 700 + t * sp) % 700 + 40; c.moveTo(x - y * .08, y); c.lineTo(x - y * .08 - 2, y + 18); }
      c.stroke(); c.restore(); }
  },
};

// 0:12 the street after the rain: bus stop, lamp, the corner store; one long pan
SCENES_DEF.street = {
  mask: MASK_STD, mseed: 5,
  layers: [
    { w: 3600, h: 900, par: .25, cy: 380, bake(g, w, h) { skyWash(g, w, h, { stops: [[0, P.indigo, .6], [.4, P.violet, .5], [.75, P.rose, .5], [1, P.peach, .55]], bands: [P.lilac, P.blush, P.violet, P.rose], clouds: 9, cloudCols: [P.blush, P.violet], seed: 51 }); } },
    { w: 3600, h: 800, par: .5, cy: 470, bake(g, w, h, S) {
      wash(g, [[-50, 430], [600, 330], [1300, 400], [2100, 310], [2900, 390], [3650, 340], [3650, 820], [-50, 820]], hx('#8e95b8'), { layers: 14, alpha: .05, amt: .3, seed: 53 });
      S.far = cityRow(g, -20, w + 20, 640, { hMin: 120, hMax: 330, cols: [P.lilac, P.violet, P.grey], seed: 54, alpha: .06, winP: .35, inkA: .25, tanks: .4 });
    } },
    { w: 3800, h: 1000, par: 1, cy: 540, bake(g, w, h, S) {
      const gy = 760; S.gy = gy;
      // shop-houses along the street
      const r = rng(55), cols = [hx('#c9a98e'), hx('#b9b0c8'), hx('#d4b8a0'), hx('#a9a6bd'), hx('#c3a3a3')];
      let x = 0; S.shopWins = [];
      while (x < 2600) {
        const bw = 260 + r() * 140, bh = 380 + r() * 180, col = cols[Math.floor(r() * cols.length)], top = gy - bh;
        wash(g, rectP(x, top, bw, bh, .2), col, { layers: 12, alpha: .08, amt: .05, seed: 560 + x | 0, sub: 50, gran: .15 });
        wash(g, rectP(x, top, bw, 26, .2), mixc(col, P.ink, .35), { layers: 6, alpha: .08, amt: .05, seed: 561 + x | 0, edge: 0 });
        // shop front + awning
        dab(g, rectP(x + 20, gy - 150, bw - 40, 150), mixc(col, P.ink, .45), .7, 562 + x | 0, .04);
        const aw = [P.teal, P.verm, P.ochre, P.ultra][Math.floor(r() * 4)];
        dab(g, [[x + 10, gy - 170], [x + bw - 10, gy - 170], [x + bw + 4, gy - 140], [x - 4, gy - 140]], aw, .75, 563 + x | 0, .05);
        for (let k = 0; k < 6; k++) ink(g, [[x + 10 + k * (bw - 20) / 6, gy - 170], [x + k * (bw - 20) / 6, gy - 140]], { w: .8, a: .35, seed: 564 + k + x | 0, passes: 1 });
        // upper windows, balconies, air conditioners, plants
        for (let fy = top + 50; fy < gy - 230; fy += 120) {
          for (let k = 0; k < 2; k++) {
            const wx = x + 40 + k * (bw - 40) / 2, ww = (bw - 120) / 2;
            dab(g, rectP(wx, fy, ww, 70), P.indigo, .35, 565 + fy + k + x | 0, .04);
            S.shopWins.push([wx + ww / 2, fy + 35, r(), ww - 6, 64]);
            inkRect(g, wx, fy, ww, 70, { w: 1.1, a: .55, seed: 566 + fy + k + x | 0, wob: .5 });
            ink(g, [[wx - 6, fy + 80], [wx + ww + 6, fy + 80]], { w: 2, a: .6, seed: 567 + fy + x | 0 });
            for (let b = 0; b < 6; b++) ink(g, [[wx + b * ww / 5, fy + 80], [wx + b * ww / 5, fy + 100]], { w: .8, a: .4, seed: 568 + b + fy + x | 0, passes: 1 });
            if (r() < .5) { dab(g, rectP(wx + ww - 30, fy + 84, 34, 22), hx('#d8d8dc'), .8, 569 + fy + x | 0); inkRect(g, wx + ww - 30, fy + 84, 34, 22, { w: .8, a: .5, seed: 570 + fy + x | 0 }); }
            if (r() < .6) foliage(g, wx + 16, fy + 74, 18, [P.sap, P.olive], 571 + fy + x | 0, 5);
          }
        }
        ink(g, [[x, gy], [x, top], [x + bw, top], [x + bw, gy]], { w: 1.4, a: .6, seed: 572 + x | 0 });
        x += bw + 6;
      }
      // the corner store
      const sx = 2700, sw = 760, sh = 300; S.store = [sx, gy, sw, sh];
      wash(g, rectP(sx - 40, gy - 560, sw + 300, 560, .2), hx('#bfb6c9'), { layers: 12, alpha: .08, amt: .05, seed: 580, gran: .15 });
      dab(g, rectP(sx, gy - sh - 60, sw, 50), P.teal, .85, 581, .03);
      dab(g, rectP(sx, gy - sh - 14, sw, 14), P.peach, .8, 582, .03);
      dab(g, rectP(sx, gy - sh, sw, sh), hx('#eef3e2'), .6, 583, .03);
      for (let row = 0; row < 3; row++) for (let k = 0; k < 7; k++) {
        const bx = sx + 30 + k * 104, by = gy - sh + 60 + row * 76;
        ink(g, [[bx, by + 34], [bx + 86, by + 34]], { w: 1.2, a: .45, seed: 584 + row * 10 + k, passes: 1 });
        for (let j = 0; j < 5; j++) dab(g, rectP(bx + 4 + j * 16, by + 6, 12, 26), [P.rose, P.ochre, P.teal, P.peach, P.ultra][(j + k + row) % 5], .45, 590 + row * 50 + k * 5 + j, .1);
      }
      [0, 1, 2, 3].forEach(i => ink(g, [[sx + i * sw / 3, gy - sh], [sx + i * sw / 3, gy]], { w: 2, a: .7, seed: 600 + i }));
      inkRect(g, sx, gy - sh - 60, sw, sh + 60, { w: 1.6, a: .7, seed: 605 });
      // bus stop shelter
      dab(g, rectP(780, gy - 230, 260, 16), P.teal, .9, 610, .03);
      ink(g, [[790, gy], [790, gy - 230]], { w: 3, a: .8, seed: 611 }); ink(g, [[1030, gy], [1030, gy - 230]], { w: 3, a: .8, seed: 612 });
      dab(g, rectP(820, gy - 180, 90, 120), P.ochre, .55, 613); inkRect(g, 820, gy - 180, 90, 120, { w: 1, a: .5, seed: 614 });
      ink(g, [[830, gy - 60], [1000, gy - 60]], { w: 2.5, a: .7, seed: 615 });
      // lamps
      S.lamps = [lampPost(g, 1400, gy + 40, 420, 620), lampPost(g, 2520, gy + 40, 420, 625)];
      // overhead wires
      wire(g, -50, 150, 1400, 210, 60, 630); wire(g, 1400, 210, 2520, 170, 55, 631); wire(g, 2520, 170, 3850, 230, 70, 632);
      wire(g, -50, 175, 1400, 236, 70, 633, .4); wire(g, 1400, 236, 2520, 196, 62, 634, .4); wire(g, 2520, 196, 3850, 256, 80, 635, .4);
      // wet road with reflections
      wash(g, rectP(-80, gy, w + 160, 300, .4), hx('#6f7593'), { layers: 16, alpha: .06, amt: .15, seed: 640, gran: .2 });
      wash(g, rectP(-80, gy - 4, w + 160, 30, .2), hx('#9a98a8'), { layers: 8, alpha: .08, amt: .1, seed: 641 });
      ink(g, [[-60, gy + 26], [w + 60, gy + 26]], { w: 1.6, a: .55, seed: 642 });
      for (let k = 0; k < 12; k++) dab(g, rectP(1650 + k * 46, gy + 120, 30, 120), P.cream, .45, 650 + k, .05);
      for (let k = 0; k < 40; k++) { const rx = r() * w; wash(g, rectP(rx, gy + 30, 30 + r() * 50, 150 + r() * 100, .5), [P.lilac, P.rose, P.ochre, P.slate][k % 4], { layers: 6, alpha: .05, amt: .3, seed: 660 + k, edge: 0 }); }
      for (let k = 0; k < 9; k++) dab(g, ellP(r() * w, gy + 70 + r() * 160, 60 + r() * 90, 10 + r() * 8, 14), hx('#c9cde0'), .35, 700 + k, .2);
      // bus (baked sprite, driven live)
      const bc = mk(720, 260), bg = bc.getContext('2d');
      wash(bg, [[20, 30], [690, 30], [700, 200], [10, 200]], hx('#5f9c8c'), { layers: 14, alpha: .1, amt: .03, seed: 710, edge: 1 });
      dab(bg, rectP(30, 60, 640, 70), P.warm, .9, 711, .02);
      for (let k = 0; k < 7; k++) ink(bg, [[30 + k * 91, 60], [30 + k * 91, 130]], { w: 1.4, a: .7, seed: 712 + k });
      dab(bg, rectP(560, 38, 110, 18), P.ochre, .9, 720, .03);
      inkRect(bg, 18, 28, 684, 174, { w: 2, a: .8, seed: 721 });
      [130, 560].forEach((wx, i) => { dab(bg, ellP(wx, 205, 38, 38, 16), P.ink, .9, 722 + i, .05); dab(bg, ellP(wx, 205, 14, 14, 10), P.grey, .9, 724 + i); });
      S.bus = bc;
    } },
    { w: 4400, h: 1100, par: 1.25, cy: 560, bake(g, w, h) {
      // foreground: railing and plant pots, very close to the lens
      for (let k = 0; k < 4; k++) foliage(g, 300 + k * 1200, 1000, 90, [P.sap, P.olive, hx('#5d7a52')], 760 + k, 12);
      for (let k = 0; k < 4; k++) { dab(g, rectP(240 + k * 1200, 1010, 130, 120), P.sienna, .8, 770 + k); inkRect(g, 240 + k * 1200, 1010, 130, 120, { w: 1.5, a: .6, seed: 775 + k }); }
    } },
  ],
  cam(lt) {
    // follow the story along the street: bus stop -> lamp -> store -> the city rushing past
    return { x: keys(lt, [[0, -1040], [3.6, -820], [6.6, -380], [9.2, 420], [11.8, 640], [14, 660], [16.4, 700]]), y: keys(lt, [[0, 20], [12, 10], [14.5, 40]]), z: keys(lt, [[0, 1.02], [11, 1.05], [13.5, .95], [16.4, .94]]) };
  },
  live(c, t, lt, S) {
    const gy = S.gy;
    S.at(c, 1); litWindows(c, S.far, .8, t, .8); c.restore();
    S.at(c, 2);
    litWindows(c, S.shopWins, .55, t, .9);
    // the last bus pulls away to the left
    const bx = lerp(820, -900, easeIn(ss(1.4, 6, lt)));
    if (bx > -800) { c.drawImage(S.bus, bx, gy - 210); lift(c, bx + 690, gy - 40, 60, hx('#ffb0a0'), .6); }
    // lamp light & the store's glow
    S.lamps.forEach(([x, y], i) => { lift(c, x, y, 260, P.warm, .8 * (.94 + .06 * Math.sin(t * 9 + i))); liftEll(c, x, gy + 120, 170, 40, P.warm, .6); });
    const [sx, , sw, sh] = S.store;
    lift(c, sx + sw / 2, gy - sh / 2, 640, hx('#fbfbe8'), .55);
    liftEll(c, sx + sw / 2, gy + 160, 520, 70, hx('#fbfbe8'), .55);
    // the girl outside the store, letter in hand, with her shadow
    const p = person('girl', { arm: 'letter', wind: .3 });
    c.save(); c.globalAlpha = .18; c.translate(2640, gy + 150); c.transform(1, 0, -1.6, .3, 0, 0); drawPerson(c, p, 0, 0, .78, { flip: 1 }); c.restore();
    c.save(); c.filter = 'brightness(0)'; c.globalAlpha = .12; c.restore();
    drawPerson(c, p, 2640, gy + 150, .78);
    // ripples in the puddles
    const r = rng(77); c.save(); c.strokeStyle = rgba(P.slate, .5); c.lineWidth = 1.2;
    for (let i = 0; i < 16; i++) { const x = r() * 3800, y = gy + 60 + r() * 200, per = 1.6 + r() * 2, f = ((t + r() * per) % per) / per; c.globalAlpha = 1 - f; c.beginPath(); c.ellipse(x, y, 8 + f * 50, (8 + f * 50) * .2, 0, 0, TAU); c.stroke(); }
    c.restore();
    // "the city keeps hurrying us on": head- and tail-light streaks
    const rush = ss(11.6, 12.8, lt);
    if (rush > 0) {
      const r2 = rng(41);
      for (let i = 0; i < 22; i++) {
        const dir = r2() < .5 ? 1 : -1, y = gy + 50 + r2() * 90, sp = 1400 + r2() * 1200, L = 260 + r2() * 420;
        const x = ((r2() * 6000 + dir * lt * sp) % 6000 + 6000) % 6000 - 1100;
        const col = dir > 0 ? hx('#ff9c8c') : P.warm;
        const gr = c.createLinearGradient(x - L * dir, 0, x, 0); gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(1, rgba(col, .75 * rush));
        c.fillStyle = gr; c.fillRect(Math.min(x, x - L * dir), y, L, 5 + r2() * 4);
      }
    }
    c.restore();
  },
};

// 0:27 the old lane: plaster walls, potted plants, lanterns, a cat on the steps
SCENES_DEF.alley = {
  mask: MASK_STD, mseed: 7,
  layers: [
    { w: 2300, h: 1250, par: 1, bake(g, w, h, S) {
      const vx = 1150, vy = 470; S.v = [vx, vy];
      // sky at the end of the lane
      skyWash(g, w, 700, { stops: [[0, P.violet, .5], [.6, P.rose, .5], [1, P.peach, .6]], bands: [P.blush, P.lilac], clouds: 3, seed: 71, cs: .5 });
      // walls in perspective
      const wall = (side, col, seed) => {
        const x0 = side < 0 ? -60 : w + 60, xv = vx + side * 150;
        wash(g, [[x0, -60], [xv, vy - 300], [xv, vy + 70], [x0, h + 60]], col, { layers: 18, alpha: .08, amt: .04, seed, sub: 60, gran: .25, edge: .6 });
        for (let i = 1; i < 10; i++) { const f = 1 - Math.pow(.8, i), x = lerp(x0, xv, f); ink(g, [[x, lerp(-60, vy - 300, f)], [x, lerp(h + 60, vy + 70, f)]], { w: 1.1 * (1 - f) + .4, a: .3, seed: seed + i, passes: 1 }); }
        // stains
        const r = rng(seed);
        for (let i = 0; i < 8; i++) { const f = r() * .7, x = lerp(x0, xv, f), y = lerp(200, vy, f) + r() * 300; wash(g, ellP(x, y, 60 * (1 - f) + 10, 120 * (1 - f) + 15, 12), mixc(col, P.umber, .4), { layers: 6, alpha: .04, amt: .5, seed: seed + 50 + i, edge: .3 }); }
      };
      wall(-1, hx('#d6b48e'), 711); wall(1, hx('#c9a99a'), 712);
      // steps
      wash(g, [[vx - 150, vy + 70], [vx + 150, vy + 70], [w + 60, h + 60], [-60, h + 60]], hx('#a9a2a8'), { layers: 16, alpha: .07, amt: .05, seed: 713, gran: .3 });
      for (let i = 0; i < 14; i++) { const f = Math.pow(i / 14, 1.6), y = lerp(h + 40, vy + 70, f), hw = lerp(1250, 150, f); ink(g, [[vx - hw, y], [vx + hw, y]], { w: 1.4 * (1 - f) + .4, a: .45, seed: 714 + i }); }
      // doors and windows with iron grilles
      const opening = (side, f0, f1, top, bot, col, seed) => {
        const xv = vx + side * 150, x0s = side < 0 ? -60 : w + 60;
        const xa = lerp(x0s, xv, f0), xb = lerp(x0s, xv, f1);
        const ya0 = lerp(-60, vy - 300, f0), ya1 = lerp(h + 60, vy + 70, f0), yb0 = lerp(-60, vy - 300, f1), yb1 = lerp(h + 60, vy + 70, f1);
        const q = [[xa, lerp(ya0, ya1, top)], [xb, lerp(yb0, yb1, top)], [xb, lerp(yb0, yb1, bot)], [xa, lerp(ya0, ya1, bot)]];
        dab(g, q, col, .75, seed, .03); ink(g, q, { closed: true, w: 1.3, a: .6, seed: seed + 1 });
        return q;
      };
      opening(-1, .3, .44, .48, 1.0, P.teal, 720); opening(1, .28, .4, .5, 1.0, hx('#8a5a48'), 722); opening(-1, .58, .66, .55, 1.0, hx('#7a5240'), 723);
      const g1 = opening(-1, .3, .44, .16, .36, P.indigo, 724), g2 = opening(1, .44, .56, .18, .4, P.indigo, 726), g3 = opening(1, .62, .7, .22, .48, P.ochre, 728);
      opening(-1, .5, .56, .2, .34, P.ochre, 729);
      opening(1, .24, .3, .3, .42, P.verm, 731); opening(-1, .46, .5, .42, .5, hx('#d8d8dc'), 733);
      [g1, g2].forEach((q, k) => { for (let i = 1; i < 5; i++) ink(g, [[lerp(q[0][0], q[1][0], i / 5), lerp(q[0][1], q[1][1], i / 5)], [lerp(q[3][0], q[2][0], i / 5), lerp(q[3][1], q[2][1], i / 5)]], { w: .9, a: .55, seed: 730 + k * 10 + i, passes: 1 }); });
      S.lit = [g3];
      // potted plants along the walls
      for (let i = 0; i < 9; i++) { const side = i % 2 ? 1 : -1, f = .05 + (i >> 1) * .14, x = lerp(side < 0 ? 60 : w - 60, vx + side * 150, f), y = lerp(h - 20, vy + 70, f), s = lerp(110, 20, f);
        dab(g, rectP(x - s * .4, y - s * .6, s * .8, s * .6), [P.sienna, P.teal, P.ochre][i % 3], .8, 740 + i); foliage(g, x, y - s * .9, s * .8, [P.sap, P.olive, hx('#5d7a52')], 750 + i, 8); }
      // the cat on the steps
      const cx = 820, cy = 1010;
      dab(g, ellP(cx, cy, 46, 34, 16), hx('#e8d7c0'), .95, 760); dab(g, ellP(cx + 34, cy - 40, 24, 22, 14), hx('#e8d7c0'), .95, 761);
      dab(g, [[cx + 18, cy - 56], [cx + 24, cy - 76], [cx + 32, cy - 58]], hx('#e8d7c0'), .95, 762, .02); dab(g, [[cx + 38, cy - 58], [cx + 48, cy - 76], [cx + 52, cy - 54]], hx('#e8d7c0'), .95, 763, .02);
      dab(g, ellP(cx - 10, cy - 10, 18, 14, 10), P.ochre, .6, 764);
      ink(g, [...ellP(cx, cy, 46, 34, 20)], { closed: true, w: 1.3, a: .7, seed: 765 });
      ink(g, [[cx + 18, cy - 56], [cx + 24, cy - 76], [cx + 32, cy - 60], [cx + 40, cy - 60], [cx + 48, cy - 76], [cx + 54, cy - 52], [cx + 58, cy - 36], [cx + 34, cy - 18], [cx + 12, cy - 30], [cx + 18, cy - 56]], { w: 1.3, a: .7, seed: 766 });
      S.cat = [cx, cy];
      // laundry pole across the lane
      S.pole = [[300, 300], [2000, 330]];
      ink(g, [S.pole[0], S.pole[1]], { w: 3, a: .7, seed: 770 });
    } },
  ],
  cam: lt => ({ x: Math.sin(lt * .15) * 30, y: keys(lt, [[0, 40], [15, -20]]), z: keys(lt, [[0, 1.0], [15.5, 1.13]]) }),
  live(c, t, lt, S) {
    const [vx, vy] = S.v, wind = ss(12.5, 15, lt);
    S.at(c, 0);
    lift(c, vx, vy - 120, 300, P.warm, .65); lift(c, vx, vy - 120, 40, P.cream, 1);
    S.lit.forEach(q => lift(c, (q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2, 90, P.warm, .7));
    // laundry swinging
    const [a, b] = S.pole, cols = [P.blush, P.cream, P.mint, P.peach, P.lilac];
    for (let i = 0; i < 9; i++) {
      const f = .2 + i * .075, x = lerp(a[0], b[0], f), y = lerp(a[1], b[1], f), sw = Math.sin(t * 1.7 + i) * (.06 + wind * .22), wdt = 44 + (i % 3) * 14, ht = 56 + (i % 2) * 26;
      c.save(); c.translate(x, y); c.transform(1, 0, sw, 1, 0, 0); c.fillStyle = rgba(cols[i % 5], .8); c.fillRect(-wdt / 2, 0, wdt, ht);
      c.strokeStyle = rgba(P.ink, .5); c.lineWidth = 1.2; c.strokeRect(-wdt / 2, 0, wdt, ht); c.restore();
    }
    // red lanterns strung across
    for (let i = 0; i < 6; i++) {
      const f = 1 - Math.pow(.74, i + 1), x = lerp(-40, vx, f) * .3 + lerp(2340, vx, f) * .7, y = lerp(120, vy - 240, f), s = lerp(1, .2, f);
      const sw = Math.sin(t * 1.5 + i) * (.05 + wind * .2);
      c.save(); c.translate(x, y); c.rotate(sw);
      c.strokeStyle = rgba(P.ink, .7); c.lineWidth = 1.5 * s; c.beginPath(); c.moveTo(0, -50 * s); c.lineTo(0, 0); c.stroke();
      lift(c, 0, 40 * s, 110 * s, hx('#ffd0b0'), .5);
      c.fillStyle = rgba(P.verm, .85); c.beginPath(); c.ellipse(0, 40 * s, 30 * s, 40 * s, 0, 0, TAU); c.fill();
      c.strokeStyle = rgba(P.ink, .55); c.lineWidth = 1.2 * s; c.stroke(); c.restore();
    }
    // she walks up the lane, turns back, and waits
    const wk = ss(.8, 6.2, lt), f = lerp(.0, .58, wk), s = lerp(1.05, .36, f);
    const px = lerp(1250, vx + 40, f), py = lerp(1240, vy + 120, f);
    const turn = ss(6.6, 7.6, lt), step = wk > 0 && wk < 1 ? (Math.floor(lt * 3.2) % 2 ? .7 : -.7) : 0;
    drawPerson(c, person('girl', { walk: step, turn: turn > .5 ? 1 : 0, wind: .3 + wind * .5 }), px, py, s);
    // the cat's tail
    const [cx, cy] = S.cat; c.save(); c.strokeStyle = rgba(P.ink, .7); c.lineWidth = 2.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx - 40, cy + 10); c.quadraticCurveTo(cx - 80, cy + 10 + Math.sin(t * 2) * 12, cx - 76, cy - 30 + Math.sin(t * 2 + 1) * 10); c.stroke(); c.restore();
    c.restore();
    petals(c, t, { n: 26, a: wind, seed: 23, wind: 1.2 });
  },
};

// 0:41 / 1:35 chorus: rooftops at blue hour, water tanks, laundry, mountains, the breeze
function roofScene(night) {
  return {
    mask: MASK_STD, mseed: night ? 13 : 11,
    layers: [
      { w: 2600, h: 1500, par: .2, cy: 380, bake(g, w, h) {
        skyWash(g, w, h, night
          ? { stops: [[0, P.night, .8], [.35, P.indigo, .6], [.7, P.violet, .5], [1, P.lilac, .5]], bands: [P.ultra, P.violet, P.indigo, P.lilac], clouds: 7, cloudCols: [P.lilac, P.indigo], seed: 113, cy0: .25, cs: 1.1 }
          : { stops: [[0, P.ultra, .6], [.35, P.violet, .45], [.65, P.rose, .45], [.9, P.peach, .6], [1, P.peach, .6]], bands: [P.lilac, P.rose, P.blush, P.violet], clouds: 8, cloudCols: [P.blush, P.violet], seed: 111, cy0: .25, cs: 1.2 });
        if (night) moonPaint(g, 640, 360, 50, .35);
      } },
      { w: 2700, h: 1000, par: .35, cy: 560, bake(g, w, h) {
        wash(g, [[-60, 520], [300, 380], [650, 470], [1000, 330], [1400, 450], [1800, 360], [2200, 470], [2760, 390], [2760, 1060], [-60, 1060]], night ? hx('#6d74a0') : hx('#8f93bd'), { layers: 16, alpha: .06, amt: .25, seed: 114 });
        wash(g, [[-60, 600], [500, 520], [1100, 590], [1700, 510], [2300, 580], [2760, 520], [2760, 1060], [-60, 1060]], night ? hx('#5a6390') : hx('#7d84b0'), { layers: 14, alpha: .06, amt: .25, seed: 115 });
      } },
      { w: 2800, h: 1000, par: .55, cy: 600, bake(g, w, h, S) {
        S.city = cityRow(g, -20, w + 20, 700, { hMin: 110, hMax: 300, cols: night ? [P.slate, P.indigo, P.violet] : [P.lilac, P.violet, P.slate], seed: 116, alpha: .07, winP: .55, tanks: .5 });
        S.city2 = cityRow(g, -20, w + 20, 820, { hMin: 140, hMax: 330, cols: night ? [P.indigo, P.slate] : [P.slate, P.grey, P.violet], seed: 117, alpha: .08, winP: .6, tanks: .5 });
      } },
      { w: 3000, h: 1100, par: .95, cy: 640, bake(g, w, h, S) {
        // the near rooftop: parapet, water tanks, a little shed, plants, laundry line
        const ry = 820; S.ry = ry;
        wash(g, rectP(-60, ry, w + 120, 400, .2), night ? hx('#8a86a6') : hx('#b8a7a4'), { layers: 14, alpha: .08, amt: .05, seed: 118, gran: .3 });
        wash(g, rectP(-60, ry - 40, w + 120, 50, .2), night ? hx('#76739a') : hx('#a89698'), { layers: 10, alpha: .08, amt: .05, seed: 119 });
        ink(g, [[-60, ry - 40], [w + 60, ry - 40]], { w: 1.8, a: .65, seed: 120 }); ink(g, [[-60, ry + 10], [w + 60, ry + 10]], { w: 1.2, a: .5, seed: 121 });
        for (let k = 0; k < 40; k++) ink(g, [[k * 76, ry - 40], [k * 76, ry - 120]], { w: 1.4, a: .5, seed: 122 + k, passes: 1 });
        ink(g, [[-60, ry - 120], [w + 60, ry - 120]], { w: 1.6, a: .55, seed: 170 });
        waterTank(g, 420, ry - 40, 60, 171); waterTank(g, 560, ry - 40, 48, 172); waterTank(g, 2380, ry - 40, 56, 173);
        // shed with corrugated roof
        dab(g, rectP(2450, ry - 260, 300, 220), night ? hx('#9b9bb8') : hx('#d7cfc0'), .85, 174);
        dab(g, [[2430, ry - 260], [2770, ry - 260], [2750, ry - 300], [2450, ry - 300]], P.teal, .85, 175, .02);
        for (let k = 0; k < 12; k++) ink(g, [[2440 + k * 28, ry - 300], [2435 + k * 28, ry - 260]], { w: .8, a: .45, seed: 176 + k, passes: 1 });
        dab(g, rectP(2510, ry - 200, 70, 160), P.umber, .7, 190); inkRect(g, 2450, ry - 260, 300, 220, { w: 1.5, a: .65, seed: 191 });
        S.door = [2545, ry - 120];
        for (let k = 0; k < 6; k++) { dab(g, rectP(1100 + k * 110, ry - 70, 60, 50), [P.sienna, P.teal, P.ochre][k % 3], .8, 192 + k); foliage(g, 1130 + k * 110, ry - 100, 46, [P.sap, P.olive, hx('#5d7a52')], 200 + k, 9); }
        S.line = [[1180, ry - 360], [1820, ry - 330]];
        ink(g, [[1180, ry - 370], [1180, ry - 40]], { w: 3, a: .75, seed: 210 }); ink(g, [[1820, ry - 340], [1820, ry - 40]], { w: 3, a: .75, seed: 211 });
        // the building across with "your" window
        wash(g, rectP(1950, 240, 470, 600, .2), night ? hx('#7f7ba3') : hx('#c3b0b4'), { layers: 14, alpha: .08, amt: .05, seed: 212, gran: .25 });
        for (let fy = 300; fy < 760; fy += 130) for (let k = 0; k < 3; k++) { dab(g, rectP(1995 + k * 140, fy, 90, 80), P.indigo, .35, 213 + fy + k); inkRect(g, 1995 + k * 140, fy, 90, 80, { w: 1, a: .5, seed: 214 + fy + k }); }
        S.yours = [2180, 470];
        ink(g, [[1950, 840], [1950, 240], [2420, 240], [2420, 840]], { w: 1.6, a: .6, seed: 215 });
      } },
    ],
    cam: lt => ({ x: keys(lt, [[0, -160], [14, 140]]), y: keys(lt, [[0, 160], [6, 90], [10.5, -40], [14, -180]]), z: keys(lt, [[0, 1.0], [14, 1.06]]) }),
    live(c, t, lt, S) {
      // the whole city's lights go quiet on 等滿城燈火都沉默 (only your window stays lit), then return
      const quiet = ss(7.3, 9.2, lt) * (1 - ss(12.6, 14.4, lt));
      S.at(c, 0); starsLive(c, t, 2600, 1500, 140, .3 + quiet * .6 + (night ? .3 : 0), 31, .55);
      // two stars draw together: the first promise
      const pr = ss(10, 10.8, lt) * (1 - ss(13.6, 14.6, lt));
      if (pr > 0) { const d = lerp(70, 16, ss(10, 12.4, lt)); [-1, 1].forEach(sg => { lift(c, 1300 + sg * d, 420, 40, P.cream, pr); lift(c, 1300 + sg * d, 420, 120, P.warm, .4 * pr); }); }
      c.restore();
      S.at(c, 2); litWindows(c, S.city, .7 * (1 - quiet), t); litWindows(c, S.city2, .6 * (1 - quiet), t); c.restore();
      S.at(c, 3);
      lift(c, S.yours[0], S.yours[1], 220, P.warm, .55 + quiet * .35); c.fillStyle = rgba(P.warm, .95); c.fillRect(S.yours[0] - 45, S.yours[1] - 40, 90, 80);
      lift(c, S.door[0], S.door[1], 90, P.warm, .3);
      // laundry on the line, lifting in the breeze
      const [a, b] = S.line, cols = [P.cream, P.blush, P.mint, P.lilac, P.peach, P.cream];
      for (let i = 0; i < 6; i++) {
        const f = .1 + i * .15, x = lerp(a[0], b[0], f), y = lerp(a[1], b[1], f) + Math.sin(f * Math.PI) * 30, sw = Math.sin(t * 2.3 + i) * .18 + .3;
        c.save(); c.translate(x, y); c.transform(1, 0, sw, 1, 0, 0); c.fillStyle = rgba(cols[i], .85); c.fillRect(-36, 0, 72, 90 + (i % 2) * 30);
        c.strokeStyle = rgba(P.ink, .5); c.lineWidth = 1.1; c.strokeRect(-36, 0, 72, 90 + (i % 2) * 30); c.restore();
      }
      c.strokeStyle = rgba(P.ink, .6); c.lineWidth = 1.4; c.beginPath(); c.moveTo(...a); c.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 60, ...b); c.stroke();
      // she stands at the parapet, scarf in the wind
      drawPerson(c, person('girl', { wind: 1 }), 900, S.ry - 20, .82);
      c.restore();
      // gusts of breeze on the downbeats
      for (const b0 of downbeatsIn(t, 3.2)) {
        const age = t - b0, r = rng(Math.floor(b0 * 100));
        windStroke(c, t, lerp(-300, W + 900, age / 3.2), { y: 160 + r() * 380, amp: 30 + r() * 40, len: 900, a: .55 * (1 - age / 3.2) + .1, width: 16, ph: r() * 9, tilt: -.05 });
      }
      petals(c, t, { n: 36, seed: night ? 29 : 27, wind: 1.3 });
    },
  };
}
SCENES_DEF.roof = roofScene(false);
SCENES_DEF.roof2 = roofScene(true);

// 0:55 / 1:48 the window: lamp inside, curtains, a wind chime; the world rushes past in the glass
function windowScene(night) {
  return {
    mask: MASK_STD, mseed: night ? 17 : 15,
    layers: [
      { w: 2300, h: 1300, par: 1, bake(g, w, h, S) {
        const wallCol = night ? hx('#9890b0') : hx('#d4b9a2');
        wash(g, rectP(-60, -60, w + 120, h + 120, .3), wallCol, { layers: 18, alpha: .07, amt: .05, seed: night ? 131 : 130, gran: .35 });
        const r = rng(132);
        for (let i = 0; i < 70; i++) { const x = r() * w, y = r() * h; ink(g, [[x, y], [x + 40 + r() * 30, y]], { w: .8, a: .2, seed: 133 + i, passes: 1 }); }
        const wx = 650, wy = 230, ww = 1000, wh = 720; S.win = [wx, wy, ww, wh];
        // the warm room behind the glass
        gradWash(g, wx, wy, ww, wh, [[0, P.ochre, .55], [.6, P.peach, .6], [1, P.sienna, .6]], 134);
        dab(g, rectP(wx + 70, wy + 360, 240, 340), P.umber, .35, 135);
        for (let k = 0; k < 3; k++) { ink(g, [[wx + 70, wy + 470 + k * 110], [wx + 310, wy + 470 + k * 110]], { w: 1.2, a: .45, seed: 137 + k }); for (let j = 0; j < 7; j++) dab(g, rectP(wx + 80 + j * 32, wy + 400 + k * 110, 22, 66), [P.verm, P.teal, P.ochre, P.ultra, P.rose][(j + k) % 5], .38, 140 + k * 9 + j, .06); }
        const lx = wx + 690, ly = wy + 380; S.lamp = [lx, ly];
        ink(g, [[lx, ly], [lx, wy + wh]], { w: 3, a: .8, seed: 140 });
        dab(g, [[lx - 80, ly], [lx + 80, ly], [lx + 50, ly - 100], [lx - 50, ly - 100]], hx('#fff1d0'), .95, 141, .02);
        ink(g, [[lx - 80, ly], [lx + 80, ly], [lx + 50, ly - 100], [lx - 50, ly - 100]], { closed: true, w: 1.4, a: .6, seed: 142 });
        // frame
        const fc = night ? hx('#7d5a4a') : P.sienna;
        [[wx - 30, wy - 30, ww + 60, 32], [wx - 30, wy + wh, ww + 60, 36], [wx - 30, wy, 32, wh], [wx + ww - 2, wy, 32, wh], [wx + ww / 2 - 12, wy, 24, wh], [wx, wy + wh * .45, ww, 20]].forEach(([x, y, w2, h2], i) => { dab(g, rectP(x, y, w2, h2), fc, .95, 150 + i, .02); inkRect(g, x, y, w2, h2, { w: 1.3, a: .65, seed: 160 + i }); });
        // flower box on the sill
        dab(g, rectP(wx - 10, wy + wh + 36, ww + 20, 70), P.teal, .85, 170); inkRect(g, wx - 10, wy + wh + 36, ww + 20, 70, { w: 1.5, a: .7, seed: 171 });
        for (let k = 0; k < 11; k++) { foliage(g, wx + 30 + k * 92, wy + wh + 20, 52, [P.sap, P.olive, hx('#5d7a52')], 172 + k, 8); if (k % 2) for (let j = 0; j < 3; j++) dab(g, ellP(wx + 20 + k * 92 + j * 22, wy + wh - 10 - j * 14, 9, 8, 8), [P.rose, P.peach, P.cream][j], .9, 190 + k * 3 + j); }
        S.chime = [wx + 120, wy - 30];
      } },
    ],
    cam: lt => ({ x: keys(lt, [[0, -60], [10, 40]]), y: keys(lt, [[0, -20], [10, 20]]), z: keys(lt, [[0, 1.0], [10, 1.1]]) }),
    live(c, t, lt, S) {
      S.at(c, 0);
      const [wx, wy, ww, wh] = S.win, [lx, ly] = S.lamp;
      lift(c, lx, ly - 40, 360, P.warm, .75 * (.93 + .07 * env(t)));
      // reflections racing across the panes: the world going by
      const rush = 1 + ss(3.6, 4.4, lt) * 5 * (1 - ss(7.6, 9, lt));
      c.save(); c.beginPath(); c.rect(wx, wy, ww, wh); c.clip(); c.globalAlpha = .35;
      for (let i = 0; i < 5; i++) { const x = ((i * 520 + lt * 60 * rush * (1 + i * .2)) % (ww + 700)) + wx - 400; lift(c, x, wy + 80 + i * 130, 260, night ? P.lilac : P.cream, .5); }
      c.restore();
      // curtains billowing inward-out
      [-1, 1].forEach(s => {
        const bx = s < 0 ? wx + 4 : wx + ww - 4;
        c.save(); c.fillStyle = rgba(night ? P.lilac : P.blush, .5); c.strokeStyle = rgba(P.ink, .3); c.lineWidth = 1.2; c.beginPath(); c.moveTo(bx, wy);
        for (let i = 0; i <= 14; i++) { const f = i / 14, bil = Math.sin(t * 1.6 + f * 3 + s) * 26 * f + 70 * f * (.6 + .4 * Math.sin(t * .8 + s)); c.lineTo(bx - s * (60 + bil), wy + f * wh); }
        c.lineTo(bx, wy + wh); c.closePath(); c.fill(); c.stroke(); c.restore();
      });
      // the wind chime (風鈴): a glass bell with a paper strip that swings and catches the breeze
      const [cx, cy] = S.chime, gust = ss(6, 6.6, lt) * Math.exp(-Math.max(0, lt - 6.6) * .5), sw = Math.sin(t * 2.4) * (.08 + gust * .5) + gust * .3;
      c.save(); c.translate(cx, cy); c.rotate(sw);
      c.strokeStyle = rgba(P.ink, .7); c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 40); c.stroke();
      c.fillStyle = rgba(hx('#bfe0ea'), .8); c.beginPath(); c.arc(0, 70, 30, Math.PI, 0); c.lineTo(30, 74); c.lineTo(-30, 74); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(0, 74); c.lineTo(0, 110); c.stroke();
      c.save(); c.translate(0, 110); c.rotate(sw * 1.6); c.fillStyle = rgba(P.cream, .95); c.fillRect(-12, 0, 24, 80); c.strokeRect(-12, 0, 24, 80);
      c.strokeStyle = rgba(P.verm, .7); c.beginPath(); c.moveTo(0, 14); c.lineTo(0, 64); c.stroke(); c.restore();
      if (gust > .05) lift(c, 0, 70, 70, P.cream, gust);
      c.restore();
      c.restore();
      const gustA = ss(5.8, 6.4, lt) * (1 - ss(8.4, 9.6, lt));
      windStroke(c, t, lerp(-200, W * .8, ss(5.8, 7.6, lt)), { y: 360, amp: 40, len: 1000, a: .7 * gustA, width: 20, ph: 2.2 });
      petals(c, t, { n: 22, seed: night ? 37 : 35, wind: 1.1, a: .5 + gustA * .5 });
    },
  };
}
SCENES_DEF.window = windowScene(false);
SCENES_DEF.window2 = windowScene(true);

// 1:05 inside: the cup on the sill, half moonlight, half lamplight; a sketch of tomorrow
SCENES_DEF.room = {
  mask: MASK_STD, mseed: 19,
  layers: [
    { w: 2300, h: 1250, par: .5, bake(g, w, h, S) {
      skyWash(g, w, h, { stops: [[0, P.night, .8], [.5, P.indigo, .65], [1, P.ultra, .55]], bands: [P.ultra, P.indigo, P.violet], clouds: 3, cloudCols: [P.lilac, P.indigo], seed: 191, cy0: .45 });
      moonPaint(g, 800, 380, 70, .5);
      S.city = cityRow(g, -20, w + 20, 1000, { hMin: 80, hMax: 260, cols: [P.indigo, P.slate], seed: 192, alpha: .08, winP: .5, inkA: .3, tanks: .4 });
    } },
    { w: 2400, h: 1300, par: 1, bake(g, w, h, S) {
      // room wall around the window (window hole stays clear)
      const wx = 380, wy = 140, ww = 1250, wh = 760; S.win = [wx, wy, ww, wh];
      const wallCol = hx('#cfa98a');
      g.save(); g.beginPath(); g.rect(-100, -100, w + 200, h + 200); g.rect(wx, wy, ww, wh); g.clip('evenodd');
      wash(g, rectP(-80, -80, w + 160, h + 160, .3), wallCol, { layers: 18, alpha: .09, amt: .05, seed: 193, gran: .3 });
      wash(g, rectP(-80, -80, wx + 100, h + 160, .3), P.indigo, { layers: 10, alpha: .05, amt: .1, seed: 194, edge: 0 });
      g.restore();
      // frame & cross bar
      [[wx - 26, wy - 26, ww + 52, 28], [wx - 26, wy + wh - 4, ww + 52, 30], [wx - 26, wy, 28, wh], [wx + ww - 2, wy, 28, wh], [wx + ww * .46, wy, 20, wh]].forEach(([x, y, w2, h2], i) => { dab(g, rectP(x, y, w2, h2), P.umber, .95, 200 + i, .02); inkRect(g, x, y, w2, h2, { w: 1.3, a: .6, seed: 210 + i }); });
      // desk / sill
      wash(g, rectP(wx - 200, wy + wh + 20, ww + 600, 80, .2), P.sienna, { layers: 12, alpha: .1, amt: .04, seed: 220 });
      wash(g, rectP(-60, wy + wh + 100, w + 120, 400, .2), mixc(P.sienna, P.ink, .3), { layers: 12, alpha: .08, amt: .05, seed: 221 });
      ink(g, [[wx - 200, wy + wh + 20], [wx + ww + 400, wy + wh + 20]], { w: 1.8, a: .7, seed: 222 });
      // the cup
      const cx = 980, cy = wy + wh + 20; S.cup = [cx, cy];
      dab(g, rectP(cx - 52, cy - 104, 104, 104), hx('#f6f2ea'), 1, 223, .03);
      dab(g, rectP(cx - 52, cy - 96, 104, 10), P.ultra, .7, 224, .03);
      ink(g, [[cx - 52, cy - 104], [cx - 50, cy], [cx + 50, cy], [cx + 52, cy - 104]], { w: 1.5, a: .75, seed: 225 });
      ink(g, [[cx - 52, cy - 104], [cx + 52, cy - 104]], { w: 1.2, a: .6, seed: 226 });
      ink(g, ellP(cx + 66, cy - 56, 20, 26, 14).slice(10, 18).concat(ellP(cx + 66, cy - 56, 20, 26, 14).slice(0, 4)), { w: 3, a: .75, seed: 227 });
      // the sketchbook
      const bx = 1260, by = cy - 26; S.book = [bx, by];
      dab(g, [[bx - 170, by - 6], [bx + 170, by - 6], [bx + 190, by + 22], [bx - 190, by + 22]], hx('#fbf6ea'), 1, 228, .02);
      ink(g, [[bx - 190, by + 22], [bx - 170, by - 6], [bx + 170, by - 6], [bx + 190, by + 22], [bx - 190, by + 22]], { w: 1.2, a: .6, seed: 229 });
      ink(g, [[bx, by - 6], [bx, by + 22]], { w: 1, a: .5, seed: 230 });
      // lamp at the right and a framed picture
      S.lamp = [2000, 560];
      dab(g, [[1920, 560], [2080, 560], [2050, 450], [1950, 450]], hx('#fff1d0'), .95, 231, .02);
      ink(g, [[2000, 560], [2000, wy + wh + 20]], { w: 3, a: .8, seed: 232 });
      dab(g, rectP(1820, 220, 200, 150), P.cream, .9, 233); dab(g, rectP(1840, 240, 160, 110), P.sap, .5, 234); inkRect(g, 1820, 220, 200, 150, { w: 1.5, a: .7, seed: 235 });
      foliage(g, 220, 300, 110, [P.sap, P.olive, hx('#5d7a52')], 236, 14);
      ink(g, [[220, -60], [220, 220]], { w: 1.2, a: .6, seed: 237 });
    } },
  ],
  cam: lt => ({ x: keys(lt, [[0, -80], [11, 80]]), y: 0, z: keys(lt, [[0, 1.02], [11, 1.08]]) }),
  live(c, t, lt, S) {
    S.at(c, 0); litWindows(c, S.city, .6, t, .9);
    // mist rolls in: 也曾在沉默裡面走丟
    const fog = ss(9.8, 12, lt);
    if (fog > 0) for (let i = 0; i < 7; i++) { const x = ((i * 420 + lt * 40) % 2800) - 300; lift(c, x, 700 + (i % 3) * 120, 360, hx('#c6c9e0'), .5 * fog); }
    c.restore();
    S.at(c, 1);
    const [wx, wy, ww, wh] = S.win, [cx, cy] = S.cup, [bx, by] = S.book, [lx, ly] = S.lamp;
    // moonlight from the left pane, lamplight from the right
    c.save(); c.globalAlpha = .45; const mg = c.createLinearGradient(wx, 0, wx + ww * .6, 0); mg.addColorStop(0, rgba(hx('#dfe6ff'), .5)); mg.addColorStop(1, rgba(hx('#dfe6ff'), 0));
    c.fillStyle = mg; c.beginPath(); c.moveTo(wx, wy + wh); c.lineTo(wx + ww * .46, wy + wh); c.lineTo(wx + ww * .7, wy + wh + 400); c.lineTo(wx - 100, wy + wh + 400); c.fill(); c.restore();
    lift(c, lx, ly - 40, 520, P.warm, .7 * (.93 + .07 * env(t)));
    // steam
    c.save(); c.strokeStyle = rgba(P.cream, .6); c.lineWidth = 5; c.lineCap = 'round';
    for (let i = 0; i < 3; i++) { c.beginPath(); for (let j = 0; j <= 20; j++) { const f = j / 20, x = cx - 20 + i * 20 + Math.sin(t * 1.2 + f * 6 + i * 2) * 14 * f, y = cy - 112 - f * 190; j ? c.lineTo(x, y) : c.moveTo(x, y); } c.globalAlpha = .5 - i * .1; c.stroke(); }
    c.restore();
    // the sketch draws itself: a small house and two people, 我們曾把明天畫得很久
    const sk = ss(5.4, 8.6, lt);
    if (sk > 0) {
      c.save(); c.translate(bx + 30, by + 2); c.scale(1, .32); c.strokeStyle = rgba(P.ink, .75); c.lineWidth = 2.4; c.lineCap = 'round';
      const strokes = [[[0, 0], [0, -60], [50, -100], [100, -60], [100, 0], [0, 0]], [[35, 0], [35, -30], [60, -30], [60, 0]], [[-120, 0], [-120, -50]], [[-90, 0], [-90, -55]], [[-120, -50], [-105, -40], [-90, -55]]];
      let total = strokes.reduce((a, s) => a + s.length - 1, 0), done = sk * total;
      for (const st of strokes) { for (let i = 1; i < st.length && done > 0; i++, done--) { const f = Math.min(1, done); c.beginPath(); c.moveTo(...st[i - 1]); c.lineTo(lerp(st[i - 1][0], st[i][0], f), lerp(st[i - 1][1], st[i][1], f)); c.stroke(); } }
      [[-120, -64], [-90, -70]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 10, 0, TAU); c.globalAlpha = ss(.6, .8, sk); c.stroke(); });
      c.restore();
    }
    c.restore();
  },
};

// 1:16 the long way round: hills, a winding road, a lantern; two people meet at the end
SCENES_DEF.road = {
  mask: MASK_STD, mseed: 21,
  layers: [
    { w: 2400, h: 1500, par: .2, cy: 400, bake(g, w, h) { skyWash(g, w, h, { stops: [[0, P.night, .75], [.45, P.indigo, .6], [.8, P.violet, .5], [1, P.lilac, .5]], bands: [P.ultra, P.violet], clouds: 4, cloudCols: [P.lilac, P.indigo], seed: 211, cy0: .2 }); moonPaint(g, 1700, 300, 40, .2); } },
    { w: 2600, h: 1700, par: 1, cy: 500, bake(g, w, h, S) {
      const hillsC = [hx('#6f7aa8'), hx('#5f8a8c'), hx('#6c8f6a'), hx('#4f6e5e')];
      [[700, 0], [860, 1], [1050, 2], [1300, 3]].forEach(([y, k]) => { const pts = [[-80, h + 80]]; for (let i = 0; i <= 12; i++) pts.push([-80 + i * (w + 160) / 12, y + Math.sin(i * 1.3 + k) * 60 + Math.sin(i * .5 + k * 2) * 40]); pts.push([w + 80, h + 80]); wash(g, pts, hillsC[k], { layers: 16, alpha: .07, amt: .12, seed: 212 + k, gran: .25 }); });
      // terraces
      for (let k = 0; k < 18; k++) { const y = 900 + k * 38, x0 = 100 + (k % 4) * 90; ink(g, [[x0, y], [x0 + 500 + (k % 3) * 100, y - 10]], { w: .9, a: .3, seed: 220 + k, passes: 1 }); }
      // trees
      const r = rng(230); for (let k = 0; k < 26; k++) { const x = r() * w, y = 760 + r() * 600; foliage(g, x, y, 30 + r() * 40, [P.sap, hx('#4f6e5e'), P.teal], 231 + k, 7); }
      // houses on the hilltop
      S.houses = [];
      [[1840, 760, 1], [1650, 800, .7], [2080, 790, .8]].forEach(([x, y, s], i) => {
        dab(g, rectP(x - 50 * s, y - 60 * s, 100 * s, 60 * s), hx('#d9c8b0'), .9, 240 + i); dab(g, [[x - 62 * s, y - 60 * s], [x, y - 110 * s], [x + 62 * s, y - 60 * s]], P.verm, .8, 243 + i, .02);
        ink(g, [[x - 62 * s, y - 60 * s], [x, y - 110 * s], [x + 62 * s, y - 60 * s], [x + 50 * s, y - 60 * s], [x + 50 * s, y], [x - 50 * s, y], [x - 50 * s, y - 60 * s]], { w: 1.2, a: .6, seed: 246 + i });
        S.houses.push([x, y - 32 * s, s]);
      });
      // the winding road
      const R = []; for (let i = 0; i <= 140; i++) { const f = i / 140, y = lerp(h + 40, 800, Math.pow(f, .75)), amp = lerp(560, 30, f); R.push([lerp(400, 1780, f) + Math.sin(f * 10) * amp, y, lerp(110, 6, f)]); }
      S.road = R;
      const edge = s => R.map((p, i) => { const a = R[Math.max(0, i - 1)], b = R[Math.min(R.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [p[0] - dy / l * p[2] * s * .5, p[1] + dx / l * p[2] * s * .5]; });
      const L = edge(1), Rr = edge(-1);
      wash(g, [...L, ...Rr.reverse()].map(p => [p[0], p[1], .1]), hx('#e9dcc6'), { layers: 10, alpha: .12, amt: .02, seed: 250, sub: 40, edge: .5 });
      ink(g, L, { w: 1.2, a: .45, seed: 251 }); ink(g, Rr, { w: 1.2, a: .45, seed: 252 });
    } },
  ],
  cam: lt => ({ x: keys(lt, [[0, -260], [9, 150]]), y: keys(lt, [[0, 380], [6, 60], [9.6, -10]]), z: keys(lt, [[0, 1.0], [9.6, 1.08]]) }),
  live(c, t, lt, S) {
    S.at(c, 0); starsLive(c, t, 2400, 1500, 160, .8, 41, .5); c.restore();
    S.at(c, 1);
    S.houses.forEach(([x, y, s], i) => { c.fillStyle = rgba(P.warm, .95); c.fillRect(x - 16 * s, y - 12 * s, 32 * s, 24 * s); lift(c, x, y, 110 * s, P.warm, .6); });
    // the lantern travels the long way round, leaving a pale trail
    const R = S.road, prog = ss(.6, 6, lt), idx = Math.min(R.length - 1, Math.floor(prog * (R.length - 1)));
    c.save(); c.lineCap = 'round';
    for (let i = 1; i <= idx; i++) { c.strokeStyle = rgba(P.warm, .5 * (i / Math.max(1, idx))); c.lineWidth = R[i][2] * .25; c.beginPath(); c.moveTo(R[i - 1][0], R[i - 1][1]); c.lineTo(R[i][0], R[i][1]); c.stroke(); }
    c.restore();
    const p = R[idx], fadeL = 1 - ss(6, 7, lt);
    lift(c, p[0], p[1] - 10, 110, P.warm, .9 * fadeL); lift(c, p[0], p[1] - 10, 18, P.cream, fadeL);
    // two people meet near the houses and take each other's hand
    const meet = ss(2.4, 5, lt), hold = ss(4.4, 5.6, lt);
    if (meet > 0) {
      const hxp = 1840, hyp = 820, sc = .2;
      drawPerson(c, person('girl', { arm: hold > .5 ? 'reachR' : 'down', wind: .6 }), hxp - 60 + lerp(-40, 0, meet), hyp, sc, { alpha: meet });
      drawPerson(c, person('boy', { arm: hold > .5 ? 'reachL' : 'down', wind: .6 }), hxp + 60 - lerp(-40, 0, meet), hyp, sc, { alpha: meet });
      if (hold > .5) lift(c, hxp, hyp - 40, 50, P.warm, (hold - .5) * 1.6);
    }
    // fireflies
    const r = rng(43); for (let i = 0; i < 30; i++) { const x = r() * 2600 + Math.sin(t * .4 + i) * 30, y = 900 + r() * 700 + Math.cos(t * .5 + i) * 20, b = Math.pow(.5 + .5 * Math.sin(t * (1 + r()) + i), 2); lift(c, x, y, 16, hx('#fff3b0'), .8 * b); }
    c.restore();
  },
};

// 1:24 if time could flow backwards: star trails rewinding over the hills
SCENES_DEF.trails = {
  mask: MASK_STD, mseed: 23,
  layers: [
    { w: 2200, h: 1300, par: .3, bake(g, w, h) { skyWash(g, w, h, { stops: [[0, hx('#1d2348'), .9], [.6, P.night, .8], [1, P.indigo, .7]], bands: [P.ultra, P.indigo, P.violet], seed: 241 }); } },
    { w: 2400, h: 1300, par: 1, bake(g, w, h, S) {
      const pts = [[-80, h + 80]]; for (let i = 0; i <= 10; i++) pts.push([-80 + i * (w + 160) / 10, 850 + Math.sin(i * .9) * 50]); pts.push([w + 80, h + 80]);
      wash(g, pts, hx('#3d4f6a'), { layers: 16, alpha: .09, amt: .12, seed: 242, gran: .3 });
      const p2 = [[-80, h + 80]]; for (let i = 0; i <= 10; i++) p2.push([-80 + i * (w + 160) / 10, 1000 + Math.sin(i * 1.4 + 2) * 40]); p2.push([w + 80, h + 80]);
      wash(g, p2, hx('#2c3a50'), { layers: 16, alpha: .1, amt: .12, seed: 243, gran: .3 });
      const hx0 = 1850, hy0 = 860; S.house = [hx0, hy0 - 30];
      dab(g, rectP(hx0 - 50, hy0 - 60, 100, 60), hx('#b9b0b8'), .9, 244); dab(g, [[hx0 - 62, hy0 - 60], [hx0, hy0 - 110], [hx0 + 62, hy0 - 60]], P.umber, .85, 245, .02);
      ink(g, [[hx0 - 62, hy0 - 60], [hx0, hy0 - 110], [hx0 + 62, hy0 - 60], [hx0 + 50, hy0 - 60], [hx0 + 50, hy0], [hx0 - 50, hy0], [hx0 - 50, hy0 - 60]], { w: 1.2, a: .6, seed: 246 });
      for (let k = 0; k < 120; k++) { const x = (k / 120) * w, y = 1010 + Math.sin(k) * 20; ink(g, [[x, y + 40], [x + 6, y - 20 - (k % 5) * 6]], { w: 1, a: .4, seed: 250 + k, passes: 1 }); }
    } },
  ],
  cam: lt => ({ x: keys(lt, [[0, -80], [10, 60]]), y: 0, z: keys(lt, [[0, 1.02], [10, 1.07]]) }),
  live(c, t, lt, S) {
    S.at(c, 0);
    const px = 600, py = 160, back = t - 86.66;
    const ang = back < 0 ? back * .05 : -Math.sin(Math.min(back, 6) / 6 * Math.PI / 2) * 1.4 - Math.max(0, back - 6) * .02;
    const trail = Math.min(Math.abs(ang) + .06, 1.1), r = rng(91);
    c.save(); c.lineCap = 'round';
    for (let i = 0; i < 300; i++) {
      const rad = 40 + Math.pow(r(), .8) * 1900, a0 = r() * TAU, br = r() ** 2, col = r() < .25 ? P.warm : P.cream;
      const a1 = a0 + ang, a2 = a1 - trail * Math.sign(ang || 1);
      c.strokeStyle = rgba(col, .25 + br * .55); c.lineWidth = .8 + br * 1.8;
      c.beginPath(); c.arc(px, py, rad, Math.min(a1, a2), Math.max(a1, a2)); c.stroke();
    }
    c.restore(); c.restore();
    S.at(c, 1);
    const [hx0, hy0] = S.house; c.fillStyle = rgba(P.warm, .95); c.fillRect(hx0 - 18, hy0 - 12, 36, 26); lift(c, hx0, hy0, 160, P.warm, .65);
    // she walks toward the light: 我還是會向你的方向走
    const go = ss(3.4, 11, lt), step = go > 0 && go < 1 ? (Math.floor(lt * 3) % 2 ? .7 : -.7) : 0;
    drawPerson(c, person('girl', { walk: step, wind: .6 }), lerp(700, 1350, go), 1040, .42);
    c.restore();
  },
};

// 1:58 bridge: a door in the night, pushed open (lyrics run as a vertical poem in the right margin)
SCENES_DEF.door = {
  mask: [60, 56, 1300, 1024], mseed: 25,
  layers: [
    { w: 1700, h: 1300, par: 1, cx: 680, bake(g, w, h, S) {
      wash(g, rectP(-60, -60, w + 120, h + 120, .3), hx('#7e7aa0'), { layers: 18, alpha: .08, amt: .05, seed: 251, gran: .35 });
      const r = rng(252); for (let i = 0; i < 90; i++) { const x = r() * w, y = r() * h; ink(g, [[x, y], [x + 30 + r() * 40, y]], { w: .8, a: .2, seed: 253 + i, passes: 1 }); }
      const dx = 650, dy = 360, dw = 400, dh = 700; S.door = [dx, dy, dw, dh];
      // warm room beyond the doorway
      gradWash(g, dx, dy, dw, dh, [[0, P.ochre, .7], [.6, P.peach, .75], [1, P.sienna, .7]], 254);
      dab(g, rectP(dx + 210, dy + 120, 130, 170), P.indigo, .6, 255); inkRect(g, dx + 210, dy + 120, 130, 170, { w: 1.2, a: .6, seed: 256 }); ink(g, [[dx + 275, dy + 120], [dx + 275, dy + 290]], { w: 1, a: .5, seed: 257 });
      dab(g, ellP(dx + 200, dy + dh - 30, 170, 30, 18), P.rose, .55, 258);
      dab(g, rectP(dx + 40, dy + 430, 110, 200), P.umber, .5, 259); ink(g, [[dx + 40, dy + 430], [dx + 150, dy + 430]], { w: 1.2, a: .5, seed: 249 });
      dab(g, [[dx + 300, dy + 330], [dx + 370, dy + 330], [dx + 355, dy + 280], [dx + 315, dy + 280]], P.warm, .9, 248, .02); ink(g, [[dx + 335, dy + 330], [dx + 335, dy + 560]], { w: 2, a: .6, seed: 247 });
      // frame, step, lamp
      [[dx - 30, dy - 30, dw + 60, 32], [dx - 30, dy, 32, dh], [dx + dw - 2, dy, 32, dh]].forEach(([x, y, w2, h2], i) => { dab(g, rectP(x, y, w2, h2), P.umber, .95, 256 + i, .02); inkRect(g, x, y, w2, h2, { w: 1.4, a: .7, seed: 260 + i }); });
      dab(g, rectP(dx - 90, dy + dh, dw + 180, 40), P.grey, .85, 263); dab(g, rectP(dx - 150, dy + dh + 40, dw + 300, 40), hx('#a7a3b0'), .85, 264);
      inkRect(g, dx - 90, dy + dh, dw + 180, 40, { w: 1.2, a: .6, seed: 265 }); inkRect(g, dx - 150, dy + dh + 40, dw + 300, 40, { w: 1.2, a: .6, seed: 266 });
      S.lamp = [dx + dw / 2, dy - 90];
      dab(g, rectP(dx + dw / 2 - 26, dy - 120, 52, 50), P.ink, .85, 267); ink(g, [[dx + dw / 2, dy - 120], [dx + dw / 2, dy - 160]], { w: 2, a: .8, seed: 268 });
      // ivy climbing the wall, plants by the step
      for (let k = 0; k < 16; k++) foliage(g, dx - 160 + (k % 4) * 30 + Math.sin(k) * 40, 120 + k * 60, 50, [P.sap, hx('#4f6e5e'), P.olive], 270 + k, 6);
      for (let k = 0; k < 10; k++) foliage(g, dx + dw + 140 + Math.sin(k * 2) * 40, 200 + k * 70, 44, [P.sap, hx('#4f6e5e')], 290 + k, 6);
      dab(g, rectP(dx - 260, dy + dh - 60, 110, 100), P.sienna, .85, 300); foliage(g, dx - 205, dy + dh - 110, 80, [P.sap, P.olive], 301, 10);
      dab(g, rectP(dx + dw + 170, dy + dh - 40, 90, 80), P.teal, .85, 302); foliage(g, dx + dw + 215, dy + dh - 80, 64, [P.sap, P.olive], 303, 9);
      // the door panel as its own sprite
      const pc = mk(dw, dh), pg = pc.getContext('2d');
      wash(pg, rectP(4, 4, dw - 8, dh - 8, .1), hx('#9a6a4e'), { layers: 16, alpha: .12, amt: .02, seed: 310, gran: .3 });
      [[40, 50, dw - 80, 260], [40, 360, dw - 80, 290]].forEach(([x, y, w2, h2], i) => { dab(pg, rectP(x, y, w2, h2), hx('#7a5240'), .5, 311 + i); inkRect(pg, x, y, w2, h2, { w: 1.2, a: .6, seed: 313 + i }); });
      dab(pg, ellP(dw - 50, dh * .52, 12, 12, 10), P.gold, 1, 315); inkRect(pg, 2, 2, dw - 4, dh - 4, { w: 1.6, a: .75, seed: 316 });
      S.panel = pc;
    } },
  ],
  cam: lt => ({ x: 0, y: keys(lt, [[0, 20], [9, 0]]), z: keys(lt, [[0, 1.0], [8, 1.06], [10.5, 1.4], [13, 1.7]]) }),
  live(c, t, lt, S) {
    S.at(c, 0);
    const [dx, dy, dw, dh] = S.door, [lx, ly] = S.lamp;
    const open = easeIO(ss(7.4, 9.4, lt));
    lift(c, lx, ly, 260, P.warm, .75); lift(c, lx, ly, 26, P.cream, 1);
    // light spills out as it opens
    if (open > 0) {
      c.save(); c.globalAlpha = open; c.fillStyle = rgba(P.warm, .5);
      c.beginPath(); c.moveTo(dx, dy + dh); c.lineTo(dx + dw, dy + dh); c.lineTo(dx + dw + 360, dy + dh + 300); c.lineTo(dx - 160, dy + dh + 300); c.fill(); c.restore();
      lift(c, dx + dw / 2, dy + dh / 2, 700 * open, P.warm, .3 * open); lift(c, dx + 335, dy + 300, 160, P.warm, .8 * open);
    }
    // door panel swings inward
    const pw = dw * Math.cos(open * Math.PI * .46);
    c.drawImage(S.panel, dx, dy, pw, dh);
    // dust in the light
    const r = rng(101);
    for (let i = 0; i < 26; i++) { const x = dx - 60 + r() * (dw + 120) + Math.sin(t * .5 + i) * 20, y = dy + r() * (dh + 200) + Math.cos(t * .4 + i) * 20; lift(c, x, y, 10, P.cream, (.3 + open * .7) * (.5 + .5 * Math.sin(t + i))); }
    c.restore();
    // stepping through the door into the light
    const through = ss(10.5, 13, lt);
    if (through > 0) { c.fillStyle = rgba(P.cream, through * .9); c.fillRect(0, 0, W, H); }
  },
};

// 2:10 the other side of the night: a meadow; longing becomes light; first light comes down; they meet
SCENES_DEF.meadow = {
  mask: MASK_STD, mseed: 27,
  layers: [
    { w: 2300, h: 1300, par: .2, cy: 420, bake(g, w, h) { skyWash(g, w, h, { stops: [[0, P.night, .85], [.5, P.indigo, .65], [1, P.violet, .55]], bands: [P.ultra, P.violet, P.indigo], clouds: 3, cloudCols: [P.lilac, P.indigo], seed: 271, cy0: .5 }); liftEll(g, 1150, 480, 1100, 130, P.lilac, .35); moonPaint(g, 1500, 300, 64, 0); } },
    { w: 2300, h: 1300, par: .2, cy: 420, hidden: true, bake(g, w, h) { skyWash(g, w, h, { stops: [[0, P.indigo, .6], [.4, P.violet, .45], [.7, P.rose, .45], [1, P.gold, .6]], bands: [P.blush, P.peach, P.rose], clouds: 6, cloudCols: [P.blush, P.violet], seed: 272, cy0: .3 }); } },
    { w: 2500, h: 1300, par: .6, cy: 560, bake(g, w, h) {
      const p1 = [[-80, h + 80]]; for (let i = 0; i <= 10; i++) p1.push([-80 + i * (w + 160) / 10, 640 + Math.sin(i * .8) * 50]); p1.push([w + 80, h + 80]);
      wash(g, p1, hx('#6b6fa0'), { layers: 16, alpha: .07, amt: .12, seed: 273 });
    } },
    { w: 2600, h: 1300, par: 1, cy: 560, bake(g, w, h, S) {
      const p2 = [[-80, h + 80]]; for (let i = 0; i <= 12; i++) p2.push([-80 + i * (w + 160) / 12, 830 + Math.sin(i * 1.1 + 1) * 30]); p2.push([w + 80, h + 80]);
      wash(g, p2, hx('#6f8a68'), { layers: 18, alpha: .08, amt: .1, seed: 274, gran: .3 });
      const r = rng(275);
      for (let k = 0; k < 160; k++) { const x = r() * w, y = 850 + r() * 400; dab(g, ellP(x, y, 5 + r() * 4, 4 + r() * 3, 8), [P.cream, P.rose, P.gold, P.lilac][k % 4], .7, 276 + k, .1); }
      S.gy = 900;
    } },
  ],
  cam: lt => ({ x: keys(lt, [[0, -60], [14, 40]]), y: keys(lt, [[0, 40], [8, 0], [14, -30]]), z: keys(lt, [[0, 1.0], [14, 1.07]]) }),
  live(c, t, lt, S) {
    // night turns toward dawn at 等第一束晨光降落 (2:19)
    const dawn = ss(8.4, 12.5, lt);
    if (dawn > 0) { c.save(); c.globalAlpha = dawn; S.drawLayer(c, 1); c.restore(); }
    S.at(c, 0); starsLive(c, t, 2300, 1300, 200, 1 - dawn * .7, 51, .6); c.restore();
    S.at(c, 3);
    const gy = S.gy, fx = 1160, bx = 1300;
    // the beam of first light
    const beam = easeOut(ss(8.4, 10, lt));
    if (beam > 0) {
      const by = lerp(-200, gy, beam);
      c.save(); const gr = c.createLinearGradient(0, -200, 0, by); gr.addColorStop(0, rgba(P.warm, 0)); gr.addColorStop(.7, rgba(P.warm, .5)); gr.addColorStop(1, rgba(P.cream, .9));
      c.fillStyle = gr; c.beginPath(); c.moveTo(bx - 50, -200); c.lineTo(bx + 50, -200); c.lineTo(bx + 120, by); c.lineTo(bx - 120, by); c.fill(); c.restore();
      liftEll(c, bx, gy, 360, 50, P.warm, .8 * ss(.85, 1, beam));
    }
    // she sings her longing into light: motes rise, then pour into the beam
    const sing = ss(5.4, 6.8, lt), gather = easeIO(ss(8.4, 10.6, lt)), r = rng(111);
    for (let i = 0; i < 70; i++) {
      const d = r(), ph = r() * TAU, life = 4 + r() * 3, start = 5.4 + r() * 6, age = lt - start;
      if (age < 0) continue;
      const f = (age % life) / life, rx = fx + Math.sin(f * 5 + ph) * 70 * f + (d - .5) * 300 * f, ry = gy - 300 - f * 520;
      const tx = bx + Math.cos(lt * 1.5 + ph) * (30 + d * 50), ty = lerp(0, gy - 60, (d + lt * .08) % 1);
      const x = lerp(rx, tx, gather), y = lerp(ry, ty, gather), al = sing * (gather > 0 ? lerp(Math.sin(f * Math.PI), 1, gather) : Math.sin(f * Math.PI));
      lift(c, x, y, 16, d < .5 ? P.warm : P.cream, .9 * al);
    }
    // 我們不再害怕錯過: he comes through the grass, they take each other's hand
    const come = ss(10.8, 13, lt), hold = ss(12.6, 13.6, lt);
    drawPerson(c, person('girl', { wind: .9, turn: come > .3 ? 1 : 0, arm: hold > .5 ? 'reachR' : 'down' }), fx + hold * 30, gy + 20, .62);
    if (come > 0) {
      const step = come < 1 ? (Math.floor(lt * 3) % 2 ? .7 : -.7) : 0;
      drawPerson(c, person('boy', { wind: .9, walk: step, arm: hold > .5 ? 'reachL' : 'down' }), lerp(1900, fx + 150, easeOut(come)) - hold * 30, gy + 20, .64, { alpha: ss(10.6, 11.4, lt) });
    }
    // tall grass in the foreground
    c.save(); c.lineCap = 'round';
    const r2 = rng(131);
    for (let i = 0; i < 220; i++) { const x = r2() * 2600, hh = 60 + r2() * 110, sway = Math.sin(t * 1.2 + x * .01) * 12 + 8; c.strokeStyle = rgba(r2() < .5 ? hx('#4f6e5e') : hx('#6c8f6a'), .75); c.lineWidth = 2 + r2() * 2; c.beginPath(); c.moveTo(x, 1300); c.quadraticCurveTo(x + sway * .3, 1300 - hh * .6, x + sway, 1300 - hh - 140); c.stroke(); }
    c.restore();
    c.restore();
    petals(c, t, { n: 14, seed: 133, wind: .7, a: .7 });
  },
};

// 2:24 the breeze scatters heavy clouds; the sky clears over the city
SCENES_DEF.scatter = {
  mask: MASK_STD, mseed: 29,
  layers: [
    { w: 2300, h: 1300, par: .2, cy: 420, bake(g, w, h) { skyWash(g, w, h, { stops: [[0, P.night, .8], [.5, P.indigo, .6], [1, P.violet, .55]], bands: [P.ultra, P.violet], seed: 281 }); moonPaint(g, 1150, 360, 60, 0); } },
    { w: 2500, h: 1100, par: .55, cy: 620, bake(g, w, h, S) {
      S.c1 = cityRow(g, -20, w + 20, 800, { hMin: 120, hMax: 330, cols: [P.slate, P.indigo, P.violet], seed: 282, alpha: .08, winP: .55, tanks: .5 });
      S.c2 = cityRow(g, -20, w + 20, 950, { hMin: 160, hMax: 380, cols: [P.indigo, P.slate], seed: 283, alpha: .09, winP: .6, tanks: .5 });
    } },
  ],
  cam: lt => ({ x: 0, y: keys(lt, [[0, 60], [8, -40]]), z: keys(lt, [[0, 1.0], [8, 1.05]]) }),
  bakeExtra(S) { S.clouds = [0, 1, 2, 3].map(i => { const cv = mk(1000, 420), g = cv.getContext('2d'); cloud(g, 500, 210, 380, [hx('#9a96b0'), hx('#5f5f80')], 290 + i); cloud(g, 460, 240, 300, [hx('#8a86a6'), hx('#55557a')], 296 + i); return cv; }); },
  live(c, t, lt, S) {
    const clear = ss(.8, 5.6, lt);
    S.at(c, 0); starsLive(c, t, 2300, 1300, 180, clear, 61, .6); c.restore();
    // heavy clouds pushed apart
    const r = rng(131);
    for (let i = 0; i < 9; i++) {
      const bx = 200 + r() * 1500, by = 120 + r() * 420, dir = bx < W / 2 ? -1 : 1, s = 1 + r() * .6;
      const cv = S.clouds[i % 4], off = dir * easeIn(clear) * (700 + r() * 600);
      c.save(); c.globalAlpha = .95 * (1 - clear * .65); c.drawImage(cv, bx - 500 * s + off, by - 210 * s, 1000 * s, 420 * s); c.restore();
    }
    S.at(c, 1); litWindows(c, S.c1, .3 + clear * .6, t); litWindows(c, S.c2, .3 + clear * .6, t); c.restore();
    for (let i = 0; i < 6; i++) { const r2 = rng(140 + i), st = .2 + i * .45, age = lt - st; if (age < 0 || age > 3) continue; windStroke(c, t, lerp(-300, W + 900, age / 3), { y: 150 + r2() * 450, amp: 40, len: 1000, a: .6 * (1 - age / 3), width: 18, ph: r2() * 9 }); }
    petals(c, t, { n: 40, seed: 141, wind: 1.6 });
  },
};

// 2:31 under the streetlamp, they find each other; then the camera rises into the sky
SCENES_DEF.meet = {
  mask: MASK_STD, mseed: 31,
  layers: [
    { w: 2300, h: 2100, par: .35, cy: 0, bake(g, w, h) { skyWash(g, w, h, { stops: [[0, hx('#1d2348'), .85], [.5, P.night, .75], [.85, P.indigo, .6], [1, P.violet, .55]], bands: [P.ultra, P.violet, P.indigo], clouds: 5, cloudCols: [P.lilac, P.indigo], seed: 311, cy0: .55 }); moonPaint(g, 1500, 520, 60, .3); } },
    { w: 2500, h: 1200, par: .6, cy: 640, bake(g, w, h, S) { S.city = cityRow(g, -20, w + 20, 900, { hMin: 120, hMax: 380, cols: [P.slate, P.indigo, P.violet], seed: 312, alpha: .08, winP: .55, tanks: .5 }); } },
    { w: 2600, h: 1400, par: 1, cy: 640, bake(g, w, h, S) {
      const gy = 1010; S.gy = gy;
      wash(g, rectP(-80, gy, w + 160, 500, .3), hx('#6f7593'), { layers: 16, alpha: .07, amt: .12, seed: 313, gran: .25 });
      ink(g, [[-60, gy + 10], [w + 60, gy + 10]], { w: 1.5, a: .5, seed: 314 });
      foliage(g, 400, gy - 260, 200, [P.sap, hx('#4f6e5e'), P.teal], 315, 16); ink(g, [[400, gy], [400, gy - 160]], { w: 6, a: .8, seed: 316 });
      foliage(g, 2200, gy - 240, 180, [P.sap, hx('#4f6e5e'), P.teal], 317, 16); ink(g, [[2200, gy], [2200, gy - 150]], { w: 6, a: .8, seed: 318 });
      // bench
      dab(g, rectP(1500, gy - 70, 240, 18), P.sienna, .9, 319); dab(g, rectP(1500, gy - 120, 240, 16), P.sienna, .9, 320);
      ink(g, [[1510, gy], [1510, gy - 70]], { w: 2, a: .7, seed: 321 }); ink(g, [[1730, gy], [1730, gy - 70]], { w: 2, a: .7, seed: 322 });
      S.lamp = lampPost(g, 1280, gy + 20, 520, 323);
      wire(g, -60, 120, 1300, 200, 60, 324, .4);
    } },
  ],
  cam: lt => ({ x: 0, y: keys(lt, [[0, 0], [6.8, 10], [12.6, -820]]), z: keys(lt, [[0, 1.02], [6.8, 1.05], [12.6, 1.0]]) }),
  live(c, t, lt, S) {
    S.at(c, 0); starsLive(c, t, 2300, 2100, 260, 1, 71, .7); c.restore();
    S.at(c, 1); litWindows(c, S.city, .8, t); c.restore();
    S.at(c, 2);
    const gy = S.gy, [lx, ly] = S.lamp;
    c.save(); c.fillStyle = rgba(P.warm, .45); c.beginPath(); c.moveTo(lx - 16, ly); c.lineTo(lx + 16, ly); c.lineTo(lx + 260, gy + 30); c.lineTo(lx - 260, gy + 30); c.fill(); c.restore();
    lift(c, lx, ly, 300, P.warm, .85); lift(c, lx, ly, 30, P.cream, 1); liftEll(c, lx, gy + 20, 300, 50, P.warm, .7);
    // she waits under the lamp; he follows her gaze and walks in
    const walk = ss(0, 3.6, lt), hold = ss(3.4, 4.6, lt), step = walk > 0 && walk < 1 ? (Math.floor(lt * 3.2) % 2 ? .7 : -.7) : 0;
    drawPerson(c, person('girl', { arm: hold > .5 ? 'reachL' : 'down', turn: 0, wind: .6 }), lx + 60 - hold * 22, gy + 20, .66, { flip: -1 });
    drawPerson(c, person('boy', { walk: step, arm: hold > .5 ? 'reachR' : 'down', wind: .6 }), lerp(300, lx - 60, easeOut(walk)) + hold * 22, gy + 20, .68, { flip: -1 });
    if (hold > .5) lift(c, lx, gy - 130, 80, P.warm, (hold - .5) * 1.6);
    c.restore();
    petals(c, t, { n: 30, seed: 151, wind: 1 });
  },
};

// 2:44 outro: a quiet sky; birds; the painting fades back into the paper
SCENES_DEF.outro = {
  mask: MASK_PAGE, mseed: 33,
  layers: [
    { w: 1500, h: 720, par: .3, cy: 337, bake(g, w, h) { skyWash(g, w, h, { stops: [[0, P.indigo, .6], [.45, P.violet, .5], [.8, P.rose, .5], [1, P.peach, .6]], bands: [P.lilac, P.blush, P.rose], clouds: 6, cloudCols: [P.blush, P.violet], seed: 331, cs: .8 }); moonPaint(g, 1050, 200, 40, .3); } },
    { w: 1600, h: 720, par: .6, cy: 337, bake(g, w, h, S) {
      wash(g, [[-50, 540], [400, 480], [900, 520], [1300, 470], [1650, 510], [1650, 760], [-50, 760]], P.lilac, { layers: 14, alpha: .05, amt: .3, seed: 332 });
      S.wins = cityRow(g, -20, w + 20, 740, { hMin: 100, hMax: 250, cols: [P.slate, P.violet, P.grey], seed: 333, alpha: .07, winP: .5 });
    } },
  ],
  cam: lt => ({ x: lt * 4, y: lt * 2, z: 1.06 - lt * .004 }),
  live(c, t, lt, S) {
    S.at(c, 0); starsLive(c, t, 1500, 720, 60, .8, 81, .5); c.restore();
    S.at(c, 1); litWindows(c, S.wins, .7, t); c.restore();
    // a few birds crossing
    c.save(); c.strokeStyle = rgba(P.ink, .7); c.lineWidth = 2; c.lineCap = 'round';
    for (let i = 0; i < 5; i++) { const x = lerp(260, 1700, ((lt * .05 + i * .09) % 1)), y = 200 + i * 26 + Math.sin(lt + i) * 8, fl = Math.sin(t * 6 + i) * 6; c.beginPath(); c.moveTo(x - 14, y - fl); c.quadraticCurveTo(x - 6, y - 4, x, y); c.quadraticCurveTo(x + 6, y - 4, x + 14, y - fl); c.stroke(); }
    c.restore();
  },
};

// beat helpers for live elements
function downbeatsIn(t, span) {
  const B = (window.ENV && window.ENV.beats) || [], d = (window.ENV && window.ENV.down) || 0, out = [];
  for (let i = d; i < B.length; i += 4) { if (B[i] > t) break; if (t - B[i] < span) out.push(B[i]); }
  return out;
}
function env(t, key = 'level') {
  const e = window.ENV; if (!e) return .5;
  const a = e[key], f = t * e.fps, i = Math.floor(f);
  if (i < 0 || i >= a.length - 1) return 0;
  return lerp(a[i], a[i + 1], f - i);
}
