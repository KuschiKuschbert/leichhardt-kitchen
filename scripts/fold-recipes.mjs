/*
  Fold the head chef's recipe changes back into js/data.js (28 Oct 2026).

  Recipes the head chef changes or adds in the book live in Firestore and are laid over js/data.js (js/overlay.js);
  phones without the kitchen PIN still show js/data.js. This reads a Backup file (the admin Backup button, or the
  decrypted nightly backup) and writes what the book shows into js/data.js, so the file and the book agree.

    node scripts/fold-recipes.mjs <backup.json>            report only: what would change, nothing is written
    node scripts/fold-recipes.mjs <backup.json> --write    write js/data.js

  How it works: js/data.js and js/overlay.js are loaded in node, the Backup's book/index and recipes go through the
  book's own LK_RX.take and LK_RX.apply, and each recipe that differs from the file is written back in the file's own
  layout. Nothing else in the file is touched. The result is loaded again and checked against what the book shows
  before anything is written; if it does not match, nothing is written.

  Kept as they are, and listed in the report:
  - A drawing made in the book (art, side or diagram set to @<drawing id>) cannot live in js/data.js. The file keeps
    its own drawing, and for a plate the file's Pass labels (they belong to the drawing). A new recipe with a book
    drawing comes in with no drawing and no Pass labels.
  - A recipe hidden in the book stays in the file (the report lists it).
  - A recipe the head chef sent back to the file's copy (off) is not changed.
  Where js/data.js changed after the head chef's copy was made, the head chef's copy still wins (it is what staff with
  the kitchen PIN see now); the report lists those so they can be checked.

  The Backup holds the whole kitchen (staff names, pings, minutes): keep it outside the repository and never commit
  it. This script reads only book and recipes from it and prints recipe ids and counts, never the file's other contents.
*/
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HEADER_END = 'yield';
const DEFAULT_ORDER = ['id', 'no', 'kind', 'forLine', 'name', 'short', 'aka', 'avc', 'menu', 'art', 'side', 'diagram', 'yield',
  'ingredients', 'pins', 'sections', 'contains', 'check', 'labelNote', 'tip', 'safety', 'done'];
const LISTED = { ingredients: 1, pins: 1, sections: 1 };   // one element to a line

/* ---------- writing JavaScript in the file's own style ---------- */
function str(s) {
  const esc = t => t.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '');
  if (s.indexOf("'") < 0) return "'" + esc(s) + "'";
  if (s.indexOf('"') < 0) return '"' + esc(s) + '"';
  return "'" + esc(s).replace(/'/g, "\\'") + "'";
}
const keyName = k => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : str(k));
function inline(v) {
  if (v === null) return 'null';
  if (typeof v === 'string') return str(v);
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return '[' + v.map(e => inline(e)).join(', ') + ']';
  const ks = Object.keys(v);
  return ks.length ? '{ ' + ks.map(k => keyName(k) + ': ' + inline(v[k])).join(', ') + ' }' : '{}';
}
export function recipeBlock(r, trailingComma) {
  const keys = Object.keys(r), cut = keys.indexOf(HEADER_END);
  const head = cut < 0 ? keys : keys.slice(0, cut), rest = cut < 0 ? [] : keys.slice(cut);
  const out = ['    {', '      ' + head.map(k => keyName(k) + ': ' + inline(r[k])).join(', ') + (rest.length ? ',' : '')];
  rest.forEach((k, i) => {
    const comma = i < rest.length - 1 ? ',' : '', v = r[k];
    if (LISTED[k] && Array.isArray(v) && v.length) {
      out.push('      ' + k + ': [');
      v.forEach((e, j) => out.push('        ' + inline(e) + (j < v.length - 1 ? ',' : '')));
      out.push('      ]' + comma);
    } else out.push('      ' + keyName(k) + ': ' + inline(v) + comma);
  });
  out.push('    }' + (trailingComma ? ',' : ''));
  return out;
}
function menuLines(menu) {
  return menu.map((sec, i) => '    { title: ' + str(sec.title) + ', ids: ' + inline(sec.ids) + ' }' + (i < menu.length - 1 ? ',' : ''));
}

/* ---------- loading the book's own code ---------- */
function load(repo, dataText) {
  const store = {};
  const ctx = { console: { warn() {}, log() {}, error() {} }, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } } };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(dataText, ctx, { filename: 'data.js' });
  vm.runInContext(fs.readFileSync(path.join(repo, 'js/overlay.js'), 'utf8'), ctx, { filename: 'overlay.js' });
  return ctx;
}
const clone = x => JSON.parse(JSON.stringify(x));
const canon = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.keys(x).sort().reduce((o, n) => { o[n] = x[n]; return o; }, {}) : x));
const isBook = v => typeof v === 'string' && v.charAt(0) === '@';

/* ---------- the fold ---------- */
export function fold(repo, backup, opts) {
  opts = opts || {};
  const dataPath = path.join(repo, 'js/data.js');
  const text = fs.readFileSync(dataPath, 'utf8');
  const ctx = load(repo, text), X = ctx.LK_RX, file = clone(ctx.LK_DATA.recipes), fileMenu = clone(ctx.LK_DATA.menuOrder || []);
  const fileById = {}; file.forEach(r => { fileById[r.id] = r; });
  const report = { changed: [], added: [], hidden: [], bookDrawing: [], newBookDrawing: [], conflicts: [], notRecipe: [], off: [], menu: false, same: 0 };

  const recs = (backup && Array.isArray(backup.recipes) ? backup.recipes : []).filter(d => d && typeof d.id === 'string');
  const index = ((backup && Array.isArray(backup.book) ? backup.book : []).filter(d => d && d.id === 'index')[0]) || { r: {} };
  // the recipes the index lists, as the phone reads them
  const idx = { r: {}, menu: index.menu };
  recs.forEach(d => { idx.r[d.id] = d.v || 0; });
  X.take('', idx, recs.map(d => [d.id, d]));
  X.apply(false);
  const shown = clone(ctx.LK_DATA.recipes), shownMenu = clone(ctx.LK_DATA.menuOrder || []);

  recs.forEach(d => {
    if (d.off) report.off.push(d.id);
    else if (d.removed) { if (fileById[d.id]) report.hidden.push(d.id); }
    else if (!X.tidy(d.r, d.id)) report.notRecipe.push(d.id);
    else if (fileById[d.id] && d.base && d.base !== X.fingerprint(d.id)) report.conflicts.push(d.id);
  });

  // what the file should say for each recipe
  const want = {}, order = [];
  shown.forEach(t => {
    const old = fileById[t.id];
    if (old && canon(X.tidy(clone(old), t.id)) === canon(t)) { report.same++; return; }
    // drawings made in the book stay in the book
    const r = clone(t);
    if (old) {
      let kept = false;
      ['art', 'side', 'diagram'].forEach(k => {
        if (isBook(r[k])) { kept = true; if (old[k] !== undefined) r[k] = old[k]; else delete r[k]; if (k === 'art') r.pins = clone(old.pins || []); }
      });
      if (kept) report.bookDrawing.push(t.id);
      if (canon(X.tidy(clone(old), t.id)) === canon(X.tidy(clone(r), t.id))) { report.same++; return; }
    } else {
      let kept = false;
      ['art', 'side', 'diagram'].forEach(k => { if (isBook(r[k])) { kept = true; delete r[k]; if (k === 'art') r.pins = []; } });
      if (kept) report.newBookDrawing.push(t.id);
    }
    // key order: the file's own order for a recipe in it, then the usual order; empty lists the file did not have stay out
    const keys = (old ? Object.keys(old).filter(k => k in r) : []).concat(DEFAULT_ORDER.filter(k => k in r && !(old && k in old)));
    Object.keys(r).forEach(k => { if (keys.indexOf(k) < 0) keys.push(k); });
    const o = {};
    keys.forEach(k => {
      if (Array.isArray(r[k]) && !r[k].length && old && !(k in old)) return;
      o[k] = r[k];
    });
    want[t.id] = o; order.push(t.id);
    (old ? report.changed : report.added).push(t.id);
  });
  Object.keys(fileById).forEach(id => { if (!shown.some(t => t.id === id) && report.hidden.indexOf(id) < 0) report.hidden.push(id); });

  // the guest menu
  report.menu = canon(shownMenu) !== canon(fileMenu);

  // write the file
  const lines = text.split('\n');
  const blockOf = id => {
    const i = lines.findIndex((l, n) => l.indexOf("      id: '" + id + "',") === 0 && lines[n - 1] === '    {');
    if (i < 0) return null;
    let j = i + 1; while (j < lines.length && lines[j] !== '    }' && lines[j] !== '    },') j++;
    return j < lines.length ? { from: i - 1, to: j, comma: lines[j] === '    },' } : null;
  };
  // from the bottom up, so the line numbers above stay right
  const spots = [];
  order.filter(id => fileById[id]).forEach(id => {
    const b = blockOf(id);
    if (!b) throw new Error('Could not find the block for ' + id + ' in js/data.js.');
    spots.push(Object.assign({ id }, b));
  });
  spots.sort((a, b) => b.from - a.from).forEach(b => { lines.splice(b.from, b.to - b.from + 1, ...recipeBlock(want[b.id], b.comma)); });
  const adds = order.filter(id => !fileById[id]).sort();
  if (adds.length) {
    const end = lines.lastIndexOf('  ]');
    if (end < 0 || lines[end - 1].indexOf('    }') !== 0) throw new Error('Could not find the end of the recipe list in js/data.js.');
    if (lines[end - 1] === '    }') lines[end - 1] = '    },';
    const add = [];
    adds.forEach((id, i) => add.push(...recipeBlock(want[id], i < adds.length - 1)));
    lines.splice(end, 0, ...add);
  }
  if (report.menu) {
    const a = lines.indexOf('  menuOrder: ['), b = a < 0 ? -1 : lines.indexOf('  ],', a);
    if (a < 0 || b < 0) throw new Error('Could not find menuOrder in js/data.js.');
    lines.splice(a + 1, b - a - 1, ...menuLines(shownMenu));
  }
  let out = lines.join('\n');
  const changedAny = order.length > 0 || report.menu;
  if (changedAny && opts.updated) out = out.replace(/^(  updated: )'[^']*'/m, "$1'" + opts.updated + "'");

  // check: load the new file again and compare it with what the book shows
  if (changedAny) {
    const again = load(repo, out), got = again.LK_DATA.recipes, gotMenu = again.LK_DATA.menuOrder || [];
    const tidied = r => canon(again.LK_RX.tidy(clone(r), r.id));
    order.forEach(id => {
      const g = got.filter(r => r.id === id)[0];
      if (!g || tidied(g) !== canon(X.tidy(clone(want[id]), id))) throw new Error('Check failed: ' + id + ' does not read back the same from the new js/data.js. Nothing was written.');
    });
    if (report.menu && canon(gotMenu) !== canon(shownMenu)) throw new Error('Check failed: the menu does not read back the same. Nothing was written.');
    if (got.length !== file.length + adds.length) throw new Error('Check failed: the recipe count is ' + got.length + ', expected ' + (file.length + adds.length) + '. Nothing was written.');
    // recipes not folded are exactly as they were
    file.forEach(r => { if (!want[r.id] && canon(got.filter(x => x.id === r.id)[0]) !== canon(r)) throw new Error('Check failed: ' + r.id + ' changed and should not have. Nothing was written.'); });
  }
  return { text: out, report, changedAny };
}

export function summary(rep) {
  const list = (label, a) => (a.length ? label + ' (' + a.length + '): ' + a.join(', ') : '');
  return [
    'Changed in the book and folded: ' + rep.changed.length + (rep.changed.length ? ' (' + rep.changed.join(', ') + ')' : ''),
    list('New recipes folded', rep.added),
    rep.menu ? 'Guest menu order folded.' : '',
    list('Drawing stays in the book, the file keeps its own drawing and Pass labels', rep.bookDrawing),
    list('New recipe with a drawing made in the book, folded with no drawing and no Pass labels', rep.newBookDrawing),
    list('Hidden in the book, left in js/data.js (decide: remove, or show again)', rep.hidden),
    list('Sent back to the file copy in the book, not changed', rep.off),
    list('Do not look like a recipe, left out', rep.notRecipe),
    list('js/data.js changed after the head chef\'s copy was made; the head chef\'s copy was folded, check these', rep.conflicts),
    'Already the same as the file: ' + rep.same
  ].filter(Boolean).join('\n');
}

/* ---------- command line ---------- */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), write = args.indexOf('--write') >= 0, file = args.filter(a => a.charAt(0) !== '-')[0];
  if (!file) { console.error('Usage: node scripts/fold-recipes.mjs <backup.json> [--write]'); process.exit(2); }
  const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  let backup;
  try { backup = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error('Could not read the backup file as JSON.'); process.exit(2); }
  // kitchen time (Queensland, UTC+10, no daylight saving)
  const q = new Date(Date.now() + 10 * 3600000), months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const updated = q.getUTCDate() + ' ' + months[q.getUTCMonth()] + ' ' + q.getUTCFullYear();
  try {
    const res = fold(repo, backup, { updated });
    console.log(summary(res.report));
    if (!res.changedAny) { console.log('js/data.js already has everything. Nothing to write.'); }
    else if (write) { fs.writeFileSync(path.join(repo, 'js/data.js'), res.text); console.log('Written: js/data.js (updated: ' + updated + '). Run the tests before the pull request.'); }
    else console.log('Report only. Run again with --write to change js/data.js.');
  } catch (e) { console.error(e.message); process.exit(1); }
}
