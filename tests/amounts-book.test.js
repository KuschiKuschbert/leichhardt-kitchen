// One item, one amount (22 Oct 2026): "Slice onion" and "Slice onions" are learned as two records but the book shows
// them as one item; "2 tubs" and "2tubs" count as one usual amount; a new line saves the amount read as a number and a
// unit (qn, qu) next to what was typed. Nothing already saved changes.
const L = require('./lib');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
(async () => {
  const b = await L.start();
  const extra = {};
  extra[fsKey(['learned', 'slice-onion'])] = { text: 'Slice onion', uses: 3, typed: 3, dow: {}, secs: { larder: { name: 'Larder', n: 3 } }, qtys: { '2-tubs': { q: '2 tubs', n: 2 } } };
  extra[fsKey(['learned', 'slice-onions'])] = { text: 'Slice onions', uses: 2, typed: 2, dow: {}, secs: { larder: { name: 'Larder', n: 2 } }, qtys: { '2tubs': { q: '2tubs', n: 1 }, '3-tubs': { q: '3 tubs', n: 1 } } };
  let p = await L.open(b, '#/prep', { extra, wait: 1800 });
  await p.fill('#p-text', 'Slice onions'); await L.settle(p, 300);
  const chips = await p.evaluate(() => [...document.querySelectorAll('[data-p="qset"]')].map(e => e.getAttribute('data-v')));
  ok(chips[0] === '2 tubs' && chips.length === 2 && chips.indexOf('2tubs') < 0, 'usual amounts: 2 tubs and 2tubs are one chip, first (' + chips.join(', ') + ')');
  const one = await p.evaluate(() => window.LK_PREP && window.LK_PREP.state ? window.LK_PREP.state.learned.filter(x => /slice onion/i.test(x.text)) : null);
  ok(one && one.length === 1 && one[0].uses === 5 && one[0].ids.length === 2, 'learned: Slice onion and Slice onions are one item with both counts (' + JSON.stringify(one && one.map(x => [x.text, x.uses])) + ')');
  await p.fill('#p-text', 'Make stock'); await p.fill('#p-qty', '10 litres'); await p.keyboard.press('Enter'); await L.settle(p, 500);
  const line = await p.evaluate(() => Object.values(window.__fake.dump()).filter(v => v && v.text === 'Make stock')[0]);
  ok(line && line.qty === '10 litres' && line.qn === 10 && line.qu === 'L', 'a new line keeps what was typed and saves 10 L read (' + JSON.stringify(line && [line.qty, line.qn, line.qu]) + ')');
  await p.fill('#p-text', 'Pick mint'); await p.fill('#p-qty', 'a handful'); await p.keyboard.press('Enter'); await L.settle(p, 500);
  const l2 = await p.evaluate(() => Object.values(window.__fake.dump()).filter(v => v && v.text === 'Pick mint')[0]);
  ok(l2 && l2.qty === 'a handful' && !('qn' in l2), 'an amount it cannot read is saved as typed, with no number');
  ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // orders: the read amount is saved too
  p = await L.open(b, '#/orders', { wait: 1500 });
  await p.fill('#o-text', 'Cream'); await p.fill('#o-qty', '4L'); await p.keyboard.press('Enter'); await L.settle(p, 500);
  const o = await p.evaluate(() => Object.values(window.__fake.dump()).filter(v => v && v.text === 'Cream')[0]);
  ok(o && o.qty === '4L' && o.qn === 4 && o.qu === 'L', 'orders: 4L is saved as typed with 4 L read');
  ok(p.errors.length === 0, 'orders: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
