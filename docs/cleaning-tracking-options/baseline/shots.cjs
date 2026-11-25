/* Today's pages, for the council restart (26 Nov 2026). Synthetic stand-in data, nothing live.
   Run from a checkout at the commit the packet names, with the click tests' packages:
     OUT=<this folder> node <this file>
   It writes the pictures and counts.json into OUT. */
const path = require('path'), fs = require('fs'), ROOT = process.cwd(), OUT = process.env.OUT;
const L = require(path.join(ROOT, 'tests/lib')), server = require(path.join(ROOT, 'tests/serve')), schedule = require(path.join(ROOT, 'js/cleaning-schedule'));
const key = (...p) => ['kitchens', L.PIN, ...p].join('/'), OPEN = 253402178400000, DAY = 86400000;
const MON = Date.parse('2026-11-30T04:00:00Z');   // Monday 14:00 Queensland
const SECS = [['grill', 'Grill'], ['pans', 'Pans'], ['fry', 'Fryers, salads and dessert'], ['hot', 'Hot larder']];
const extra = {};
schedule.drafts().concat(schedule.packDownDrafts(), schedule.sectionDrafts()).forEach(d => {
  const id = 'clean-template-' + d.plan.template, g = schedule.sectionGroupOf(d), sec = SECS.find(s => s[0] === g);
  extra[key('cleaningTasks', id)] = { ...d, shared: !sec, section: sec ? sec[0] : '', sectionName: sec ? sec[1] : '', root: id, prev: '', next: '', from: Date.parse('2026-11-01T00:00:00+10:00'), until: OPEN, at: MON - 20 * DAY, by: 'sam' };
});
SECS.forEach(([id, name]) => { extra[key('sections', id)] = { name, uses: 5, hidden: false }; });
extra[key('config', 'main')] = { ...L.seed()[key('config', 'main')], kitSecs: SECS.map(([id, name]) => ({ id, name })) };
// the admin's nightly record, as tests/records.test.js builds it: made-up counts
const day = n => L.ymd(new Date(L.NOW - n * DAY)), rows = [];
for (let i = 40; i >= 2; i--) rows.push({ day: day(i), p: { n: 20, w: 18, t: 17, r: 2, sec: {}, mins: {}, who: {} }, w: { n: 0, reason: {}, sec: {}, items: [] }, x: { out: 0, in: 0 },
  fs: { v: 1, del: [], c: i % 7 === 3 ? { cv: 1, due: 52, done: 47, miss: ['Clean the drawers', 'Clean behind the pizza ovens'], missN: 2, unable: [{ t: 'Deep clean the oil filter machine', n: 'No degreaser' }], unableN: 1, wait: [], waitN: 0, ev: 4, evRec: 2 }
    : { cv: 1, due: 50, done: 46, miss: [], missN: 0, unable: [], unableN: 0, wait: [], waitN: 0, ev: 4, evRec: 4 }, cool: { k: 'none' } } });
const admin = { [key('analysis', 'dashboard')]: { v: 1, generation: 'g1', at: L.NOW - 11 * 3600000, from: day(40), to: day(2), days: rows }, [key('analysis', 'health')]: { at: L.NOW - 11 * 3600000, status: 'ok' } };
const fonts = p => p.addStyleTag({ content: ['barlow:Barlow:400', 'barlow-600:Barlow:600', 'barlow-700:Barlow:700', 'barlow-condensed:Barlow Condensed:700', 'caveat:Caveat:700'].map(f => { const [file, fam, w] = f.split(':'); return "@font-face{font-family:'" + fam + "';font-weight:" + w + ";src:url('/docs/cleaning-chef-options/fonts/" + file + ".woff2') format('woff2')}"; }).join('') }).then(() => p.evaluate(() => document.fonts.ready));
const counts = {};
const shot = async (p, name, width) => {
  await L.settle(p, 350);
  counts[name + '-' + width] = await p.evaluate(() => ({ screensLong: Math.round(document.documentElement.scrollHeight / innerHeight * 10) / 10, sideways: document.documentElement.scrollWidth > innerWidth }));
  await p.screenshot({ path: path.join(OUT, name + '-' + width + '.png') });
  await p.screenshot({ path: path.join(OUT, name + '-' + width + '-full.png'), fullPage: true });
};
(async () => {
  const port = 20000 + Math.floor(Math.random() * 20000); await new Promise(r => server.listen(port, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + port + '/', b = await L.start(), ready = p => L.waitFor(p, () => { const pg = document.querySelector('.cln-page'); return pg && !/Loading cleaning/.test(pg.textContent); });
  for (const width of [390, 1280]) {
    const height = width === 390 ? 844 : 900;
    let p = await L.open(b, '#/cleaning', { who: 'ann', width, height, base, extra, clock: MON, wait: 1000 });
    await ready(p); await fonts(p); await shot(p, 'cook-today', width);
    counts['cook-today-' + width].rows = await p.$$eval('.cln-row', r => r.length); await p.context().close();
    p = await L.open(b, '#/cleaning', { who: 'sam', width, height, base, extra, clock: MON, wait: 1000 });
    await ready(p); await fonts(p); await shot(p, 'chef-today', width);
    await p.click('[data-cln="setup"]'); await shot(p, 'chef-repeat', width);
    counts['chef-repeat-' + width].controls = await p.$$eval('[data-cln]', es => [...new Set(es.map(e => e.dataset.cln))].slice(0, 60));
    const add = await p.$('[data-cln="add"]'); if (add) { await add.click(); await L.settle(p, 400); const ed = await p.$('.cln-editor'); if (ed) await ed.scrollIntoViewIfNeeded(); await p.evaluate(() => scrollBy(0, -70)); await shot(p, 'chef-form', width);
      counts['chef-form-' + width].fields = await p.$$eval('.cln-editor label, .cln-editor .label', es => es.map(e => e.textContent.trim().slice(0, 40)));
      counts['chef-form-' + width].formHeight = await p.$eval('.cln-editor', e => Math.round(e.getBoundingClientRect().height)); }
    if (p.errors.length) counts['chef-errors-' + width] = p.errors; await p.context().close();
    p = await L.open(b, '#/admin', { admin: true, adminPage: '', who: '', width, height, base, extra: admin, wait: 2200 });
    await fonts(p); await shot(p, 'admin-inbox', width); await p.context().close();
    p = await L.open(b, '#/admin', { admin: true, width, height, base, extra: admin, wait: 2200 });
    await fonts(p); await L.adminTab(p, 'records'); await L.waitFor(p, () => !!document.querySelector('.rec-days, .rec-page .p-err'), null, 5000); await shot(p, 'records-month', width);
    const row = await p.$('.rec-dayrow[data-d="' + day(3) + '"]'); if (row) { await row.click(); await shot(p, 'records-day', width); }
    if (p.errors.length) counts['admin-errors-' + width] = p.errors; await p.context().close();
  }
  fs.writeFileSync(path.join(OUT, 'counts.json'), JSON.stringify({ kind: 'Implemented app, click-test stand-in, synthetic data', commit: require('child_process').execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(), viewports: '390 x 844 and 1280 x 900', results: counts }, null, 1) + '\n');
  console.log(JSON.stringify(counts, null, 0).slice(0, 3000));
  await b.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
