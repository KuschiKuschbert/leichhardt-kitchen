// Supplier groups (5 Nov 2026, head chef, round 2 of the work pages redesign, as drawn in B): on today's order list the
// head chef and sous chefs see each request under the supplier whose catalogue names it (exact name or alias), under
// that supplier's cut-off row with its tick, then Open the supplier's order and Delivery arrived; the rest under No
// supplier yet. The catalogue is read once (one read per supplier) and kept in memory. Staff never see suppliers.
const L = require('./lib');
const F = require('./supplier-fixtures');
const { R, ok } = L.results(), { txt } = L;
const line = (id, text, x) => [F.key(['orders', F.today, 'lines', id]), Object.assign({ text, qty: '1', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 1800000, ordered: false, deleted: false }, x || {})];
const extra = () => { const s = F.fixture(); [line('g-cor', 'Coriander'), line('g-out', 'TEST CASE PRODUCT 12 X 250G', { need: 'out', addedAt: L.NOW - 600000 })].forEach(([k, v]) => { s[k] = v; }); return s; };
const supplierReads = p => p.evaluate(() => window.__fake.bill.filter(x => /\/suppliers$/.test(x.path)).reduce((n, x) => n + x.n, 0));
const texts = (p, sel) => p.$$eval(sel + ' .nb-row .nb-t', l => l.map(e => e.firstChild.textContent.trim()));
(async () => {
  const b = await L.start();

  // Sam (sous chef), today
  let p = await L.open(b, '#/orders', { who: 'sam', extra: extra(), wait: 1600 });
  await L.waitFor(p, () => !!document.querySelector('.o-sups .o-sup .cut-tl [data-p="cut-tick"]'), null, 10000);
  const grp = '.o-sups .o-sup:not(.o-sup-none)';
  ok(/Northside Test Foods/.test(await txt(p, grp + ' .cut-n') || '') && !(await p.$('.cut-today:not(.o-sups)')), 'the cut-off row heads its group, and the plain tick list is gone');
  const mine = await texts(p, grp);
  ok(JSON.stringify(mine) === JSON.stringify(['TEST CASE PRODUCT 12 X 250G', 'Test stock request']), 'the requests the catalogue names (by name or alias) are under it, Out first (' + mine.join(', ') + ')');
  const none = await texts(p, '.o-sup-none');
  ok(none.indexOf('Coriander') >= 0 && none.indexOf('Test stock request') < 0 && /No supplier yet/.test(await txt(p, '.o-sup-none') || ''), 'what it cannot match is under No supplier yet (' + none.join(', ') + ')');
  ok(await p.getAttribute(grp + ' .o-sup-acts a[href^="#/suppliers/cutoff/northside/"]', 'href') === '#/suppliers/cutoff/northside/' + F.today && /Open Northside Test Foods order/.test(await txt(p, grp + ' .o-sup-acts') || '') && !!(await p.$(grp + ' .o-sup-acts a[href="#/deliveries"]')), 'Open the supplier\'s order, and Delivery arrived');
  const reads = await supplierReads(p);
  ok(reads > 0 && reads <= 2, 'the catalogue: one read per supplier (' + reads + ')');
  await p.click(grp + ' [data-p="cut-tick"]');
  await L.waitFor(p, k => { const d = window.__fake.dump()[k]; return d && d.on === true; }, F.key(['cutdone', F.today + '_northside']), 10000);
  await L.settle(p, 400);
  ok(await supplierReads(p) === reads && !!(await p.$(grp + ' .nb-row')), 'the tick saves from the group, and the page draws again with no second catalogue read');
  ok(p.errors.length === 0 && !(await L.overflow(p)), 'chef: no page errors, no sideways scroll ' + p.errors.join(' | '));
  await p.context().close();

  // a laptop
  p = await L.open(b, '#/orders', { who: 'sam', extra: extra(), width: 1280, height: 900, wait: 1600 });
  await L.waitFor(p, () => !!document.querySelector('.o-sups'), null, 10000);
  ok(!(await L.overflow(p)), '1280 px: no sideways scroll');
  await p.context().close();

  // catalogue refused: the plain list and tick list, as before
  p = await L.open(b, '#/orders', { who: 'sam', extra: extra(), wait: 1600, denyReads: '/suppliers$' });
  await L.waitFor(p, () => !!document.querySelector('.cut-tl [data-p="cut-tick"]'), null, 10000); await L.settle(p, 800);
  ok(!(await p.$('.o-sups')) && !!(await p.$('.cut-today')) && /Coriander/.test(await txt(p, '.o-main') || ''), 'a refused catalogue read keeps the plain list');
  await p.context().close();

  // no catalogue supplier linked to today's cut-offs: grouping would put everything under No supplier yet, so the plain
  // list stays
  p = await L.open(b, '#/orders', { who: 'sam', extra: (() => { const s = extra(); Object.keys(s).filter(k => /\/suppliers\//.test(k)).forEach(k => delete s[k]); return s; })(), wait: 1600 });
  await L.waitFor(p, () => !!document.querySelector('.cut-tl [data-p="cut-tick"]'), null, 10000); await L.settle(p, 800);
  ok(!(await p.$('.o-sups')) && /Supplier orders today/.test(await txt(p, '.cut-today') || '') && /Coriander/.test(await txt(p, '.o-main') || ''), 'no linked supplier: the plain list and tick list, as before');
  await p.context().close();

  // Ann (staff): no suppliers, no catalogue read
  p = await L.open(b, '#/orders', { who: 'ann', extra: extra(), wait: 1600 }); await L.settle(p, 600);
  ok(!(await p.$('.o-sups')) && !/Northside/.test(await txt(p, '#prep-root') || '') && await supplierReads(p) === 0, 'staff: no suppliers and no catalogue read');
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
