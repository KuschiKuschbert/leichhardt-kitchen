// Usage and speed counts (22 Oct 2026): the phone counts, for today only, which smart features had something to show and
// were taken or put away, keeps it in lk.daily, and sends yesterday's once as daily/<day>_<tag> through W(). The admin
// panel shows the nightly sum (summary/usage) under Insights. Counts only: no names, no text.
const L = require('./lib');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const yday = L.ymd(new Date(L.NOW - 86400000));
(async () => {
  const b = await L.start();
  const extra = { [fsKey(['learned', 'mise-onions'])]: { text: 'Mise onions', uses: 9, typed: 9, dow: {}, secs: { larder: { name: 'Larder', n: 9 } }, qtys: {} } };
  let p = await L.open(b, '#/prep', { extra, wait: 1800 });
  const daily = () => p.evaluate(() => JSON.parse(localStorage.getItem('lk.daily') || 'null'));
  let d = await daily();
  ok(d && d.sg && d.sg.quick && d.sg.quick.s === 1 && d.sg.quick.t === 0, 'Quick add showed something today: counted once as shown (' + JSON.stringify(d && d.sg) + ')');
  await p.locator('[data-p="quick"]').first().click(); await L.settle(p, 400);
  d = await daily();
  ok(d.sg.quick.t === 1 && !/Mise|onion/i.test(JSON.stringify(d)), 'a Quick add tap counts as taken, and the counts hold no text');
  // the next day: yesterday's counts go out once, as the person signed in
  // (set as the reloaded page starts: leaving the page saves today's counts once more, as it should)
  await p.context().addInitScript(y => { try { const x = JSON.parse(localStorage.getItem('lk.daily')); if (x && x.day !== y && !sessionStorage.getItem('moved')) { sessionStorage.setItem('moved', '1'); x.day = y; localStorage.setItem('lk.daily', JSON.stringify(x)); } } catch (e) {} }, yday);
  await p.reload(); await L.settle(p, 2000);
  await L.waitFor(p, k => Object.keys(window.__fake.dump()).some(x => x.indexOf(k) === 0), fsKey(['daily', yday + '_']), 8000).catch(() => {});
  const sent = await p.evaluate(k => { const st = window.__fake.dump(); const id = Object.keys(st).filter(x => x.indexOf(k) === 0)[0]; return id ? st[id] : null; }, fsKey(['daily', yday + '_']));
  ok(sent && sent.day === yday && sent.sg.quick.t === 1 && sent.by === 'sam' && Object.keys(sent).sort().join() === 'at,by,day,pf,sg,tag', 'the next day: yesterday\'s counts are sent once, counts only (' + JSON.stringify(sent) + ')');
  await L.waitFor(p, () => !localStorage.getItem('lk.daily.out'), null, 5000).catch(() => {});
  ok(await p.evaluate(() => !localStorage.getItem('lk.daily.out')), 'and are not kept on the phone after');
  ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the usual order amount: filled in counts as shown, added as it was counts as taken
  p = await L.open(b, '#/orders', { who: 'ann', extra: { [fsKey(['ordlearned', 'paper-towels'])]: { text: 'Paper towels', uses: 9, dow: {}, qtys: { '6-rolls': { q: '6 rolls', n: 5 } } } }, wait: 1800 });
  await p.click('#o-text'); await p.keyboard.type('Paper towels'); await L.settle(p, 200);
  await p.press('#o-text', 'Enter'); await L.settle(p, 400);
  const od = await p.evaluate(() => JSON.parse(localStorage.getItem('lk.daily') || 'null'));
  ok(od && od.sg.ordfill && od.sg.ordfill.s === 1 && od.sg.ordfill.t === 1, 'usual order amount: shown and taken counted (' + JSON.stringify(od && od.sg) + ')');
  await p.context().close();

  // the admin panel: Insights shows the nightly sum
  const use = { [fsKey(['summary', 'usage'])]: { day: L.ymd(new Date(L.NOW)), days: { [yday]: { phones: 3, sg: { quick: { s: 3, t: 7, d: 1 }, checks: { s: 1, t: 0, d: 1 } }, pf: { lcp: [5, 3, 1, 1, 0], tap: [10, 5, 3, 2, 0] } } } } };
  p = await L.open(b, '#/admin', { admin: true, who: '', extra: use, wait: 2000 });
  await L.adminTab(p, 'insights'); await L.settle(p, 1200);
  await L.waitFor(p, () => /Quick add chips/.test(document.body.textContent)).catch(() => {});
  const t = (await L.txt(p, '#ins-usage') ? await p.evaluate(() => document.getElementById('ins-usage').parentNode.textContent) : '').replace(/\s+/g, ' ');
  const rows = await p.evaluate(() => [...document.getElementById('ins-usage').parentNode.querySelectorAll('tbody tr')].map(r => [...r.children].map(c => c.textContent.trim()).join('|')));
  ok(rows.indexOf('Quick add chips|3|7|1') >= 0 && rows.indexOf('To check before the functions|1|0|1') >= 0, 'admin: the features with shown, taken and put away (' + rows.join(' / ') + ')');
  ok(/First page within 2\.5 s: 90% of 10 opens/.test(t) && /Slowest tap within 200 ms: 90% of 20 visits/.test(t), 'admin: the phones\' speed against the targets');
  ok(p.errors.length === 0, 'admin: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
