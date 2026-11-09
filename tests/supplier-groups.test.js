// Orders C (9 Nov 2026): requests stay in one list, independent of supplier catalogues and confirmations.
// Supplier cut-offs have a compact, initially closed disclosure. These are synthetic records only.
const L = require('./lib');
const F = require('./supplier-fixtures');
const { R, ok } = L.results(), { txt } = L;
const yesterday = L.ymd(new Date(L.NOW - 86400000));
const line = (id, text, x) => [F.key(['orders', F.today, 'lines', id]), Object.assign({ text, qty: '1', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 1800000, ordered: false, deleted: false }, x || {})];
const extra = () => {
  const s = F.fixture();
  [line('g-cor', 'Coriander'), line('g-out', 'TEST CASE PRODUCT 12 X 250G', { need: 'out', addedAt: L.NOW - 600000 }),
    line('g-old', 'Butter', { need: 'low', rolled: 1, since: yesterday, rolledFrom: yesterday, root: 'butter', from: 'butter', origBy: 'Ann', addedAt: L.NOW - 7200000 })]
    .forEach(([k, v]) => { s[k] = v; });
  return s;
};
const supplierReads = p => p.evaluate(() => window.__fake.bill.filter(x => /\/(suppliers|supplierlinks)(\/|$)/.test(x.path)).reduce((n, x) => n + x.n, 0));
const rows = p => p.$$eval('.o-main .nb-row', l => l.map(e => ({ id: e.getAttribute('data-ln').split('/').pop(), y: e.getBoundingClientRect().top + scrollY, h: e.getBoundingClientRect().height })));
const state = p => p.evaluate(() => window.__fake.dump());
const completion = F.key(['cutdone', F.today + '_northside']);
const request = id => F.key(['orders', F.today, 'lines', id]);
const samePlaces = (a, b) => {
  const same = JSON.stringify(a) === JSON.stringify(b);
  if (!same) console.error('Request geometry changed: ' + JSON.stringify({ before: a, after: b }));
  return same;
};
const fold = '.o-cut-fold';
const summary = fold + ' > summary';
const confirm = '.cut-tl [data-p="cut-tick"][data-id^="northside|"]';
(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/orders', { who: 'sam', extra: extra(), wait: 1600 });
  // A wide fallback font reproduces an acknowledgement wrapping to two lines when app fonts are unavailable.
  // Keep this alongside actual-font captures so CI and local checks both exercise the layout risk.
  await p.addStyleTag({ content: ':root { --body: "DejaVu Sans", sans-serif; }' });
  await L.waitFor(p, () => document.querySelectorAll('.o-main .nb-row').length >= 6, null, 10000);
  const first = await rows(p);
  ok(!(await p.$('.o-sups, .o-sup, .o-wait')) && first.length === 6, 'chef: all six requests stay in one list without supplier or age sections');
  ok(first[0].id === 'g-out' && first[1].id === 'g-old', 'chef: Out is first, then the older request, then today (' + first.map(x => x.id).join(', ') + ')');
  ok(await supplierReads(p) === 0 && !p.urls.some(u => /\/js\/(suppliers|supplier-core|supplier-store)\.js(?:\?|$)/.test(u)), 'opening Orders neither reads the catalogue nor loads supplier tools');
  ok(!(await p.$('#cut-band:not([hidden])')) && await p.$eval('.o-page .nb-addline', e => e.textContent.trim() === 'Add request'), 'Orders uses its own compact cut-offs and the Add request wording');
  const hasFold = !!(await p.$(fold));
  ok(hasFold && !(await p.$eval(fold, e => e.open)), 'supplier cut-offs start closed');
  // This guard reports the baseline failures without trying to click a control absent from the old design.
  if (!hasFold) { await p.context().close(); await b.close(); L.report(R); return; }
  ok(/Northside Test Foods/.test(await txt(p, summary)) && /15:00/.test(await txt(p, summary)) && /View/.test(await p.innerText(summary)), 'closed summary names the next supplier, absolute time and View');
  ok((await p.$$('a.o-deliv[href="#/deliveries"]')).length === 1 && !(await p.$('.o-sup-acts')), 'one page-level Delivery received link');
  await p.focus(summary); await p.keyboard.press('Enter'); await L.settle(p, 300);
  ok(await p.$eval(fold, e => e.open) && /Hide/.test(await p.innerText(summary)), 'keyboard Enter opens the native disclosure and says Hide');
  ok(await p.getAttribute('.cut-tl a.cut-n', 'href') === '#/suppliers/cutoff/northside/' + F.today, 'supplier preparation remains available from its name');
  ok(await p.$eval(confirm, e => /Order placed/.test(e.textContent) && e.getBoundingClientRect().height >= 44), 'supplier confirmation is explicit and has a full touch target');
  const before = await rows(p);
  await p.click(confirm);
  await L.waitFor(p, k => window.__fake.dump()[k]?.on === true, completion, 10000);
  await L.waitFor(p, () => /Ordered by/.test(document.querySelector('.o-cut-row .cut-st').textContent), null, 10000);
  ok(!(await state(p))[request('g-out')].ordered && await p.$eval(fold, e => e.open), 'supplier confirmation leaves requests untouched and the disclosure open');
  ok(samePlaces(before, await rows(p)), 'supplier confirmation does not move or resize request rows');
  await p.click('[data-p="otick"][data-id="g-out"]');
  await L.waitFor(p, k => window.__fake.dump()[k]?.ordered === true, request('g-out'), 10000);
  ok((await state(p))[completion].on === true && samePlaces(before, await rows(p)), 'item completion keeps its position and does not change the supplier confirmation');
  await p.click('[data-p="otick"][data-id="g-out"]');
  await L.waitFor(p, k => window.__fake.dump()[k]?.ordered === false, request('g-out'), 10000);
  ok((await state(p))[completion].on === true, 'item Undo also leaves supplier confirmation intact');
  await p.click(confirm);
  await L.waitFor(p, k => window.__fake.dump()[k]?.on === false, completion, 10000);
  ok(!(await state(p))[request('g-out')].ordered, 'supplier Undo leaves requests untouched');
  await p.click(summary); await L.settle(p, 250);
  await p.evaluate(([k, value]) => window.__fake.write(k, value), line('g-new', 'New request from another phone'));
  await L.waitFor(p, () => !!document.querySelector('[data-p="otick"][data-id="g-new"]'), null, 10000);
  ok(!(await p.$eval(fold, e => e.open)), 'a request arriving from another phone does not open the cut-offs');
  await p.clock.runFor(31 * 60000); await L.settle(p, 300);
  ok(!(await p.$eval(fold, e => e.open)) && /15:00/.test(await txt(p, summary)), 'the clock refresh keeps a closed disclosure closed and its absolute time visible');
  ok(await supplierReads(p) === 0, 'confirmations, request changes and clock refresh add no catalogue reads');
  await p.fill('#o-day', yesterday);
  await L.waitFor(p, () => !!document.querySelector('#cut-band:not([hidden]) .cut-n'), null, 10000);
  ok(!(await p.$(fold)) && /Northside Test Foods/.test(await txt(p, '#cut-band')), 'past-date Orders keeps the current reminder bar while the current-day disclosure is absent');
  await p.click('.o-nav [data-p="otoday"]');
  await L.waitFor(p, () => !!document.querySelector('.o-cut-fold') && !document.querySelector('#cut-band:not([hidden])'), null, 10000);
  ok(!(await p.$eval(fold, e => e.open)), 'Back to today restores the closed disclosure and removes the duplicate reminder bar');

  ok(p.errors.length === 0 && !(await L.overflow(p)), 'chef phone: no page errors or sideways scroll ' + p.errors.join(' | '));
  await p.context().close();

  for (const width of [768, 1280]) {
    p = await L.open(b, '#/orders', { who: 'sam', extra: extra(), width, height: 1024, wait: 1600 });
    await L.waitFor(p, () => !!document.querySelector('.o-cut-fold'), null, 10000);
    await p.click(summary); await L.settle(p, 250);
    ok((await rows(p)).length === 6 && !(await L.overflow(p)) && p.errors.length === 0, width + ' px: the disclosure and all requests fit with no errors');
    await p.context().close();
  }

  // A long supplier name must give room to its absolute time. Crossing the deadline must not move the list.
  const longExtra = extra(), cfg = longExtra[F.key(['config', 'main'])];
  cfg.cutoffs[0].name = 'Northside Test Foods with a deliberately long supplier name';
  cfg.cutoffs.push(Object.assign({}, cfg.cutoffs[0], { id: 'later', name: 'Later Test Supplier', at: 16 * 60 }));
  p = await L.open(b, '#/orders', { who: 'sam', extra: longExtra, clock: L.NOW + 59 * 60000, wait: 1600 });
  await L.waitFor(p, () => !!document.querySelector('.o-cut-at'), null, 10000);
  const deadline = await p.evaluate(() => {
    const name = document.querySelector('.o-cut-name'), at = document.querySelector('.o-cut-at'), detail = at.parentElement;
    const r = at.getBoundingClientRect(), box = detail.getBoundingClientRect(), text = document.createRange();
    text.selectNodeContents(at); const words = text.getBoundingClientRect();
    return { nameTruncated: name.scrollWidth > name.clientWidth, labelled: name.title === name.textContent,
      time: at.textContent, visible: r.left >= box.left && r.right <= box.right + 1 && words.left >= box.left && words.right <= box.right + 1,
      height: document.querySelector('.o-cut-fold > summary').getBoundingClientRect().height };
  });
  ok(deadline.nameTruncated && deadline.labelled && deadline.visible && /by 15:00/.test(deadline.time), 'long supplier name truncates with its full label while the absolute time stays visible (' + JSON.stringify(deadline) + ')');
  const beforeDeadline = await rows(p);
  await p.clock.runFor(2 * 60000); await L.settle(p, 250);
  await L.waitFor(p, () => /1 overdue/.test(document.querySelector('.o-cut-fold > summary').textContent), null, 10000);
  const overdueHeight = await p.$eval(summary, e => e.getBoundingClientRect().height);
  ok(Math.abs(overdueHeight - deadline.height) < 1 && samePlaces(beforeDeadline, await rows(p)) && !(await p.$eval(fold, e => e.open)), 'the overdue count updates without growing the summary, moving requests or opening the disclosure');
  await p.click(summary); await L.settle(p, 250);
  await p.focus('.cut-tl a.cut-n');
  const focusedSupplier = await p.evaluate(() => document.activeElement.getAttribute('href'));
  await p.clock.runFor(61 * 1000); await L.settle(p, 250);
  ok(await p.evaluate(href => document.activeElement.getAttribute('href') === href, focusedSupplier), 'clock updates retain focus on the same supplier link');
  ok(!(await L.overflow(p)) && p.errors.length === 0, 'long supplier and overdue summary fit a phone without errors');
  await p.context().close();

  p = await L.open(b, '#/orders', { who: 'sam', extra: extra(), denyReads: '/suppliers$', wait: 1600 });
  await L.waitFor(p, () => !!document.querySelector('.o-cut-fold'), null, 10000);
  ok((await rows(p)).length === 6 && await supplierReads(p) === 0 && p.errors.length === 0, 'a refused catalogue is irrelevant: requests and cut-offs still work without asking for it');
  await p.context().close();

  for (const opts of [{ cold: '/cutdone' }, { exhausted: '/cutdone' }]) {
    p = await L.open(b, '#/orders', Object.assign({ who: 'sam', extra: extra(), wait: 1600 }, opts));
    await L.waitFor(p, () => !!document.querySelector('.o-cut-fold'), null, 10000);
    const words = await txt(p, summary);
    ok(/No signal|Could not|Checking/i.test(words) && !/all.*placed|nothing due/i.test(words), (opts.cold ? 'offline' : 'failed read') + ': the closed summary says status is unknown (' + words + ')');
    await p.click(summary); await L.settle(p, 250);
    ok((await rows(p)).length === 6, (opts.cold ? 'offline' : 'failed read') + ': requests remain visible independently of supplier status');
    await p.context().close();
  }

  p = await L.open(b, '#/orders', { who: 'ann', extra: extra(), wait: 1600 });
  ok(!(await p.$('.o-cut-fold, .cut-tl, .o-sups, [data-p="otick"]:not([disabled])')) && await supplierReads(p) === 0, 'staff: requests and Add remain, without cut-offs, completion or catalogue reads');
  ok((await rows(p)).length === 6 && /Waiting from earlier days/.test(await txt(p, '.o-main')), 'staff keep their existing request and earlier-day presentation');
  await p.context().close();
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
