/* Step 3 of the device coverage plan (26 Nov 2026, docs/device-coverage.md): Functions on the front of house screen, on
   the click-test stand-in. Synthetic data, made-up people.
     OUT=docs/device-coverage/step3 node docs/device-coverage/step3/shots.cjs   (from the repo root, with the click
     tests' packages installed; CHROME=... as for the click tests in a cloud session)
   14:00 on a functions afternoon: a birthday 60th with three rounds (14:10, 14:50, 15:30, dietary notes), a club lunch at
   14:30, a wedding tomorrow and a quiz night in three days; the kitchen has sent the 60th's first round and it waits for
   front of house to confirm it out. Fay works front of house: Functions only, with the Functions tick (she books), on a
   shared screen. Sizes: the front of house screen (1920 x 1080; its window taken as the section screens' 1920 x 1008)
   with touch and with a mouse, the head chef's laptop (1280 x 800) and a phone (390 x 844). Then a quiet day (nothing
   today) at 1920. A picture of what shows without scrolling for each, and measurements in metrics.json. */
const path = require('path'), fs = require('fs'), ROOT = process.cwd(), OUT = process.env.OUT || path.join(ROOT, 'docs/device-coverage/step3');
const L = require(path.join(ROOT, 'tests/lib')), server = require(path.join(ROOT, 'tests/serve'));
const M = require(path.join(ROOT, 'js/functions.js'));
const K = (...p) => ['kitchens', L.PIN, ...p].join('/'), today = L.ymd(new Date(L.NOW)), at = (d, hm) => M.kat(d, M.hmMin(hm));
const P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true });
function fn(o) {
  const date = o.date || today, rounds = (o.rounds || ['18:30']).map(x => ({ at: at(date, x), note: '' }));
  return M.derive({ v: 1, status: 'confirmed', name: o.name, date, start: at(date, o.start || '13:30'), loc: o.loc || 'Function room', guests: o.guests || 40,
    mode: rounds.length > 1 ? 'stag' : 'all', notes: o.notes || '', kc: o.kc || '', kcBy: o.kc ? 'sam' : '', kcAt: o.kc ? L.NOW - 1800000 : 0, rounds,
    lines: (o.lines || [['antipasto-platter', 'Antipasto Platter', [3]]]).map(([rid, name, a]) => ({ rid, name, unit: 'platter', spec: '', fp: '', qty: a.reduce((s, x) => s + x, 0), u: M.toU(a) })),
    was: {}, chg: [], cBy: 'bo', cAt: 1, confBy: 'bo', confAt: 1, by: 'bo', upd: L.NOW - 3600000 });
}
const FNS = {
  b60: fn({ name: 'Birthday 60th', start: '13:45', rounds: ['14:10', '14:50', '15:30'], notes: '3 gluten free, 1 vegan. Nut allergy at table 4.',
    lines: [['antipasto-platter', 'Antipasto Platter', [2, 1, 0]], ['pizza-platter', 'Pizza Platter', [2, 2, 1]]] }),
  club: fn({ name: 'Club lunch', start: '12:00', rounds: ['14:30'], guests: 25, loc: 'Beer garden', lines: [['antipasto-platter', 'Antipasto Platter', [4]]], kc: 'Platters on the side bench.' }),
  wed: fn({ name: 'Wedding reception', date: M.addDays(today, 1), start: '17:30', rounds: ['18:30'], guests: 80 }),
  quiz: fn({ name: 'Quiz night', date: M.addDays(today, 3), start: '18:00', rounds: ['19:00'], guests: 30 })
};
const base = L.seed(), cfgKey = K('config', 'main');
function data(fns) {
  const x = { [cfgKey]: Object.assign({}, base[cfgKey], {
    people: [P('bo', 'Bo', 'head'), P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'staff'), P('fay', 'Fay', 'staff')], headId: 'bo', sousIds: ['bo', 'sam'], pingIds: ['bo', 'sam'],
    staffIds: ['bo', 'sam', 'ann', 'fay'], fnIds: ['fay'], fnOnlyIds: ['fay'], showBadges: true }) };
  x[K('pinset', 'fay')] = { at: 1 };   // Fay has chosen her PIN
  Object.keys(fns).forEach(id => { x[K('functions', id)] = fns[id]; });
  if (fns.b60) { const r1 = at(today, '14:10'); x[K('fnsent', 'b60_' + r1 + '_t1')] = { fid: 'b60', at: r1, day: today, k: 1, n: { 'antipasto-platter': 2, 'pizza-platter': 2 }, sentAt: L.NOW - 300000, sentBy: 'sam', by: 'sam' }; }
  return x;
}
const busy = data(FNS), quiet = data({ wed: FNS.wed, quiz: FNS.quiz });
const PAGES = [['home', '#/'], ['fn', '#/fn'], ['fnnow', '#/fn/now'], ['fnpage', '#/fn/b60'], ['functions', '#/functions'], ['form', '#/functions/b60']];
const SIZES = [[1920, 1008, true, '1920-touch', busy], [1920, 1008, false, '1920-mouse', busy], [1280, 800, false, '1280', busy], [390, 844, true, '390', busy], [1920, 1008, true, '1920-quiet', quiet]];
const ITEMS = { fn: '.fn-list-page .fn-card', fnnow: '.fn-svc-k', fnpage: '.fn-round', functions: '.fe-row, .fn-card', form: 'input, select, textarea' };
const fonts = p => p.addStyleTag({ content: ['barlow:Barlow:400', 'barlow-600:Barlow:600', 'barlow-700:Barlow:700', 'barlow-condensed:Barlow Condensed:700', 'caveat:Caveat:700']
  .map(f => { const [file, fam, w] = f.split(':'); return "@font-face{font-family:'" + fam + "';font-weight:" + w + ";src:url('/docs/cleaning-chef-options/fonts/" + file + ".woff2') format('woff2')}"; }).join('') })
  .then(() => p.evaluate(() => document.fonts.ready.then(() => true)));
const measure = (p, sel) => p.evaluate(sel => {
  const vh = innerHeight, col = document.querySelector('main, .page, .wall-main'), cr = col ? col.getBoundingClientRect() : null;
  const hit = (e, x, y) => { const a = document.elementFromPoint(x, y); return !!a && (a === e || e.contains(a)); };
  const items = sel ? [...document.querySelectorAll(sel)].filter(e => e.getClientRects().length && e.getBoundingClientRect().height > 0) : [];
  const whole = items.filter(e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= vh && hit(e, r.left + Math.min(12, r.width / 2), r.top + Math.min(3, r.height / 2)); });
  const ctl = [...document.querySelectorAll('button, a[href], select, input:not([type=hidden])')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= vh; });
  const small = ctl.filter(e => { const r = e.getBoundingClientRect(); return r.height < 44 || r.width < 44; }).map(e => (e.textContent || e.getAttribute('aria-label') || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 30));
  const bars = [...document.querySelectorAll('.wtop, #fn-band, #cut-band, .tabbar')].filter(e => e.getClientRects().length && e.getBoundingClientRect().height > 0)
    .map(e => ({ cls: (e.id || e.className).toString().slice(0, 24), h: Math.round(e.getBoundingClientRect().height) }));
  return { vw: innerWidth, vh, column: cr ? { left: Math.round(cr.left), width: Math.round(cr.width) } : null, items: items.length, itemsInView: whole.length,
    firstItemTop: items.length ? Math.round(items[0].getBoundingClientRect().top) : null, screens: +(document.documentElement.scrollHeight / vh).toFixed(2),
    controlsInView: ctl.length, under44: small.slice(0, 12), under44Count: small.length, bars, sideways: document.documentElement.scrollWidth > innerWidth + 1 };
}, sel);
if (require.main === module) (async () => {
  const port = 20000 + Math.floor(Math.random() * 20000); await new Promise(r => server.listen(port, '127.0.0.1', r));
  const baseUrl = 'http://127.0.0.1:' + port + '/', b = await L.start(), out = {};
  fs.mkdirSync(OUT, { recursive: true });
  for (const [name, hash] of PAGES) for (const [w, h, touch, label, extra] of SIZES) {
    const p = await L.open(b, hash, { who: 'fay', deviceMode: 'shared', width: w, height: h, touch, base: baseUrl, extra, wait: 2400 });
    await fonts(p); await L.settle(p, 700);
    out[name + '-' + label] = Object.assign({ route: hash, errors: p.errors.length, touch }, await measure(p, ITEMS[name] || null));
    await p.screenshot({ path: path.join(OUT, name + '-' + label + '.png') });
    await p.context().close();
  }
  fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify(out, null, 1) + '\n');
  await b.close(); server.close(); console.log('pictures and metrics.json in ' + OUT); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
