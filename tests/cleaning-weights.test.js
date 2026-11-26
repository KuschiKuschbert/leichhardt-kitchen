// Cleaning results by section, step 3 (head chef, 26 Nov 2026, docs/cleaning-tracking-options/brief.md): Weights and
// days. On Repeat tasks a chef sees how many weekly and monthly jobs have no weight yet, and opens one list of them by
// section: Light, Medium or Heavy and an optional kind on each, one Save. The weights live in one record,
// cleaningPlan/main, keyed by each job's root id: 1 read when a chef opens Repeat tasks, one merged write. Staff never
// read it. A failed read is never "no weight yet". Synthetic jobs and made-up people.
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
// a job that was moved: its current revision has another id, the same root
const moved = key('cleaningTasks', 'clean-template-sc-grill-01'), movedNow = key('cleaningTasks', 'drawers-v2');
jobs[movedNow] = { ...jobs[moved], until: OPEN, from: L.NOW - 5 * DAY, prev: 'clean-template-sc-grill-01' }; jobs[moved] = { ...jobs[moved], until: L.NOW - 5 * DAY, next: 'drawers-v2' };
SECS.forEach(([id, name]) => { jobs[key('sections', id)] = { name, uses: 5, hidden: false }; });
jobs[key('config', 'main')] = { ...L.seed()[key('config', 'main')], kitSecs: SECS.map(([id, name]) => ({ id, name })) };
const PLAN = key('cleaningPlan', 'main');
const open = async (b, who, width, extra, more) => {
  const p = await L.open(b, '#/cleaning', { who, width, height: width === 390 ? 844 : 900, extra: Object.assign({}, jobs, extra || {}), wait: 1000, ...(more || {}) });
  await L.waitFor(p, () => { const pg = document.querySelector('.cln-page'); return pg && !/Loading cleaning/.test(pg.textContent); }, null, 8000).catch(() => {});
  return p;
};
const setup = async p => { await p.click('[data-cln="setup"]'); await L.waitFor(p, () => !!document.querySelector('.cln-weights-notice, .cln-weights-link'), null, 6000).catch(() => {}); await L.settle(p, 200); };
const planReads = p => p.evaluate(() => window.__fake.reads.filter(x => /cleaningPlan/.test(x)).length);
const stored = p => p.evaluate(k => window.__fake.dump()[k] || null, PLAN);
const dock = p => p.evaluate(() => { const d = document.querySelector('.cln-weigh-dock'); return d ? d.textContent.replace(/\s+/g, ' ').trim() : ''; });

(async () => {
  const b = await L.start();
  const ROUND = 23;   // the three built-in lists: 18 section jobs, 4 from the general schedule, 1 weekly Pack down step
  for (const width of [390, 768, 1280]) {
    const p = await open(b, 'sam', width, { [PLAN]: { v: 1, w: { 'clean-template-sc-hot-02': 3, 'clean-template-sc-grill-01': 1 }, k: { 'clean-template-sc-hot-02': 'Behind equipment' }, at: L.NOW - DAY, by: 'kit' } });
    await setup(p);
    const notice = await p.evaluate(() => { const n = document.querySelector('.cln-weights-notice'); return n ? n.textContent.replace(/\s+/g, ' ').trim() : ''; });
    ok(notice.indexOf((ROUND - 2) + ' weekly and monthly jobs have no weight yet') === 0 && /Weights and days$/.test(notice), width + ': Repeat tasks says how many weekly and monthly jobs have no weight yet, by root id, so the moved job keeps its weight (' + notice + ')');
    ok(await planReads(p) === 1, width + ': the weights are read once, when Repeat tasks opens');
    await p.click('[data-cln="weights"]'); await L.settle(p, 300);
    const page = await p.evaluate(() => ({ title: document.querySelector('#cln-plan-title').textContent, focus: document.activeElement && document.activeElement.id, rows: document.querySelectorAll('.cln-weigh-row').length,
      heads: [...document.querySelectorAll('.cln-weigh-h')].map(h => h.firstChild.textContent), filter: [...document.querySelectorAll('[data-cln="weights-filter"]')].map(x => x.textContent + ':' + x.getAttribute('aria-pressed')) }));
    ok(page.title === 'Weights and days · ' + ROUND + ' weekly and monthly jobs' && page.focus === 'cln-plan-title' && page.rows === ROUND, width + ': the list holds every weekly and monthly job, its heading in focus (' + JSON.stringify([page.title, page.rows]) + ')');
    ok(page.heads.join('|') === 'Fryers, salads and dessert|Grill|Hot larder|Pans|Shared kitchen' && page.filter.join('|') === 'All ' + ROUND + ':true|No weight ' + (ROUND - 2) + ':false', width + ': by section, Shared kitchen last, with All and No weight (' + page.heads.join('|') + ')');
    ok(await planReads(p) === 1, width + ': opening the list reads nothing more');
    const row = id => p.evaluate(i => { const r = document.querySelector('.cln-weigh-row[data-template="' + i + '"]'); return r ? { meta: r.querySelector('.cln-weigh-meta').textContent, pressed: [...r.querySelectorAll('[data-cln="weigh"]')].map(c => c.getAttribute('aria-pressed') === 'true' ? c.textContent : '').join(''), kind: r.querySelector('select').value } : null; }, id);
    const hot = await row('clean-template-sc-hot-02'), drawers = await row('drawers-v2');
    ok(hot.pressed === 'Heavy' && hot.kind === 'Behind equipment' && drawers.pressed === 'Light' && /^Every \w+day$/.test(drawers.meta), width + ': a saved weight and kind show as chosen, also on the moved job (' + JSON.stringify([hot, drawers]) + ')');
    ok(/^21 with no weight yet\. ?Save jobs$/.test(await dock(p)) && await p.$eval('[data-cln="weights-save"]', e => e.disabled), width + ': nothing to save yet: Save is off (' + await dock(p) + ')');
    // weigh two jobs and give one a kind: no redraw, the row stays where it was
    const at = () => p.evaluate(() => Math.round(document.querySelector('.cln-weigh-row[data-template="clean-template-sc-pans-02"]').getBoundingClientRect().top + scrollY)), before = await at();
    await p.click('.cln-weigh-row[data-template="clean-template-sc-pans-02"] [data-w="2"]');
    await p.click('.cln-weigh-row[data-template="clean-template-sc-fry-01"] [data-w="1"]');
    // the kind is the book's own picker over a select (LK_UX); choosing in it sets the select and sends change
    await p.evaluate(() => { const s = document.querySelector('.cln-weigh-row[data-template="clean-template-sc-fry-01"] select'); s.value = 'Fridges'; s.dispatchEvent(new Event('change', { bubbles: true })); });
    const after = await at();
    ok((await row('clean-template-sc-pans-02')).pressed === 'Medium' && Math.abs(after - before) < 2 && /^2 not saved\. 21 with no weight saved yet\. ?Undo changes ?Save 2 jobs$/.test(await dock(p)), width + ': a chosen weight shows at once and nothing moves; the bar says what is not saved (' + await dock(p) + ', moved ' + (after - before) + ' px)');
    // leaving with unsaved weights says so and stays
    await p.click('[data-cln="weights-back"]'); await L.settle(p, 200);
    ok(!!(await p.$('.cln-weigh-row')) && /Save your weight changes, or Undo changes, before leaving\./.test(await dock(p)) && await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-cln') === 'weights-save'), width + ': Back with unsaved weights says so, stays on the list, and puts focus on Save');
    // Refresh keeps the list and its unsaved changes on screen
    await p.click('[data-cln="refresh"]'); await L.settle(p, 600);
    ok((await row('clean-template-sc-pans-02')).pressed === 'Medium' && (await p.$$('.cln-weigh-row')).length === ROUND, width + ': Refresh keeps the list and the unsaved changes on screen');
    const bar = await p.evaluate(() => { const d = document.querySelector('.cln-weigh-dock').getBoundingClientRect(), tab = document.querySelector('nav.tabbar'), tr = tab && tab.getClientRects().length ? tab.getBoundingClientRect() : null; return { bottom: Math.round(d.bottom), vh: innerHeight, tab: tr && tr.top > innerHeight / 2 ? Math.round(tr.top) : innerHeight, wide: document.documentElement.scrollWidth <= innerWidth,
      small: [...document.querySelectorAll('.cln-weights button, .cln-weights select')].filter(e => e.getClientRects().length && e.getBoundingClientRect().height < 44).map(e => e.textContent.trim().slice(0, 20)) }; });
    ok(bar.wide && !bar.small.length && bar.bottom <= Math.min(bar.vh, bar.tab) + 1, width + ': no sideways scroll, every control 44 px tall, the Save bar above the tab bar (' + JSON.stringify(bar) + ')');
    // another chef saved a weight meanwhile: the merged save keeps it
    await p.evaluate(k => { const d = window.__fake.dump()[k]; window.__fake.write(k, { ...d, w: { ...d.w, 'clean-template-sc-hot-01': 2 } }); }, PLAN);
    await p.click('[data-cln="weights-save"]');
    await L.waitFor(p, () => /Saved/.test((document.querySelector('.cln-weigh-dock') || {}).textContent || ''), null, 6000).catch(() => {});
    const s = await stored(p);
    ok(s && s.w['clean-template-sc-pans-02'] === 2 && s.w['clean-template-sc-fry-01'] === 1 && s.k['clean-template-sc-fry-01'] === 'Fridges' && s.w['clean-template-sc-hot-02'] === 3 && s.w['clean-template-sc-hot-01'] === 2 && s.k['clean-template-sc-hot-02'] === 'Behind equipment' && s.by === 'sam' && s.v === 1,
      width + ': one merged save keeps the weights already saved, another chef\'s too, and says who saved (' + JSON.stringify(s && { w: Object.keys(s.w).length, k: s.k, by: s.by }) + ')');
    ok(/^Saved \d\d:\d\d\. 19 with no weight yet\. ?Save jobs$/.test(await dock(p)) && await p.$eval('[data-cln="weights-filter"][data-f="none"]', e => e.textContent) === 'No weight 19', width + ': the bar says Saved with the time (' + await dock(p) + ')');
    // a kind put back to none is a change, saved as none; a save of kinds only keeps every weight
    await p.evaluate(() => { const s = document.querySelector('.cln-weigh-row[data-template="clean-template-sc-hot-02"] select'); s.value = ''; s.dispatchEvent(new Event('change', { bubbles: true })); });
    ok(/^1 not saved\./.test(await dock(p)), width + ': putting a kind back to none counts as a change (' + await dock(p) + ')');
    await p.click('[data-cln="weights-save"]'); await L.waitFor(p, () => /Saved/.test((document.querySelector('.cln-weigh-dock') || {}).textContent || ''), null, 6000).catch(() => {});
    const s2 = await stored(p);
    ok(s2 && s2.k['clean-template-sc-hot-02'] === '' && s2.w['clean-template-sc-hot-02'] === 3 && Object.keys(s2.w).length === 5 && (await row('clean-template-sc-hot-02')).kind === '', width + ': the kind is saved as none and every weight stays (' + JSON.stringify(s2 && s2.k) + ')');
    // back to Repeat tasks: the count follows, and the link stays once every job has one
    await p.click('[data-cln="weights-back"]'); await L.settle(p, 200);
    ok(/^19 weekly and monthly jobs have no weight yet/.test(await p.$eval('.cln-weights-notice', e => e.textContent.trim())) && await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-cln') === 'weights'), width + ': back on Repeat tasks the count follows the save, the link in focus');
    ok(!p.errors.length, width + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // every job weighed: the line stays as a plain link
  {
    const all = {}; Object.keys(jobs).filter(k => /cleaningTasks/.test(k)).forEach(k => { const j = jobs[k]; all[j.root] = 2; });
    const p = await open(b, 'sam', 1280, { [PLAN]: { v: 1, w: all, at: L.NOW - DAY, by: 'kit' } });
    await setup(p);
    ok(!(await p.$('.cln-weights-notice')) && /^Every weekly and monthly job has a weight\. Weights and days$/.test(await p.$eval('.cln-weights-link', e => e.textContent.trim())), 'every job has a weight: the link stays, quietly');
    await p.context().close();
  }
  // no record yet: every job has no weight; a refused read is not "no weight yet"
  {
    let p = await open(b, 'sam', 1280);
    await setup(p);
    ok(new RegExp('^' + ROUND + ' weekly and monthly jobs have no weight yet').test(await p.$eval('.cln-weights-notice', e => e.textContent.trim())), 'no weights saved yet: every weekly and monthly job is counted');
    await p.context().close();
    p = await open(b, 'sam', 1280, {}, { init: () => { window.__fakeDenyPlan = 1; } });
    await p.evaluate(() => { window.__fake.denyReads = /cleaningPlan/; });
    await setup(p);
    ok(!(await p.$('.cln-weights-notice')) && /^Could not read the weights\. Weights and days$/.test(await p.$eval('.cln-weights-link', e => e.textContent.trim())), 'a refused read gives no count, never "no weight yet"');
    await p.click('[data-cln="weights"]'); await L.settle(p, 300);
    ok(!(await p.$('.cln-weigh-row')) && !(await p.$('[data-cln="weights-save"]')) && /Could not read the weights/.test(await p.$eval('.cln-weights [role="alert"]', e => e.textContent)), 'the list says so, with Try again, and has nothing to save');
    await p.evaluate(() => { window.__fake.denyReads = null; });
    await p.click('[data-cln="weights-retry"]'); await L.waitFor(p, () => document.querySelectorAll('.cln-weigh-row').length > 0, null, 6000).catch(() => {});
    ok((await p.$$('.cln-weigh-row')).length === ROUND, 'Try again reads them');
    // a refused save keeps the changes and says nothing was saved
    await p.click('.cln-weigh-row[data-template="clean-template-sc-pans-02"] [data-w="3"]');
    await p.evaluate(() => { window.__fake.mode = 'deny'; });
    await p.click('[data-cln="weights-save"]'); await L.settle(p, 500);
    ok(/Refused: only the head chef and the sous chefs change the weights\. Nothing was saved\./.test(await dock(p)) && !(await stored(p)) && (await p.$eval('.cln-weigh-row[data-template="clean-template-sc-pans-02"] [data-w="3"]', e => e.getAttribute('aria-pressed'))) === 'true', 'a refused save says so, saves nothing and keeps the change on screen');
    await p.evaluate(() => { window.__fake.mode = 'ok'; });
    await p.click('[data-cln="weights-undo"]'); await L.settle(p, 200);
    ok(/^23 with no weight yet\./.test(await dock(p)), 'Undo changes puts the list back');
    ok(!p.errors.length, 'failed read and refused save: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  // staff never read the weights and see none of this
  {
    const p = await open(b, 'ann', 390, { [key('config', 'main')]: { ...jobs[key('config', 'main')], staffSee: { ...(jobs[key('config', 'main')].staffSee || {}), cleaning: true } } });
    await L.settle(p, 500);
    ok(await planReads(p) === 0 && !(await p.$('[data-cln="weights"]')) && !(await p.$('[data-cln="setup"]')), 'a cook opening Cleaning reads no weights and sees no way to them');
    await p.context().close();
  }
  L.report(R); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
