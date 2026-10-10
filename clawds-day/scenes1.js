'use strict';
// CLAWD'S DAY - scenes, part 1: night -> dawn -> exercise -> breakfast -> commute -> office.
const SC = [];
const scene = def => (SC.push(def), def);
const MS = {}; // music start times (global seconds), filled in by layout
const BPM = { lull: 80, morning: 116, city: 124, chase: 150, picnic: 100, beach: 132, party: 128 };

const WALLS = ['#f4e3c1', '#cfe3f2', '#f7cfd8', '#d8efd0', '#efe0f7', '#ffe3b3'];
const ROOFS = ['#c0533a', '#3d6fb6', '#b0466a', '#4f9a55', '#7a56b0', '#d1832f'];
const HATS = ['bow', 'cap', 'beanie', 'flower', 'cap2', null, null, null];

function alarmClock(x, y, a) {
  const sh = Math.floor(a * 30) % 2 ? 1 : -1;
  x += sh;
  R(x - 4, y - 6, 2, 2, '#ffd23f'); R(x + 3, y - 6, 2, 2, '#ffd23f');
  disc(x, y, 4, '#e8403b'); disc(x, y, 3, '#ffffff'); R(x, y - 2, 1, 2, CL.K); R(x, y, 2, 1, CL.K);
  R(x - 3, y + 4, 1, 2, '#e8403b'); R(x + 3, y + 4, 1, 2, '#e8403b');
  if (Math.floor(a * 8) % 2) { R(x - 8, y - 3, 2, 1, '#ffffff'); R(x + 7, y - 3, 2, 1, '#ffffff'); R(x - 8, y + 1, 2, 1, '#ffffff'); R(x + 7, y + 1, 2, 1, '#ffffff'); }
}
function bird(x, y, a, seed = 0, fly = false) {
  const c = '#3b3f5a';
  if (fly) { const f = Math.floor(a * 8 + seed) % 2; R(x - 3, y - f, 3, 1, c); R(x + 1, y - f, 3, 1, c); R(x, y, 1, 1, c); return; }
  const hopY = fr(a * .7 + seed) < .12 ? -2 : 0;
  R(x, y - 3 + hopY, 4, 3, c); R(x + 3, y - 4 + hopY, 2, 2, c); R(x + 5, y - 3 + hopY, 1, 1, '#ffb21a'); R(x + 1, y + hopY, 1, 1, '#ffb21a');
}

// ================================================================ TITLE
scene({
  name: 'title', dur: 8, px: 4, h: [4.2, 4.6],
  build(S) {
    S.cue(.2, 'lull');
    S.ev(.7, 'chime', .8); S.ev(1.45, 'boing', .9); S.ev(0, 'snore', .5, { d: 8 });
    const sub = "A DAY IN THE LIFE OF MANY, MANY TINY CLAWDS";
    for (let i = 0; i < sub.length; i += 2) if (sub[i] !== ' ') S.ev(2.3 + i / 30, 'blip', .25);
    S.sub = sub;
    S.sleepers = [];
    for (let i = 0; i < 10; i++) { S.sleepers.push(i); CLAWDS++; }
  },
  draw(a, S) {
    const h = lerp(4.2, 4.6, a / 8);
    drawSky(h, 210, { moonX: 390, moonY: 52 });
    hills(196, 8, .018, 2, '#18224a');
    for (let i = 0; i < 9; i++) { // far sleepy village
      const x = 20 + i * 52 + (i % 2) * 9, y = 200 + Math.round(Math.sin(i * 1.3) * 3);
      R(x, y - 10, 14, 10, '#232c58'); for (let j = 0; j < 8; j++) R(x - 1 + j, y - 10 - Math.min(j, 7 - j), 16 - 2 * j > 0 ? 2 : 0, 1, '#2a3366');
      R(x + 4, y - 7, 3, 3, '#141a3a');
    }
    hills(222, 5, .03, 5, '#15203f');
    disc(240, 330, 190, '#1c2d4c', .45);
    grassTufts(250, 270, 40, 3, '#243a5c');
    for (let i = 0; i < 10; i++) {
      const x = 168 + i * 16, dx = x - 240;
      const y = Math.round(330 - 85.5 * Math.sqrt(1 - (dx / 190) ** 2)) + 1;
      C(x, y, { pose: 'sleep', f: Math.floor(a * 1.3 + i * .37) % 2, acc: 'nightcap', face: i % 2 ? -1 : 1 });
      if (i % 3 === 1) zzz(x + 2, y - 10, a, i);
    }
    for (let i = 0; i < 14; i++) { // fireflies
      const x = 40 + rnd(i, 70) * 400 + Math.sin(a * .8 + i) * 10, y = 215 + rnd(i, 71) * 50 + Math.cos(a * 1.1 + i * 2) * 6;
      if (Math.sin(a * 3 + i * 1.7) > .2) { R(x, y, 1, 1, '#f6ff9a'); glowAt(x, y, 4, 'rgba(240,255,120,.5)'); }
    }
    finish();
    const k = clamp((a - .6) / .9);
    if (k > 0) {
      const y = lerp(-120, 330, E.back(k));
      bigText("CLAWD'S DAY", 960, y, 132, ['#FFE2B8', '#F3A889', '#D97757', '#A9502F'], { ex: 14, ow: 8 });
    }
    if (a > 2.3) {
      const n = Math.floor((a - 2.3) * 30);
      T(S.sub.slice(0, n), 960, 480, 40, '#ffe9d6', { f: 'SilkB', ow: 3, ol: '#1a1030' });
    }
    if (a > 4.8) T('6:00 AM IS COMING...', 960, 990, 26, '#c9d3ff', { al: (Math.floor(a * 2) % 2 ? .9 : .5) * clamp((a - 4.8) * 2), ow: 3, ol: '#0a0e2a' });
  },
});

// ================================================================ DAWN
scene({
  name: 'dawn', dur: 18, px: 3, h: [5.6, 7.0], cap: 'WAKE UP, CLAWDS!',
  build(S) {
    S.cue(0, 'stop'); S.cue(3.4, 'morning');
    const GY = 300; S.GY = GY;
    const lit = [1.0, 2.4, 1.7, 11.6, 3.1, 2.0];
    S.HS = lit.map((l, i) => ({ x: 14 + i * 104, w: 84, h: 64, wall: WALLS[i], roof: ROOFS[i], lit: l, door: l + 1.0, cx: 14 + i * 104 + 42 }));
    S.HS[3].door = 12.1;
    S.ev(0, 'birds', .5, { d: 18 });
    S.HS.forEach((h, i) => { S.ev(h.lit - .8, 'alarm', .55); if (i !== 3) S.ev(h.door, 'pop', .7); });
    S.ev(1.5, 'alarm', .45); S.ev(6.5, 'alarm', .4);
    const cast = [];
    const gather = [[2, 0], [2, 2], [4, 0], [4, 1], [1, 2]];
    const gpos = [[338, 314], [350, 326], [398, 314], [386, 326], [368, 334]];
    S.HS.forEach((h, i) => {
      if (i === 3) return;
      for (let j = 0; j < 3; j++) {
        const tOut = h.door + .2 + j * .45;
        const sx = h.cx + (j - 1) * 22, sy = GY + 12 + (j % 2) * 10;
        const sd = i * 3 + j;
        const acc = rnd(sd, 1) < .4 ? 'nightcap' : pick(HATS, sd, 2);
        S.ev(tOut, 'boing', .35);
        const steps = [['hide', tOut], ['hop', .5, { x: sx, y: sy, h: 12 }], ['wait', 1.6, { pose: 'stretch', rate: 2.5 }], ['wait', 1.0, { pose: 'stand', eyes: 'closed', mouth: 'o' }]];
        S.ev(tOut + 2.2, 'yawn', .25);
        let t = tOut + 3.1;
        const gi = gather.findIndex(q => q[0] === i && q[1] === j);
        if (gi >= 0) {
          const [gx, gy] = gpos[gi];
          if (t < 8.6) steps.push(['wait', 8.6 - t, { pose: 'stand', bubble: 'zz', bubbleAt: 8.6 - t - 1.2, bubbleDur: 1.1 }]);
          steps.push(['walk', 1.0, { x: gx, y: gy }]);
          steps.push(['wait', 2.2, { pose: 'bang', hold: 'pan', rate: 6, face: gx < 368 ? 1 : -1, eyes: 'angry' }]);
          steps.push(['wait', 1.6, { pose: 'stand', eyes: 'look', face: gx < 368 ? 1 : -1 }]);
          t = 13.4;
        } else {
          steps.push(['wait', 13.4 - t, { pose: rnd(sd, 5) < .5 ? 'stand' : 'wave', rate: 3, bubble: pick(['heart', 'note', 'sun', 'coffee'], sd, 6), bubbleAt: 1 + rnd(sd, 7) * 4, bubbleDur: 1.2 }]);
          t = 13.4;
        }
        steps.push(['wait', 1.6 + rnd(sd, 8) * .4, { pose: 'cheer' }]);
        const lx = gi >= 0 ? gpos[gi][0] : sx;
        steps.push(['walk', (720 - lx) / 70, { x: 720, y: gi >= 0 ? gpos[gi][1] : sy }]);
        cast.push(actor(sx, sy, { acc, seed: sd * 1.7 }, steps));
      }
    });
    for (let k = 0; k < 11; k++) S.ev(9.45 + k * .2, 'bang', .5);
    S.ev(13.0, 'excl', .7); S.ev(13.4, 'cheer', .8, { d: 1.6 });
    cast.push(actor(368, GY, { acc: 'nightcap', seed: 3 }, [['hide', 12.3], ['walk', 1.0, { x: 368, y: 306, eyes: 'closed', rate: 3 }],
      ['wait', .4, { pose: 'stand', eyes: 'closed' }], ['wait', .8, { pose: 'stand', eyes: 'wide', bubble: 'excl' }],
      ['wait', 1.4, { pose: 'cheer', bubble: 'heart' }], ['walk', 5, { x: 720, y: 306 }]]));
    S.cast = cast;
  },
  draw(a, S) {
    const h = lerp(5.6, 7.0, a / 18), d = dayness(h), GY = S.GY;
    drawSky(h, GY);
    clouds(h, 5, 30, 120, 4, 3);
    hills(236, 12, .012, 1, mixc('#2a3160', '#8fb8d8', d));
    hills(262, 8, .02, 4, mixc('#24304e', '#6aa86a', d));
    for (const H of S.HS) house(H.x, GY, H.w, H.h, H.wall, H.roof, a > H.lit, a > H.door);
    R(0, GY, LW, LH - GY, mixc('#26402e', '#6fbf4f', d));
    R(0, GY + 8, LW, 34, mixc('#3a3a4a', '#d9c49a', d)); R(0, GY + 8, LW, 1, mixc('#2a2a3a', '#b9a47a', d));
    grassTufts(GY + 44, LH, 50, 9, mixc('#20382a', '#4f9a3c', d));
    grassTufts(GY + 1, GY + 6, 30, 19, mixc('#20382a', '#4f9a3c', d));
    // birds on the roofs
    for (let i = 0; i < 4; i++) {
      const H = S.HS[[0, 2, 4, 5][i]], bx = H.x + 30 + i * 6, by = GY - H.h - Math.round(H.w * .42) + 6 + i;
      if (a < 9 + i) bird(bx, by + (i % 2), a, i);
      else bird(bx + (a - 9 - i) * 60, by - (a - 9 - i) * 40, a, i, true);
      if (a > 1.6 + i * 1.8 && a < 2.6 + i * 1.8) bubble(bx + 2, by - 4, 'note', a - 1.6 - i * 1.8);
    }
    drawCast(S.cast, a);
    nightTint(h);
    for (const H of S.HS) {
      if (a > H.lit) for (const wx of [H.x + 16, H.x + H.w - 16]) glowAt(wx, GY - H.h + 21, 14, 'rgba(255,220,120,.5)', 1 - d * .7);
      if (a > H.lit - .8 && a < H.lit + .1) alarmClock(H.x + 16, GY - H.h + 21, a);
    }
    if (a > 1.5 && a < 2.3) alarmClock(S.HS[3].x + 16, GY - S.HS[3].h + 21, a);
    if (a > 6.5 && a < 7.3) alarmClock(S.HS[3].x + 16, GY - S.HS[3].h + 21, a);
    if (a < 11.6) zzz(S.HS[3].x + S.HS[3].w - 18, GY - S.HS[3].h + 16, a, 4, '#ffffff');
    finish();
  },
});

// ================================================================ EXERCISE
scene({
  name: 'exercise', dur: 18, px: 3, h: [7.0, 7.6], cap: 'MORNING STRETCH',
  build(S) {
    [1.2, 7.0, 10.8, 14.0].forEach(t => S.ev(t, 'whistle', .7));
    S.ev(0, 'birds', .35, { d: 18 });
    S.grid = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 11; c++) {
      const sd = r * 11 + c; CLAWDS++;
      S.grid.push({ r, c, x: 88 + c * 48 + (r % 2) * 24, y: 214 + r * 29, acc: rnd(sd, 31) < .35 ? 'band' : rnd(sd, 32) < .2 ? 'cap' : rnd(sd, 33) < .15 ? 'bow' : null, sd });
    }
    CLAWDS += 6;
    S.ev(14.0, 'thud', .8); S.ev(14.25, 'excl', .6); S.ev(15.6, 'boing', .7); S.ev(16.0, 'cheer', .9, { d: 2 });
    S.beat = 60 / BPM.morning;
    // little boings on the jumping jacks
    S.boingAt = [];
  },
  draw(a, S) {
    const h = lerp(7.0, 7.6, a / 18), B = S.beat;
    const ph = (S.t0 + a - MS.morning) / B;
    drawSky(h, 175);
    clouds(h, 5, 20, 90, 5, 7);
    hills(150, 8, .015, 3, '#8fc7a0');
    for (let i = 0; i < 11; i++) tree(20 + i * 62 + (i % 2) * 14, 178, 1, '#46a65a', '#2f8044');
    R(0, 170, LW, LH - 170, '#79c75a');
    for (let y = 196; y < LH; y += 24) R(0, y, LW, 12, '#82cf63');
    R(0, 178, LW, 10, '#e2cf9e'); R(0, 178, LW, 1, '#c4ae78');
    // joggers on the path
    for (let i = 0; i < 6; i++) {
      const v = 46 + rnd(i, 40) * 30, x = ((a * v + rnd(i, 41) * 760) % 760) - 60;
      C(x, 186, { pose: 'run', f: Math.floor(a * 13 + i) % 2, acc: i % 2 ? 'band' : 'phones' });
    }
    for (let i = 0; i < 4; i++) bird(((a * 30 + i * 170) % 720) - 40, 40 + i * 12 + Math.sin(a * 2 + i) * 4, a, i, true);
    // coach on a crate
    R(28, 222, 30, 18, '#a8743f'); R(28, 222, 30, 2, '#c99257'); R(28, 230, 30, 1, '#8a5a2f');
    const items = [];
    const routine = (m, sd) => {
      // returns state for a grid member (or coach) at time a
      let st = { pose: 'stand', f: Math.floor(a * 2.6 + sd) % 2, dy: 0 };
      if (a >= 2 && a < 7) { const f = Math.floor(ph * 2) % 2; st = { pose: 'jack', f, dy: f ? -2 : 0 }; }
      else if (a >= 7.5 && a < 10.8) { const f = Math.floor(ph) % 2; st = { pose: 'squat', f, dy: 0, eyes: f ? 'closed' : undefined }; }
      else if (a >= 10.8 && a < 14 && m) {
        for (const pk of [11.2 + m.c * .12, 12.8 + (10 - m.c) * .12]) {
          const u = (a - pk) / .3; if (Math.abs(u) < 1) st = { pose: 'cheer', f: 0, dy: -Math.round(Math.cos(u * Math.PI / 2) * 7) };
        }
      } else if (a >= 16) st = { pose: 'cheer', f: Math.floor(a * 5 + sd) % 2, dy: -Math.round(Math.abs(Math.sin((a + sd) * 6)) * 3) };
      return st;
    };
    const coach = routine(null, 0);
    if (a >= 10.8 && a < 14) coach.pose = 'point';
    C(43, 222 + coach.dy, { ...coach, acc: ['band', 'cap2'], face: 1 });
    for (const t of [1.2, 7.0, 10.8, 14.0]) if (a > t && a < t + .8) bubble(46, 204, 'excl', a - t);
    for (const m of S.grid) {
      let st = routine(m, m.sd);
      const tired = m.r === 2 && m.c === 5, helper = m.r === 2 && (m.c === 4 || m.c === 6);
      if (tired && a >= 14 && a < 15.6) st = { pose: 'splat', eyes: 'x', dy: 0 };
      if (helper && a >= 14.2 && a < 15.0) st = { pose: 'stand', eyes: 'wide', dy: 0, face: m.c === 4 ? 1 : -1, bubble: 'excl' };
      if (helper && a >= 15.0 && a < 15.6) st = { pose: 'push', f: Math.floor(a * 6) % 2, dy: 0, face: m.c === 4 ? 1 : -1 };
      if (tired && a >= 15.6 && a < 16) st = { pose: 'jump', dy: -6, bubble: 'heart' };
      if (tired && a >= 16) st.bubble = 'heart';
      if (a >= 16 && !tired && rnd(m.sd, 50) < .25) st.bubble = pick(['heart', 'star', 'note', 'sun'], m.sd, 51);
      if (a < 2 && rnd(m.sd, 52) < .1 && a > 0.3) st.bubble = 'sun';
      if (!st.eyes && ((a * 1000 + m.sd * 997) % 3300) < 120 && st.pose !== 'cheer') st.eyes = 'blink';
      items.push({ y: m.y, draw: () => { const tx = tired && a >= 14 && a < 15.6 ? 0 : 0; C(m.x + tx, m.y + st.dy, { ...st, acc: m.acc, face: st.face || 1 }); if (st.bubble) bubble(m.x + 3, m.y + st.dy - 15, st.bubble, 1); if (tired && a >= 14.1 && a < 15.6) bubble(m.x + 3, m.y - 10, 'sweat', a - 14.1); } });
    }
    items.sort((p, q) => p.y - q.y).forEach(i => i.draw());
    finish();
  },
});

// ================================================================ BREAKFAST
scene({
  name: 'breakfast', dur: 15, px: 3, h: [7.6, 8.3], cap: 'BREAKFAST TIME',
  build(S) {
    S.ev(0, 'sizzle', .35, { d: 15 });
    S.chefs = [40, 110, 180].map((x, i) => ({ x, off: .3 + i * .53, P: 1.6 }));
    for (const c of S.chefs) for (let t = c.off; t < 15; t += c.P) S.ev(t, 'flip', .45);
    CLAWDS += 3;
    const cast = [];
    // waiter shuttles plates from the counter to the tables
    const wsteps = [];
    for (let t = 0; t < 15; t += 6) wsteps.push(['walk', 2.5, { x: 470, y: 268, hold: 'plate' }], ['wait', .5, { pose: 'hold', hold: 'plate', face: 1 }], ['walk', 2.5, { x: 250, y: 262 }], ['wait', .5, { pose: 'stand', face: -1 }]);
    cast.push(actor(250, 262, { acc: 'bowtie', seed: 9 }, wsteps));
    // seated eaters
    S.tables = [300, 390, 480];
    const seats = [[300, -1], [300, 1], [390, 1], [480, -1], [480, 1]];
    seats.forEach(([tx, side], i) => {
      const sx = tx + side * 26;
      cast.push(actor(sx, 298, { acc: pick(HATS, i, 60), face: -side, seed: i * 2.3 }, [['wait', 15, { pose: 'eat', rate: 3, bubble: pick(['heart', 'star', 'heart', 'note'], i, 61), bubbleAt: 1 + rnd(i, 62) * 9, bubbleDur: 1.3 }]]));
    });
    // the sleepy one (still in a nightcap)
    cast.push(actor(364, 298, { acc: 'nightcap', face: 1, seed: 1 }, [
      ['wait', 5.5, { pose: 'eat', rate: 1.5, eyes: 'closed' }], ['wait', 6.3, { pose: 'sleep', zzz: 1 }],
      ['wait', .7, { pose: 'sithold', hold: 'mug', eyes: 'wide', bubble: 'excl' }], ['wait', 2.5, { pose: 'eat', hold: 'mug', rate: 2, eyes: 'star', bubble: 'heart', bubbleAt: .8 }]]));
    S.ev(11.85, 'excl', .7); S.ev(12.5, 'slurp', .8); S.ev(13.2, 'sparkle', .6);
    // coffee queue
    S.serve = [];
    for (let i = 0; i < 7; i++) {
      const s = 1.0 + i * 1.6; S.serve.push(s);
      S.ev(s, 'pour', .5); S.ev(s + .8, 'ding', .5);
    }
    for (let i = 0; i < 7; i++) {
      const s = S.serve[i];
      const fn = (k, la, st, A, a) => {
        let n = 0; for (let j = 0; j < i; j++) n += clamp((a - S.serve[j] - .9) / .4);
        const x = 545 - 20 * (i - n);
        const moving = (i - n) % 1 !== 0;
        return { x, y: 334, face: 1, pose: moving ? 'walk' : 'stand', f: Math.floor(a * (moving ? 8 : 2.6) + i) % 2, eyes: a > s - .1 ? 'up' : undefined };
      };
      const steps = [['fn', s, { fn }], ['wait', .9, { pose: 'stand', eyes: 'up', face: 1 }]];
      if (i === 5) steps.push(['walk', 1.0, { x: 344, y: 304, hold: 'mug' }], ['wait', .25, { pose: 'hold', hold: 'mug', face: 1 }], ['wait', 1.3, { pose: 'cheer', face: 1, bubble: 'heart' }], ['walk', 4, { x: 700, y: 350 }]);
      else steps.push(['wait', .5, { pose: 'stand', hold: 'mug', eyes: 'happy', bubble: 'coffee' }], ['walk', .4, { x: 560, y: 352, hold: 'mug' }], ['walk', 2.0, { x: 700, y: 352, hold: 'mug' }]);
      cast.push(actor(545 - 20 * i, 334, { acc: pick(['tie', 'phones', 'bow', null, 'cap', 'bluetie', 'glasses'], i, 70), seed: i * 3.1 }, steps));
    }
    CLAWDS -= 0;
    S.cast = cast;
  },
  draw(a, S) {
    const h = lerp(7.6, 8.3, a / 15);
    g.save(); g.translate(0, -66); LYO = -66;
    R(0, 66, LW, 174, '#f6dfb8');
    for (let x = 0; x < LW; x += 24) R(x, 66, 12, 174, '#f2d6a8');
    R(0, 200, LW, 40, '#d8a876'); R(0, 200, LW, 3, '#b9814f');
    // window
    g.save(); g.beginPath(); g.rect(250, 106, 150, 80); g.clip(); g.translate(0, 106); drawSky(h, 80); clouds(h, 3, 10, 40, 6, 4); hills(66, 4, .05, 2, '#7cbf7a'); g.restore();
    R(248, 104, 154, 3, '#ffffff'); R(248, 185, 154, 3, '#ffffff'); R(248, 104, 3, 84, '#ffffff'); R(399, 104, 3, 84, '#ffffff'); R(324, 104, 2, 84, '#ffffff'); R(248, 144, 154, 2, '#ffffff');
    label('CAFE CLAWD', 325, 90, 34, '#a9502f', { ow: 3, ol: '#fff1dc' });
    for (const lx of [120, 470]) { R(lx, 66, 1, 40, '#5a3a2a'); disc(lx, 110, 8, '#2f6f5f', .6); R(lx - 8, 110, 17, 2, '#2f6f5f'); glowAt(lx, 118, 30, 'rgba(255,220,140,.35)'); }
    // floor
    R(0, 240, LW, 200, '#cf9a5f');
    for (let y = 240; y < LH + 70; y += 10) for (let x = 0; x < LW; x += 20) R(x + ((y / 10) % 2) * 10, y, 10, 10, '#c48c52');
    R(0, 240, LW, 2, '#a8743f');
    // chefs behind the counter
    for (const [i, c] of S.chefs.entries()) {
      const u = fr((a - c.off) / c.P), flying = a > c.off && u < .45;
      C(c.x, 250, { pose: flying && u < .08 ? 'bang' : 'hold', f: 1, hold: 'pan', acc: 'chef', face: 1, eyes: flying ? 'up' : undefined });
    }
    R(0, 245, 238, 3, '#e8e2d8'); R(0, 248, 238, 46, '#8a5a3a'); R(0, 248, 238, 2, '#6a4028');
    for (let x = 8; x < 238; x += 38) R(x, 256, 30, 30, '#7a4c30');
    for (const [i, c] of S.chefs.entries()) {
      const u = fr((a - c.off) / c.P), px = c.x + 15, base = 239;
      if (a > c.off && u < .45) {
        const k = u / .45, py = base - Math.sin(Math.PI * k) * 34, w = Math.max(1, Math.round(Math.abs(Math.cos(k * Math.PI * 2)) * 7));
        R(px - w / 2, py, w, 2, '#e8b25a'); if (w > 2) R(px - w / 2, py + 1, w, 1, '#c9862e');
      } else R(px - 3, base, 7, 2, '#e8b25a');
      const n = clamp(Math.floor((a - c.off) / c.P) + 1, 0, 9), sx = c.x + 34;
      R(sx - 6, 244, 13, 1, '#ffffff');
      for (let k = 0; k < n; k++) { R(sx - 4, 242 - k * 2, 9, 2, '#e8b25a'); R(sx - 4, 243 - k * 2, 9, 1, '#c9862e'); }
      if (n > 0) R(sx - 1, 241 - n * 2, 3, 1, '#fff2a8');
    }
    // coffee counter + machine
    R(560, 294, 80, 3, '#e8e2d8'); R(560, 297, 80, 40, '#6a4a7a'); R(560, 297, 80, 2, '#4a2f5a');
    R(572, 254, 30, 40, '#3a3f4f'); R(574, 256, 26, 8, '#5a6170'); R(578, 258, 4, 3, a % 1 < .5 ? '#ff5050' : '#5aff7a'); R(584, 264, 6, 4, '#20232b');
    label('COFFEE', 587, 247, 18, '#ffffff', { ow: 2, ol: '#3a2a4a' });
    const serving = S.serve.find(s => a > s && a < s + .9);
    if (serving !== undefined) {
      for (let y = 268; y < 290; y += 2) if (fr(y / 7 - a * 3) < .7) R(586, y, 2, 2, '#6b3b20');
      for (let i = 0; i < 3; i++) { const k = fr(a * 1.5 + i / 3); g.globalAlpha = 1 - k; R(586 + Math.sin(k * 6 + i) * 2, 286 - k * 14, 1, 2, '#ffffff'); } g.globalAlpha = 1;
    }
    R(626, 196, 14, 140, '#8a5a3a'); R(628, 198, 12, 136, '#5a3a2a'); // exit door
    // tables + stools
    const extra = [];
    for (const tx of S.tables) {
      extra.push({ y: 298.5, draw: () => {
        for (const sx of [tx - 26, tx + 26]) { R(sx - 6, 298, 12, 2, '#7a3f22'); R(sx - 1, 300, 2, 12, '#5a2f1a'); R(sx - 4, 311, 8, 1, '#5a2f1a'); }
        R(tx - 16, 291, 32, 3, '#b9773f'); R(tx - 16, 293, 32, 1, '#8a522a'); R(tx - 2, 294, 4, 18, '#8a522a'); R(tx - 8, 311, 16, 2, '#6a3a1a');
        R(tx - 11, 290, 9, 1, '#ffffff'); R(tx - 10, 288, 7, 2, '#e8b25a');
        R(tx + 5, 287, 3, 4, '#ffffff'); R(tx + 8, 288, 1, 2, '#ffffff');
        for (let i = 0; i < 2; i++) { const k = fr(a * .8 + i / 2 + tx); g.globalAlpha = (1 - k) * .8; R(tx + 6 + Math.sin(k * 7) * 1.5, 285 - k * 10, 1, 2, '#ffffff'); } g.globalAlpha = 1;
      } });
    }
    drawCast(S.cast, a, extra);
    g.restore();
    finish();
  },
});

// ================================================================ COMMUTE
scene({
  name: 'commute', dur: 12, px: 2, h: [8.3, 8.9], cap: 'OFF TO WORK',
  build(S) {
    S.cue(0, 'city');
    S.ev(0, 'city', .55, { d: 12 });
    for (let t = .3; t < 4; t += 1) S.ev(t, 'tick', .5);
    S.ev(4.0, 'walkchirp', .7); for (let t = 4.3; t < 12; t += .3) S.ev(t, 'tick', .22);
    S.ev(2.4, 'hiss', .6); S.ev(3.3, 'ding', .5); S.ev(6.8, 'vroom', .6); S.ev(7.4, 'zip', .6); S.ev(6.5, 'flap', .7); S.ev(9.6, 'honk', .5);
    const G = 4.0;
    S.crowd = [];
    for (let i = 0; i < 76; i++) {
      const lane = i % 4, rank = Math.floor(i / 4);
      const waitX = 452 - rank * 17 - (lane % 2) * 8;
      const xs = waitX - 200 - rnd(i, 80) * 140 - rank * 4, v = 50 + rnd(i, 81) * 16;
      const td = G + .3 + rank * .11 + rnd(i, 82) * .2, v2 = 58 + rnd(i, 83) * 18;
      S.crowd.push({ lane, y: 452 + lane * 18, waitX, xs, v, td, v2, sd: i, acc: pick(['tie', 'cap', 'phones', 'beanie', 'bow', 'shades', 'bluetie', null, 'glasses', 'cap2'], i, 84), hold: rnd(i, 85) < .22 ? 'mug' : rnd(i, 86) < .12 ? 'phone' : null });
      CLAWDS++;
    }
    S.riders = [];
    for (let j = 0; j < 6; j++) { S.riders.push({ j, t: 3.6 + j * .3, win: j + 2, acc: pick(['tie', 'cap', null, 'bow', 'phones', 'shades'], j, 90) }); CLAWDS++; S.ev(3.6 + j * .3, 'boing', .3); }
    CLAWDS += 3;
    S.skyline = []; let x = -10;
    while (x < 960) { const w = 30 + rnd(x, 1) * 50; S.skyline.push([x, w, 120 + rnd(x, 2) * 160]); x += w + 4; }
    S.mid = []; x = -20;
    while (x < 700) { const w = 50 + rnd(x, 3) * 60; S.mid.push([x, w, 80 + rnd(x, 4) * 140]); x += w + 6; }
  },
  draw(a, S) {
    const h = lerp(8.3, 8.9, a / 12);
    drawSky(h, 380);
    clouds(h, 6, 30, 140, 6, 11);
    for (const [x, w, hh] of S.skyline) R(x, 380 - hh, w, hh, '#a9c6e6');
    for (const [x, w, hh] of S.mid) {
      R(x, 380 - hh, w, hh, '#6d88b4');
      for (let yy = 380 - hh + 6; yy < 372; yy += 10) for (let xx = x + 5; xx < x + w - 6; xx += 9) R(xx, yy, 5, 5, rnd(xx, yy) < .3 ? '#ffe9a0' : '#8fa8d0');
    }
    // HQ
    R(700, 92, 240, 290, '#2f4466'); R(700, 92, 240, 4, '#4a6694');
    for (let yy = 140; yy < 372; yy += 18) for (let xx = 712; xx < 930; xx += 22) R(xx, yy, 16, 12, fr((xx + yy) / 97) < .3 ? '#ffe9a0' : '#7fb8e8');
    R(740, 102, 160, 30, '#f6e8d8'); R(740, 102, 160, 2, '#ffffff');
    C(762, 128, { pose: 'cheer', f: Math.floor(a * 3) % 2 });
    label('CLAWD HQ', 834, 117, 30, '#a9502f');
    // road
    R(0, 380, LW, 64, '#50535e'); for (let xx = 0; xx < LW; xx += 40) R(xx, 410, 20, 2, '#e8e2c8');
    // bus
    const bx = a < 3 ? lerp(-240, 560, E.out(a / 3)) : a < 6.8 ? 560 : 560 + 320 * (a - 6.8) ** 2;
    if (bx < LW) {
      R(bx, 352, 220, 58, '#ffc531'); R(bx, 352, 220, 4, '#ffe07a'); R(bx, 396, 220, 8, '#e0a020'); R(bx + 214, 372, 6, 10, '#fff6c0');
      for (let i = 0; i < 8; i++) {
        const wx = bx + 8 + i * 25;
        R(wx, 362, 20, 18, '#bfe6ff');
        const rider = S.riders.find(r => r.win === i);
        if (!rider || a < rider.t) { g.save(); g.beginPath(); g.rect(wx, 362, 20, 18); g.clip(); C(wx + 10, 389, { pose: a > 6.8 ? 'wave' : 'stand', f: Math.floor(a * 3 + i) % 2, acc: rider ? rider.acc : pick(['cap', null, 'bow'], i, 91), face: 1 }); g.restore(); }
        R(wx, 362, 20, 2, '#ffffff');
      }
      R(bx + 207, 380, 12, 24, a > 3.3 && a < 6.6 ? '#3a3a44' : '#9fd0f0');
      for (const wx of [bx + 40, bx + 180]) { disc(wx, 410, 9, '#25262c'); disc(wx, 410, 4, '#9aa0ad'); }
      label('CLAWD BUS', bx + 110, 401, 18, '#8a5a10');
    }
    // scooter
    if (a > 7) { const sx = -40 + (a - 7) * 170; R(sx - 10, 434, 22, 2, '#3a3f4f'); disc(sx - 9, 437, 2, '#222'); disc(sx + 10, 437, 2, '#222'); R(sx + 10, 418, 2, 16, '#3a3f4f'); C(sx, 434, { pose: 'stand', acc: 'shades', face: 1 }); }
    // sidewalk
    R(0, 440, LW, 4, '#a8a296'); R(0, 444, LW, 76, '#cfc9bd');
    for (let xx = 0; xx < LW; xx += 32) R(xx, 444, 1, 76, '#bdb6a8');
    R(470, 440, 90, 80, '#50535e'); for (let xx = 474; xx < 556; xx += 12) R(xx, 446, 6, 72, '#eeeeee');
    R(0, 520, LW, 20, '#5f9a48'); for (let xx = 6; xx < LW; xx += 46) disc(xx, 522, 8, '#4f8a3c', .6);
    // traffic light
    R(461, 330, 3, 116, '#5a5f6e'); R(454, 326, 17, 34, '#2a2d35');
    disc(462, 335, 4, a < 4 ? '#ff4040' : '#5a2020'); disc(462, 351, 4, a >= 4 ? '#40ff70' : '#205a30');
    if (a >= 4) glowAt(462, 351, 14, 'rgba(80,255,120,.5)'); else glowAt(462, 335, 14, 'rgba(255,60,60,.5)');
    // pigeons
    for (let i = 0; i < 5; i++) {
      const px = 600 + i * 26, py = 512;
      if (a < 6.5 + i * .08) { const pk = fr(a * .9 + i * .3) < .2 ? 1 : 0; R(px, py - 4 + pk, 5, 4, '#7a7f94'); R(px + 4 + pk, py - 6 + pk * 2, 3, 3, '#5a5f74'); R(px + 7, py - 5 + pk * 2, 1, 1, '#ffb21a'); }
      else { const k = a - 6.5 - i * .08; bird(px + k * 70, py - 10 - k * k * 50, a, i, true); }
    }
    // crowd
    const items = [];
    for (const m of S.crowd) {
      let x, moving;
      if (a < m.td) { const xx = m.xs + m.v * a; x = Math.min(m.waitX, xx); moving = xx < m.waitX; }
      else { x = Math.min(m.waitX, m.xs + m.v * m.td) + m.v2 * (a - m.td); moving = true; }
      if (x > 1000 || x < -30) continue;
      const st = { pose: moving ? 'walk' : 'stand', f: Math.floor(a * (moving ? 8 : 2.6) + m.sd) % 2, acc: m.acc, hold: m.hold, face: 1, eyes: !moving && a < 4 ? (rnd(m.sd, 87) < .5 ? 'look' : 'up') : undefined };
      if (!moving && rnd(m.sd, 88) < .12 && a > 1) st.bubble = pick(['coffee', 'note', 'q', 'zz', 'sun'], m.sd, 89);
      if (((a * 1000 + m.sd * 997) % 3300) < 120) st.eyes = 'blink';
      items.push({ y: m.y, draw: () => { C(x, m.y, st); if (st.bubble) bubble(x + 3, m.y - 15, st.bubble, 1); } });
    }
    for (const r of S.riders) {
      if (a < r.t) continue;
      const k = clamp((a - r.t) / .45), ly = 452 + (r.j % 4) * 18;
      const x0 = bx + 213;
      let x, y, pose;
      if (k < 1) { x = lerp(570 + 207, 790 + r.j * 6, k); y = lerp(404, ly, k) - Math.sin(Math.PI * k) * 14; pose = 'jump'; }
      else { x = 790 + r.j * 6 + (a - r.t - .45) * 62; y = ly; pose = 'walk'; }
      items.push({ y, draw: () => C(x, y, { pose, f: Math.floor(a * 8 + r.j) % 2, acc: r.acc, face: 1 }) });
    }
    items.sort((p, q) => p.y - q.y).forEach(i => i.draw());
    finish();
  },
});

// ================================================================ OFFICE
function drawBug(x, y, a, s = 1, still = false) {
  const f = still ? 0 : Math.floor(a * 16) % 2;
  const P = (dx, dy, w, h, c) => R(x + dx * s, y + dy * s, w * s, h * s, c);
  for (let i = 0; i < 3; i++) { P(-3 + i * 3, 0, 1, 2 - ((i + f) % 2), '#1b1210'); }
  P(-4, -4, 8, 4, '#9b30ff'); P(-4, -4, 8, 1, '#c77dff'); P(-1, -4, 1, 4, '#5a1a99');
  P(4, -4, 3, 3, '#1b1210'); P(6, -6, 1, 2, '#1b1210'); P(5, -3, 1, 1, '#ffffff');
}
scene({
  name: 'office', dur: 24, px: 3, h: [9.2, 11.8], cap: 'SHIP IT!',
  build(S) {
    S.cue(3.9, 'chase'); S.cue(12.4, 'city2');
    S.ev(0, 'typing', .45, { d: 3.9 }); S.ev(15, 'typing', .55, { d: 4 }); S.ev(16, 'typing', .3, { d: 3 });
    S.ev(3.8, 'bugalarm', .8); S.ev(4.2, 'squeak', .8); S.ev(4.8, 'skitter', .35, { d: 7.4 });
    S.ev(4.35, 'excl', .6); S.ev(10.0, 'tumble', .9); S.ev(10.3, 'dizzy', .6, { d: 2 }); S.ev(11.95, 'swoosh', .8); S.ev(12.25, 'gotcha', .9); S.ev(14.4, 'clink', .7);
    for (let i = 0; i <= 20; i++) S.ev(15 + i * .2, 'progress', .25, { p: i });
    S.ev(19, 'tada', 1); S.ev(19.05, 'cheer', 1, { d: 3.5 }); S.ev(21, 'rocket', .7); S.ev(22.6, 'tada', .5);
    const bug = t => {
      if (t < 4.2) return { x: 320, y: 118 };
      if (t < 4.8) { const k = (t - 4.2) / .6; return { x: lerp(320, 300, k), y: lerp(118, 262, k) - Math.sin(Math.PI * k) * 30 }; }
      const u = t - 4.8; return { x: 320 + 220 * Math.sin(.8 * u), y: 262 + 48 * Math.sin(1.9 * u + .5) };
    };
    S.bug = bug;
    const bugC = t => bug(Math.max(4.85, t));
    const row = (x0, y) => [0, 1, 2, 3, 4, 5].map(i => ({ x: x0 + i * 100, y }));
    S.desks = [...row(40, 196), ...row(70, 262), ...row(40, 328)];
    const cast = [];
    const accs = ['tie', 'phones', 'glasses', 'bluetie', 'cap', 'bow', 'shades', 'tie', 'beanie', 'phones', 'bowtie', 'glasses', 'flower', 'tie', 'phones', 'cap2', 'shades', 'bluetie'];
    const chasers = [1, 3, 4, 8, 11, 13, 16];
    const Pp = bug(9.6), B = bug(12.2); S.B = B;
    const pileOff = [[-8, 0], [8, 0], [-14, -3], [14, -3], [0, -6], [-5, -11], [5, -15]];
    S.desks.forEach((d, i) => {
      const sd = i * 1.9, acc = accs[i];
      const type = (t, extra = {}) => ['wait', t, { pose: 'sittype', rate: 9, ...extra }];
      const celebrate = ['fn', 5, { fn: (k, la, st, A, a) => ({ pose: 'cheer', y: d.y - Math.round(Math.abs(Math.sin((la + sd) * 5)) * 7), bubble: la > .4 && la < 2 ? pick(['star', 'heart', 'check'], i, 3) : null }) }];
      if (i === 9) { // sleepy again
        cast.push(actor(d.x, d.y, { acc: 'nightcap', seed: sd }, [['wait', 19.1, { pose: 'sleep', zzz: 1 }], ['wait', .7, { pose: 'sit', eyes: 'wide', bubble: 'excl' }], celebrate]));
        return;
      }
      const ci = chasers.indexOf(i);
      if (ci >= 0) {
        const L = .5 + ci * .32, t0 = 5.0 + ci * .15;
        const P0 = bugC(t0 + .5 - L);
        const po = pileOff[ci];
        cast.push(actor(d.x, d.y, { acc, seed: sd }, [
          type(4.3), ['wait', t0 - 4.3, { pose: 'sit', eyes: 'wide', bubble: 'excl' }],
          ['hop', .5, { x: P0.x, y: P0.y, h: 14 }],
          ['fn', 9.6 - t0 - .5, { fn: (k, la, st, A, a) => { const p = bugC(a - L), q = bugC(a - L - .05); return { x: p.x, y: p.y, pose: 'run', face: p.x >= q.x ? 1 : -1, f: Math.floor(a * 13 + ci) % 2, eyes: 'angry' }; } }],
          ['fn', .4, { fn: (k, la, st, A, a) => { const p = bugC(9.6 - L); return { x: lerp(p.x, Pp.x + po[0], k), y: lerp(p.y, Pp.y, k), pose: 'run', f: Math.floor(a * 13) % 2 }; } }],
          ['fn', 2.4, { fn: () => ({ x: Pp.x + po[0], y: Pp.y + po[1], zy: Pp.y + ci * .1, pose: 'splat', eyes: 'x' }) }],
          ['fn', .6, { fn: (k) => ({ x: Pp.x + po[0] * 2, y: Pp.y + 6 - (ci % 3) * 6, pose: 'cheer', eyes: 'happy' }) }],
          ['walk', 2.0, { x: d.x, y: d.y }], type(4.0), celebrate]));
        return;
      }
      if (i === 6) { // the net hero
        cast.push(actor(d.x, d.y, { acc: 'cap', seed: sd }, [
          type(4.3), ['wait', 5.9, { pose: 'sit', eyes: 'wide', bubble: 'excl', bubbleDur: .8 }],
          ['wait', .6, { pose: 'stand', eyes: 'angry', bubble: 'bulb', net: 1 }],
          ['run', 1.1, { x: B.x - 16, y: B.y, net: 1 }], ['hop', .4, { x: B.x - 16, y: B.y, h: 10, net: 2 }],
          ['wait', .7, { pose: 'cheer', net: 3, bubble: 'star' }],
          ['walk', 1.2, { x: 590, y: 300, net: 3 }], ['wait', .4, { pose: 'hold', net: 3, face: 1 }],
          ['wait', .4, { pose: 'cheer', net: 1, face: 1 }],
          ['walk', 1.4, { x: d.x, y: d.y }], type(3.1), celebrate]));
        return;
      }
      cast.push(actor(d.x, d.y, { acc, seed: sd }, [type(4.3), ['wait', 1.4, { pose: 'sit', eyes: 'wide', bubble: 'excl', bubbleDur: .9 }],
        ['wait', 6.6, { pose: 'sit', eyes: 'look', face: i % 2 ? 1 : -1 }], ['wait', .7, { pose: 'cheer' }], type(6, { bubble: rnd(i, 4) < .5 ? 'bulb' : 'coffee', bubbleAt: 1 + rnd(i, 5) * 3, bubbleDur: 1.2 }), celebrate]));
    });
    S.cast = cast;
    // paper carrier on the aisle
    S.paper = actor(-20, 229, { acc: 'glasses', seed: 4 }, [['walk', 9, { x: 660, pose: 'carry', rate: 6 }], ['hide', 4], ['walk', 11, { x: -20, pose: 'carry', rate: 6 }]]);
  },
  draw(a, S) {
    const h = lerp(9.2, 11.8, a / 24);
    R(0, 0, LW, 206, '#e8eef5'); R(0, 192, LW, 14, '#cfd8e3');
    for (const wx of [20, 440]) {
      g.save(); g.beginPath(); g.rect(wx, 40, 180, 100); g.clip(); drawSky(h, 140); clouds(h, 3, 50, 90, 6, wx);
      for (let i = 0; i < 9; i++) R(wx + i * 21, 140 - 20 - rnd(i, wx) * 50, 18, 80, '#9fb8d8');
      g.restore();
      R(wx - 3, 37, 186, 3, '#ffffff'); R(wx - 3, 140, 186, 3, '#ffffff'); R(wx - 3, 37, 3, 106, '#ffffff'); R(wx + 180, 37, 3, 106, '#ffffff'); R(wx + 89, 37, 2, 106, '#ffffff');
    }
    // the big screen
    const red = a > 3.8 && a < 4.6;
    R(226, 36, 188, 108, '#222831'); R(230, 40, 180, 100, red ? (Math.floor(a * 10) % 2 ? '#5a0b1a' : '#2a0610') : '#0e1a2b');
    const bar = (p, c) => { R(250, 100, 140, 10, '#ffffff'); R(252, 102, 136, 6, '#0e1a2b'); R(252, 102, Math.round(136 * clamp(p)), 6, c); };
    if (a < 3.8) { bar(.72 * a / 3.8, '#2ecc71'); label('RUNNING TESTS...', 320, 72, 26, '#7fd4ff'); for (let i = 0; i < 4; i++) R(246, 118 + i * 5, 30 + rnd(i, Math.floor(a * 4)) * 110, 2, '#3a5a7a'); }
    else if (a < 4.6) { drawBug(312, 124, a, 5, true); label('BUG FOUND!', 320, 64, 34, '#ff5a5a'); }
    else if (a < 12.3) { if (Math.floor(a * 3) % 2) label('CATCH THAT BUG!', 320, 80, 30, '#ffd23f'); label('!!!', 320, 112, 30, '#ff5a5a'); }
    else if (a < 15) { label('BUG CAUGHT!', 320, 72, 34, '#2ecc71'); g.save(); icon('check', 314, 98); g.restore(); R(312, 96, 0, 0, '#000'); }
    else if (a < 19) { bar((a - 15) / 4, '#2ecc71'); label('RUNNING TESTS...', 320, 72, 26, '#7fd4ff'); label(Math.floor(clamp((a - 15) / 4) * 100) + '%', 320, 124, 24, '#ffffff'); }
    else if (a < 21) { label('ALL TESTS PASSED!', 320, 72, 28, '#2ecc71'); for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) if (ICON.check[j + 1][i] === '#') R(305 + i * 6, 92 + j * 6, 6, 6, '#2ecc71'); }
    else {
      label('SHIPPED!', 320, 66, 36, '#ffd23f');
      const ry = 140 - (a - 21) * 40; for (let i = 0; i < 20; i++) R(232 + rnd(i, 9) * 176, 42 + fr(rnd(i, 10) + (a - 21) * .8) * 96, 1, 2, '#ffffff');
      R(316, ry - 14, 8, 14, '#ffffff'); R(318, ry - 18, 4, 4, '#e8403b'); R(314, ry - 4, 2, 4, '#e8403b'); R(324, ry - 4, 2, 4, '#e8403b'); R(318, ry - 10, 4, 3, '#4fc3ff');
      R(317, ry, 6, 2 + Math.floor(a * 20) % 3, '#ffb21a');
    }
    if (a < 4.2) drawBug(-100, 0, a);
    // plants + cooler
    R(2, 182, 14, 14, '#c0603a'); disc(9, 176, 8, '#3e9b4f');
    R(616, 166, 16, 40, '#cfd8e3'); R(618, 152, 12, 14, '#7fd4ff');
    // floor
    R(0, 206, LW, LH - 206, '#a5b1c2'); for (let y = 218; y < LH; y += 16) R(0, y, LW, 1, '#97a3b5'); R(0, 206, LW, 2, '#8a96a8');
    // jar
    const extra = [];
    extra.push({ y: 300, draw: () => {
      g.globalAlpha = .55; R(606, 284, 14, 16, '#bfe6ff'); g.globalAlpha = 1; R(605, 282, 16, 3, '#8890a2'); R(606, 299, 14, 1, '#7fa8c8');
      if (a > 14.4) drawBug(613, 298 - (Math.floor(a * 4) % 2), a);
    } });
    const desk = (d) => ({ y: d.y + .5, draw: () => {
      const cx = d.x, y = d.y;
      R(cx - 7, y, 14, 2, '#3a3f4f'); R(cx - 1, y + 2, 2, 6, '#3a3f4f'); R(cx - 6, y + 8, 12, 2, '#3a3f4f');
      R(cx + 2, y - 3, 42, 3, '#c8a27a'); R(cx + 2, y, 42, 1, '#9a7550'); R(cx + 4, y, 2, 10, '#9a7550'); R(cx + 40, y, 2, 10, '#9a7550');
      R(cx + 8, y - 5, 12, 2, '#9aa3b5'); R(cx + 19, y - 17, 2, 12, '#5a6170'); R(cx + 18, y - 16, 1, 10, '#9fe3ff');
      R(cx + 28, y - 7, 3, 4, '#ffffff');
    } });
    for (const d of S.desks) extra.push(desk(d));
    // bug
    const caught = a >= 12.2;
    if (a >= 4.2 && !caught) { const p = S.bug(a), q = S.bug(a - .05); extra.push({ y: p.y, draw: () => { g.save(); if (p.x < q.x) { g.translate(Math.round(p.x) * 2, 0); g.scale(-1, 1); } drawBug(Math.round(p.x), Math.round(p.y), a); g.restore(); } }); }
    drawCast([...S.cast, S.paper], a, extra);
    // paper stack, net and dizzy stars drawn on top
    const ps = actorState(S.paper, a);
    if (ps) for (let i = 0; i < 7; i++) R(ps.x - 5 + Math.round(Math.sin(a * 4 + i * .6) * i * .4), ps.y - 19 - i * 2, 11, 2, i % 2 ? '#ffffff' : '#e8eef5');
    const hero = actorState(S.cast[6], a);
    if (hero && hero.net) {
      const f = hero.face || 1; let hx = hero.x + f * 18, hy = hero.y - 18;
      if (hero.net === 2) { const k = clamp((a - (S.cast[6].segs.find(s => s.p.net === 2).t0)) / .4); hx = hero.x + f * lerp(6, 20, k); hy = hero.y - lerp(28, 6, k); }
      line(hero.x + f * 8, hero.y - 8, hx - f * 3, hy + 3, '#8a5a32');
      g.globalAlpha = .6; disc(hx, hy, 5, '#ffffff'); g.globalAlpha = 1; disc(hx, hy, 3, '#e8eef5');
      if (hero.net === 3 || (hero.net === 2 && a > 12.2)) drawBug(hx, hy + 2, a);
    }
    if (a > 10.1 && a < 12.4) { const P = S.bug(9.6); for (let i = 0; i < 4; i++) { const an = a * 4 + i * Math.PI / 2; sparkle(P.x + Math.cos(an) * 12, P.y - 26 + Math.sin(an) * 3, a + i, '#ffd23f'); } }
    if (a > 19) confetti(0, LW, -10, a - 19, 140, 5, 60);
    finish();
  },
});
