// What it needs on a function's order line (head chef chose the council's mix, 18 Nov 2026,
// docs/fn-order-ingredients-options/brief.md): a function's own stock line on today's order list, still to tick, opens to
// what its platters need, added up from the platter cards with the same sum as Prep's What the platters need
// (M.platterNeeds). With two functions' lines open on the list, both open to the same one order, each item's total
// first and its split under it, and the rule says to tick both. A request already on the list says so by name and is
// never added in. Sauces and dips kept in stock (LK_DATA.fnStock) are Check you have; house recipes Made here, on Prep.
// A line whose words are no longer the booking's own, and a ticked line, keep their Used in links. No read, no write.
// All people and functions here are made up.
const fs = require('fs'), vm = require('vm'), path = require('path');
const L = require('./lib'), M = require('../js/functions.js'), A = require('../js/amounts.js');
const { R, ok } = L.results();
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW)), at = (d, hm) => M.kat(d, M.hmMin(hm)), plus = n => M.addDays(today, n);
const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/data.js'), 'utf8'), ctx);
const D = ctx.window.LK_DATA, recipeOf = id => D.recipes.find(r => r.id === id) || null;
const STOCK = (D.fnStock || []).map(n => n.toLowerCase()), keyOf = (name, a) => name.toLowerCase() + '|' + (a ? a.u : '?');
const cfg = {
  people: [
    { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true, fn: false },
    { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true, fn: false },
    { id: 'bo', name: 'Bo', role: 'head', add: true, tick: true, del: true, active: true, fn: false }
  ], headId: 'bo', sousIds: ['sam', 'bo'], pingIds: ['sam', 'bo'], fnIds: [], staffIds: ['sam', 'ann', 'bo'], showBadges: true
};
const SHORT = { 'aussie-platter': 'Aussie', 'vege-platter': 'Vege', 'antipasto-platter': 'Antipasto', 'yumcha-platter': 'Yumcha', 'seafood-platter': 'Seafood' };
const ln = (rid, q) => ({ rid, name: SHORT[rid] + ' Platter', unit: 'platter', spec: '', fp: '', qty: q, u: M.toU([q]) });
function fn(o) {
  const date = o.date, rounds = ['18:30'].map(x => ({ at: at(date, x), note: '' }));
  return M.derive(Object.assign({ v: 1, status: 'confirmed', name: o.name, date, start: at(date, '17:30'), loc: 'Function room', guests: 60, mode: 'all', notes: '', kc: '', kcBy: '', kcAt: 0,
    rounds, od: o.od, lines: o.lines, was: {}, chg: [], cBy: 'bo', cAt: 1, confBy: 'bo', confAt: 1, by: 'bo', upd: L.NOW - 86400000 }, {}));
}
// the booby-trapped name tests/safe-text.test.js uses: a function name others see
const P = 'Zz<i id="pwn"></i><img src=x onerror="window.__pwn=1">" data-pwn="1 \'Zz';
const SMITH = fn({ name: 'Smith 50th', date: plus(5), od: today, lines: [ln('aussie-platter', 4), ln('vege-platter', 2), ln('antipasto-platter', 3)] });
const LEE = fn({ name: 'Lee 21st', date: plus(7), od: today, lines: [ln('aussie-platter', 2), ln('yumcha-platter', 2)] });
const TRAP = fn({ name: P, date: plus(6), od: today, lines: [ln('seafood-platter', 2)] });
const stock = (f, id, more) => Object.assign({}, M.orderBody(f, id), { deleted: false, ordered: false, addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - 5 * 3600000 }, more || {});
const req = (t, q, by, ago, x) => Object.assign({ text: t, qty: q, need: '', recipes: [], addedBy: by, addedById: by.toLowerCase(), addedAt: L.NOW - ago * 60000, ordered: false, deleted: false }, x || {});
function extra(o) {
  o = o || {};
  const fns = o.fns || { smith: SMITH, lee: LEE }, lines = {};
  Object.keys(fns).forEach(id => { lines[key(['orders', today, 'lines', 'fn-' + id])] = stock(fns[id], id, (o.line || {})[id]); });
  return Object.assign({ [key(['config', 'main'])]: cfg }, ...Object.keys(fns).map(id => ({ [key(['functions', id])]: fns[id] })), lines, {
    [key(['orders', today, 'lines', 'a2'])]: req('Party pies', '1 box', 'Sam', 70),
    [key(['orders', today, 'lines', 'a3'])]: req('Sweet chilli sauce', '', 'Ann', 50, { need: 'low' }),
    [key(['orders', today, 'lines', 'a5'])]: req('Brie', '', 'Sam', 20, { need: 'out' })
  });
}
// one function stock row as drawn: its fold button, whether it is open, the fold's words, Used in, the tick against the title
const rowOf = (p, id) => p.evaluate(id => {
  const r = document.querySelector('.o-main [data-ln$="/' + id + '"]'); if (!r) return null;
  const b = r.querySelector('.fno-sum'), box = r.querySelector('.fno-box'), t = r.querySelector('.nb-t').getBoundingClientRect(), k = r.querySelector('.nb-box').getBoundingClientRect();
  const items = box ? [...box.querySelectorAll('.fnn li')].map(li => li.textContent.replace(/\s+/g, ' ').trim()) : [];
  return { sum: b ? b.textContent.replace(/\s+/g, ' ').trim() : '', open: b ? b.getAttribute('aria-expanded') : '', bh: b ? Math.round(b.getBoundingClientRect().height) : 0,
    box: !!box, rule: box && box.querySelector('.fno-rule') ? box.querySelector('.fno-rule').textContent : '', items,
    notes: box ? [...box.querySelectorAll('.fno-note')].map(n => n.textContent.replace(/\s+/g, ' ').trim()) : [],
    used: !!r.querySelector('.o-used'), tickOff: Math.round(k.top - t.top), done: r.classList.contains('is-done'),
    held: !!b && b.classList.contains('fno-held') && getComputedStyle(b).visibility === 'hidden' && b.getAttribute('aria-hidden') === 'true',
    top: Math.round(r.getBoundingClientRect().top), h: Math.round(r.getBoundingClientRect().height) };
}, id);
const ready = p => L.waitFor(p, () => !!document.querySelector('.o-main .fno-sum'), null, 6000).catch(() => {});
const item = (r, name) => (r.items || []).find(t => t.indexOf(name + ' ') === 0) || '';

(async () => {
  // 0. the sum itself (node): the same maths Prep uses, the kinds, ranges and a platter with no card
  const pure = (name, f) => { try { ok(f(), name); } catch (e) { ok(false, name + ': ' + e.message); } };
  const ents = fs => [].concat(...fs.map(f => f.lines.map(l => ({ fid: f.id || f.name, name: f.name, rid: l.rid, n: l.qty, pname: SHORT[l.rid] }))));
  const both = typeof M.platterNeeds === 'function' ? M.platterNeeds(ents([Object.assign({ id: 'smith' }, SMITH), Object.assign({ id: 'lee' }, LEE)]), recipeOf, A, keyOf, STOCK) : { items: [] };
  const by = n => both.items.find(e => e.name === n);
  pure('sum: Party pies add up across platters and functions, 60 pieces (40 Smith 50th, 20 Lee 21st)', () => { const e = by('Party pies'); return e.read && e.n === 60 && e.u === 'pieces' && e.per.smith.n === 40 && e.per.lee.n === 20 && e.kind === 'order'; });
  pure('sum: 23 items to order for both, 18 for Smith 50th alone', () => both.items.filter(e => e.kind === 'order').length === 23 &&
    M.platterNeeds(ents([SMITH]), recipeOf, A, keyOf, STOCK).items.filter(e => e.kind === 'order').length === 18);
  pure('sum: a house recipe (Tomato sauce, linked) is made, a kept sauce (BBQ sauce, fnStock) is check', () => by('Tomato sauce').kind === 'made' && by('BBQ sauce').kind === 'check' && by('Sweet chilli sauce').n === 20);
  pure('sum: "handful" is never read: amount to come', () => { const e = by('Prawn crackers'); return !e.read && !e.ranged; });
  pure('sum: a range on the card ("6-8ea") adds up both ends, never read as one amount', () => { const e = M.platterNeeds([{ fid: 'x', name: 'X', rid: 'seafood-platter', n: 6, pname: 'Seafood' }], recipeOf, A, keyOf, STOCK).items.find(i => i.name === 'Scallops'); return !e.read && e.ranged && e.lo === 36 && e.n === 48 && e.u === 'pieces'; });
  pure('sum: a platter with no card is named, not left out quietly', () => { const r = M.platterNeeds([{ fid: 'x', name: 'X', rid: 'no-such-platter', n: 2, pname: 'Mystery' }], recipeOf, A, keyOf, STOCK); return r.items.length === 0 && r.missing.join() === 'Mystery'; });
  pure('sum: no platters, nothing', () => M.platterNeeds([], recipeOf, A, keyOf, STOCK).items.length === 0);

  const b = await L.start(); let p;
  async function step(name, task) {
    try { await task(); }
    catch (e) { ok(false, name + ': ' + String(e.message || e).split('\n')[0]); }
    finally { if (p) { ok(!p.errors.length, name + ': no browser errors ' + p.errors.join(' | ')); await p.context().close(); p = null; } }
  }

  // 1. a chef, two functions ordered today: closed by default, both lines name one order; open, totals and the split
  await step('chef two functions', async () => {
    p = await L.open(b, '#/orders', { who: 'sam', extra: extra(), width: 390, height: 844, wait: 1600 });
    await ready(p);
    const s = await rowOf(p, 'fn-smith'), l = await rowOf(p, 'fn-lee');
    ok(!!s && s.sum === 'What both functions need: 23 to order ▾' && s.open === 'false' && !s.box && !s.used, 'closed: Smith 50th\'s line says "What both functions need: 23 to order", no Used in (' + JSON.stringify(s && s.sum) + ')');
    ok(!!l && l.sum === s.sum && !l.box, 'Lee 21st\'s line says the same one order, closed');
    ok(s.bh >= 44, 'the fold button is 44 px or more (' + s.bh + ')');
    await p.click('.o-main [data-ln$="/fn-smith"] .fno-sum'); await L.settle(p, 300);
    const o = await rowOf(p, 'fn-smith'), l2 = await rowOf(p, 'fn-lee');
    ok(o.open === 'true' && o.box && !l2.box, 'a tap opens Smith 50th\'s fold only');
    ok(o.rule === 'One order for Smith 50th and Lee 21st. Once all 23 are ordered, tick both lines.', 'the rule first: one order, tick both lines (' + o.rule + ')');
    const pies = item(o, 'Party pies');
    ok(pies.indexOf('Party pies 60 pieces') === 0 && pies.indexOf('40 pieces Smith 50th · 20 pieces Lee 21st (4 Aussie · 2 Aussie)') > 0, 'the total first, the split under it (' + pies + ')');
    ok(pies.indexOf('Also on the list: 1 box (Sam). Not counted in the 60 pieces.') > 0, 'Sam\'s request says so by name, not added in');
    ok(item(o, 'Prosciutto').indexOf('240 g') > 0 && item(o, 'Prosciutto').indexOf('Smith 50th only (3 Antipasto)') > 0, 'an item one function needs says whose (' + item(o, 'Prosciutto') + ')');
    ok(/^Prawn crackers amount to come/.test(item(o, 'Prawn crackers')), 'a handful says amount to come, never a guess');
    ok(o.notes[0] === 'Check you have: BBQ sauce 16, Sweet chilli sauce 20 (also on the list: Low (Ann)), Caramelised onions 6, Basil pesto 6, Sweet soy sauce 4', 'Check you have: the kept sauces and dips, with Ann\'s Low (' + o.notes[0] + ')');
    ok(o.notes[1] === 'Made here, on Prep: Tomato sauce 16, Tomato relish 6', 'Made here, on Prep: the house recipes (' + o.notes[1] + ')');
    ok(Math.abs(o.tickOff) <= 1, '390: the tick stays on the title\'s first line while open (' + o.tickOff + ' px)');
    ok(await p.evaluate(() => { const a = document.activeElement; return !!a && a.getAttribute('data-p') === 'fno-fold' && a.getAttribute('data-id') === 'fn-smith'; }), 'the focus stays on the same button');
    ok(!(await L.overflow(p)), '390 open: no sideways scroll');
    await p.click('.o-main [data-ln$="/fn-smith"] .fno-sum'); await L.settle(p, 300);
    const c = await rowOf(p, 'fn-smith');
    ok(c.open === 'false' && !c.box, 'a second tap closes it');
    ok(await p.evaluate(() => !!document.querySelector('.o-main [data-ln$="/a2"] .nb-box') && !document.querySelector('.o-main [data-ln$="/a2"] .fno-sum')), 'a plain request has no fold');
    // ticking the line moves no row, closed or open; open, it stays open until its own button closes it
    for (const open of [false, true]) {
      if (open) { await p.click('.o-main [data-ln$="/fn-lee"] .fno-sum'); await L.settle(p, 300); }
      const id = open ? 'fn-lee' : 'fn-smith', before = await rowOf(p, id);
      const next = () => p.evaluate(id => { const r = document.querySelector('.o-main [data-ln$="/' + id + '"]').nextElementSibling; return r ? Math.round(r.getBoundingClientRect().top) : null; }, id);
      const n0 = await next();
      await p.click('.o-main [data-ln$="/' + id + '"] .nb-box'); await L.settle(p, 500);
      const after = await rowOf(p, id), n1 = await next();
      ok(after.done && after.h === before.h && after.top === before.top && n1 === n0 && after.box === open, (open ? 'open' : 'closed') + ': the tick moves no row, the next row stays put (' + before.h + '/' + after.h + ' px, next ' + n0 + '/' + n1 + ')');
    }
  });

  // 2. one function on the list (the other's line ticked): its own needs, tick this line; the ticked line keeps Used in
  await step('one function', async () => {
    p = await L.open(b, '#/orders', { who: 'sam', extra: extra({ line: { lee: { ordered: true, orderedBy: 'Sam', orderedById: 'sam', orderedAt: L.NOW - 60000 } } }), width: 390, height: 844, wait: 1600 });
    await ready(p);
    await p.click('.o-main [data-ln$="/fn-smith"] .fno-sum'); await L.settle(p, 300);
    const s = await rowOf(p, 'fn-smith'), l = await rowOf(p, 'fn-lee');
    ok(s.sum === 'What it needs: 18 to order ▴' && s.rule === 'Tick this line once all 18 are ordered.', 'one function: its own 18, tick this line (' + s.sum + ' / ' + s.rule + ')');
    ok(item(s, 'Party pies').indexOf('Party pies 40 pieces') === 0 && item(s, 'Party pies').indexOf('4 Aussie') > 0, 'its own amounts and platters (' + item(s, 'Party pies') + ')');
    ok(!!l && l.done && l.held && !l.box && !l.used, 'the ticked line keeps the fold\'s room, empty and silent, no Used in (' + JSON.stringify(l && { held: l.held, used: l.used }) + ')');
  });

  // 3. a line written before the booking changed keeps Used in, never new totals under old words
  await step('changed booking', async () => {
    const moved = Object.assign({}, SMITH, { lines: [ln('aussie-platter', 6), ln('vege-platter', 2), ln('antipasto-platter', 3)], v: 2 });
    p = await L.open(b, '#/orders', { who: 'sam', extra: Object.assign(extra({ fns: { smith: SMITH } }), { [key(['functions', 'smith'])]: moved }), width: 390, height: 844, wait: 1600 });
    await L.waitFor(p, () => !!document.querySelector('.o-main .o-fn-tag'), null, 6000).catch(() => {});
    const s = await rowOf(p, 'fn-smith');
    ok(!!s && !s.sum && s.used, 'the line\'s words name 4 Aussie, the booking now 6: no fold, Used in as before (' + JSON.stringify(s && { sum: s.sum, used: s.used }) + ')');
  });

  // 4. staff see it too, and a booby-trapped function name stays words
  await step('staff, safe text', async () => {
    p = await L.open(b, '#/orders', { who: 'ann', extra: extra({ fns: { smith: SMITH, trap: TRAP } }), width: 390, height: 844, wait: 1600 });
    await ready(p);
    await p.click('.o-main [data-ln$="/fn-trap"] .fno-sum'); await L.settle(p, 300);
    const t = await rowOf(p, 'fn-trap');
    const safe = await p.evaluate(() => ({ el: !!document.querySelector('.o-main #pwn, .o-main img, .o-main [data-pwn]'), pwn: window.__pwn === 1 }));
    ok(!!t && t.box && t.rule.indexOf('Zz<i id="pwn"></i>') > 0 && !safe.el && !safe.pwn, 'staff open the fold; the function name stays words (' + JSON.stringify(safe) + ')');
    ok(/^Scallops 12 to 16 pieces/.test(item(t, 'Scallops')), 'a range on the card says both ends (' + item(t, 'Scallops') + ')');
  });

  // 5. every width: the tick on the first line while open, nothing wider than the screen
  for (const [w, h] of [[390, 844], [768, 1024], [1280, 900]]) {
    await step(w + ' open', async () => {
      p = await L.open(b, '#/orders', { who: 'sam', extra: extra(), width: w, height: h, wait: 1600 });
      await ready(p);
      await p.click('.o-main [data-ln$="/fn-lee"] .fno-sum'); await L.settle(p, 300);
      const l = await rowOf(p, 'fn-lee');
      ok(l.box && Math.abs(l.tickOff) <= 1, w + ' px: the tick stays on the first line while open (' + l.tickOff + ')');
      ok(!(await L.overflow(p)), w + ' px open: no sideways scroll');
    });
  }

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
