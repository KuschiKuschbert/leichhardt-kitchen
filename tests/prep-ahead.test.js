// Prep lines for a later day (head chef, 17 Nov 2026: the council's mix, admin only; docs/prep-ahead-options/brief.md).
// Part 1, the rollover: a day nobody opened that holds only lines planned for it is not a written day, so the open
// lines of the day before still roll, and so do its planned lines (before, the open lines of the day before were left
// behind for good: docs/prep-ahead-options/break-rollover.cjs). The night list writing again what was planned for today
// does not put the job on twice.
const L = require('./lib');
const { R, ok } = L.results();
const DAY = 86400000;
const today = L.ymd(new Date(L.NOW)), yday = L.ymd(new Date(L.NOW - DAY)), day2 = L.ymd(new Date(L.NOW - 2 * DAY));
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const tc = today.replace(/-/g, '');
const item = (d, id) => fsKey(['days', d, 'items', id]);
const line = x => Object.assign({ text: 'Make stock', station: 'Sauce', qty: '10 L', recipe: '', addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 2 * DAY - 3600000, done: false, deleted: false }, x);
const plan = (d, x) => line(Object.assign({ addedBy: 'Kim', addedById: 'kim', addedAt: L.NOW - 5 * DAY, plan: d }, x));
(async () => {
  const b = await L.start();

  // 1. A closed day: two days ago Brine pork was left open; yesterday nobody opened the book, but Kim had planned Thaw
  // brisket for it. Both roll onto today.
  {
    const extra = {};
    extra[item(day2, 'b1')] = line({ text: 'Brine pork', station: 'Larder', qty: '2 kg' });
    extra[item(day2, 'b2')] = line({ text: 'Make gravy', done: true, doneBy: 'Ann', doneById: 'ann', doneAt: L.NOW - 2 * DAY });
    extra[item(yday, 'a1')] = plan(yday, { text: 'Thaw brisket', station: 'Grill', qty: '1' });
    const p = await L.open(b, '#/prep', { who: 'ann', extra, wait: 3000 });
    await L.waitFor(p, id => !!window.__fake.dump()[id], item(today, 'r' + tc + '-a1'), 8000).catch(() => {});
    await L.settle(p, 500);
    const st = await p.evaluate(() => window.__fake.dump());
    const pork = st[item(today, 'r' + tc + '-b1')], brisket = st[item(today, 'r' + tc + '-a1')];
    ok(!!pork && pork.rolledFrom === day2, 'closed day: the open line from two days ago still rolls past a day holding only a planned line');
    ok(!!brisket && brisket.rolledFrom === yday && brisket.rolled === 1, 'closed day: the planned line of the day nobody opened rolls too');
    ok(!!brisket && !brisket.plan, 'closed day: the rolled copy is a plain rolled line, not planned');
    ok(!!brisket && brisket.origAt === Date.parse(yday + 'T00:00:00+10:00'), 'closed day: the copy counts as first written when its own day began');
    ok(!st[item(today, 'r' + tc + '-b2')], 'closed day: the ticked line does not roll');
    const words = await p.evaluate(() => [...document.querySelectorAll('.nb-row')].map(r => r.textContent.replace(/\s+/g, ' ')).join(' | '));
    ok(/Thaw brisket[^|]*from Kim, yesterday/.test(words), 'closed day: the rolled planned line says from Kim, yesterday (the day it was for) ' + words.slice(0, 200));
    ok(p.errors.length === 0, 'closed day: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // 2. The night list wrote again what was planned for today: Kim planned Brine pork 2 kg and Pizza dough 2 batch for
  // today; last night Ann wrote Brine pork 2 kg and Pizza dough 3 batch, and Slice onions. Brine pork stays once (the
  // planned line), Pizza dough with another amount rolls (both show Also), Slice onions rolls.
  {
    const extra = {}, night = L.NOW - 18 * 3600000;
    extra[item(today, 'p1')] = plan(today, { text: 'Brine pork', station: 'Larder', qty: '2 kg', addedAt: L.NOW - 3 * DAY });
    extra[item(today, 'p2')] = plan(today, { text: 'Pizza dough', station: 'Larder', qty: '2 batch', addedAt: L.NOW - 3 * DAY });
    extra[item(yday, 'n1')] = line({ text: 'Brine pork', station: 'Larder', qty: '2 kg', addedAt: night });
    extra[item(yday, 'n2')] = line({ text: 'Pizza dough', station: 'Larder', qty: '3 batch', addedAt: night + 60000 });
    extra[item(yday, 'n3')] = line({ text: 'Slice onions', station: 'Larder', qty: '1 tub', addedAt: night + 120000 });
    const p = await L.open(b, '#/prep', { who: 'ann', extra, wait: 3000 });
    await L.waitFor(p, id => !!window.__fake.dump()[id], item(today, 'r' + tc + '-n3'), 8000).catch(() => {});
    await L.settle(p, 500);
    const st = await p.evaluate(() => window.__fake.dump());
    ok(!st[item(today, 'r' + tc + '-n1')], 'night list: the same planned line is not copied next to the plan');
    ok(!!st[item(today, 'r' + tc + '-n2')], 'night list: another amount rolls over (both lines then show Also)');
    ok(!!st[item(today, 'r' + tc + '-n3')], 'night list: the other open lines roll as usual');
    ok(!!st[item(today, 'p1')] && !st[item(today, 'p1')].deleted, 'night list: the planned line stays');
    ok(p.errors.length === 0, 'night list: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // Part 2, the page (the mix). Saturday is three days ahead in these checks, as in the council's previews.
  const later = L.ymd(new Date(L.NOW + 3 * DAY)), tmr = L.ymd(new Date(L.NOW + DAY));
  const abbr = d => { const x = new Date(d + 'T12:00:00'); return x.toLocaleDateString('en-AU', { weekday: 'short' }) + ' ' + x.getDate() + ' ' + x.toLocaleDateString('en-AU', { month: 'short' }); };
  const weekday = (ms, o) => new Date(ms).toLocaleDateString('en-AU', Object.assign({ timeZone: 'Australia/Brisbane' }, o || { weekday: 'short' }));
  const txt = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
  const slip = p => p.evaluate(() => { const e = document.querySelector('.p-toast[data-toast="new"] .p-toast-msg') || document.querySelector('.p-toast .p-toast-msg'); return e ? e.textContent.trim() : ''; });
  const forward = async (p, n) => { for (let i = 0; i < n; i++) { await p.click('[data-p="day"][data-d="1"]'); await L.settle(p, 400); } };

  // 3. The admin plans Brine pork for Saturday: the day row, Add to Saturday, the same sheet named for the day.
  for (const width of [390, 1280]) {
    const p = await L.open(b, '#/prep', { admin: true, width, wait: 3000 });
    await L.settle(p, 800);
    await forward(p, 3);
    ok(await p.evaluate(() => !!document.querySelector('.nb-wrap.nb-later')), width + ' admin: a later day is one page');
    ok(await p.evaluate(() => { const r = document.querySelector('.nb-right'); return !r || getComputedStyle(r).display === 'none'; }), width + ' admin: no Handy page on a later day');
    ok(/^Nothing planned$/.test(await txt(p, '.nb-left .nb-prog')), width + ' admin: the count says Nothing planned (' + await txt(p, '.nb-left .nb-prog') + ')');
    ok(/^Planned ahead for \w+ \d+ \w+\. Staff see these lines on \w+, not before\.$/.test(await txt(p, '.nb-left .pa-for')), width + ' admin: the note at the top names the day (' + await txt(p, '.nb-left .pa-for') + ')');
    ok(/^Add to \w+$/.test(await txt(p, '.nb-addline')), width + ' admin: the add button names the day (' + await txt(p, '.nb-addline') + ')');
    ok(await p.evaluate(() => getComputedStyle(document.querySelector('.nb-left .nb-prog')).color) !== await p.evaluate(() => getComputedStyle(document.querySelector('.nb-addline')).backgroundColor), width + ' admin: the count is not the action orange');
    await p.click('.nb-addline'); await L.settle(p, 500);
    ok((await txt(p, '#p-log-h')) === 'Add to ' + abbr(later), width + ' admin: the sheet title is Add to ' + abbr(later) + ' (' + await txt(p, '#p-log-h') + ')');
    ok(/Not on today's list\./.test(await txt(p, '.p-sheet .pa-for')), width + ' admin: the sheet says it is not on today\'s list');
    await p.fill('#p-text', 'Brine pork'); await p.fill('#p-section', 'Larder'); await p.fill('#p-qty', '2 kg');
    await p.click('.nb-addbtn'); await L.settle(p, 600);
    const st = await p.evaluate(() => window.__fake.dump());
    const made = Object.entries(st).filter(([k, v]) => k.indexOf('/days/' + later + '/items/') > 0 && v && v.text === 'Brine pork');
    ok(made.length === 1 && made[0][1].plan === later && made[0][1].station === 'Larder', width + ' admin: the line is written on ' + later + ', marked plan');
    ok(!Object.keys(st).some(k => k.indexOf('/days/' + today + '/items/') > 0 && st[k] && st[k].text === 'Brine pork'), width + ' admin: nothing went on today');
    ok((await txt(p, '.p-sheet .just-t')) === 'Added for ' + abbr(later), width + ' admin: the receipt in the sheet says Added for ' + abbr(later) + ' (' + await txt(p, '.p-sheet .just-t') + ')');
    await p.click('.sheet-x'); await L.settle(p, 500);
    ok(/^Added Brine pork to Larder for /.test(await slip(p)) && (await slip(p)).indexOf(abbr(later)) > 0, width + ' admin: the slip after closing names the day (' + await slip(p) + ')');
    const row = await p.evaluate(() => { const r = [...document.querySelectorAll('.nb-row')].find(x => /Brine pork/.test(x.textContent)); return r ? { cal: !!r.querySelector('.pa-cal'), box: !!r.querySelector('button.nb-box'), tick: !!r.querySelector('[data-p="tick"]'), by: (r.querySelector('.nb-wrote') || {}).textContent || '' } : null; });
    ok(row && row.cal && !row.box && !row.tick, width + ' admin: the planned line has a calendar and nothing to tick');
    ok(row && row.by === 'Planned ' + weekday(L.NOW) + ' by Head chef', width + ' admin: its byline says Planned ' + weekday(L.NOW) + ' by Head chef (' + (row && row.by) + ')');
    ok(/^1 line planned$/.test(await txt(p, '.nb-left .nb-prog')), width + ' admin: the count says 1 line planned');
    // Prep opens on Today again after leaving it
    await p.evaluate(() => { location.hash = '#/orders'; }); await L.settle(p, 600);
    await p.evaluate(() => { location.hash = '#/prep'; }); await L.settle(p, 800);
    ok((await txt(p, '#rtitle')) === 'Today', width + ' admin: Prep opens on Today again after leaving it');
    ok(p.errors.length === 0, width + ' admin: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // 4. Tomorrow takes no plans (written tonight, on today's list); beyond four weeks neither.
  {
    const p = await L.open(b, '#/prep', { admin: true, wait: 3000 });
    await L.settle(p, 800);
    await forward(p, 1);
    ok(!(await p.evaluate(() => !!document.querySelector('.nb-addline'))), 'tomorrow: no add for the admin');
    ok(/^Tomorrow's list is written tonight, on today's list\. Planning ahead starts with \w+\.$/.test(await txt(p, '.nb-foot .hint')), 'tomorrow: says why (' + await txt(p, '.nb-foot .hint') + ')');
    await p.fill('#p-day', L.ymd(new Date(L.NOW + 30 * DAY))); await L.settle(p, 800);
    ok(!(await p.evaluate(() => !!document.querySelector('.nb-addline'))), '30 days ahead: no add');
    ok(/up to 4 weeks ahead/.test(await txt(p, '.nb-foot .hint')), '30 days ahead: says planning goes up to 4 weeks (' + await txt(p, '.nb-foot .hint') + ')');
    ok(p.errors.length === 0, 'tomorrow: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // 5. A sous chef reads a planned day and cannot change it; the add sheet is not offered.
  {
    const extra = {};
    extra[item(later, 'pl1')] = plan(later, { text: 'Pizza dough', station: 'Larder', qty: '3 batch', addedBy: 'Head chef', addedById: 'head', addedAt: L.NOW - 2 * DAY });
    const p = await L.open(b, '#/prep', { who: 'sam', extra, wait: 3000 });
    await L.settle(p, 800);
    await forward(p, 3);
    ok(/^Planned ahead by the head chef for .+Only the head chef adds or changes lines on a later day\./.test(await txt(p, '.nb-left .pa-for')), 'sous chef: the note says only the head chef plans (' + await txt(p, '.nb-left .pa-for') + ')');
    const row = await p.evaluate(() => { const r = [...document.querySelectorAll('.nb-row')].find(x => /Pizza dough/.test(x.textContent)); return r ? { x: !!r.querySelector('.nb-x'), star: !!r.querySelector('.nb-star'), more: !!r.querySelector('.nb-more'), tick: !!r.querySelector('[data-p="tick"]'), cal: !!r.querySelector('.pa-cal') } : null; });
    ok(row && row.cal && !row.x && !row.star && !row.more && !row.tick, 'sous chef: the planned line is read only ' + JSON.stringify(row));
    ok(!(await p.evaluate(() => !!document.querySelector('.nb-addline'))), 'sous chef: no add on a later day');
    await p.click('.nb-row .nb-main'); await L.settle(p, 400);
    ok(!(await p.evaluate(d => window.__fake.dump()[d].done, item(later, 'pl1'))), 'sous chef: a tap on the words ticks nothing');
    ok(p.errors.length === 0, 'sous chef: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // 6. On its day: a line planned on an earlier day reads "Planned <day> by", and is not Waiting longest.
  {
    const extra = {}, written = L.NOW - 3 * DAY + 2 * 3600000;   // three days ago, 16:00
    extra[item(today, 'pd1')] = plan(today, { text: 'Thaw brisket', station: 'Grill', qty: '2', addedBy: 'Head chef', addedById: 'head', addedAt: written });
    const p = await L.open(b, '#/prep', { who: 'ann', extra, wait: 3000 });
    await L.settle(p, 1000);
    const row = await p.evaluate(() => { const r = [...document.querySelectorAll('.nb-row')].find(x => /Thaw brisket/.test(x.textContent)); return r ? { by: (r.querySelector('.nb-wrote') || {}).textContent || '', why: !!r.querySelector('.nb-why'), n: !!r.querySelector('[data-n]'), box: !!r.querySelector('button.nb-box:not([disabled])') } : null; });
    ok(row && row.by === 'Planned ' + weekday(written) + ' by Head chef', 'on its day: Planned ' + weekday(written) + ' by Head chef (' + (row && row.by) + ')');
    ok(row && !row.why && !row.n, 'on its day: not Waiting longest, no Start here number');
    ok(row && row.box, 'on its day: staff tick it as usual');
    ok(p.errors.length === 0, 'on its day: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
