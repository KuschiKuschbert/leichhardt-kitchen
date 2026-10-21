// Minutes for staff (usability U4): "Read and sign" opens the minutes the card names, unsigned ones are marked To sign,
// a cook's own actions stand out, a changed version says so, and signing is one tap (no second PIN).
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const ago = d => L.ymd(new Date(L.NOW - d * 86400000));
const mins = (no, date, decisions, x) => Object.assign({ no, v: 1, status: 'published', date, start: '14:00', loc: 'Kitchen', chair: 'sam', taker: 'sam',
  att: [{ id: 'ann', st: 'present' }, { id: 'sam', st: 'present' }, { id: 'bo', st: 'apology' }], guests: '', decisions, menu: '', safety: '', dates: '', other: '',
  acts: [], next: '', pubAt: L.NOW - 86400000, removed: false, at: 1, upd: 1, by: 'sam' }, x || {});
(async () => {
  const b = await L.start();
  const extra = {};
  extra[fsKey(['minutes', 'mnew'])] = mins(2, ago(1), 'New menu from Friday');
  extra[fsKey(['minutes', 'mnew', 'signs', '1_ann'])] = { v: 1, st: 'present', at: L.NOW - 3600000, name: 'Ann' };
  extra[fsKey(['minutes', 'mold'])] = mins(1, ago(8), 'Deep clean on Sunday', { acts: [
    { what: 'Clean the fryer', who: 'ann', by: '' }, { what: 'Order gloves', who: 'sam', by: '' }, { what: 'Team lunch', who: 'all', by: '' }] });

  // Ann signed the newest minutes but not last week's: the card opens last week's
  let p = await L.open(b, '#/', { who: 'ann', extra, wait: 1800 });
  ok(/Minutes not signed yet/.test(await txt(p, '.wall-mn') || ''), 'card: Minutes not signed yet shows');
  await p.click('.wall-mn .mn-nudge-btn');
  await L.settle(p, 900);
  ok(/Deep clean on Sunday/.test(await txt(p, '.mn') || ''), 'Read and sign opens the unsigned minutes, not the newest');
  ok(await p.$('.mn-signbtn:not([disabled])') !== null && await p.$('#mn-pin') === null, 'one Sign button, no second PIN');
  ok(/Sign as Ann/.test(await txt(p, '.mn-signbtn') || ''), 'the button says who signs');
  ok(await p.evaluate(() => document.querySelectorAll('.mn-tbl tr.is-mine').length) === 2, 'Ann\'s own and everyone\'s actions are marked Yours');
  ok(/Your actions: 2/.test(await txt(p, '.mn-sign') || ''), 'the sign box counts her actions');
  await p.click('.mn-signbtn');
  await L.settle(p, 800);
  ok(!!(await p.evaluate(k => window.__fake.dump()[k], fsKey(['minutes', 'mold', 'signs', '1_ann']))), 'one tap signs them');
  await p.context().close();

  // on the newest minutes, the older unsigned ones are marked To sign
  p = await L.open(b, '#/minutes', { who: 'ann', extra, wait: 1800 });
  ok(/New menu from Friday/.test(await txt(p, '.mn') || ''), 'the minutes page opens on the newest');
  ok(/To sign/.test(await txt(p, '[data-p="mn-pickdoc"][data-id="mold"]') || ''), 'earlier minutes still to sign say To sign');
  ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a second version says it changed
  const ex2 = {}; ex2[fsKey(['minutes', 'mv'])] = mins(3, ago(2), 'Roster change', { v: 2 });
  p = await L.open(b, '#/minutes', { who: 'bo', extra: ex2, wait: 1800 });
  ok(/changed after they were first published \(version 2\)/.test(await txt(p, '.mn-sign') || ''), 'version 2: the sign box says the minutes changed');
  await p.context().close();

  await b.close();
  L.report(R);
})();
