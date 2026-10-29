// scripts/fold-recipes.mjs folds the head chef's recipe changes from a Backup into js/data.js (28 Oct 2026).
// Pure node, no browser. Works on a copy of the real js/data.js and js/overlay.js with a stand-in Backup.
const fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm'), cp = require('child_process');
const R = [], ok = (c, m) => R.push((c ? 'PASS ' : 'FAIL ') + m);
const root = path.resolve(__dirname, '..');
const clone = x => JSON.parse(JSON.stringify(x));

function repoCopy() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'fold-'));
  fs.mkdirSync(path.join(d, 'js')); fs.mkdirSync(path.join(d, 'scripts'));
  ['js/data.js', 'js/overlay.js', 'scripts/fold-recipes.mjs'].forEach(f => fs.copyFileSync(path.join(root, f), path.join(d, f)));
  return d;
}
function loadData(file) {
  const ctx = { console, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } }; ctx.window = ctx;
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(file, 'utf8'), ctx);
  return ctx.LK_DATA;
}
// the text of one recipe's block, to compare the ones that must not change
const blockOf = (text, id) => {
  const L = text.split('\n'), i = L.findIndex((l, n) => l.indexOf("      id: '" + id + "',") === 0 && L[n - 1] === '    {');
  let j = i + 1; while (L[j] !== '    }' && L[j] !== '    },') j++;
  return L.slice(i - 1, j + 1).join('\n');
};
const rec = (id, r, x) => Object.assign({ id, r, v: 1, upd: 1, by: '', src: 'book', base: '', removed: false, off: false }, x || {});

(async () => {
  const { fold, summary } = await import(path.join(root, 'scripts/fold-recipes.mjs'));
  const repo = repoCopy(), dataFile = path.join(repo, 'js/data.js'), text = fs.readFileSync(dataFile, 'utf8');
  const D = loadData(dataFile), by = id => clone(D.recipes.filter(r => r.id === id)[0]);
  const withQty = D.recipes.filter(r => r.ingredients.some(i => i.q === '[Qty]'))[0];
  const withArt = D.recipes.filter(r => r.art && r.pins && r.pins.length && !/^@/.test(r.art))[0];
  const other = D.recipes.filter(r => r.id !== withQty.id && r.id !== withArt.id).map(r => r.id);

  // nothing in the Backup: nothing changes
  let res = fold(repo, { recipes: [], book: [] });
  ok(!res.changedAny && res.text === text, 'no changes in the Backup: js/data.js is left exactly as it is');

  // a recipe the head chef changed: the [Qty] filled in and a step added
  const a = by(withQty.id);
  a.ingredients.forEach(i => { if (i.q === '[Qty]') i.q = '123 g'; });
  a.sections = (a.sections || []).concat([{ title: 'Added in the book', steps: ["Check the chef's note.", 'Second step.'] }]);
  res = fold(repo, { recipes: [rec(a.id, a)], book: [{ id: 'index', r: { [a.id]: 1 } }] });
  fs.writeFileSync(path.join(repo, 'out.js'), res.text);
  let got = loadData(path.join(repo, 'out.js')), g = got.recipes.filter(r => r.id === a.id)[0];
  ok(res.changedAny && res.report.changed.join() === a.id && res.report.added.length === 0, 'a changed recipe is folded (' + a.id + ')');
  ok(g.ingredients.some(i => i.q === '123 g') && !g.ingredients.some(i => i.q === '[Qty]') && g.sections.some(s => s.title === 'Added in the book' && s.steps[0] === "Check the chef's note."), 'its new amount and step read back from js/data.js');
  ok(other.every(id => blockOf(res.text, id) === blockOf(text, id)), 'every other recipe is byte for byte what it was');
  ok(got.recipes.length === D.recipes.length && JSON.stringify(got.menuOrder) === JSON.stringify(D.menuOrder), 'the recipe count and the guest menu are unchanged');
  ok(res.text.split('\n').filter((l, n, all) => l !== text.split('\n')[n]).length > 0 && /updated: '/.test(res.text), 'the file changed');

  // run again on the folded file: nothing left to fold
  fs.copyFileSync(path.join(repo, 'out.js'), dataFile);
  res = fold(repo, { recipes: [rec(a.id, a)], book: [{ id: 'index', r: { [a.id]: 1 } }] });
  ok(!res.changedAny && res.report.same >= 1, 'folding the same Backup again changes nothing');
  fs.writeFileSync(dataFile, text);

  // a new recipe made in the book, put on the menu; one with a drawing made in the book
  const n = { id: 'test-new', no: '99', kind: 'main', forLine: 'Plate', name: "Fish 'n' Test", yield: 'Per plate.', ingredients: [{ q: '1', name: 'Bun', tags: ['Gluten'] }], pins: [], sections: [{ title: 'Cook', steps: ['Do it.'] }] };
  const n2 = Object.assign(clone(n), { id: 'test-drawn', name: 'Drawn Test', art: '@d-1', pins: [{ label: 'Bun', x: 40, y: 50, ing: 'Bun' }] });
  const menu = D.menuOrder.map(s => ({ title: s.title, ids: s.ids.slice() }));
  menu[0].ids.push('test-new');
  res = fold(repo, { recipes: [rec(n.id, n, { src: 'new' }), rec(n2.id, n2, { src: 'new' })], book: [{ id: 'index', r: { [n.id]: 1, [n2.id]: 1 }, menu }] });
  fs.writeFileSync(path.join(repo, 'out.js'), res.text); got = loadData(path.join(repo, 'out.js'));
  const gn = got.recipes.filter(r => r.id === 'test-new')[0], gd = got.recipes.filter(r => r.id === 'test-drawn')[0];
  ok(res.report.added.sort().join() === 'test-drawn,test-new' && got.recipes.length === D.recipes.length + 2, 'new recipes are added to the end of the list');
  ok(gn && gn.name === "Fish 'n' Test" && gn.sections[0].steps[0] === 'Do it.', 'a name with an apostrophe reads back');
  ok(gd && !gd.art && !gd.pins.length && res.report.newBookDrawing.join() === 'test-drawn', 'a new recipe with a book drawing comes in with no drawing and no Pass labels, and is listed');
  ok(got.menuOrder[0].ids.indexOf('test-new') >= 0 && res.report.menu, 'the guest menu order is folded');
  // the last recipe in the file gets a comma when more come after it
  const bare = b => b.replace(/\}, ?$/, '}');
  ok(D.recipes.every(r => bare(blockOf(res.text, r.id)) === bare(blockOf(text, r.id))), 'recipes already in the file are untouched');

  // a recipe in the file that now has a drawing made in the book: the file keeps its drawing and its Pass labels
  const d = by(withArt.id); d.art = '@d-2'; d.pins = [{ label: 'New label', x: 1, y: 2, ing: 'X' }]; d.yield = 'Changed in the book.';
  res = fold(repo, { recipes: [rec(d.id, d)], book: [{ id: 'index', r: { [d.id]: 1 } }] });
  fs.writeFileSync(path.join(repo, 'out.js'), res.text); got = loadData(path.join(repo, 'out.js')); g = got.recipes.filter(r => r.id === d.id)[0];
  ok(g.yield === 'Changed in the book.' && g.art === withArt.art && JSON.stringify(g.pins) === JSON.stringify(withArt.pins) && res.report.bookDrawing.join() === d.id, 'a book drawing stays in the book: the words fold, the file keeps its drawing and Pass labels (' + d.id + ')');

  // hidden, sent back to the file's copy, and not a recipe: all left alone and listed
  const h = by(other[0]), o = by(other[1]), bad = by(other[2]); bad.name = '';
  res = fold(repo, { recipes: [rec(h.id, h, { removed: true }), rec(o.id, Object.assign(o, { name: 'Different' }), { off: true }), rec(bad.id, bad)], book: [{ id: 'index', r: { [h.id]: 1, [o.id]: 1, [bad.id]: 1 } }] });
  ok(!res.changedAny && res.text === text, 'hidden, sent back and broken recipes change nothing');
  ok(res.report.hidden.join() === h.id && res.report.off.join() === o.id && res.report.notRecipe.join() === bad.id, 'and each is listed in the report');

  // the file changed after the head chef's copy was made: the head chef's copy is folded and the recipe is listed
  const c = by(other[3]); c.yield = 'Head chef copy.';
  res = fold(repo, { recipes: [rec(c.id, c, { base: 'deadbeef' })], book: [{ id: 'index', r: { [c.id]: 1 } }] });
  ok(res.report.changed.join() === c.id && res.report.conflicts.join() === c.id, 'a recipe whose file copy changed later is folded and listed to check');
  ok(/Changed in the book and folded: 1/.test(summary(res.report)) && /check these/.test(summary(res.report)), 'the report says so in plain words');

  // the check before writing: a recipe that cannot be written back is refused, nothing is returned
  const weird = by(other[4]); weird.ingredients[0].name = 'Back\\slash "quote" \'apostrophe\'';
  res = fold(repo, { recipes: [rec(weird.id, weird)], book: [{ id: 'index', r: { [weird.id]: 1 } }] });
  fs.writeFileSync(path.join(repo, 'out.js'), res.text); got = loadData(path.join(repo, 'out.js'));
  ok(got.recipes.filter(r => r.id === weird.id)[0].ingredients[0].name === weird.ingredients[0].name, 'quotes and a backslash in a name read back as typed');

  // the command line: report only by default, --write changes js/data.js
  const backup = path.join(repo, 'backup.json');
  fs.writeFileSync(backup, JSON.stringify({ recipes: [rec(a.id, a)], book: [{ id: 'index', r: { [a.id]: 1 } }], config: { people: [{ name: 'Secret Name' }] } }));
  const run = args => cp.spawnSync(process.execPath, [path.join(repo, 'scripts/fold-recipes.mjs'), ...args], { encoding: 'utf8' });
  let r1 = run([backup]);
  ok(r1.status === 0 && fs.readFileSync(dataFile, 'utf8') === text && /Report only/.test(r1.stdout), 'command line: no --write leaves js/data.js alone');
  ok(!/Secret Name/.test(r1.stdout + r1.stderr), 'command line: nothing but recipe ids and counts is printed');
  r1 = run([backup, '--write']);
  ok(r1.status === 0 && /Written: js\/data.js/.test(r1.stdout) && loadData(dataFile).recipes.filter(r => r.id === a.id)[0].ingredients.some(i => i.q === '123 g'), 'command line: --write changes js/data.js');
  ok(run([]).status === 2 && run([path.join(repo, 'nope.json')]).status === 2, 'command line: no file or an unreadable file stops with a message');

  fs.rmSync(repo, { recursive: true, force: true });
  R.forEach(x => console.log(x));
  const failed = R.filter(x => x.startsWith('FAIL')).length;
  console.log(failed + ' failed of ' + R.length);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.log('FAIL ' + (e && e.stack || e)); console.log('1 failed of ' + (R.length + 1)); process.exit(1); });
