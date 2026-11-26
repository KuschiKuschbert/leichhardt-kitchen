// Functions on the front of house screen (head chef, 26 Nov 2026, docs/device-coverage/step3/findings.md, Chosen).
// Fay works front of house: Functions only, with the Functions tick, on a shared 1920 x 1008 screen. The kitchen has sent
// the Birthday 60th's first round and it waits for her to confirm it out.
// 1. Confirm out can't hide: with a warning up (a trip waiting for her) the band's minus is off on every page, and a
//    minus saved earlier the same day does not fold it. 2. The trip being confirmed shows the dietaries. 3. #/fn says it
//    once: a card names the trip waiting, a one-round card does not repeat its time and platters, "Up to date" sits on
//    the Today line, and the band leaves out its second Service view. 4. A function's page puts its notes first.
// 5. 44 px taps on the Tomorrow row, Home's Open functions and the service board's function names.
// Synthetic people and bookings on the click-test stand-in.
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
function data(o = {}) {
  const x = { [cfgKey]: Object.assign({}, base[cfgKey], {
    people: [P('bo', 'Bo', 'head'), P('sam', 'Sam', 'sous'), P('fay', 'Fay', 'staff')], headId: 'bo', sousIds: ['bo', 'sam'], pingIds: ['bo', 'sam'],
    staffIds: ['bo', 'sam', 'fay'], fnIds: ['fay'], fnOnlyIds: ['fay'], showBadges: true }), [K('pinset', 'fay')]: { at: 1 } };
  x[K('functions', 'b60')] = fn({ name: 'Birthday 60th', start: '13:45', rounds: ['14:10', '14:50', '15:30'], notes: '3 gluten free. Nut allergy at table 4.',
    lines: [['antipasto-platter', 'Antipasto Platter', [2, 1, 0]], ['pizza-platter', 'Pizza Platter', [2, 2, 1]]] });
  x[K('functions', 'club')] = fn({ name: 'Club lunch', start: '12:00', rounds: ['15:30'], guests: 25, loc: 'Beer garden', lines: [['antipasto-platter', 'Antipasto Platter', [4]]] });
  x[K('functions', 'wed')] = fn({ name: 'Wedding reception', date: M.addDays(today, 1), start: '17:30', rounds: ['18:30'], guests: 80 });
  x[K('functions', 'quiz')] = fn({ name: 'Quiz night', date: M.addDays(today, 3), start: '18:00', rounds: ['19:00'], guests: 30 });   // past the band: Home lists it
  if (o.trip !== false) { const r1 = at(today, '14:10'); x[K('fnsent', 'b60_' + r1 + '_t1')] = { fid: 'b60', at: r1, day: today, k: 1, n: { 'antipasto-platter': 2, 'pizza-platter': 2 }, sentAt: L.NOW - 300000, sentBy: 'sam', by: 'sam' }; }
  return x;
}
const open = (b, hash, o = {}) => L.open(b, hash, Object.assign({ who: 'fay', deviceMode: 'shared', width: 1920, height: 1008, touch: true, extra: data(o), wait: 2000 }, o.init ? { init: o.init } : {}));
const confirmOut = p => p.evaluate(() => !!document.querySelector('#fn-band [data-fn="trip-out"]'));
// the tap area in px, up and down through the middle of an element (a tap within it lands on it)
const tapH = (p, sel, text) => p.evaluate(([sel, text]) => {
  const e = [...document.querySelectorAll(sel)].find(x => x.getClientRects().length && (!text || new RegExp(text).test(x.textContent))); if (!e) return 0;
  const r = e.getBoundingClientRect(), cx = r.left + Math.min(r.width / 2, 20), cy = r.top + r.height / 2;
  const hit = y => { const a = document.elementFromPoint(cx, y); return !!a && (a === e || e.contains(a)); };
  let up = 0, dn = 0; while (up < 40 && hit(cy - up - 1)) up++; while (dn < 40 && hit(cy + dn + 1)) dn++;
  return up + dn + 1;
}, [sel, text || '']);

(async () => {
  const b = await L.start();
  // 1. Confirm out can't hide: the minus is off while the trip waits, on Home, #/fn and a function's page
  for (const hash of ['#/fn', '#/', '#/fn/b60']) {
    const p = await open(b, hash);
    await L.waitFor(p, () => !!document.querySelector('#fn-band [data-fn="trip-out"]'), null, 8000).catch(() => {});
    const minus = await p.evaluate(() => { const f = document.querySelector('#fn-band [data-fn="fold"]'); return f ? f.getAttribute('aria-disabled') + '|' + f.getAttribute('aria-label') : 'none'; });
    await p.evaluate(() => { const f = document.querySelector('#fn-band [data-fn="fold"]'); if (f) f.click(); }); await L.settle(p, 500);
    ok(minus === 'true|Function alerts are shown' && await confirmOut(p) && await p.evaluate(() => localStorage.getItem('lk.fn.fold')) === null,
      hash + ': with a trip waiting the minus is off, a tap on it folds nothing, Confirm out stays (' + minus + ')');
    ok(!p.errors.length && !(await L.overflow(p)), hash + ': no page errors, no sideways scroll ' + p.errors.join(' | '));
    await p.context().close();
  }
  // a minus saved earlier today (before the trip was sent) does not hide the trip either
  let p = await open(b, '#/fn', { init: "localStorage.setItem('lk.fn.fold', new Date(Date.now() + 10 * 3600000 - 4 * 3600000).toISOString().slice(0, 10))" });
  await L.waitFor(p, () => !!document.querySelector('#fn-band'), null, 8000).catch(() => {}); await L.settle(p, 600);
  ok(await confirmOut(p) && !(await p.$('#fn-band .is-fold')), '#/fn: a band folded earlier today opens while a trip waits, Confirm out in view');

  // 3. #/fn says it once
  const card = n => p.evaluate(n => { const c = [...document.querySelectorAll('.fn-list-page .fn-card')].find(x => x.querySelector('.fn-c1 b').textContent === n); return c ? {
    wait: (c.querySelector('.fn-cwait') || {}).textContent || '', next: !!c.querySelector('.fn-cnext:not(.fn-cwait)'), food: !!c.querySelector('.fn-c2'), plat: !!c.querySelector('.fn-c3') } : null; }, n);
  const b60 = await card('Birthday 60th'), club = await card('Club lunch');
  ok(!!b60 && /^Waiting Trip 1: 2 × Antipasto, 2 × Pizza, sent 13:55 Sam/.test(b60.wait.replace(/\s+/g, ' ').trim()) && b60.next && b60.food && b60.plat, '#/fn: the 60th\'s card names the trip waiting, then Next out, with its three rounds\' lines (' + JSON.stringify(b60) + ')');
  ok(!!club && !club.wait && club.next && !club.food && !club.plat, '#/fn: a one-round card says its time and platters once, in Next out (' + JSON.stringify(club) + ')');
  const fresh = await p.evaluate(() => { const e = document.querySelector('#main .fn-fresh'); return e ? { today: !!e.closest('.fn-sec-h') && /^Today/.test(e.closest('.fn-sec-h').textContent.trim()), words: e.textContent } : null; });
  ok(!!fresh && fresh.today && /^Up to date, \d\d:\d\d\./.test(fresh.words), '#/fn: Up to date sits on the Today heading line (' + JSON.stringify(fresh) + ')');
  ok(!(await p.$('#fn-band a.fn-svc')) && !!(await p.$('.fn-list-page a[href="#/fn/now"]')), '#/fn: the band leaves out its Service view; the page keeps its own');
  ok(!p.errors.length && !(await L.overflow(p)), '#/fn: no page errors, no sideways scroll ' + p.errors.join(' | '));
  // 5. the Tomorrow row in the band takes a 44 px tap
  const tom = await tapH(p, '#fn-band .fn-row.is-soon');
  ok(tom >= 44, 'band: the Tomorrow row takes a 44 px tap (' + tom + ')');
  await p.context().close();

  // 2. the service view: the trip waiting for Fay shows the dietaries, before Confirm out; the names take a 44 px tap
  p = await open(b, '#/fn/now');
  await L.waitFor(p, () => !!document.querySelector('.fn-svc-trip'), null, 8000).catch(() => {});
  const trip = await p.evaluate(() => { const t = document.querySelector('.fn-svc-trip'), d = t && t.querySelector('.fn-svc-diet'), o = t && t.querySelector('[data-fn="trip-out"]');
    return { diet: d ? d.textContent.replace(/\s+/g, ' ').trim() : '', before: !!(d && o && (d.compareDocumentPosition(o) & Node.DOCUMENT_POSITION_FOLLOWING)) }; });
  ok(/^Dietaries and notes ?3 gluten free\. Nut allergy at table 4\.$/.test(trip.diet) && trip.before, 'service view: the trip waiting shows its dietaries, above Confirm out (' + JSON.stringify(trip) + ')');
  const nameTap = await tapH(p, '.fn-svc-board .fn-svc-name');
  ok(nameTap >= 44, 'service view: a function\'s name on the board takes a 44 px tap (' + nameTap + ')');
  ok(!p.errors.length && !(await L.overflow(p)), 'service view: no page errors, no sideways scroll ' + p.errors.join(' | '));
  await p.context().close();

  // 4. a function's page: the notes straight under the day line, before Next out
  p = await open(b, '#/fn/b60');
  await L.waitFor(p, () => !!document.querySelector('.fn-one .fn-sub'), null, 8000).catch(() => {});
  const order = await p.evaluate(() => [...document.querySelectorAll('.fn-one .fn-cardbox > *')].map(e => e.matches('.fn-sub') ? 'day' : /Service and dietary notes/.test(e.textContent) && e.matches('h3') ? 'notes' : e.matches('.fn-next') ? 'next' : '').filter(Boolean).slice(0, 3).join(','));
  ok(order === 'day,notes,next', 'function page: the day line, then the notes, then Next out (' + order + ')');
  await p.context().close();

  // 5. Home: Open functions (under the Coming up card) takes a 44 px tap
  p = await open(b, '#/');
  await L.waitFor(p, () => !!document.querySelector('.fn-land-go'), null, 8000).catch(() => {});
  const go = await tapH(p, '.fn-land-go');
  ok(go >= 44, 'Home: Open functions takes a 44 px tap (' + go + ')');
  ok(!p.errors.length, 'Home: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
