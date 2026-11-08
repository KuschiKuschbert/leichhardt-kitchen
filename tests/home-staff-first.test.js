// Staff-first Home: the saved section and hours, complete break/return, then scheduled coworkers before work.
// Synthetic records only. The current shift is the existing configured-shift rule, not proof of physical presence.
const fs = require('fs'), path = require('path'), L = require('./lib'), M = require('../js/functions');
const { R, ok } = L.results(), { txt } = L;
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const day = L.ymd(new Date(L.NOW)), CFG = key(['config', 'main']), TEAM = key(['team', day]);
const at = min => M.kat(day, min);
const people = [
  { id: 'ann', name: 'Ann', role: 'staff', active: true, add: true, tick: true },
  { id: 'sam', name: 'Sam', role: 'sous', active: true, add: true, tick: true, del: true },
  { id: 'bo', name: 'Bo', role: 'staff', active: true, add: true, tick: true },
  { id: 'jo', name: 'Jo', role: 'staff', active: true, add: true, tick: true },
  { id: 'fay', name: 'Fay', role: 'fnc', active: true, fn: true }
];
const config = x => Object.assign({ people, staffIds: ['ann', 'sam', 'bo', 'jo'], sousIds: ['sam'], fnIds: ['fay'], fnOnlyIds: ['fay'],
  kitSecs: [{ id: 'larder', name: 'Larder' }, { id: 'grill', name: 'Grill' }, { id: 'sauce', name: 'Sauce' }],
  kitShifts: [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'overlap', name: 'Afternoon', from: 780, to: 1020 }, { id: 'dinner', name: 'Dinner', from: 960, to: 1320 }] }, x || {});
const plan = x => Object.assign({ day, on: [{ id: 'ann', sh: 'lunch', sec: 'larder' }, { id: 'sam', sh: 'lunch', sec: 'grill' }, { id: 'bo', sh: 'overlap', sec: 'larder' }, { id: 'jo', sh: 'dinner', sec: 'sauce' }],
  br: [{ id: 'ann', sh: 'lunch', at: 870, len: 30 }, { id: 'sam', sh: 'lunch', at: 840, len: 30 }], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' }, x || {});
const booking = M.derive({ v: 1, status: 'confirmed', name: 'Example service', date: day, start: at(810), st: false, loc: '', guests: 40, gu: false, mode: 'all', notes: '', kc: '', kcBy: '', kcAt: 0,
  rounds: [{ at: at(850), note: '' }], lines: [{ rid: 'pizza-platter', name: 'Pizza Platter', unit: 'platter', spec: '', fp: '', qty: 2, u: M.toU([2]) }], was: {}, chg: [], cBy: 'sam', cAt: L.NOW - 86400000, confBy: 'sam', confAt: L.NOW - 86400000, by: 'sam', upd: L.NOW - 3600000 });
const fixture = (p, c) => Object.assign({ [CFG]: config(c), [key(['functions', 'example'])]: booking }, p === null ? {} : { [TEAM]: p || plan() });
const read = (p, s) => txt(p, s).then(t => t || '');
const known = p => L.waitFor(p, () => /Larder/.test(document.querySelector('#hm-day')?.textContent || ''), null, 6000).catch(() => {});
const saved = async (p, data) => {
  await p.evaluate(([tk, d, ck]) => { __fake.write(tk, d); const c = __fake.dump()[ck]; __fake.write(ck, Object.assign({}, c, { pastEdit: Object.assign({}, c.pastEdit || {}, { t: d.upd }) })); }, [TEAM, data, CFG]);
};
(async () => {
  const browser = await L.start(); let p;
  async function step(name, task) {
    try { await task(); }
    catch (e) { ok(false, name + ': ' + String(e.message || e).split('\n')[0]); }
    finally { if (p) { ok(!p.errors.length, name + ': no browser errors ' + p.errors.join(' | ')); await p.context().close(); p = null; } }
  }
  for (const width of [390, 768, 1280]) await step('busy staff Home ' + width, async () => {
    p = await L.open(browser, '#/', { who: 'ann', extra: fixture(), width, height: width === 390 ? 844 : 1024, wait: 1200 });
    // A missing new container is an immediate, meaningful failure on the pre-change Home.
    const exists = !!(await p.$('#hm-day'));
    ok(exists, width + ': a dedicated personal-day block keeps the break out of the work timeline');
    if (!exists) return;
    await known(p);
    const section = await read(p, '[data-hm-priority="section"]'), br = await read(p, '[data-hm-priority="break"]');
    ok(/Larder/.test(section) && /Lunch/.test(section) && /10:00/.test(section) && /15:00/.test(section), width + ': section and full configured shift hours are visible (' + section + ')');
    ok(/14:30/.test(br) && /15:00/.test(br) && /30 min/.test(br) && /back|return/i.test(br), width + ': break shows start, end, duration and return (' + br + ')');
    const crew = await read(p, '#hm-with-body'), names = await p.$$eval('.hm-coworkers > li', rows => rows.map(e => e.textContent));
    ok(/On with you/.test(crew) && names.some(s => /Sam/.test(s)) && names.some(s => /Bo/.test(s)) && names.every(s => !/Ann|Jo/.test(s)), width + ': same-shift and overlapping coworkers show; self and later-only shift stay out (' + JSON.stringify(names) + ')');
    ok(/Grill/.test(crew) && /14:00/.test(crew) && /14:30/.test(crew) && /back|return|to/i.test(crew), width + ': coworker section and scheduled break/return stay visible');
    const positions = await p.evaluate(() => {
      const r = sel => document.querySelector(sel).getBoundingClientRect();
      const own = r('#hm-day'), crew = r('#hm-with'), work = r('#hm-board'), a = document.querySelector('[data-hm-priority="section"]'), b = document.querySelector('[data-hm-priority="break"]');
      return { sourceOrder: !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING), workAfter: work.top >= Math.max(own.bottom, crew.bottom) - 1, crewBottom: crew.bottom,
        barTop: document.querySelector('.tabbar').getBoundingClientRect().top };
    });
    ok(positions.sourceOrder && positions.workAfter && /Example service/.test(await read(p, '#hm-board')), width + ': section then break then coworkers precede the earlier function (' + JSON.stringify(positions) + ')');
    ok(!(await L.overflow(p)), width + ': no sideways scroll');
    if (width === 390) ok(positions.crewBottom <= positions.barTop + 1, 'phone: the two fixture coworkers and own break fit before the fixed tab bar');
    ok(await p.locator('#hm-full-team').evaluate(e => !e.open), width + ': full-day detail starts folded');
    await p.click('#hm-full-team > summary');
    ok(/Jo/.test(await read(p, '#hm-team')) && /Dinner 16:00 to 22:00/.test(await read(p, '#hm-team')), width + ': full saved day, including later-only staff, opens in one tap');
    const count = await p.evaluate(() => __fake.reads.filter(k => /\/team\//.test(k)).length);
    await p.clock.runFor(31000); await L.settle(p, 100);
    ok(await p.locator('#hm-full-team').evaluate(e => e.open) && await p.evaluate(() => __fake.reads.filter(k => /\/team\//.test(k)).length) === count, width + ': a clock repaint preserves the open full-day detail with no team read');
  });
  for (const state of [
    { name: 'on break', br: [{ id: 'ann', sh: 'lunch', at: 840, len: 30 }], want: t => /On.*break/i.test(t) && /14:00/.test(t) && /14:30/.test(t) },
    { name: 'split', br: [{ id: 'ann', sh: 'lunch', at: 810, len: 150 }], want: t => /split/i.test(t) && /13:30/.test(t) && /16:00/.test(t) },
    { name: 'finished break', br: [{ id: 'ann', sh: 'lunch', at: 780, len: 30 }], want: t => /finished|earlier|no.*remaining|no more/i.test(t) && !/not.*set|no break set/i.test(t) },
    { name: 'break not set', br: [], want: t => /not.*set|no break set/i.test(t) }
  ]) await step(state.name, async () => {
    p = await L.open(browser, '#/', { who: 'ann', extra: fixture(plan({ br: state.br })), wait: 1200 });
    ok(state.want(await read(p, '[data-hm-priority="break"]')), state.name + ': the personal row describes the actual saved break state (' + await read(p, '[data-hm-priority="break"]') + ')');
  });
  await step('changed and later breaks', async () => {
    const on = plan().on.concat([{ id: 'ann', sh: 'dinner', sec: 'sauce' }]);
    p = await L.open(browser, '#/', { who: 'ann', extra: fixture(plan({ on, br: plan().br.concat([{ id: 'ann', sh: 'dinner', at: 1245, len: 30 }]) })), wait: 1200 });
    if (!(await p.$('#hm-day'))) { ok(false, 'saved changes: new personal block exists'); return; }
    await known(p);
    // A real prior view establishes which saved plan this person has acknowledged.
    await p.click('#hm-day [data-tm="day"]'); await L.settle(p, 100);
    await p.keyboard.press('Escape'); await L.settle(p, 100);
    await p.click('#hm-full-team > summary');
    const update = plan({ on: on.filter(x => x.id !== 'bo'), br: [{ id: 'ann', sh: 'lunch', at: 855, len: 30 }, { id: 'ann', sh: 'dinner', at: 1245, len: 30 }], v: 2, upd: L.NOW + 60000 });
    await saved(p, update);
    await L.waitFor(p, () => /14:15/.test(document.querySelector('#hm-day')?.textContent || ''), null, 6000);
    ok(/Changed/.test(await read(p, '#hm-day')) && /14:45/.test(await read(p, '[data-hm-priority="break"]')), 'saved changes: new start, return and Changed status replace old personal break (' + await read(p, '#hm-day') + ')');
    ok(await p.locator('#hm-full-team').evaluate(e => e.open), 'saved changes preserve the open full roster');
    ok(!/Bo/.test(await read(p, '#hm-with-body')), 'saved changes remove a coworker who is no longer allocated');
    await p.click('#hm-day [data-tm="day"]');
    ok(/Your day/.test(await read(p, '.tm-dw')) && /20:45/.test(await read(p, '.tm-dw')) && /Dinner/.test(await read(p, '.tm-dw')), 'personal break opens existing Your day with later shift and all remaining breaks');
  });
  await step('return boundary', async () => {
    p = await L.open(browser, '#/', { who: 'ann', clock: at(869), extra: fixture(plan({ br: [{ id: 'ann', sh: 'lunch', at: 840, len: 30 }] })), wait: 1200 });
    ok(/On break now/.test(await read(p, '[data-hm-priority="break"]')), 'one minute before return: own break is current');
    const reads = await p.evaluate(() => __fake.reads.filter(k => /\/team\//.test(k)).length);
    await p.clock.runFor(61000); await L.settle(p, 100);
    const returned = await read(p, '[data-hm-priority="break"]');
    ok(!/On break now/.test(returned) && /Earlier|None left/.test(returned), 'after the exclusive return boundary: the completed break is no longer current (' + returned + ')');
    ok(await p.evaluate(() => __fake.reads.filter(k => /\/team\//.test(k)).length) === reads, 'return boundary repaints from held data without reading the team again');
  });
  await step('unassigned', async () => {
    p = await L.open(browser, '#/', { who: 'ann', extra: fixture(plan({ on: plan().on.filter(x => x.id !== 'ann'), br: [] })), wait: 1200 });
    ok(/not assigned|not.*allocated|no shift/i.test(await read(p, '#hm-day')), 'unassigned: no personal assignment is invented');
    ok(/On today/.test(await read(p, '#hm-with-body')) && /Sam/.test(await read(p, '#hm-with-body')) && /Jo/.test(await read(p, '#hm-with-body')), 'unassigned: saved whole-day team remains visible with an honest heading');
  });
  for (const manual of [{ name: 'manual choice with no saved team', auto: false }, { name: 'manual choice with failed team', auto: false, failReads: '/team/' }, { name: 'old automatic choice with no team', auto: true }]) await step(manual.name, async () => {
    const extra = fixture(null);
    extra[key(['shifts', day + '_ann'])] = { day, sec: 'grill', name: 'Grill', auto: manual.auto, at: L.NOW - 3600000, by: 'ann', sh: 'lunch' };
    p = await L.open(browser, '#/', { who: 'ann', extra, failReads: manual.failReads, wait: 1200 });
    const own = await read(p, '[data-hm-priority="section"]'), br = await read(p, '[data-hm-priority="break"]');
    if (!manual.auto) ok(/Grill/.test(own) && /pick/i.test(own) && !/10:00|15:00/.test(own), manual.name + ': valid independent section survives with its provenance and no invented shift (' + own + ')');
    else ok(!/Grill/.test(own), 'an old automatic plan-derived section is not treated as a current independent choice');
    ok(!/14:30|15:00/.test(br) && /not set|unavailable|could not|checking/i.test(br), manual.name + ': unavailable team never invents a break (' + br + ')');
    ok(/not.*set|could not|checking/i.test(await read(p, '#hm-with-body')), manual.name + ': the team status remains honest');
  });
  const sdk = fs.readFileSync(path.join(__dirname, 'fake', 'firebase-firestore.js'), 'utf8').replace('export function getDoc(ref) {', 'export function getDoc(ref) { if (/\\/team\\//.test(key(ref.path)) && !window.__fake.allowTeamRead) return new Promise(resolve => { window.__fake.releaseTeamRead = () => { window.__fake.allowTeamRead = true; getDoc(ref).then(resolve); }; });');
  await step('loading and unset plan', async () => {
    p = await L.open(browser, '#/', { who: 'ann', extra: fixture(null), fakeSDK: { 'firebase-firestore.js': sdk }, wait: 900 });
    await L.waitFor(p, () => typeof __fake.releaseTeamRead === 'function', null, 6000);
    const checking = await read(p, '#hm-day');
    ok(/checking|loading/i.test(checking) && !/14:30|Nobody/.test(checking), 'pending plan: personal facts say checking, not invented times');
    await p.evaluate(() => __fake.releaseTeamRead()); await L.settle(p, 400);
    const unset = await read(p, '#hm-day');
    ok(/not.*set|not.*published|no.*saved|not assigned/i.test(unset) && !/14:30|Nobody/.test(unset), 'unset plan: no saved personal plan differs from an empty team');
  });
  for (const bad of [{ name: 'failed', failReads: '/team/' }, { name: 'wrong day', extra: fixture(plan({ day: '2000-01-01' })) }]) await step(bad.name, async () => {
    p = await L.open(browser, '#/', Object.assign({ who: 'ann', extra: fixture(), wait: 1200 }, bad));
    const t = await read(p, '#hm-day');
    ok(/could not|unavailable|checking|loading|unable/i.test(t) && !/14:30|Lunch|Larder|Nobody/.test(t), bad.name + ': unavailable plan exposes no stale personal facts (' + t + ')');
  });
  await step('hostile labels', async () => {
    const label = 'Zz<i id="home-pwn"></i><img src=x onerror="window.__homePwn=1">';
    p = await L.open(browser, '#/', { who: 'ann', extra: fixture(undefined, { people: people.map(x => ({ ...x, name: x.id === 'sam' ? label : x.name })),
      kitSecs: [{ id: 'larder', name: label }, { id: 'grill', name: label }], kitShifts: [{ id: 'lunch', name: label, from: 600, to: 900 }, ...config().kitShifts.slice(1)] }), wait: 1200 });
    ok((await read(p, '#hm-day')).includes(label) && (await read(p, '#hm-with-body')).includes(label) && await p.evaluate(() => !document.querySelector('#home-pwn, img[src="x"]') && !window.__homePwn), 'person, section and shift labels remain literal text in personal/coworker blocks');
    ok(!(await L.overflow(p)), 'long hostile labels do not cause sideways scrolling');
  });
  for (const who of ['sam', '', 'fay']) await step('role ' + (who || 'signed out'), async () => {
    p = await L.open(browser, '#/', { who, noPin: !who, extra: fixture(), wait: 1200 });
    if (who === 'sam') ok(/Grill/.test(await read(p, '#hm-day')) && /14:30/.test(await read(p, '#hm-day')), 'chef with a personal allocation also receives their section and return first');
    else ok(!(await p.$('.hm-staff-first,#hm-day,#hm-with')), (who || 'signed out') + ': staff plan blocks remain private');
  });
  await browser.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
