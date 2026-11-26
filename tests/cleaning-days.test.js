// Cleaning results by section, step 4a (head chef, 26 Nov 2026, docs/cleaning-tracking-options/brief.md): What each day
// takes. On Weights and days a fold shows what each weekday takes, light to heavy. Until it is saved the page shows his
// days (Sunday, Monday, Wednesday and Thursday heavy, Tuesday medium, Friday and Saturday light). The head chef or the
// admin changes them; the sous chefs read them. The book suggests from how many people were on each weekday in the
// last 30 days (teamsum/main), never saves a suggestion on its own, and says so when the count is old, short or missing.
// Synthetic jobs and made-up people.
const L = require('./lib');
const { R, ok } = L.results();
const schedule = require('../js/cleaning-schedule');
const key = (...p) => ['kitchens', L.PIN, ...p].join('/'), OPEN = 253402178400000, DAY = 86400000;
const SECS = [['grill', 'Grill'], ['pans', 'Pans'], ['fry', 'Fryers, salads and dessert'], ['hot', 'Hot larder']];
const jobs = {};
schedule.drafts().concat(schedule.packDownDrafts(), schedule.sectionDrafts()).forEach(d => {
  const id = 'clean-template-' + d.plan.template, g = schedule.sectionGroupOf(d), sec = SECS.find(s => s[0] === g);
  jobs[key('cleaningTasks', id)] = { ...d, shared: !sec, section: sec ? sec[0] : '', sectionName: sec ? sec[1] : '', root: id, prev: '', next: '', from: L.NOW - 20 * DAY, until: OPEN, at: L.NOW - 20 * DAY, by: 'sam' };
});
SECS.forEach(([id, name]) => { jobs[key('sections', id)] = { name, uses: 5, hidden: false }; });
jobs[key('config', 'main')] = { ...L.seed()[key('config', 'main')], kitSecs: SECS.map(([id, name]) => ({ id, name })) };
const PLAN = key('cleaningPlan', 'main'), TS = key('teamsum', 'main');
// Queensland days: i days ago
const dayN = i => new Date(L.NOW + 10 * 3600000 - i * DAY).toISOString().slice(0, 10), dow = d => new Date(d + 'T00:00:00Z').getUTCDay();
// how many people were on each weekday, Sunday first: Monday quiet, Tuesday busy
const ON = [6, 3, 6, 6, 5, 7, 8];
const tsum = (made, days) => {
  const list = [];
  for (let i = days; i >= 1; i--) { const d = dayN(i); list.push({ day: d, s: Array.from({ length: ON[dow(d)] }, (x, n) => ({ p: 'cook' + n, sec: 'Grill', sh: 'dinner' })) }); }
  return { [TS]: { v: 1, at: L.NOW - 11 * 3600000, day: made, from: dayN(days), to: dayN(1), days: list, usual: {}, learn: {} } };
};
const open = async (b, o, width, extra) => {
  const p = await L.open(b, '#/cleaning', { width, height: width === 390 ? 844 : 900, extra: Object.assign({}, jobs, extra || {}), wait: 1000, ...o });
  await L.waitFor(p, () => { const pg = document.querySelector('.cln-page'); return pg && !/Loading cleaning/.test(pg.textContent); }, null, 8000).catch(() => {});
  await p.click('[data-cln="setup"]'); await L.waitFor(p, () => !!document.querySelector('[data-cln="weights"]'), null, 6000).catch(() => {});
  await p.click('[data-cln="weights"]'); await L.waitFor(p, () => !!document.querySelector('.cln-days'), null, 6000).catch(() => {});
  return p;
};
const text = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
const tsReads = p => p.evaluate(() => window.__fake.reads.filter(x => /\/teamsum\/main$/.test(x)).length);
const stored = p => p.evaluate(k => window.__fake.dump()[k] || null, PLAN);
const pressed = p => p.evaluate(() => [...document.querySelectorAll('.cln-day-row')].map(r => r.querySelector('b').textContent + ':' + (r.querySelector('.cln-day-fixed') ? 'fixed' : [...r.querySelectorAll('[data-cln="day-level"]')].filter(c => c.getAttribute('aria-pressed') === 'true').map(c => c.textContent).join(''))).join('|'));
const staff = p => p.evaluate(() => [...document.querySelectorAll('.cln-day-staff')].map(e => e.textContent));
const fold = async p => { await p.click('[data-cln="days-fold"]'); await L.waitFor(p, () => !/Reading the team/.test((document.querySelector('.cln-days') || {}).textContent || ''), null, 6000).catch(() => {}); };
const saved = p => L.waitFor(p, () => /Saved|Refused|Not saved\. /.test((document.querySelector('.cln-days-save') || {}).textContent || ''), null, 6000).catch(() => {});

(async () => {
  const b = await L.start();
  for (const width of [390, 768, 1280]) {
    const p = await open(b, { admin: true }, width, Object.assign(tsum(dayN(0), 28), { [PLAN]: { v: 1, w: { 'clean-template-sc-hot-02': 3 }, at: L.NOW - DAY, by: 'sam' } }));
    const r0 = await tsReads(p);
    ok(await text(p, '[data-cln="days-fold"]') === 'What each day takes (not saved yet)' && await text(p, '.cln-days-sum') === 'Heavy: Mon, Wed, Thu, Sun. Medium: Tue. Light: Fri, Sat.' && await p.$eval('[data-cln="days-fold"]', e => e.getAttribute('aria-expanded')) === 'false',
      width + ': closed, the fold gives the head chef\'s days in one line, not saved yet (' + await text(p, '.cln-days-sum') + ')');
    await fold(p);
    const r1 = await tsReads(p);
    ok(await pressed(p) === 'Monday:Heavy|Tuesday:Medium|Wednesday:Heavy|Thursday:Heavy|Friday:fixed|Saturday:fixed|Sunday:Heavy' && r1 - r0 <= 1 && r1 >= 1, width + ': open, Monday first, Friday and Saturday fixed at light; the team count read at most once (' + await pressed(p) + ', reads ' + r0 + '>' + r1 + ')');
    const words = await staff(p);
    ok(words.join('|') === 'About 3 on. Suggests medium.|About 6 on. Suggests heavy.|About 6 on. Suggests heavy.|About 5 on. Suggests medium.|Light only, your rule.|Light only, your rule.|About 6 on. Suggests heavy.', width + ': each day says how many were on and what the book suggests (' + words.join('|') + ')');
    ok(/^Not saved yet: these are the days you gave on 26 November\.$/.test(await text(p, '.cln-days-save .hint')) && !(await p.$eval('[data-cln="days-save"]', e => e.disabled)) && !!(await p.$('[data-cln="days-suggest"]')), width + ': Save the days is on before the first save, with Use the suggestions');
    ok(JSON.stringify((await stored(p)).d) === undefined, width + ': nothing is saved until the head chef presses Save');
    // the suggestions fill the days; nothing is saved
    await p.click('[data-cln="days-suggest"]'); await L.settle(p, 150);
    ok(await pressed(p) === 'Monday:Medium|Tuesday:Heavy|Wednesday:Heavy|Thursday:Medium|Friday:fixed|Saturday:fixed|Sunday:Heavy' && await text(p, '.cln-days-save .hint') === 'Not saved.' && !!(await p.$('[data-cln="days-undo"]')) && !(await p.$('[data-cln="days-suggest"]'))
      && await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-cln') === 'days-save'), width + ': Use the suggestions fills the days, says Not saved, and puts focus on Save (' + await pressed(p) + ')');
    // one tap changes a day; focus stays on the chip
    await p.click('[data-cln="day-level"][data-dow="2"][data-w="1"]'); await L.settle(p, 150);
    ok(/Tuesday:Light/.test(await pressed(p)) && await p.evaluate(() => { const a = document.activeElement; return !!a && a.getAttribute('data-dow') === '2' && a.getAttribute('data-w') === '1'; }), width + ': a tap on Light shows at once and focus stays on it');
    // leaving with unsaved days says so and stays
    await p.click('[data-cln="weights-back"]'); await L.settle(p, 200);
    ok(!!(await p.$('.cln-day-row')) && await text(p, '.cln-days-save .hint') === 'Save the days, or Undo, before leaving.' && await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-cln') === 'days-save'), width + ': Back with unsaved days says so, stays, and puts focus on Save');
    const box = await p.evaluate(() => ({ wide: document.documentElement.scrollWidth <= innerWidth, small: [...document.querySelectorAll('.cln-days button')].filter(e => e.getClientRects().length && e.getBoundingClientRect().height < 44).map(e => e.textContent.trim()) }));
    ok(box.wide && !box.small.length, width + ': no sideways scroll, every control 44 px tall (' + JSON.stringify(box) + ')');
    // another chef saved a weight meanwhile: the merged save keeps it
    await p.evaluate(k => { const d = window.__fake.dump()[k]; window.__fake.write(k, { ...d, w: { ...d.w, 'clean-template-sc-hot-01': 2 } }); }, PLAN);
    await p.click('[data-cln="days-save"]'); await saved(p);
    const s = await stored(p);
    ok(s && JSON.stringify(s.d) === '[3,2,1,3,2,1,1]' && s.w['clean-template-sc-hot-02'] === 3 && s.w['clean-template-sc-hot-01'] === 2 && s.by === 'head' && s.v === 1, width + ': Save the days sends all seven, Sunday first, and keeps every weight (' + JSON.stringify(s && { d: s.d, w: s.w, by: s.by }) + ')');
    ok(/^Saved \d\d:\d\d\.$/.test(await text(p, '.cln-days-save .hint')) && await p.$eval('[data-cln="days-save"]', e => e.disabled) && await text(p, '[data-cln="days-fold"]') === 'What each day takes' && !(await p.$('.cln-days-sum')),
      width + ': it says Saved with the time; the fold no longer says not saved (' + await text(p, '.cln-days-save .hint') + ')');
    if (width === 390) {
      // refused: the change stays on screen and the page says why
      await p.evaluate(() => { window.__fake.mode = 'deny'; });
      await p.click('[data-cln="day-level"][data-dow="1"][data-w="3"]'); await p.click('[data-cln="days-save"]'); await saved(p);
      ok(await text(p, '.cln-days-save .hint') === 'Refused: only the head chef or the admin sets the days. Nothing was saved.' && /Monday:Heavy/.test(await pressed(p)) && JSON.stringify((await stored(p)).d) === '[3,2,1,3,2,1,1]', width + ': a refused save says so and keeps the change on screen (' + await text(p, '.cln-days-save .hint') + ')');
      await p.evaluate(() => { window.__fake.mode = 'ok'; });
      await p.click('[data-cln="days-undo"]'); await L.settle(p, 150);
    }
    await p.click('[data-cln="weights-back"]'); await L.settle(p, 300);
    ok(!(await p.$('.cln-days')), width + ': with the days saved, Back leaves');
    await p.context().close();
  }
  // a sous chef reads the days and cannot change them; the team count is not read for them
  {
    const p = await open(b, { who: 'sam' }, 390, Object.assign(tsum(dayN(0), 28), { [PLAN]: { v: 1, w: {}, d: [3, 2, 3, 3, 2, 1, 1], at: L.NOW - DAY, by: 'head' } }));
    ok(await text(p, '[data-cln="days-fold"]') === 'What each day takes' && await text(p, '.cln-days-sum') === 'Heavy: Tue, Wed, Sun. Medium: Mon, Thu. Light: Fri, Sat.', 'sous chef: the line gives the saved days (' + await text(p, '.cln-days-sum') + ')');
    await fold(p);
    ok(!(await p.$('.cln-day-list')) && !(await p.$('[data-cln="days-save"]')) && /The head chef sets these\.$/.test(await text(p, '.cln-days')) && !!(await p.$('.cln-days-sum')) && await tsReads(p) === 0, 'sous chef: no chips, no Save, says the head chef sets them; no team count read');
    await p.context().close();
  }
  // the team count is old, short or missing: no suggestion, and the page says why
  for (const [label, extra, says] of [['an old count', tsum(dayN(3), 28), 'The team count is not up to date.'], ['ten days of count', tsum(dayN(0), 10), 'Not enough weeks yet.'], ['no count', {}, 'No team count yet.']]) {
    const p = await open(b, { admin: true }, 390, extra);
    await fold(p);
    const w = await staff(p);
    ok(w[0] === says && w[4] === 'Light only, your rule.' && !(await p.$('[data-cln="days-suggest"]')) && /Monday:Heavy\|Tuesday:Medium/.test(await pressed(p)), label + ': no suggestion, and it says ' + says + ' (' + w[0] + ')');
    await p.context().close();
  }
  // the team count cannot be read: it says so, and the days still save
  {
    const p = await open(b, { admin: true, failReads: '/teamsum/main' }, 390, tsum(dayN(0), 28));
    await fold(p);
    ok((await staff(p))[0] === 'Could not read the team.' && !(await p.$('[data-cln="days-suggest"]')), 'a failed read of the team count is not "no count": it says it could not read');
    await p.click('[data-cln="days-save"]'); await saved(p);
    ok(JSON.stringify((await stored(p) || {}).d) === '[3,3,2,3,3,1,1]', 'the head chef saves his days without a suggestion');
    await p.context().close();
  }
  L.report(R); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
