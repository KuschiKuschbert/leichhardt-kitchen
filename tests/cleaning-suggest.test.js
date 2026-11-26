// Cleaning results by section, step 4b (head chef, 26 Nov 2026, docs/cleaning-tracking-options/brief.md): Suggest the
// days. On Weights and days a chef asks the book for a day for each weekly and monthly job, only while Cleaning is off
// for the team. Fewest moves: a dated job moves only when its day breaks a rule; a monthly job with no first date gets
// one. Each change shows in its row with the old day and the reason, Keep and Another day. Nothing moves until Save,
// which goes 5 jobs at a time and says what saved, what was refused and what was not sent. The three built-in lists,
// made-up weights and kinds, made-up people.
const L = require('./lib');
const { R, ok } = L.results();
const schedule = require('../js/cleaning-schedule');
const key = (...p) => ['kitchens', L.PIN, ...p].join('/'), OPEN = 253402178400000, DAY = 86400000;
const SECS = [['grill', 'Grill'], ['pans', 'Pans'], ['fry', 'Fryers, salads and dessert'], ['hot', 'Hot larder']];
const EX = require('./cleaning-plan-jobs').EX;
const PLAN = key('cleaningPlan', 'main'), CFG = key('config', 'main');
const base = () => {
  const jobs = {};
  schedule.drafts().concat(schedule.packDownDrafts(), schedule.sectionDrafts()).forEach(d => {
    const id = 'clean-template-' + d.plan.template, g = schedule.sectionGroupOf(d), sec = SECS.find(s => s[0] === g);
    jobs[key('cleaningTasks', id)] = { ...d, shared: !sec, section: sec ? sec[0] : '', sectionName: sec ? sec[1] : '', root: id, prev: '', next: '', from: L.NOW - 20 * DAY, until: OPEN, at: L.NOW - 20 * DAY, by: 'sam' };
  });
  SECS.forEach(([id, name]) => { jobs[key('sections', id)] = { name, uses: 5, hidden: false }; });
  jobs[CFG] = { ...L.seed()[CFG], kitSecs: SECS.map(([id, name]) => ({ id, name })), staffSee: { cleaning: false } };
  const w = {}, k = {}; Object.keys(EX).forEach(t => { w['clean-template-' + t] = EX[t][1]; k['clean-template-' + t] = EX[t][0]; });
  jobs[PLAN] = { v: 1, w, k, at: L.NOW - DAY, by: 'head' };
  return jobs;
};
// extra medium jobs on a Friday (a light day), so the save needs more than one batch of 5
const fridays = (jobs, n) => { for (let i = 1; i <= n; i++) { const id = 'fri-' + i, sec = SECS[i % 4]; jobs[key('cleaningTasks', id)] = { text: 'Made-up Friday job ' + i, area: 'Shelves', section: sec[0], sectionName: sec[1], shared: false, dows: [5], guide: '', root: id, prev: '', next: '', from: L.NOW - 20 * DAY, until: OPEN, at: L.NOW - 20 * DAY, by: 'sam' }; jobs[PLAN].w[id] = 2; } return jobs; };
const open = async (b, o, width, jobs) => {
  const p = await L.open(b, '#/cleaning', { width, height: width === 390 ? 844 : 900, extra: jobs, wait: 1000, ...o });
  await L.waitFor(p, () => { const pg = document.querySelector('.cln-page'); return pg && !/Loading cleaning/.test(pg.textContent); }, null, 8000).catch(() => {});
  await p.click('[data-cln="setup"]'); await L.waitFor(p, () => !!document.querySelector('[data-cln="weights"]'), null, 6000).catch(() => {});
  await p.click('[data-cln="weights"]'); await L.waitFor(p, () => !!document.querySelector('.cln-days'), null, 6000).catch(() => {});
  return p;
};
const text = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
const suggest = async p => { await p.click('[data-cln="sug-start"]'); await L.waitFor(p, () => !!document.querySelector('.cln-sug-sum'), null, 6000).catch(() => {}); };
const rows = p => p.evaluate(() => [...document.querySelectorAll('.cln-sug-row')].map(r => ({ id: r.getAttribute('data-template'), title: r.querySelector('.cln-sug b').textContent, why: (r.querySelector('.cln-sug .hint') || {}).textContent || '', keep: !!r.querySelector('[data-cln="sug-keep"]'), other: !!r.querySelector('[data-cln="sug-other"]'), state: ((r.querySelector('.cln-sug-state') || {}).textContent || '').replace(/\s+/g, ' ').trim() })));
const row = async (p, id) => (await rows(p)).find(r => r.id === id) || {};
const store = p => p.evaluate(() => window.__fake.dump());
const revs = (s, root) => Object.keys(s).filter(k => /\/cleaningTasks\//.test(k) && s[k].root === root).map(k => s[k]);
const openRev = (s, root) => revs(s, root).filter(t => t.until === OPEN);
const saved = p => L.waitFor(p, () => { const d = document.querySelector('.cln-sug-dock'); return d && !d.querySelector('[data-cln="sug-save"][disabled]') || /every change|not saved yet|Cleaning is on/.test(d && d.textContent || ''); }, null, 10000).catch(() => {});
const STOVE = 'clean-template-sc-pans-02';
const MONTHLY = ['clean-template-sc-grill-02', 'clean-template-sc-pans-03', 'clean-template-sc-gen-02'];

(async () => {
  const b = await L.start();
  for (const width of [390, 768, 1280]) {
    const p = await open(b, { admin: true }, width, base());
    ok(!!(await p.$('[data-cln="sug-start"]:not([disabled])')) && /Cleaning is off for the team/.test(await text(p, '.cln-sug-start')), width + ': with Cleaning off, the admin sees Suggest the days');
    const reads0 = await p.evaluate(() => window.__fake.reads.length);
    await suggest(p);
    const r = await rows(p), stove = r.find(x => x.id === STOVE) || {};
    ok(/^The book suggests 6 changes/.test(await text(p, '.cln-sug-sum')) && r.length === 6 && await p.$eval('[data-cln="weights-filter"][data-f="changes"]', e => e.getAttribute('aria-pressed')) === 'true', width + ': the book suggests 6 changes, as the council\'s m3 drew them, shown as rows under Changes (' + await text(p, '.cln-sug-sum') + ')');
    ok(stove.title === 'Wednesday, was Tuesday' && /^Tuesday takes up to medium jobs/.test(stove.why) && !stove.keep && stove.other, width + ': the stove moves off Tuesday, says why first, and has no Keep: Tuesday cannot take it (' + stove.title + ': ' + stove.why + ')');
    ok(MONTHLY.every(id => / \d+ (December|January), then every 4 weeks$/.test(r.find(x => x.id === id).title)), width + ': each monthly job gets a first date and its rhythm (' + MONTHLY.map(id => r.find(x => x.id === id).title).join(' | ') + ')');
    ok(await p.evaluate(() => window.__fake.reads.length) === reads0, width + ': suggesting reads nothing');
    ok(await p.evaluate(s => !!document.querySelector(s), '.cln-sug-dock [data-cln="sug-save"]') && await text(p, '[data-cln="sug-save"]') === 'Save 6 days' && /Nothing is saved yet/.test(await text(p, '.cln-sug-dock')), width + ': one Save, "Save 6 days", and nothing is saved yet');
    const hot = r.find(x => x.id === 'clean-template-sc-hot-03') || {}, fry = r.find(x => x.id === 'clean-template-sc-fry-04') || {};
    ok(hot.title === 'Monday, was Sunday' && /^Hot larder's heaviest night goes from 5 to 4 points/.test(hot.why) && hot.keep && /^Sunday, was Thursday$/.test(fry.title) && fry.keep, width + ': as in m3, two jobs move to make a section\'s heaviest night lighter, each saying so with Keep (' + hot.title + '; ' + fry.title + ')');
    ok(MONTHLY.every(id => r.find(x => x.id === id)) && await p.$$eval('[data-cln-sugdate]', e => e.length) === 3, width + ': each monthly job offers Pick a date');
    if (process.env.WIDEFONT) await p.addStyleTag({ content: '* { letter-spacing: .08em !important; }' });
    const box = await p.evaluate(() => ({ wide: document.documentElement.scrollWidth <= innerWidth, over: [...document.querySelectorAll('.cln-plan *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).slice(0, 4).map(e => e.tagName + '.' + e.className + ':' + Math.round(e.getBoundingClientRect().right) + ' ' + e.textContent.trim().slice(0, 40)), small: [...document.querySelectorAll('.cln-sug-wrap button, .cln-sug-list button, .cln-sug-dock button')].filter(e => e.getClientRects().length && e.getBoundingClientRect().height < 44).map(e => e.textContent.trim()) }));
    ok(box.wide && !box.small.length, width + ': no sideways scroll, every control 44 px tall (' + JSON.stringify(box) + ')');
    const before = await store(p);
    ok(openRev(before, STOVE)[0].dows.join() === '2', width + ': nothing moved before Save');
    await p.click('[data-cln="sug-save"]'); await saved(p);
    const s = await store(p), stoveNow = openRev(s, STOVE), stoveAll = revs(s, STOVE);
    ok(stoveNow.length === 1 && stoveNow[0].dows.join() === '3' && stoveNow[0].prev === STOVE && stoveAll.length === 2 && stoveAll.find(t => t.prev === '').until === stoveNow[0].from && stoveNow[0].from > L.NOW, width + ': Save closes the stove\'s revision and starts a new one on Wednesday from tomorrow, root kept');
    ok(MONTHLY.every(id => { const o = openRev(s, id); return o.length === 1 && /^\d{4}-\d{2}-\d{2}$/.test(o[0].plan.repeat.anchor) && o[0].plan.repeat.days === 28 && o[0].prev === id; }), width + ': each monthly job is saved with its first date, every 28 days');
    ok((await rows(p)).every(x => /^Saved \d\d:\d\d\. Starts tomorrow\.$/.test(x.state)) && /Saved every change/.test(await text(p, '.cln-sug-dock')), width + ': every row says Saved with the time and Starts tomorrow (' + (await rows(p)).map(x => x.state).join(' | ') + ')');
    await p.context().close();
  }
  // Keep, Another day and the suggested rules plan the rest again; nothing is saved
  {
    const p = await open(b, { admin: true }, 390, fridays(base(), 2));
    await suggest(p);
    const fri = await row(p, 'fri-1');
    ok(/, was Friday$/.test(fri.title) && /^Friday takes up to light jobs/.test(fri.why) && !fri.keep, 'a medium job on a Friday moves, says Friday takes light jobs only, and has no Keep (' + fri.title + ')');
    const was = (await row(p, STOVE)).title;
    await p.click('[data-cln="sug-other"][data-id="' + STOVE + '"]'); await L.settle(p, 200);
    const other = await row(p, STOVE);
    ok(other.title && other.title !== was && !/^Wednesday/.test(other.title) && await p.evaluate(id => document.activeElement && document.activeElement.closest('.cln-sug-row') && document.activeElement.closest('.cln-sug-row').getAttribute('data-template') === id, STOVE), 'Another day gives the stove a different day, and focus stays on its row (' + was + ' to ' + other.title + ')');
    await p.click('[data-cln="sug-rule"][data-rule="twoHeavy"]'); await L.settle(p, 200);
    ok(await p.$eval('[data-cln="sug-rule"][data-rule="twoHeavy"]', e => e.getAttribute('aria-pressed')) === 'false' && /^The book suggests/.test(await text(p, '.cln-sug-sum')), 'a suggested rule can be dropped, and the days are planned again');
    await p.click('[data-cln="weights-back"]'); await L.settle(p, 200);
    ok(!!(await p.$('.cln-sug-dock')) && /Save the days, or Drop the suggestion, before leaving/.test(await text(p, '.cln-sug-dock')), 'Back with a suggestion not saved stays and says so');
    await p.click('[data-cln="sug-drop"]'); await L.settle(p, 200);
    ok(!(await p.$('.cln-sug-row')) && /Suggestion dropped\. Nothing was saved\./.test(await text(p, '.cln-sug-start')) && openRev(await store(p), STOVE)[0].dows.join() === '2', 'Drop the suggestion leaves every job as it was, and says so');
    await p.context().close();
  }
  // Pick a date on a monthly job: the date is his, saved as picked, and Suggest again puts the book's back
  {
    const p = await open(b, { admin: true }, 390, base()), id = MONTHLY[0];
    await suggest(p);
    const pickDay = new Date(L.NOW + 10 * 3600000 + 10 * DAY).toISOString().slice(0, 10);
    await p.$eval('[data-cln-sugdate="' + id + '"]', (e, v) => { e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); }, pickDay); await L.settle(p, 200);
    const picked = await row(p, id);
    ok(/^You picked this date\.$/.test(picked.why) && picked.title.endsWith(', then every 4 weeks') && !!(await p.$('[data-cln="sug-reset"][data-id="' + id + '"]')) && await p.evaluate(i => document.activeElement && document.activeElement.getAttribute('data-cln-sugdate') === i, id), 'Pick a date: the row shows the picked date, says so, offers Suggest again, and focus stays on the date (' + picked.title + ')');
    await p.$eval('[data-cln-sugdate="' + id + '"]', (e, v) => { e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); }, new Date(L.NOW + 10 * 3600000).toISOString().slice(0, 10)); await L.settle(p, 200);
    ok(/Pick a date from tomorrow/.test(await text(p, '.cln-sug-dock')), 'a date of today is refused in words');
    await p.click('[data-cln="sug-save"]'); await saved(p);
    ok(openRev(await store(p), id)[0].plan.repeat.anchor === pickDay, 'Save keeps the picked first date (' + pickDay + ')');
    await p.context().close();
  }
  // Keep: two heavy Grill jobs on a Monday; the lead's rule moves one, which may be kept. A night over 5 points is named.
  {
    const jobs = base(), job = (id, x) => { jobs[key('cleaningTasks', id)] = { text: 'Made-up job ' + id, area: 'Shelves', section: 'grill', sectionName: 'Grill', shared: false, dows: [1], guide: '', root: id, prev: '', next: '', from: L.NOW - 20 * DAY, until: OPEN, at: L.NOW - 20 * DAY, by: 'sam', ...x }; };
    job('hv-a'); job('hv-b'); jobs[PLAN].w['hv-a'] = 3; jobs[PLAN].w['hv-b'] = 3;
    ['pv-a', 'pv-b', 'pv-c'].forEach(id => { job(id, { section: 'pans', sectionName: 'Pans', dows: [0, 1, 2, 3, 4] }); jobs[PLAN].w[id] = 2; });
    job('pv-d', { section: 'pans', sectionName: 'Pans', dows: [4] }); jobs[PLAN].w['pv-d'] = 2;
    const p = await open(b, { admin: true }, 390, jobs);
    await suggest(p);
    const hb = await row(p, 'hv-b');
    ok(/, was Monday$/.test(hb.title) && /^Grill already has a heavy job on Monday \(a suggested rule\)/.test(hb.why) && hb.keep, 'a heavy job moved by the suggested rule says so and offers Keep Monday (' + hb.title + ': ' + hb.why + ')');
    ok(/Still against a rule: .*Pans is at weight \d+ on Thursday, over 5/.test(await text(p, '.cln-sug-sum')), 'the summary names a night over 5 points in words (' + await text(p, '.cln-sug-notes') + ')');
    await p.click('[data-cln="sug-keep"][data-id="hv-b"]'); await L.settle(p, 200);
    const kb = await row(p, 'hv-b'), ka = await row(p, 'hv-a');
    ok(kb.title === 'Stays on Monday. You kept it.' && /, was Monday$/.test(ka.title) && /already has a heavy job on Monday/.test(ka.why) && await p.evaluate(() => { const a = document.activeElement; return !!a && !!a.closest('.cln-sug-row') && a.closest('.cln-sug-row').getAttribute('data-template') === 'hv-b'; }),
      'Keep: the job stays on Monday, the rest is planned again so the other heavy job moves instead, and focus stays on the kept row (' + ka.title + ')');
    await p.click('[data-cln="sug-rule"][data-rule="cap"]'); await L.settle(p, 200);
    ok(!/over 5/.test(await text(p, '.cln-sug-sum')) && await p.$eval('[data-cln="sug-rule"][data-rule="cap"]', e => e.getAttribute('aria-pressed')) === 'false', 'with the over-5 rule dropped, the night is no longer named');
    await p.click('[data-cln="sug-reset"][data-id="hv-b"]'); await L.settle(p, 200);
    ok(/, was Monday$/.test((await row(p, 'hv-b')).title), 'Suggest again puts the kept job back into the plan');
    await p.context().close();
  }
  // no signal at all (the write waits, as on a phone): the rows say Sending, then Saved once the signal is back, once each
  {
    const p = await open(b, { admin: true }, 390, base());
    await suggest(p);
    await p.evaluate(() => { window.__fake.mode = 'hold'; });
    await p.click('[data-cln="sug-save"]'); await L.settle(p, 400);
    ok((await rows(p)).some(x => /^Sending/.test(x.state)) && /Saving 6 changes, 5 at a time/.test(await text(p, '.cln-sug-dock')) && !(await p.$('[data-cln="sug-drop"]')), 'no signal: the rows say Sending and the dock Saving, as the weights Save does while it waits (' + await text(p, '.cln-sug-dock') + ')');
    await p.evaluate(() => window.__fake.warm()); await saved(p);
    const s = await store(p);
    ok((await rows(p)).every(x => /^Saved/.test(x.state)) && [STOVE].concat(MONTHLY).every(id => openRev(s, id).length === 1 && revs(s, id).length === 2), 'signal back: every row says Saved, each job once');
    await p.context().close();
  }
  // a new day with a suggestion on screen: it is dropped in words, never saved with yesterday's tomorrow
  {
    const tomorrow = new Date(L.NOW + 10 * 3600000 + DAY).toISOString().slice(0, 10), midnight = Date.parse(tomorrow + 'T00:00:00Z') - 10 * 3600000;
    const p = await open(b, { admin: true, clock: midnight - 120000 }, 390, base());
    await suggest(p);
    ok((await rows(p)).length === 6, 'a suggestion at 23:58');
    await p.clock.runFor(180000); await L.settle(p, 300);
    await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await L.settle(p, 500);
    const sav = await p.$('[data-cln="sug-save"]');
    if (sav) { await sav.click(); await L.settle(p, 300); }
    ok(!(await p.$('.cln-sug-row')) && /A new day began, so the suggestion was dropped/.test(await text(p, '.cln-plan')) && openRev(await store(p), STOVE)[0].dows.join() === '2', 'after midnight the suggestion is dropped in words and nothing moves');
    await p.context().close();
  }
  // more than 5 changes: batches of 5; one job refused; an answer lost; Send the rest
  {
    const p = await open(b, { admin: true }, 390, fridays(base(), 7));
    await suggest(p);
    const many = (await rows(p)).length;
    ok(many >= 11 && await text(p, '[data-cln="sug-save"]') === 'Save ' + many + ' days', many + ' changes, the 7 Friday jobs among them, so the save needs 3 batches');
    // the rules refuse one job (changed on another phone): its batch is tried one job at a time, the rest still save
    await p.evaluate(() => { window.__fake.deny = /\/cleaningTasks\/fri-3$/; });
    const w0 = await p.evaluate(() => window.__fake.writes.length);
    await p.click('[data-cln="sug-save"]'); await saved(p);
    const s1 = await store(p), batches = (await p.evaluate(() => window.__fake.writes)).slice(w0).map(x => x.length);
    ok((await row(p, 'fri-3')).state.startsWith('Refused.') && openRev(s1, 'fri-3')[0].prev === '' && ['fri-1', 'fri-2', 'fri-4', 'fri-5', 'fri-6', 'fri-7', STOVE].every(id => openRev(s1, id)[0].prev === id), 'one refused job says Refused in its row; every other job is saved');
    ok(batches.length && batches.every(n => n <= 10) && batches[0] === 10, 'Save sends 5 jobs (10 writes) at a time, never more (' + batches.join(',') + ')');
    ok(/1 not saved yet\. 1 refused/.test(await text(p, '.cln-sug-dock')) && !!(await p.$('[data-cln="sug-save"][disabled]')), 'the dock says what is left and that it was refused (' + await text(p, '.cln-sug-dock') + ')');
    await p.context().close();
  }
  {
    const p = await open(b, { admin: true }, 390, fridays(base(), 7));
    await suggest(p);
    // the first batch lands but its answer is lost; the rest wait
    await p.evaluate(() => { window.__fake.lose = /\/cleaningTasks\//; });
    await p.click('[data-cln="sug-save"]'); await saved(p);
    const r1 = await rows(p);
    ok(r1.filter(x => /^Not sent\./.test(x.state)).length === 5 && r1.filter(x => x.state === 'Waiting to send.').length === r1.length - 5 && r1.length >= 11 && await text(p, '[data-cln="sug-save"]') === 'Send the rest', 'a lost answer: the first 5 rows say Not sent, the rest Waiting to send, and Save becomes Send the rest (' + r1.map(x => x.state).join(' | ') + ')');
    await p.evaluate(() => { window.__fake.lose = null; });
    await p.click('[data-cln="sug-save"]'); await saved(p);
    const s2 = await store(p), all = ['fri-1', 'fri-2', 'fri-3', 'fri-4', 'fri-5', 'fri-6', 'fri-7', STOVE].concat(MONTHLY);
    ok(all.every(id => openRev(s2, id).length === 1 && revs(s2, id).length === 2), 'Send the rest checks what landed: every job has exactly one open revision and one closed, no job saved twice');
    ok((await rows(p)).every(x => /^Saved/.test(x.state)), 'after Send the rest every row says Saved (' + (await rows(p)).map(x => x.id + ':' + x.state).join(' | ') + ')');
    await p.context().close();
  }
  {
    const p = await open(b, { admin: true }, 390, base());
    await suggest(p);
    await p.evaluate(() => { window.__fake.mode = 'fail'; });
    await p.click('[data-cln="sug-save"]'); await saved(p);
    const ns = await rows(p);
    ok(ns.slice(0, 5).every(x => /^Not sent\./.test(x.state)) && ns.slice(5).every(x => x.state === 'Waiting to send.') && openRev(await store(p), STOVE)[0].dows.join() === '2', 'no signal: the first batch says Not sent, the rest Waiting to send, and nothing moved');
    await p.evaluate(() => { window.__fake.mode = 'ok'; });
    await p.click('[data-cln="sug-save"]'); await saved(p);
    ok((await rows(p)).every(x => /^Saved/.test(x.state)) && openRev(await store(p), STOVE)[0].dows.join() === '3', 'with signal back, Send the rest saves them');
    // the admin switches Cleaning on: planning again offers nothing in bulk
    await p.click('[data-cln="sug-drop"]'); await L.settle(p, 150);
    await p.context().close();
  }
  // Cleaning switched on: no bulk suggestion, and a save started before the switch is refused in words
  {
    const jobs = base(); jobs[CFG].staffSee = { cleaning: true };
    const p = await open(b, { admin: true }, 390, jobs);
    ok(!(await p.$('[data-cln="sug-start"]')) && /Cleaning is on.*The book now suggests a day for new jobs only, in Add cleaning task\. A job that has a day stays there until you open it and change it\./.test(await text(p, '.cln-sug-off')), 'with Cleaning on there is no Suggest the days, and the page says why');
    await p.context().close();
  }
  {
    const p = await open(b, { admin: true }, 390, base());
    await suggest(p);
    await p.evaluate(k => { const c = window.__fake.dump()[k]; window.__fake.write(k, { ...c, staffSee: { cleaning: true } }); }, CFG);
    await L.settle(p, 400);
    await p.click('[data-cln="sug-save"]'); await saved(p);
    ok(/Cleaning is on for the team now/.test(await text(p, '.cln-sug-dock')) && openRev(await store(p), STOVE)[0].dows.join() === '2', 'switched on after the suggestion: Save moves nothing and says why');
    await p.context().close();
  }
  // no weight: counted, never planned; an unsaved weight holds the button
  {
    const jobs = base(); delete jobs[PLAN].w[STOVE]; delete jobs[PLAN].w['clean-template-sc-fry-01'];
    const p = await open(b, { admin: true }, 390, jobs), none = await p.evaluate(() => document.querySelector('[data-cln="weights-filter"][data-f="none"]').textContent.replace(/\D/g, '') * 1);
    await p.click('[data-cln="weigh"][data-w="1"]'); await L.settle(p, 150);
    ok(!!(await p.$('[data-cln="sug-start"][disabled]')) && /Save the weights and the days first/.test(await text(p, '.cln-sug-start')), 'an unsaved weight holds Suggest the days, and says to save first');
    await p.click('[data-cln="weights-undo"]'); await L.settle(p, 150);
    await suggest(p);
    ok(none >= 2 && (await text(p, '.cln-sug-sum')).includes(none + ' jobs have no weight yet, so they are not planned. The book never guesses a weight.') && !(await rows(p)).some(x => x.id === STOVE), 'jobs with no weight are counted and never planned (' + none + ' with none; ' + await text(p, '.cln-sug-sum') + ')');
    await p.click('.cln-sug-sum [data-cln="weights-filter"][data-f="none"]'); await L.settle(p, 150);
    ok(await p.$eval('.cln-weigh-filter [data-f="none"]', e => e.getAttribute('aria-pressed')) === 'true' && (await p.$$('.cln-weigh-row')).length === none, 'Weigh them first opens the jobs with no weight (' + (await p.$$('.cln-weigh-row')).length + ' of ' + none + ')');
    await p.click('[data-cln="weigh"][data-id="' + STOVE + '"][data-w="3"]'); await L.settle(p, 150);
    ok(!(await p.$('[data-cln="weights-filter"][data-f="changes"]')) && /A weight or a day changed/.test(await text(p, '.cln-sug-start')), 'a weight changed after the suggestion drops it, in words');
    await p.context().close();
  }
  // a sous chef suggests and saves too
  {
    const p = await open(b, { who: 'sam' }, 390, base());
    await suggest(p);
    await p.click('[data-cln="sug-save"]'); await saved(p);
    const s = await store(p);
    ok(openRev(s, STOVE)[0].by === 'sam' && openRev(s, STOVE)[0].dows.join() === '3', 'a sous chef saves the suggested days, by name');
    await p.context().close();
  }
  L.report(R); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
