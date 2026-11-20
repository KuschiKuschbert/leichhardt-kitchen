/*
  A failed read looks one way on the chef tools too (the consistency sweep, step 2, 20 Nov 2026,
  docs/design-patterns.md, A page): Delivery received, the supplier order and the recipe editor's Earlier versions.
  A failed read is one red line with role status that says what could not load, and a Try again that reads again
  (.p-readerr, LK_PREP.readErr()). No signal on its own is a neutral note, never the red failure look. The delivery
  and supplier reads try once more by themselves after 5 minutes or when the signal comes back, and read nothing when
  nothing failed. The checks marked (old) failed on the code before this change.
*/
const L = require('./lib');
const F = require('./supplier-fixtures');
const { R, ok } = L.results();
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const today = L.ymd(new Date(L.NOW));
const wait = (p, fn, arg, t) => L.waitFor(p, fn, arg, t || 8000).then(() => true, () => false);

// Delivery received: a head chef, a sous chef and staff; one receipt today
const people = [['head', 'Head', 'head'], ['sam', 'Sam', 'sous'], ['ann', 'Ann', 'staff']].map(([id, name, role]) => ({ id, name, role, active: true, add: true, tick: true, del: false }));
const dlExtra = { [key('config', 'main')]: { people, staffIds: people.map(x => x.id), headId: 'head', sousIds: ['head', 'sam'] },
  [key('deliveries', 'd1')]: { day: today, supplier: 'Test receipt supplier', receivedAt: L.NOW - 60000, recordedAt: L.NOW - 60000, chilled: 2.5, frozen: -18, note: 'Test goods', receivedBy: 'Ann', receivedById: 'ann', by: 'ann' } };
people.forEach(x => { dlExtra[key('pinset', x.id)] = { at: 1 }; });

// the failed-read line in a part of the page: how many, its role, its words, its Try again and what that button is
const readLine = (p, scope) => p.evaluate(s => {
  const box = document.querySelector(s); if (!box) return null;
  const all = box.querySelectorAll('.p-readerr'), e = all[0]; if (!e) return { n: 0 };
  const btn = e.querySelector('button');
  return { n: all.length, role: e.getAttribute('role'), text: e.textContent.replace(/\s+/g, ' ').trim(), retry: !!btn && /^Try again$/.test(btn.textContent.trim()),
    link: !!btn && btn.classList.contains('p-link') && !btn.classList.contains('btn'), inBox: !!e.closest('.su-error, .dl-error') };
}, scope);
// a note with these words: its element, whether it is drawn as a failure and whether its colour is the failure red
const noteLook = (p, scope, rx) => p.evaluate(([s, src]) => {
  const box = document.querySelector(s); if (!box) return null;
  const re = new RegExp(src), el = [...box.querySelectorAll('p, div, section')].filter(x => re.test(x.textContent)).pop(); if (!el) return null;
  const probe = document.createElement('span'); probe.style.color = 'var(--bad-ink)'; document.body.appendChild(probe);
  const bad = getComputedStyle(probe).color; probe.remove();
  return { text: el.textContent.replace(/\s+/g, ' ').trim(), role: el.getAttribute('role'), failure: !!el.closest('.su-error, .dl-error, .p-err, .p-readerr'), red: getComputedStyle(el).color === bad };
}, [scope, rx.source]);
const reads = (p, rx) => p.evaluate(src => (window.__fake.reads || []).filter(k => new RegExp(src).test(k)).length, rx.source);
const offline = p => p.evaluate(() => { Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false }); window.dispatchEvent(new Event('offline')); });
const online = p => p.evaluate(() => { Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true }); window.dispatchEvent(new Event('online')); });

(async () => {
  const b = await L.start();
  let p, x;

  // ---------- Delivery received ----------
  const dlOpen = async o => { const pg = await L.open(b, '#/deliveries', Object.assign({ who: 'ann', extra: dlExtra, wait: 1800 }, o || {})); await pg.waitForSelector('#dl-supplier'); return pg; };
  const dlRecords = p => wait(p, () => /Test receipt supplier/.test((document.querySelector('.dl-receipts') || {}).textContent || '') && !document.querySelector('.dl-history .p-readerr'));

  // today's live read refused (the free reads used up): one failed-read line with Try again, never "tap Refresh"
  p = await dlOpen({ exhausted: '/deliveries' });
  await wait(p, () => !!document.querySelector('.dl-history .p-readerr, .dl-history .dl-error'));
  x = await readLine(p, '.dl-history');
  const dlText = await p.evaluate(() => document.querySelector('.dl-history').textContent);
  ok(!!x && x.n === 1 && x.role === 'status' && x.retry && x.link && /Could not read/.test(x.text), '(old) deliveries: a failed read is one line with Try again (' + JSON.stringify(x) + ')');
  ok(!/tap Refresh/i.test(dlText) && !(await p.$('.dl-history .dl-error')) && !/No deliveries/.test(dlText), '(old) deliveries: no "tap Refresh" line and never "No deliveries" (' + dlText.replace(/\s+/g, ' ').slice(0, 160) + ')');
  // the reads come back, then Try again brings today's records
  await p.evaluate(() => { window.__fake.exhausted = null; });
  if (await p.$('.dl-history .p-readerr button')) await p.click('.dl-history .p-readerr button');
  ok(await dlRecords(p), '(old) deliveries: Try again reads again and brings the records');
  ok(!p.errors.length && !(await L.overflow(p)), 'deliveries, failed read: no page errors, no sideways scroll ' + p.errors.join(' | '));
  await p.context().close();

  // it tries once more by itself after 5 minutes, and not before
  p = await dlOpen({ exhausted: '/deliveries' });
  await wait(p, () => !!document.querySelector('.dl-history .p-readerr, .dl-history .dl-error'));
  await p.evaluate(() => { window.__fake.exhausted = null; });
  await p.clock.runFor(4 * 60000); await L.settle(p, 300);
  ok(!(await p.$('.dl-receipt')), 'deliveries: nothing read again before the 5 minutes');
  await p.clock.runFor(61000); await L.settle(p, 300);
  ok(await dlRecords(p), '(old) deliveries: after 5 minutes it reads once more by itself and the records show');
  await p.context().close();

  // and when the phone is back online
  p = await dlOpen({ exhausted: '/deliveries' });
  await wait(p, () => !!document.querySelector('.dl-history .p-readerr, .dl-history .dl-error'));
  await p.evaluate(() => { window.__fake.exhausted = null; });
  await online(p);
  ok(await dlRecords(p), '(old) deliveries: back online, it reads once more by itself and the records show');
  await p.context().close();

  // no signal (the copy in memory answers): a neutral note that says what still works, not the failure red
  p = await dlOpen({ cold: '/deliveries' });
  await wait(p, () => /No signal/.test((document.querySelector('.dl-history') || {}).textContent || ''));
  x = await noteLook(p, '.dl-history', /No signal/);
  ok(!!x && /No signal\. Today's deliveries show when the phone is back online\./.test(x.text) && x.role === 'status', 'deliveries, no signal: says so and when the list shows (' + (x && x.text) + ')');
  ok(!!x && !x.failure && !x.red, '(old) deliveries, no signal: a neutral note, not the red failure line (' + JSON.stringify(x) + ')');
  ok(!!x && /form|typed/i.test(x.text), '(old) deliveries, no signal: says what still works (' + (x && x.text) + ')');
  ok(!(await p.$('.dl-history .p-readerr')), 'deliveries, no signal: no failed-read line, nothing failed');
  await p.context().close();

  // ---------- Supplier order ----------
  const suOpen = o => L.open(b, '#/suppliers/northside', Object.assign({ who: 'bo', extra: F.fixture(), wait: 1800 }, o || {}));
  const suReady = p => wait(p, () => !!document.querySelector('input[data-sf="qty"]'), null, 15000);
  const suFailed = p => wait(p, () => !!document.querySelector('.su-wrap .p-readerr, [data-su="retry"]'), null, 12000);
  const SUP = /\/suppliers$/;

  p = await suOpen({ failReads: '/suppliers(?:/|$)' });
  await suFailed(p);
  x = await readLine(p, '.su-wrap');
  ok(!!x && x.n === 1 && x.role === 'status' && x.retry && x.link && !x.inBox && /supplier/i.test(x.text), '(old) supplier order: a failed read is one line with Try again, not a red box (' + JSON.stringify(x) + ')');
  ok(!(await p.$('.su-error .btn[data-su="retry"]')) && !!(await p.$('.p-readerr [data-su="retry"]')), '(old) supplier order: Try again is the line\'s own link, not a full button in a box');
  ok(!(await p.$('input[data-sf="qty"]')), 'supplier order: a failed read shows no goods');
  // a second tap while the read is out starts no second read
  const before = await reads(p, SUP);
  await p.evaluate(() => { const btn = document.querySelector('[data-su="retry"]'); btn.click(); btn.click(); });
  await L.settle(p, 900);
  ok(await reads(p, SUP) - before === 1, 'supplier order: two quick taps on Try again read once (' + (await reads(p, SUP) - before) + ')');
  await suFailed(p);
  await p.evaluate(() => { window.__fake.failReads = null; });
  await p.click('[data-su="retry"]');
  ok(await suReady(p) && !(await p.$('.su-wrap .p-readerr')), 'supplier order: Try again brings the catalogue');
  ok(!p.errors.length && !(await L.overflow(p)), 'supplier order, failed read: no page errors, no sideways scroll ' + p.errors.join(' | '));
  await p.context().close();

  // once more by itself after 5 minutes
  p = await suOpen({ failReads: '/suppliers(?:/|$)' });
  await suFailed(p);
  await p.evaluate(() => { window.__fake.failReads = null; });
  await p.clock.runFor(5 * 60000 + 1000);
  ok(await suReady(p), '(old) supplier order: after 5 minutes it reads once more by itself and the catalogue shows');
  await p.context().close();

  // and when the phone is back online
  p = await suOpen({ failReads: '/suppliers(?:/|$)' });
  await suFailed(p);
  await p.evaluate(() => { window.__fake.failReads = null; });
  await online(p);
  ok(await suReady(p), '(old) supplier order: back online, it reads once more by itself');
  await p.context().close();

  // no signal with the catalogue open: a neutral note, not inside the red box; back online reads nothing
  p = await suOpen({ width: 1280 });
  await suReady(p); await L.settle(p, 300);
  await offline(p); await L.settle(p, 200);
  x = await noteLook(p, '.su-wrap', /No signal/);
  ok(!!x && x.role === 'status' && !x.failure && !x.red, '(old) supplier order, no signal: a neutral note, not inside .su-error (' + JSON.stringify(x) + ')');
  ok(!!x && /draft/i.test(x.text), 'supplier order, no signal: says the drafts on the page are kept (' + (x && x.text) + ')');
  const n0 = await reads(p, SUP);
  await online(p); await L.settle(p, 2500);
  ok(await reads(p, SUP) === n0 && !(await p.$('.su-wrap .p-readerr')), 'supplier order: back online with nothing failed, nothing is read again');
  await p.clock.runFor(5 * 60000 + 1000); await L.settle(p, 300);
  ok(await reads(p, SUP) === n0, 'supplier order: nothing failed, so nothing is read after 5 minutes');
  ok(!p.errors.length, 'supplier order, no signal: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // ---------- The recipe editor's Earlier versions ----------
  const P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true });
  const old = { r: { id: 'burger', kind: 'main', no: '1', forLine: 'Plate', name: 'Old Burger v1', yield: 'Per plate', ingredients: [{ q: '1', name: 'Bun' }], pins: [] }, v: 1, upd: L.NOW - 9e6, src: 'book', base: '', removed: false, by: 'ann' };
  const cur = { r: { id: 'burger', kind: 'main', no: '1', forLine: 'Plate', name: 'Chicken Burger', yield: 'Per plate', ingredients: [{ q: '1', name: 'Bun' }, { q: '1', name: 'Chicken' }], pins: [] }, v: 2, upd: L.NOW - 3e6, src: 'book', base: '', removed: false, by: 'ann' };
  const mgExtra = { [key('config', 'main')]: { people: [P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'head'), P('bo', 'Bo', 'staff')], headId: 'ann', sousIds: ['sam', 'ann'], pingIds: ['sam', 'ann'], showBadges: true },
    [key('recipes', 'burger')]: cur, [key('recipes', 'burger', 'hist', '1')]: { was: old, at: L.NOW - 3e6 }, [key('book', 'index')]: { r: { burger: 2 }, upd: L.NOW - 3e6 } };
  const HIST = /\/recipes\/burger\/hist$/;
  p = await L.open(b, '#/manage/r/burger', { who: 'ann', extra: mgExtra, wait: 1400, failReads: '/recipes/burger/hist' });
  await wait(p, () => !!document.getElementById('mg-name'));
  await L.reveal(p, '[data-mg="hist"]'); await p.click('[data-mg="hist"]');
  await wait(p, () => { const s = document.querySelector('[aria-labelledby="mg-h-hist"]'); return !!s && !!s.querySelector('.p-err'); });
  x = await readLine(p, '[aria-labelledby="mg-h-hist"]');
  ok(!!x && x.n === 1 && x.role === 'status' && x.retry && /earlier versions/i.test(x.text) && !/Check the signal/.test(x.text), '(old) earlier versions: a failed read offers Try again (' + JSON.stringify(x) + ')');
  await p.evaluate(() => { window.__fake.failReads = null; });
  const h0 = await reads(p, HIST);
  // two quick taps: one read
  await p.evaluate(() => { const btn = document.querySelector('[aria-labelledby="mg-h-hist"] .p-readerr button'); if (btn) { btn.click(); btn.click(); } });
  ok(await wait(p, () => document.querySelectorAll('.mg-hist li').length >= 1) && /Version 1/.test(await L.txt(p, '.mg-hist') || ''), '(old) earlier versions: Try again reads them again and lists version 1');
  ok(await reads(p, HIST) - h0 === 1, '(old) earlier versions: two quick taps on Try again read once (' + (await reads(p, HIST) - h0) + ')');
  ok(!p.errors.length && !(await L.overflow(p)), 'earlier versions: no page errors, no sideways scroll ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
