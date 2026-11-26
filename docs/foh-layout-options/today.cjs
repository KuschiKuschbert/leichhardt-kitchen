/* The front of house layout study (26 Nov 2026, docs/foh-layout-options/brief.md): Fay's booking form and service view
   on the click-test stand-in, from step 3's fixture (docs/device-coverage/step3/shots.cjs). Synthetic data, made-up people.
     TRIPS=3 node docs/foh-layout-options/today.cjs   (from the repo root, with the click tests' packages installed;
     CHROME=... as for the click tests in a cloud session)
   14:00 on a functions afternoon: a birthday 60th with three rounds (14:10, 14:50, 15:30, dietary notes), a club lunch at
   14:30 with a kitchen comment, a wedding tomorrow and a quiz night in three days. The kitchen has sent two trips of the
   60th's first round and (TRIPS=3) the club lunch's round; all wait for front of house to confirm them out. Fay works front
   of house: Functions only, with the Functions tick (she books), on a shared screen. Sizes: the front of house screen
   (1920 x 1008), at 125 % (1536 x 806), the head chef's laptop (1280 x 800, a mouse), the kitchen tablet (768 x 1024) and
   a phone (390 x 844). A picture of what shows without scrolling for each, and measurements in metrics.json.
   DESIGN=<name> lays docs/foh-layout-options/designs/<name>.css over the app (a preview, never the live book) and writes
   to docs/foh-layout-options/previews/<name>/. */
const path = require('path'), fs = require('fs'), ROOT = process.cwd(), DESIGN = process.env.DESIGN || '';
const OUT = process.env.OUT || path.join(ROOT, 'docs/foh-layout-options', DESIGN ? 'previews/' + DESIGN : 'today');
const CSS = DESIGN ? fs.readFileSync(path.join(ROOT, 'docs/foh-layout-options/designs', DESIGN + '.css'), 'utf8') : '';
// a design may also regroup the page's own pieces (what a build would do in the HTML strings): designs/<name>.js runs in
// the page after it draws, and again after each redraw
const JSF = DESIGN && fs.existsSync(path.join(ROOT, 'docs/foh-layout-options/designs', DESIGN + '.js')) ? fs.readFileSync(path.join(ROOT, 'docs/foh-layout-options/designs', DESIGN + '.js'), 'utf8') : '';
const dress = async p => { if (CSS) await p.addStyleTag({ content: CSS }); if (JSF) await p.evaluate(JSF); };
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
  if (fns.b60) { const r1 = at(today, '14:10'); x[K('fnsent', 'b60_' + r1 + '_t1')] = { fid: 'b60', at: r1, day: today, k: 1, n: { 'antipasto-platter': 1, 'pizza-platter': 1 }, sentAt: L.NOW - 360000, sentBy: 'sam', by: 'sam' };
    x[K('fnsent', 'b60_' + r1 + '_t2')] = { fid: 'b60', at: r1, day: today, k: 2, n: { 'antipasto-platter': 1, 'pizza-platter': 1 }, sentAt: L.NOW - 240000, sentBy: 'sam', by: 'sam' }; }
  if (fns.club && process.env.TRIPS === '3') { const r = at(today, '14:30'); x[K('fnsent', 'club_' + r + '_t1')] = { fid: 'club', at: r, day: today, k: 1, n: { 'antipasto-platter': 4 }, sentAt: L.NOW - 60000, sentBy: 'ann', by: 'ann' }; }
  return x;
}
const busy = data(FNS), quiet = data({ wed: FNS.wed, quiz: FNS.quiz });
const PAGES = [['fnnow', '#/fn/now'], ['form', '#/functions/b60']];
// the kitchen's view of the same moment (Sam, who sent the 60th's trips), for comparison: rounds left, shelf right from 1100 px
const KITCHEN = [['fnnow-1920-kitchen', '#/fn/now', 'sam', 1920, 1008, true]];
const SIZES = [[1920, 1008, true, '1920', busy], [1536, 806, true, '1536', busy], [1280, 800, false, '1280', busy], [768, 1024, true, '768', busy], [390, 844, true, '390', busy]];
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
    controlsInView: ctl.length, under44: small.slice(0, 12), under44Count: small.length, bars, sideways: document.documentElement.scrollWidth > innerWidth + 1, study: study() };
  // what this study asks: on the form, are the guests, the platters, the round times, the notes and Save on the first
  // screen together; on the service view, how many waiting trips (with Confirm out) and rounds still to go show whole
  function study() {
    const box = e => { if (!e || !e.getClientRects().length) return null; const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), inView: r.top >= 0 && r.bottom <= vh }; };
    const all = q => [...document.querySelectorAll(q)].filter(e => e.getClientRects().length);
    if (document.querySelector('.fe-bar')) {
      const times = all('.fe-time'), lines = all('.fe-line');
      return { guests: box(document.getElementById('fe-guests')), firstPlatter: box(lines[0]), lastPlatter: box(lines[lines.length - 1]),
        firstTime: box(times[0]), lastRoundTime: box(times[times.length - 1]), notes: box(document.getElementById('fe-notes')), kc: box(document.getElementById('fe-kc')),
        bar: box(document.querySelector('.fe-bar')), platterRowsInView: lines.filter(e => box(e).inView).length, platterRows: lines.length,
        timesInView: times.filter(e => box(e).inView).length, times: times.length };
    }
    const trips = all('.fn-svc-trip'), rows = all('.fn-svc-row'), outs = all('.fn-svc-trip [data-fn="trip-out"]');
    return { trips: trips.length, tripsInView: trips.filter(e => box(e).inView).length, confirmOut: outs.length, confirmOutInView: outs.filter(e => box(e).inView).length,
      rounds: rows.length, roundsInView: rows.filter(e => box(e).inView).length, firstRound: box(rows[0]), shelf: box(document.querySelector('.fn-svc-shelf')),
      diets: all('.fn-svc-diet').length, dietsInView: all('.fn-svc-diet').filter(e => box(e).inView).length };
  }
}, sel);
if (require.main === module) (async () => {
  const port = 20000 + Math.floor(Math.random() * 20000); await new Promise(r => server.listen(port, '127.0.0.1', r));
  const baseUrl = 'http://127.0.0.1:' + port + '/', b = await L.start(), out = {};
  fs.mkdirSync(OUT, { recursive: true });
  for (const [name, hash] of PAGES) for (const [w, h, touch, label, extra] of SIZES) {
    const p = await L.open(b, hash, { who: 'fay', deviceMode: 'shared', width: w, height: h, touch, base: baseUrl, extra, wait: 2400 });
    await fonts(p); await dress(p); await L.settle(p, 700);
    out[name + '-' + label] = Object.assign({ route: hash, errors: p.errors.length, touch }, await measure(p, ITEMS[name] || null));
    await p.screenshot({ path: path.join(OUT, name + '-' + label + '.png') });
    await p.context().close();
  }
  for (const [label, hash, who, w, h, touch] of KITCHEN) {
    const p = await L.open(b, hash, { who, deviceMode: 'shared', width: w, height: h, touch, base: baseUrl, extra: busy, wait: 2400 });
    await fonts(p); await dress(p); await L.settle(p, 700);
    out[label] = Object.assign({ route: hash, errors: p.errors.length, touch }, await measure(p, null));
    await p.screenshot({ path: path.join(OUT, label + '.png') });
    await p.context().close();
  }
  fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify(out, null, 1) + '\n');
  await b.close(); server.close(); console.log('pictures and metrics.json in ' + OUT); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
