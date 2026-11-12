// At a glance on Reports, Team (head chef, 12 Nov 2026, Look 1, docs/team-glance-options/brief.md): the report's
// findings first, as the Dashboard's headline cards, each a jump to its detail. Made-up cooks and numbers only.
const L = require('./lib');
const { R, ok } = L.results();
const path = (...p) => ['kitchens', L.PIN, ...p].join('/');
const DAY = 86400000, dayN = n => L.ymd(new Date(L.NOW - n * DAY));
const MARK = '<img src=x onerror=__gi=1>';   // short: a section name is 40 characters at most

// Ann on Larder (and Pans one day in four), Sam always on Grill, Bo on Sauce two days in three and Grill the rest
function tsum(shape) {
  const days = [];
  for (let i = 1; i <= 30; i++) days.push({ day: dayN(i), s: shape(i) });
  return { v: 1, at: L.NOW - 11 * 3600000, day: dayN(0), from: dayN(30), to: dayN(1), days, usual: {}, learn: {} };
}
const usual = i => [{ p: 'ann', sec: i % 4 === 1 ? 'Pans' : 'Larder', sh: 'lunch' }, { p: 'sam', sec: 'Grill', sh: 'lunch' }, { p: 'bo', sec: i % 3 ? 'Sauce' : 'Grill', sh: 'dinner' }];
// everyone everywhere, in turn: nothing stands out
const even = i => ['ann', 'sam', 'bo'].map((p, j) => ({ p, sec: ['Grill', 'Larder', 'Sauce'][(i + j) % 3], sh: 'lunch' }));
function extra(shape, secs, orders) {
  const x = { [path('teamsum', 'main')]: tsum(shape) };
  x[path('config', 'main')] = { ...L.seed()[path('config', 'main')], kitSecs: secs };
  if (orders) [1, 2, 3, 5].forEach((n, i) => { x[path('orders', dayN(n), 'lines', 'm' + i)] = { text: 'Milk', qty: '6 L', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - n * DAY, ordered: false, deleted: false }; });
  return x;
}
const SECS = [{ id: 'grill', name: 'Grill' }, { id: 'larder', name: 'Larder' }, { id: 'sauce', name: 'Sauce' }, { id: 'pans', name: 'Pans' }];
const open = (b, ex, w, h, more) => L.open(b, '#/admin', Object.assign({ admin: true, who: '', adminPage: 'team', width: w, height: h, extra: ex, wait: 2200 }, more || {}));
const ready = p => L.waitFor(p, () => /At a glance/.test((document.querySelector('.a-pane') || {}).innerText || '') && /Standing order candidates/.test(document.body.innerText), null, 10000);
const cards = p => p.$$eval('.a-pane .tm-glance .dsh-head', l => l.map(e => ({ tag: e.querySelector('.dsh-tag').textContent, h: e.querySelector('h4').textContent, p: e.querySelector('p:not(.dsh-tag)').textContent, link: e.querySelector('.dsh-more').textContent, v: e.querySelector('.dsh-more').getAttribute('data-v'), top: e.getBoundingClientRect().top, w: e.getBoundingClientRect().width })));

(async () => {
  const b = await L.start();
  let p = await open(b, extra(usual, SECS, true), 1280, 900);
  await ready(p);
  await L.waitFor(p, () => /Milk/.test((document.querySelector('.tm-glance') || {}).textContent || ''), null, 8000).catch(() => {});
  let c = await cards(p);
  const heads = await p.$$eval('.a-pane h3.a-ch-h', l => l.map(e => e.textContent));
  ok(heads[0] === 'At a glance' && heads[1] === 'Who has worked where', 'At a glance comes first, then the table (' + heads.slice(0, 3).join(' | ') + ')');
  ok(!heads.some(h => /Sections few people worked lately|Mostly on one section/.test(h)), 'the old written lists below the table are gone: each finding has one place');
  const chips = await p.$$eval('.a-onpage .chip', l => l.map(e => e.textContent));
  ok(chips[0] === 'At a glance', 'On this page starts with At a glance (' + chips.slice(0, 3).join(', ') + ')');
  const status = await p.$eval('.a-pane h3.tm-glance-h + p', e => e.textContent);
  ok(/^Shift counts to [^.]+, from the nightly run\. A count of shifts is activity, not a sign someone can run a section alone\.$/.test(status), 'one status line says when the counts run to (' + status + ')');
  const byH = h => c.find(x => x.h === h) || {};
  ok(byH('Only Bo worked Sauce').p === '20 shifts. Ann and Sam had no Sauce shifts.' && byH('Only Bo worked Sauce').tag === 'Few cooks, last 30 days', 'a section one cook worked: who, how many shifts, and who had none (' + JSON.stringify(byH('Only Bo worked Sauce')) + ')');
  ok(byH('Only Ann worked Pans').p === '8 shifts. Bo and Sam had no Pans shifts.', 'Pans the same way');
  ok(byH('Sam was on Grill every shift').p === '30 of 30 shifts on Grill.' && byH('Sam was on Grill every shift').tag === 'One section, last 30 days', 'someone on one section every shift');
  const milk = byH('Milk was on the order list on 5 days');
  ok(milk.tag === 'Standing order?, last 14 days' && milk.p === 'A standing order with the supplier saves writing it each time.' && milk.link === 'See the order list' && milk.v === 'tm-standing', 'a standing order candidate, linking to its list (' + JSON.stringify(milk) + ')');
  ok(byH('Only Ann worked Larder').p === '22 shifts. Bo and Sam had no Larder shifts.', 'Larder, with Ann\'s Pans days counted apart');
  ok(byH('Two cooks only: Grill').p === 'Grill: Bo (10) and Sam (30).' && byH('Two cooks only: Grill').tag === 'Two cooks only, last 30 days', 'sections only two cooks worked share one card (' + JSON.stringify(byH('Two cooks only: Grill')) + ')');
  // measured 12 Nov 2026: at 1280 x 900 the Reports header, tabs and two rows of On this page put the heading and status
  // line on the first screen and the first row of cards just under it (about 895 px)
  const gh = await p.$eval('.tm-glance-h', e => e.getBoundingClientRect().top);
  ok(c.length === 6 && gh < 900 && c.slice(0, 4).every(x => Math.abs(x.top - c[0].top) < 2), 'six cards, four to a row, At a glance on the first screen at 1280 x 900 (heading ' + Math.round(gh) + ', cards ' + c.map(x => Math.round(x.top)).join(', ') + ')');
  ok(c.filter(x => x.v === 'tm-where').every(x => x.link === 'See the table'), 'the shift cards link to the table');
  // a link jumps to its detail, as On this page does
  await p.click('.tm-glance .dsh-more[data-v="tm-standing"]');
  await L.waitFor(p, () => { const r = document.getElementById('tm-standing').getBoundingClientRect(); return r.top >= 0 && r.top < 300; }, null, 4000).catch(() => {});
  ok(await p.evaluate(() => { const r = document.getElementById('tm-standing').getBoundingClientRect(); return r.top >= 0 && r.top < 300; }), 'See the order list brings Standing order candidates to the top of the screen');
  await p.click('.tm-glance .dsh-more[data-v="tm-where"]');
  await L.waitFor(p, () => { const r = document.getElementById('tm-where').getBoundingClientRect(); return r.top >= 0 && r.top < 300; }, null, 4000).catch(() => {});
  ok(await p.evaluate(() => { const r = document.getElementById('tm-where').getBoundingClientRect(); return r.top >= 0 && r.top < 300; }), 'See the table brings Who has worked where to the top of the screen');
  ok(await p.evaluate(() => window.__fake.reads.filter(r => /\/teamsum\//.test(r)).length) === 1, 'the shift counts are read once, as before');
  ok(!(await L.overflow(p)) && p.errors.length === 0, 'no sideways scroll, no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a phone: the cards stand one under another, nothing sideways
  p = await open(b, extra(usual, SECS, true), 390, 844);
  await ready(p);
  c = await cards(p);
  const listW = await p.$eval('.tm-glance', e => e.getBoundingClientRect().width);
  ok(c.length >= 3 && c.every(x => Math.abs(x.w - listW) < 2), 'phone: each card is the full width of the list (' + c.map(x => Math.round(x.w)).join(', ') + ' of ' + Math.round(listW) + ')');
  ok(!(await L.overflow(p)) && p.errors.length === 0, 'phone: no sideways scroll, no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // nothing stands out: one quiet line, no cards
  p = await open(b, extra(even, SECS.slice(0, 3), false), 1280, 900);
  await ready(p);
  const quiet = await p.$eval('.a-pane', e => e.innerText);
  ok((await cards(p)).length === 0 && /Nothing stands out: every section had three or more cooks in the last 30 days, and no one spent most shifts on one section\./.test(quiet), 'nothing to say: one quiet line, no empty cards');
  await p.context().close();

  // the counts do not load: said once, under At a glance; the table does not read as "nobody"
  p = await open(b, extra(usual, SECS, true), 1280, 900, { failReads: '/teamsum/main' });
  await ready(p);
  const t = await p.$eval('.a-pane', e => e.innerText);
  ok(/At a glance\s*Could not load the shift counts\. This does not mean nobody worked a section\./.test(t) && /No table yet: see At a glance above\./.test(t) && (t.match(/Could not load the shift counts/g) || []).length === 1, 'a failed read is said once, under At a glance, and the table points to it');
  ok(/Milk was on the order list on 5 days/.test(t), 'the standing order card still shows from the order lines');
  await p.context().close();

  // a section name with markup is shown as words, never run
  p = await open(b, extra(i => [{ p: 'ann', sec: MARK, sh: 'lunch' }], [{ id: 'x', name: MARK }], false), 1280, 900);
  await ready(p);
  ok(await p.evaluate(m => !window.__gi && !document.querySelector('.tm-glance img') && (document.querySelector('.tm-glance') || {}).textContent.includes(m), MARK), 'a section name with markup is shown as words in its card');
  await p.context().close();
  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
