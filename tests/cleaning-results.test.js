// Cleaning results by section, step 2 (head chef, 26 Nov 2026, docs/cleaning-tracking-options/brief.md): the nightly
// count keeps each weekly or monthly job one by one and, for a section with a missed job, who was on. The admin's
// Inbox shows last night's misses as one row that names sections and jobs, never a person, and opens that night in
// Records at the jobs by section: the miss first, who was on behind a fold. Both read only the board they already
// hold. They say only what the count knows: nothing while Cleaning is not switched on, "not counted yet" for a night
// the run has not reached, a number with no sections when the jobs were not kept one by one. Made-up people.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const DAY = 86400000, day = n => L.ymd(new Date(L.NOW - n * DAY));
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const short = d => { const t = new Date(d + 'T12:00:00Z'); return DOW[t.getUTCDay()] + ' ' + t.getUTCDate() + ' ' + MON[t.getUTCMonth()]; };
const y = day(1), wk = day(8), wk2 = day(15), cutDay = day(22), ncDay = day(2), oldDay = day(3), nullDay = day(4);
const whole = (o) => Object.assign({ cv: 2, due: 52, done: 47, miss: [], missN: 0, unable: [], unableN: 0, wait: [], waitN: 0, ev: 4, evRec: 4, r: [], rN: 0, rn: { due: 0, done: 0, miss: 0, unable: 0, wait: 0 } }, o);
const pizza = (st, more) => Object.assign({ k: 'w1', t: 'Clean behind the pizza ovens', s: 'hot', sn: 'Hot side', st }, more || {});
const counts = {
  [y]: whole({ done: 47, miss: ['Clean behind the pizza ovens', 'Clean the shelves above the pass', 'Fryer oil change'], missN: 3, unable: [{ t: 'Deep clean the oil filter machine', n: 'No degreaser' }], unableN: 1,
    r: [pizza('m'), { k: 'w4', t: 'Clean out the fridges', s: 'hot', sn: 'Hot side', st: 'd', by: 'Lou', at: '21:40' }, { k: 'w2', t: 'Clean the shelves above the pass', s: '', sn: '', st: 'm' },
      { k: 'w3', t: 'Clean the drawers', s: 'grill', sn: 'Grill', st: 'd', by: 'Bo', at: '22:05' }, { k: 'w5', t: 'Deep clean the oil filter machine', s: 'gone', sn: 'Old section', st: 'u', n: 'No degreaser' }],
    rN: 5, rn: { due: 4, done: 2, miss: 2, unable: 1, wait: 0 }, ro: [{ s: 'hot', k: 'l', pk: 1, w: [{ n: 'Lou', sh: 'dinner', by: 'p' }, { n: 'Vic', sh: 'retired', by: 'k' }] }] }),
  [wk]: whole({ r: [pizza('m')], rN: 1, rn: { due: 1, done: 0, miss: 1, unable: 0, wait: 0 }, missN: 1, miss: ['Clean behind the pizza ovens'], ro: [{ s: 'hot', k: 'n', pk: 1, w: [] }] }),
  [wk2]: whole({ r: [pizza('d', { by: 'Lou', at: '21:55' })], rN: 1, rn: { due: 1, done: 1, miss: 0, unable: 0, wait: 0 } }),
  // trimmed: the whole counts without the jobs one by one. It says a job was missed, but not which
  [cutDay]: (() => { const c = whole({ missN: 1, miss: ['Clean behind the pizza ovens'], rN: 1, rn: { due: 1, done: 0, miss: 1, unable: 0, wait: 0 }, cut: 1 }); delete c.r; return c; })(),
  [ncDay]: { cv: 2, nc: 1 },
  [oldDay]: { cv: 1, due: 30, done: 28, miss: ['Clean behind the pizza ovens', 'Other'], missN: 2, unable: [], unableN: 0, wait: [], waitN: 0, ev: 0, evRec: 0 },
  [nullDay]: null
};
const rows = (over) => { const out = []; for (let i = 30; i >= 1; i--) { const d = day(i), c = over && d in over ? over[d] : d in counts ? counts[d] : whole({});
  out.push({ day: d, p: { n: 20, w: 18, t: 17, r: 2, sec: {}, mins: {}, who: {} }, w: { n: 0, reason: {}, sec: {}, items: [] }, x: { out: 0, in: 0 }, fs: { v: 1, del: [], c, cool: { k: 'none' } } }); } return out; };
const board = (o) => Object.assign({ v: 1, generation: 'g1', at: L.NOW - 11 * 3600000, from: day(30), to: y, days: rows(), cleanFrom: day(25), needs: { links: 0 } }, o || {});
const base = b => ({ [key('analysis', 'dashboard')]: b, [key('analysis', 'health')]: { at: L.NOW - 11 * 3600000, status: 'ok' },
  [key('config', 'main')]: { ...L.seed()[key('config', 'main')], kitSecs: [{ id: 'hot', name: 'Hot larder', was: ['Hot side'] }, { id: 'grill', name: 'Grill' }], kitShifts: [{ id: 'dinner', name: 'Dinner', from: 960, to: 1320 }] } });
const inbox = async (b, extra, width) => { const p = await L.open(b, '#/admin', { admin: true, adminPage: '', who: '', width, height: width === 390 ? 844 : 900, extra, wait: 1800 });
  await L.waitFor(p, () => !!document.querySelector('.dsh-needs'), null, 8000).catch(() => {}); await L.settle(p, 300); return p; };
const needs = p => p.$$eval('.dsh-need', els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
const clearLine = p => p.evaluate(() => { const e = document.querySelector('.dsh-clear'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; });
const block = p => p.evaluate(() => [...document.querySelectorAll('.rec-clean .rec-sec')].map(s => [...s.querySelectorAll('.rec-miss-h, .rec-line, .rec-who')].map(e => e.textContent.replace(/\s+/g, ' ').trim()).join(' | ')));
const NAMES = /\b(Lou|Vic|Bo)\b/;

(async () => {
  const b = await L.start();
  for (const width of [390, 768, 1280]) {
    const p = await inbox(b, base(board()), width);
    const row = await p.evaluate(() => { const e = document.querySelector('.dsh-need-miss'); if (!e) return null; const btn = e.querySelector('button');
      return { tag: e.querySelector('.dsh-tag').textContent, title: e.querySelector('.dsh-need-title').textContent, detail: e.querySelector('.dsh-need-detail').textContent, btn: btn ? btn.textContent : '', cls: btn ? btn.className : '', h: btn ? Math.round(btn.getBoundingClientRect().height) : 0 }; });
    ok(!!row && row.tag === 'Missed' && row.title === '2 weekly or monthly cleaning jobs missed last night', width + ': the Inbox has one row for last night\'s missed weekly and monthly jobs (' + JSON.stringify(row && [row.tag, row.title]) + ')');
    ok(!!row && row.detail.indexOf('Hot larder: Clean behind the pizza ovens (also missed ' + short(wk) + ').') > 0 && row.detail.indexOf('Shared kitchen: Clean the shelves above the pass.') > 0 && /Not ticked by midnight\.$/.test(row.detail),
      width + ': it names each section by its name now and its job, with an earlier miss of the same job (' + (row && row.detail) + ')');
    ok(!!row && !NAMES.test(row.title + row.detail) && !/Hot side|\bhot\b|Fryer oil change/.test(row.title + row.detail), width + ': it names no person, no old section name or id, and no nightly job');
    ok(!!row && row.btn === 'Open that night' && !/\bdark\b/.test(row.cls) && row.h >= 44, width + ': its button is the quiet one, 44 px tall (' + (row && row.cls) + ', ' + (row && row.h) + ')');
    ok((await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)), width + ': the Inbox has no sideways scroll');
    // the row opens that night in Records and lands on the jobs by section
    await p.evaluate(() => document.querySelector('.dsh-need-miss button').click());
    await L.waitFor(p, () => !!document.querySelector('#rec-clean-sec'), null, 8000).catch(() => {}); await L.settle(p, 400);
    const landed = await p.evaluate(() => { const h = document.querySelector('#rec-clean-sec'), r = h && h.getBoundingClientRect(); return { tab: LK_PREP.state.atab, focus: document.activeElement && document.activeElement.id, top: r ? Math.round(r.top) : -1, vh: innerHeight, date: (document.querySelector('.rec-dt') || {}).textContent }; });
    ok(landed.tab === 'records' && /^Yesterday, /.test(landed.date || '') && landed.focus === 'rec-clean-sec' && landed.top >= 0 && landed.top < landed.vh - 100, width + ': the button opens that night in Records, with the jobs by section on screen and in focus (' + JSON.stringify(landed) + ')');
    const secs = await block(p);
    ok(secs.length === 4 && /^Hot larder: 1 of 2 missed \| Missed: Clean behind the pizza ovens\. Not ticked by midnight\. /.test(secs[0]) && secs[0].indexOf('Also missed ' + short(wk) + '.') > 0 && secs[0].indexOf('Last done ' + short(wk2) + ' (Lou, 21:55).') > 0,
      width + ': the section with a miss comes first, the miss first in it, with when the job was missed before and last done (' + secs[0] + ')');
    ok(secs[0].indexOf('Also missed ' + short(wk) + ' and') < 0, width + ': a day whose jobs were not kept one by one is not called a miss of that job');
    ok(/\| Done: Clean out the fridges \(Lou, 21:40\)\. \| Who was on Hot larder$/.test(secs[0]), width + ': then the section\'s done job with who did it, and who was on behind a closed fold (' + secs[0] + ')');
    ok(/^Shared kitchen: 1 of 1 missed \| Missed: Clean the shelves above the pass\..*A shared job has no section, so nobody is listed\.$/.test(secs[1]) && !/Who was on/.test(secs[1]), width + ': a shared job has a line and no names (' + secs[1] + ')');
    ok(secs[2] === 'Grill: 1 of 1 done. | Done: Clean the drawers (Bo, 22:05).' && secs[3] === 'Old section: nothing due but a job that was not possible. | Not possible: Deep clean the oil filter machine (No degreaser).',
      width + ': a section that finished says so, and a job that was not possible is apart, under the name its job was saved with when the section is gone (' + secs.slice(2).join(' // ') + ')');
    const view = await p.evaluate(() => { const v = document.querySelector('.rec-dayv'), miss = v.querySelector('.rec-miss'), fold = v.querySelector('.rec-who');
      return { red: [...v.querySelectorAll('.rec-adv')].map(e => e.textContent), failure: getComputedStyle(v.querySelector('.rec-adv')).color, edge: getComputedStyle(miss).borderLeftColor, ink: getComputedStyle(miss.querySelector('.rec-miss-h')).color,
        lines: [...miss.querySelectorAll('.rec-line')].map(e => getComputedStyle(e).color), exp: fold.getAttribute('aria-expanded'), h: Math.round(fold.getBoundingClientRect().height), wide: document.documentElement.scrollWidth <= innerWidth }; });
    ok(view.red.length === 1 && /^Missed: Clean behind the pizza ovens, Clean the shelves above the pass, Fryer oil change\.$/.test(view.red[0]), width + ': Records\' own Missed line stays as it is (' + view.red.join(' // ') + ')');
    ok(/^rgb/.test(view.failure) && view.ink !== view.failure && view.edge !== view.failure && view.lines.every(c => c !== view.failure), width + ': the block is attention: its edge, heading and lines are not the failure red of Records\' own Missed line (' + JSON.stringify([view.failure, view.edge, view.ink]) + ')');
    ok(view.exp === 'false' && view.h >= 44 && view.wide, width + ': the fold is closed and 44 px tall; no sideways scroll (' + view.h + ')');
    await p.evaluate(() => document.querySelector('.rec-who').click()); await L.settle(p, 300);
    const who = await p.evaluate(() => ({ lines: [...document.querySelectorAll('.rec-who-list .rec-line')].map(e => e.textContent), exp: document.querySelector('.rec-who').getAttribute('aria-expanded'), label: document.querySelector('.rec-who').textContent, focus: document.activeElement && document.activeElement.className }));
    ok(who.exp === 'true' && who.lines.join(' | ') === 'On the plan: Lou (Dinner). | Picked the section themselves: Vic (a shift no longer on the list).' && /rec-who/.test(who.focus || '') && who.label === 'Hide who was on Hot larder',
      width + ': opened, it says who was on from the plan and from an own pick, each with its shift by name, never a raw id; focus stays on the fold (' + JSON.stringify(who) + ')');
    // Everything redraws the day as its parts load: the fold stays open
    await p.evaluate(() => document.querySelector('[data-p="rec-show"][data-v="all"]').click()); await L.settle(p, 900);
    ok(await p.evaluate(() => { const f = document.querySelector('.rec-who'); return !!f && f.getAttribute('aria-expanded') === 'true' && !!document.querySelector('.rec-who-list'); }), width + ': the fold stays open when the day is drawn again');
    if (width === 1280) {
      // names stay on screen: nothing from the jobs one by one or from who was on reaches print or the CSV
      await p.evaluate(() => { window.print = () => { window.__printed = document.getElementById('rec-print').innerText; }; });
      await L.waitFor(p, () => { const x = document.querySelector('[data-p="rec-print"][data-v="day"]'); return !!x && !x.disabled; }, null, 8000).catch(() => {});
      await p.evaluate(() => document.querySelector('[data-p="rec-print"][data-v="day"]').click()); await L.settle(p, 300);
      const printed = await p.evaluate(() => window.__printed || '');
      ok(printed.length > 40 && !NAMES.test(printed) && !/Who was on|On the plan/.test(printed), 'the printed day holds no name from the jobs or from who was on (' + printed.replace(/\s+/g, ' ').slice(0, 120) + ')');
      ok(/Cleaning: 47 of 52 done/.test(printed) && /Missed: Clean behind the pizza ovens/.test(printed), 'and keeps Records\' own cleaning lines');
    }
    // the other shapes a day can have: trimmed, not counted, an older count, not ready
    const open = async d => { await p.evaluate(() => document.querySelector('[data-p="rec-show"][data-v="fs"]').click()); await L.settle(p, 200);
      await p.evaluate(() => { const bk = document.querySelector('[data-p="rec-back"]'); if (bk) bk.click(); }); await L.settle(p, 200);
      await p.evaluate(dd => { const r = document.querySelector('.rec-dayrow[data-d="' + dd + '"]'); if (r) r.click(); }, d); await L.settle(p, 300);
      return p.evaluate(() => ({ head: !!document.querySelector('#rec-clean-sec'), miss: document.querySelectorAll('.rec-miss').length, text: (document.querySelector('.rec-clean') || document.querySelector('.rec-dayv')).textContent.replace(/\s+/g, ' ') })); };
    const cut = await open(cutDay);
    ok(cut.head && cut.miss === 0 && /0 of 1 done, 1 missed\. The jobs were not kept one by one for this day\./.test(cut.text), width + ': a trimmed day gives the count and says the jobs were not kept one by one (' + cut.text.slice(-120) + ')');
    const nc = await open(ncDay), old = await open(oldDay), none = await open(nullDay);
    ok(!nc.head && /Cleaning: not counted\./.test(nc.text) && !old.head && /Cleaning: 28 of 30 done/.test(old.text) && !none.head && /count not ready/i.test(none.text), width + ': a day not counted, an older count and a count not ready show no jobs by section and no guess');
    ok(!p.errors.length, width + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // what the Inbox says when the count knows less
  const states = [
    ['Cleaning is not switched on', board({ cleanFrom: '' }), r => !r.some(x => /leaning/.test(x)), c => !/cleaning/.test(c)],
    ['an older board with no first day', (() => { const x = board(); delete x.cleanFrom; return x; })(), r => !r.some(x => /leaning/.test(x)), c => !/cleaning/.test(c)],
    ['counting starts today', board({ cleanFrom: day(0) }), r => !r.some(x => /leaning/.test(x)), c => !/cleaning/.test(c)],
    ['last night is not counted yet', board({ days: rows({ [y]: null }) }), r => r.some(x => /^Not counted yetCleaning, last nightThe nightly run has not counted .* yet\. It runs at 03:00\.$/.test(x)) && !r.some(x => /missed/.test(x)), c => !/cleaning/.test(c)],
    ['last night is a day the count does not cover', board({ days: rows({ [y]: { cv: 2, nc: 1 } }) }), r => !r.some(x => /leaning/.test(x)), c => !/cleaning/.test(c)],
    ['last night is an older count', board({ days: rows({ [y]: counts[oldDay] }) }), r => !r.some(x => /leaning/.test(x)), c => !/cleaning/.test(c)],
    ['nothing was missed', board({ days: rows({ [y]: whole({ r: [pizza('d', { by: 'Lou', at: '21:40' })], rN: 1, rn: { due: 1, done: 1, miss: 0, unable: 0, wait: 0 } }) }) }), r => !r.some(x => /leaning/.test(x)), c => /Nothing waiting for .*last night's weekly and monthly cleaning/.test(c)],
    ['the jobs were not kept one by one', board({ days: rows({ [y]: counts[cutDay] }) }), r => r.some(x => /^Missed1 weekly or monthly cleaning job missed last night.*\. Not ticked by midnight\.Open that night$/.test(x) && !/Hot larder|pizza/.test(x)), c => !/cleaning/.test(c)],
    ['one section', board({ days: rows({ [y]: whole({ r: [pizza('m')], rN: 1, rn: { due: 1, done: 0, miss: 1, unable: 0, wait: 0 } }) }) }), r => r.some(x => /^MissedHot larder: 1 weekly or monthly job missed last night/.test(x)), c => !/cleaning/.test(c)]
  ];
  for (const [name, bd, rowsOk, clearOk] of states) {
    const p = await inbox(b, base(bd), 1280), list = await needs(p), cl = await clearLine(p);
    ok(rowsOk(list) && clearOk(cl), 'Inbox, ' + name + ': it says only what the count knows (' + list.filter(x => /leaning|issed/.test(x)).join(' // ') + ' // ' + cl + ')');
    ok(!p.errors.length, 'Inbox, ' + name + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  // Records may hold an older board than the Inbox that offers the night: the button reads the board again
  {
    const before = base(board({ days: rows({ [y]: null }), at: L.NOW - 30 * 3600000 })), p = await L.open(b, '#/admin', { admin: true, who: '', width: 1280, height: 900, extra: before, wait: 2000 });
    await L.adminTab(p, 'records'); await L.waitFor(p, () => !!document.querySelector('.rec-days'), null, 8000).catch(() => {});
    ok(/count not ready/i.test(await p.evaluate(dd => (document.querySelector('.rec-dayrow[data-d="' + dd + '"]') || document.body).textContent, y)), 'Records opened before the nightly run holds no count for last night');
    await p.evaluate(a => { window.__fake.write(a[0], a[1]); }, [key('analysis', 'dashboard'), board()]);
    await p.evaluate(() => document.querySelector('.a-quick[data-v="inbox"]').click()); await L.settle(p, 600);
    await p.evaluate(() => { const r = document.querySelector('[data-dsh="refresh"]'); if (r) r.click(); });
    await L.waitFor(p, () => !!document.querySelector('.dsh-need-miss button'), null, 8000).catch(() => {});
    ok(!!(await p.$('.dsh-need-miss button')), 'the Inbox, read after the run, offers last night');
    await p.evaluate(() => { const x = document.querySelector('.dsh-need-miss button'); if (x) x.click(); });
    await L.waitFor(p, () => !!document.querySelector('#rec-clean-sec'), null, 8000).catch(() => {}); await L.settle(p, 300);
    ok(await p.evaluate(() => !!document.querySelector('.rec-miss') && document.activeElement.id === 'rec-clean-sec' && !/count not ready/i.test(document.querySelector('.rec-dayv').textContent)), 'its button makes Records read the board again, so the night shows its missed jobs and not "Count not ready"');
    ok(!p.errors.length, 'older Records board: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  // a section with a miss but no kept record of who was on; and a day that kept only some of its jobs
  {
    const noRo = whole({ r: [{ k: 'w3', t: 'Clean the drawers', s: 'grill', sn: 'Grill', st: 'm' }], rN: 1, rn: { due: 1, done: 0, miss: 1, unable: 0, wait: 0 }, missN: 1, miss: ['Clean the drawers'] });
    const partial = whole({ r: [pizza('m'), { k: 'w3', t: 'Clean the drawers', s: 'grill', sn: 'Grill', st: 'd', by: 'Bo', at: '22:05' }], rN: 5, rn: { due: 5, done: 3, miss: 2, unable: 0, wait: 0 }, missN: 2, miss: ['Clean behind the pizza ovens', 'Another'] });
    const p = await L.open(b, '#/admin', { admin: true, who: '', width: 1280, height: 900, extra: base(board({ days: rows({ [y]: noRo, [day(2)]: partial }) })), wait: 2000 });
    await L.adminTab(p, 'records'); await L.waitFor(p, () => !!document.querySelector('.rec-days'), null, 8000).catch(() => {});
    await p.evaluate(dd => document.querySelector('.rec-dayrow[data-d="' + dd + '"]').click(), y); await L.settle(p, 300);
    await p.evaluate(() => document.querySelector('.rec-who').click()); await L.settle(p, 300);
    ok((await p.$$eval('.rec-who-list .rec-line', els => els.map(e => e.textContent))).join('|') === 'Who was on was not kept for this section.', 'a section with no record of who was on says so, and not that the plan is too old');
    await p.evaluate(dd => { document.querySelector('[data-p="rec-back"]').click(); document.querySelector('.rec-dayrow[data-d="' + dd + '"]').click(); }, day(2)); await L.settle(p, 300);
    const part = await block(p), top = await p.evaluate(() => document.querySelector('#rec-clean-sec').nextElementSibling.textContent);
    ok(/3 more jobs are counted but not listed, so each section below shows only the jobs listed\./.test(top) && /^Hot larder: at least 1 missed /.test(part[0]) && /^Grill: the jobs listed\. /.test(part[1]), 'a day that kept only some of its jobs never reads as whole sections (' + part.join(' // ') + ')');
    const inb = await inbox(b, base(board({ days: rows({ [y]: partial }) })), 1280), list = await needs(inb);
    ok(list.some(x => /^Missed2 weekly or monthly cleaning jobs missed last night/.test(x) && !/Hot larder|pizza/.test(x)), 'and the Inbox gives the number without sections for it (' + list.filter(x => /issed/.test(x)).join(' // ') + ')');
    ok(!p.errors.length && !inb.errors.length, 'partial and unkept: no page errors');
    await inb.context().close(); await p.context().close();
  }
  L.report(R); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
