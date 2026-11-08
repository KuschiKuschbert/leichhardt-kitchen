// Staff can read today's saved team on Home without opening the chef's planner. Unknown plans never imply nobody.
const fs = require('fs'), path = require('path'), L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW)), CFG = key(['config', 'main']), TEAM = key(['team', today]);
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
  { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, active: true },
  { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, active: true },
  { id: 'fay', name: 'Fay', role: 'fnc', fn: true, active: true }
];
const config = x => Object.assign({ people, staffIds: people.map(p => p.id), sousIds: ['sam'], fnIds: ['fay'], fnOnlyIds: ['fay'],
  kitSecs: [{ id: 'larder', name: 'Larder' }, { id: 'grill', name: 'Grill' }],
  kitShifts: [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'dinner', name: 'Dinner', from: 960, to: 1320 }] }, x || {});
const plan = x => Object.assign({ day: today, on: [{ id: 'ann', sh: 'lunch', sec: 'larder' }, { id: 'ann', sh: 'dinner', sec: 'grill' }, { id: 'sam', sh: 'dinner', sec: '' }],
  br: [{ id: 'ann', sh: 'lunch', at: 870, len: 30 }], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' }, x || {});
const fixture = (p, c) => Object.assign({ [CFG]: config(c) }, p === null ? {} : { [TEAM]: p || plan() });
const text = async p => { const detail = p.locator('#hm-full-team'); if (await detail.count() && !(await detail.evaluate(e => e.open))) { if (await p.locator('dialog[open]').count()) { await p.keyboard.press('Escape'); await L.settle(p, 100); } await p.click('#hm-full-team > summary'); } return (await txt(p, '#hm-team')) || ''; };
const ready = p => L.waitFor(p, () => !!document.querySelector('#hm-team .hm-tp'), null, 6000).catch(() => {});
const teamReads = p => p.evaluate(() => __fake.reads.filter(k => /\/team\//.test(k)).length);
const noFalseZero = t => !/Nobody|No one|No staff|No people/i.test(t);
const noRows = p => p.$$eval('#hm-team .hm-tp', l => l.length === 0);

(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/', { who: 'bo', extra: fixture(), wait: 1400 });
  await ready(p);
  const all = await text(p);
  ok(/Ann/.test(all) && /Sam/.test(all) && /Larder/.test(all) && /Grill/.test(all) && /Lunch 10:00 to 15:00/.test(all) && /Dinner 16:00 to 22:00/.test(all), 'staff without their own allocation still see everyone and every saved shift, section and hours (' + all + ')');
  ok(!(await p.$('.wtop .tm-slot .tm-chip')) && !(await p.$('#hm-team a[href="#/team"], #hm-team button, #hm-team input, #hm-team select')), 'staff without an allocation have no own-day chip or roster editing controls');
  ok(await teamReads(p) === 1 && await p.evaluate(() => __fake.bill.filter(x => /\/team\//.test(x.path) && /listen/.test(x.kind)).length) === 0, 'staff roster uses the existing single team read and has no team listener');
  ok(await p.evaluate(() => __fake.writes.flat().filter(x => /\/team\//.test(x.path)).length === 0), 'reading the roster writes no team record');

  // A saved update arrives by the kitchen's existing config stamp, with one read and no new listener.
  const changed = plan({ v: 2, upd: L.NOW + 60000, on: [{ id: 'ann', sh: 'dinner', sec: 'grill' }] });
  await p.evaluate(([k, d, cf, t]) => { __fake.write(k, d); const c = __fake.dump()[cf]; __fake.write(cf, Object.assign({}, c, { pastEdit: Object.assign({}, c.pastEdit || {}, { t }) })); }, [TEAM, changed, CFG, L.NOW + 60000]);
  await L.waitFor(p, () => document.querySelectorAll('#hm-team .hm-tp').length === 1, null, 6000).catch(() => {});
  const saved = await text(p);
  ok(/Ann/.test(saved) && /Dinner 16:00 to 22:00/.test(saved) && !/Sam|Lunch/.test(saved), 'the roster follows the newly saved plan, removing old allocations (' + saved + ')');
  ok(await teamReads(p) === 2, 'a saved team stamp adds exactly the existing one team read');
  await p.evaluate(() => { location.hash = '#/team'; }); await L.settle(p, 500);
  ok(/The head chef and the sous chefs set today's team/.test(await txt(p, '.tm-page') || '') && !(await p.$('.tm-work')), 'staff still cannot open the planner even with a saved roster');
  ok(p.errors.length === 0, 'staff without an allocation: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Real names are private data; these deliberately hostile synthetic labels must stay text in the roster.
  const label = 'Zz<i id="roster-pwn"></i><img src=x onerror="window.__rosterPwn=1">';
  p = await L.open(b, '#/', { who: 'ann', extra: fixture(plan({ on: [{ id: 'sam', sh: 'dinner', sec: 'grill' }] }), {
    people: people.map(x => Object.assign({}, x, x.id === 'sam' ? { name: label } : {})),
    kitSecs: [{ id: 'grill', name: 'Grill ' + label }], kitShifts: [{ id: 'dinner', name: 'Dinner ' + label, from: 960, to: 1320 }]
  }), wait: 1400 });
  await ready(p);
  ok((await text(p)).includes(label) && await p.evaluate(() => !document.querySelector('#roster-pwn, img[src="x"]') && !window.__rosterPwn), 'roster person, section and shift names display as text without executing markup');
  ok(!(await L.overflow(p)) && p.errors.length === 0, 'long synthetic roster labels fit a staff phone without sideways scroll or errors');
  await p.context().close();

  // Hold only the team read, then release it to an unset plan. Both states differ from a saved empty roster.
  const sdk = fs.readFileSync(path.join(__dirname, 'fake', 'firebase-firestore.js'), 'utf8').replace('export function getDoc(ref) {', 'export function getDoc(ref) { if (/\\/team\\//.test(key(ref.path)) && !window.__fake.allowTeamRead) return new Promise(resolve => { window.__fake.releaseTeamRead = () => { window.__fake.allowTeamRead = true; getDoc(ref).then(resolve); }; });');
  p = await L.open(b, '#/', { who: 'ann', extra: fixture(null), fakeSDK: { 'firebase-firestore.js': sdk }, wait: 900 });
  await L.waitFor(p, () => !!__fake && typeof __fake.releaseTeamRead === 'function', null, 6000);
  const loading = await text(p);
  ok(/Checking|Loading/i.test(loading) && noFalseZero(loading) && await noRows(p), 'a pending roster read says it is checking, without inventing an empty team (' + loading + ')');
  await p.evaluate(() => __fake.releaseTeamRead()); await L.settle(p, 600);
  const unset = await text(p);
  ok(/not.*set|not.*saved|no saved|not.*roster|not.*team/i.test(unset) && noFalseZero(unset) && await noRows(p), 'an unset plan stays distinct from nobody rostered (' + unset + ')');
  ok(p.errors.length === 0, 'loading and unset plans: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  for (const state of [{ name: 'failed', extra: fixture(), failReads: '/team/' }, { name: 'wrong-day', extra: fixture(plan({ day: '2000-01-01' })) }]) {
    p = await L.open(b, '#/', { who: 'ann', extra: state.extra, failReads: state.failReads, wait: 1200 });
    const unavailable = await text(p);
    ok(/Could not|couldn't|Unable|cannot|checking|Loading/i.test(unavailable) && noFalseZero(unavailable) && await noRows(p), state.name + ': an unavailable roster never shows stale names or falsely says nobody (' + unavailable + ')');
    ok(p.errors.length === 0, state.name + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  p = await L.open(b, '#/', { who: 'ann', extra: fixture(plan({ on: [], br: [] })), wait: 1200 });
  ok(/Nobody is rostered today/.test(await text(p)) && await noRows(p), 'a successfully read empty saved plan can explicitly say nobody is rostered');
  await p.context().close();

  // Read-only visibility does not change the kitchen's existing session or Functions-only boundaries.
  for (const access of [{ name: 'signed out', who: '', noPin: true }, { name: 'locked shared device', who: 'ann', deviceMode: 'shared', dailyLocked: true }, { name: 'Functions only', who: 'fay' }]) {
    p = await L.open(b, '#/', Object.assign({ extra: fixture(), wait: 1200 }, access));
    ok(await noRows(p) && !(await p.$('#hm-team:not([hidden])')), access.name + ': the roster is not exposed');
    ok(await teamReads(p) === 0 && p.errors.length === 0, access.name + ': no team read or page error ' + p.errors.join(' | '));
    await p.context().close();
  }
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
