// A change to a past day reaches every phone (coding rules, 22 Oct 2026): the head chef or a sous chef removing or
// ticking a line on a past day stamps config/main.pastEdit, and a phone whose saved past days are older reads them again.
const L = require('./lib');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const yday = L.ymd(new Date(L.NOW - 86400000));
const CFG = fsKey(['config', 'main']);
const extra = {};
extra[fsKey(['days', yday, 'items', 'y1'])] = { text: 'Make stock', station: 'Sauce', qty: '10 L', recipe: '', addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 90000000, done: false, deleted: false };
extra[fsKey(['days', yday, 'items', 'y2'])] = { text: 'Pick parsley', station: 'Larder', qty: '', recipe: '', addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 89000000, done: true, doneAt: L.NOW - 87000000, deleted: false };
const pastReads = p => p.evaluate(d => window.__fake.reads.filter(k => k.indexOf('/days/' + d + '/items') > 0).length, yday);
(async () => {
  const b = await L.start();

  // Ann's phone keeps the past days for the day; another phone removes yesterday's Pick parsley and stamps pastEdit
  let p = await L.open(b, '#/prep', { who: 'ann', extra, wait: 2500 });
  await L.waitFor(p, () => !!localStorage.getItem('lk.past'));
  const at = await p.evaluate(() => JSON.parse(localStorage.getItem('lk.past')).at || 0);
  ok(at > 0, 'ann: the saved past days say when they were read (' + at + ')');
  const before = await pastReads(p);
  await p.evaluate(a => {
    const k = a.line, v = Object.assign({}, window.__fake.dump()[k], { deleted: true, deletedBy: 'Sam', deletedAt: a.at + 1000 });
    window.__fake.write(k, v);
    window.__fake.write(a.cfg, Object.assign({}, window.__fake.dump()[a.cfg], { pastEdit: { p: a.at + 1000 } }));
  }, { line: fsKey(['days', yday, 'items', 'y2']), cfg: CFG, at });
  await L.waitFor(p, d => window.__fake.reads.filter(k => k.indexOf('/days/' + d + '/items') > 0).length > 0 && /"y2"[^}]*"deleted":true/.test(localStorage.getItem('lk.past') || ''), yday);
  ok(await pastReads(p) > before, 'ann: the stamp makes the phone read the past days again');
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('lk.past')).at) > at, 'ann: the new copy is newer than the stamp');
  // and only once: nothing more is read on later redraws
  const after = await pastReads(p);
  await p.evaluate(() => { location.hash = '#/orders'; }); await L.settle(p, 600);
  await p.evaluate(() => { location.hash = '#/prep'; }); await L.settle(p, 900);
  ok(await pastReads(p) === after, 'ann: read once, not on every redraw (' + (await pastReads(p) - after) + ')');
  ok(p.errors.length === 0, 'ann: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a phone that opens later the same day with an older saved copy reads again straight away
  p = await L.open(b, '#/prep', { who: 'bo', extra, wait: 2500 });
  await L.waitFor(p, () => !!localStorage.getItem('lk.past'));
  const at2 = await p.evaluate(() => JSON.parse(localStorage.getItem('lk.past')).at || 0);
  // the stamp changes on the "server" without telling this open page (another phone's edit while it was closed), so
  // only the reload can find the older copy. Told live, the page would read again before the reload (a race).
  await p.evaluate(a => { const st = window.__fake.dump(); st[a.cfg] = Object.assign({}, st[a.cfg], { pastEdit: { p: a.at + 1 } }); localStorage.setItem('fake.fs', JSON.stringify(st)); }, { cfg: CFG, at: at2 });
  await p.reload(); await L.settle(p, 2500);
  await L.waitFor(p, n => (JSON.parse(localStorage.getItem('lk.past') || '{}').at || 0) > n, at2 + 1).catch(() => {});
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('lk.past') || '{}').at || 0) > at2 + 1 && await pastReads(p) > 0, 'bo: after a reload the copy older than the stamp is not used, the past days are read again');
  await p.context().close();

  // Sam (sous chef) removes yesterday's line: config/main gets the stamp
  p = await L.open(b, '#/prep', { who: 'sam', extra, wait: 2500 });
  await p.click('[data-p="day"][data-d="-1"]'); await L.settle(p, 700);
  await L.waitFor(p, () => !!document.querySelector('[data-p="del"][data-id="y1"]'));
  await p.click('[data-p="del"][data-id="y1"]');
  await L.waitFor(p, k => !!((window.__fake.dump()[k] || {}).pastEdit || {}).p, CFG);
  const s = await p.evaluate(() => window.__fake.dump());
  ok(s[fsKey(['days', yday, 'items', 'y1'])].deleted === true && s[CFG].pastEdit.p > 0, 'sam: removing yesterday\'s line stamps pastEdit.p (' + JSON.stringify(s[CFG].pastEdit) + ')');
  const w = await p.evaluate(k => [].concat.apply([], window.__fake.writes).filter(o => o.path === k).map(o => Object.keys(o.data).sort().join(',')), CFG);
  ok(w.length === 1 && w[0] === 'by,pastEdit', 'sam: the stamp sends only pastEdit (' + w.join(' | ') + ')');
  ok(p.errors.length === 0, 'sam: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})();
