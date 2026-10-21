// Charts on a phone (usability U14): drawn at the phone's width, and a tap on a bar shows its numbers.
const L = require('./lib');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
(async () => {
  const b = await L.start();
  const extra = {};
  for (let d = 1; d < 8; d++) { const day = L.ymd(new Date(L.NOW - d * 86400000)); for (let k = 0; k < 3; k++) extra[fsKey(['days', day, 'items', 'x' + d + k])] = { text: 'Job ' + k, station: 'Larder', qty: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - d * 86400000 + k * 3600000, done: true, doneBy: 'Ann', doneById: 'ann', doneAt: L.NOW - d * 86400000 + k * 3600000 + 1800000, deleted: false }; }
  let p = await L.open(b, '#/admin', { admin: true, extra, wait: 2500 });
  const vb = await p.evaluate(() => { const s = document.querySelector('svg.ch'); return s ? +s.getAttribute('viewBox').split(' ')[2] : 0; });
  ok(vb > 0 && vb < 400, 'phone: the chart is drawn at the phone width (' + vb + ')');
  const scale = await p.evaluate(() => { const s = document.querySelector('svg.ch'); return s.getBoundingClientRect().width / +s.getAttribute('viewBox').split(' ')[2]; });
  ok(scale > 0.85, 'phone: chart words are not shrunk much (scale ' + scale.toFixed(2) + ')');
  await (await p.$('svg.ch g')).click(); await L.settle(p, 200);
  ok(/written, \d+ ticked/.test(await p.evaluate(() => (document.querySelector('.ch-read') || {}).textContent || '')), 'phone: a tap on a bar shows its numbers');
  ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
  await p.context().close();
  p = await L.open(b, '#/admin', { admin: true, extra, width: 1280, height: 900, wait: 2500 });
  ok(await p.evaluate(() => +document.querySelector('svg.ch').getAttribute('viewBox').split(' ')[2]) === 720, 'laptop: charts stay 720 wide');
  await p.context().close();
  await b.close();
  L.report(R);
})();
