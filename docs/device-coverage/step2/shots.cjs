/* Step 2 of the device coverage plan (26 Nov 2026, docs/device-coverage.md): the service pages as the kitchen's
   screens show them, on the click-test stand-in. Synthetic data, made-up people.
     OUT=docs/device-coverage/step2 node docs/device-coverage/step2/shots.cjs   (from the repo root, with the click
     tests' packages installed; CHROME=... as for the click tests in a cloud session)
   A busy afternoon at 14:00: 20 prep lines in five sections, 8 order requests, 6 wastage entries, 3 transfers, three
   functions tonight and a supplier cut-off at 15:00, today's team planned, Cleaning on with its built-in jobs. A cook
   (Ann, staff) on a shared section screen opens the work pages; the sous chef (Sam) opens Today's team. Sizes: the
   section screens' book window as read on 26 Nov 2026 (1920 x 1008) with touch and with a mouse, the test default for
   the kitchen tablet (768 x 1024, touch; not read from the tablet) and a phone (390 x 844, touch). Then a quiet day
   (no functions, no cut-off) at 1920 x 1008 with touch. A picture of what shows without scrolling for each, and
   measurements in metrics.json. */
const path = require('path'), fs = require('fs'), ROOT = process.cwd(), OUT = process.env.OUT || path.join(ROOT, 'docs/device-coverage/step2');
const L = require(path.join(ROOT, 'tests/lib')), server = require(path.join(ROOT, 'tests/serve'));
const M = require(path.join(ROOT, 'js/functions.js')), schedule = require(path.join(ROOT, 'js/cleaning-schedule'));
const K = (...p) => ['kitchens', L.PIN, ...p].join('/'), today = L.ymd(new Date(L.NOW)), t = hm => M.kat(today, M.hmMin(hm));
const P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true });
const next = (new Date(L.NOW).getDay() + 1) % 7, DAY = 86400000, OPEN = 253402178400000;
function fn(id, name, start, round) {
  return M.derive({ v: 1, status: 'confirmed', name, date: today, start: t(start), loc: 'Beer garden', guests: 40, mode: 'all', notes: '', kc: '', kcBy: '', kcAt: 0,
    rounds: [{ at: t(round), note: '' }], lines: [{ rid: 'antipasto-platter', name: 'Antipasto Platter', unit: 'platter', spec: 'Per platter.', fp: '', qty: 2, u: M.toU([2]) }],
    was: {}, chg: [], cBy: 'kit', cAt: L.NOW - DAY, confBy: 'kit', confAt: L.NOW - DAY, by: 'kit', upd: L.NOW - 3600000 });
}
const base = L.seed();
const extra = {
  [K('config', 'main')]: Object.assign({}, base[K('config', 'main')], {
    people: [P('kit', 'Kit', 'head'), P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'staff'), P('bo', 'Bo', 'staff')], headId: 'kit', sousIds: ['kit', 'sam'], pingIds: ['kit', 'sam'],
    staffIds: ['kit', 'sam', 'ann', 'bo'], showBadges: true, staffSee: { cleaning: true },
    kitSecs: [{ id: 'larder', name: 'Larder' }, { id: 'grill', name: 'Grill' }, { id: 'sauce', name: 'Sauce' }, { id: 'fryer', name: 'Fryer' }, { id: 'pastry', name: 'Pastry' }],
    kitShifts: [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'dinner', name: 'Dinner', from: 960, to: 1320 }, { id: 'full', name: 'Full day', from: 600, to: 1320 }],
    cutoffs: [{ id: 'northside', name: 'Northside Test Foods', dd: [next], at: 900, pre: 1, lead: 240 }] }),
  [K('config', 'admins')]: { x: 1, mailOpened: L.NOW },
  [K('pinset', 'kit')]: { at: 1 },
  [K('functions', 'smith')]: fn('smith', 'Smith 50th', '18:00', '18:30'),
  [K('functions', 'jones')]: fn('jones', 'Jones wedding', '18:30', '19:00'),
  [K('functions', 'brown')]: fn('brown', 'Brown wake', '19:00', '19:30')
};
// 14 more prep lines, so the list is a busy afternoon's (20 in all, two urgent, some done)
[['Dice brunoise for the soup', 'Larder', '1 tub'], ['Pickle red onions', 'Larder', '2 jars'], ['Portion barramundi', 'Grill', '24'], ['Marinate chicken thighs', 'Grill', '5 kg', { urgent: true }],
 ['Skewer the lamb', 'Grill', '40'], ['Reduce the jus', 'Sauce', '3 L'], ['Hollandaise', 'Sauce', '1 batch'], ['Blanch chips', 'Fryer', '4 trays'], ['Crumb the calamari', 'Fryer', '3 kg'],
 ['Batter mix', 'Fryer', '2 L', { done: true }], ['Pastry cases', 'Pastry', '30'], ['Lemon curd', 'Pastry', '2 L'], ['Whip the cream', 'Pastry', '1 L', { done: true }], ['Brownie tray', 'Pastry', '2 trays']]
  .forEach(([text, station, qty, x], k) => { extra[K('days', today, 'items', 'b' + k)] = Object.assign({ text, station, qty, recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - (40 - k) * 60000, done: false, deleted: false }, x || {}); });
['Cos lettuce|6 heads', 'Lemons|2 kg', 'Thickened cream|4 L', 'Eggs|10 doz', 'Parmesan|2 kg', 'Fresh dill|4 bunches'].forEach((s, k) => {
  const [text, qty] = s.split('|'); extra[K('orders', today, 'lines', 'b' + k)] = { text, qty, recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - (30 - k) * 60000, ordered: false, deleted: false };
});
[['Rump trim', 1.2, 'kg', 'trim', 'Grill'], ['Hollandaise', 0.5, 'L', 'split', 'Sauce'], ['Bread rolls', 12, 'ea', 'stale', 'Larder'], ['Calamari', 0.8, 'kg', 'dropped', 'Fryer'], ['Cream', 1, 'L', 'expired', 'Pastry']].forEach(([text, amount, unit, reason, station], k) => {
  extra[K('waste', today, 'lines', 'b' + k)] = { text, amount, unit, reason, action: '', station, addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - (20 - k) * 60000, deleted: false };
});
schedule.drafts().concat(schedule.packDownDrafts()).forEach(tk => {
  const id = 'clean-template-' + tk.plan.template;
  extra[K('cleaningTasks', id)] = Object.assign({}, tk, { sectionName: '', root: id, prev: '', next: '', from: L.NOW - 30 * DAY, until: OPEN, at: L.NOW - 31 * DAY, by: 'sam' });
});
extra[K('team', today)] = { day: today, on: [{ id: 'ann', sh: 'lunch', sec: 'larder' }, { id: 'sam', sh: 'lunch', sec: 'grill' }, { id: 'bo', sh: 'full', sec: 'fryer' }, { id: 'kit', sh: 'dinner', sec: 'sauce' }],
  br: [{ id: 'sam', sh: 'lunch', at: 825, len: 45 }, { id: 'bo', sh: 'full', at: 810, len: 30 }], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' };
[['in', 'Riviera', 'Jess', 'Milk', 6, 'L'], ['out', 'Riviera', 'Jess', 'Brioche buns', 2, 'packs'], ['in', 'The Strand', 'Mo', 'Fryer oil', 20, 'L']].forEach(([dir, venue, person, text, amount, unit], k) => {
  extra[K('transfers', today, 'lines', 't' + k)] = { dir, venue, person, text, amount, unit, note: '', addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - (25 - k) * 60000, deleted: false };
});
// a quiet day: the same, without the functions and the cut-off
const quiet = Object.assign({}, extra, { [K('functions', 'smith')]: undefined, [K('functions', 'jones')]: undefined, [K('functions', 'brown')]: undefined,
  [K('config', 'main')]: Object.assign({}, extra[K('config', 'main')], { cutoffs: [] }) });
const PAGES = [
  ['prep', '#/prep', { who: 'ann', deviceMode: 'shared' }], ['orders', '#/orders', { who: 'ann', deviceMode: 'shared' }], ['waste', '#/waste', { who: 'ann', deviceMode: 'shared' }],
  ['transfers', '#/transfers', { who: 'ann', deviceMode: 'shared' }], ['cleaning', '#/cleaning', { who: 'ann', deviceMode: 'shared' }], ['home', '#/', { who: 'ann', deviceMode: 'shared' }],
  ['team', '#/team', { who: 'sam' }], ['recipe', '#/r/laksa', { who: 'ann', deviceMode: 'shared' }]
];
const SIZES = [[1920, 1008, true, '1920-touch', extra], [1920, 1008, false, '1920-mouse', extra], [768, 1024, true, '768', extra], [390, 844, true, '390', extra], [1920, 1008, true, '1920-quiet', quiet]];
// list rows per page, where the page has one (Home, the recipe card and Today's team are not counted)
const ROWS = { prep: '.nb-row', orders: '.nb-row', waste: '.nb-row', transfers: '.nb-row', cleaning: '.cln-row' };
const fonts = p => p.addStyleTag({ content: ['barlow:Barlow:400', 'barlow-600:Barlow:600', 'barlow-700:Barlow:700', 'barlow-condensed:Barlow Condensed:700', 'caveat:Caveat:700']
  .map(f => { const [file, fam, w] = f.split(':'); return "@font-face{font-family:'" + fam + "';font-weight:" + w + ";src:url('/docs/cleaning-chef-options/fonts/" + file + ".woff2') format('woff2')}"; }).join('') })
  .then(() => p.evaluate(() => document.fonts.ready.then(() => true)));
// what a cook sees without scrolling: the page column and the room either side, list rows in view, text sizes
const measure = (p, rowSel) => p.evaluate(rowSel => {
  const vw = innerWidth, vh = innerHeight, col = document.querySelector('.page, .wall-main');
  const cr = col ? col.getBoundingClientRect() : null;
  const seen = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= vh; };
  const rows = rowSel ? [...document.querySelectorAll(rowSel)].filter(e => e.getClientRects().length) : null;
  const sizes = [...document.querySelectorAll('body *')].filter(e => e.childElementCount === 0 && (e.textContent || '').trim().length > 1 && seen(e))
    .map(e => parseFloat(getComputedStyle(e).fontSize)).sort((a, b) => a - b);
  const pick = q => sizes.length ? sizes[Math.min(sizes.length - 1, Math.floor(q * sizes.length))] : 0;
  const bars = [...document.querySelectorAll('.wtop, .rb, header, #fn-band, .fn-band, #cut-band, .cut-band, .tabbar, nav.tabs')].filter(e => e.getClientRects().length && e.getBoundingClientRect().height > 0)
    .map(e => ({ cls: (e.className || e.id || e.tagName).toString().slice(0, 30), top: Math.round(e.getBoundingClientRect().top), h: Math.round(e.getBoundingClientRect().height) }));
  return { vw, vh, column: cr ? { left: Math.round(cr.left), width: Math.round(cr.width) } : null, emptyEachSide: cr ? Math.round(cr.left) : null,
    rows: rows ? rows.length : null, rowsInView: rows ? rows.filter(seen).length : null, firstRowTop: rows && rows.length ? Math.round(rows[0].getBoundingClientRect().top) : null,
    text: { smallest: pick(0), median: pick(0.5), largest: pick(0.999) }, bars, scrollHeight: document.documentElement.scrollHeight };
}, rowSel);
(async () => {
  const port = 20000 + Math.floor(Math.random() * 20000); await new Promise(r => server.listen(port, '127.0.0.1', r));
  const baseUrl = 'http://127.0.0.1:' + port + '/', b = await L.start(), out = {};
  fs.mkdirSync(OUT, { recursive: true });
  for (const [name, hash, o] of PAGES) for (const [w, h, touch, label, data] of SIZES) {
    const p = await L.open(b, hash, Object.assign({ width: w, height: h, touch, base: baseUrl, extra: data, wait: 2200 }, o));
    await fonts(p); await L.settle(p, 600);
    out[name + '-' + label] = Object.assign({ route: hash, errors: p.errors.length, touch }, await measure(p, ROWS[name] || null));
    await p.screenshot({ path: path.join(OUT, name + '-' + label + '.png') });
    await p.context().close();
  }
  fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify(out, null, 1) + '\n');
  await b.close(); server.close(); console.log('pictures and metrics.json in ' + OUT); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
