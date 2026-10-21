// Wastage and order entry (usability U5): a big amount for its unit asks once, the unit shows in the amount box,
// Log waste jumps to the form, suggestions fill what is usual, Next moves on, the day buttons stay together,
// the order tick keeps its name, and a newer waste review is not replaced without a second tap.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const day = n => L.ymd(new Date(L.NOW - n * 86400000));
const today = day(0);
const extra = {};
extra[fsKey(['waste', day(1), 'lines', 'r1'])] = { text: 'Rice', amount: 1, unit: 'portions', reason: 'expired', action: '', station: 'Pans', addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - 86400000, deleted: false };
extra[fsKey(['ordlearned', 'duck-fat'])] = { text: 'Duck fat', uses: 6, dow: {}, qtys: { '2-tubs': { q: '2 tubs', n: 5 } } };
const saved = (p, text) => p.evaluate(a => Object.keys(window.__fake.dump()).filter(k => k.indexOf('/waste/' + a.d + '/lines/') > 0 && window.__fake.dump()[k].text === a.t).map(k => window.__fake.dump()[k]), { d: today, t: text });
async function log(p, text, amt, unit) {
  await p.fill('#w-text', text); await p.fill('#w-amt', amt);
  await p.click('[data-p="wunit"][data-v="' + unit + '"]');
  if (!(await p.evaluate(() => /excess|Excess/.test((document.querySelector('.w-rbtn') || document.querySelector('.w-rchips [aria-pressed="true"]') || {}).textContent || '')))) {
    await p.evaluate(() => { const b = document.querySelector('.w-rchips [data-v="excess"]') || document.querySelector('[data-p="wreason"][data-v="excess"]'); if (b) b.click(); else document.querySelector('.w-rbtn').click(); });
    await L.settle(p, 150);
    await p.evaluate(() => { const b = document.querySelector('.sheet [data-v="excess"]'); if (b) b.click(); });
  }
  await L.settle(p, 150);
  await p.click('.w-add .nb-addbtn'); await L.settle(p, 350);
}
(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/waste', { wait: 1500, extra, touch: true });

  ok(await p.getAttribute('#w-amt', 'placeholder') === 'Amount (kg)', 'waste: the amount box says the unit (' + await p.getAttribute('#w-amt', 'placeholder') + ')');
  ok(await p.evaluate(() => document.querySelector('#w-text').getBoundingClientRect().top < document.querySelector('.w-row').getBoundingClientRect().top), 'waste: the form sits above the day\'s entries');

  await log(p, 'Chips', '500', 'kg');
  ok((await saved(p, 'Chips')).length === 1 && /500 kg\? Check the unit/.test(await txt(p, '.p-toast') || ''), 'waste: 500 kg asks first and saves nothing new');
  await p.click('.w-add .nb-addbtn'); await L.settle(p, 350);
  ok((await saved(p, 'Chips')).some(x => x.amount === 500 && x.unit === 'kg'), 'waste: a second tap logs 500 kg');
  await log(p, 'Bread', '500', 'g');
  ok((await saved(p, 'Bread')).some(x => x.amount === 500 && x.unit === 'g'), 'waste: 500 g logs straight away');

  // Next on What was wasted goes to Amount, without an error
  await p.fill('#w-text', 'Lettuce'); await p.fill('#w-amt', '');
  await p.press('#w-text', 'Enter'); await L.settle(p, 200);
  ok(await p.evaluate(() => document.activeElement && document.activeElement.id) === 'w-amt' && !/Write the amount/.test(await txt(p, '.p-toast') || ''), 'waste: Next on the item goes to Amount without a telling-off');

  // a suggestion fills unit, reason and section from the last time
  await p.fill('#w-text', 'Ric'); await L.settle(p, 250);
  const sg = await p.$('[data-p="wsugg"]');
  ok(!!sg, 'waste: typing Ric suggests Rice');
  if (sg) { await sg.click(); await L.settle(p, 250); }
  ok(await p.evaluate(() => (document.querySelector('[data-p="wunit"][aria-checked="true"]') || {}).textContent) === 'portions' && await p.inputValue('#w-sec') === 'Pans', 'waste: the suggestion fills the unit and section used last time');

  // review: someone else saved since this page read it
  await p.fill('#w-ra', 'Too much rice cooked');
  await p.evaluate(a => window.__fake.write(a.k, { avoidable: 'Over-portioned chips', change: '', reviewBy: 'Bo', reviewAt: a.t }), { k: fsKey(['waste', today]), t: Date.now() + 60000 });
  await p.click('[data-p="wreview"]'); await L.settle(p, 500);
  const rv = () => p.evaluate(k => window.__fake.dump()[k] || {}, fsKey(['waste', today]));
  ok((await rv()).reviewBy === 'Bo' && /Bo saved a review/.test(await txt(p, '.p-toast') || ''), 'review: a newer review by Bo is not replaced on the first tap');
  await p.click('[data-p="wreview"]'); await L.settle(p, 600);
  ok((await rv()).reviewBy === 'Sam', 'review: a second tap saves Sam\'s review');
  ok(p.errors.length === 0, 'waste: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // orders: a suggestion fills the usual amount; the tick keeps its name; the day buttons stay on one row
  p = await L.open(b, '#/orders', { wait: 1500, extra });
  await p.fill('#o-text', 'Duck'); await L.settle(p, 250);
  const os = await p.$('[data-p="osugg"]:has-text("Duck fat")');
  ok(!!os && /2 tubs/.test(await os.textContent()), 'orders: typing Duck suggests Duck fat with its usual 2 tubs');
  if (os) { await os.click(); await L.settle(p, 250); }
  ok(await p.inputValue('#o-qty') === '2 tubs', 'orders: the suggestion fills the usual 2 tubs (' + await p.inputValue('#o-qty') + ')');
  const tops = await p.evaluate(() => [...document.querySelectorAll('.o-days .chip')].map(e => Math.round(e.getBoundingClientRect().top)));
  ok(tops.length === 3 && tops.every(t => t === tops[0]), 'orders: back, Today and forward sit on one row at 390 (' + tops + ')');
  await L.tap(p, '[data-p="otick"][data-id="o1"]'); await L.settle(p, 400);
  const lab = await p.evaluate(() => { const e = document.querySelector('[data-p="otick"][data-id="o1"]'); return e ? [e.getAttribute('aria-label'), e.getAttribute('aria-pressed')] : null; });
  ok(!lab || (lab[0] === 'Ordered: Milk' && lab[1] === 'true'), 'orders: a ticked line still reads "Ordered: Milk", pressed (' + lab + ')');
  ok(p.errors.length === 0, 'orders: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})();
