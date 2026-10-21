/*
  Checks the recipe reader (js/compose.js) on the book's own cards, without a browser: what each card makes, how each
  ingredient is cut and cooked, and the part a dish gets for it. Prints the coverage over every card, the expected
  readings below, and any that do not match.
    node tests/compose-read.js          the summary, the checks and every card
    node tests/compose-read.js slaw     one card in full
  smart.test.js runs the same checks (require('./compose-read').check()).
*/
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
// the book's data, its drawings, the library, the editor (for amounts and recolouring), the matcher and the reader
function load() {
  const win = {}; win.window = win; win.console = { log: console.log, warn: () => {}, error: console.error };
  win.document = { addEventListener() {}, querySelector() { return null; }, body: {} }; win.addEventListener = () => {}; win.location = { hash: '' };
  const ctx = vm.createContext(win);
  const run = f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  run('js/data.js'); run('js/art.js'); run('js/library.js');
  win.LK_LIB.files.forEach(f => { if (fs.existsSync(path.join(ROOT, f))) run(f); });
  const D = win.LK_DATA, byId = {}; D.recipes.forEach(r => { byId[r.id] = r; });
  win.LK_APP = { byId: id => byId[id] || null };
  win.LK_RX = { pristine: id => byId[id] || null, arts: () => [], clean: s => s };
  win.LK_PREP = { book: () => ({ ready: () => Promise.reject(new Error('no book in this test')) }), bookEdit: () => false };
  run('js/draw.js'); run('js/smart.js'); run('js/compose.js');
  return { win, D, byId, C: win.LK_COMPOSE, S: win.LK_SMART, L: win.LK_LIB };
}
// what the head chef's cards say, read by hand: the reader must agree
const EXPECT = {
  'cowboy-candy': { form: 'mixture', wet: true, lines: { 'Jalapeños': { part: 'solid', cut: 'slices' }, 'Turmeric': { part: 'tint' }, 'Mustard seed': { part: 'solid' }, 'Salt': { part: 'hidden' } } },
  'cowboy-butter': { form: 'pat', lines: { 'Butter': { part: 'solid' }, 'Bourbon BBQ dry rub': { part: 'tint' } } },
  'rissole-mix': { form: 'balls', cook: 'baked', raw: true, lines: { 'Lamb mince': { part: 'solid' }, 'Carrots': { part: 'solid' } } },
  'slaw': { form: 'mixture', lines: { 'Carrots': { cut: 'julienne' }, 'Red cabbages': { cut: 'shreds' }, 'White cabbage': { cut: 'shreds' }, 'Corn cobs': { cut: 'kernels', cook: 'charred' } } },
  'mushroom-sauce': { form: 'liquid', lines: { 'Mushrooms': { part: 'solid' }, 'Cooking cream': { part: 'liquid' }, 'Gravy powder': { part: 'liquid' }, 'Cracked black pepper': { part: 'bits' } } },
  'gravy': { form: 'liquid' },
  'green-bowl-mix': { form: 'mixture', lines: { 'Baby spinach': { part: 'solid' }, 'Heirloom cherry tomatoes': { part: 'solid' } } },
  'side-veg': { form: 'mixture', lines: { 'Carrots': { cook: 'steamed' }, 'Cauliflower': { cut: 'florets' }, 'Broccoli': { cut: 'florets' } } },
  'asian-greens': { form: 'mixture', lines: { 'Pak choy': { cook: 'steamed' } } },
  'chilli-jam': { form: 'smooth', lines: { 'Red capsicum': { cook: 'roasted' }, 'Gochujang': { part: 'tint' } } },
  'spinach-puree': { form: 'smooth', lines: { 'Spinach': { cook: 'poached' }, 'Cooking cream': { part: 'liquid' } } },
  'korean-cucumber': { form: 'mixture' },
  'butterscotch': { form: 'liquid' },
  'fried-onions': { form: 'piece', lines: { 'White onions': { cut: 'slices', cook: 'fried' } } },
  'cookie-dough': { form: 'balls', raw: true },
  'chips-salad': { form: 'plate' },
  'wing-flour': { form: 'coat' },
  'corn': { form: 'piece', lines: { 'Corn': { cook: 'charred' } } },
  'seed-granola': { form: 'mixture', lines: { 'Linseeds': { part: 'solid' }, 'Honey': { part: 'liquid' } } },
  'tartare': { bought: true }
};
function line(mo, ing) { return mo.lines.find(L => L.ing === ing || L.ing.indexOf(ing) === 0); }
function check() {
  const { D, C, byId } = load(), errs = [], rows = [];
  let lines = 0, stated = 0, cards = 0, formed = 0;
  D.recipes.forEach(r => {
    const mo = C.read(r);
    cards++; if (mo.form !== 'unknown') formed++;
    mo.lines.forEach(L => { if (L.part === 'hidden') return; lines++; if (L.part !== 'unknown') stated++; });
    rows.push(r.id + ': ' + mo.form + (mo.cook ? ', ' + mo.cook : '') + (mo.wet ? ', wet' : '') + (mo.raw ? ', raw' : '') + ' | ' + mo.lines.filter(L => L.part !== 'hidden').map(L => L.ing + ' ' + L.part + (L.cut ? ' ' + L.cut : '') + (L.cook ? ' ' + L.cook : '')).join('; '));
  });
  Object.keys(EXPECT).forEach(id => {
    const r = byId[id]; if (!r) { errs.push(id + ': no such card'); return; }
    const mo = C.read(r), e = EXPECT[id];
    ['form', 'cook', 'wet', 'raw', 'bought'].forEach(k => { if (e[k] !== undefined && mo[k] !== e[k]) errs.push(id + ': ' + k + ' is ' + mo[k] + ', expected ' + e[k]); });
    Object.keys(e.lines || {}).forEach(ing => {
      const L = line(mo, ing); if (!L) { errs.push(id + ': no line ' + ing); return; }
      Object.keys(e.lines[ing]).forEach(k => { if (L[k] !== e.lines[ing][k]) errs.push(id + ' / ' + ing + ': ' + k + ' is ' + L[k] + ', expected ' + e.lines[ing][k]); });
    });
  });
  return { errs, rows, lines, stated, cards, formed, share: stated / lines, formShare: formed / cards };
}
module.exports = { load, check, EXPECT };
if (require.main === module) {
  const only = process.argv[2];
  if (only) {
    const { C, byId } = load(), mo = C.read(byId[only]);
    console.log(JSON.stringify(mo, (k, v) => (k === 'i' || k === 'sub' || k === 'hw' ? undefined : v), 1));
    return;
  }
  const c = check();
  console.log(c.cards + ' cards, ' + Math.round(c.formShare * 100) + '% read into what they make; ' + c.lines + ' visible ingredient lines, ' + Math.round(c.share * 100) + '% read');
  console.log(c.errs.length ? '\nNot as expected (' + c.errs.length + '):\n' + c.errs.join('\n') : '\nEvery expected reading matches (' + Object.keys(EXPECT).length + ' cards).');
  console.log('\n' + c.rows.join('\n'));
}
