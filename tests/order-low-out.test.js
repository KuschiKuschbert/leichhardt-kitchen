// Low and Out (5 Nov 2026, round 2 of the work pages redesign, as drawn in B): whoever asks for an item on the order
// list says how urgent it is, Running low or Out now, the amount optional. The line shows Low or Out after the amount,
// Out goes to the top of today's list for the head chef and sous chefs, and a request still not ordered keeps its mark
// when it rolls over. The page shows only these two: anything else stored in need shows nothing.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const root = 'kitchens/' + L.PIN + '/', today = L.ymd(new Date(L.NOW));
const store = p => p.evaluate(() => window.__fake.dump());
const line = (s, text) => Object.keys(s).filter(k => k.indexOf(root + 'orders/' + today + '/lines/') === 0 && s[k].text === text).map(k => s[k]);
const extra = {};
extra[root + 'orders/' + today + '/lines/lo1'] = { text: 'Bread', qty: '2 loaves', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 3600000, ordered: false, deleted: false };
extra[root + 'orders/' + today + '/lines/lo2'] = { text: 'Butter', qty: '2 kg', need: 'out', recipes: [], addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - 60000, ordered: false, deleted: false };
extra[root + 'orders/' + today + '/lines/lo3'] = { text: 'Eggs', qty: '', need: '<b>x</b>', recipes: [], addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - 50000, ordered: false, deleted: false };
const names = p => p.$$eval('.o-main > .nb-rows > .nb-row .nb-t', l => l.map(e => e.firstChild.textContent.trim()));
(async () => {
  const b = await L.start();

  // Ann (staff): marks what she asks for
  let p = await L.open(b, '#/orders', { who: 'ann', extra, wait: 1600 });
  ok(/Out/.test(await txt(p, '.nb-row[data-ln$="/lo2"] .o-need-out') || '') && !(await p.$('.nb-row[data-ln$="/lo3"] .o-need')) && !/<b>|x\b/.test(await txt(p, '.nb-row[data-ln$="/lo3"] .nb-t') || 'x'),
    'the line shows Out after the amount; a value the page does not know shows nothing');
  let n = await names(p);
  ok(n.indexOf('Bread') >= 0 && n.indexOf('Bread') < n.indexOf('Butter'), 'staff: today\'s list stays in the order it was asked, Out not moved (' + n.join(', ') + ')');
  await L.oLog(p);
  ok(await p.$$eval('#o-need [data-p="oneed"]', l => l.map(e => e.textContent + ':' + e.getAttribute('aria-pressed')).join(',')) === 'Running low:false,Out now:false', 'the add sheet: Running low and Out now, neither picked');
  await p.fill('#o-text', 'Coconut milk'); await p.fill('#o-qty', '6 L');
  await p.click('#o-need [data-v="out"]'); await L.settle(p, 100);
  await p.click('#o-need [data-v="out"]'); await L.settle(p, 100);
  ok(await p.getAttribute('#o-need [data-v="out"]', 'aria-pressed') === 'false', 'a second tap takes it off');
  await p.click('#o-need [data-v="out"]'); await L.settle(p, 100);
  ok(await p.getAttribute('#o-need [data-v="out"]', 'aria-pressed') === 'true' && await p.getAttribute('#o-need [data-v="low"]', 'aria-pressed') === 'false', 'Out now picked, Running low not');
  await p.press('#o-text', 'Enter'); await L.settle(p, 600);
  let s = await store(p), m = line(s, 'Coconut milk');
  ok(m.length === 1 && m[0].need === 'out' && m[0].qty === '6 L', 'Add saves Coconut milk 6 L, Out (' + JSON.stringify(m.map(x => x.need)) + ')');
  await L.oLog(p);
  ok(await p.getAttribute('#o-need [data-v="out"]', 'aria-pressed') === 'false', 'the next request starts with neither picked');
  await p.fill('#o-text', 'Cream'); await p.click('#o-need [data-v="low"]'); await p.press('#o-text', 'Enter'); await L.settle(p, 600);
  await L.oLog(p); await p.fill('#o-text', 'Lemons'); await p.press('#o-text', 'Enter'); await L.settle(p, 600);
  s = await store(p);
  ok(line(s, 'Cream')[0].need === 'low' && line(s, 'Cream')[0].qty === '' && !('need' in line(s, 'Lemons')[0]), 'Cream: Low with no amount; Lemons: no mark saved');
  ok(/Low/.test(await txt(p, '.nb-row:has(.o-need-low)') || '') && /Cream/.test(await txt(p, '.nb-row:has(.o-need-low)') || ''), 'Cream shows Low');
  ok(p.errors.length === 0 && !(await L.overflow(p)), 'staff: no page errors, no sideways scroll ' + p.errors.join(' | '));
  await p.context().close();

  // Sam (sous chef): Out first
  p = await L.open(b, '#/orders', { who: 'sam', extra, wait: 1600 });
  n = await names(p);
  ok(n[0] === 'Butter' && n.indexOf('Bread') > 0, 'chef: Out goes to the top of today\'s list (' + n.join(', ') + ')');
  await p.context().close();

  // a request still not ordered rolls over with its mark
  const yday = L.ymd(new Date(L.NOW - 86400000)), roll = Object.assign({}, extra);
  roll[root + 'orders/' + yday + '/lines/ly1'] = { text: 'Flour', qty: '2 bags', need: 'out', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 90000000, ordered: false, deleted: false };
  p = await L.open(b, '#/orders', { who: 'ann', extra: roll, wait: 2000 });
  const rolled = (await store(p))[root + 'orders/' + today + '/lines/r' + today.replace(/-/g, '') + '-ly1'];
  ok(!!rolled && rolled.rolled === 1 && rolled.need === 'out', 'rollover: Flour, still Out, is on today\'s list with its mark (' + JSON.stringify(rolled && rolled.need) + ')');
  await p.context().close();

  // a laptop
  p = await L.open(b, '#/orders', { who: 'ann', extra, width: 1280, height: 900, wait: 1600 });
  await L.oLog(p);
  ok(await p.evaluate(() => [...document.querySelectorAll('#o-need [data-p="oneed"]')].every(e => e.getBoundingClientRect().height >= 40)) && !(await L.overflow(p)), '1280 px: the chips are full size, no sideways scroll');
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
