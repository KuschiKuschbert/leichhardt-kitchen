// Functions on the front of house screen: the booking form in two columns, the waiting trips side by side (head chef,
// 26 Nov 2026, docs/foh-layout-options/brief.md, the mix chosen after the council's round 2).
// 1. The form: from 1150 px The function, the notes and the kitchen comment on the left, Platters and When the platters go
//    out on the right, in the page's own order; one column at 1149 and on a phone. The Save bar stays after the comment
//    for a saved, a new and a draft function (the keeper's check: a layout that pinned sections to rows put it under the
//    heading). Every section keeps its line under it inside its wrapper, phones too.
// 2. The service view: from 1100 px the trips waiting for Fay sit side by side, every Confirm out and the next round's
//    countdown in view as the page opens at 1920; stacked at 1099. The kitchen's view (Sam) keeps its shelf beside the
//    rounds. A confirm held with no signal keeps its card, says Not sent yet and offers no second button.
// Synthetic people and bookings on the click-test stand-in.
const L = require('./lib'), M = require('../js/functions.js');
const { R, ok } = L.results();
const K = (...p) => ['kitchens', L.PIN, ...p].join('/'), today = L.ymd(new Date(L.NOW)), at = (d, hm) => M.kat(d, M.hmMin(hm));
const P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true });
function fn(o) {
  const date = o.date || today, rounds = (o.rounds || ['18:30']).map(x => ({ at: at(date, x), note: '' }));
  return M.derive({ v: 1, status: o.status || 'confirmed', name: o.name, date, start: at(date, o.start || '13:30'), loc: o.loc || 'Function room', guests: o.guests || 40,
    mode: rounds.length > 1 ? 'stag' : 'all', notes: o.notes || '', kc: '', kcBy: '', kcAt: 0, rounds,
    lines: (o.lines || [['antipasto-platter', 'Antipasto Platter', [3]]]).map(([rid, name, a]) => ({ rid, name, unit: 'platter', spec: '', fp: '', qty: a.reduce((s, x) => s + x, 0), u: M.toU(a) })),
    was: {}, chg: [], cBy: 'bo', cAt: 1, confBy: o.status === 'draft' ? '' : 'bo', confAt: o.status === 'draft' ? 0 : 1, by: 'bo', upd: L.NOW - 3600000 });
}
const base = L.seed(), cfgKey = K('config', 'main');
function data() {
  const x = { [cfgKey]: Object.assign({}, base[cfgKey], {
    people: [P('bo', 'Bo', 'head'), P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'staff'), P('fay', 'Fay', 'staff')], headId: 'bo', sousIds: ['bo', 'sam'], pingIds: ['bo', 'sam'],
    staffIds: ['bo', 'sam', 'ann', 'fay'], fnIds: ['fay'], fnOnlyIds: ['fay'], showBadges: true }), [K('pinset', 'fay')]: { at: 1 } };
  x[K('functions', 'b60')] = fn({ name: 'Birthday 60th', start: '13:45', rounds: ['14:10', '14:50', '15:30'], notes: '3 gluten free, 1 vegan. Nut allergy at table 4.',
    lines: [['antipasto-platter', 'Antipasto Platter', [2, 1, 0]], ['pizza-platter', 'Pizza Platter', [2, 2, 1]]] });
  x[K('functions', 'club')] = fn({ name: 'Club lunch', start: '12:00', rounds: ['14:30'], guests: 25, loc: 'Beer garden', lines: [['antipasto-platter', 'Antipasto Platter', [4]]] });
  x[K('functions', 'quiz')] = fn({ name: 'Quiz night', status: 'draft', date: M.addDays(today, 3), start: '18:00', rounds: ['19:00'], guests: 30 });
  const r1 = at(today, '14:10'), rc = at(today, '14:30');
  x[K('fnsent', 'b60_' + r1 + '_t1')] = { fid: 'b60', at: r1, day: today, k: 1, n: { 'antipasto-platter': 1, 'pizza-platter': 1 }, sentAt: L.NOW - 360000, sentBy: 'sam', by: 'sam' };
  x[K('fnsent', 'b60_' + r1 + '_t2')] = { fid: 'b60', at: r1, day: today, k: 2, n: { 'antipasto-platter': 1, 'pizza-platter': 1 }, sentAt: L.NOW - 240000, sentBy: 'sam', by: 'sam' };
  x[K('fnsent', 'club_' + rc + '_t1')] = { fid: 'club', at: rc, day: today, k: 1, n: { 'antipasto-platter': 4 }, sentAt: L.NOW - 60000, sentBy: 'ann', by: 'ann' };
  return x;
}
const open = (b, hash, w, h, o = {}) => L.open(b, hash, Object.assign({ who: 'fay', deviceMode: 'shared', width: w, height: h, touch: false, extra: data(), wait: 2000 }, o));
// where the form's pieces sit: The function, Platters, When, the notes, the comment and the Save bar (held in the flow
// for the order), and the line under When and the comment
const form = p => p.evaluate(() => {
  const sec = t => [...document.querySelectorAll('#fe-root .set-block')].find(t), r = e => e && e.getBoundingClientRect();
  const fn = sec(e => e.querySelector('#fe-name')), pl = sec(e => e.querySelector('.fe-lines')), wh = sec(e => e.querySelector('.fe-mode')),
    no = sec(e => e.querySelector('#fe-notes')), kc = sec(e => e.matches('.fe-kcb')), bar = document.querySelector('.fe-bar');
  if (!fn || !pl || !wh || !no || !kc || !bar) return null;
  const was = bar.style.position; bar.style.position = 'static'; const b = r(bar); bar.style.position = was;
  const line = e => getComputedStyle(e).borderBottomWidth;
  return { fnL: Math.round(r(fn).left), fnR: Math.round(r(fn).right), fnT: Math.round(r(fn).top), fnB: Math.round(r(fn).bottom), plL: Math.round(r(pl).left), plT: Math.round(r(pl).top),
    whB: Math.round(r(wh).bottom), noL: Math.round(r(no).left), noT: Math.round(r(no).top), kcB: Math.round(r(kc).bottom), barT: Math.round(b.top), lines: line(wh) + ' ' + line(kc),
    order: [...document.querySelectorAll('#fe-root .set-block, #fe-root .fe-bar')].map(e => e === fn ? 'function' : e === pl ? 'platters' : e === wh ? 'when' : e === no ? 'notes' : e === kc ? 'comment' : e === bar ? 'bar' : '').filter(Boolean).join(',') };
});
const twoCols = f => !!f && f.plL > f.fnR && Math.abs(f.plT - f.fnT) <= 2 && f.noL === f.fnL && f.noT > f.fnB && f.barT >= Math.max(f.whB, f.kcB);
const oneCol = f => !!f && f.plL === f.fnL && f.plT > f.fnB && f.barT >= f.kcB;
const PAGE = 'function,platters,when,notes,comment,bar';

(async () => {
  const b = await L.start();
  // 1. the form at 1920 and 1280: two columns, page order, the bar last, every line kept
  for (const [w, h] of [[1920, 1008], [1280, 800]]) {
    const p = await open(b, '#/functions/b60', w, h);
    await L.waitFor(p, () => !!document.querySelector('.fe-bar'), null, 8000).catch(() => {}); await L.settle(p, 300);
    const f = await form(p);
    ok(twoCols(f) && f.order === PAGE && f.lines === '1px 1px', w + ': the form in two columns, in page order, the Save bar after the comment, each section keeps its line (' + JSON.stringify(f) + ')');
    ok(!p.errors.length && !(await L.overflow(p)), w + ': no page errors, no sideways scroll ' + p.errors.join(' | '));
    await p.context().close();
  }
  // the breakpoint: one column at 1149, two at 1150
  let p = await open(b, '#/functions/b60', 1149, 800);
  await L.waitFor(p, () => !!document.querySelector('.fe-bar'), null, 8000).catch(() => {}); await L.settle(p, 300);
  let f = await form(p);
  ok(oneCol(f) && f.order === PAGE, '1149: one column, as before (' + JSON.stringify(f) + ')');
  await p.setViewportSize({ width: 1150, height: 800 }); await L.settle(p, 300);
  f = await form(p);
  ok(twoCols(f) && !(await L.overflow(p)), '1150: two columns, no sideways scroll (' + JSON.stringify(f) + ')');
  await p.context().close();
  // a phone: one column, and When and the comment keep their line inside the wrappers
  p = await open(b, '#/functions/b60', 390, 844, { touch: true });
  await L.waitFor(p, () => !!document.querySelector('.fe-bar'), null, 8000).catch(() => {}); await L.settle(p, 300);
  f = await form(p);
  ok(oneCol(f) && f.lines === '1px 1px' && !(await L.overflow(p)), '390: one column, each section keeps its line (' + JSON.stringify(f) + ')');
  await p.context().close();
  // a new function and a draft one: the bar stays after the comment (Check and confirm on the draft)
  p = await open(b, '#/functions/new', 1280, 800);
  await L.waitFor(p, () => !!document.querySelector('.fe-bar'), null, 8000).catch(() => {}); await L.settle(p, 300);
  f = await form(p);
  ok(twoCols(f) && f.order === PAGE, '1280, a new function: two columns, the Save bar after the comment (' + JSON.stringify(f) + ')');
  await p.context().close();
  p = await open(b, '#/functions/quiz', 1280, 800);
  await L.waitFor(p, () => !!document.querySelector('.fe-bar [data-fe="review"]'), null, 8000).catch(() => {}); await L.settle(p, 300);
  f = await form(p);
  ok(twoCols(f) && f.order === PAGE && !!(await p.$('.fe-bar [data-fe="review"]')), '1280, a draft: two columns, Check and confirm in the bar after the comment (' + JSON.stringify(f) + ')');
  // the review step draws its own page: no columns, no errors
  await p.click('.fe-bar [data-fe="review"]'); await L.waitFor(p, () => !!document.querySelector('.fe-review'), null, 5000).catch(() => {}); await L.settle(p, 300);
  ok(!!(await p.$('.fe-review')) && !(await p.$('.fe-body')) && !p.errors.length && !(await L.overflow(p)), '1280, Check and confirm: the review step, no errors, no sideways scroll ' + p.errors.join(' | '));
  await p.context().close();

  // 2. the service view: Fay's waiting trips side by side from 1100 px
  const svc = p => p.evaluate(() => {
    const t = [...document.querySelectorAll('.fn-svc-trip')].map(e => e.getBoundingClientRect()), o = [...document.querySelectorAll('.fn-svc-trip [data-fn="trip-out"]')];
    const cd = document.querySelector('.fn-svc-sec .fn-svc-row .fn-svc-cd'), c = cd && cd.getBoundingClientRect(), vh = innerHeight;
    return { trips: t.length, sameRow: t.length > 1 && t.every(r => Math.abs(r.top - t[0].top) < 2), firstTwo: t.length > 1 && Math.abs(t[1].top - t[0].top) < 2, stacked: t.length > 1 && t.every((r, i) => !i || r.top >= t[i - 1].bottom - 1),
      allOut: o.length === t.length && o.every(e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= vh; }), next: !!c && c.top >= 0 && c.bottom <= vh };
  });
  p = await open(b, '#/fn/now', 1920, 1008, { touch: true });
  await L.waitFor(p, () => document.querySelectorAll('.fn-svc-trip').length === 3, null, 8000).catch(() => {}); await L.settle(p, 300);
  let s = await svc(p);
  ok(s.trips === 3 && s.sameRow && s.allOut && s.next, '1920: the three trips side by side, every Confirm out and the next countdown in view (' + JSON.stringify(s) + ')');
  ok(!p.errors.length && !(await L.overflow(p)), '1920 service view: no page errors, no sideways scroll ' + p.errors.join(' | '));
  await p.setViewportSize({ width: 1099, height: 900 }); await L.settle(p, 300); s = await svc(p);
  ok(s.stacked && !s.sameRow, '1099: the trips stacked, as before (' + JSON.stringify(s) + ')');
  await p.setViewportSize({ width: 1100, height: 900 }); await L.settle(p, 300); s = await svc(p);
  ok(s.firstTwo && !(await L.overflow(p)), '1100: side by side, two to a row there, no sideways scroll (' + JSON.stringify(s) + ')');
  // with no signal a confirm waits: the card keeps its place, says Confirming out..., and offers no second Confirm out
  await p.setViewportSize({ width: 1920, height: 1008 }); await L.settle(p, 300);
  await p.evaluate(() => { window.__fake.mode = 'hold'; });
  const first = await p.$eval('.fn-svc-trip [data-fn="trip-out"]', e => e.getAttribute('data-id'));
  await p.click('.fn-svc-trip [data-fn="trip-out"]'); await L.settle(p, 500);
  const held = await p.evaluate(() => { const c = [...document.querySelectorAll('.fn-svc-trip')], w = c.filter(e => /Confirming out/.test(e.textContent));
    return { n: c.length, first: c.indexOf(w[0]), pend: w.length, btn: w.some(e => !!e.querySelector('[data-fn="trip-out"]')), others: c.filter(e => e.querySelector('[data-fn="trip-out"]')).length }; });
  ok(held.n === 3 && held.first === 0 && held.pend === 1 && !held.btn && held.others === 2, 'held confirm: the card keeps its place, says Confirming out..., no second button on it (' + JSON.stringify(held) + ', ' + first + ')');
  await p.context().close();
  // the kitchen's view (Sam sent the trips): the shelf beside the rounds, its trips stacked, as before
  p = await open(b, '#/fn/now', 1920, 1008, { who: 'sam', touch: true });
  await L.waitFor(p, () => document.querySelectorAll('.fn-svc-trip').length === 3, null, 8000).catch(() => {}); await L.settle(p, 300);
  const k = await p.evaluate(() => { const sh = document.querySelector('.fn-svc-shelf').getBoundingClientRect(), rows = document.querySelector('.fn-svc-rows').getBoundingClientRect(); return { beside: sh.left > rows.right, sec: !!document.querySelector('.fn-svc-sec') }; });
  s = await svc(p);
  ok(k.beside && !k.sec && s.stacked, 'the kitchen at 1920: its shelf beside the rounds, trips stacked, as before (' + JSON.stringify(Object.assign(k, s)) + ')');
  await p.context().close();
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
