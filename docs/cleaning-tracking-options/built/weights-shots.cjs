/* Step 3 as built: Repeat tasks' weights line and the Weights and days list, on the click-test stand-in (26 Nov 2026).
     OUT=<this folder> node <this file>     (from the repo root, with the click tests' packages)
   Synthetic jobs: the three built-in lists, two weights already saved, two chosen and not saved. */
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
extra[key('cleaningPlan', 'main')] = { v: 1, w: { 'clean-template-sc-grill-01': 1, 'clean-template-sc-hot-02': 3 }, k: { 'clean-template-sc-hot-02': 'Behind equipment' }, at: L.NOW - DAY, by: 'sam' };
const fonts = p => p.addStyleTag({ content: ['barlow:Barlow:400', 'barlow-600:Barlow:600', 'barlow-700:Barlow:700', 'barlow-condensed:Barlow Condensed:700', 'caveat:Caveat:700'].map(f => { const [file, fam, w] = f.split(':'); return "@font-face{font-family:'" + fam + "';font-weight:" + w + ";src:url('/docs/cleaning-chef-options/fonts/" + file + ".woff2') format('woff2')}"; }).join('') }).then(() => p.evaluate(() => document.fonts.ready));
(async () => {
  const port = 20000 + Math.floor(Math.random() * 20000); await new Promise(r => server.listen(port, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + port + '/', b = await L.start(), out = {};
  for (const width of [390, 768, 1280]) {
    const height = width === 390 ? 844 : 900, p = await L.open(b, '#/cleaning', { who: 'sam', width, height, base, extra, wait: 1000 });
    await L.waitFor(p, () => { const pg = document.querySelector('.cln-page'); return pg && !/Loading cleaning/.test(pg.textContent); }); await fonts(p);
    await p.click('[data-cln="setup"]'); await L.waitFor(p, () => !!document.querySelector('.cln-weights-notice'), null, 6000); await L.settle(p, 300);
    out['repeat-' + width] = await p.evaluate(() => ({ screensLong: Math.round(document.documentElement.scrollHeight / innerHeight * 10) / 10, lineTop: Math.round(document.querySelector('.cln-weights-notice').getBoundingClientRect().top) }));
    await p.evaluate(() => document.querySelector('.cln-weights-notice').scrollIntoView({ block: 'center' })); await L.settle(p, 200);
    await p.screenshot({ path: path.join(OUT, 'weights-line-' + width + '.png') });
    await p.click('[data-cln="weights"]'); await L.settle(p, 400);
    await p.click('.cln-weigh-row[data-template="clean-template-sc-pans-02"] [data-w="2"]'); await p.click('.cln-weigh-row[data-template="clean-template-sc-fry-01"] [data-w="1"]');
    await p.evaluate(() => scrollTo(0, 0)); await L.settle(p, 300);
    out['weights-' + width] = await p.evaluate(() => { const floor = Math.min(document.querySelector('.cln-weigh-dock').getBoundingClientRect().top, innerHeight);
      return { screensLong: Math.round(document.documentElement.scrollHeight / innerHeight * 10) / 10, wholeRowsOnFirstScreen: [...document.querySelectorAll('.cln-weigh-row')].filter(e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= floor; }).length, sideways: document.documentElement.scrollWidth > innerWidth }; });
    await p.screenshot({ path: path.join(OUT, 'weights-' + width + '.png') });
    const tall = await p.evaluate(() => document.documentElement.scrollHeight); await p.setViewportSize({ width, height: Math.max(tall, height) }); await L.settle(p, 250);
    await p.screenshot({ path: path.join(OUT, 'weights-' + width + '-full.png'), fullPage: true });
    if (p.errors.length) out['errors-' + width] = p.errors; await p.context().close();
  }
  fs.writeFileSync(path.join(OUT, 'weights-counts.json'), JSON.stringify({ kind: 'Implemented app, click-test stand-in, synthetic data', viewports: '390 x 844, 768 x 900, 1280 x 900', results: out }, null, 1) + '\n');
  console.log(JSON.stringify(out)); await b.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
