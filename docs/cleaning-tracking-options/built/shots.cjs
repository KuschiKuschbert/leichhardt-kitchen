/* Step 2 as built: the Inbox's Missed row and that night in Records, on the click-test stand-in (26 Nov 2026).
     OUT=<this folder> node <this file>     (from the repo root, with the click tests' packages)
   Synthetic data, made-up people. Writes the pictures and counts.json into OUT. */
const path = require('path'), fs = require('fs'), ROOT = process.cwd(), OUT = process.env.OUT;
const L = require(path.join(ROOT, 'tests/lib')), server = require(path.join(ROOT, 'tests/serve'));
const key = (...p) => ['kitchens', L.PIN, ...p].join('/'), DAY = 86400000, day = n => L.ymd(new Date(L.NOW - n * DAY));
const whole = o => Object.assign({ cv: 2, due: 52, done: 47, miss: [], missN: 0, unable: [], unableN: 0, wait: [], waitN: 0, ev: 4, evRec: 4, r: [], rN: 0, rn: { due: 0, done: 0, miss: 0, unable: 0, wait: 0 } }, o);
const pizza = (st, more) => Object.assign({ k: 'w1', t: 'Clean behind the pizza ovens', s: 'hot', sn: 'Hot larder', st }, more || {});
const counts = {
  [day(1)]: whole({ miss: ['Clean behind the pizza ovens', 'Clean the shelves above the pass', 'Fryer oil change'], missN: 3, unable: [{ t: 'Deep clean the oil filter machine', n: 'No degreaser' }], unableN: 1,
    r: [pizza('m'), { k: 'w4', t: 'Clean out the fridges', s: 'hot', sn: 'Hot larder', st: 'd', by: 'Lou', at: '21:40' }, { k: 'w2', t: 'Clean the shelves above the pass', s: '', sn: '', st: 'm' },
      { k: 'w3', t: 'Clean the drawers', s: 'grill', sn: 'Grill', st: 'd', by: 'Bo', at: '22:05' }, { k: 'w5', t: 'Deep clean the oil filter machine', s: 'hot', sn: 'Hot larder', st: 'u', n: 'No degreaser' }],
    rN: 5, rn: { due: 4, done: 2, miss: 2, unable: 1, wait: 0 }, ro: [{ s: 'hot', k: 'l', pk: 1, w: [{ n: 'Lou', sh: 'dinner', by: 'p' }, { n: 'Vic', sh: 'dinner', by: 'k' }] }] }),
  [day(8)]: whole({ r: [pizza('m')], rN: 1, rn: { due: 1, done: 0, miss: 1, unable: 0, wait: 0 }, missN: 1, miss: ['Clean behind the pizza ovens'] }),
  [day(15)]: whole({ r: [pizza('d', { by: 'Lou', at: '21:55' })], rN: 1, rn: { due: 1, done: 1, miss: 0, unable: 0, wait: 0 } })
};
const rows = []; for (let i = 30; i >= 1; i--) rows.push({ day: day(i), p: { n: 20, w: 18, t: 17, r: 2, sec: {}, mins: {}, who: {} }, w: { n: 0, reason: {}, sec: {}, items: [] }, x: { out: 0, in: 0 }, fs: { v: 1, del: [], c: counts[day(i)] || whole({}), cool: { k: 'none' } } });
const extra = { [key('analysis', 'dashboard')]: { v: 1, generation: 'g1', at: L.NOW - 11 * 3600000, from: day(30), to: day(1), days: rows, cleanFrom: day(25), needs: { links: 0 } }, [key('analysis', 'health')]: { at: L.NOW - 11 * 3600000, status: 'ok' },
  [key('config', 'main')]: { ...L.seed()[key('config', 'main')], kitSecs: [{ id: 'hot', name: 'Hot larder' }, { id: 'grill', name: 'Grill' }], kitShifts: [{ id: 'dinner', name: 'Dinner', from: 960, to: 1320 }] } };
const fonts = p => p.addStyleTag({ content: ['barlow:Barlow:400', 'barlow-600:Barlow:600', 'barlow-700:Barlow:700', 'barlow-condensed:Barlow Condensed:700', 'caveat:Caveat:700'].map(f => { const [file, fam, w] = f.split(':'); return "@font-face{font-family:'" + fam + "';font-weight:" + w + ";src:url('/docs/cleaning-chef-options/fonts/" + file + ".woff2') format('woff2')}"; }).join('') }).then(() => p.evaluate(() => document.fonts.ready));
(async () => {
  const port = 20000 + Math.floor(Math.random() * 20000); await new Promise(r => server.listen(port, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + port + '/', b = await L.start(), out = {};
  for (const width of [390, 768, 1280]) {
    const height = width === 390 ? 844 : 900, p = await L.open(b, '#/admin', { admin: true, adminPage: '', who: '', width, height, base, extra, wait: 2200 });
    await fonts(p); await L.waitFor(p, () => !!document.querySelector('.dsh-need-miss'), null, 8000); await L.settle(p, 400);
    out['inbox-' + width] = await p.evaluate(() => { const r = document.querySelector('.dsh-need-miss').getBoundingClientRect(), b = document.querySelector('.dsh-need-miss button').getBoundingClientRect(); return { screensLong: Math.round(document.documentElement.scrollHeight / innerHeight * 10) / 10, rowTop: Math.round(r.top), rowHeight: Math.round(r.height), rowOnFirstScreen: r.bottom <= innerHeight - (innerWidth < 720 ? 68 : 0), button: Math.round(b.width) + 'x' + Math.round(b.height), sideways: document.documentElement.scrollWidth > innerWidth }; });
    await p.screenshot({ path: path.join(OUT, 'inbox-' + width + '.png') });
    await p.evaluate(() => document.querySelector('.dsh-need-miss button').click());
    await L.waitFor(p, () => !!document.querySelector('#rec-clean-sec'), null, 8000); await L.settle(p, 500);
    out['records-night-' + width] = await p.evaluate(() => { const h = document.querySelector('#rec-clean-sec').getBoundingClientRect(), m = document.querySelector('.rec-miss').getBoundingClientRect(), f = document.querySelector('.rec-who').getBoundingClientRect(), floor = innerHeight - (innerWidth < 720 ? 68 : 0);
      return { screensLong: Math.round(document.documentElement.scrollHeight / innerHeight * 10) / 10, headingTopAfterTheInboxButton: Math.round(h.top), missBlockWholeOnScreen: m.top >= 0 && m.bottom <= floor, fold: Math.round(f.width) + 'x' + Math.round(f.height), focus: document.activeElement.id, sideways: document.documentElement.scrollWidth > innerWidth }; });
    await p.screenshot({ path: path.join(OUT, 'records-night-' + width + '.png') });
    await p.evaluate(() => document.querySelector('.rec-who').click()); await L.settle(p, 300);
    await p.screenshot({ path: path.join(OUT, 'records-night-open-' + width + '.png') });
    await p.evaluate(() => scrollTo(0, 0)); await L.settle(p, 200);
    out['records-night-' + width].headingTopFromThePageTop = await p.evaluate(() => Math.round(document.querySelector('#rec-clean-sec').getBoundingClientRect().top + scrollY));
    const tall = await p.evaluate(() => document.documentElement.scrollHeight); await p.setViewportSize({ width, height: Math.max(tall, height) }); await L.settle(p, 250);
    await p.screenshot({ path: path.join(OUT, 'records-night-open-' + width + '-full.png'), fullPage: true });
    if (p.errors.length) out['errors-' + width] = p.errors; await p.context().close();
  }
  fs.writeFileSync(path.join(OUT, 'counts.json'), JSON.stringify({ kind: 'Implemented app, click-test stand-in, synthetic data', viewports: '390 x 844, 768 x 900, 1280 x 900', results: out }, null, 1) + '\n');
  console.log(JSON.stringify(out)); await b.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
