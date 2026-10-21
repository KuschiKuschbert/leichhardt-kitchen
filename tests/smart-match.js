/*
  Measures "Draw it for me"'s matcher (js/smart.js) on the book's own recipes, without a browser: the share of visible
  ingredients on the dishes matched with confidence, the ones drawn from their own recipe card (js/compose.js), and the
  ones it misses or is unsure of.
    node tests/smart-match.js          the summary and every miss
  smart.test.js runs the same measure (require('./smart-match').measure()).
*/
// the book's data, the library, the editor, the matcher and the recipe reader (js/compose.js), as tests/compose-read.js loads them
function load() { return require('./compose-read').load(); }
function measure() {
  const { win, D } = load(), S = win.LK_SMART, C = win.LK_COMPOSE, dishes = D.recipes.filter(r => ['main', 'snack', 'side', 'dessert'].indexOf(r.kind) >= 0);
  let shown = 0, sure = 0, drawn = 0;
  const misses = [], unsure = [], made = [];
  dishes.forEach(r => (r.ingredients || []).forEach(i0 => S.split(i0).forEach(i => {
    if (S.hidden(i)) return;
    shown++;
    const m = S.matchIng(i, r), mk = C.partFor(i, r, m);
    if (mk) made.push(r.id + ': ' + i.name + ' (' + mk.from.join(', ') + ')');
    if (m.id && m.conf >= 0.6) sure++;
    else if (mk) drawn++;
    else if (m.id) unsure.push(r.id + ': ' + i.name + ' (best ' + m.id + ', ' + m.conf.toFixed(2) + ')');
    else misses.push(r.id + ': ' + i.name);
  })));
  return { dishes: dishes.length, shown, sure, share: shown ? sure / shown : 0, drawn: shown ? (sure + drawn) / shown : 0, made, misses, unsure, S, win };
}
module.exports = { measure, load };
if (require.main === module) {
  const m = measure();
  console.log(m.dishes + ' dishes, ' + m.shown + ' visible ingredients, ' + m.sure + ' matched with confidence (' + Math.round(m.share * 100) + '%), ' + Math.round(m.drawn * 100) + '% drawn with the ones drawn from their own recipe card');
  if (m.made.length) console.log('\nDrawn from their own recipe card (' + m.made.length + '):\n' + m.made.join('\n'));
  if (m.unsure.length) console.log('\nUnsure (' + m.unsure.length + '):\n' + m.unsure.join('\n'));
  if (m.misses.length) console.log('\nNo match (' + m.misses.length + '):\n' + m.misses.join('\n'));
}
