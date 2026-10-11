// Offline renderer for UPDATE MY PRIORS (env RES=540 for drafts, FINAL=1 hides the animatic overlay).
// Drives index.html in headless Chromium and pipes frames to ffmpeg.
//   node render.js meta                 -> prints duration and fps
//   node render.js stills 3.2 15 40.5   -> writes build/still_<t>.png
//   node render.js video [workers]      -> writes build/frames.mp4 (silent)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname, OUT = path.join(ROOT, '..', 'build');
fs.mkdirSync(OUT, { recursive: true });
const URL = 'file://' + path.join(ROOT, 'index.html') + '?render=1' + (process.env.RES ? '&res=' + process.env.RES : '') + (process.env.FINAL ? '&final=1' : '');

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  await page.goto(URL);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 30000 });
  return page;
}
const grab = (page, t, type = 'image/png') => page.evaluate(([t, type]) => {
  window.renderAt(t); return document.getElementById('c').toDataURL(type, .95).split(',')[1];
}, [t, type]);

async function main() {
  const [mode, ...args] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--force-color-profile=srgb'] });
  const page = await openPage(browser);
  const meta = await page.evaluate(() => window.META);
  if (mode === 'meta') console.log('duration', meta.duration.toFixed(2), 'fps', meta.fps);
  if (mode === 'stills') {
    for (const a of args) {
      const b64 = await grab(page, parseFloat(a));
      fs.writeFileSync(path.join(OUT, `still_${a}.png`), Buffer.from(b64, 'base64'));
    }
  }
  if (mode === 'video') {
    const workers = parseInt(args[0] || '4');
    const total = Math.ceil(meta.duration * meta.fps);
    const per = Math.ceil(total / workers);
    const t0 = Date.now(); let done = 0;
    const job = async (w) => {
      const p = w === 0 ? page : await openPage(browser);
      const f0 = w * per, f1 = Math.min(total, f0 + per);
      const seg = path.join(OUT, `seg${w}.mp4`);
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(meta.fps), '-c:v', 'png', '-i', '-',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-tune', 'animation', seg], { stdio: ['pipe', 'inherit', 'inherit'] });
      for (let f = f0; f < f1; f++) {
        const b64 = await grab(p, f / meta.fps);
        const buf = Buffer.from(b64, 'base64');
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
        done++;
        if (done % 150 === 0) console.log(`${done}/${total} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      }
      ff.stdin.end();
      await new Promise(r => ff.on('close', r));
      return seg;
    };
    const segs = await Promise.all([...Array(workers).keys()].map(job));
    fs.writeFileSync(path.join(OUT, 'segs.txt'), segs.map(s => `file '${s}'`).join('\n'));
    await new Promise(r => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(OUT, 'segs.txt'), '-c', 'copy', path.join(OUT, 'frames.mp4')], { stdio: 'inherit' }).on('close', r));
    console.log('video done in', ((Date.now() - t0) / 1000).toFixed(0), 's');
  }
  await browser.close();
}
main().catch(e => { console.error(e); process.exit(1); });
