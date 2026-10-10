'use strict';
// CLAWD'S DAY - scenes, part 2: lunch -> beach -> sunset concert -> campfire -> bedtime -> good night.

// ================================================================ LUNCH
const PIZZA = { rx: 44, ry: 12, wedges: null };
function buildPizza() {
  const { rx, ry } = PIZZA, w = rx * 2 + 3, h = ry * 2 + 3, cx = rx + 1, cy = ry + 1;
  const pep = [[-.5, -.2], [.1, -.45], [.55, -.1], [-.15, .35], [.35, .45], [-.65, .3], [.05, .05], [.7, .4], [-.35, -.6]];
  PIZZA.wedges = [];
  for (let k = 0; k < 12; k++) {
    const c = mk(w, h), pg = c.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const nx = (x - cx) / rx, ny = (y - cy) / ry, d = Math.hypot(nx, ny);
      if (d > 1) continue;
      const an = (Math.atan2(ny, nx) + Math.PI * 2) % (Math.PI * 2);
      if (Math.floor(an / (Math.PI / 6)) !== k) continue;
      let col = d > .86 ? '#d99a4a' : d > .8 ? '#e0703a' : '#ffd66b';
      if (d <= .8) for (const [px, py] of pep) if (Math.hypot(nx - px, (ny - py) * 1.1) < .13) col = '#c8452f';
      if (d <= .8 && rnd(x, y) < .04) col = '#4a9a3a';
      if (d > .86 && y < cy && d > .95) col = '#f0b866';
      pg.fillStyle = col; pg.fillRect(x, y, 1, 1);
    }
    PIZZA.wedges.push(c);
  }
}
function drawPizza(x, y, eaten) {
  if (!PIZZA.wedges) buildPizza();
  for (let k = 0; k < 12; k++) if (!eaten[k]) g.drawImage(PIZZA.wedges[k], Math.round(x) - PIZZA.rx - 1, Math.round(y) - PIZZA.ry - 1);
}
function butterfly(x, y, a, c = '#ff9ccc') {
  const f = Math.floor(a * 10) % 2;
  R(x, y, 1, 3, '#3a2a1a');
  if (f) { R(x - 3, y - 1, 3, 3, c); R(x + 1, y - 1, 3, 3, c); } else { R(x - 2, y, 2, 2, c); R(x + 1, y, 2, 2, c); }
}
scene({
  name: 'lunch', dur: 16, px: 3, h: [12.2, 13.2], cap: 'PIZZA PICNIC',
  build(S) {
    S.cue(0, 'picnic');
    S.ev(0, 'birds', .4, { d: 16 });
    for (let t = .2; t < 4.2; t += .5) S.ev(t, 'step', .35);
    S.ev(3.4, 'cheer', .7, { d: 1.6 }); S.ev(5.4, 'thud', .6); S.ev(5.5, 'cheer', .8, { d: 1.2 });
    S.ev(13.4, 'bonk', .8); S.ev(13.45, 'excl', .5); S.ev(14.6, 'chomp', .6); S.ev(3, 'quack', .5); S.ev(9.5, 'quack', .5);
    const ring = [];
    for (let i = 0; i < 12; i++) { const th = i * Math.PI / 6 + .26; ring.push({ th, x: 320 + 114 * Math.cos(th), y: 296 + 34 * Math.sin(th) }); }
    S.ring = ring;
    const order = [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7];
    S.te = []; order.forEach((i, n) => { S.te[i] = 6.0 + n * .42; S.ev(6.35 + n * .42, 'chomp', .45); });
    const cast = [];
    const offs = [-35, -21, -7, 7, 21, 35];
    for (let i = 0; i < 12; i++) {
      const R0 = ring[i], face = Math.cos(R0.th) > 0 ? -1 : 1, back = Math.sin(R0.th) > .25;
      const after = [['wait', S.te[i] + .3 - 6.0, { pose: 'sit', face, eyes: back ? 'none' : 'look' }],
        ['wait', 2.2, { pose: 'eat', hold: 'slice', face, rate: 4, eyes: back ? 'none' : 'happy', bubble: back ? null : 'heart', bubbleAt: .6 }]];
      const coma = i % 3 === 0 ? { pose: 'sleep', face, zzz: 1, eyes: back ? 'none' : undefined } : { pose: 'sit', face, blush: 1, eyes: back ? 'none' : 'happy', bubble: i === 4 ? 'heart' : null };
      if (i % 2 === 0) { // carriers
        const j = i / 2, dx = offs[j];
        cast.push(actor(-60 + dx, 300 + (j % 2) * 4, { acc: pick(['cap', 'bow', 'band', null, 'cap2', 'flower'], j, 1), back }, [
          ['walk', 4.2, { x: 320 + dx, y: 300 + (j % 2) * 4, pose: 'carry', rate: 7, eyes: 'closed' }], ['wait', .6, { pose: 'carry', eyes: 'happy' }],
          ['walk', 1.2, { x: R0.x, y: R0.y }], ...after.map((s, k) => k === 0 ? ['wait', S.te[i] + .3 - 6.0, s[2]] : s), ['wait', 20, coma]]));
      } else {
        cast.push(actor(R0.x, R0.y, { acc: pick(['bow', null, 'flower', 'sunhat', 'cap', 'beanie'], i, 2), back }, [
          ['wait', 3.3, { pose: 'sit', face, eyes: back ? 'none' : 'look' }], ['wait', 2.7, { pose: 'cheer', face, eyes: back ? 'none' : 'happy', bubble: back ? null : 'pizza', bubbleAt: .2, bubbleDur: 1.5 }],
          ...after, ['wait', 20, coma]]));
      }
    }
    // reader under the tree
    cast.push(actor(102, 304, { acc: 'glasses' }, [['wait', 13.4, { pose: 'sithold', hold: 'book', rate: .6, face: 1 }], ['wait', 1.0, { pose: 'sit', eyes: 'x', bubble: 'excl', face: 1 }], ['wait', 5, { pose: 'eat', hold: 'apple', rate: 3, face: 1 }]]));
    // frisbee pair
    S.fr = [actor(160, 238, { acc: 'cap2' }, [['wait', 99, { pose: 'stand', face: 1 }]]), actor(470, 238, { acc: 'band' }, [['wait', 99, { pose: 'stand', face: -1 }]])];
    // butterfly chaser
    S.bf = t => ({ x: 470 + 46 * Math.sin(1.1 * t), y: 236 + 14 * Math.sin(2.2 * t + 1) });
    cast.push(actor(0, 0, { acc: 'flower' }, [['fn', 99, { fn: (k, la, st, A, a) => { const p = S.bf(a - .7), q = S.bf(a - .75); const hop = Math.abs(Math.sin(a * 5)) * 6; return { x: p.x, y: 270 + (p.y - 236) * .5 - hop, zy: 270, pose: hop > 3 ? 'jump' : 'stand', face: p.x > q.x ? 1 : -1, eyes: 'up' }; } }]]));
    // duck floatie
    S.floatie = actor(570, 294, { acc: 'shades' }, [['wait', 99, { pose: 'sit', face: -1 }]]);
    S.cast = cast;
  },
  draw(a, S) {
    const h = lerp(12.2, 13.2, a / 16);
    drawSky(h, 150);
    clouds(h, 6, 15, 90, 5, 21);
    hills(138, 7, .013, 6, '#9bd1a6'); for (let i = 0; i < 9; i++) tree(30 + i * 75 + (i % 2) * 20, 152, .8, '#5fb86a', '#46a65a');
    R(0, 148, LW, LH - 148, '#7ccc5c'); for (let y = 158; y < LH; y += 22) R(0, y, LW, 11, '#84d264');
    grassTufts(150, LH, 90, 22, '#5fae45');
    for (let i = 0; i < 20; i++) { const x = rnd(i, 23) * LW, y = 155 + rnd(i, 24) * 200; R(x, y, 1, 1, '#ffffff'); R(x - 1, y + 1, 3, 1, i % 2 ? '#ffe14d' : '#ff9ccc'); }
    // pond
    disc(566, 292, 72, '#3f96d0', .27); disc(566, 290, 66, '#58b0e6', .24);
    for (let i = 0; i < 4; i++) { const k = fr(a * .4 + i / 4); R(566 - 20 * k - 10, 292 + i * 3 - 4, 20 * k + 6, 1, '#a9dcff'); }
    // ducks
    for (let i = 0; i < 2; i++) { const dx = 520 + i * 70 + Math.sin(a * .6 + i * 2) * 14, dy = 288 + i * 6 + Math.round(Math.sin(a * 2 + i)); R(dx, dy - 3, 7, 3, '#ffffff'); R(dx + 5, dy - 6, 3, 3, '#ffffff'); R(dx + 8, dy - 5, 2, 1, '#ffb21a'); R(dx + 6, dy - 5, 1, 1, CL.K); }
    // tree
    tree(84, 300, 2.3);
    // blanket
    for (let y = 266; y < 326; y++) {
      const hw = 92 + (y - 266) * .55, left = 320 - hw, cw = hw * 2 / 12, row = Math.floor((y - 266) / 7);
      for (let i = 0; i < 12; i++) R(left + i * cw, y, Math.ceil(cw), 1, (i + row) % 2 ? '#ffffff' : '#e8403b');
    }
    // the giant pizza
    const eaten = S.te.map(t => a > t);
    let px = 320, py = 294;
    if (a < 4.2) { px = lerp(-60, 320, a / 4.2); py = 278 + (Math.floor(a * 7) % 2); }
    else if (a < 4.8) py = 278;
    else if (a < 5.4) py = lerp(278, 294, E.io((a - 4.8) / .6));
    const extra = [{ y: a < 4.8 ? 310 : 260, draw: () => drawPizza(px, py, eaten) }];
    // slices flying to their eaters
    S.te.forEach((t, i) => {
      if (a > t && a < t + .3) {
        const k = (a - t) / .3, R0 = S.ring[i], sx = lerp(320 + Math.cos(R0.th) * 30, R0.x, k), sy = lerp(294 + Math.sin(R0.th) * 8, R0.y - 10, k) - Math.sin(Math.PI * k) * 10;
        extra.push({ y: 400, draw: () => { R(sx - 2, sy, 5, 1, '#d99a4a'); R(sx - 1, sy + 1, 3, 1, '#ffd66b'); R(sx, sy + 2, 1, 1, '#ffd66b'); } });
      }
    });
    // butterfly
    const b = S.bf(a); extra.push({ y: 400, draw: () => butterfly(b.x, b.y, a) });
    // frisbee
    const P = 1.4, n = Math.floor(a / P), k = fr(a / P), ltr = n % 2 === 0;
    const fx = ltr ? lerp(170, 462, k) : lerp(462, 170, k), fy = 226 - Math.sin(Math.PI * k) * 34;
    extra.push({ y: 400, draw: () => { R(fx - 3, fy, 7, 1, '#ff5fa2'); R(fx - 2, fy - 1, 5, 1, '#ff8cc0'); } });
    S.fr.forEach((A, i) => {
      const catching = (i === 0 && !ltr && k > .85) || (i === 1 && ltr && k > .85) || (k < .1 && ((i === 0) === ltr));
      extra.push({ y: A.y, draw: () => C(A.x, A.y - (catching ? 5 : 0), { pose: catching ? 'jump' : 'stand', f: Math.floor(a * 2.6 + i) % 2, acc: A.o.acc, face: i ? -1 : 1, eyes: 'look' }) });
    });
    // apple falling on the reader
    if (a > 12.9 && a < 13.4) { const k2 = (a - 12.9) / .5; R(104, lerp(250, 285, k2 * k2), 3, 3, '#e8403b'); }
    if (a >= 13.4 && a < 14.4) { const k2 = (a - 13.4); R(108 + k2 * 14, 300 - Math.abs(Math.sin(k2 * 6)) * 4 * (1 - k2), 3, 3, '#e8403b'); }
    drawCast(S.cast, a, extra);
    // floatie
    const fl = actorState(S.floatie, a), fb = Math.round(Math.sin(a * 2));
    C(fl.x, fl.y + fb, fl); R(fl.x - 11, fl.y - 3 + fb, 22, 4, '#ffd23f'); R(fl.x - 11, fl.y - 3 + fb, 22, 1, '#fff08a'); R(fl.x + 9, fl.y - 8 + fb, 4, 5, '#ffd23f'); R(fl.x + 12, fl.y - 7 + fb, 2, 1, '#ff9b2f');
    for (let i = 0; i < 3; i++) bird(((a * 25 + i * 230) % 720) - 40, 30 + i * 14, a, i, true);
    finish();
  },
});

// ================================================================ BEACH
const SEA = '#4aa8e2';
function swimmer(x, y, a, o, wl) {
  C(x, y, o);
  g.globalAlpha = .88; R(x - 12, wl, 24, y - wl + 1, SEA); g.globalAlpha = 1;
  R(x - 8, wl, 16, 1, '#d8f2ff');
}
scene({
  name: 'beach', dur: 24, px: 3, h: [14.5, 17.0], cap: 'BEACH DAY',
  build(S) {
    S.cue(0, 'beach');
    S.ev(0, 'waves', .55, { d: 24 });
    [2, 9, 16, 21].forEach(t => S.ev(t, 'gull', .4));
    // volleyball
    S.L = [[40, 300], [66, 312], [92, 300]]; S.Rt = [[150, 300], [176, 312], [202, 300]];
    S.hits = []; for (let n = 0; n < 19; n++) { const t = .6 + n * 1.25; S.hits.push(t); S.ev(t, 'pong', .6); }
    CLAWDS += 6;
    // pyramid
    const slots = []; [4, 3, 2, 1].forEach((cnt, r) => { for (let k = 0; k < cnt; k++) slots.push({ x: 330 + (k - (cnt - 1) / 2) * 17, y: 316 - r * 11, r }); });
    S.slots = slots;
    const cast = [];
    slots.forEach((sl, i) => {
      const wx = 410 + (i % 5) * 14, wy = 330 + Math.floor(i / 5) * 12, tb = 3.0 + i * .55;
      S.ev(tb + .45, 'stack', .5, { p: i });
      const lx = 250 + rnd(i, 3) * 170, ly = 300 + rnd(i, 4) * 46;
      const sea = { x: 150 + i * 42, y: 226 + (i % 3) * 3 };
      const top = i === 9;
      cast.push(actor(wx, wy, { acc: pick(['cap', 'band', 'sunhat', null, 'shades', 'bow', 'goggles', 'cap2', 'flower', 'crown'], i, 5), seed: i * 3.3 }, [
        ['wait', tb, { pose: 'cheer', face: -1, rate: 4 }], ['hop', .45, { x: sl.x, y: sl.y, h: 20 }],
        ['fn', 13.0 - tb - .45, { fn: (k, la, st, A, a) => {
          const wob = a > 10.5 ? Math.round(clamp(Math.sin((a - 10.5) * 11) * sl.r * (a - 10.5) * .6, -4, 4)) : 0;
          if (top) return { x: sl.x + wob, y: sl.y, zy: sl.y + 100, pose: a > 8.4 ? 'cheer' : 'stand', hold: a > 8.4 ? 'flag' : null, ic: '#ff5fa2', bubble: a > 10.6 ? 'excl' : null, eyes: a > 10.6 ? 'wide' : undefined };
          return { x: sl.x + wob, y: sl.y, zy: sl.y + 100 - sl.r * 30 + sl.r * 60, pose: 'stand', eyes: sl.r === 0 ? 'closed' : a > 10.6 ? 'wide' : 'happy', bubble: sl.r === 0 && a > 9 ? 'sweat' : null };
        } }],
        ['hop', .6, { x: lx, y: ly, h: 14, pose: 'splat', eyes: 'x' }],
        ['wait', 1.4, { pose: 'splat', eyes: 'happy' }],
        ['wait', 2.5, { pose: 'cheer', bubble: pick(['heart', 'note', 'star'], i, 6), bubbleAt: .2 + rnd(i, 7) }],
        ['run', 1.5, { x: sea.x, y: 240 }], ['hop', .4, { x: sea.x, y: sea.y + 6, h: 10 }],
        ['fn', 9, { fn: (k, la, st, A, a) => ({ x: sea.x + Math.sin(a * .7 + i) * 8, y: sea.y + 6 + Math.round(Math.sin(a * 2.5 + i)), pose: 'swim', swim: 1, f: Math.floor(a * 3 + i) % 2, eyes: 'happy' }) }],
      ]));
    });
    S.ev(10.5, 'creak', .7, { d: 2.5 }); S.ev(13.0, 'tumble', 1); S.ev(14.6, 'laugh', .7); S.ev(17.4, 'whoosh', .4); for (let i = 0; i < 6; i++) S.ev(19.0 + i * .08, 'splash', .5);
    S.ev(12.2, 'tada', .5);
    // swimmers + surfer + kite + sunbather + castle builders
    S.swim = [[250, 214], [300, 220], [420, 212], [470, 218]]; CLAWDS += 4 + 1 + 1 + 1 + 3;
    S.cast = cast;
  },
  draw(a, S) {
    const h = lerp(14.5, 17.0, a / 24);
    drawSky(h, 162);
    clouds(h, 5, 20, 100, 5, 31);
    bands(160, 232, '#2a7fcf', '#58b9ea', 8);
    for (let r = 0; r < 7; r++) { const y = 166 + r * 9, sp = (r % 2 ? 1 : -1) * (6 + r * 2); for (let i = 0; i < 14; i++) R(((i * 50 + a * sp + r * 17) % 700 + 700) % 700 - 30, y, 6 + r, 1, '#bfe8ff'); }
    // surfer
    const surf = (a > 2 && a < 10) ? { x: -40 + (a - 2) * 85, f: 1 } : (a > 12 && a < 20) ? { x: 680 - (a - 12) * 90, f: -1 } : null;
    if (surf) { const y = 198 + Math.round(Math.sin(a * 3) * 2); disc(surf.x - surf.f * 14, y + 2, 14, '#e6f6ff', .3); C(surf.x, y, { pose: 'surf', acc: 'shades', face: surf.f }); R(surf.x - 11, y, 22, 2, '#ffffff'); R(surf.x - 3, y, 6, 2, '#e8403b'); }
    // shore
    const sy = 232 + Math.round(Math.sin(a * 1.2) * 3);
    R(0, 232, LW, LH - 232, '#f2d79a'); R(0, 232, LW, sy - 228, '#d9bd7e'); R(0, sy, LW, 2, '#ffffff');
    for (let i = 0; i < 90; i++) R(rnd(i, 32) * LW, 240 + rnd(i, 33) * 120, 1, 1, '#d9bd7e');
    // swimmers in the sea
    S.swim.forEach(([x, y], i) => swimmer(x + Math.sin(a * .8 + i) * 10, y + Math.round(Math.sin(a * 2 + i)), a, { pose: 'swim', f: Math.floor(a * 3 + i) % 2, acc: 'goggles', eyes: 'happy' }, y - 5));
    // umbrella + sunbather
    R(229, 300, 2, 46, '#e8e2d8');
    for (let r = 0; r < 12; r++) { const w = Math.round(Math.sqrt(1 - (r / 12) ** 2) * 26); for (let s = -w; s < w; s += 6) R(230 + s, 300 - (11 - r) - 1, Math.min(6, w - s), 1, (Math.floor((s + 26) / 6) % 2) ? '#ffffff' : '#ff5f5f'); }
    R(236, 344, 34, 4, '#4fc3ff'); R(236, 344, 34, 1, '#9fe0ff');
    C(254, 347, { pose: 'lie', acc: ['sunhat', 'shades'], face: -1 }); zzz(250, 334, a, 3);
    // sandcastle
    const st = clamp(Math.floor((a - 1) / 1.6), -1, 7), cc = '#e6c27a', cd = '#c9a45a';
    if (st >= 0) disc(540, 323, 22, cd, .3);
    if (st >= 1) { R(522, 306, 36, 17, cc); R(522, 306, 36, 1, '#f3d79a'); }
    if (st >= 2) R(516, 292, 10, 31, cc);
    if (st >= 3) R(554, 292, 10, 31, cc);
    if (st >= 4) R(532, 284, 16, 22, cc);
    if (st >= 5) for (const tx of [516, 520, 524, 554, 558, 562, 532, 536, 540, 544]) R(tx, tx < 530 || tx > 550 ? 290 : 282, 2, 2, cc);
    if (st >= 6) { R(536, 314, 8, 9, '#8a6a3a'); R(519, 298, 3, 4, '#8a6a3a'); R(558, 298, 3, 4, '#8a6a3a'); }
    if (st >= 7) { R(540, 272, 1, 10, '#6b4a2a'); R(541, 272, 6, 4, '#e8403b'); }
    const cast2 = [
      { x: 504, y: 326, f: 1, hold: 'shovel', acc: 'cap' }, { x: 578, y: 326, f: -1, hold: 'bucket', acc: 'bow' }, { x: 540, y: 340, f: 1, acc: 'sunhat' },
    ];
    const extra = [];
    cast2.forEach((b, i) => extra.push({ y: b.y, draw: () => C(b.x, b.y, a > 12.2 && a < 14.5 ? { pose: 'cheer', f: Math.floor(a * 5 + i) % 2, acc: b.acc, face: b.f } : { pose: 'pat', f: Math.floor(a * 3 + i) % 2, hold: b.hold, acc: b.acc, face: b.f }) }));
    // volleyball
    R(119, 268, 3, 36, '#6b4a2a'); R(116, 268, 9, 2, '#ffffff'); for (let y = 271; y < 284; y += 3) R(118, y, 5, 1, '#e8e2d8');
    const hi = S.hits.findIndex((t, i) => a >= t && (i === S.hits.length - 1 || a < S.hits[i + 1]));
    const who = n => n % 2 === 0 ? S.L[(n * 2) % 3] : S.Rt[(n * 2) % 3];
    [...S.L, ...S.Rt].forEach(([x, y], i) => {
      const left = i < 3;
      let pose = 'stand', dy = 0;
      for (let n = 0; n < S.hits.length; n++) { const p = who(n); if (p[0] === x && p[1] === y && Math.abs(a - S.hits[n]) < .22) { pose = 'jump'; dy = -Math.round(Math.cos((a - S.hits[n]) / .22 * Math.PI / 2) * 8); } }
      extra.push({ y, draw: () => C(x, y + dy, { pose, f: Math.floor(a * 2.6 + i) % 2, face: left ? 1 : -1, eyes: 'up', acc: left ? 'cap' : 'cap2' }) });
    });
    if (hi >= 0) {
      const k = clamp((a - S.hits[hi]) / 1.25), p = who(hi), q = who(hi + 1);
      const bx = lerp(p[0] + (hi % 2 ? -4 : 4), q[0], k), by = lerp(p[1] - 22, q[1] - 22, k) - Math.sin(Math.PI * k) * 70;
      extra.push({ y: 500, draw: () => { disc(bx, by, 3, '#ffffff'); R(bx - 3, by, 7, 1, '#ffb21a'); R(bx, by - 3, 1, 7, '#4fc3ff'); } });
    }
    // kite
    const kx = 560 + Math.sin(a * .9) * 18, ky = 50 + Math.cos(a * 1.3) * 8;
    for (let i = 0; i < 40; i++) { const k = i / 40; if (i % 2) R(lerp(kx, 603, k), lerp(ky + 8, 290, k) + Math.sin(k * 3) * 6, 1, 1, '#ffffff'); }
    for (let r = 0; r < 12; r++) { const w = r < 5 ? r : 11 - r; R(kx - w, ky - 5 + r, w, 1, '#ff5fa2'); R(kx, ky - 5 + r, w + 1, 1, '#ffe14d'); }
    for (let i = 0; i < 4; i++) R(kx + Math.sin(a * 3 + i) * 3, ky + 8 + i * 4, 3, 1, i % 2 ? '#4fc3ff' : '#ff5fa2');
    extra.push({ y: 300, draw: () => C(612, 300, { pose: 'hold', f: Math.floor(a * 2) % 2, face: -1, acc: 'beanie', eyes: 'up' }) });
    // crab
    const crx = 320 + Math.sin(a * .45) * 260, cry = 354;
    extra.push({ y: cry, draw: () => { R(crx - 4, cry - 3, 8, 3, '#e8403b'); R(crx - 6, cry - 5 - (Math.floor(a * 6) % 2), 2, 2, '#e8403b'); R(crx + 4, cry - 5 - (Math.floor(a * 6 + 1) % 2), 2, 2, '#e8403b'); R(crx - 2, cry - 4, 1, 1, CL.K); R(crx + 1, cry - 4, 1, 1, CL.K); for (let i = 0; i < 3; i++) R(crx - 4 + i * 3, cry, 1, 1, '#b8302b'); } });
    // the pyramid crew (swimmers get a water overlay)
    const items = [];
    for (const A of S.cast) { const s = actorState(A, a); if (s) items.push({ y: s.zy ?? s.y, st: s }); }
    for (const e of extra) items.push(e);
    items.sort((p, q) => p.y - q.y);
    for (const it of items) {
      if (it.draw) it.draw();
      else if (it.st.swim) swimmer(it.st.x, it.st.y, a, it.st, it.st.y - 6);
      else drawState(it.st, a);
    }
    if (a > 19.0 && a < 20.2) for (let i = 0; i < 10; i++) { const k = (a - 19.0) / 1.2; for (let j = 0; j < 4; j++) R(150 + i * 42 + (j - 1.5) * 4 * (1 + k * 2), 226 - Math.sin(Math.PI * k) * (8 + j * 3), 1, 2, '#ffffff'); }
    for (let i = 0; i < 3; i++) { const x = ((a * 22 + i * 240) % 720) - 40, y = 40 + i * 18 + Math.sin(a + i) * 5; R(x - 4, y, 4, 1, '#ffffff'); R(x + 1, y, 4, 1, '#ffffff'); R(x, y + 1, 1, 1, '#ffffff'); R(x - 5, y - 1, 1, 1, '#ffffff'); R(x + 5, y - 1, 1, 1, '#ffffff'); }
    finish();
  },
});

// ================================================================ SUNSET CONCERT
const FW_COLS = ['#ff5fa2', '#ffe14d', '#4fc3ff', '#b6ff5a', '#ff9b2f', '#ffffff', '#b07cff'];
scene({
  name: 'sunset', dur: 20, px: 3, h: [18.2, 19.9], cap: 'CLAWDSTOCK!',
  build(S) {
    S.cue(.2, 'party');
    S.ev(0, 'crowd', .3, { d: 20 }); S.ev(3.0, 'cheer', .8, { d: 2 }); S.ev(8.5, 'cheer', .6, { d: 1.5 }); S.ev(14.0, 'cheer', .9, { d: 3 });
    S.crowd = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 15; c++) {
      const i = r * 15 + c; CLAWDS++;
      S.crowd.push({ r, c, x: 22 + c * 42 + (r % 2) * 21 + Math.round(rnd(i, 1) * 6), y: 226 + r * 27, acc: pick(['party', 'party2', null, 'bow', 'cap', 'beanie', 'crown', 'phones'], i, 2), glow: rnd(i, 3) < .35 ? FW_COLS[i % FW_COLS.length] : null, off: rnd(i, 4) * .25, sd: i });
    }
    CLAWDS += 4 + 1 + 9;
    S.fw = [];
    const ts = [14.0, 14.6, 15.1, 15.5, 16.0, 16.4, 16.8, 17.1, 17.5, 17.9, 18.2, 18.6, 19.0, 19.3];
    ts.forEach((t, i) => { const fwk = { t, x: 70 + rnd(i, 5) * 500, y: 30 + rnd(i, 6) * 80, c: FW_COLS[i % FW_COLS.length], c2: FW_COLS[(i + 3) % FW_COLS.length] }; S.fw.push(fwk); S.ev(t - .7, 'launch', .35); S.ev(t, 'boom', .45); });
  },
  draw(a, S) {
    const h = lerp(18.2, 19.9, a / 20), B = 60 / BPM.party, ph = (S.t0 + a - MS.party) / B;
    drawSky(h, 210);
    clouds(h, 4, 30, 100, 3, 41);
    hills(178, 10, .014, 8, mixc('#6a3f7a', '#2a1f40', clamp((h - 18.2) / 1.7)));
    R(0, 200, LW, LH - 200, mixc('#4f7a4a', '#1f3328', clamp((h - 18.2) / 1.7)));
    // stage
    for (const sx of [158, 444]) { R(sx, 138, 38, 68, '#1d1a26'); disc(sx + 19, 156, 9, '#3a3546'); disc(sx + 19, 156, 4, '#15121c'); disc(sx + 19, 186, 12, '#3a3546'); disc(sx + 19, 186, 5, '#15121c'); }
    R(202, 96, 4, 84, '#8890a2'); R(434, 96, 4, 84, '#8890a2'); R(202, 96, 236, 5, '#8890a2'); for (let x = 206; x < 434; x += 8) R(x, 97, 4, 3, '#5a6170');
    R(250, 104, 140, 18, '#1a1430'); label('CLAWDSTOCK', 320, 113, 30, '#ffd23f', { ow: 3, ol: '#5a1a40' });
    R(196, 180, 248, 6, '#5a4a6a'); R(196, 186, 248, 20, '#2a2034'); for (let x = 200; x < 440; x += 20) R(x, 190, 12, 12, '#3a2f48');
    const beat = Math.floor(ph), bk = fr(ph);
    const band = [];
    band.push(() => C(250, 180, { pose: 'strum', stand: 1, f: Math.floor(ph * 2) % 2, hold: 'guitar', acc: 'shades', face: 1 }));
    band.push(() => C(292, 180, { pose: beat % 8 >= 6 ? 'cheer' : 'hold', f: beat % 2, hold: beat % 8 >= 6 ? null : 'mic', acc: 'crown', face: 1, eyes: beat % 8 >= 6 ? 'happy' : 'closed' }));
    band.push(() => { C(348, 180, { pose: 'drum', f: Math.floor(ph * 2) % 2, acc: 'band', face: 1 }); disc(357, 172, 7, '#e8e2d8'); disc(357, 172, 5, '#c0392b'); R(340, 168, 8, 3, '#d5dae6'); R(364, 158 + (bk < .2 ? 1 : 0), 10, 1, '#ffd23f'); R(368, 159, 1, 21, '#8890a2'); });
    band.push(() => { C(395, 180, { pose: 'type', f: Math.floor(ph * 2) % 2, acc: 'phones', face: 1 }); R(400, 170, 18, 3, '#2a2d35'); for (let i = 0; i < 6; i++) R(401 + i * 3, 170, 2, 1, '#ffffff'); R(402, 173, 1, 7, '#5a6170'); R(415, 173, 1, 7, '#5a6170'); });
    band.forEach(f => f());
    // floating notes
    for (let i = 0; i < 6; i++) { const k = fr(a * .3 + i / 6); g.globalAlpha = 1 - k; icon(i % 2 ? 'note' : 'music', 230 + i * 30 + Math.sin(k * 6 + i) * 6, 170 - k * 90); g.globalAlpha = 1; }
    // crowd
    const items = [];
    for (const m of S.crowd) {
      let pose = 'stand', dy = 0, f = beat % 2;
      if (a > 3 && a < 14) { const u = fr(ph + m.off); dy = -Math.round(Math.max(0, Math.sin(Math.PI * u * 2)) * 5); pose = u < .5 ? 'cheer' : 'stand'; f = 0; }
      else if (a >= 14) { pose = rnd(m.sd, 7) < .3 ? 'point' : 'cheer'; f = Math.floor(a * 4 + m.sd) % 2; dy = -Math.round(Math.abs(Math.sin(a * 5 + m.sd)) * 3); }
      items.push({ y: m.y, draw: () => C(m.x, m.y + dy, { pose, f, eyes: 'none', acc: m.acc, hold: m.glow && pose === 'cheer' ? 'glow' : null, ic: m.glow, face: m.c % 2 ? 1 : -1 }) });
    }
    if (a > 8.5 && a < 14) { const k = (a - 8.5) / 5.5, x = lerp(30, 610, k), y = 248 + Math.round(Math.sin(a * 9) * 2); items.push({ y: 254, draw: () => C(x, y, { pose: 'splat', eyes: 'happy', acc: 'party', face: 1 }) }); }
    for (let i = 0; i < 9; i++) {
      const x = -20 + (a - 1.5) * 58 - i * 17; if (x < -20 || x > 660) continue;
      const q = Math.floor(ph) % 4;
      items.push({ y: 352, draw: () => C(x, 352 - (q === 3 ? 2 : 0), { pose: q === 3 ? 'jump' : 'walk', f: Math.floor(ph * 2) % 2, acc: i % 2 ? 'party' : 'party2', face: 1, eyes: 'happy' }) });
    }
    items.sort((p, q) => p.y - q.y).forEach(i => i.draw());
    nightTint(h);
    // stage lights + beams
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const lx = 220 + i * 40, an = Math.sin(a * 1.4 + i * 1.3) * .5, c = FW_COLS[(i + beat) % FW_COLS.length];
      g.globalAlpha = .13; g.fillStyle = c; g.beginPath(); g.moveTo(lx, 101); g.lineTo(lx + Math.tan(an - .12) * 250, 351); g.lineTo(lx + Math.tan(an + .12) * 250, 351); g.closePath(); g.fill();
      g.globalAlpha = 1; R(lx - 2, 100, 5, 3, (beat + i) % 2 ? c : '#ffffff');
    }
    g.restore();
    // glowsticks shine through the dusk
    for (const m of S.crowd) if (m.glow && (a <= 3 || fr(ph + m.off) < .5 || a >= 14)) glowAt(m.x + (m.c % 2 ? 4 : -4), m.y - 22, 5, m.glow, .5);
    // fireworks
    for (const fw of S.fw) {
      const d = a - fw.t;
      if (d > -.7 && d < 0) { const k = (d + .7) / .7; R(fw.x, lerp(220, fw.y, E.out(k)), 1, 3, '#fff6c0'); }
      if (d >= 0 && d < 1.6) {
        g.save(); g.globalCompositeOperation = 'lighter';
        if (d < .15) glowAt(fw.x, fw.y, 40, fw.c, 1 - d / .15);
        for (let i = 0; i < 30; i++) {
          const an = i / 30 * Math.PI * 2, sp = 34 * (.7 + .3 * ((i % 3) / 2));
          const x = fw.x + Math.cos(an) * sp * E.out(clamp(d / 1.1)), y = fw.y + Math.sin(an) * sp * E.out(clamp(d / 1.1)) + d * d * 10;
          g.globalAlpha = clamp(1.6 - d) * (Math.floor(d * 20 + i) % 3 ? 1 : .5);
          R(x, y, 2, 2, i % 2 ? fw.c : fw.c2);
        }
        g.restore(); g.globalAlpha = 1;
      }
    }
    finish();
  },
});

// ================================================================ CAMPFIRE
scene({
  name: 'campfire', dur: 14, px: 3, h: [21.0, 22.4], cap: 'CAMPFIRE STORIES',
  build(S) {
    S.cue(0, 'lull2');
    S.ev(0, 'crackle', .55, { d: 12.8 }); S.ev(5.0, 'excl', .6); S.ev(6.0, 'blow', .6); S.ev(6.7, 'chomp', .5);
    S.ev(8.0, 'sparkle', .8); S.ev(8.35, 'ooh', .7); [10.0, 10.4, 10.9].forEach(t => S.ev(t, 'yawn', .35)); S.ev(12.5, 'sizzle2', .8);
    const angs = [200, 225, 252, 290, 316, 342, 22, 52, 128, 158];
    S.seats = angs.map(d => { const th = d * Math.PI / 180; return { th, x: 320 + 124 * Math.cos(th), y: 300 + 30 * Math.sin(th) }; });
    const cast = [];
    S.seats.forEach((s0, i) => {
      const face = Math.cos(s0.th) > 0 ? -1 : 1, back = Math.sin(s0.th) > 0;
      const eyesN = back ? 'none' : undefined;
      const roast = [1, 4, 7, 8].includes(i), guitar = i === 2, waterer = i === 5;
      const base = { pose: roast ? 'sithold' : guitar ? 'strum' : 'sit', hold: roast ? 'stick' : guitar ? 'guitar' : null, face, eyes: eyesN, rate: guitar ? 4 : 1.2 };
      const steps = [];
      if (i === 7) steps.push(['wait', 5.0, base], ['wait', 1.0, { ...base, eyes: 'wide', bubble: 'excl' }], ['wait', .6, { ...base, mouth: 'o', eyes: 'closed' }], ['wait', 1.6, { pose: 'eat', hold: 'stick', face, eyes: eyesN || 'happy', bubble: back ? null : 'heart' }], ['wait', .2, base]);
      else steps.push(['wait', 8.2, base]);
      steps.push(['wait', 1.6, { ...base, pose: i % 3 === 0 ? 'point' : base.pose, eyes: back ? 'none' : 'up', bubble: !back && i % 2 ? 'star' : null, bubbleAt: .2 }]);
      const ty = 10.0 + (i % 3) * .45;
      steps.push(['wait', ty - 9.8, { ...base, eyes: back ? 'none' : 'look' }], ['wait', .8, { ...base, mouth: back ? null : 'o', eyes: back ? 'none' : 'closed' }]);
      const tl = 11.0 + i * .2 - (ty + .8);
      if (waterer) steps.push(['wait', 12.0 - (ty + .8), { ...base }], ['walk', .5, { x: 350, y: 292, hold: 'bucket' }], ['wait', .7, { pose: 'hold', hold: 'bucket', face: -1 }], ['walk', 4, { x: -30, y: 300 }]);
      else steps.push(['wait', Math.max(.05, tl), { ...base, eyes: back ? 'none' : 'closed' }], ['walk', (s0.x + 30) / 55, { x: -30, y: 300 + (i % 3) * 8 }]);
      cast.push(actor(s0.x, s0.y, { acc: i === 3 ? 'nightcap' : pick(['beanie', 'scarf', null, 'beanie', 'cap', 'scarf'], i, 1), back }, steps));
    });
    S.cast = cast; CLAWDS += 1;
  },
  draw(a, S) {
    const h = lerp(21.0, 22.4, a / 14), L = a < 12.5 ? 1 : clamp(1 - (a - 12.5) / .6);
    drawSky(h, 156, { moonX: 520, moonY: 50 });
    g.save(); g.translate(0, -80);
    R(0, 156 + 80, LW, 80, skyAt(h)[1]);
    hills(214, 7, .015, 9, '#121a38');
    for (let i = 0; i < 10; i++) {
      const x = 30 + i * 62 + (i % 3) * 7, y = 222 + Math.round(Math.sin(i * 1.7) * 3);
      R(x, y - 9, 12, 9, '#1c2448'); for (let j = 0; j < 7; j++) R(x - 1 + j, y - 9 - Math.min(j, 6 - j), 2, 1, '#222c56');
      if (a < 3 + i * 1.1) { R(x + 4, y - 6, 3, 3, '#ffe27a'); glowAt(x + 5, y - 5, 5, 'rgba(255,220,120,.5)'); }
    }
    hills(240, 6, .01, 3, '#1b2e22');
    R(0, 250, LW, LH + 80 - 250, '#1d3326'); grassTufts(252, LH + 80, 80, 41, '#2a4a33');
    // telescope rock
    disc(566, 284, 24, '#3a4250', .5); R(560, 252, 2, 20, '#8890a2'); R(568, 256, 2, 16, '#8890a2'); line(556, 246, 576, 234, '#c9ced8', 3);
    // glow from the fire
    glowAt(320, 292, 150 * L + 10, 'rgba(255,140,60,.38)', 1);
    // logs
    line(304, 304, 336, 296, '#6b4226', 3); line(304, 296, 336, 304, '#5a3520', 3);
    for (let i = 0; i < 8; i++) { const an = i / 8 * Math.PI * 2; R(320 + Math.cos(an) * 20 - 2, 302 + Math.sin(an) * 5 - 1, 5, 3, '#6a6f7a'); }
    const extra = [{ y: 301, draw: () => {
      for (let i = 0; i < 7; i++) {
        const hh = (12 + 9 * (.5 + .5 * Math.sin(a * 11 + i * 1.9)) + 5 * Math.sin(a * 7 + i)) * L * (1 - Math.abs(i - 3) / 5);
        if (hh < 1) continue;
        const x = 311 + i * 3;
        R(x - 1, 300 - hh, 4, hh, '#e8452c'); R(x, 300 - hh * .75, 3, hh * .75, '#ff9b2f'); R(x, 300 - hh * .45, 2, hh * .45, '#ffef7a');
      }
      for (let i = 0; i < 10 * L; i++) { const k = fr(a * .6 + i / 10); g.globalAlpha = 1 - k; R(316 + Math.sin(i * 7 + a * 2) * 8, 296 - k * 50, 1, 1, '#ffc35a'); }
      g.globalAlpha = 1;
      if (a > 12.4) for (let i = 0; i < 8; i++) { const k = fr((a - 12.4) * .5 + i / 8); g.globalAlpha = (1 - k) * .6 * clamp((14 - a) * 2); disc(320 + Math.sin(k * 5 + i) * 6, 296 - k * 60, 2 + k * 5, '#8a8f9e'); }
      g.globalAlpha = 1;
      if (a > 12.2 && a < 12.9) for (let i = 0; i < 8; i++) R(332 - i * 1.5, 284 + fr(a * 3 + i / 8) * 16, 1, 2, '#7fd4ff');
    } }];
    drawCast(S.cast, a, extra);
    // marshmallows on sticks
    S.cast.forEach((A, i) => {
      if (![1, 4, 7, 8].includes(i)) return;
      const st = actorState(A, a); if (!st || st.hold !== 'stick') return;
      const f = st.face || 1, tx = st.x + f * 16, ty = st.y - 9 - (st.pose === 'eat' ? 2 : 0);
      const toast = clamp(a / 9);
      R(tx - 1, ty - 1, 3, 3, i === 7 && a > 5 ? '#4a3020' : mixc('#fff8ec', '#d99a4a', toast));
      if (i === 7 && a > 5 && a < 6.3) { const k = a < 6 ? 1 : 1 - (a - 6) / .3; for (let j = 0; j < 3; j++) R(tx - 1 + j, ty - 2 - (2 + Math.sin(a * 20 + j) * 2) * k, 1, (2 + Math.sin(a * 20 + j) * 2) * k + 1, j === 1 ? '#ffef7a' : '#ff9b2f'); }
    });
    // telescope Clawd keeps watching the stars
    C(548, 262, { pose: 'stand', f: Math.floor(a * 2) % 2, eyes: 'up', acc: 'beanie', face: 1 });
    if (a > 8.2 && a < 9.6) bubble(551, 247, 'star', a - 8.2);
    g.restore();
    // shooting star
    if (a > 8 && a < 9) { const k = (a - 8); for (let i = 0; i < 20; i++) { const kk = k - i * .012; if (kk < 0) continue; g.globalAlpha = 1 - i / 20; R(lerp(520, 170, kk), lerp(36, 110, kk), 2, 1, '#ffffff'); } g.globalAlpha = 1; }
    for (let i = 0; i < 18; i++) { const x = 30 + rnd(i, 50) * 580 + Math.sin(a * .7 + i) * 12, y = 165 + rnd(i, 51) * 180 + Math.cos(a * .9 + i * 2) * 8; if (Math.sin(a * 2.5 + i * 1.3) > .3) { R(x, y, 1, 1, '#f6ff9a'); glowAt(x, y, 4, 'rgba(240,255,120,.5)'); } }
    finish();
  },
});

// ================================================================ BEDTIME
scene({
  name: 'bedtime', dur: 12, px: 2, h: [22.5, 23.9], cap: 'LIGHTS OUT',
  build(S) {
    S.rooms = [];
    const pal = ['#f7cfd8', '#cfe3f2', '#d8efd0', '#ffe3b3', '#efe0f7', '#f4e3c1'];
    const order = [];
    for (let i = 0; i < 20; i++) if (i !== 2) order.push(i);
    order.sort((p, q) => rnd(p, 7) - rnd(q, 7));
    for (let f = 0; f < 4; f++) for (let c = 0; c < 5; c++) {
      const id = f * 5 + c;
      const L = id === 2 ? 10.6 : 1.4 + order.indexOf(id) * .45;
      S.rooms.push({ id, x: 66 + c * 168, y: 126 + f * 100, w: 162, hgt: 94, col: pal[(id * 5 + f) % 6], blank: pal[(id * 3 + 2) % 6], L, type: id === 2 ? 'work' : id % 6 });
      S.ev(L, 'click', id === 2 ? .9 : .35);
      if (id % 6 === 2 && id !== 2) for (let t = .3 + rnd(id, 1); t < L - .6; t += .55) S.ev(t, 'poof', .3);
      CLAWDS += 3;
    }
    S.ev(2.5, 'snore', .5, { d: 9.5 }); S.ev(9.6, 'yawn', .5);
  },
  draw(a, S) {
    const h = lerp(22.5, 23.9, a / 12);
    drawSky(h, 540, { moonX: 892, moonY: 70 });
    R(0, 520, LW, 20, '#14241a');
    // building shell + roof
    for (let i = 0; i < 86; i++) { const w = Math.round(880 * (1 - i / 86)); R(480 - w / 2, 120 - i, w, 1, i < 3 ? '#4a2a2a' : '#7a3a34'); }
    R(56, 120, 848, 402, '#3a2f3a');
    for (const r of S.rooms) {
      const on = a < r.L, x = r.x, y = r.y, fy = y + r.hgt;
      R(x, y, r.w, r.hgt, on ? r.col : mixc(r.col, '#0b1030', .82));
      R(x, fy - 6, r.w, 6, on ? '#c49a6a' : '#2a2430');
      // window
      R(x + r.w - 34, y + 14, 24, 22, on ? '#ffffff' : '#3a3f5a'); R(x + r.w - 32, y + 16, 20, 18, '#1a2050'); R(x + r.w - 23, y + 16, 2, 18, on ? '#ffffff' : '#3a3f5a');
      if (on) { R(x + 40, y, 1, 14, '#5a4a4a'); disc(x + 40, y + 16, 5, '#ffd86b', .6); }
      // beds
      for (let j = 0; j < 3; j++) {
        const bx = x + 8 + j * 50;
        if (r.type === 'work' && j === 2) continue;
        R(bx, fy - 16, 4, 12, '#8a5a3a'); R(bx + 36, fy - 12, 3, 8, '#8a5a3a'); R(bx + 3, fy - 12, 34, 6, '#a8743f');
        R(bx + 4, fy - 15, 33, 3, '#ffffff'); R(bx + 5, fy - 18, 9, 4, '#ffffff');
      }
      if (r.type === 'work') { const dx = x + 112; R(dx, fy - 22, 40, 3, '#c8a27a'); R(dx + 2, fy - 19, 2, 13, '#9a7550'); R(dx + 36, fy - 19, 2, 13, '#9a7550'); R(dx + 10, fy - 24, 12, 2, '#9aa3b5'); if (a < 9.6) { R(dx + 21, fy - 36, 2, 12, '#5a6170'); R(dx + 20, fy - 35, 1, 10, '#9fe3ff'); glowAt(dx + 18, fy - 30, 18, 'rgba(120,210,255,.45)'); } }
      // the Clawds in this room
      for (let j = 0; j < 3; j++) {
        const bx = x + 8 + j * 50, sd = r.id * 3 + j, inBed = { x: bx + 16, y: fy - 14 };
        const hopT = r.L - .7 - j * .12;
        let st;
        const acc = pick(['nightcap', 'nightcap', 'bow', null, 'beanie'], sd, 3);
        if (r.type === 'work' && j === 2) {
          if (a < 9.6) st = { x: x + 120, y: fy - 16, pose: 'sittype', f: Math.floor(a * 9) % 2, face: 1, acc: 'phones' };
          else if (a < 10.1) st = { x: x + 120, y: fy - 16, pose: 'stretch', f: Math.floor(a * 3) % 2, face: 1, mouth: 'o', acc: 'phones' };
          else if (a < 10.5) { const k = (a - 10.1) / .4; st = { x: lerp(x + 120, x + 8 + 66, k), y: lerp(fy - 16, fy - 14, k) - Math.sin(Math.PI * k) * 14, pose: 'jump', face: -1, acc: 'phones' }; }
          else st = { x: x + 8 + 66, y: fy - 14, pose: 'lie', face: -1, acc: 'phones', bed: 1 };
        } else if (r.type === 'work') st = { ...inBed, pose: 'lie', face: -1, acc, bed: 1 };
        else if (a >= hopT + .4) st = { ...inBed, pose: 'lie', face: -1, acc, bed: 1 };
        else {
          let px = bx + 20, py = fy - 6, pose = 'stand', hold = null, f = Math.floor(a * 3 + sd) % 2, face = j % 2 ? -1 : 1, eyes;
          switch (r.type) {
            case 0: pose = 'hold'; hold = 'brush'; f = Math.floor(a * 8 + sd) % 2; break;
            case 1: px = bx + 22; py = fy - 15; pose = 'sithold'; hold = 'book'; f = Math.floor(a * .7 + sd) % 2; break;
            case 2: px = bx + 20 + Math.sin(a * 3 + j * 2) * 14; py = fy - 6 - Math.abs(Math.sin(a * 5 + j)) * 10; pose = 'bang'; hold = 'pillow'; f = Math.floor(a * 5 + j) % 2; face = Math.cos(a * 3 + j * 2) > 0 ? 1 : -1; eyes = 'happy'; break;
            case 3: px = bx + 22; py = fy - 15 - Math.abs(Math.sin(a * 4 + j)) * 12; pose = 'jump'; eyes = 'happy'; break;
            case 4: pose = 'dance'; f = Math.floor(a * 4 + j) % 4; break;
            case 5: pose = 'stretch'; f = Math.floor(a * 2 + j) % 2; break;
          }
          if (a >= hopT) { const k = (a - hopT) / .4; px = lerp(px, inBed.x, k); py = lerp(py, inBed.y, k) - Math.sin(Math.PI * k) * 12; pose = 'jump'; hold = null; }
          st = { x: px, y: py, pose, hold, f, face, eyes, acc };
        }
        C(st.x, st.y, st);
        if (st.bed) { R(bx + 14, fy - 16, 24, 5, r.blank); R(bx + 14, fy - 16, 24, 1, '#ffffff'); }
      }
      if (r.type === 2 && a < r.L) for (let i = 0; i < 10; i++) { const k = fr(a * .5 + i / 10); R(x + 20 + rnd(i, r.id) * 120 + Math.sin(a * 2 + i) * 6, y + 20 + k * 60, 2, 1, '#ffffff'); }
      if (!on) { g.globalAlpha = .55; R(x, y, r.w, r.hgt, '#050820'); g.globalAlpha = 1; for (let j = 0; j < 3; j++) if (!(r.type === 'work' && j === 2)) zzz(x + 8 + j * 50 + 8, y + r.hgt - 22, a, r.id * 3 + j); }
      else glowAt(x + 40, y + 20, 50, 'rgba(255,220,140,.25)');
    }
    for (let f = 0; f <= 4; f++) R(56, 120 + f * 100, 848, 6, '#4a3a3a');
    for (let c = 0; c <= 5; c++) R(60 + c * 168, 120, 6, 400, '#4a3a3a');
    label('CLAWD DORM', 480, 96, 26, '#ffd86b', { ow: 3, ol: '#3a1a1a' });
    finish();
  },
});

// ================================================================ GOOD NIGHT
function crescent(cx, cy, r, ox, oy, r2, col) {
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(r * r - dy * dy)), x0 = cx - w, x1 = cx + w;
    const ddy = dy - oy; let c0 = 1e9, c1 = -1e9;
    if (Math.abs(ddy) <= r2) { const w2 = Math.floor(Math.sqrt(r2 * r2 - ddy * ddy)); c0 = cx + ox - w2; c1 = cx + ox + w2; }
    if (c0 > x1 || c1 < x0) R(x0, cy + dy, x1 - x0 + 1, 1, col);
    else { if (c0 > x0) R(x0, cy + dy, c0 - x0, 1, col); if (c1 < x1) R(c1 + 1, cy + dy, x1 - c1, 1, col); }
  }
}
scene({
  name: 'end', dur: 10, px: 4, h: [23.95, 24.0],
  build(S) { S.ev(.8, 'chime', .7); S.ev(3.2, 'chime', .5); CLAWDS += 1; },
  draw(a, S) {
    drawSky(23.95, 270, { noMoon: true });
    glowAt(236, 92, 110, 'rgba(220,225,255,.25)');
    crescent(236, 92, 44, 18, -10, 38, '#f4f1dc');
    C(218, 132, { pose: 'lie', acc: 'nightcap', face: 1, f: 0 }); zzz(214, 122, a, 1, '#ffffff');
    hills(236, 6, .02, 5, '#121a38');
    hills(252, 4, .03, 9, '#0d1430');
    for (let i = 0; i < 12; i++) { const x = 20 + rnd(i, 60) * 440, y = 242 + rnd(i, 61) * 26; if (Math.sin(a * 2 + i) > .3) { R(x, y, 1, 1, '#f6ff9a'); glowAt(x, y, 4, 'rgba(240,255,120,.5)'); } }
    finish();
    const k = clamp((a - .8) / 1.2);
    if (k > 0) { ctx.globalAlpha = k; bigText('GOOD NIGHT, CLAWDS', 960, 690, 84, ['#FFE2B8', '#F3A889', '#D97757', '#A9502F'], { ex: 10, ow: 6 }); ctx.globalAlpha = 1; }
    if (a > 2.6) T('SEE YOU TOMORROW!', 960, 800, 34, '#ffe9d6', { f: 'SilkB', ow: 3, ol: '#1a1030', al: clamp((a - 2.6) * 2) });
    if (a > 4.2) T(`STARRING ${CLAWDS} TINY CLAWDS`, 960, 880, 28, '#F3A889', { ow: 3, ol: '#1a1030', al: clamp((a - 4.2) * 2) });
    if (a > 5.4) T('drawn, animated and scored entirely in code', 960, 960, 26, '#9aa3c5', { f: 'Silk', al: clamp((a - 5.4) * 2) });
  },
});
