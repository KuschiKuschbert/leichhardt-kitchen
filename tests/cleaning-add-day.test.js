// Cleaning results by section, step 4c (head chef, 26 Nov 2026, docs/cleaning-tracking-options/brief.md): once
// Cleaning is on for the team, a new job in the Add cleaning task form gets a weight, a kind and a suggested day (the
// council's c3). The suggestion is a default the chef presses, never saved on its own. Today's chip says a new job
// starts the day it is saved: pressed, it is due at tonight's close. The weight saves in the job's own batch, so both
// land or neither. Existing jobs get no offer. The three built-in lists, made-up weights and kinds, made-up people.
const L = require('./lib');
const { R, ok } = L.results();
const schedule = require('../js/cleaning-schedule');
const key = (...p) => ['kitchens', L.PIN, ...p].join('/'), OPEN = 253402178400000, DAY = 86400000;
const SECS = [['grill', 'Grill'], ['pans', 'Pans'], ['fry', 'Fryers, salads and dessert'], ['hot', 'Hot larder']];
const EX = require('./cleaning-plan-jobs').EX;
const PLAN = key('cleaningPlan', 'main'), CFG = key('config', 'main');
const TODAY = new Date(L.NOW + 10 * 3600000).getUTCDay();   // the kitchen's weekday, Sunday 0
const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const base = (o = {}) => {
  const jobs = {};
  schedule.drafts().concat(schedule.packDownDrafts(), schedule.sectionDrafts()).forEach(d => {
    const id = 'clean-template-' + d.plan.template, g = schedule.sectionGroupOf(d), sec = SECS.find(s => s[0] === g);
    jobs[key('cleaningTasks', id)] = { ...d, shared: !sec, section: sec ? sec[0] : '', sectionName: sec ? sec[1] : '', root: id, prev: '', next: '', from: L.NOW - 20 * DAY, until: OPEN, at: L.NOW - 20 * DAY, by: 'sam' };
  });
  SECS.forEach(([id, name]) => { jobs[key('sections', id)] = { name, uses: 5, hidden: false }; });
  jobs[CFG] = { ...L.seed()[CFG], kitSecs: SECS.map(([id, name]) => ({ id, name })), staffSee: { cleaning: o.off ? false : true } };
  if (!o.noWeights) { const w = {}, k = {}; Object.keys(EX).forEach(t => { w['clean-template-' + t] = EX[t][1]; k['clean-template-' + t] = EX[t][0]; }); jobs[PLAN] = { v: 1, w, k, at: L.NOW - DAY, by: 'head' }; }
  return jobs;
};
const text = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
const store = p => p.evaluate(() => window.__fake.dump());
const newJobs = (s, name) => Object.keys(s).filter(k => /\/cleaningTasks\//.test(k) && s[k].text === name).map(k => ({ id: k.split('/').pop(), ...s[k] }));
const chips = p => p.$$eval('.cln-repeat [data-cln="repeat"]', b => b.map(e => ({ dow: +e.getAttribute('data-dow'), day: (e.querySelector('span') || e).textContent.trim(), tag: ((e.querySelector('small') || {}).textContent || '').trim(), on: e.getAttribute('aria-pressed') === 'true' })));
const open = async (b, width, jobs, o = {}) => {
  const p = await L.open(b, '#/cleaning', { width, height: width === 390 ? 844 : 900, extra: jobs, wait: 1000, admin: true, ...o });
  await L.waitFor(p, () => { const pg = document.querySelector('.cln-page'); return pg && !/Loading cleaning/.test(pg.textContent); }, null, 8000).catch(() => {});
  await p.locator('[data-cln="setup"]').first().click();
  await L.waitFor(p, () => !!document.querySelector('[data-cln="add"]:not([disabled])'), null, 6000).catch(() => {});
  return p;
};
const add = async (p, name, sec) => {
  await p.click('[data-cln="add"]'); await L.waitFor(p, () => !!document.querySelector('#cln-text'), null, 4000).catch(() => {});
  await p.fill('#cln-text', name); await p.fill('#cln-area', 'Fridges');
  if (sec) await L.pick(p, '#cln-section', sec);
  await L.waitFor(p, () => !!window.LK_CLEANING_PLAN, null, 6000).catch(() => {});
};
const weigh = async (p, w) => { await p.click('[data-cln="add-weight"][data-w="' + w + '"]'); await L.settle(p, 50); };
const pressDay = async (p, dow) => { await p.click('.cln-repeat [data-cln="repeat"][data-dow="' + dow + '"]'); await L.settle(p, 50); };
const saveNow = async p => { await p.click('[data-cln="save"]'); await L.waitFor(p, () => !document.querySelector('[data-cln="save"][aria-busy="true"]'), null, 6000).catch(() => {}); await L.settle(p, 100); };
const suggested = async p => (await chips(p)).filter(c => c.tag === 'suggested').map(c => c.dow);

(async () => {
  const b = await L.start();
  // the form at each width: tags under the days, weight, kind, the suggestion, the tonight line; Save carries the weight
  for (const width of [390, 768, 1280]) {
    const p = await open(b, width, base()), reads0 = await p.evaluate(() => window.__fake.reads.length);
    await add(p, 'Made-up drawer fridge wipe ' + width, null);
    const c0 = await chips(p);
    // a Monday-first week: Mon to Sun, each label on its own weekday, today and the light days tagged on the right chip
    ok(c0.map(c => c.day).join() === 'Mon,Tue,Wed,Thu,Fri,Sat,Sun' && c0.every(c => SHORT[c.dow] === c.day), width + ': the week starts on Monday and each chip is its own weekday (' + c0.map(c => c.day + c.dow).join() + ')');
    ok(c0.find(c => c.dow === TODAY).tag === 'today' && c0.filter(c => c.dow !== TODAY && (c.dow === 5 || c.dow === 6)).every(c => c.tag === 'light only'), width + ': today\'s chip says today, Friday and Saturday say light only (' + c0.map(c => c.day + ':' + c.tag).join(' ') + ')');
    ok(/Choose the responsible section, and the book suggests a day/.test(await text(p, '.cln-add-sug')) && await p.locator('[data-cln="add-weight"]').count() === 3, width + ': before a section, the box says what it needs; the three weights are there');
    await L.pick(p, '#cln-section', 'pans'); await L.settle(p, 50);
    const c1 = await chips(p);
    ok(c1.filter(c => c.dow !== TODAY && c.dow !== 5 && c.dow !== 6).every(c => /^has \d+$/.test(c.tag)) && /points Pans already has that night/.test(await text(p, '.cln-add-sug')), width + ': with Pans chosen, each other day says the points Pans has that night (' + c1.map(c => c.day + ':' + c.tag).join(' ') + ')');
    ok(/Choose how long it takes, and the book suggests a day/.test(await text(p, '.cln-add-sug')) && /The book needs it to suggest a day/.test(await text(p, '.cln-add-weight')), width + ': with no weight, no suggestion: "Your call. The book needs it to suggest a day."');
    await weigh(p, 2); await L.pick(p, '#cln-add-kind', 'Fridges'); await L.settle(p, 50);
    const sug = await suggested(p), box = await text(p, '.cln-add-sug');
    ok(sug.length === 1 && new RegExp('Suggested: ' + NAME[sug[0]]).test(box) && /No day is chosen until you press one/.test(box) && (await chips(p)).every(c => !c.on), width + ': Medium and Fridges give one suggested day, shown on its chip and in words, nothing pressed (' + box + ')');
    ok(/Pans has the least|with the other jobs of its kind|heaviest night/i.test(box), width + ': the reason is in plain words (' + box + ')');
    ok(!/of its kind/i.test(box) || new RegExp('(cleans its|clean their) fridges on a ' + NAME[sug[0]] + ' too').test(box), width + ': a shared kind names the section that cleans it that night, as c3 draws it (' + box + ')');
    ok(new RegExp(NAME[TODAY] + ' is today: a new job starts the day it is saved').test(box), width + ': the today line says a new job starts the day it is saved');
    ok(/Friday and Saturday take light jobs only/.test(await text(p, '.cln-add-weight')), width + ': the weight line says what the days take');
    // nothing saved by the suggestion; Save is about the typed job only
    ok(!newJobs(await store(p), 'Made-up drawer fridge wipe ' + width).length && await p.evaluate(() => window.__fake.reads.length) === reads0, width + ': the suggestion saves nothing and reads nothing');
    if (process.env.WIDEFONT) await p.addStyleTag({ content: '* { letter-spacing: .08em !important; }' });
    const lay = await p.evaluate(() => ({ wide: document.documentElement.scrollWidth <= innerWidth, small: [...document.querySelectorAll('.cln-add-day button, .cln-add-day select')].filter(e => e.getClientRects().length && e.getBoundingClientRect().height < 44).map(e => e.textContent.trim()) }));
    ok(lay.wide && !lay.small.length, width + ': no sideways scroll, every control at least 44 px (' + JSON.stringify(lay) + ')');
    if (width === 390 && process.env.SHOTS) await p.screenshot({ path: require('path').join(__dirname, 'shots', 'cleaning-add-day-390.png'), fullPage: true }).catch(() => {});
    await pressDay(p, sug[0]);
    ok(/Chosen\./.test(await text(p, '.cln-add-sug')) && (await chips(p)).find(c => c.dow === sug[0]).on && await p.evaluate(d => document.activeElement && document.activeElement.getAttribute('data-dow') === String(d), sug[0]), width + ': pressing the suggested day chooses it, and focus stays on that chip');
    await saveNow(p);
    const s = await store(p), job = newJobs(s, 'Made-up drawer fridge wipe ' + width)[0] || {};
    ok(job.dows && job.dows.join() === String(sug[0]) && s[PLAN].w[job.root] === 2 && s[PLAN].k[job.root] === 'Fridges' && s[PLAN].w['clean-template-sc-pans-02'] === 3, width + ': Save keeps the job on its day and its weight and kind under its root, the other weights stay');
    ok(/its weight is saved/.test(await text(p, '.cln-save-note')) && !(await p.$('[data-cln="add-weight"]')), width + ': Saved says the weight is saved; the saved job opens as an edit, with no weight offer (' + await text(p, '.cln-save-note') + ')');
    await p.context().close();
  }
  // today pressed: due at tonight's close, before and after Save
  {
    const p = await open(b, 390, base());
    await add(p, 'Made-up tonight job', 'grill'); await weigh(p, 1); await pressDay(p, TODAY);
    ok(new RegExp(NAME[TODAY] + ' is today: saved now, this job is due at tonight\'s close').test(await text(p, '.cln-add-sug')), 'today pressed: the box says the job is due at tonight\'s close');
    await saveNow(p);
    ok(/Starts today: due at tonight's close\./.test(await text(p, '.cln-save-note')), 'after Save: "Starts today: due at tonight\'s close." (' + await text(p, '.cln-save-note') + ')');
    await p.context().close();
  }
  // no weights saved yet: the new job still gets a suggestion from its own weight; a refused weights read: no offer, Save still works
  {
    const p = await open(b, 390, base({ noWeights: true }));
    await add(p, 'Made-up no weights job', 'hot'); await weigh(p, 3);
    ok((await suggested(p)).length === 1 && /Suggested: /.test(await text(p, '.cln-add-sug')), 'with no weights saved yet, a heavy new job still gets a suggested day (' + await text(p, '.cln-add-sug') + ')');
    ok((await suggested(p)).every(d => d !== 5 && d !== 6), 'a heavy job is never suggested for Friday or Saturday');
    await p.context().close();
    const q = await L.open(b, '#/cleaning', { width: 390, height: 844, extra: base(), wait: 1000, admin: true });
    await q.evaluate(() => { window.__fake.denyReads = /cleaningPlan/; });
    await L.waitFor(q, () => { const pg = document.querySelector('.cln-page'); return pg && !/Loading cleaning/.test(pg.textContent); }, null, 8000).catch(() => {});
    await q.locator('[data-cln="setup"]').first().click(); await L.waitFor(q, () => !!document.querySelector('[data-cln="add"]:not([disabled])'), null, 6000).catch(() => {});
    await add(q, 'Made-up read refused job', 'pans'); await L.settle(q, 200);
    ok(/Could not read the weights, so the book cannot suggest a day/.test(await text(q, '.cln-add-day')) && !(await q.$('[data-cln="add-weight"]')), 'a refused weights read: said in words, no weight offered');
    await pressDay(q, 2); await saveNow(q);
    const s = await store(q), job = newJobs(s, 'Made-up read refused job')[0];
    ok(!!job && !(s[PLAN] && s[PLAN].w[job.root]), 'the job still saves, with no weight');
    await q.context().close();
  }
  // a refused batch: neither the job nor its weight; a lost answer: both landed, saved once
  {
    const p = await open(b, 768, base());
    await add(p, 'Made-up refused job', 'fry'); await weigh(p, 2); await pressDay(p, 2);
    await p.evaluate(() => { window.__fake.deny = /cleaningPlan/; });
    await saveNow(p);
    let s = await store(p);
    ok(!newJobs(s, 'Made-up refused job').length && /Refused: nothing was saved, neither the job nor its weight/.test(await text(p, '.cln-save-note')) && await p.$eval('[data-cln="add-weight"][data-w="2"]', e => e.getAttribute('aria-pressed')) === 'true', 'the weight refused: the job is not saved either, it says so, and the form keeps the weight (' + await text(p, '.cln-save-note') + ')');
    await p.evaluate(() => { window.__fake.deny = null; window.__fake.lose = /cleaningPlan/; });
    await saveNow(p);
    ok(!/Saved/.test(await text(p, '.cln-save-note')), 'an answer lost: not called saved (' + await text(p, '.cln-save-note') + ')');
    await p.evaluate(() => { window.__fake.lose = null; });
    await saveNow(p);
    s = await store(p);
    const jobs = newJobs(s, 'Made-up refused job');
    ok(jobs.length === 1 && s[PLAN].w[jobs[0].root] === 2 && /^Saved Made-up refused job/.test(await text(p, '.cln-save-note')), 'Save again after the lost answer: one job, its weight saved, and it says Saved (' + jobs.length + ', ' + await text(p, '.cln-save-note') + ')');
    await p.context().close();
  }
  // Cleaning off: the form as before; an existing job after switch-on: no offer
  {
    const p = await open(b, 390, base({ off: true }));
    await add(p, 'Made-up job while off', 'grill');
    ok(!(await p.$('.cln-add-sug')) && !(await p.$('[data-cln="add-weight"]')) && (await chips(p)).every(c => !c.tag && /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/.test(c.day)), 'Cleaning off: the Add form is as before, no weight and no suggestion');
    await p.context().close();
    const q = await open(b, 390, base());
    await q.locator('[data-cln="edit"]').first().click(); await L.settle(q, 200);
    ok(!!(await q.$('#cln-text')) && !(await q.$('.cln-add-sug')) && !(await q.$('[data-cln="add-weight"]')), 'Cleaning on, an existing job opened: no weight offer and no suggested day');
    await q.context().close();
  }
  L.report(R); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
