// Screenshots and measures the design previews (Preview, on the static snapshot of the real page: real shell, rows and
// dock, fallback fonts, the study's made-up day at 18:30). Serve the repo on 127.0.0.1:8777 (tests/serve.js), then run
// from tests/:  CHROME=<headless shell> node ../docs/team-short-ok-options/verify.cjs [designs]
const path = require('path'), fs = require('fs');
const { chromium } = require(path.resolve(__dirname, '../../tests/node_modules/playwright-core'));
const OUT = __dirname, BASE = 'http://127.0.0.1:8777/docs/team-short-ok-options/';
const designs = (process.argv[2] || 'a,b,c').split(',');
const STATES = ['short', 'edit', 'accept', 'accepted', 'worse', 'fail', 'fixed'];
const measure = p => p.evaluate(() => {
  const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); };
  const bg = e => { while (e) { const b = getComputedStyle(e).backgroundColor; if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) return b; e = e.parentElement; } return 'rgb(255,255,255)'; };
  const ratio = e => { if (!e) return null; const a = lum(getComputedStyle(e).color), b = lum(bg(e)); return Math.round((Math.max(a, b) + .05) / (Math.min(a, b) + .05) * 100) / 100; };
  const dock = document.querySelector('.tm-focus-save'), dr = dock.getBoundingClientRect(), head = document.querySelector('.tm-planhead').getBoundingClientRect();
  let bottom = innerHeight; const nav = document.querySelector('.tabbar'); if (nav && nav.getClientRects().length) { const r = nav.getBoundingClientRect(); if (r.top > innerHeight / 2) bottom = Math.min(bottom, r.top); }
  bottom = Math.min(bottom, dr.top);
  const top = head.top <= 200 && head.top >= 0 ? head.bottom : 0;
  const vis = [...document.querySelectorAll('.tm-tlrow')].map(e => e.getBoundingClientRect());
  const tf = document.querySelector('.pv-tf'), acc = document.querySelector('.pv-accept'), fact = document.querySelector('.pv-fact'), more = document.querySelector('.pv-more'), quiet = document.querySelector('.pv-quiet, .pv-headline.is-ok'), ptr = document.querySelector('.pv-pointer b');
  const warn = document.querySelector('.pv-band, .pv-headline, .pv-pointer, .pv-quiet');
  return { dockH: Math.round(dr.height), headH: Math.round(head.height), workTop: Math.round(top), workBottom: Math.round(bottom),
    listPx: Math.max(0, Math.round(bottom - top)), rowsFull: vis.filter(r => r.top >= top - .5 && r.bottom <= bottom + .5).length, rowsAny: vis.filter(r => r.bottom > top && r.top < bottom).length,
    warnOnScreen: !!warn && (() => { const r = warn.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.height > 0; })(),
    words: [...document.querySelectorAll('.pv-band, .pv-headline, .pv-pointer, .pv-quiet')].map(e => e.innerText.replace(/\s+/g, ' ').trim()).join(' | '),
    marks: [...document.querySelectorAll('.tm-short-mark:not([hidden])')].map(e => e.dataset.id).join(','),
    acceptH: acc ? Math.round(acc.getBoundingClientRect().height) : 0, acceptW: acc ? Math.round(acc.getBoundingClientRect().width) : 0,
    contrast: { tooFew: ratio(tf), fact: ratio(fact), more: ratio(more), accept: ratio(acc), quiet: ratio(quiet), pointer: ratio(ptr) },
    overflow: document.documentElement.scrollWidth > innerWidth };
});
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] }), out = {};
  const page = async (url, w) => { const c = await b.newContext({ viewport: { width: w, height: w > 1000 ? 900 : 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce' }); const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); await p.goto(url); await p.waitForTimeout(250); return p; };
  const toWork = p => p.evaluate(() => { const h = document.querySelector('.tm-planhead'); window.scrollTo(0, h.getBoundingClientRect().top + scrollY - 60); });
  for (const d of designs) {
    out[d] = {};
    for (const [role, w] of [['admin', 390], ['team', 390], ['admin', 1280]]) {
      for (const s of STATES) {
        if (w === 1280 && !['short', 'accepted'].includes(s)) continue;
        const p = await page(BASE + d + '-' + role + '.html?s=' + s, w);
        const first = await measure(p);
        const tag = d + '-' + role + '-' + w + '-' + s;
        if (s === 'short' || (w === 390 && role === 'admin')) await p.screenshot({ path: path.join(OUT, 'shot-' + tag + '.png') });
        await toWork(p); await p.waitForTimeout(80);
        const working = await measure(p);
        if (w === 390 && ['short', 'accepted'].includes(s)) await p.screenshot({ path: path.join(OUT, 'shot-' + tag + '-working.png') });
        out[d][role + '-' + w + '-' + s] = { first, working: { listPx: working.listPx, rowsFull: working.rowsFull, rowsAny: working.rowsAny, dockH: working.dockH, headH: working.headH, warnOnScreen: working.warnOnScreen }, errors: p.errs };
        await p.context().close();
      }
    }
    if (d === 'z') continue;
    // the main task: accept the short time from the first screen of a saved plan, counting taps (admin 390)
    { const p = await page(BASE + d + '-admin.html?s=short', 390); let taps = 0, scrolled = false;
      if (!await p.locator('.pv-accept').isVisible() || !(await p.locator('.pv-accept').boundingBox())) { await toWork(p); scrolled = true; }
      const bb = await p.locator('.pv-accept').boundingBox(); if (bb.y < 0 || bb.y > 844) { await p.locator('.pv-accept').scrollIntoViewIfNeeded(); scrolled = true; }
      await p.locator('.pv-accept').click(); taps++; await p.waitForTimeout(150);
      if (await p.evaluate(() => PV.state) !== 'saving' && await p.evaluate(() => PV.state) !== 'accepted') { await p.locator('.pv-save').click(); taps++; }
      await p.waitForTimeout(1200);
      out[d].acceptTask = { taps, scrolled, end: await p.evaluate(() => PV.state), words: (await measure(p)).words };
      await p.context().close(); }
  }
  fs.writeFileSync(path.join(OUT, 'verify-' + designs.join('') + '.json'), JSON.stringify(out, null, 2));
  for (const d of designs) { console.log('== ' + d, JSON.stringify(out[d].acceptTask || {})); for (const k in out[d]) if (k !== 'acceptTask') { const v = out[d][k]; console.log(k, 'dock', v.first.dockH, 'head', v.first.headH, 'list', v.working.listPx, 'rows', v.working.rowsFull + '/' + v.working.rowsAny, 'warn1st', v.first.warnOnScreen, 'warnWork', v.working.warnOnScreen, 'acc', v.first.acceptW + 'x' + v.first.acceptH, JSON.stringify(v.first.contrast), v.first.overflow ? 'OVERFLOW' : '', v.errors.length ? 'ERR ' + v.errors : ''); } }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
