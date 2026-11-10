// Functions ahead of time, step 3 (head chef, 10 Nov 2026, docs/function-ahead-options/brief.md, Chosen): a confirmed
// function's own stock line on today's order list says Order today on its order day and Not ordered yet after it, with
// "For <day> · order day was <day>" under its words, until someone ticks it. It comes from the functions every phone
// already holds: no read, no write. A function not held (not loaded, removed, cancelled, past) gives no tag, and the
// Changed and Cancelled lines get none. A ticked line keeps the tag's room, empty, so the tick moves no row. The tag is
// drawn with its row: a booking edit or lk-who draws nothing. All people and functions here are made up.
const L = require('./lib'), M = require('../js/functions.js');
const { R, ok } = L.results();
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW)), at = (d, hm) => M.kat(d, M.hmMin(hm)), plus = n => M.addDays(today, n);
const rid = id => 'r' + today.replace(/-/g, '') + '-' + id;
const cfg = {
  people: [
    { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true, fn: false },
    { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true, fn: false },
    { id: 'bo', name: 'Bo', role: 'head', add: true, tick: true, del: true, active: true, fn: false }
  ], headId: 'bo', sousIds: ['sam', 'bo'], pingIds: ['sam', 'bo'], fnIds: [], staffIds: ['sam', 'ann', 'bo'], showBadges: true
};
function fn(o) {
  const date = o.date, rounds = (o.rounds || ['18:30']).map(x => ({ at: at(date, x), note: '' }));
  return M.derive(Object.assign({ v: 1, status: 'confirmed', name: o.name, date, start: at(date, o.start || '17:30'), loc: 'Function room', guests: o.guests || 40,
    mode: rounds.length > 1 ? 'stag' : 'all', notes: '', kc: '', kcBy: '', kcAt: 0, rounds, od: o.od,
    lines: [{ rid: 'antipasto-platter', name: 'Antipasto Platter', unit: 'platter', spec: '', fp: '', qty: 6, u: M.toU([6]) }],
    was: {}, chg: [], cBy: 'bo', cAt: 1, confBy: 'bo', confAt: 1, by: 'bo', upd: L.NOW - 86400000 }, o.x || {}));
}
// the booby-trapped name tests/safe-text.test.js uses: a function name others see
const P = 'Zz<i id="pwn"></i><img src=x onerror="window.__pwn=1">" data-pwn="1 \'Zz';
const SMITH = fn({ name: 'Smith 60th', date: plus(2), od: today });                 // its order day is today
const JONES = fn({ name: 'Jones wedding', date: plus(4), od: plus(-2) });           // order day two days ago, not ordered
const LEE = fn({ name: 'Lee engagement', date: plus(3), od: plus(-1) });            // ordered a minute ago
const PATEL = fn({ name: 'Patel lunch', date: plus(5), od: plus(-1), x: { status: 'cancelled', od: '', canAt: L.NOW - 3600000, canBy: 'bo' } });
const BROWN = fn({ name: 'Brown christening', date: plus(5), od: plus(-1) });       // removed: not in the list
const TRAP = fn({ name: P, date: plus(6), od: plus(-1) });
const FNS = { smith: SMITH, jones: JONES, lee: LEE, patel: PATEL, trap: TRAP };
// order lines as js/functions.js writes them (orderOps()) and as the order rollover copies them (ordRoll(): no fn)
const stock = (f, id, pre, more) => Object.assign({}, M.orderBody(f, id, pre), { deleted: false, ordered: false, addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - 5 * 3600000 }, more || {});
const rolled = (f, id, from, more) => {
  const b = M.orderBody(f, id);
  return Object.assign({ text: b.text, qty: b.qty, need: '', recipes: b.recipes, addedBy: 'Rolled over', addedById: '', addedAt: L.NOW - 4 * 3600000, ordered: false, deleted: false,
    rolled: 1, root: 'fn-' + id, from: 'fn-' + id, rolledFrom: from, origBy: 'Bo', origAt: L.NOW - 3 * 86400000, ahead: false, since: from }, more || {});
};
const LINES = {
  [key(['orders', today, 'lines', 'fn-smith'])]: stock(SMITH, 'smith'),
  [key(['orders', plus(-2), 'lines', 'fn-jones'])]: stock(JONES, 'jones'),
  [key(['orders', today, 'lines', rid('fn-jones')])]: rolled(JONES, 'jones', plus(-2)),
  [key(['orders', today, 'lines', 'fn-jones-' + today.replace(/-/g, '')])]: stock(JONES, 'jones', 'Function stock changed'),
  [key(['orders', today, 'lines', rid('fn-lee')])]: rolled(LEE, 'lee', plus(-1), { ordered: true, orderedBy: 'Sam', orderedById: 'sam', orderedAt: L.NOW - 60000 }),
  [key(['orders', today, 'lines', rid('fn-patel')])]: rolled(PATEL, 'patel', plus(-1)),
  [key(['orders', today, 'lines', 'fn-patel-x' + today.replace(/-/g, '')])]: stock(PATEL, 'patel', 'Function cancelled, check the order'),
  [key(['orders', today, 'lines', rid('fn-brown')])]: rolled(BROWN, 'brown', plus(-1)),
  [key(['orders', today, 'lines', rid('fn-trap')])]: rolled(TRAP, 'trap', plus(-1))
};
const extra = fs => Object.assign({ [key(['config', 'main'])]: cfg }, LINES, ...Object.keys(fs).map(id => ({ [key(['functions', id])]: fs[id] })));

// one order row as drawn: its tag and day words when shown, whether a ticked row holds their room, the tag's contrast
const rowOf = (p, id) => p.evaluate(([d, id]) => {
  const r = document.querySelector('.o-main [data-ln="' + d + '/' + id + '"]'); if (!r) return null;
  const t = r.querySelector('.o-fn-tag'), w = r.querySelector('.o-fn-when'), rr = r.getBoundingClientRect();
  const seen = e => !!e && getComputedStyle(e).visibility !== 'hidden' && e.getAttribute('aria-hidden') !== 'true';
  const lum = c => { const m = c.match(/[\d.]+/g).map(Number).slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
  let ratio = 0;
  if (t) { const a = lum(getComputedStyle(t).color), b = lum(getComputedStyle(t).backgroundColor); ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); }
  const tr = t && t.getBoundingClientRect(), wr = w && w.getBoundingClientRect();
  const within = q => !q || (q.top >= rr.top - 1 && q.bottom <= rr.bottom + 1 && q.left >= rr.left - 1 && q.right <= rr.right + 1);
  return { tag: seen(t) ? t.textContent.trim() : '', when: seen(w) ? w.textContent.replace(/\s+/g, ' ').trim() : '', held: !!t && !seen(t) && (!w || !seen(w)),
    whenCut: !!w && w.scrollWidth > w.clientWidth + 1, ratio: Math.round(ratio * 100) / 100, color: t ? getComputedStyle(t).color : '',
    inside: within(tr) && within(wr), top: Math.round(rr.top), h: Math.round(rr.height), done: r.classList.contains('is-done') };
}, [today, id]);
const tagged = p => L.waitFor(p, () => !!document.querySelector('.o-main .o-fn-tag'), null, 6000).catch(() => {});
const settle = (p, ms) => L.settle(p, ms || 400);
const day = d => M.dayName(d);
// staff see the function's day only; chefs also see the order day (head chef, 10 Nov 2026: no waiting ages for staff)
const LATE = 'For ' + day(JONES.date) + ' · order day was ' + day(JONES.od), LATE_STAFF = 'For ' + day(JONES.date);
const sinceOn = (p, id) => p.evaluate(s => !!document.querySelector(s), '.nb-row[data-ln="' + today + '/' + id + '"] .nb-roll');

(async () => {
  // 0. the rule itself (node): which line, which words, and never a guess
  const T = typeof M.orderTag === 'function' ? M.orderTag : () => { throw new Error('M.orderTag is missing'); };
  const pure = (name, fnc) => { try { ok(fnc(), name); } catch (e) { ok(false, name + ': ' + e.message); } };
  const line = (f, id, more) => Object.assign({ id: 'fn-' + id, date: today, ordered: false, deleted: false }, M.orderBody(f, id), more || {});
  const LIST = [SMITH, JONES, LEE, PATEL, TRAP].map((f, i) => Object.assign({ id: ['smith', 'jones', 'lee', 'patel', 'trap'][i] }, f));
  pure('rule: on its order day the stock line says Order today', () => { const t = T(LIST, line(SMITH, 'smith'), today); return t && t.kind === 'today' && t.id === 'smith'; });
  pure('rule: a rolled copy (root, no fn) after the order day says Not ordered yet, with both days in words', () => {
    const t = T(LIST, Object.assign(line(JONES, 'jones', { id: rid('fn-jones'), root: 'fn-jones', rolled: 2 }), { fn: undefined }), today);
    return t && t.kind === 'late' && t.day === day(JONES.date) && t.od === day(JONES.od);
  });
  pure('rule: on the function\'s own day, still Not ordered yet', () => { const f = Object.assign({}, JONES, { id: 'jones', date: today }); const t = T([f], line(f, 'jones', { id: rid('fn-jones'), root: 'fn-jones' }), today); return t && t.kind === 'late'; });
  pure('rule: a function already past gives no tag', () => { const f = Object.assign({}, JONES, { id: 'jones', date: plus(-1), od: plus(-5) }); return T([f], line(f, 'jones', { id: rid('fn-jones'), root: 'fn-jones' }), today) === null; });
  pure('rule: an order day still to come gives no tag', () => { const f = Object.assign({}, JONES, { id: 'jones', od: plus(1) }); return T([f], line(f, 'jones'), today) === null; });
  pure('rule: ticked, removed, or another day\'s line gives no tag', () => T(LIST, line(SMITH, 'smith', { ordered: true }), today) === null && T(LIST, line(SMITH, 'smith', { deleted: true }), today) === null && T(LIST, line(SMITH, 'smith', { date: plus(-1) }), today) === null);
  pure('rule: a function not in the list, or cancelled, gives no tag', () => T([], line(SMITH, 'smith'), today) === null && T(null, line(SMITH, 'smith'), today) === null && T(LIST, line(PATEL, 'patel', { id: rid('fn-patel'), root: 'fn-patel' }), today) === null);
  pure('rule: the Changed, Cancelled and Restored lines give no tag', () => ['Function stock changed', 'Function cancelled, check the order', 'Function restored, check the order'].every((pre, i) =>
    T(LIST, Object.assign(line(JONES, 'jones'), M.orderBody(JONES, 'jones', pre), { id: 'fn-jones-' + ['', 'x', 'r'][i] + today.replace(/-/g, '') }), today) === null));
  pure('rule: a function moved to another day after its order day (the line names the old day) gives no tag', () => { const f = Object.assign({}, JONES, { id: 'jones', date: plus(6), od: plus(-1) }); return T([f], line(JONES, 'jones', { id: rid('fn-jones'), root: 'fn-jones' }), today) === null; });
  pure('rule: a line whose fn names another function gives no tag', () => T(LIST, line(SMITH, 'smith', { fn: 'jones' }), today) === null);

  const b = await L.start(); let p;
  async function step(name, task) {
    try { await task(); }
    catch (e) { ok(false, name + ': ' + String(e.message || e).split('\n')[0]); }
    finally { if (p) { ok(!p.errors.length, name + ': no browser errors ' + p.errors.join(' | ')); await p.context().close(); p = null; } }
  }

  // 1. staff on a phone: Order today on today's stock line; Not ordered yet with its days on the rolled one; nothing else
  await step('staff 390', async () => {
    p = await L.open(b, '#/orders', { who: 'ann', extra: extra(FNS), width: 390, height: 844, wait: 1600 });
    await tagged(p);
    const s = await rowOf(p, 'fn-smith'), j = await rowOf(p, rid('fn-jones'));
    ok(!!s && s.tag === 'Order today' && !s.when, 'staff: the function stock line on its order day says Order today (' + JSON.stringify(s && { tag: s.tag, when: s.when }) + ')');
    ok(!!j && j.tag === 'Not ordered yet' && j.when === LATE_STAFF, 'staff: the rolled stock line after its order day says Not ordered yet, "' + LATE_STAFF + '", with no order day (no waiting ages for staff) (' + JSON.stringify(j && { tag: j.tag, when: j.when }) + ')');
    ok(!!j && !j.whenCut && j.inside && !!s && s.inside, 'the tag and the day words sit inside their row, "order day was" never cut');
    ok(!!j && j.ratio >= 4.5 && j.color === 'rgb(28, 29, 31)', 'the tag\'s words are ink on the attention tint, 4.5:1 or more (' + (j && j.ratio) + ':1, ' + (j && j.color) + ')');
    const none = {};
    for (const id of ['fn-jones-' + today.replace(/-/g, ''), rid('fn-patel'), 'fn-patel-x' + today.replace(/-/g, ''), rid('fn-brown'), 'o1']) { const r = await rowOf(p, id); none[id] = r ? r.tag + r.when : 'no row'; }
    ok(Object.values(none).every(v => v === ''), 'no tag on the Stock changed and Cancelled lines, a cancelled or removed function\'s line, or a plain request (' + JSON.stringify(none) + ')');
    const lee = await rowOf(p, rid('fn-lee'));
    ok(!!lee && lee.done && !lee.tag && !lee.when, 'a ticked stock line shows no tag (' + JSON.stringify(lee) + ')');
    const tr = await rowOf(p, rid('fn-trap'));
    const safe = await p.evaluate(() => ({ el: !!document.querySelector('.o-main #pwn, .o-main img, .o-main [data-pwn]'), pwn: window.__pwn === 1, text: (document.querySelector('.o-main .nb-rows') || {}).textContent || '' }));
    ok(!!tr && tr.tag === 'Not ordered yet' && !safe.el && !safe.pwn && safe.text.indexOf('Zz<i id="pwn"></i>') >= 0, 'a booby-trapped function name stays words: its line is tagged, no markup added (' + JSON.stringify({ tag: tr && tr.tag, el: safe.el, pwn: safe.pwn }) + ')');
    ok(!(await L.overflow(p)), '390: no sideways scroll');
  });

  // 2. while Orders is open: a booking edit and lk-who draw nothing; a cancellation takes its tag away
  await step('open page', async () => {
    p = await L.open(b, '#/orders', { who: 'ann', extra: extra(FNS), width: 390, height: 844, wait: 1600 });
    await tagged(p);
    const a = await rowOf(p, rid('fn-jones')), last = await rowOf(p, rid('fn-trap'));
    // like the SDK, a listener hears only what changed for it (the stand-in otherwise sends every listener on any write)
    await p.evaluate(() => { window.__fake.quiet = true; document.querySelector('.o-main .nb-rows').lkMark = 1; });
    await p.evaluate(([k, v]) => window.__fake.write(k, v), [key(['functions', 'jones']), Object.assign({}, JONES, { guests: 120, v: 2, upd: L.NOW })]);
    await settle(p, 900);
    await p.evaluate(() => window.dispatchEvent(new Event('lk-who'))); await settle(p, 600);
    const x = await rowOf(p, rid('fn-jones')), y = await rowOf(p, rid('fn-trap'));
    ok(await p.evaluate(() => document.querySelector('.o-main .nb-rows').lkMark === 1) && x.top === a.top && y.top === last.top && x.tag === 'Not ordered yet', 'a booking edit and lk-who while open: the list is not drawn again, nothing moves (' + a.top + '/' + x.top + ', ' + last.top + '/' + y.top + ')');
    await p.evaluate(([k, v]) => window.__fake.write(k, v), [key(['functions', 'jones']), Object.assign({}, JONES, { status: 'cancelled', od: '', canAt: L.NOW, canBy: 'bo', v: 3, upd: L.NOW })]);
    await L.waitFor(p, id => { const r = document.querySelector('.o-main [data-ln$="/' + id + '"]'); return !!r && !r.querySelector('.o-fn-tag'); }, rid('fn-jones'), 4000).catch(() => {});
    const c = await rowOf(p, rid('fn-jones'));
    ok(!!c && !c.tag && !c.when, 'the function is cancelled on another phone: its tag goes (' + JSON.stringify(c && { tag: c.tag, when: c.when }) + ')');
  });

  // 3. the functions not loaded yet: no tag, never a guess; the functions answer after the list is drawn: tags then
  await step('functions later', async () => {
    p = await L.open(b, '#/orders', { who: 'ann', extra: extra({}), width: 390, height: 844, wait: 1600 });
    await settle(p, 600);
    const s = await rowOf(p, 'fn-smith'), j = await rowOf(p, rid('fn-jones'));
    ok(!!s && !!j && !s.tag && !j.tag && !j.when && !(await p.$('.o-main .o-fn-tag')), 'no function in the list: the stock lines show no tag');
    await p.evaluate(([k, v, k2, v2]) => { window.__fake.write(k, v); window.__fake.write(k2, v2); }, [key(['functions', 'smith']), SMITH, key(['functions', 'jones']), JONES]);
    await tagged(p);
    const s2 = await rowOf(p, 'fn-smith'), j2 = await rowOf(p, rid('fn-jones'));
    ok(s2.tag === 'Order today' && j2.tag === 'Not ordered yet' && j2.when === LATE_STAFF, 'the functions answer after the list was drawn: the tags are drawn then (' + s2.tag + ', ' + j2.tag + ')');
  });

  // 4. a sous chef: the same tags; ticking keeps the row's height and puts the tag away; Undo brings it back; past days have none
  await step('chef 390', async () => {
    p = await L.open(b, '#/orders', { who: 'sam', extra: extra(FNS), width: 390, height: 844, wait: 1600 });
    await tagged(p);
    const s = await rowOf(p, 'fn-smith'), j = await rowOf(p, rid('fn-jones'));
    ok(s.tag === 'Order today' && j.tag === 'Not ordered yet' && j.when === LATE, 'chef: Order today, and Not ordered yet with the function\'s day and the order day');
    ok(!(await sinceOn(p, rid('fn-jones'))), 'chef: the Since badge steps aside on the tagged line, so the date shows once');
    const next = await p.evaluate(id => { const r = document.querySelector('.o-main [data-ln$="/' + id + '"]'), n = r && r.nextElementSibling; return n ? n.getAttribute('data-ln') : ''; }, rid('fn-jones'));
    const nextId = next.split('/').slice(1).join('/'), n0 = nextId ? await rowOf(p, nextId) : null;
    await p.click('.o-main [data-p="otick"][data-id="' + rid('fn-jones') + '"]');
    await L.waitFor(p, id => { const r = document.querySelector('.o-main [data-ln$="/' + id + '"]'); return !!r && r.classList.contains('is-done'); }, rid('fn-jones'), 4000);
    const t = await rowOf(p, rid('fn-jones')), n1 = nextId ? await rowOf(p, nextId) : null;
    ok(t.done && !t.tag && !t.when && t.held, 'chef ticks it ordered: no tag and no day words show; their room stays, empty (' + JSON.stringify({ tag: t.tag, when: t.when, held: t.held }) + ')');
    ok(t.h === j.h && t.top === j.top && (!n0 || n1.top === n0.top), 'the tick moves no row: same height, the next row stays put (' + j.h + '/' + t.h + ' px, next ' + (n0 && n0.top) + '/' + (n1 && n1.top) + ')');
    ok(await p.evaluate(() => { const e = document.querySelector('.o-main .o-fn-held'); return !!e && e.getAttribute('aria-hidden') === 'true'; }), 'the held room is silent for a screen reader');
    await p.click('.o-main [data-p="otick"][data-id="' + rid('fn-jones') + '"]');
    await L.waitFor(p, id => { const r = document.querySelector('.o-main [data-ln$="/' + id + '"]'); return !!r && !r.classList.contains('is-done'); }, rid('fn-jones'), 4000);
    const u = await rowOf(p, rid('fn-jones'));
    ok(u.tag === 'Not ordered yet' && u.when === LATE && u.h === j.h, 'Undo (a second tap): the tag and days are back in the same room');
    await p.fill('#o-day', plus(-2)); await settle(p, 900);
    const past = await p.evaluate(d => { const r = document.querySelector('.o-main [data-ln="' + d + '/fn-jones"]'); return r ? { tag: !!r.querySelector('.o-fn-tag'), when: !!r.querySelector('.o-fn-when') } : null; }, plus(-2));
    ok(!!past && !past.tag && !past.when, 'chef on the order day\'s own past list: the first line shows no tag (its rolled copy carries it today)');
    await p.click('.o-nav [data-p="otoday"]'); await settle(p, 600);
    ok(!(await L.overflow(p)), 'chef 390: no sideways scroll');
  });

  // 5. wider screens and extra large text: the same words, inside the row, nothing cut, no sideways scroll
  for (const [w, h, who, text] of [[768, 1024, 'sam'], [1280, 900, 'ann'], [1280, 900, 'bo'], [390, 844, 'ann', 'xlarge']]) {
    await step(w + ' ' + who + (text ? ' ' + text : ''), async () => {
      p = await L.open(b, '#/orders', { who, extra: extra(FNS), width: w, height: h, wait: 1600, settings: text ? { text } : undefined });
      await tagged(p);
      const s = await rowOf(p, 'fn-smith'), j = await rowOf(p, rid('fn-jones'));
      ok(!!s && !!j && s.tag === 'Order today' && j.tag === 'Not ordered yet' && j.when === (who === 'ann' ? LATE_STAFF : LATE) && !j.whenCut && j.inside && s.inside, w + ' px ' + who + (text ? ', ' + text + ' text' : '') + ': the tags and days in their rows, nothing cut');
      ok(!(await L.overflow(p)), w + ' px ' + who + (text ? ', ' + text + ' text' : '') + ': no sideways scroll');
    });
  }

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
