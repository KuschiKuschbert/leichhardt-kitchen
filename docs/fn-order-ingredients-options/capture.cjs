// Previews for the three designs (round 2, 18 Nov 2026). Run from tests/ with a served book:
//   cd tests && BASE=http://127.0.0.1:<port>/ node ../docs/fn-order-ingredients-options/capture.cjs
// It opens the real Orders page (and a supplier order page) in the click-test stand-in with made-up functions and
// requests, then lays each design's markup over the page with the book's own classes. Nothing here is the book's code:
// the sums come from the platter cards in js/data.js and the book's amount reader, the same maths as Prep's
// "What the platters need". Pictures and measurements go next to this file.
const path = require('path'), fs = require('fs');
const T = path.join(process.cwd());
const L = require(path.join(T, 'lib')), M = require(path.join(T, '../js/functions.js')), A = require(path.join(T, '../js/amounts.js'));
const OUT = __dirname, SRC = fs.readFileSync(path.join(T, '../js/data.js'), 'utf8');
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW)), at = (d, hm) => M.kat(d, M.hmMin(hm)), plus = n => M.addDays(today, n);
const SHORT = { 'pizza-platter': 'Pizza', 'aussie-platter': 'Aussie', 'vege-platter': 'Vege', 'yumcha-platter': 'Yumcha', 'antipasto-platter': 'Antipasto', 'seafood-platter': 'Seafood' };

function platter(id) {
  const i = SRC.indexOf("id: '" + id + "'"), s = SRC.slice(i, SRC.indexOf('pins:', i)), re = /\{ q: '([^']*)', name: '([^']*)'(?:, link: '([^']*)')?/g, out = [];
  let m; while ((m = re.exec(s))) out.push({ q: m[1], name: m[2], link: m[3] || '' });
  return out;
}
// what the platters need, added up: order (bought), check (pots of sauce and dip: check stock), made (house recipe)
function sum(fns) {
  const items = {};
  fns.forEach(f => f.lines.forEach(l => platter(l.rid).forEach(g => {
    const kind = g.link ? 'made' : g.q === '2ea' ? 'check' : 'order', a = A.parse(g.q), k = g.name.toLowerCase() + '|' + (a ? a.u : g.q);
    const e = items[k] = items[k] || { name: g.name, kind, n: 0, u: a ? a.u : '', read: !!a, q: g.q, plat: 0, by: {} };
    if (a) e.n += a.n * l.qty;
    e.plat += l.qty;
    (e.by[f.name] = e.by[f.name] || []).push(l.qty + ' ' + SHORT[l.rid]);
  })));
  return Object.keys(items).map(k => items[k]).map(e => Object.assign(e, {
    amt: e.kind !== 'order' ? e.n + ' pots' : e.read ? A.say(e.n, e.u) : (A.scale(e.q, e.plat) || ''),
    who: Object.keys(e.by).map(n => (fns.length > 1 ? n + ': ' : '') + e.by[n].join(', ')).join(' · ')
  }));
}
const cfg = { people: [
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true, fn: false },
  { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true, fn: false },
  { id: 'bo', name: 'Bo', role: 'head', add: true, tick: true, del: true, active: true, fn: false }
], headId: 'bo', sousIds: ['sam', 'bo'], pingIds: ['sam', 'bo'], fnIds: [], staffIds: ['sam', 'ann', 'bo'], showBadges: true };
function fn(o) {
  const date = o.date, rounds = ['18:30'].map(x => ({ at: at(date, x), note: '' }));
  return M.derive(Object.assign({ v: 1, status: 'confirmed', name: o.name, date, start: at(date, '17:30'), loc: 'Function room', guests: 60, mode: 'all', notes: '', kc: '', kcBy: '', kcAt: 0,
    rounds, od: o.od, lines: o.lines, was: {}, chg: [], cBy: 'bo', cAt: 1, confBy: 'bo', confAt: 1, by: 'bo', upd: L.NOW - 86400000 }, {}));
}
const ln = (rid, q) => ({ rid, name: SHORT[rid] + ' Platter', unit: 'platter', spec: '', fp: '', qty: q, u: M.toU([q]) });
const SMITH = fn({ name: 'Smith 50th', date: plus(5), od: today, lines: [ln('aussie-platter', 4), ln('vege-platter', 2), ln('antipasto-platter', 3)] });
const LEE = fn({ name: 'Lee 21st', date: plus(7), od: today, lines: [ln('aussie-platter', 2), ln('yumcha-platter', 2)] });
const req = (t, q, by, ago, x) => Object.assign({ text: t, qty: q, need: '', recipes: [], addedBy: by, addedById: by.toLowerCase(), addedAt: L.NOW - ago * 60000, ordered: false, deleted: false }, x || {});
const stockLine = (f, id) => Object.assign({}, M.orderBody(f, id), { deleted: false, ordered: false, addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - 5 * 3600000 });
const EXTRA = { [key(['config', 'main'])]: cfg, [key(['functions', 'smith'])]: SMITH, [key(['functions', 'lee'])]: LEE,
  [key(['orders', today, 'lines', 'fn-smith'])]: stockLine(SMITH, 'smith'), [key(['orders', today, 'lines', 'fn-lee'])]: stockLine(LEE, 'lee'),
  [key(['orders', today, 'lines', 'a2'])]: req('Party pies', '1 box', 'Sam', 70),
  [key(['orders', today, 'lines', 'a3'])]: req('Sweet chilli sauce', '', 'Ann', 50, { need: 'low' }),
  [key(['orders', today, 'lines', 'a5'])]: req('Brie', '', 'Sam', 20, { need: 'out' }) };
// the requests already on the list (the stand-in also seeds Milk 6 L and Brioche buns 4 packs, tests/lib.js)
const ASKED = { 'party pies': '1 box (Sam)', 'sweet chilli sauce': 'Low (Ann)' };
const DATA = {
  smith: sum([SMITH]), lee: sum([LEE]), both: sum([SMITH, LEE]), ASKED,
  names: { smith: 'Smith 50th', lee: 'Lee 21st' }, days: { smith: M.dayName(SMITH.date), lee: M.dayName(LEE.date) }
};

const CSS = `
.fo-box { font-family: var(--body); font-size: 0.9375rem; font-weight: 400; line-height: 1.3; margin: 0.3rem 0 0.4rem; }
.fo-box .fnn strong { font-size: 1rem; }
.nb-main > .fnn-sum { font-size: 0.9375rem; }
.fo-box .fnn li { min-height: 44px; }
.fo-note { margin: 0.5rem 0 0; font-size: 0.875rem; line-height: 1.35; color: var(--ink); }
.fo-note strong { font-weight: 700; }
.fo-ask { font-weight: 700; color: var(--small-ink); }
.fo-used { display: block; margin-top: 0.15rem; }
.nb-main > .fnn-sum { display: block; }
.fo-b { margin: 0 0 0.6rem; padding: 0 0 0.4rem; border-bottom: 2px solid var(--line); }
.fo-b .fnn-sum { display: flex; flex-wrap: wrap; align-items: center; gap: 0.2rem 0.5rem; width: 100%; }
.fo-allrow { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem 0.6rem; margin: 0.3rem 0 0.4rem; }
.fo-allrow .btn { min-height: 44px; }
.fo-allrow span { font-size: 0.8125rem; color: var(--muted); }
.fo-done { font-family: var(--body); font-size: 0.9375rem; margin: 0.2rem 0 0; display: flex; flex-wrap: wrap; gap: 0.3rem 0.6rem; align-items: center; }
.fo-done .p-x { min-height: 44px; }
.nb-row.fo-open { align-items: flex-start; }
.nb-row.fo-open > .nb-box, .nb-row.fo-open > .nb-more, .nb-row.fo-open > .p-x { align-self: flex-start; }
.fo-rule { margin: 0.1rem 0 0.3rem; font-size: 0.875rem; font-weight: 700; color: var(--ink); }
.fo-ask3 { color: var(--ink); font-weight: 700; }
.fo-ask2 { color: var(--ink); font-weight: 700; }
.fo-b .fo-done .fnn-sum { width: auto; display: inline-flex; }
.fo-sup { display: inline-block; margin-top: 0.2rem; font-family: var(--body); font-size: 0.8125rem; font-weight: 700; color: var(--ink); background: var(--hit); border-radius: 6px; padding: 0.15rem 0.45rem; }
.fo-sup button { margin-left: 0.4rem; min-height: 32px; }
`;

// lays a design over the page. d: 'base' | 'a-closed' | 'a-open' | 'b-open' | 'b-after' | 'c-orders'
function apply(page, d) {
  return page.evaluate(([d, D, CSS]) => {
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const row = id => document.querySelector('[data-ln$="/fn-' + id + '"]');
    const order = xs => xs.filter(e => e.kind === 'order'), check = xs => xs.filter(e => e.kind === 'check'), made = xs => xs.filter(e => e.kind === 'made');
    const asked = e => D.ASKED[e.name.toLowerCase()];
    const amt = e => e.amt ? '<span class="fnn-q">' + esc(e.amt) + '</span>' : '<span class="fnn-tc">amount to come</span>';
    const list = (xs, b) => '<ul class="fnn">' + xs.map(e => '<li><span class="fnn-t"><strong>' + esc(e.name) + '</strong> ' + amt(e) + '<span class="fnn-w">' + esc(e.who) +
      (asked(e) ? ' · <span class="fo-ask">Also asked: ' + esc(asked(e)) + '</span>' : '') + '</span></span>' + (b ? b(e) : '') + '</li>').join('') + '</ul>';
    const notes = xs => '<p class="fo-note"><strong>Check you have:</strong> ' + check(xs).map(e => esc(e.name + ' ' + e.amt) + (asked(e) ? ' <span class="fo-ask">(asked: ' + esc(asked(e)) + ')</span>' : '')).join(', ') + '</p>' +
      '<p class="fo-note"><strong>Made here, on Prep:</strong> ' + made(xs).map(e => esc(e.name + ' ' + e.amt)).join(', ') + '</p>';
    if (d === 'base' || d.startsWith('built')) return;
    if (d.startsWith('mix-')) {
      // two functions share today's order: both lines' folds show the same one order, total first, split under it
      const xs = D.both, mine = order(xs), openId = d === 'mix-open' ? 'smith' : d === 'mix-lee' ? 'lee' : '';
      const split = e => Object.keys(e.by).map(n => n + ' ' + e.by[n].join(', ')).join(' · ');
      const part = e => { const s = D.smith.find(x => x.name === e.name && x.kind === e.kind), l = D.lee.find(x => x.name === e.name && x.kind === e.kind);
        return s && l ? esc((s.amt || 'to come') + ' Smith 50th · ' + (l.amt || 'to come') + ' Lee 21st') : esc((s ? 'Smith 50th' : 'Lee 21st') + ' only'); };
      ['smith', 'lee'].forEach(id => {
        const r = row(id), open = id === openId;
        r.querySelector('.o-used').remove();
        if (open) r.classList.add('fo-open');
        const btn = '<button type="button" class="fnn-sum" aria-expanded="' + open + '">What both functions need: ' + mine.length + ' to order <span aria-hidden="true">' + (open ? '▴' : '▾') + '</span></button>';
        const items = '<ul class="fnn">' + mine.map(e => '<li><span class="fnn-t"><strong>' + esc(e.name) + '</strong> ' + amt(e) + '<span class="fnn-w">' + part(e) + ' (' + esc(split(e).replace(/Smith 50th |Lee 21st /g, '')) + ')</span>' +
          (asked(e) ? '<span class="fnn-w fo-ask3">Also on the list: ' + esc(asked(e)) + '. Not counted in the ' + esc(e.amt) + '.</span>' : '') + '</span></li>').join('') + '</ul>';
        const box = open ? '<div class="fo-box"><p class="fo-rule">One order for Smith 50th and Lee 21st. Once all ' + mine.length + ' are ordered, tick both lines.</p>' + items +
          '<p class="fo-note"><strong>Check you have:</strong> ' + check(xs).map(e => esc(e.name + ' ' + e.amt) + (asked(e) ? ' (also on the list: ' + esc(asked(e)) + ')' : '')).join(', ') + '</p>' +
          '<p class="fo-note"><strong>Made here, on Prep:</strong> ' + made(xs).map(e => esc(e.name + ' ' + e.amt)).join(', ') + '</p></div>' : '';
        r.querySelector('.nb-t').insertAdjacentHTML('afterend', btn + box);
      });
      return;
    }
    if (d.startsWith('a-')) {
      ['smith', 'lee'].forEach(id => {
        const r = row(id), xs = D[id], open = d === 'a-open' && id === 'smith';
        r.querySelector('.o-used').remove();
        const btn = '<button type="button" class="fnn-sum" aria-expanded="' + open + '">What it needs: ' + order(xs).length + ' to order <span aria-hidden="true">' + (open ? '▴' : '▾') + '</span></button>';
        const box = open ? '<div class="fo-box">' + list(order(xs)) + notes(xs) + '<p class="fo-note">Tick this line once all of these are ordered.</p></div>' : '';
        r.querySelector('.nb-t').insertAdjacentHTML('afterend', btn + box);
      });
      return;
    }
    if (d.startsWith('b-')) {
      ['smith', 'lee'].forEach(id => { const r = row(id); if (r) r.style.display = 'none'; });
      const xs = D.both, todo = order(xs), n = todo.filter(e => !asked(e)).length;
      const head = '<h3 class="nb-sh">For the functions</h3>';
      let html;
      if (d === 'b-open') {
        html = head + '<button type="button" class="fnn-sum" aria-expanded="true"><span>' + esc(D.names.smith + ' (' + D.days.smith + ') and ' + D.names.lee + ' (' + D.days.lee + '): ' + todo.length + ' to order') + '</span><span class="fn-tag fn-t-order o-fn-tag">Order today</span><span aria-hidden="true">▴</span></button>' +
          '<div class="fo-box"><div class="fo-allrow"><button type="button" class="btn btn-primary fo-all">Add all ' + n + ' to the list</button><span>The amounts on the platter cards. Change one after it is on the list.</span></div>' +
          list(todo, e => asked(e) ? '<button type="button" class="p-x">Add anyway</button>' : '<button type="button" class="nb-btn fnn-add">Add</button><button type="button" class="p-x">Not needed</button>') + notes(xs) + '</div>';
      } else {
        html = head + '<p class="fo-done"><span>' + esc(D.names.smith + ' and ' + D.names.lee + ': ' + n + ' on the list, 1 already asked (Party pies). Sam 09:40.') + '</span><button type="button" class="p-x">Undo</button><button type="button" class="fnn-sum" aria-expanded="false">Show <span aria-hidden="true">▾</span></button></p>';
        const ul = document.querySelector('ul.o-requests') || document.querySelector('.nb-row').parentElement, proto = ul.querySelector('.nb-row:not([style])');
        todo.filter(e => !asked(e)).forEach(e => {
          const li = proto.cloneNode(true); li.removeAttribute('data-ln');
          li.querySelector('.nb-t').innerHTML = esc(e.name) + ' <span class="nb-q">' + esc(e.amt || '[amount to come]') + '</span><span class="nb-mk"></span>';
          const meta = li.querySelector('.nb-meta'); meta.innerHTML = '<span class="nb-forfn">For ' + esc(Object.keys(e.by).join(', ')) + '</span> <span class="nb-wrote">Sam 09:40</span>';
          li.querySelectorAll('.o-used, .fn-tag').forEach(x => x.remove());
          ul.appendChild(li);
        });
      }
      (document.querySelector('ul.o-requests') || document.querySelector('.nb-row').parentElement).insertAdjacentHTML('beforebegin', '<section class="fo-b">' + html + '</section>');
      if (d === 'b-after') window.scrollTo(0, 0);
      return;
    }
    if (d === 'c-orders') {
      const LINKED = ['party pies', 'sausage rolls', 'spring rolls, duck', 'meatballs', 'quiche'];
      ['smith', 'lee'].forEach(id => {
        const r = row(id), xs = order(D[id]), a = xs.filter(e => LINKED.indexOf(e.name.toLowerCase()) >= 0).length;
        r.querySelector('.o-used').remove();
        r.querySelector('.nb-t').insertAdjacentHTML('afterend', '<span class="o-used fo-used">' + xs.length + ' to order, in the supplier orders: <a href="#/suppliers/northside">Northside Test Foods (' + a + ')</a>, ' + (xs.length - a) + ' not linked to a product yet</span>');
      });
    }
  }, [d, DATA, CSS]);
}
// list rows a chef sees whole above the fixed Add request button at this size
const rowsAbove = page => page.evaluate(() => {
  const add = [...document.querySelectorAll('button')].find(b => /Add request/.test(b.textContent) && getComputedStyle(b).position !== 'static' && b.getBoundingClientRect().height);
  const lim = add && add.getBoundingClientRect().top < innerHeight ? add.getBoundingClientRect().top : innerHeight;
  return [...document.querySelectorAll('.nb-row')].filter(r => r.offsetParent && r.getBoundingClientRect().bottom <= lim && r.getBoundingClientRect().top >= 0).length;
});
const shot = (p, name, full) => p.screenshot({ path: path.join(OUT, name + '.png'), fullPage: !!full });

// C: the supplier order page with products linked to platter items by their aliases (made-up products)
const sup = (id, name, pack, alias, ou) => ({ id, name, pack, group: 'Frozen', category: 'FROZEN', par: '', parUnit: '', orderUnit: ou || '', factor: 0, aliases: [alias], archived: false, manual: false, source: { file: 'synthetic-order-sheet.pdf', page: 1, row: 1, name, par: '' } });
const SUPX = Object.assign({}, EXTRA, {
  [key(['config', 'main'])]: Object.assign({}, cfg, { pinOpen: {}, cutoffs: [{ id: 'northside', name: 'Northside Test Foods', dd: [(new Date(L.NOW).getDay() + 1) % 7], at: 15 * 60, pre: 1, lead: 240 }] }),
  [key(['suppliers', 'northside'])]: { name: 'Northside Test Foods', cutoffId: 'northside', v: 1, at: L.NOW - 10 * 86400000, by: 'owner', items: [
    sup('n1', 'TEST PARTY PIE 48 PACK', '48 x 50 g', 'Party pies', 'box'), sup('n2', 'TEST SAUSAGE ROLL 48 PACK', '48 x 50 g', 'Sausage rolls', 'box'),
    sup('n3', 'TEST DUCK SPRING ROLL 30', '30 x 30 g', 'Spring rolls, duck', 'box'), sup('n4', 'TEST BEEF MEATBALL 1KG', '1 kg bag', 'Meatballs', 'bag'),
    sup('n5', 'TEST MINI QUICHE 24', '24 x 40 g', 'Quiche', 'box'), sup('n6', 'TEST CHIPS 2.5KG', '2.5 kg bag', 'Chips', 'bag')] }
});
const HINT = { n1: ['Party pies', '60 pieces', 'about 2 boxes of 48', 'Smith 50th, Lee 21st'], n2: ['Sausage rolls', '60 pieces', 'about 2 boxes of 48', 'Smith 50th, Lee 21st'],
  n3: ['Duck spring rolls', '48 pieces', 'about 2 boxes of 30', 'Smith 50th, Lee 21st'], n4: ['Meatballs', '120 pieces', 'pieces to bags not set', 'Smith 50th, Lee 21st'], n5: ['Quiche', '48 pieces', 'about 2 boxes of 24', 'Smith 50th, Lee 21st'] };

(async () => {
  const b = await L.start(); let meas = {};
  const ONLY = process.env.ONLY;
  const views = [['built-closed', 'built/closed'], ['built-open', 'built/open'], ['mix-closed', 'design-mix/closed'], ['mix-open', 'design-mix/open'], ['mix-lee', 'design-mix/open-lee'], ['base', 'baseline'], ['a-closed', 'design-a/closed'], ['a-open', 'design-a/open'], ['b-open', 'design-b/open'], ['b-after', 'design-b/after'], ['c-orders', 'design-c/orders']];
  for (const [d, name] of views) {
    if (ONLY && !d.startsWith(ONLY)) continue;
    fs.mkdirSync(path.join(OUT, path.dirname(name)), { recursive: true });
    for (const [w, h] of (d.startsWith('mix') || d.startsWith('built') ? [[390, 844], [768, 1024], [1280, 900]] : [[390, 844], [1280, 900]])) {
      const p = await L.open(b, '#/orders', { who: 'sam', extra: EXTRA, width: w, height: h, wait: 1800 });
      await L.settle(p, 600); await apply(p, d); await L.settle(p, 300);
      if (d === 'built-open') { await p.click('.o-main [data-ln$="/fn-smith"] .fno-sum'); await L.settle(p, 300); await p.evaluate(() => { const r = document.querySelector('.fno-box').closest('.nb-row'); window.scrollTo(0, r.getBoundingClientRect().top + scrollY - 140); }); }
      if (d === 'a-open' || d === 'mix-open' || d === 'mix-lee') await p.evaluate(() => { const r = document.querySelector('.fo-box').closest('.nb-row'); window.scrollTo(0, r.getBoundingClientRect().top + scrollY - 140); });
      if (d === 'b-open') await p.evaluate(() => { const r = document.querySelector('.fo-b'); window.scrollTo(0, r.getBoundingClientRect().top + scrollY - 140); });
      meas[name + '@' + w] = { rows: /open/.test(d) ? null : await rowsAbove(p) };
      if (d === 'built-open') meas[name + '@' + w].tick = await p.evaluate(() => { const r = document.querySelector('.fno-box').closest('.nb-row'), t = r.querySelector('.nb-box').getBoundingClientRect(), h = r.querySelector('.nb-t').getBoundingClientRect(); return { tickTop: Math.round(t.top - h.top), toggleH: Math.round(r.querySelector('.fno-sum').getBoundingClientRect().height) }; });
      if (d === 'mix-open' || d === 'mix-lee') meas[name + '@' + w].tick = await p.evaluate(() => { const r = document.querySelector('.fo-open'), t = r.querySelector('.nb-box').getBoundingClientRect(), h = r.querySelector('.nb-t').getBoundingClientRect(), g = r.querySelector('.fnn-sum').getBoundingClientRect(); return { tickTop: Math.round(t.top - h.top), tickH: Math.round(t.height), titleH: Math.round(h.height), toggleH: Math.round(g.height), foldH: Math.round(r.querySelector('.fo-box').getBoundingClientRect().height) }; });
      await shot(p, name + '-' + w); if (w === 390) await shot(p, name + '-' + w + '-full', true);
      await p.context().close();
    }
  }
  // staff on the baseline and design B after (staff never see the For the functions block: it is chef work)
  if (!ONLY) for (const [d, name] of [['base', 'baseline/staff'], ['b-after', 'design-b/after-staff']]) {
    const p = await L.open(b, '#/orders', { who: 'ann', extra: EXTRA, width: 390, height: 844, wait: 1800 });
    await L.settle(p, 600); await apply(p, d);
    if (d === 'b-after') await p.evaluate(() => { const s = document.querySelector('.fo-b'); if (s) s.remove(); });
    meas[name + '@390'] = { rows: await rowsAbove(p) }; await shot(p, name + '-390'); await p.context().close();
  }
  // C: the supplier order page
  if (!ONLY) for (const [w, h] of [[390, 844], [1280, 900]]) {
    const p = await L.open(b, '#/suppliers/northside', { who: 'bo', extra: SUPX, width: w, height: h, wait: 2200 });
    await L.settle(p, 800);
    const info = await p.evaluate(([H, CSS]) => {
      const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
      const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
      let n = 0;
      Object.keys(H).forEach(id => {
        const el = [...document.querySelectorAll('[data-item], [data-id], tr, li')].find(x => (x.getAttribute('data-item') === id || x.getAttribute('data-id') === id) && x.textContent.indexOf('TEST') >= 0)
          || [...document.querySelectorAll('tr, li, .su-row')].find(x => x.textContent.indexOf(H[id][0] === 'Duck spring rolls' ? 'DUCK SPRING' : H[id][0] === 'Party pies' ? 'PARTY PIE' : H[id][0] === 'Sausage rolls' ? 'SAUSAGE ROLL' : H[id][0] === 'Meatballs' ? 'MEATBALL' : 'MINI QUICHE') >= 0 && x.children.length > 1);
        if (!el) return;
        const cell = el.querySelector('td:nth-child(1), .su-name, strong') || el; n++;
        cell.insertAdjacentHTML('beforeend', '<div><span class="fo-sup">Functions: ' + esc(H[id][1]) + ' · ' + esc(H[id][2]) + ' (' + esc(H[id][3]) + ')' + (/about/.test(H[id][2]) ? '<button type="button" class="p-x">Use ' + esc(H[id][2].replace(/^about (\d+) (boxes).*/, '$1 $2')) + '</button>' : '') + '</span></div>');
      });
      const top = document.querySelector('main h1, main h2, .su-head, h1');
      if (top) top.insertAdjacentHTML('afterend', '<p class="fo-note" style="margin:0.4rem 0"><strong>For the functions (Smith 50th, Lee 21st):</strong> 5 products here. 18 not linked to a product yet: <a href="#">Link them</a>.</p>');
      return n;
    }, [HINT, CSS]);
    meas['design-c/supplier@' + w] = { chips: info };
    fs.mkdirSync(path.join(OUT, 'design-c'), { recursive: true });
    await shot(p, 'design-c/supplier-' + w); if (w === 390) await shot(p, 'design-c/supplier-390-full', true);
    await p.evaluate(() => { const c = document.querySelector('.fo-sup'); if (c) window.scrollTo(0, c.getBoundingClientRect().top + scrollY - 200); });
    await shot(p, 'design-c/supplier-rows-' + w);
    await p.context().close();
  }
  if (ONLY) { const old = JSON.parse(fs.readFileSync(path.join(OUT, 'measurements.json'), 'utf8')); meas = Object.assign(old.rows, meas); }
  fs.writeFileSync(path.join(OUT, 'measurements.json'), JSON.stringify({ source: 'origin/main cd0bb25, tests/fake stand-in, made-up data, Preview (design markup laid over the Implemented app)', sums: { smith: DATA.smith, lee: DATA.lee, both: DATA.both }, rows: meas }, null, 2));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
