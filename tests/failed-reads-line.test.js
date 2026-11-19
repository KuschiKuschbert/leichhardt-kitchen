/*
  A failed read looks one way everywhere (the consistency sweep, step 2, 20 Nov 2026,
  docs/consistency-sweep-options/brief.md): red words that say what could not load (.p-readerr, role status), never the
  look of "nothing there", and Try again, which reads again now. Prep, Orders, Wastage, Transfers (today and loans from
  earlier days), Minutes, Guides, the drinks run and Cleaning. The drinks run also says when it was read, with Refresh.
  The checks marked (old) failed on the code before this change. The Functions pages, the supplier order, Delivery
  received and the recipe editor are in failed-reads-functions.test.js and failed-reads-tools.test.js.
*/
const L = require('./lib');
const { R, ok } = L.results();
const k = (...p) => '^kitchens/[^/]+/' + p.join('/');
const line = p => p.evaluate(() => { const e = document.querySelector('#prep-root .p-readerr, #app .p-readerr'); return e ? { role: e.getAttribute('role'), text: e.textContent.replace(/\s+/g, ' ').trim(), retry: !!e.querySelector('button') } : null; });
async function page(b, hash, spent, o) {
  const p = await L.open(b, hash, Object.assign({ who: 'sam', width: 390, height: 844, touch: true, wait: 1600, exhausted: spent }, o || {}));
  await L.waitFor(p, () => !!document.querySelector('.p-readerr'), null, 6000).catch(() => {});
  return p;
}
async function retried(p, sel) {
  await p.evaluate(() => { window.__fake.exhausted = null; });
  const btn = await p.$('.p-readerr button'); if (btn) await btn.click();
  return L.waitFor(p, s => !!document.querySelector(s) && !document.querySelector('.p-readerr'), sel, 8000).then(() => true, () => false);
}
(async () => {
  const b = await L.start();

  // the four work pages: one failed-read line with Try again, and Try again brings the list
  for (const [hash, path, rows] of [['#/prep', k('days/'), '#prep-root .nb-row'], ['#/orders', k('orders/'), '#prep-root .nb-row'], ['#/waste', k('waste/'), '#prep-root .w-row, #prep-root .nb-row, #prep-root .nb-empty'], ['#/transfers', k('transfers/'), '#prep-root .tr-row, #prep-root .nb-row, #prep-root .nb-empty']]) {
    const p = await page(b, hash, path);
    const x = await line(p);
    ok(!!x && x.role === 'status' && /Could not load/.test(x.text) && x.retry, '(old) ' + hash + ': a failed read is one line with Try again (' + (x ? x.text : 'none') + ')');
    ok(await retried(p, rows), '(old) ' + hash + ': Try again reads the list again');
    ok(!p.errors.length, hash + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  // Transfers: loans from earlier days never say "Reload"
  let p = await page(b, '#/transfers', k('transferOpen'));
  let t = await p.evaluate(() => document.getElementById('prep-root').textContent);
  ok(!/Reload/.test(t) && /Try again/.test(t), '(old) Transfers: loans from earlier days say Try again, not Reload');
  await p.context().close();

  // Minutes: a failed read is the failed-read line, not the handwritten "nothing yet" look
  p = await page(b, '#/minutes', k('minutes'), { who: 'ann' });
  const mn = await p.evaluate(() => ({ err: !!document.querySelector('#prep-root .p-readerr'), empty: (document.querySelector('#prep-root .nb-empty') || {}).textContent || '' }));
  ok(mn.err && !/Could not load/.test(mn.empty), '(old) Minutes: a failed read is not drawn like "No minutes yet"');
  await p.context().close();

  // Guides: Try again on a failed read of the uploaded guides
  p = await page(b, '#/guides', k('guides'), { who: 'ann', extra: L.guides() });
  const g = await line(p);
  ok(!!g && g.retry, '(old) Guides: the failed read has Try again (' + (g ? g.text : 'none') + ')');
  await p.context().close();

  // the drinks run: when it was read, and Refresh; its failed read is the same line
  p = await L.open(b, '#/drinks', { who: 'ann', width: 390, height: 844, touch: true, wait: 1800 });
  await L.waitFor(p, () => !!document.querySelector('.dr-read'), null, 6000).catch(() => {});
  t = await p.evaluate(() => (document.querySelector('.dr-read') || {}).textContent || '');
  ok(/^Read \d\d:\d\d\. ?Refresh$/.test(t.trim()), '(old) Drinks run: says when it was read, with Refresh (' + t.trim() + ')');
  await p.context().close();
  p = await page(b, '#/drinks', k('drinks'), { who: 'ann' });
  const dk = await line(p);
  ok(!!dk && dk.retry, 'Drinks run: a failed read is the same line with Try again');
  await p.context().close();

  // Cleaning: plain words, never the database's own, with Try again
  p = await page(b, '#/cleaning', k('cleaning'), { who: 'sam', wait: 2500 });
  const cl = await line(p);
  ok(!!cl && cl.retry && /cleaning list/.test(cl.text) && !/resource|exhausted|tap Refresh/i.test(cl.text), '(old) Cleaning: plain words with Try again (' + (cl ? cl.text : 'none') + ')');
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
