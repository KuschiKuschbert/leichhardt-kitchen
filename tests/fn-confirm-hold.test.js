// A second tap does not confirm the next trip (head chef, 26 Nov 2026, docs/foh-layout-options/brief.md, break-it,
// "Yes, fix it"). Before: once Fay's Confirm out reached the server, the trip left the shelf and the next trip's Confirm
// out slid into the same spot, so a second tap there marked the wrong trip out (reproduced on the stand-in). Now the trip
// she confirmed holds its place a moment, says it is out, with no button, then goes; the next trip's button is where it
// always was. The same on her band row. Synthetic people and bookings on the click-test stand-in.
const L = require('./lib'), M = require('../js/functions.js');
const { R, ok } = L.results();
const K = (...p) => ['kitchens', L.PIN, ...p].join('/'), today = L.ymd(new Date(L.NOW)), at = (d, hm) => M.kat(d, M.hmMin(hm));
const P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true });
function fn(o) {
  const date = o.date || today, rounds = (o.rounds || ['18:30']).map(x => ({ at: at(date, x), note: '' }));
  return M.derive({ v: 1, status: 'confirmed', name: o.name, date, start: at(date, o.start || '13:30'), loc: o.loc || 'Function room', guests: o.guests || 40,
    mode: rounds.length > 1 ? 'stag' : 'all', notes: o.notes || '', kc: '', kcBy: '', kcAt: 0, rounds,
    lines: (o.lines || [['antipasto-platter', 'Antipasto Platter', [3]]]).map(([rid, name, a]) => ({ rid, name, unit: 'platter', spec: '', fp: '', qty: a.reduce((s, x) => s + x, 0), u: M.toU(a) })),
    was: {}, chg: [], cBy: 'bo', cAt: 1, confBy: 'bo', confAt: 1, by: 'bo', upd: L.NOW - 3600000 });
}
const base = L.seed(), cfgKey = K('config', 'main');
function data() {
  const x = { [cfgKey]: Object.assign({}, base[cfgKey], {
    people: [P('bo', 'Bo', 'head'), P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'staff'), P('fay', 'Fay', 'staff')], headId: 'bo', sousIds: ['bo', 'sam'], pingIds: ['bo', 'sam'],
    staffIds: ['bo', 'sam', 'ann', 'fay'], fnIds: ['fay'], fnOnlyIds: ['fay'], showBadges: true }), [K('pinset', 'fay')]: { at: 1 } };
  x[K('functions', 'b60')] = fn({ name: 'Birthday 60th', start: '13:45', rounds: ['14:10', '14:50', '15:30'], notes: '3 gluten free.',
    lines: [['antipasto-platter', 'Antipasto Platter', [2, 1, 0]], ['pizza-platter', 'Pizza Platter', [2, 2, 1]]] });
  x[K('functions', 'club')] = fn({ name: 'Club lunch', start: '12:00', rounds: ['14:30'], guests: 25, loc: 'Beer garden', lines: [['antipasto-platter', 'Antipasto Platter', [4]]] });
  const r1 = at(today, '14:10'), rc = at(today, '14:30');
  x[K('fnsent', 'b60_' + r1 + '_t1')] = { fid: 'b60', at: r1, day: today, k: 1, n: { 'antipasto-platter': 1, 'pizza-platter': 1 }, sentAt: L.NOW - 360000, sentBy: 'sam', by: 'sam' };
  x[K('fnsent', 'b60_' + r1 + '_t2')] = { fid: 'b60', at: r1, day: today, k: 2, n: { 'antipasto-platter': 1, 'pizza-platter': 1 }, sentAt: L.NOW - 240000, sentBy: 'sam', by: 'sam' };
  x[K('fnsent', 'club_' + rc + '_t1')] = { fid: 'club', at: rc, day: today, k: 1, n: { 'antipasto-platter': 4 }, sentAt: L.NOW - 60000, sentBy: 'ann', by: 'ann' };
  return x;
}
const open = (b, hash, w, h) => L.open(b, hash, { who: 'fay', deviceMode: 'shared', width: w, height: h, touch: true, extra: data(), wait: 2000 });
// what is under a spot: the button's action and its trip (or what else is there)
const under = (p, x, y) => p.evaluate(([x, y]) => { const a = document.elementFromPoint(x, y), b = a && a.closest('[data-fn]'); return b ? b.getAttribute('data-fn') + ':' + (b.getAttribute('data-id') || '') : a ? a.tagName.toLowerCase() : 'nothing'; }, [x, y]);
const centre = (p, sel) => p.$eval(sel, e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, id: e.getAttribute('data-id') }; });
const outAt = (p, id) => p.evaluate(id => { const d = window.__fake.dump ? window.__fake.dump() : null; const k = d && Object.keys(d).find(x => x.endsWith('/fnsent/' + id)); return k ? d[k].outAt || 0 : -1; }, id);

(async () => {
  const b = await L.start();
  // 1. the service view, at 1920 and on a phone
  for (const [w, h] of [[1920, 1008], [390, 844]]) {
    const p = await open(b, '#/fn/now', w, h);
    await L.waitFor(p, () => document.querySelectorAll('.fn-svc-trip [data-fn="trip-out"]').length === 3, null, 8000).catch(() => {});
    const c = await centre(p, '.fn-svc-trip [data-fn="trip-out"]'), second = await p.$$eval('.fn-svc-trip [data-fn="trip-out"]', e => e[1].getAttribute('data-id'));
    await p.mouse.click(c.x, c.y);
    await L.waitFor(p, id => !!document.querySelector('.fn-svc-trip') && ![...document.querySelectorAll('.fn-svc-trip [data-fn="trip-out"]')].some(e => e.getAttribute('data-id') === id) &&
      !/Confirming out/.test(document.querySelector('.fn-svc-shelf').textContent), c.id, 5000).catch(() => {});
    await L.settle(p, 300);
    const held = await p.evaluate(() => { const t = document.querySelector('.fn-svc-trip'); return { n: document.querySelectorAll('.fn-svc-trip').length, out: /out \d\d:\d\d, Fay/.test(t.textContent), btn: !!t.querySelector('[data-fn]') }; });
    const at1 = await under(p, c.x, c.y);
    ok(held.n === 3 && held.out && !held.btn && !/^(trip-out|open)/.test(at1), w + ': the confirmed trip holds its place, says out with the time and Fay, no button; under the finger: ' + at1 + ' (' + JSON.stringify(held) + ')');
    // a second tap at the same spot, while it holds: nothing else is confirmed
    await p.mouse.click(c.x, c.y); await L.settle(p, 400);
    ok(await outAt(p, second) === 0 || !(await outAt(p, second)), w + ': a second tap at the same spot confirms nothing else (trip 2 still waiting)');
    // then it goes, and the next trip's Confirm out is there to tap on purpose
    await L.waitFor(p, () => document.querySelectorAll('.fn-svc-trip').length === 2, null, 6000).catch(() => {});
    const after = await p.evaluate(() => ({ n: document.querySelectorAll('.fn-svc-trip').length, outs: document.querySelectorAll('.fn-svc-trip [data-fn="trip-out"]').length, line: /Out today: 1 trip/.test(document.querySelector('.fn-svc-shelf').textContent) }));
    ok(after.n === 2 && after.outs === 2 && after.line, w + ': after a moment it goes, Out today says 1 trip, the other two wait with their buttons (' + JSON.stringify(after) + ')');
    ok(!p.errors.length && !(await L.overflow(p)), w + ': no page errors, no sideways scroll ' + p.errors.join(' | '));
    await p.context().close();
  }
  // 2. the band on #/fn: the 60th's row holds trip 1, out, with no button, then shows trip 2 with its Confirm out
  const p = await open(b, '#/fn', 1920, 1008);
  await L.waitFor(p, () => !!document.querySelector('#fn-band [data-fn="trip-out"]'), null, 8000).catch(() => {});
  const row = () => p.evaluate(() => { const r = [...document.querySelectorAll('#fn-band .fn-li-out')].find(e => /Birthday 60th/.test(e.textContent));
    return r ? { text: r.textContent.replace(/\s+/g, ' ').trim(), btn: (r.querySelector('[data-fn="trip-out"]') || {}).getAttribute ? r.querySelector('[data-fn="trip-out"]').getAttribute('data-id') : '' } : null; });
  const r0 = await row(), c = await centre(p, '#fn-band .fn-li-out [data-fn="trip-out"]');
  await p.mouse.click(c.x, c.y);
  await L.waitFor(p, () => { const r = [...document.querySelectorAll('#fn-band .fn-li-out')].find(e => /Birthday 60th/.test(e.textContent)); return !!r && /out \d\d:\d\d, Fay/.test(r.textContent); }, null, 5000).catch(() => {});
  const r1 = await row(), u = await under(p, c.x, c.y);
  ok(!!r0 && /^Trip 1|Trip 1:/.test(r0.text) && !!r1 && /Trip 1:.*out \d\d:\d\d, Fay/.test(r1.text) && /\+1 more waiting/.test(r1.text) && !r1.btn && !/^(trip-out|open)/.test(u) && await p.$eval('#fn-band .fn-out-slot', e => getComputedStyle(e).visibility === 'hidden' && !/undefined/.test(e.innerHTML)),
    'band: the row holds trip 1, out, +1 more waiting, its button\'s room kept and empty, so a second tap opens nothing; under the finger: ' + u + ' (' + JSON.stringify(r1) + ')');
  await L.waitFor(p, () => { const r = [...document.querySelectorAll('#fn-band .fn-li-out')].find(e => /Birthday 60th/.test(e.textContent)); return !!r && /Trip 2:/.test(r.textContent); }, null, 6000).catch(() => {});
  const r2 = await row();
  ok(!!r2 && /Trip 2:/.test(r2.text) && !!r2.btn, 'band: after a moment the row shows trip 2 with its Confirm out (' + JSON.stringify(r2) + ')');
  ok(!p.errors.length, 'band: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
