/* Break-it check for the "prep lines for a later day" council (17 Nov 2026), on the implemented app (main 70ce8f4) in
   the click-test stand-in with synthetic data. Two days ago a cook wrote "Brine pork", left open. Yesterday nobody
   opened the book (a closed day), but a chef had written one line for it ahead, "Thaw brisket", four days earlier. Today's
   first phone rolls the list over. Control: the same without the line written ahead.
   Run from tests/: cp ../docs/prep-ahead-options/break-rollover.cjs zz-pb.test.js && CHROME=... npm test -- zz-pb; rm zz-pb.test.js */
const path = require('path'), fs = require('fs');
const root = path.resolve(process.cwd(), '..');
const L = require(path.join(root, 'tests/lib'));
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW)), back = n => L.ymd(new Date(L.NOW - n * 86400000));
function extra(ahead) {
  const e = {};
  ['i1', 'i2', 'i3', 'i4', 'i5', 'i6'].forEach(id => { e[key(['days', today, 'items', id])] = undefined; });
  e[key(['days', back(2), 'items', 'b1'])] = { text: 'Brine pork', station: 'Larder', qty: '2 kg', recipe: '', addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 2 * 86400000 - 3600000, done: false, deleted: false };
  e[key(['days', back(2), 'items', 'b2'])] = { text: 'Make gravy', station: 'Sauce', qty: '5 L', recipe: '', addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 2 * 86400000 - 3000000, done: true, doneBy: 'Ann', doneById: 'ann', doneAt: L.NOW - 2 * 86400000, deleted: false };
  if (ahead) e[key(['days', back(1), 'items', 'a1'])] = { text: 'Thaw brisket', station: 'Grill', qty: '1', recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 5 * 86400000, done: false, deleted: false };
  return e;
}
(async () => {
  const b = await L.start(), res = {};
  for (const ahead of [false, true]) {
    const p = await L.open(b, '#/prep', { who: 'ann', extra: extra(ahead), width: 390, height: 844, wait: 2500 });
    await L.settle(p, 4000);
    res[ahead ? 'withAheadLine' : 'control'] = await p.evaluate(() => [...document.querySelectorAll('.nb-row')].map(r => r.textContent.replace(/\s+/g, ' ').trim().slice(0, 60)));
    await p.context().close();
  }
  const out = { source: 'Implemented app (main 70ce8f4), click-test stand-in, synthetic data, today ' + today, ...res };
  fs.writeFileSync(path.join(root, 'docs/prep-ahead-options/baseline/break-rollover.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify(out, null, 1));
  await b.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
