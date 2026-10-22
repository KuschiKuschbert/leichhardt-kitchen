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
R.forEach(r => console.log(r));
const bad = R.filter(r => r.startsWith('FAIL')).length;
console.log(bad + ' failed of ' + R.length);
process.exit(bad ? 1 : 0);
