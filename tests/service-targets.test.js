/*
  The consistency sweep, step 1 (19 Nov 2026, docs/consistency-sweep-options/brief.md): the four findings that touch
  service.
    SHEL-1, SYST-1  the function band's Hide minus takes a 44 px tap (still the small circle chosen on 22 Oct 2026, so
                    the band is no taller), "+N more" and "Service view" take 44 px taps too, and a round's Send and Undo are 44 px
    SHEL-2          the cut-off bar's supplier name is a 44 px tap, and the bar is no taller for it
    ORDE-3          on Orders, Remove comes before the ⋯, as on Prep, Wastage and Transfers
    ORDE-1          on a phone, Save delivery is on the first screen with both bands showing, docked above the tab bar
  14 of these 23 checks failed on the code before the sweep (a 15th, the laptop's, looks for the new dock). The others
  guard that the bars grew no taller and that a round's Send stays 44 px.
*/
const L = require('./lib');
const M = require('../js/functions.js');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW));
const t = hm => M.kat(today, M.hmMin(hm));
const P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true });
const next = (new Date(L.NOW).getDay() + 1) % 7;
// three functions tonight (so the band shows two, "+1 more" and Service view), and a supplier whose order closes at
// 15:00 (the cut-off bar shows for the chefs from 11:00)
function fn(id, name, start, round) {
  return M.derive({ v: 1, status: 'confirmed', name, date: today, start: t(start), loc: 'Beer garden', guests: 40, mode: 'all', notes: '', kc: '', kcBy: '', kcAt: 0,
    rounds: [{ at: t(round), note: '' }], lines: [{ rid: 'antipasto-platter', name: 'Antipasto Platter', unit: 'platter', spec: 'Per platter.', fp: '', qty: 2, u: M.toU([2]) }],
    was: {}, chg: [], cBy: 'kit', cAt: L.NOW - 86400000, confBy: 'kit', confAt: L.NOW - 86400000, by: 'kit', upd: L.NOW - 3600000 });
}
const extra = {
  [fsKey(['config', 'main'])]: { people: [P('kit', 'Kit', 'head'), P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'staff')], headId: 'kit', sousIds: ['kit', 'sam'], pingIds: ['kit', 'sam'],
    staffIds: ['kit', 'sam', 'ann'], showBadges: true, cutoffs: [{ id: 'northside', name: 'Northside Test Foods', dd: [next], at: 900, pre: 1, lead: 240 }] },
  [fsKey(['config', 'admins'])]: { x: 1, mailOpened: L.NOW },
  [fsKey(['pinset', 'kit'])]: { at: 1 },
  [fsKey(['functions', 'smith'])]: fn('smith', 'Smith 50th', '18:00', '18:30'),
  [fsKey(['functions', 'jones'])]: fn('jones', 'Jones wedding', '18:30', '19:00'),
  [fsKey(['functions', 'brown'])]: fn('brown', 'Brown wake', '19:00', '19:30'),
  // a round ticked Sent a minute ago on the older tick (no trips): its Undo is the plain link
  [fsKey(['fnsent', 'smith_' + t('18:30')])]: { fid: 'smith', at: t('18:30'), day: today, sent: true, sentAt: L.NOW - 60000, sentBy: 'kit' }
};
const open = (b, hash, w, h) => L.open(b, hash, { admin: true, who: 'kit', width: w, height: h, touch: w < 720, wait: 1800, extra });
// the tap at a point lands on the element (or inside it)
const hitAt = (p, sel, dy, dx) => p.evaluate(([s, d, h]) => {
  const e = document.querySelector(s); if (!e) return 'missing';
  const r = e.getBoundingClientRect(), x = r.left + r.width / 2 + h, y = r.top + r.height / 2 + d, at = document.elementFromPoint(x, y);
  return !!at && (at === e || e.contains(at)) ? 'yes' : 'no: ' + (at ? at.className || at.tagName : 'nothing');
}, [sel, dy, dx || 0]);
const size = (p, sel) => p.evaluate(s => [...document.querySelectorAll(s)].map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), e.textContent.trim()]; }), sel);

(async () => {
  const b = await L.start();

  // SHEL-1, SYST-1, SHEL-2 on the head chef's Prep, on a phone
  let p = await open(b, '#/prep', 390, 844);
  await L.waitFor(p, () => !!document.querySelector('.fn-band .fn-fold') && !!document.querySelector('#cut-band:not([hidden]) .cut-n'), null, 10000).catch(() => {});
  // the minus stays the small circle the head chef chose (22 Oct 2026, functions.test.js checks it), its tap 44 px across
  for (const [dx, dy] of [[0, -20], [0, 20], [-20, 0], [20, 0]]) ok(await hitAt(p, '.fn-band .fn-fold', dy, dx) === 'yes', 'the band\'s Hide minus takes a tap 20 px ' + (dy < 0 ? 'above' : dy > 0 ? 'below' : dx < 0 ? 'left of' : 'right of') + ' its middle');
  const top = await p.evaluate(() => Math.round(document.querySelector('.fn-band-top').getBoundingClientRect().height));
  ok(top <= 46, 'the band\'s label row is no taller for it (' + top + ' px)');
  // "+N more" and "Service view": drawn as before, each a tap 44 px high
  for (const s of ['.fn-band .fn-more[data-fn="more"]', '.fn-band a.fn-svc']) for (const dy of [-20, 20]) ok(await hitAt(p, s, dy) === 'yes', (s.includes('svc') ? 'Service view' : '"+N more"') + ' takes a tap 20 px ' + (dy < 0 ? 'above' : 'below') + ' its middle');
  const band = await p.evaluate(() => Math.round(document.getElementById('fn-band').getBoundingClientRect().height));
  ok(band <= 216, 'the band is no taller for any of it (' + band + ' px)');
  for (const dy of [-20, 0, 20]) ok(await hitAt(p, '#cut-band .cut-n', dy) === 'yes', 'the cut-off bar\'s supplier name takes a tap ' + Math.abs(dy) + ' px ' + (dy < 0 ? 'above' : dy > 0 ? 'below' : 'at') + ' its middle');
  const row = await p.evaluate(() => Math.round(document.querySelector('#cut-band .cut-row').getBoundingClientRect().height));
  ok(row <= 60, 'the cut-off bar\'s row is no taller for it (' + row + ' px)');
  ok(!p.errors.length, 'Prep: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // SYST-1: a round's Undo on the older Sent tick, and Send all, on the function's card
  p = await open(b, '#/fn/smith', 390, 844);
  await L.waitFor(p, () => !!document.querySelector('[data-fn="unsent"]'), null, 10000).catch(() => {});
  const undo = (await size(p, '[data-fn="unsent"]'))[0] || [0, 0];
  ok(undo[1] >= 44, 'a sent round\'s Undo is 44 px (' + undo[1] + ')');
  await p.context().close();
  p = await open(b, '#/fn/jones', 390, 844);
  await L.waitFor(p, () => !!document.querySelector('.fn-sent-b'), null, 10000).catch(() => {});
  const send = (await size(p, '.fn-sent-b'))[0] || [0, 0];
  ok(send[1] >= 44, 'a round\'s Send button is 44 px (' + send[1] + ')');
  await p.context().close();

  // ORDE-3: Remove before the ⋯ on Orders, from 720 px where both show
  p = await open(b, '#/orders', 1280, 900);
  await L.waitFor(p, () => !!document.querySelector('.nb-row [data-p="odel"]'), null, 10000).catch(() => {});
  const order = await p.evaluate(() => {
    const r = document.querySelector('.nb-row [data-p="odel"]').closest('.nb-row'), del = r.querySelector('[data-p="odel"]'), more = r.querySelector('.nb-more');
    return more ? Math.round(more.getBoundingClientRect().left - del.getBoundingClientRect().right) : 'no menu';
  });
  ok(typeof order === 'number' && order >= 0, 'Orders: Remove comes before the ⋯, as on Prep (' + order + ')');
  await p.context().close();

  // ORDE-1: Save delivery on the first phone screen with both bands
  p = await open(b, '#/deliveries', 390, 844);
  await L.waitFor(p, () => !!document.querySelector('[data-dl="save"]') && !!document.querySelector('.fn-band:not([hidden])') && !!document.querySelector('#cut-band:not([hidden])'), null, 10000).catch(() => {});
  const save = await p.evaluate(() => {
    const s = document.querySelector('[data-dl="save"]').getBoundingClientRect(), tab = document.querySelector('.tabbar').getBoundingClientRect();
    return { bottom: Math.round(s.bottom), tab: Math.round(tab.top) };
  });
  ok(save.bottom <= save.tab, 'phone: Save delivery is above the tab bar on the first screen (ends ' + save.bottom + ', tab bar ' + save.tab + ')');
  ok(await hitAt(p, '[data-dl="save"]', 0) === 'yes', 'phone: nothing covers Save delivery');
  // typing the reading keeps Save in reach, and scrolled to the end the records are not under it
  await p.evaluate(() => { window.scrollTo(0, document.documentElement.scrollHeight); });
  await L.settle(p, 200);
  const clear = await p.evaluate(() => {
    const s = (document.querySelector('.dl-dock') || document.querySelector('.dl-actions')).getBoundingClientRect(), h = document.querySelector('.dl-history-head').getBoundingClientRect();
    return h.bottom <= window.innerHeight ? (s.bottom <= h.top + 1 ? 'yes' : 'covers the records') : 'yes';
  });
  ok(clear === 'yes', 'phone: scrolled down, the Save row stays with the form, not over the records (' + clear + ')');
  ok(!p.errors.length, 'Delivery received: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  // a laptop: the form fits, so Save stays where it was, in the form
  p = await open(b, '#/deliveries', 1280, 900);
  await L.waitFor(p, () => !!document.querySelector('[data-dl="save"]'), null, 10000).catch(() => {});
  ok(await p.evaluate(() => { const d = document.querySelector('.dl-dock'); return !!d && getComputedStyle(d).position === 'static'; }), 'laptop: Save delivery stays in the form');
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
