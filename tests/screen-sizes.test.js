// Screens the book runs on (head chef, 26 Nov 2026, docs/device-coverage.md). After a PIN sign-in each device saves its
// own screen once to screens/<its uid>, quietly, and again only when its screen changes; a refused save shows nothing.
// The verified admin reads them all when the Screens row in Admin, Kitchen opens, and every value is checked by type.
// All people, devices and records are synthetic.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const pins = { ann: '2222', sam: '1111' };
const extra = {};
for (const id of Object.keys(pins)) {
  extra[key('pinset', id)] = { at: 1 };
  extra[key('staffpins', id)] = { hash: L.sha('lk:' + id + ':' + pins[id]) };
  extra[key('drinks', id)] = { kind: 'flat', size: 'reg', at: L.NOW - 86400000, by: id };
}
function init() {
  const day = new Date(Date.now() + 10 * 3600000).toISOString().slice(0, 10);
  ['ann', 'sam', 'kit', 'bo'].forEach(id => localStorage.setItem('lk.board.' + id, day));
}
const FIELDS = ['sw', 'sh', 'w', 'h', 'dpr', 'tp', 'ptr', 'mouse', 'hov', 'app', 'kind', 'sec', 'at', 'by'];
const uidOf = p => p.evaluate(() => LK_PREP.state.uid);
const rec = (p, uid) => p.evaluate(k => __fake.dump()[k] || null, key('screens', uid));
const screenWrites = p => p.evaluate(() => __fake.writes.flat().filter(w => /\/screens\//.test(w.path)).length);
const screenReads = p => p.evaluate(() => __fake.reads.filter(k => /\/screens$/.test(k)).length);
async function unlock(p, id) {
  const pick = p.locator('.p-name[data-id="' + id + '"]');
  if (await pick.count() && await pick.isVisible()) { await pick.click(); await L.settle(p, 200); }
  await p.locator('[data-k="pf1"]').fill(pins[id]);
  await L.waitFor(p, expected => LK_PREP.state.authed && LK_PREP.state.who === expected, id, 8000);
}

(async () => {
  const b = await L.start();
  let p;
  async function step(label, run) {
    try { await run(); }
    catch (e) { ok(false, label + ': ' + String(e.message || e).split('\n')[0]); }
    finally {
      if (p) { ok(!p.errors.length, label + ': no browser errors ' + p.errors.join(' | ')); await p.context().close(); p = null; }
    }
  }

  await step('a phone saves its screen once, after the PIN', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', noTok: true, width: 390, height: 844, touch: true, extra, init, wait: 1400 });
    const uid = await uidOf(p);
    ok(!(await rec(p, uid)) && await screenWrites(p) === 0, 'phone: nothing is saved before anyone signs in');
    await unlock(p, 'ann');
    await p.clock.runFor(5000);
    await L.waitFor(p, k => !!__fake.dump()[k], key('screens', uid), 8000);
    const r = await rec(p, uid);
    ok(r && JSON.stringify(Object.keys(r).sort()) === JSON.stringify(FIELDS.slice().sort()), 'phone: the record has exactly its fields (' + (r ? Object.keys(r).sort().join(',') : 'none') + ')');
    ok(r && r.w === 390 && r.h > 0 && r.sw > 0 && r.sh > 0 && typeof r.dpr === 'number', 'phone: it says the book is 390 px wide on its screen (' + (r && r.w) + ')');
    ok(r && r.tp > 0 && r.kind === 'personal' && r.sec === '' && r.by === 'ann' && typeof r.at === 'number', 'phone: touch, a personal device, saved as Ann');
    ok(await p.evaluate(() => !!localStorage.getItem('lk.screen.v1')), 'phone: the device keeps what it saved');
    ok(!(await p.evaluate(() => [...document.querySelectorAll('.toast, [role="alert"]')].some(e => e.getClientRects().length && /screen/i.test(e.textContent)))), 'phone: nothing on screen says anything about it');
    ok(await screenWrites(p) === 1, 'phone: one write');
  });

  await step('a shared section screen saves once, and the next person does not save it again', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', noTok: true, deviceMode: 'shared', width: 1920, height: 1080, touch: true, extra, init, wait: 1400 });
    const uid = await uidOf(p);
    await unlock(p, 'ann');
    await p.clock.runFor(5000);
    await L.waitFor(p, k => !!__fake.dump()[k], key('screens', uid), 8000);
    const first = await rec(p, uid);
    ok(first && first.kind === 'shared' && first.w === 1920 && first.tp > 0 && first.by === 'ann', 'shared screen: saved as shared, 1920 wide, touch, by Ann');
    await L.notYou(p);
    await L.waitFor(p, () => !LK_PREP.state.authed, null, 8000);
    await p.click('.wall-sign a.btn'); await L.settle(p, 600);
    await unlock(p, 'sam');
    await p.clock.runFor(5000); await L.settle(p, 400);
    ok(await screenWrites(p) === 1 && (await rec(p, uid)).by === 'ann', 'shared screen: Sam signing in on the same screen saves nothing more');
  });

  await step('a refused save shows nothing and is tried again next time', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', noTok: true, width: 390, height: 844, touch: true, extra, init, wait: 1400 });
    const uid = await uidOf(p);
    await p.evaluate(() => { window.__fake.deny = /\/screens\//; });
    await unlock(p, 'ann');
    await p.clock.runFor(5000); await L.settle(p, 600);
    ok(!(await rec(p, uid)), 'refused: nothing is stored');
    ok(await p.evaluate(() => !localStorage.getItem('lk.screen.v1')), 'refused: the device does not mark it saved, so the next sign-in tries again');
    ok(!(await p.evaluate(() => [...document.querySelectorAll('.toast, [role="alert"]')].some(e => e.getClientRects().length && /not saved|screen/i.test(e.textContent)))), 'refused: no message, no Not saved');
    ok(await p.evaluate(() => location.hash) !== '' && await p.evaluate(() => LK_PREP.state.authed && LK_PREP.state.who === 'ann'), 'refused: Ann stays signed in where she was');
  });

  const shots = {
    [key('screens', 'dev-a')]: { sw: 1536, sh: 864, w: 1536, h: 730, dpr: 1.25, tp: 10, ptr: 'coarse', mouse: false, hov: false, app: true, kind: 'shared', sec: 'gone-sec', at: L.NOW - 3600000, by: 'sam' },
    [key('screens', 'dev-b')]: { sw: 1536, sh: 864, w: 1536, h: 730, dpr: 1.25, tp: 10, ptr: 'coarse', mouse: false, hov: false, app: true, kind: 'shared', sec: '', at: L.NOW - 7200000, by: 'bo' },
    [key('screens', 'dev-c')]: { sw: 390, sh: 844, w: 390, h: 664, dpr: 3, tp: 5, ptr: 'coarse', mouse: false, hov: false, app: true, kind: 'personal', sec: '', at: L.NOW - 60000, by: 'sam' },
    [key('screens', 'dev-d')]: { sw: 'big', sh: '<b>x</b>', w: -4, h: 1e9, dpr: 99, tp: '<i>', ptr: '<img src=x onerror=alert(1)>', mouse: 'yes', hov: 1, app: 'true',
      kind: '<img src=x onerror=alert(1)>', sec: '<img src=x onerror=alert(2)>', at: 'soon', by: '<b onclick=alert(3)>Zed</b>' }
  };
  for (const [w, h] of [[1280, 900], [390, 844]]) await step('the head chef reads every screen in Admin, Kitchen at ' + w, async () => {
    p = await L.open(b, '#/admin', { admin: true, adminPage: 'kitchen-home', width: w, height: h, touch: w < 600, extra: shots, wait: 1600 });
    await L.waitFor(p, () => !!document.querySelector('[data-p="k-row"][data-r="screens"]'), null, 8000);
    ok(await screenReads(p) === 0, w + ': nothing is read before the row opens');
    await L.kitchenRow(p, 'screens');
    await L.waitFor(p, () => !!document.querySelector('#k-b-screens .lv') || /Could not/.test((document.querySelector('#k-b-screens') || {}).textContent || ''), null, 8000);
    const text = await p.evaluate(() => document.querySelector('#k-b-screens').innerText);
    ok(await screenReads(p) === 1, w + ': opening the row reads the screens once');
    ok(/Shared screens: 1536 x 864 at 125 %, touch \(2\)/.test(text), w + ': the shared screens are summed up by size (' + (text.match(/Shared screens:[^\n]*/) || [''])[0] + ')');
    ok(/1920 x 1080 pixels/.test(text) && /Book window 1536 x 730/.test(text), w + ': the screen\'s pixels and the book\'s window show');
    ok(/Sam's device/.test(text) && /1170 x 2532 pixels/.test(text) && /Shared screen, a section no longer on the list/.test(text), w + ': a phone by its person, a screen by its section');
    ok(/Touch, installed app/.test(text), w + ': touch and the installed app say so');
    ok(await p.evaluate(() => !document.querySelector('#k-b-screens img, #k-b-screens b, #k-b-screens i, [onclick], [onerror]')), w + ': a hostile record adds no markup');
    ok(/A device/.test(text) && /Not known/.test(text) && /someone no longer on the list/.test(text), w + ': a record with wrong types shows plain words, not its values');
    ok(!(await L.overflow(p)), w + ': no sideways scroll with the row open');
    await p.click('#k-b-screens [data-p="screens-retry"]');
    await L.waitFor(p, () => !!document.querySelector('#k-b-screens .lv'), null, 8000);
    ok(await screenReads(p) === 2, w + ': Read again reads them once more');
  });

  await step('a refused read says so, with Try again', async () => {
    p = await L.open(b, '#/admin', { admin: true, adminPage: 'kitchen-home', width: 1280, height: 900, extra: shots, wait: 1600 });
    await p.evaluate(() => { window.__fake.denyReads = /\/screens$/; });
    await L.kitchenRow(p, 'screens');
    await L.waitFor(p, () => /may not read the screens/.test((document.querySelector('#k-b-screens') || {}).textContent || ''), null, 8000);
    ok(await p.evaluate(() => !!document.querySelector('#k-b-screens [role="alert"]') && !document.querySelector('#k-b-screens .lv')), 'refused: an alert and no empty list');
    await p.evaluate(() => { window.__fake.denyReads = null; });
    await p.click('#k-b-screens [data-p="screens-retry"]');
    await L.waitFor(p, () => !!document.querySelector('#k-b-screens .lv'), null, 8000);
    ok(true, 'refused: Try again reads the list once the read is allowed');
  });

  await b.close(); L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
