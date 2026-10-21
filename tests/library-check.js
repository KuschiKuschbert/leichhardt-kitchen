/*
  Checks the drawing library without a browser: every item has the fields js/library.js asks for, ids are unique,
  every piece draws, and every drawing uses only the plain SVG the saved drawings allow (no ids, links, scripts,
  gradients or patterns). Prints the counts per category.
    node tests/library-check.js          all categories
    node tests/library-check.js meat     one category (the others still load, for unique ids)
  library.test.js runs the same checks (require('./library-check').check()).
*/
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const FORMS = ['piece', 'slices', 'pile', 'scatter', 'pool', 'swoosh', 'dots', 'drizzle', 'mound', 'quenelle', 'scoop', 'leaf', 'wedge', 'ring', 'layer', 'stack', 'bowlful', 'whole', 'smear', 'dollop', 'stick', 'cluster', 'fan', 'half', 'sprig', 'shard', 'parcel', 'skewer', 'portion', 'line'];
const SIDES = ['mound', 'slab', 'layer', 'scoop', 'pile', 'disc', 'sauce', 'stick', 'leafy', 'ring', 'cup', 'wedge'];
const TAGS = ['g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon'];
const ATTRS = ['d', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'points', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-opacity', 'fill-opacity', 'fill-rule', 'opacity', 'transform'];

function load() {
  const win = {}; win.window = win; win.console = { log: console.log, warn: () => {}, error: console.error };
  const ctx = vm.createContext(win);
  const run = f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  run('js/library.js');
  const missing = [];
  win.LK_LIB.files.forEach(f => { if (fs.existsSync(path.join(ROOT, f))) run(f); else missing.push(f); });
  return { L: win.LK_LIB, missing };
}
// the plain-SVG rule (the same one the book's sanitiser keeps to)
function svgProblems(s) {
  const out = [];
  if (/<\s*(script|style|use|image|foreignObject|defs|linearGradient|radialGradient|pattern|clipPath|mask|filter|a|text|tspan)\b/i.test(s)) out.push('a tag that is not allowed');
  if (/\sid\s*=|\shref\s*=|xlink:|url\s*\(|javascript:|\son[a-z]+\s*=/i.test(s)) out.push('an id, link, url() or event');
  if (/—/.test(s)) out.push('an em dash');
  const tags = s.match(/<([a-zA-Z]+)/g) || [];
  tags.forEach(t => { if (TAGS.indexOf(t.slice(1)) < 0) out.push('tag ' + t.slice(1)); });
  const attrs = s.match(/\s([a-zA-Z:-]+)="/g) || [];
  attrs.forEach(a => { const k = a.trim().slice(0, -2); if (ATTRS.indexOf(k) < 0) out.push('attribute ' + k); });
  if (/NaN|undefined|Infinity/.test(s)) out.push('NaN or undefined in the numbers');
  return Array.from(new Set(out));
}
function check(only) {
  const { L, missing } = load(), errs = [], seen = {};
  L.items.forEach(it => {
    if (only && it.cat !== only) return;
    const e = m => errs.push(it.cat + '/' + it.id + ': ' + m);
    if (!/^[a-z0-9][a-z0-9-]{0,47}$/.test(it.id || '')) e('id must be lower case words joined by -');
    if (seen[it.id]) e('id used twice'); seen[it.id] = 1;
    if (!it.name || it.name.length > 60 || /—/.test(it.name)) e('name missing, over 60 characters or with an em dash');
    if (!it.sub) e('no sub');
    if (FORMS.indexOf(it.form) < 0) e('form ' + it.form + ' is not one of ' + FORMS.join(', '));
    if (!L.roles[it.role]) e('role ' + it.role + ' is not one of ' + Object.keys(L.roles).join(', '));
    if (!(it.g > 0) && !(it.n > 0)) e('needs g (grams) or n (pieces)');
    if (!(it.w > 0 && it.h > 0)) e('needs w and h');
    if (!it.side || SIDES.indexOf(it.side.s) < 0 || !(it.side.h > 0) || !/^#[0-9A-F]{6}$/i.test(it.side.c || '')) e('side must be { s: ' + SIDES.join('|') + ', h, c: #RRGGBB }');
    if (it.of && !L.get(it.of)) e('of ' + it.of + ' is not an item');
    if (typeof it.kw !== 'string' || /—/.test(it.kw)) e('kw must be a string of words');
    if (typeof it.draw !== 'function') { e('no draw'); return; }
    const b = L.body(it.id);
    if (!b) e('did not draw');
    else {
      if (b.length > 60000) e('drawing over 60 kB (' + b.length + ')');
      svgProblems(b).forEach(p => e(p));
    }
  });
  (L.dupes || []).forEach(d => { if (!only || d.indexOf(only + '/') === 0) errs.push(d + ': id used twice, the second one is left out'); });
  const counts = {};
  L.cats.forEach(c => { counts[c.id] = { items: L.items.filter(it => it.cat === c.id).length, distinct: L.distinct(c.id) }; });
  return { L, errs, counts, missing };
}
module.exports = { check, load, svgProblems, FORMS, SIDES };
if (require.main === module) {
  const only = process.argv[2], r = check(only);
  Object.keys(r.counts).forEach(c => { if (!only || c === only) console.log(c + ': ' + r.counts[c].items + ' items, ' + r.counts[c].distinct + ' distinct'); });
  console.log('total: ' + r.L.items.length + ' items, ' + r.L.distinct() + ' distinct' + (r.missing.length ? ' (not written yet: ' + r.missing.join(', ') + ')' : ''));
  if (r.errs.length) { console.log(r.errs.length + ' problems:\n' + r.errs.slice(0, 80).join('\n')); process.exitCode = 1; } else console.log('no problems');
}
