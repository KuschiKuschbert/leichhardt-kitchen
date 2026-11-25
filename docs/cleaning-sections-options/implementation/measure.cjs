/* Section cleaning, steps 1 and 2: the implemented page, measured. Run from the repo root with the click tests' packages:
     node docs/cleaning-sections-options/implementation/measure.cjs
   The real book on the Firebase stand-in (tests/fake), synthetic Monday 30 November 2026, the kitchen's usual section
   names, the general list, Pack down and the 21 section jobs as a chef would load them (Fryers chosen for the Fryers,
   salads and dessert group; the 28-day jobs given an example first date so one shows). Nothing is written to the real book.
   before: a Grill cook with the general list and Pack down. after: the same lists plus the section jobs, for a cook on Prep,
   a section with no cleaning list, so the page keeps its usual order. mine: the same for a cook on Grill, section first. */
const path = require('path'), fs = require('fs');
const ROOT = path.resolve(__dirname, '../../..');
const L = require(path.join(ROOT, 'tests/lib')), server = require(path.join(ROOT, 'tests/serve')), schedule = require(path.join(ROOT, 'js/cleaning-schedule'));
const OUT = __dirname, DAY = 86400000, OPEN = 253402178400000, MON = Date.parse('2026-11-30T04:00:00Z');
const key = (...p) => ['kitchens', L.PIN, ...p].join('/'), at = d => Date.parse(d + 'T00:00:00+10:00');
const SECS = [['grill', 'Grill'], ['pass', 'Pass'], ['pans', 'Pans'], ['fryers', 'Fryers'], ['hot', 'Hot larder'], ['salads', 'Salads and dessert'], ['prep', 'Prep']];
const TO = { grill: 'grill', pans: 'pans', fry: 'fryers', hot: 'hot' };
const base = { prev: '', next: '', from: at('2026-11-01'), until: OPEN, at: MON - 20 * DAY, by: 'sam' };
const built = {}, withJobs = {};
schedule.drafts().concat(schedule.packDownDrafts()).forEach(d => { const id = 'clean-template-' + d.plan.template; built[key('cleaningTasks', id)] = { ...d, ...base, sectionName: '', root: id }; });
schedule.sectionDrafts().forEach(d => {
  const id = 'clean-template-' + d.plan.template, sec = SECS.find(s => s[0] === TO[schedule.sectionGroupOf(d)]);
  if (d.plan.template === 'sc-grill-02') d.plan.repeat.anchor = '2026-11-02';
  withJobs[key('cleaningTasks', id)] = { ...d, ...base, root: id, section: sec ? sec[0] : '', sectionName: sec ? sec[1] : '', shared: !sec };
});
const common = { ...Object.fromEntries(SECS.map(([id, name]) => [key('sections', id), { name, uses: 5, hidden: false }])), [key('config', 'main')]: { ...L.seed()[key('config', 'main')], kitSecs: SECS.map(([id, name]) => ({ id, name })) } };
const FONTS = [['barlow', 'Barlow', 400], ['barlow-600', 'Barlow', 600], ['barlow-700', 'Barlow', 700], ['barlow-condensed', 'Barlow Condensed', 700], ['caveat', 'Caveat', 700]]
  .map(([f, fam, w]) => "@font-face{font-family:'" + fam + "';font-weight:" + w + ";src:url('/docs/cleaning-chef-options/fonts/" + f + ".woff2') format('woff2')}").join('');
const pick = () => { const d = new Date(Date.now() + 36e5 * 10).toISOString().slice(0, 10); localStorage.setItem('lk.sec.ann', JSON.stringify({ d, sec: 'grill', name: 'Grill', self: true, at: Date.now() })); };
const pickPrep = () => { const d = new Date(Date.now() + 36e5 * 10).toISOString().slice(0, 10); localStorage.setItem('lk.sec.ann', JSON.stringify({ d, sec: 'prep', name: 'Prep', self: true, at: Date.now() })); };
const ready = p => L.waitFor(p, () => { const pg = document.querySelector('.cln-page'); return pg && !/Loading cleaning/.test(pg.textContent); });
async function fonts(p) { await p.addStyleTag({ content: FONTS }); await p.evaluate(() => document.fonts.ready); await L.settle(p, 400); }
const measure = p => p.evaluate(() => {
  const rows = [...document.querySelectorAll('.cln-row')];
  const bar = [...document.querySelectorAll('body *')].find(e => getComputedStyle(e).position === 'fixed' && e.getBoundingClientRect().bottom >= innerHeight - 1 && e.getBoundingClientRect().height < 120 && e.getBoundingClientRect().height > 30);
  const limit = bar ? bar.getBoundingClientRect().top : innerHeight, top = id => { const r = document.querySelector('.cln-row[data-id="clean-template-' + id + '"]'); return r ? Math.round((r.getBoundingClientRect().top + scrollY) / innerHeight * 10) / 10 : null; };
  return { jobs: rows.length, wholeJobsOnFirstScreen: rows.filter(r => { const b = r.getBoundingClientRect(); return b.height > 0 && b.top >= 0 && b.bottom <= limit; }).length,
    screensLong: Math.round(document.documentElement.scrollHeight / innerHeight * 10) / 10, screensToGrillWeeklyJob: top('sc-grill-01'), screensToGrillPackDown: top('pd-grill-01'),
    sideways: document.documentElement.scrollWidth > innerWidth, smallLinesCutOff: rows.map(r => r.querySelector('.nb-meta')).filter(e => e && e.scrollWidth > e.clientWidth + 1).length,
    howOftenLinesCutOff: [...document.querySelectorAll('.nb-meta.cln-often')].filter(e => e.scrollWidth > e.clientWidth + 1).length, howOftenLines: document.querySelectorAll('.nb-meta.cln-often').length,
    buttonsUnder44: [...document.querySelectorAll('.cln-body button')].filter(e => e.getClientRects().length).map(e => e.getBoundingClientRect()).filter(r => r.width < 44 || r.height < 44).length,
    oneTapBoxes: document.querySelectorAll('[data-cln="flow-quick"], [data-cln="tick"]').length, headings: [...document.querySelectorAll('.cln-body .cln-mine-title > span, .cln-body .cln-rest-title, .cln-body .nb-hd > span:first-child, .cln-packdown-title')].map(e => e.textContent.trim()) };
});
(async () => {
  const port = 20000 + Math.floor(Math.random() * 20000); await new Promise(r => server.listen(port, '127.0.0.1', r));
  const b = await L.start(), out = {}, url = 'http://127.0.0.1:' + port + '/';
  for (const [name, extra, init] of [['before', { ...common, ...built }, pick], ['after', { ...common, ...built, ...withJobs }, pickPrep], ['mine', { ...common, ...built, ...withJobs }, pick]]) for (const width of [390, 768, 1280]) {
    const p = await L.open(b, '#/cleaning', { who: 'ann', width, base: url, extra, clock: MON, wait: 1000, init });
    await ready(p); await fonts(p);
    out[name + '-' + width] = await measure(p); if (p.errors.length) out[name + '-' + width].errors = p.errors;
    await p.screenshot({ path: path.join(OUT, 'staff-' + name + '-' + width + '.png') });
    if (width === 390 && name !== 'before') await p.screenshot({ path: path.join(OUT, 'staff-' + name + '-390-full.png'), fullPage: true });
    await p.context().close();
  }
  // the chef: the Load panel, and the first date notice once the list is in
  let p = await L.open(b, '#/cleaning', { who: 'sam', width: 390, base: url, extra: { ...common, ...built }, clock: MON, wait: 1000 });
  await ready(p); await fonts(p);
  await p.locator('[data-cln="setup"]').first().click(); await p.click('.cln-section-import summary'); await L.settle(p, 300);
  await p.locator('.cln-section-import').scrollIntoViewIfNeeded(); await p.evaluate(() => scrollBy(0, -80)); await L.settle(p, 200);
  await p.screenshot({ path: path.join(OUT, 'chef-load-390.png') }); await p.context().close();
  const waiting = { ...withJobs }; waiting[key('cleaningTasks', 'clean-template-sc-grill-02')] = { ...waiting[key('cleaningTasks', 'clean-template-sc-grill-02')], plan: { ...waiting[key('cleaningTasks', 'clean-template-sc-grill-02')].plan, repeat: { days: 28, anchor: '' } } };
  p = await L.open(b, '#/cleaning', { who: 'sam', width: 390, base: url, extra: { ...common, ...built, ...waiting }, clock: MON, wait: 1000 });
  await ready(p); await fonts(p);
  await p.screenshot({ path: path.join(OUT, 'chef-first-date-390.png') }); await p.context().close();
  fs.writeFileSync(path.join(OUT, 'measurements.json'), JSON.stringify({ kind: 'Implemented app on the Firebase stand-in', day: 'Monday 30 November 2026 (synthetic)', role: 'line cook on Grill', viewports: '390, 768 and 1280 wide, 844 tall', fonts: 'Barlow, Barlow Condensed, Caveat', before: 'general list and Pack down, a cook on Grill', after: 'the same plus the 21 section jobs, a cook on Prep (usual order)', mine: 'the same, a cook on Grill (section first)', results: out }, null, 1) + '\n');
  console.log(JSON.stringify(out, null, 1));
  await b.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
