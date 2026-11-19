/* Allergens checked or not (19 Nov 2026, docs/allergen-check-options/brief.md). An ingredient is checked when it has
   its allergens, says No allergens (none: true) or links a recipe that is itself checked; a recipe that sets its
   allergens by hand is checked as a whole. A recipe with any part not checked says "Allergens not checked yet" in
   words, never "None in the ingredients", and stays out of Free from, as a card to come already does. The recipe
   form offers No allergens on every ingredient and says Not checked on a row that has neither.
   On the code before this change the card said "None in the ingredients." and Free from listed it. */
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true });
const cfg = () => ({ [fsKey(['config', 'main'])]: { people: [P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'head'), P('bo', 'Bo', 'staff')], headId: 'ann', sousIds: ['sam', 'ann'], pingIds: ['sam', 'ann'], showBadges: true } });
const ing = (name, x) => Object.assign({ q: '1 kg', name }, x || {});
// recipes made in the book (src new): none of these ids or names is in js/data.js
const R0 = [
  { id: 'zz-rice', no: '901', kind: 'batch', forLine: 'Batch', name: 'Zz Test Rice', yield: '5 kg', ingredients: [ing('Long grain rice'), ing('Water')] },
  { id: 'zz-slaw', no: '902', kind: 'side', forLine: 'Plate', name: 'Zz Test Slaw', yield: 'Per plate', ingredients: [ing('Cabbage'), ing('Mayonnaise', { tags: ['Egg'] })] },
  { id: 'zz-bowl', no: '903', kind: 'main', forLine: 'Plate', name: 'Zz Test Bowl', yield: 'Per plate', ingredients: [ing('Rice', { link: 'zz-rice' }), ing('Spring onion', { none: true })] },
  { id: 'zz-rice-ok', no: '904', kind: 'batch', forLine: 'Batch', name: 'Zz Test Checked Rice', yield: '5 kg', ingredients: [ing('Long grain rice', { none: true }), ing('Water', { none: true })] },
  { id: 'zz-bowl-ok', no: '905', kind: 'main', forLine: 'Plate', name: 'Zz Test Checked Bowl', yield: 'Per plate', ingredients: [ing('Rice', { link: 'zz-rice-ok' }), ing('Spring onion', { none: true })] },
  { id: 'zz-hand', no: '906', kind: 'side', forLine: 'Plate', name: 'Zz Test Hand Salad', yield: 'Per plate', ingredients: [ing('Lettuce')], contains: [], check: [] }
];
// the head chef's own copies of two file recipes: one saved before 19 Nov 2026 (no none anywhere: the file's checks
// carry over by name), one saved by the new form with a line left not checked (none: false: nothing carries)
global.window = {}; require('../js/data.js');
const FILE = global.window.LK_DATA, file = id => JSON.parse(JSON.stringify(FILE.recipes.find(r => r.id === id)));
const old = Object.assign(file('mushy-peas'), { yield: 'Old copy' });
old.ingredients.forEach(i => { delete i.none; });
const kept = Object.assign(file('cowboy-candy'), { yield: 'New copy' });
const left = kept.ingredients.find(i => i.none === true);
left.none = false;
const rec = (r, src) => ({ r, v: 1, upd: L.NOW - 3600000, by: 'ann', src: src || 'new', base: '', removed: false });
function changes() {
  const out = { [fsKey(['book', 'index'])]: { r: Object.fromEntries(R0.map(r => [r.id, 1]).concat([['mushy-peas', 1], ['cowboy-candy', 1]])) } };
  R0.forEach(r => { out[fsKey(['recipes', r.id])] = rec(r); });
  out[fsKey(['recipes', 'mushy-peas'])] = rec(old, 'book');
  out[fsKey(['recipes', 'cowboy-candy'])] = rec(kept, 'book');
  return out;
}
const wait = (p, fn, arg, t) => L.waitFor(p, fn, arg, t || 6000).catch(() => false);
const synced = p => wait(p, () => !!(window.LK_RX && window.LK_RX.syncedAt() && window.LK_APP && window.LK_APP.byId('zz-hand')), null, 8000);
async function go(p, hash) { await p.evaluate(h => { location.hash = h; }, hash); await L.settle(p, 400); }
const box = p => txt(p, '#r-allergens').then(t => t || '');
const NOT = /Allergens not checked yet/;

(async () => {
  // js/data.js (the head chef's choice, 19 Nov 2026: A, with the label-dependent products left to check): every plain
  // ingredient of a recipe worked out from its tags has its allergens or No allergens, except these products, which
  // stay not checked until the head chef reads their labels. Take one out of LABELS when its lines are checked; a new
  // line left not checked on purpose adds its product here with the head chef's word, so it is never silent.
  const LABELS = ['chips', 'fries', 'sweet potato chips', 'chicken tenders', 'fried shallots', 'corn flour', 'dark beef stock',
    'heinz bbq sauce', 'buffalo sauce', 'red hot sauce', 'sweet chilli sauce', 'napoli sauce', 'sauce of choice', 'side sauce of choice',
    'szechuan seasoning', 'mild curry powder', 'chinese five spice', 'icing sugar mix', 'bacon', 'shortcut bacon', 'diced bacon',
    'crispy bacon', 'leg ham', 'shaved leg ham', 'virginian ham', 'salami', 'pulled pork', 'pulled lamb', 'smoked pulled lamb'];
  const plain = FILE.recipes.filter(r => !r.contains && !r.check).flatMap(r => r.ingredients.filter(i => !i.link && !(i.tags && i.tags.length)).map(i => ({ r: r.id, i })));
  const lab = x => LABELS.indexOf(x.i.name.trim().toLowerCase()) >= 0;
  const open = plain.filter(x => !lab(x) && x.i.none !== true).map(x => x.r + ': ' + x.i.name);
  ok(open.length === 0, 'js/data.js: every plain line outside the label list is checked (' + open.slice(0, 5).join(', ') + ')');
  const stamped = plain.filter(x => lab(x) && x.i.none !== undefined).map(x => x.r + ': ' + x.i.name);
  ok(stamped.length === 0 && plain.filter(lab).length === 49, 'js/data.js: the 49 lines of the label-dependent products stay not checked (' + stamped.join(', ') + ')');
  const b = await L.start();
  let p = await L.open(b, '#/recipes', { noPin: true, who: '', wait: 1500 });
  const shows = await p.evaluate(() => window.LK_DATA.recipes.filter(r => window.LK_APP.unchecked(r.id).length).map(r => [r.id, window.LK_APP.unchecked(r.id)]));
  const names = new Set(FILE.recipes.map(r => r.name));
  ok(shows.length === 39 && shows.every(([, parts]) => parts.every(n => LABELS.indexOf(n.toLowerCase()) >= 0 || names.has(n))), 'the book as js/data.js has it: 39 cards say Allergens not checked yet, each for a label-dependent product or a recipe that uses one (' + shows.length + ')');
  await go(p, '#/r/smash'); const sm = await box(p);
  ok(NOT.test(sm) && /Chips/.test(sm), 'the Smash Burger says its chips are not checked (' + sm.replace(/\s+/g, ' ') + ')');
  await p.context().close();
  p = await L.open(b, '#/recipes', { who: 'bo', extra: Object.assign(cfg(), changes()), wait: 1500 });
  ok(await synced(p), 'the test recipes came in');

  // the card says it in words, names the parts, and never says None
  await go(p, '#/r/zz-rice');
  let t = await box(p);
  ok(NOT.test(t) && /Long grain rice/.test(t) && /Water/.test(t), 'no allergens tagged: the card says Allergens not checked yet and names the parts (' + t.replace(/\s+/g, ' ') + ')');
  ok(!/None in the/.test(t), 'no allergens tagged: the card never says None in the ingredients');
  await go(p, '#/r/zz-slaw');
  t = await box(p);
  ok(/Egg/.test(t) && NOT.test(t) && /Cabbage/.test(t) && !/Mayonnaise/.test((t.split(/not checked yet/i)[1] || '')), 'one part tagged: Egg shows, and the card says Cabbage is not checked (' + t.replace(/\s+/g, ' ') + ')');
  await go(p, '#/r/zz-bowl');
  t = await box(p);
  ok(NOT.test(t) && /Zz Test Rice/.test(t), 'a dish using a recipe not checked: not checked, and it names that recipe (' + t.replace(/\s+/g, ' ') + ')');
  for (const [id, what] of [['zz-rice-ok', 'every part says No allergens'], ['zz-bowl-ok', 'its recipe and its own part are checked'], ['zz-hand', 'allergens set by hand']]) {
    await go(p, '#/r/' + id);
    t = await box(p);
    ok(/None in the ingredients\./.test(t) && !NOT.test(t), what + ': None in the ingredients, nothing not checked (' + t.replace(/\s+/g, ' ') + ')');
  }
  // the head chef's own copies of file recipes
  await go(p, '#/r/mushy-peas');
  t = await box(p);
  ok(/Old copy/.test(await txt(p, '.yield') || '') && !NOT.test(t), 'a copy saved before: the file\'s checks carry over by name (' + t.replace(/\s+/g, ' ') + ')');
  await go(p, '#/r/cowboy-candy');
  t = await box(p);
  ok(/New copy/.test(await txt(p, '.yield') || '') && NOT.test(t) && t.includes(left.name), 'a copy saved by the form with a line not checked: nothing carries onto it (' + t.replace(/\s+/g, ' ') + ')');
  ok(await p.evaluate(() => typeof window.LK_APP.unchecked === 'function' && window.LK_APP.unchecked('zz-rice').join() === 'Long grain rice,Water' && window.LK_APP.unchecked('zz-rice-ok').length === 0), 'the book tells the other pages which parts are not checked');

  // Free from leaves out what nobody checked, on the Pass and in a search
  await go(p, '#/recipes'); await L.settle(p, 300);
  await L.tap(p, '[data-act="amode"][data-val="free"]'); await L.settle(p, 300);
  await L.tap(p, '[data-act="free"][data-val="Gluten"]'); await L.settle(p, 300);
  const shown = () => p.evaluate(() => [...document.querySelectorAll('#shelves a.dish:not(.faded), #results a.tile')].map(a => a.getAttribute('href').slice(4)).filter(id => /^zz-/.test(id)).sort().join());
  let s = await shown();
  ok(s === 'zz-bowl-ok,zz-hand,zz-rice-ok', 'Free from gluten on the Pass: only the checked ones (' + s + ')');
  await L.tap(p, '[data-act="free"][data-val="Gluten"]'); await L.settle(p, 300);
  await p.fill('#find', 'gf zz test'); await L.settle(p, 400);
  s = await shown();
  ok(s === 'zz-bowl-ok,zz-hand,zz-rice-ok', 'a search for gf: only the checked ones (' + s + ')');
  ok(/not checked/i.test(await txt(p, '.s-note') || ''), 'the free-from note says recipes not checked are left out');
  ok(p.errors.length === 0, 'free from: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Contains: a recipe not checked may have it, like a card to come
  p = await L.open(b, '#/recipes', { who: 'bo', extra: Object.assign(cfg(), changes()), wait: 1500 });
  await synced(p); await go(p, '#/recipes'); await L.settle(p, 300);
  await L.tap(p, '[data-act="lens"][data-val="Gluten"]'); await L.settle(p, 300);
  const lit = await p.evaluate(() => [...document.querySelectorAll('#shelves a.dish.lit')].map(a => a.getAttribute('href').slice(4)).filter(id => /^zz-/.test(id)).sort().join());
  ok(lit === 'zz-bowl,zz-rice,zz-slaw', 'Contains gluten: the recipes not checked are marked may have it (' + lit + ')');
  ok(p.errors.length === 0, 'contains: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Tiles: the tile says it too
  p = await L.open(b, '#/recipes', { who: 'bo', extra: Object.assign(cfg(), changes()), wait: 1500, settings: { view: 'tiles' } });
  await synced(p); await go(p, '#/recipes'); await L.settle(p, 300);
  const tile = id => p.evaluate(i => { const a = document.querySelector('#results a.tile[href="#/r/' + i + '"]'); return a ? a.textContent : ''; }, id);
  ok(/Allergens not checked/.test(await tile('zz-rice')) && !/Allergens not checked/.test(await tile('zz-rice-ok')), 'tiles: Allergens not checked on the tile, not on a checked one');
  await p.context().close();

  // the recipe form: No allergens on every ingredient, Not checked on a row with neither, and it is saved
  p = await L.open(b, '#/recipes', { who: 'ann', extra: Object.assign(cfg(), changes()), wait: 1500 });
  await synced(p);
  // a missing control on older code is a failed check, not a crash, so the count says how much failed
  try { await form(p); } catch (e) { ok(false, 'form: ' + String(e.message || e).split('\n')[0]); }
  ok(p.errors.length === 0, 'form: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });

async function form(p) {
  await go(p, '#/manage/r/zz-rice');
  await wait(p, () => !!document.getElementById('mg-name'));
  const sums = () => p.evaluate(() => [...document.querySelectorAll('.mg-ing-sum')].map(s => s.textContent));
  let ss = await sums();
  ok(ss.length === 2 && ss.every(x => /Not checked/.test(x)), 'form: a row with no allergens and no No allergens says Not checked (' + ss.join(' | ') + ')');
  await L.openRow(p, 0);
  const none0 = '[data-mg="none"][data-i="0"]';
  ok(await p.$(none0) !== null && await p.getAttribute(none0, 'aria-pressed') === 'false', 'form: the open row offers No allergens');
  ok(await p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return r.height >= 40; }, none0), 'form: No allergens is as tall as the allergen chips');
  await p.click(none0); await L.settle(p, 200);
  ss = await sums();
  ok(/No allergens/.test(ss[0]) && !/Not checked/.test(ss[0]) && /Not checked/.test(ss[1]), 'form: No allergens checks that row only (' + ss.join(' | ') + ')');
  await L.chapter(p, 'alg');
  ok(/Not checked yet/i.test(await txt(p, '.mg-alg-now') || '') && /Water/.test(await txt(p, '.mg-alg-now') || ''), 'form: The card shows says Water is not checked yet');
  // an allergen and No allergens never stand together: a tag takes No allergens off
  await L.chapter(p, 'ing');
  await L.openRow(p, 1);
  await p.click('[data-mg="none"][data-i="1"]'); await L.settle(p, 200);
  await L.reveal(p, '[data-mg="tag"][data-i="1"]'); await L.choose(p, '[data-mg="tag"][data-i="1"][data-v="Gluten"]'); await L.settle(p, 200);
  ss = await sums();
  ok(/Gluten/.test(ss[1]) && !/No allergens/.test(ss[1]), 'form: an allergen takes No allergens off (' + ss[1] + ')');
  await L.choose(p, '[data-mg="tag"][data-i="1"][data-v="Gluten"]'); await L.settle(p, 200);
  await L.choose(p, '[data-mg="tag"][data-i="1"][data-v="Gluten"]'); await L.settle(p, 200);
  ss = await sums();
  ok(/Not checked/.test(ss[1]), 'form: an allergen tapped back to Not in it leaves the row Not checked, never No allergens by itself (' + ss[1] + ')');
  await p.click('[data-mg="save"]');
  await wait(p, k => { const s = window.__fake.dump()[k]; return !!(s && s.v === 2); }, fsKey(['recipes', 'zz-rice']), 8000);
  const saved = await p.evaluate(k => window.__fake.dump()[k], fsKey(['recipes', 'zz-rice']));
  ok(saved && saved.v === 2 && saved.r.ingredients[0].none === true && !saved.r.ingredients[1].none && !saved.r.ingredients[1].tags, 'save: No allergens is saved on the rice, the water stays not checked (' + JSON.stringify(saved && saved.r.ingredients) + ')');
  await go(p, '#/r/zz-rice');
  const t = await box(p);
  ok(NOT.test(t) && /Water/.test(t) && !/Long grain rice/.test(t), 'the card at once: only the water is not checked (' + t.replace(/\s+/g, ' ') + ')');
}
