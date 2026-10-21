/*
  Measures "Draw it for me"'s matcher (js/smart.js) on the book's own recipes, without a browser: the share of visible
  ingredients on the dishes matched with confidence, and the ones it misses or is unsure of.
    node tests/smart-match.js          the summary and every miss
  smart.test.js runs the same measure (require('./smart-match').measure()).
*/
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
function load() {
  const win = {}; win.window = win; win.console = console;
  const ctx = vm.createContext(win);
  const run = f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  run('js/data.js'); run('js/library.js');
  win.LK_LIB.files.forEach(f => { if (fs.existsSync(path.join(ROOT, f))) run(f); });
  // the parts of the editor js/smart.js uses, as plain stand-ins
  const D = win.LK_DATA, byId = {}; D.recipes.forEach(r => { byId[r.id] = r; });
  win.LK_APP = { byId: id => byId[id] || null };
  win.LK_RX = { pristine: id => byId[id] || null, arts: () => [] };
  win.LK_PREP = { book: () => ({ ready: () => Promise.reject(new Error('no book in this test')) }) };
  win.LK_DRAW = { render: { ingName: i => String(i.name || '').replace(/\s*\([^)]*\)/g, '').trim(), recipeOf: id => byId[id], bbox: () => [0, 0, 1, 1], tintMap: () => ({}) }, amount: () => null, scaleFor: () => 1, state: () => ({}) };
  run('js/smart.js');
  return { win, D };
}
function measure() {
  const { win, D } = load(), S = win.LK_SMART, dishes = D.recipes.filter(r => ['main', 'snack', 'side', 'dessert'].indexOf(r.kind) >= 0);
  let shown = 0, sure = 0;
  const misses = [], unsure = [];
  dishes.forEach(r => (r.ingredients || []).forEach(i0 => S.split(i0).forEach(i => {
    if (S.hidden(i)) return;
    shown++;
    const m = S.matchIng(i, r);
    if (m.id && m.conf >= 0.6) sure++;
    else if (m.id) unsure.push(r.id + ': ' + i.name + ' (best ' + m.id + ', ' + m.conf.toFixed(2) + ')');
    else misses.push(r.id + ': ' + i.name);
  })));
  return { dishes: dishes.length, shown, sure, share: shown ? sure / shown : 0, misses, unsure, S, win };
}
module.exports = { measure, load };
if (require.main === module) {
  const m = measure();
  console.log(m.dishes + ' dishes, ' + m.shown + ' visible ingredients, ' + m.sure + ' matched with confidence (' + Math.round(m.share * 100) + '%)');
  if (m.unsure.length) console.log('\nUnsure (' + m.unsure.length + '):\n' + m.unsure.join('\n'));
  if (m.misses.length) console.log('\nNo match (' + m.misses.length + '):\n' + m.misses.join('\n'));
}
