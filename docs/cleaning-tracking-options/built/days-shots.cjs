/* Step 4a as built: What each day takes, on Weights and days, on the click-test stand-in (26 Nov 2026).
     OUT=<this folder> node <this file>     (from the repo root, with the click tests' packages)
   Synthetic jobs and a made-up team count: 28 days, Monday quiet, Tuesday busy. The head chef has opened the fold and
   tapped Use the suggestions; nothing is saved. Then a sous chef with saved days: the same chips. */
const path = require('path'), fs = require('fs'), ROOT = process.cwd(), OUT = process.env.OUT;
const L = require(path.join(ROOT, 'tests/lib')), server = require(path.join(ROOT, 'tests/serve')), schedule = require(path.join(ROOT, 'js/cleaning-schedule'));
const key = (...p) => ['kitchens', L.PIN, ...p].join('/'), OPEN = 253402178400000, DAY = 86400000;
const SECS = [['grill', 'Grill'], ['pans', 'Pans'], ['fry', 'Fryers, salads and dessert'], ['hot', 'Hot larder']], extra = {};
schedule.drafts().concat(schedule.packDownDrafts(), schedule.sectionDrafts()).forEach(d => {
  const id = 'clean-template-' + d.plan.template, g = schedule.sectionGroupOf(d), sec = SECS.find(s => s[0] === g);
  extra[key('cleaningTasks', id)] = { ...d, shared: !sec, section: sec ? sec[0] : '', sectionName: sec ? sec[1] : '', root: id, prev: '', next: '', from: L.NOW - 20 * DAY, until: OPEN, at: L.NOW - 20 * DAY, by: 'sam' };
});
SECS.forEach(([id, name]) => { extra[key('sections', id)] = { name, uses: 5, hidden: false }; });
extra[key('config', 'main')] = { ...L.seed()[key('config', 'main')], kitSecs: SECS.map(([id, name]) => ({ id, name })) };
const dayN = i => new Date(L.NOW + 10 * 3600000 - i * DAY).toISOString().slice(0, 10), dow = d => new Date(d + 'T00:00:00Z').getUTCDay(), ON = [6, 3, 6, 6, 5, 7, 8], days = [];
for (let i = 28; i >= 1; i--) { const d = dayN(i); days.push({ day: d, s: Array.from({ length: ON[dow(d)] }, (x, n) => ({ p: 'cook' + n, sec: 'Grill', sh: 'dinner' })) }); }
extra[key('teamsum', 'main')] = { v: 1, at: L.NOW - 11 * 3600000, day: dayN(0), from: dayN(28), to: dayN(1), days, usual: {}, learn: {} };
const fonts = p => p.addStyleTag({ content: ['barlow:Barlow:400', 'barlow-600:Barlow:600', 'barlow-700:Barlow:700', 'barlow-condensed:Barlow Condensed:700', 'caveat:Caveat:700'].map(f => { const [file, fam, w] = f.split(':'); return "@font-face{font-family:'" + fam + "';font-weight:" + w + ";src:url('/docs/cleaning-chef-options/fonts/" + file + ".woff2') format('woff2')}"; }).join('') }).then(() => p.evaluate(() => document.fonts.ready));
const go = async (b, base, o, width) => {
  const p = await L.open(b, '#/cleaning', { width, height: width === 390 ? 844 : 900, base, extra: Object.assign({}, extra, o.extra || {}), wait: 1000, ...o.open });
  await L.waitFor(p, () => { const pg = document.querySelector('.cln-page'); return pg && !/Loading cleaning/.test(pg.textContent); }); await fonts(p);
  await p.click('[data-cln="setup"]'); await L.waitFor(p, () => !!document.querySelector('[data-cln="weights"]'), null, 6000);
  await p.click('[data-cln="weights"]'); await L.waitFor(p, () => !!document.querySelector('.cln-days'), null, 6000); await L.settle(p, 300);
  if (o.closed) o.closed.v = await p.evaluate(() => { const floor = Math.min(document.querySelector('.cln-weigh-dock').getBoundingClientRect().top, innerHeight);
    return { daysHeight: Math.round(document.querySelector('.cln-days').getBoundingClientRect().height), screensLong: Math.round(document.documentElement.scrollHeight / innerHeight * 10) / 10, wholeRowsOnFirstScreen: [...document.querySelectorAll('.cln-weigh-row')].filter(e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= floor; }).length }; });
  await p.click('[data-cln="days-fold"]'); await L.waitFor(p, () => !/Reading the team/.test(document.querySelector('.cln-days').textContent), null, 6000); return p;
};
(async () => {
  const port = 20000 + Math.floor(Math.random() * 20000); await new Promise(r => server.listen(port, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + port + '/', b = await L.start(), out = {};
  for (const width of [390, 768, 1280]) {
    const closed = {}, p = await go(b, base, { open: { admin: true }, closed }, width); out['closed-' + width] = closed.v;
    await p.click('[data-cln="days-suggest"]'); await L.settle(p, 200);
    await p.evaluate(() => document.querySelector('.cln-days').scrollIntoView({ block: 'start' })); await L.settle(p, 200);
    out['head-' + width] = await p.evaluate(() => { const d = document.querySelector('.cln-days').getBoundingClientRect(), first = document.querySelector('.cln-weigh-row');
      return { daysHeight: Math.round(d.height), screensLong: Math.round(document.documentElement.scrollHeight / innerHeight * 10) / 10, firstJobBelow: Math.round(first.getBoundingClientRect().top - d.bottom), sideways: document.documentElement.scrollWidth > innerWidth }; });
    await p.screenshot({ path: path.join(OUT, 'days-' + width + '.png') });
    if (p.errors.length) out['errors-' + width] = p.errors; await p.context().close();
  }
  const s = await go(b, base, { open: { who: 'sam' }, extra: { [key('cleaningPlan', 'main')]: { v: 1, w: {}, d: [3, 2, 3, 3, 2, 1, 1], at: L.NOW - DAY, by: 'head' } } }, 390);
  await s.evaluate(() => document.querySelector('.cln-days').scrollIntoView({ block: 'start' })); await L.settle(s, 200);
  await s.screenshot({ path: path.join(OUT, 'days-sous-390.png') }); await s.context().close();
  fs.writeFileSync(path.join(OUT, 'days-counts.json'), JSON.stringify({ kind: 'Implemented app, click-test stand-in, synthetic data', viewports: '390 x 844, 768 x 900, 1280 x 900', results: out }, null, 1) + '\n');
  console.log(JSON.stringify(out)); await b.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
