/* Screens for docs/allergen-check-options/brief.md, from the click-test stand-in (synthetic recipes, no real data).
   Run from tests/: BASE=http://127.0.0.1:<port>/ node ../docs/allergen-check-options/capture.cjs */
const path = require('path');
const L = require(path.join(process.cwd(), 'lib'));
const out = n => path.join(__dirname, 'previews', n);
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true });
const ing = (name, x) => Object.assign({ q: '1 kg', name }, x || {});
const R0 = [
  { id: 'zz-slaw', no: '902', kind: 'side', forLine: 'Plate', name: 'Apple Slaw', yield: 'Per plate', ingredients: [ing('Red cabbage', { q: '80 g' }), ing('Green apple', { q: '30 g', none: true }), ing('Mayonnaise', { q: '30 g', tags: ['Egg'] })] }
];
const extra = Object.assign({ [fsKey(['config', 'main'])]: { people: [P('ann', 'Ann', 'head'), P('bo', 'Bo', 'staff')], headId: 'ann', sousIds: ['ann'], pingIds: ['ann'], showBadges: true } },
  { [fsKey(['book', 'index'])]: { r: { 'zz-slaw': 1 } }, [fsKey(['recipes', 'zz-slaw'])]: { r: R0[0], v: 1, upd: L.NOW - 3600000, by: 'ann', src: 'new', base: '', removed: false } });
(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/r/zz-slaw', { who: 'bo', extra, width: 390, height: 900, wait: 1500 });
  await L.waitFor(p, () => /Apple Slaw/.test((document.getElementById('rtitle') || {}).textContent || ''), null, 8000);
  await L.settle(p, 400);
  await (await p.$('#r-allergens')).screenshot({ path: out('card-not-checked-390.png') });
  await p.context().close();
  p = await L.open(b, '#/recipes', { who: 'ann', extra, width: 390, height: 900, wait: 1500 });
  await L.waitFor(p, () => !!(window.LK_APP && window.LK_APP.byId('zz-slaw')), null, 8000);
  await p.evaluate(() => { location.hash = '#/manage/r/zz-slaw'; });
  await L.waitFor(p, () => !!document.getElementById('mg-name'), null, 8000);
  await L.openRow(p, 0);
  await (await p.$('.mg-ing.open')).screenshot({ path: out('form-row-not-checked-390.png') });
  await (await p.$('.mg-ings')).screenshot({ path: out('form-rows-390.png') });
  await L.chapter(p, 'alg');
  await (await p.$('.mg-alg-now')).screenshot({ path: out('form-card-shows-390.png') });
  await p.context().close();
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
