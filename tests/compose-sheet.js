/*
  Every recipe drawn by Draw it for me next to the book's own drawing of it, for checking by eye
  (tests/shots/compose-sheet.png and .html). Dishes on their plate, batch recipes in their GN pan.
    cd tests && node compose-sheet.js              all 120 recipes
    cd tests && node compose-sheet.js burger slaw  only those
  It serves the repository like the click tests (port 8777) and draws each recipe in the drawing editor with the
  stand-in for Firebase, so nothing is saved. CHROME=/path/to/chrome as for the click tests. It also prints how many
  recipes were drawn with nothing left to pick.
*/
const L = require('./lib'), server = require('./serve'), fs = require('fs'), path = require('path'), vm = require('vm');
const out = path.join(__dirname, 'shots'); fs.mkdirSync(out, { recursive: true });
const ROOT = path.resolve(__dirname, '..');
const want = process.argv.slice(2);
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true });
const cfg = () => ({ [fsKey(['config', 'main'])]: { people: [P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'head'), P('bo', 'Bo', 'staff')], headId: 'ann', sousIds: ['sam', 'ann'], pingIds: ['sam', 'ann'], showBadges: true } });
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
(async () => {
  const win = {}; win.window = win; vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'js/art.js'), 'utf8'), vm.createContext(win));
  const recipes = win.LK_DATA.recipes.filter(r => !want.length || want.indexOf(r.id) >= 0), A = win.LK_ART;
  await new Promise(r => server.listen(8777, '127.0.0.1', r));
  const b = await L.start();
  let cells = '', clean = 0;
  for (const r of recipes) {
    const slot = /^(batch|component)$/.test(r.kind) ? 'pan' : 'plate';
    const p = await L.open(b, '#/manage/draw/new/' + r.id + '/' + slot, { who: 'ann', extra: cfg(), wait: 600, width: 1280, height: 900 });
    let svg = '', unsure = [], err = '';
    try {
      await L.waitFor(p, () => !!document.querySelector('[data-dw="sm-draw"]'), null, 20000);
      await p.click('[data-dw="sm-draw"]');
      await L.waitFor(p, () => window.LK_DRAW.state().d.els.length > 0 && !!document.querySelector('.dw-smart-note'), null, 10000);
      const got = await p.evaluate(() => { const W = window.LK_DRAW.state(), d = W.d, R = window.LK_DRAW.render; return { svg: '<svg viewBox="' + R.viewBoxOf(d) + '" width="220" height="220"><g data-surf="1">' + R.svgS(d) + '</g>' + R.svgF(d) + '</svg>', unsure: (W.smart && W.smart.unsure || []).map(u => u.ing) }; });
      svg = got.svg; unsure = got.unsure;
    } catch (e) { err = String(e.message || e).split('\n')[0]; }
    if (svg && !unsure.length) clean++;
    const art = slot === 'pan' ? A.pans[r.art] || A.plates[r.art] : A.plates[r.art] || A.pans[r.art];
    const vb = slot === 'pan' && A.pans[r.art] ? '0 0 200 140' : '2 16 212 212';
    cells += '<div class="c"><b>' + esc(r.name) + '</b> <small>' + esc(r.id) + '</small>' + (unsure.length ? '<br><small class="u">To pick: ' + esc(unsure.join(', ')) + '</small>' : '') + (err ? '<br><small class="u">' + esc(err) + '</small>' : '') +
      '<div class="two"><svg viewBox="' + vb + '" width="220" height="220">' + (art || '') + '</svg>' + (svg || '<div class="none"></div>') + '</div></div>';
    await p.context().close();
    process.stdout.write('.');
  }
  const html = '<!doctype html><meta charset="utf-8"><title>Drawn from the recipe</title><style>body{font:12px sans-serif;background:#eee;margin:8px}h1{font-size:16px}.g{display:flex;flex-wrap:wrap;gap:8px}.c{background:#fff;padding:6px;width:452px}.two{display:flex;gap:4px}svg,.none{border:1px solid #ddd;background:#fff;width:220px;height:220px}.u{color:#C2451A}</style>' +
    '<h1>The book\'s own drawing (left) and the one Draw it for me makes from the recipe (right): ' + clean + ' of ' + recipes.length + ' drawn with nothing left to pick</h1><div class="g">' + cells + '</div>';
  fs.writeFileSync(path.join(out, 'compose-sheet.html'), html);
  const p = await b.newPage({ viewport: { width: 1420, height: 900 } });
  await p.goto('file://' + path.join(out, 'compose-sheet.html'));
  await p.screenshot({ path: path.join(out, 'compose-sheet.png'), fullPage: true });
  console.log('\n' + clean + ' of ' + recipes.length + ' recipes drawn with nothing left to pick -> ' + path.join(out, 'compose-sheet.png'));
  await b.close(); server.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
