/*
  AI drawing bake-off harness (offline, never loaded by the book).
  For each plated dish: what the book draws today (Draw it for me, seed 0), the brief Claude gets, Claude's answer turned
  into a drawing from the book's own parts and library pieces, and both scored with tests/plating-check.js's measures.
*/
const pc = require('../../tests/plating-check.js');
pc.bind();
const { win, D, S, DR, Rn, LIB } = pc.env();
const KINDS = ['main', 'snack', 'side', 'dessert'];
const DISHES = D.recipes.filter(r => KINDS.indexOf(r.kind) >= 0);
const { band } = pc.book(DISHES);
const n1 = v => Math.round(v * 10) / 10;

// ---------- servingware presets ----------
const WARE = [];
LIB.WARE.forEach(f => f.list.forEach(x => { if (!/GN |Ramekin|Fluted ramekin|Sauce dish|Gravy boat|Sauce tub|Condiment bowl/.test(x.name)) WARE.push({ name: x.name, fam: f.fam, p: x.p }); }));
const WARE_BY = Object.fromEntries(WARE.map(w => [w.name, w]));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function wareName(p) { const w = WARE.find(x => same(x.p, p)); return w ? w.name : null; }

// ---------- the library list Claude picks from (stable order, so the prompt caches) ----------
const CATALOGUE = LIB.items.filter(it => !it.mine).slice().sort((a, b) => a.id < b.id ? -1 : 1)
  .map(it => [it.id, it.name, it.role, it.form || '', Math.round(it.w) + 'x' + Math.round(it.h)].join(' | ')).join('\n');

// ---------- the rules' drawing ----------
function lineOk(x, r) { return pc.LINE_OK.test(x.sauceElongName ? x.sauceElongName + ' ' + ((r.ingredients || []).find(i => Rn.ingName(i) === x.sauceElongName) || {}).note : ''); }
function rules(r) { const x = pc.auto(r, 0); x.r = r; x.lineOk = lineOk(x, r); pc.score(x, band); return x; }

// ---------- the brief for one dish ----------
function partsFor(r) { const d = DR.blank(r.id, 'plate'); let res = null; DR.withDrawing(d, () => { res = S.partsOf(r, d); }); return res; }
function brief(r, x) {
  const pr = partsFor(r), ings = r.ingredients || [], lines = [];
  lines.push('Dish: ' + r.name + (r.forLine ? ' (' + r.forLine + ')' : '') + '. Kind: ' + r.kind + '.');
  if (r.menu) lines.push('Guest menu: ' + r.menu);
  if (r.yield) lines.push('Yield: ' + r.yield);
  lines.push('', 'Ingredients (amount | name | note):');
  ings.forEach((i, k) => {
    const card = i.link ? D.recipes.find(c => c.id === i.link) : null;
    lines.push('- ' + (i.q || '') + ' | ' + (i.name || '') + (i.note ? ' | ' + i.note : '') + (i.link ? ' | has its own card: ' + (card ? card.name : i.link + ' (card to come)') : ''));
  });
  const steps = [];
  (r.sections || []).forEach(s => (s.steps || []).forEach(t => steps.push(s.title + ': ' + (typeof t === 'string' ? t : t.text || JSON.stringify(t)))));
  if (steps.length) { lines.push('', 'Method:'); steps.forEach(s => lines.push('- ' + s)); }
  lines.push('', 'What the book draws today, by part name (use these exact names in "ingredient"):');
  const named = {};
  pr.parts.forEach(p => {
    const k = ings.map(Rn.ingName).indexOf(p.ing), it = p.it, what = it.raw ? 'drawn from its own card (' + (it.role || 'part') + ')' : 'library piece ' + it.id + ' "' + it.name + '" (' + it.role + ')';
    lines.push('"' + p.ing + '" -> book part: ' + what + (p.also && p.also.length ? '; also stands for ' + p.also.join(', ') : '') + (p.count > 1 ? '; ' + p.count + ' copies' : ''));
    named[p.ing] = 1; (p.also || []).forEach(a => { named[a] = 1; });
  });
  pr.unsure.forEach(u => { const k = ings.map(Rn.ingName).indexOf(u.ing); named[u.ing] = 1; lines.push('"' + u.ing + '" -> the book is unsure' + (u.guesses && u.guesses.length ? ' (its guesses: ' + u.guesses.slice(0, 3).map(g => g.id || g).join(', ') + ')' : '') + '. No book part: pick a library piece or leave it off.'); });
  ings.forEach((i, k) => { const n = Rn.ingName(i); if (!named[n]) lines.push('"' + n + '" -> the book leaves it off (not seen on the plate).'); });
  const wn = wareName(x.surf);
  lines.push('', 'The book serves it on: ' + (wn || JSON.stringify(x.surf)) + '. Keep it unless the method says otherwise; "book" keeps it.');
  return { text: lines.join('\n'), parts: pr };
}

// ---------- Claude's answer as a drawing ----------
function known(r, pr) { const k = (r.ingredients || []).map(Rn.ingName); pr.parts.forEach(p => { k.push(p.ing); (p.also || []).forEach(a => k.push(a)); }); pr.unsure.forEach(u => k.push(u.ing)); return k; }
function toDrawing(r, ans, pr, x) {
  const d = DR.blank(r.id, 'plate'), errs = [];
  d.surf = ans.ware && ans.ware !== 'book' && WARE_BY[ans.ware] ? JSON.parse(JSON.stringify(WARE_BY[ans.ware].p)) : JSON.parse(JSON.stringify(x.surf));
  if (ans.ware && ans.ware !== 'book' && !WARE_BY[ans.ware]) errs.push('unknown ware ' + ans.ware);
  const a = LIB.surface(d.surf).area, ings = r.ingredients || [];
  d.els = []; d.defs = {};
  (ans.parts || []).forEach(p => {
    const ing = typeof p.ingredient === 'string' ? p.ingredient.trim() : '';
    if (ing && known(r, pr).indexOf(ing) < 0) errs.push('unknown ingredient name ' + ing);
    const bp = pr.parts.find(q => q.ing === ing) || pr.parts.find(q => (q.also || []).indexOf(ing) >= 0) || null;
    let it = null, fromBook = false;
    if (p.piece === 'book') { if (bp) { it = bp.it; fromBook = true; } else errs.push('no book part for ' + (ing || p.ingredient)); }
    else { it = LIB.get(p.piece); if (!it) { errs.push('unknown piece ' + p.piece); if (bp) { it = bp.it; fromBook = true; } } }
    if (!it) return;
    const k2 = it.raw ? it.key : it.id + '@' + it.v;
    d.defs[k2] = it.raw ? it.body : LIB.body(it.id);
    const w = it.w || (it.box ? it.box[2] - it.box[0] : 40), sc = Math.max(0.08, Math.min(4, (+p.width || 0.3) * 2 * a.rx / w));
    const el = { t: 'item', a: k2, x: n1(a.cx + Math.max(-1.2, Math.min(1.2, +p.x || 0)) * a.rx), y: n1(a.cy + Math.max(-1.2, Math.min(1.2, +p.y || 0)) * a.ry), sx: n1(sc * 100) / 100, sy: n1(sc * Math.max(0.2, Math.min(2, p.squash == null ? 1 : +p.squash)) * 100) / 100, r: Math.round(+p.turn || 0) };
    if (ing) el.ing = ing;
    if (it.raw) { el.t = 'raw'; el.bx = it.box.map(n1).join(' '); el.role = it.role; if (it.made) { el.made = it.made; el.ms = it.ms; } if (it.dr) { el.dr = it.dr; el.ck = it.cook; } }
    const ii = ings.map(Rn.ingName).indexOf(ing); if (ii >= 0) el.ii = ii;
    if (bp && bp.also && bp.also.length) { el.also = bp.also.join('|'); el.ai = bp.also.map(n => ings.map(Rn.ingName).indexOf(n)).join('|'); }
    const col = !it.raw && /sauce/.test(it.role) && ing ? LIB.sauceColour(ing) : '';
    if (col && it.side && it.side.c) el.cm = Rn.tintMap(d.defs[k2], it.side.c, col);
    d.els.push(el);
  });
  return { d, errs };
}
function scoreAI(r, d, x) { const y = pc.auto(r, 0, d, x.style); y.r = r; y.lineOk = lineOk(y, r); pc.score(y, band); return y; }

// ---------- pictures ----------
function svgOf(d) {
  let s = ''; const dd = Object.assign({}, d, { els: d.els.filter(e => e.t === 'item' || e.t === 'raw') });
  DR.withDrawing(dd, () => { s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + Rn.viewBoxOf(dd) + '">' + Rn.svgS(dd) + Rn.svgF(dd) + '</svg>'; });
  return win.LK_RX && win.LK_RX.clean ? win.LK_RX.clean(s) : s;
}

module.exports = { known, DISHES, WARE, CATALOGUE, rules, brief, toDrawing, scoreAI, svgOf, band };
