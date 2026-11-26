/* Step 4b as built: Suggest the days, on Weights and days, on the click-test stand-in (26 Nov 2026).
     OUT=<this folder> node <this file>     (from the repo root, with the click tests' packages)
   The three built-in lists with the council's made-up weights and kinds, Cleaning off for the team, the head chef's
   days not saved (his starting days). Seven made-up medium jobs on a Friday, so the save needs three batches.
   Pictures: the changes as suggested; a save part done (one job refused, the first batch's answer lost, the rest
   waiting); Cleaning on. Nothing here is the kitchen's data. */
const path = require('path'), fs = require('fs'), ROOT = process.cwd(), OUT = process.env.OUT;
const L = require(path.join(ROOT, 'tests/lib')), server = require(path.join(ROOT, 'tests/serve')), schedule = require(path.join(ROOT, 'js/cleaning-schedule'));
const EX = require(path.join(ROOT, 'tests/cleaning-plan-jobs')).EX;
const key = (...p) => ['kitchens', L.PIN, ...p].join('/'), OPEN = 253402178400000, DAY = 86400000, PLAN = key('cleaningPlan', 'main'), CFG = key('config', 'main');
const SECS = [['grill', 'Grill'], ['pans', 'Pans'], ['fry', 'Fryers, salads and dessert'], ['hot', 'Hot larder']];
const build = (on, fridays) => {
  const extra = {}, w = {}, k = {};
  schedule.drafts().concat(schedule.packDownDrafts(), schedule.sectionDrafts()).forEach(d => {
    const id = 'clean-template-' + d.plan.template, g = schedule.sectionGroupOf(d), sec = SECS.find(s => s[0] === g);
    extra[key('cleaningTasks', id)] = { ...d, shared: !sec, section: sec ? sec[0] : '', sectionName: sec ? sec[1] : '', root: id, prev: '', next: '', from: L.NOW - 20 * DAY, until: OPEN, at: L.NOW - 20 * DAY, by: 'sam' };
  });
  SECS.forEach(([id, name]) => { extra[key('sections', id)] = { name, uses: 5, hidden: false }; });
  extra[CFG] = { ...L.seed()[CFG], kitSecs: SECS.map(([id, name]) => ({ id, name })), staffSee: { cleaning: on } };
  Object.keys(EX).forEach(t => { w['clean-template-' + t] = EX[t][1]; k['clean-template-' + t] = EX[t][0]; });
  for (let i = 1; i <= fridays; i++) { const id = 'fri-' + i, sec = SECS[i % 4]; extra[key('cleaningTasks', id)] = { text: 'Made-up Friday job ' + i, area: 'Shelves', section: sec[0], sectionName: sec[1], shared: false, dows: [5], guide: '', root: id, prev: '', next: '', from: L.NOW - 20 * DAY, until: OPEN, at: L.NOW - 20 * DAY, by: 'sam' }; w[id] = 2; }
  extra[PLAN] = { v: 1, w, k, at: L.NOW - DAY, by: 'head' };
  return extra;
};
const fonts = p => p.addStyleTag({ content: ['barlow:Barlow:400', 'barlow-600:Barlow:600', 'barlow-700:Barlow:700', 'barlow-condensed:Barlow Condensed:700', 'caveat:Caveat:700'].map(f => { const [file, fam, w] = f.split(':'); return "@font-face{font-family:'" + fam + "';font-weight:" + w + ";src:url('/docs/cleaning-chef-options/fonts/" + file + ".woff2') format('woff2')}"; }).join('') }).then(() => p.evaluate(() => document.fonts.ready));
const go = async (b, base, extra, width) => {
  const p = await L.open(b, '#/cleaning', { width, height: width === 390 ? 844 : 900, base, extra, wait: 1000, admin: true });
  await L.waitFor(p, () => { const pg = document.querySelector('.cln-page'); return pg && !/Loading cleaning/.test(pg.textContent); }); await fonts(p);
  await p.click('[data-cln="setup"]'); await L.waitFor(p, () => !!document.querySelector('[data-cln="weights"]'), null, 6000);
  await p.click('[data-cln="weights"]'); await L.waitFor(p, () => !!document.querySelector('.cln-days'), null, 6000); await L.settle(p, 300);
  return p;
};
const measure = p => p.evaluate(() => { const dock = document.querySelector('.cln-sug-dock'), floor = Math.min(dock ? dock.getBoundingClientRect().top : innerHeight, innerHeight);
  return { screensLong: Math.round(document.documentElement.scrollHeight / innerHeight * 10) / 10, wholeRowsOnFirstScreen: [...document.querySelectorAll('.cln-sug-row')].filter(e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= floor; }).length,
    controls: [...document.querySelectorAll('.cln-sug-wrap button, .cln-sug-list button, .cln-sug-dock button, .cln-weigh-filter button')].filter(e => e.getClientRects().length).length,
    under44: [...document.querySelectorAll('.cln-plan button')].filter(e => e.getClientRects().length && e.getBoundingClientRect().height < 44).length, sideways: document.documentElement.scrollWidth > innerWidth }; });
const shot = async (p, name) => { await p.evaluate(() => window.scrollTo(0, 0)); await p.screenshot({ path: path.join(OUT, name + '.png') }); await p.screenshot({ path: path.join(OUT, name + '-full.png'), fullPage: true }); };
(async () => {
  const port = 20000 + Math.floor(Math.random() * 20000); await new Promise(r => server.listen(port, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + port + '/', b = await L.start(), out = {};
  for (const width of [390, 768, 1280]) {
    const p = await go(b, base, build(false, 7), width);
    out['start-' + width] = await measure(p);
    await p.click('[data-cln="sug-start"]'); await L.waitFor(p, () => !!document.querySelector('.cln-sug-sum'), null, 6000); await L.settle(p, 300);
    out['changes-' + width] = await measure(p); await shot(p, 'suggest-' + width);
    if (width === 390) {
      // part saved: one job refused, the first batch's answer lost, the rest waiting
      await p.evaluate(() => { window.__fake.deny = /\/cleaningTasks\/fri-1$/; window.__fake.lose = /\/cleaningTasks\/clean-template-sc-pans-03$/; });
      await p.click('[data-cln="sug-save"]'); await L.waitFor(p, () => !document.querySelector('.cln-sug-dock [data-cln="sug-save"]') || !/Saving/.test(document.querySelector('.cln-sug-dock').textContent), null, 10000); await L.settle(p, 300);
      out['part-saved-390'] = await measure(p); await shot(p, 'suggest-part-saved-390');
    }
    await p.context().close();
  }
  const p = await go(b, base, build(true, 0), 390); out['cleaning-on-390'] = await measure(p); await shot(p, 'suggest-cleaning-on-390'); await p.context().close();
  fs.writeFileSync(path.join(OUT, 'suggest-counts.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify(out)); await b.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
