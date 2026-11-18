// Shared parts of the tutorial video maker (docs/tutorial-videos.md): the click tests' harness (tests/lib.js) on a fixed,
// quiet day, the two cuts, opening the book for filming and catching its frames.
// Every video is filmed on the Firebase stand-in (tests/fake/) with made-up people and lines. Nothing here reads or
// writes the real book: any request that leaves this computer is refused and listed in the film's log.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..', '..');

// The day every video is filmed on: Tuesday 16 June 2026, 14:00 Queensland time. tests/lib.js fixes its clock (NOW) and
// files its seed under the day Date.now() gives when it loads, so Date.now() says this day for that one moment.
export const DAY = Date.parse('2026-06-16T04:00:00Z');
const realNow = Date.now;
Date.now = () => DAY;
export const L = require(path.join(ROOT, 'tests', 'lib.js'));
Date.now = realNow;

// Desktop is the book at 1280 x 720 drawn 1.2 times (1536 x 864, the app's box in the 1920 x 1080 frame).
// Phone is the book at 390 x 844 drawn twice as fine (780 x 1688), shown 1440 px high in the 1080 x 1920 frame.
export const CUTS = {
  desktop: { width: 1280, height: 720, scale: 1.2, touch: false, frame: [1920, 1080] },
  phone: { width: 390, height: 844, scale: 2, touch: true, frame: [1080, 1920] }
};

// A Chrome for one cut. Headless Chrome's screencast sends pictures at the page's own size (390 x 844) whatever the
// context's scale, unless the whole browser is told to draw finer, so each cut gets its own browser.
export async function launch(scale) {
  const o = L.chromeOpts();
  const b = await L.chromium.launch(Object.assign({}, o, { args: (o.args || []).concat(['--force-device-scale-factor=' + (scale || 1)]) }));
  const raw = b.newContext.bind(b);
  b.newContext = async opts => {
    const ctx = await raw(opts), close = ctx.close.bind(ctx);
    // like the click tests' teardown (tests/lib.js): no route left answering while the pages close
    ctx.close = async () => { await ctx.unrouteAll({ behavior: 'ignoreErrors' }).catch(() => {}); return close(); };
    return ctx;
  };
  return b;
}

const FONT_DIR = 'docs/order-list-options/assets/';
const fontCss = () => fs.readFileSync(path.join(ROOT, FONT_DIR, 'fonts.css'), 'utf8').replace(/url\(([^)]+)\)/g, (m, f) => 'url(' + L.BASE + FONT_DIR + f + ')');

// Opens one page of the book for a cut, the way the click tests do (L.open), plus: drawn finer for a crisp picture,
// the book's own fonts from the repo's local copies, the security header set aside so the chalk layer can be added,
// and every request to another computer refused and noted.
export async function openApp(browser, hash, cut, o) {
  const c = CUTS[cut], blocked = [];
  const raw = browser.newContext;
  browser.newContext = async opts => {
    const ctx = await raw(Object.assign({}, opts, { deviceScaleFactor: c.scale, bypassCSP: true, locale: 'en-AU' }));
    // registered first, so the stand-ins tests/lib.js adds after it (Firebase, fonts, pdf.js) answer before this does
    await ctx.route(u => !u.href.startsWith(L.BASE) && !/^(data|blob):/.test(u.href), r => { blocked.push(r.request().url()); return r.abort(); });
    const newPage = ctx.newPage.bind(ctx);
    ctx.newPage = async () => {
      const p = await newPage();
      // a page's own route wins over the context's: the book's fonts instead of the empty stand-in
      await p.route(/fonts\.googleapis\.com\/css2/, r => r.fulfill({ status: 200, contentType: 'text/css', body: fontCss() }));
      return p;
    };
    return ctx;
  };
  let page;
  try {
    page = await L.open(browser, hash, Object.assign({ width: c.width, height: c.height, touch: c.touch, wait: 1600 }, o || {}));
  } finally { browser.newContext = raw; }
  page.blocked = blocked;
  await page.evaluate(() => document.fonts.ready);
  await L.settle(page, 400);
  return page;
}

// Catches every frame the page paints (Chrome's screencast), with the time it was painted. Frames come only when the
// picture changes; compose.mjs holds each one until the next.
export async function startFilm(page, dir, size) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const cdp = await page.context().newCDPSession(page), frames = [];
  let n = 0;
  cdp.on('Page.screencastFrame', f => {
    const file = 'f' + String(n++).padStart(6, '0') + '.jpg';
    fs.writeFileSync(path.join(dir, file), Buffer.from(f.data, 'base64'));
    frames.push({ file, t: f.metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: size[0], maxHeight: size[1], everyNthFrame: 1 });
  // a paint nobody can see (one pixel, almost clear, gone the next frame), so the screencast sends the picture now
  const poke = () => page.evaluate(() => { const d = document.createElement('i'); d.style.cssText = 'position:fixed;width:1px;height:1px;opacity:.01;left:0;top:0;pointer-events:none'; document.documentElement.appendChild(d); requestAnimationFrame(() => requestAnimationFrame(() => d.remove())); }).catch(() => {});
  const film = {
    frames,
    poke,
    now: () => Date.now() / 1000,
    async stop() {
      // one last paint, so the final picture is held to the end
      await poke();
      await new Promise(r => setTimeout(r, 300));
      const end = Date.now() / 1000;
      await cdp.send('Page.stopScreencast').catch(() => {});
      await new Promise(r => setTimeout(r, 200));
      fs.writeFileSync(path.join(dir, 'frames.json'), JSON.stringify({ frames, end }, null, 1));
      return { frames, end };
    }
  };
  // wait for the first frame, so the film's start is known
  const t0 = Date.now();
  while (!frames.length && Date.now() - t0 < 5000) {
    await poke();
    await new Promise(r => setTimeout(r, 80));
  }
  if (!frames.length) throw new Error('the screencast sent no picture in 5 s');
  return film;
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));
