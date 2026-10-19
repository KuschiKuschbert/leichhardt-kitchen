// Minutes: anything still readable (90 days) can be signed, not only the minutes the book nags about (30 days), and a
// refused sign-off says why instead of "Reload the page" (audit, October 2026).
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const store = page => page.evaluate(() => window.__fake.dump());
const ago = d => L.ymd(new Date(L.NOW - d * 86400000));
const minutes = (id, no, date) => ({ no, v: 1, status: 'published', date, start: '14:00', loc: 'Kitchen', chair: 'sam', taker: 'sam',
  att: [{ id: 'ann', st: 'present' }, { id: 'sam', st: 'present' }, { id: 'bo', st: 'apology' }], guests: '', decisions: 'Fryer oil every Monday', menu: '', safety: '', dates: '', other: '',
  acts: [], next: '', pubAt: L.NOW - 40 * 86400000, removed: false, at: L.NOW - 40 * 86400000, upd: L.NOW - 40 * 86400000 });
(async () => {
  const b = await L.start();
  const extra = {}; extra[fsKey(['minutes', 'old1'])] = minutes('old1', 1, ago(45));

  // minutes 45 days old: no nag on the landing page, but they can still be signed
  let p = await L.open(b, '#/', { who: 'ann', extra, wait: 1800 });
  ok((await txt(p, '.wall-mn')) === '', 'older minutes: no "Minutes not signed yet" card after 30 days');
  await p.evaluate(() => { location.hash = '#/minutes'; });
  await p.waitForTimeout(1200);
  ok(/Fryer oil every Monday/.test(await txt(p, '.mn')), 'older minutes: the minutes open');
  ok(!/Checking your sign-off/.test(await txt(p, '.mn')), 'older minutes: the sign box is not stuck on "Checking your sign-off..."');
  ok(await p.$('#mn-pin') === null && await p.$('.mn-signbtn:not([disabled])') !== null, 'older minutes: one Sign button, no second PIN');
  await p.click('.mn-signbtn');
  await p.waitForTimeout(800);
  const s = await store(p);
  ok(!!s[fsKey(['minutes', 'old1', 'signs', '1_ann'])], 'older minutes: Ann\'s sign-off is saved');
  ok(/signed on/.test(await txt(p, '.mn-sign')), 'older minutes: the box now says Signed');
  ok(p.errors.length === 0, 'older minutes: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a refused sign-off (this phone's PIN no longer counts): back to the PIN screen with the usual message, not "Reload the page"
  const extra2 = {}; extra2[fsKey(['minutes', 'm2'])] = minutes('m2', 2, ago(1));
  p = await L.open(b, '#/minutes', { who: 'ann', extra: extra2, wait: 1800 });
  await p.evaluate(() => { window.__fake.mode = 'deny'; });
  await p.click('.mn-signbtn');
  await p.waitForTimeout(1000);
  ok(/sign in again with your PIN/.test(await txt(p, '.p-toast') || ''), 'refused sign-off: "sign in again with your PIN" toast');
  ok(await p.$('#pf1') !== null, 'refused sign-off: back on the person\'s PIN screen');
  ok(!/Reload the page/.test(await txt(p, '#prep-root') || ''), 'refused sign-off: no "Reload the page" dead end');
  ok(p.errors.length === 0, 'refused sign-off: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
