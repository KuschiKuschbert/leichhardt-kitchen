// Fill in what the book knows (coding rules, forms, 22 Oct 2026): a Logged often chip and a typing suggestion on the
// wastage page fill the usual amount with the unit, reason and section, and the box the book filled is selected, so
// typing replaces it. Only a tap selects: a redraw while someone types keeps their cursor. The order list's suggestion
// fills the usual amount too, and a tap on that box selects it.
const L = require('./lib');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const extra = Object.assign({}, L.wasteSum([
  { t: 'Brioche buns', n: 5, r: { excess: 5 }, unit: 'pieces', reason: 'excess', sec: 'Pastry', amt: 6, last: { unit: 'pieces', reason: 'excess', sec: 'Pastry', amt: 4 } },
  { t: 'Chips', n: 3, r: { fault: 3 }, unit: 'kg', reason: 'fault', sec: 'Fryer', amt: 1.5, last: { unit: 'kg', reason: 'fault', sec: 'Fryer', amt: 1.5 } },
  { t: 'Bad amount', n: 2, r: { prep: 2 }, unit: 'kg', reason: 'prep', sec: '', amt: '2"><i id="pwn">', last: { unit: 'kg', reason: 'prep', sec: '', amt: -1 } }
]));
extra[fsKey(['ordlearned', 'lemons'])] = { text: 'Lemons', uses: 12, dow: {}, qtys: { '2-kg': { q: '2 kg', n: 6 } } };
const val = (p, k) => p.$eval('[data-k="' + k + '"]', e => e.value);
const sel = (p, k) => p.$eval('[data-k="' + k + '"]', e => document.activeElement === e && e.selectionStart === 0 && e.selectionEnd === e.value.length && e.value.length > 0);
(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/waste', { who: 'bo', extra, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('[data-p="woften"]'));

  // a Logged often chip fills every field it knows, and the amount is selected
  await p.click('[data-p="woften"][data-i="0"]'); await L.settle(p, 300);
  ok(await val(p, 'w-text') === 'Brioche buns' && await val(p, 'w-amt') === '6', 'often chip: the item and the usual amount (' + await val(p, 'w-amt') + ')');
  ok(await p.$eval('[data-p="wunit"][aria-checked="true"]', e => e.getAttribute('data-v')) === 'pieces' && await p.$eval('[data-p="wreason"][aria-checked="true"]', e => e.getAttribute('data-v')) === 'excess', 'often chip: the unit and the reason');
  ok(await sel(p, 'w-amt'), 'often chip: the amount box is selected');
  await p.keyboard.type('8');
  ok(await val(p, 'w-amt') === '8', 'often chip: typing replaces the filled amount (' + await val(p, 'w-amt') + ')');
  // a typed amount stays when another chip is tapped; an amount the book filled is replaced
  await p.click('[data-p="woften"][data-i="1"]'); await L.settle(p, 300);
  ok(await val(p, 'w-text') === 'Chips' && await val(p, 'w-amt') === '8', 'often chip: a typed amount stays (' + await val(p, 'w-amt') + ')');
  await p.fill('[data-k="w-amt"]', ''); await p.click('[data-p="woften"][data-i="1"]'); await L.settle(p, 300);
  ok(await val(p, 'w-amt') === '1.5', 'often chip: an empty box takes the usual amount (' + await val(p, 'w-amt') + ')');
  await p.click('[data-p="woften"][data-i="0"]'); await L.settle(p, 300);
  ok(await val(p, 'w-amt') === '6', 'often chip: an amount the book filled follows the next chip (' + await val(p, 'w-amt') + ')');
  // a damaged amount in the summary is not put in the box
  await p.fill('[data-k="w-amt"]', ''); await p.click('[data-p="woften"][data-i="2"]'); await L.settle(p, 300);
  ok(await val(p, 'w-amt') === '' && !(await p.$('#pwn')), 'often chip: an amount that is not a plain number is left out');

  // a typing suggestion fills the usual amount too
  await p.fill('[data-k="w-amt"]', ''); await p.fill('[data-k="w-text"]', 'Brio'); await L.settle(p, 300);
  await p.click('[data-p="wsugg"]'); await L.settle(p, 300);
  ok(await val(p, 'w-text') === 'Brioche buns' && await val(p, 'w-amt') === '6' && await sel(p, 'w-amt'), 'suggestion: the usual amount, selected (' + await val(p, 'w-amt') + ')');

  // a tap on a filled box selects it; a redraw while typing keeps the cursor
  await p.click('[data-k="w-text"]');
  await p.click('[data-k="w-amt"]');
  ok(await sel(p, 'w-amt'), 'tap: the filled amount box is selected');
  await p.keyboard.type('1');
  await p.evaluate(k => { window.__fake.write(k, { text: 'Milk', amount: 1, unit: 'L', reason: 'expired', action: '', station: '', addedBy: 'Sam', addedById: 'sam', addedAt: Date.now(), deleted: false }); }, fsKey(['waste', L.ymd(new Date(L.NOW)), 'lines', 'live1']));
  await L.waitFor(p, () => /Milk/.test(document.body.innerText));
  await p.keyboard.type('2');
  ok(await val(p, 'w-amt') === '12', 'redraw: typing goes on where it was (' + await val(p, 'w-amt') + ')');
  ok(p.errors.length === 0, 'waste: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the order list: the suggestion fills the usual amount, and a tap on the amount box selects it
  p = await L.open(b, '#/orders', { who: 'bo', extra, wait: 1500 });
  await p.fill('[data-k="o-text"]', 'Lem'); await L.settle(p, 300);
  await L.waitFor(p, () => !!document.querySelector('[data-p="osugg"]'));
  await p.click('[data-p="osugg"]'); await L.settle(p, 300);
  ok(await val(p, 'o-text') === 'Lemons' && await val(p, 'o-qty') === '2 kg', 'orders: the suggestion fills the usual amount (' + await val(p, 'o-qty') + ')');
  await p.click('[data-k="o-qty"]');
  ok(await sel(p, 'o-qty'), 'orders: a tap selects the filled amount');
  await p.keyboard.type('3 kg');
  ok(await val(p, 'o-qty') === '3 kg', 'orders: typing replaces it (' + await val(p, 'o-qty') + ')');
  ok(p.errors.length === 0, 'orders: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})();
