// js/amounts.js reads typed amounts into a number and a unit (22 Oct 2026). Pure node, no browser.
const A = require('../js/amounts.js');
const R = [], ok = (c, m) => R.push((c ? 'PASS ' : 'FAIL ') + m);
const same = (t, n, u) => { const a = A.parse(t); ok(!!a && a.n === n && a.u === u, JSON.stringify(t) + ' reads as ' + n + ' ' + u + ' (' + JSON.stringify(a) + ')'); };
same('2 L', 2, 'L'); same('2l', 2, 'L'); same('2 litres', 2, 'L'); same('2 Ltr', 2, 'L');
same('500g', 500, 'g'); same('500 grams', 500, 'g'); same('1.5 kg', 1.5, 'kg'); same('1,5kg', 1.5, 'kg');
same('3 tubs', 3, 'tubs'); same('1 tub', 1, 'tubs'); same('1/2 tub', 0.5, 'tubs'); same('½ tub', 0.5, 'tubs'); same('1 1/2 kg', 1.5, 'kg');
same('6', 6, ''); same('20 portions', 20, 'portions'); same('4 packs', 4, 'packs'); same('1 batch', 1, 'batches'); same('2 dozen', 2, 'dozen');
same('10 ea', 10, 'pieces'); same('1/2 slab', 0.5, 'slabs'); same('1 whole', 1, 'whole'); same('300 g total', 300, 'g'); same('1/2 pkt', 0.5, 'packs'); same('1 cob', 1, 'cobs'); same('12 pcs', 12, 'pieces'); same('5 L.', 5, 'L');
['', 'half a tub', '2-3 kg', '1 kg + 500 g', 'some', '0 kg', 'lots of 2', '2 widgets', 'tubs'].forEach(t => ok(A.parse(t) === null, JSON.stringify(t) + ' is not read (null)'));
ok(A.key('2 L') === A.key('2l') && A.key('2l') === A.key('2 litres'), 'key: 2 L, 2l and 2 litres are the same amount');
ok(A.key('2 L') !== A.key('20 L'), 'key: 2 L is not 20 L');
ok(A.key('Half a TUB') === 'half a tub', 'key: an amount it cannot read keys as typed, lower case');
ok(A.say(1500, 'g') === '1.5 kg' && A.say(50, 'pieces') === '50 pieces' && A.say(2500, 'ml') === '2.5 L' && A.say(3, '') === '3', 'say: 1.5 kg, 50 pieces, 2.5 L, 3');
// Recipe multiplication uses exact fractions before rounding and keeps the chef's unit spelling.
for (const [text, factor, expected] of [
  ['100 g', 2, '200 g'], ['1.25 L', 0.5, '0.625 L'], ['1,5kg', 2, '3kg'], ['1/2', 3, '1.5'],
  ['1 1/2 kg', 2, '3 kg'], ['½ portion', 2, '1 portion'], ['⅓ tsp', 3, '1 tsp'], ['0.1 g', 3, '0.3 g'],
  ['380 to 420 g', 2, '760 to 840 g'], ['6-8ea', 0.5, '3-4ea'], ['About 75 ml', 2, 'About 150 ml'],
  ['300 g total', 2, '600 g total'], ['2.5 tbsp', 2, '5 tbsp'], ['1 leaf', 2, '2 leaf'], ['6 heads', 2, '12 heads']
]) ok(A.scale(text, factor) === expected, 'multiply: ' + text + ' by ' + factor + ' gives ' + expected);
for (const text of ['', '[Qty]', 'to taste', 'handful', '600 g or 300 g', '6 or 4', '1 kg + 500 g', '180 C', '20 min', '1/0 kg', '0 g', '2 widgets']) {
  ok(A.scale(text, 2) === null, 'multiply: leaves ' + JSON.stringify(text) + ' for the chef to check');
}
for (const factor of [0, -2, NaN, Infinity, '2', 1e-20, 1e20]) ok(A.scale('1 g', factor) === null, 'multiply: refuses invalid or unrepresentable factor ' + factor);
R.forEach(r => console.log(r));
const bad = R.filter(r => r.startsWith('FAIL')).length;
console.log(bad + ' failed of ' + R.length);
process.exit(bad ? 1 : 0);
