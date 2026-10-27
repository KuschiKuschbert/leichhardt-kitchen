// Minutes for staff (usability U4): "Read and sign" opens the minutes the row names, unsigned ones are marked To sign,
// a cook's own actions stand out, a changed version says so, and signing is one tap (no second PIN). Since 23 Oct 2026
// minutes to sign come up in the sheet at the start of the shift; the landing page has a slim row only once they are late
// (3 days after publishing), and the prep list has none.
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

  // Ann signed the newest minutes but not last week's: the start of shift sheet lists last week's only
  let p = await L.open(b, '#/', { who: 'ann', extra, wait: 1800, board: true });
  // the minutes are read after the settings and the sign-in, so wait for the sheet itself
  await L.waitFor(p, () => !!document.querySelector('.nt .nt-a'), null, 5000).catch(() => {});
  const rows = await p.evaluate(() => [...document.querySelectorAll('.nt .nt-a')].map(a => a.getAttribute('data-id') + ':' + a.textContent));
  ok(rows.length === 1 && /^mold:Kitchen meeting/.test(rows[0]) && /Your actions: 2/.test(rows[0]), 'sheet: one row to sign, last week\'s, with her actions (' + rows.join(' | ') + ')');
  ok(await txt(p, '.wall-mn') === '', 'landing: no row while the minutes are not late');
  await p.click('.nt .nt-a');
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

  // minutes 4 days old and not signed: the slim row on the landing page, never on the prep list
  const late = {}; late[fsKey(['minutes', 'mlate'])] = mins(4, ago(4), 'Allergen folder moved', { pubAt: L.NOW - 4 * 86400000 });
  p = await L.open(b, '#/', { who: 'bo', extra: late, wait: 1800 });
  await L.waitFor(p, () => /Minutes not signed yet/.test((document.querySelector('.wall-mn') || {}).textContent || ''), null, 5000).catch(() => {});
  ok(/Minutes not signed yet.*4 days ago/.test(await txt(p, '.wall-mn') || ''), 'late: the landing page has the slim row (' + await txt(p, '.wall-mn') + ')');
  await p.evaluate(() => { location.hash = '#/prep'; }); await L.settle(p, 800);
  ok(await p.$('#prep-root .mn-nudge') === null, 'late: nothing about minutes on the prep list');
  await p.evaluate(() => { location.hash = '#/'; }); await L.settle(p, 600);
  await p.click('.wall-mn .mn-nudge-btn'); await L.settle(p, 900);
  ok(/Allergen folder moved/.test(await txt(p, '.mn') || ''), 'late: Read and sign opens those minutes');
  await p.click('.mn-signbtn'); await L.settle(p, 800);
  await p.evaluate(() => { location.hash = '#/'; }); await L.settle(p, 600);
  ok(await txt(p, '.wall-mn') === '', 'late: the row goes once signed');
  ok(p.errors.length === 0, 'late: no page errors ' + p.errors.join(' | '));
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

  // Ann's own sign-off cannot be read (27 Oct 2026: from 26 Oct the rules refused it, so nobody could sign; no signal does
  // the same). The sign box says it could not check, not "Checking your sign-off..." for ever, and the phone does not ask
  // again on every redraw (it waits 5 minutes). The stand-in has no sign-off rule, so a failed read stands in for it.
  const one = {}; one[fsKey(['minutes', 'mone'])] = mins(5, ago(1), 'Gloves at the pass');
  p = await L.open(b, '#/minutes', { who: 'ann', extra: one, wait: 1800, failReads: '/minutes/[^/]+/signs/' });
  await L.waitFor(p, () => /Could not check/.test((document.querySelector('.mn-sign') || {}).textContent || ''), null, 5000).catch(() => {});
  ok(/Could not check your sign-off/.test(await txt(p, '.mn-sign') || ''), 'own sign-off not read: the sign box says it could not check (' + await txt(p, '.mn-sign') + ')');
  for (const h of ['#/prep', '#/minutes', '#/prep', '#/minutes']) { await p.evaluate(x => { location.hash = x; }, h); await L.settle(p, 400); }
  const asked = await p.evaluate(() => window.__fake.reads.filter(k => /\/minutes\/mone\/signs\//.test(k)).length);
  ok(asked === 1, 'own sign-off not read: asked once, not again on every redraw (' + asked + ')');
  ok(p.errors.length === 0, 'own sign-off not read: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the sous chef's register when the sign-offs cannot be listed (refused, as on the live book from 26 Oct): it says so,
  // and never shows everyone as not signed, a chase list of everyone or a CSV of nobody signed. Refresh reads again.
  const reg = {}; reg[fsKey(['minutes', 'mreg'])] = mins(6, ago(1), 'New fryer');
  reg[fsKey(['minutes', 'mreg', 'signs', '1_ann'])] = { v: 1, st: 'present', at: L.NOW - 3600000, name: 'Ann', by: 'ann' };
  p = await L.open(b, '#/minutes', { who: 'sam', extra: reg, wait: 1800, denyReads: '/minutes/[^/]+/signs$' });
  await L.waitFor(p, () => !!document.querySelector('[data-p="mn-sous"]'), null, 5000).catch(() => {});
  await p.click('[data-p="mn-sous"]');
  await L.waitFor(p, () => /Could not load the sign-offs|Signed/.test((document.querySelector('.p-minutes-page') || {}).textContent || ''), null, 5000).catch(() => {});
  const regTxt = await txt(p, '.p-minutes-page') || '';
  ok(/Could not load the sign-offs/.test(regTxt), 'register refused: it says the sign-offs could not be loaded');
  ok(await p.$('.p-minutes-page .mn-tile') === null && await p.$('.p-minutes-page .mn-chase') === null && !/Signed 0|Chase list/.test(regTxt), 'register refused: no counts and no chase list of everyone (' + regTxt.replace(/\s+/g, ' ').slice(0, 160) + ')');
  ok(await p.$('[data-p="mn-csv"][disabled]') !== null, 'register refused: Download CSV is off, so no proof of nobody signed');
  await p.evaluate(() => { window.__fake.denyReads = null; });
  await p.click('[data-p="mn-refresh"]');
  await L.waitFor(p, () => /Signed\s*1/.test((document.querySelector('.p-minutes-page .mn-tile') || {}).textContent || ''), null, 5000).catch(() => {});
  ok(/Signed\s*1\s*of 3/.test(await txt(p, '.p-minutes-page .mn-tile') || ''), 'register refused: Refresh reads again and counts Ann (' + await txt(p, '.p-minutes-page .mn-tile') + ')');
  ok(await p.$('[data-p="mn-csv"]:not([disabled])') !== null, 'register refused: Download CSV is back once the register is in');
  ok(p.errors.length === 0, 'register refused: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})();
