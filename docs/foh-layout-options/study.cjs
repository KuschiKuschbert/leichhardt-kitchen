/* The front of house layout study (26 Nov 2026, docs/foh-layout-options/brief.md): Fay's booking form and service view
   on the click-test stand-in, today and under each design. Synthetic data, made-up people.
     node docs/foh-layout-options/study.cjs              today's app, into docs/foh-layout-options/today/
     DESIGN=a node docs/foh-layout-options/study.cjs     designs/a.css laid over the app (a preview, never the live
                                                         book), into docs/foh-layout-options/previews/a/
   From the repo root, with the click tests' packages installed (CHROME=... as for the click tests in a cloud session).
   A design is CSS (and at most plain wrappers in the page's own order, designs/<name>.js): it moves the page's own
   pieces and never changes their order in the page.
   The day at 14:00: a birthday 60th with three rounds (14:10, 14:50, 15:30, dietary notes), a club lunch at 14:30 with a
   kitchen comment, a wedding tomorrow and a quiz night in three days. The kitchen has sent two trips of the 60th's first
   round and the club lunch's round; all three wait for front of house to confirm them out (and 0 or 1 waiting, for the
   empty and quiet shelf). Fay works front of house: Functions only, with the Functions tick (she books), on a shared
   screen. Sam, a sous chef, sent the trips. Sizes: the front of house screen (1920 x 1008), at 125 % (1536 x 806), the
   head chef's laptop (1280 x 800, a mouse), the kitchen tablet (768 x 1024) and a phone (390 x 844).
   Out: a picture of what shows without scrolling for each case, study.json with the measurements and the two checks
   that tap (the second Confirm out; the time list above the Save bar), and whether the phone, tablet and kitchen
   pictures are the same pixels as today's. */
const path = require('path'), fs = require('fs'), ROOT = process.cwd(), DESIGN = process.env.DESIGN || '';
// OUTDIR=built measures the book as built (no design laid over it) into built/, against today's pictures (the book
// before the build); today/ is never drawn again once the build is in
const DIR = path.join(ROOT, 'docs/foh-layout-options'), OUT = path.join(DIR, process.env.OUTDIR || (DESIGN ? 'previews/' + DESIGN : 'today'));
const CSS = DESIGN ? fs.readFileSync(path.join(DIR, 'designs', DESIGN + '.css'), 'utf8') : '';
// a design may also put the form's sections in plain wrappers, in the page's own order (what a build would do in
// js/fnedit.js): designs/<name>.js runs once after the page draws, and every picture and check is taken before a redraw
const JSF = DESIGN && fs.existsSync(path.join(DIR, 'designs', DESIGN + '.js')) ? fs.readFileSync(path.join(DIR, 'designs', DESIGN + '.js'), 'utf8') : '';
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
const B60 = { name: 'Birthday 60th', start: '13:45', rounds: ['14:10', '14:50', '15:30'], notes: '3 gluten free, 1 vegan. Nut allergy at table 4.',
  lines: [['antipasto-platter', 'Antipasto Platter', [2, 1, 0]], ['pizza-platter', 'Pizza Platter', [2, 2, 1]]] };
// long content: six kinds in five rounds, and long notes (the form only)
const LONG = Object.assign({}, B60, { guests: 120, rounds: ['14:10', '14:50', '15:30', '16:10', '16:50'],
  notes: '3 gluten free, 1 vegan, 2 no seafood. Nut allergy at table 4: keep the nut free platters apart and label them. The family brings the birthday cake at 15:30; plates and knives from the kitchen.',
  lines: [['antipasto-platter', 'Antipasto Platter', [2, 2, 1, 1, 0]], ['aussie-platter', 'Aussie Platter', [1, 1, 1, 0, 0]], ['pizza-platter', 'Pizza Platter', [2, 2, 2, 1, 1]],
    ['seafood-platter', 'Seafood Platter', [1, 1, 0, 0, 0]], ['vege-platter', 'Vege Platter', [1, 1, 1, 1, 1]], ['yumcha-platter', 'Yum Cha Platter', [0, 2, 2, 2, 0]]] });
const FNS = o => ({
  b60: fn(Object.assign({}, o && o.long ? LONG : B60, o && o.quiet ? { date: M.addDays(today, 5) } : {})),
  club: fn({ name: 'Club lunch', start: '12:00', rounds: ['14:30'], guests: 25, loc: 'Beer garden', lines: [['antipasto-platter', 'Antipasto Platter', [4]]], kc: 'Platters on the side bench.' }),
  wed: fn({ name: 'Wedding reception', date: M.addDays(today, 1), start: '17:30', rounds: ['18:30'], guests: 80 }),
  quiz: fn({ name: 'Quiz night', date: M.addDays(today, 3), start: '18:00', rounds: ['19:00'], guests: 30 })
});
const base = L.seed(), cfgKey = K('config', 'main');
// trips: how many wait for Fay (0, 1, 3 or 4)
function data(trips, o) {
  const fns = FNS(o), x = { [cfgKey]: Object.assign({}, base[cfgKey], {
    people: [P('bo', 'Bo', 'head'), P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'staff'), P('fay', 'Fay', 'staff')], headId: 'bo', sousIds: ['bo', 'sam'], pingIds: ['bo', 'sam'],
    staffIds: ['bo', 'sam', 'ann', 'fay'], fnIds: ['fay'], fnOnlyIds: ['fay'], showBadges: true }) };
  x[K('pinset', 'fay')] = { at: 1 };   // Fay has chosen her PIN
  if (o && o.quiet) delete fns.club;   // a quiet hour: nothing today, the 60th booked for next week, a wedding tomorrow
  Object.keys(fns).forEach(id => { x[K('functions', id)] = fns[id]; });
  const r1 = at(today, '14:10'), rc = at(today, '14:30');
  if (trips >= 1) x[K('fnsent', 'b60_' + r1 + '_t1')] = { fid: 'b60', at: r1, day: today, k: 1, n: { 'antipasto-platter': 1, 'pizza-platter': 1 }, sentAt: L.NOW - 360000, sentBy: 'sam', by: 'sam' };
  if (trips >= 3) {
    x[K('fnsent', 'b60_' + r1 + '_t2')] = { fid: 'b60', at: r1, day: today, k: 2, n: { 'antipasto-platter': 1, 'pizza-platter': 1 }, sentAt: L.NOW - 240000, sentBy: 'sam', by: 'sam' };
    x[K('fnsent', 'club_' + rc + '_t1')] = { fid: 'club', at: rc, day: today, k: 1, n: { 'antipasto-platter': 4 }, sentAt: L.NOW - 60000, sentBy: 'ann', by: 'ann' };
  }
  if (trips >= 4) { const r2 = at(today, '14:50'); x[K('fnsent', 'b60_' + r2 + '_t1')] = { fid: 'b60', at: r2, day: today, k: 1, n: { 'pizza-platter': 1 }, sentAt: L.NOW - 30000, sentBy: 'sam', by: 'sam' }; }
  return x;
}
const FAY = { who: 'fay' }, SIZES = { 1920: [1920, 1008, true], 1536: [1536, 806, true], 1280: [1280, 800, false], 768: [768, 1024, true], 390: [390, 844, true], '1920m': [1920, 1008, false] };
// [picture name, route, size, fixture, options]
const CASES = [];
for (const s of ['1920', '1536', '1280', '768', '390']) CASES.push(['form-' + s, '#/functions/b60', s, data(3)], ['fnnow-' + s, '#/fn/now', s, data(3)]);
CASES.push(['form-1536-xlarge', '#/functions/b60', '1536', data(3), { settings: { text: 'xlarge' } }],
  ['form-long-1280', '#/functions/b60', '1280', data(3, { long: true })], ['form-long-1536', '#/functions/b60', '1536', data(3, { long: true })],
  ['fnnow-1920-t0', '#/fn/now', '1920', data(0)], ['fnnow-1920-t1', '#/fn/now', '1920', data(1)], ['fnnow-1536-t1', '#/fn/now', '1536', data(1)],
  ['fnnow-1920-kitchen', '#/fn/now', '1920', data(3), { who: 'sam' }],
  ['fnnow-1920-t4', '#/fn/now', '1920', data(4)], ['fnnow-1536-t4', '#/fn/now', '1536', data(4)],
  ['form-quiet-1920', '#/functions/b60', '1920', data(0, { quiet: true })], ['form-quiet-1280', '#/functions/b60', '1280', data(0, { quiet: true })]);
// pictures that every design must leave exactly as they are (the form's whole page too, at 390 and 768)
const SAME = ['form-390', 'form-768', 'form-390-whole', 'form-768-whole', 'fnnow-390', 'fnnow-768', 'fnnow-1920-kitchen'];
const fonts = p => p.addStyleTag({ content: ['barlow:Barlow:400', 'barlow-600:Barlow:600', 'barlow-700:Barlow:700', 'barlow-condensed:Barlow Condensed:700', 'caveat:Caveat:700']
  .map(f => { const [file, fam, w] = f.split(':'); return "@font-face{font-family:'" + fam + "';font-weight:" + w + ";src:url('/docs/cleaning-chef-options/fonts/" + file + ".woff2') format('woff2')}"; }).join('') })
  .then(() => p.evaluate(() => document.fonts.ready.then(() => true)));
// what this study asks. The form: are the guests, the platters, the round grid with its times and Placed of booked, the
// notes and Save on the first screen together. The service view: how many waiting trips (with Confirm out) and rounds
// still to go show whole, and where the rounds sit.
const measure = p => p.evaluate(() => {
  const vh = innerHeight, all = q => [...document.querySelectorAll(q)].filter(e => e.getClientRects().length);
  const box = e => { if (!e || !e.getClientRects().length) return null; const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), width: Math.round(r.width), inView: r.top >= 0 && r.bottom <= vh && r.left >= 0 && r.right <= innerWidth }; };
  const band = document.getElementById('fn-band'), common = { screens: +(document.documentElement.scrollHeight / vh).toFixed(2), sideways: document.documentElement.scrollWidth > innerWidth + 1,
    band: band && band.getClientRects().length ? Math.round(band.getBoundingClientRect().bottom) : 0 };
  if (document.querySelector('.fe-bar')) {
    const fields = all('#fe-root input:not([type=hidden]), #fe-root select, #fe-root textarea'), times = all('.fe-grid .fe-time'), lines = all('.fe-line'), bar = document.querySelector('.fe-bar');
    const barTop = bar.getBoundingClientRect().top, seen = e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= barTop && r.left >= 0 && r.right <= innerWidth; };
    const grid = document.querySelector('.fe-grid'), tot = document.querySelector('.fe-grid .fn-tot'), tw = document.querySelector('.fe .fn-tw');
    return Object.assign(common, { barTop: Math.round(barTop), fieldsInView: fields.filter(seen).length, fields: fields.length,
      guests: seen(document.getElementById('fe-guests')), platterRowsInView: lines.filter(seen).length, platterRows: lines.length,
      roundTimesInView: times.filter(seen).length, roundTimes: times.length, placedInView: !!tot && seen(tot), notesInView: seen(document.getElementById('fe-notes')),
      kcInView: seen(document.getElementById('fe-kc')), gridScrolls: !!tw && tw.scrollWidth > tw.clientWidth + 1,
      gridBox: box(grid), guestsBox: box(document.getElementById('fe-guests')), notesBox: box(document.getElementById('fe-notes')),
      // the task: change the guests and round 2's time, then Save (the bar is docked; nothing above it is sticky). 0 scrolls:
      // both in view as the page opens; 1: one scroll brings both into view together; 2: Fay scrolls between them
      task: (() => { const g = document.getElementById('fe-guests').getBoundingClientRect(), t = times[1] && times[1].getBoundingClientRect(); if (!t) return null;
        const top = Math.min(g.top, t.top), bottom = Math.max(g.bottom, t.bottom);
        return { scrolls: seen(document.getElementById('fe-guests')) && seen(times[1]) ? 0 : bottom - top <= barTop - 16 ? 1 : 2, apart: Math.round(bottom - top) }; })() });
  }
  const trips = all('.fn-svc-trip'), rows = all('.fn-svc-row'), outs = all('.fn-svc-trip [data-fn="trip-out"]');
  return Object.assign(common, { trips: trips.length, tripsInView: trips.filter(e => box(e).inView).length, confirmOut: outs.length, confirmOutInView: outs.filter(e => box(e).inView).length,
    rounds: rows.length, roundsInView: rows.filter(e => box(e).inView).length, firstRound: box(rows[0]), shelf: box(document.querySelector('.fn-svc-shelf')),
    diets: all('.fn-svc-diet').length, dietsInView: all('.fn-svc-diet').filter(e => box(e).inView).length,
    // the task: confirm every trip waiting with the next round's countdown in view, as the page opens
    allWithNext: outs.length > 0 && outs.every(e => box(e).inView) && !!rows[0] && !!box(rows[0].querySelector('.fn-svc-cd')) && box(rows[0].querySelector('.fn-svc-cd')).inView });
});
// the second tap: Fay taps Confirm out on the first trip; once it is out, what is under the same spot, and how far did the
// rounds move
async function secondTap(p) {
  const before = await p.evaluate(() => { const b = document.querySelector('.fn-svc-trip [data-fn="trip-out"]'), r = b.getBoundingClientRect(), row = document.querySelector('.fn-svc-row');
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, id: b.getAttribute('data-id'), round: row ? Math.round(row.getBoundingClientRect().top) : null, roundLeft: row ? Math.round(row.getBoundingClientRect().left) : null }; });
  await p.mouse.click(before.x, before.y);
  await L.waitFor(p, id => !document.querySelector('.fn-svc-trip [data-id="' + id + '"]'), before.id, 8000).catch(() => {});
  await L.settle(p, 600);
  const after = await p.evaluate(([x, y, id]) => {
    const a = document.elementFromPoint(x, y), b = a && a.closest('[data-fn]'), row = document.querySelector('.fn-svc-row');
    const t = b && b.closest('.fn-svc-trip'), what = t ? t.querySelector('.fn-svc-th').textContent.replace(/\s+/g, ' ').trim() : '';
    return { gone: !document.querySelector('.fn-svc-trip [data-id="' + id + '"]'), under: b ? b.getAttribute('data-fn') + (what ? ': ' + what : '') : a ? a.tagName.toLowerCase() + '.' + [...a.classList].join('.') : 'nothing',
      round: row ? Math.round(row.getBoundingClientRect().top) : null, roundLeft: row ? Math.round(row.getBoundingClientRect().left) : null, trips: document.querySelectorAll('.fn-svc-trip').length };
  }, [before.x, before.y, before.id]);
  return { confirmed: after.gone, underTheFinger: after.under, roundMovedBy: before.round !== null && after.round !== null ? after.round - before.round : null,
    roundLeftMovedBy: before.roundLeft !== null && after.roundLeft !== null ? after.roundLeft - before.roundLeft : null, tripsLeft: after.trips };
}
// the time list: with a mouse, Event start and First round at open a list of times under the box (18 Nov 2026); scrolled
// to where Fay would have it on the first screen, does all of the list sit above the Save bar
async function timeList(p, id) {
  await p.evaluate(id => { const t = document.getElementById(id), r = t.getBoundingClientRect(), bar = document.querySelector('.fe-bar').getBoundingClientRect();
    if (r.top < 140 || r.bottom > bar.top - 20) window.scrollBy(0, r.top - innerHeight * 0.4); }, id);
  await L.settle(p, 200); await p.click('#' + id); await L.settle(p, 400);
  return p.evaluate(id => {
    const l = document.getElementById('fe-tl'), bar = document.querySelector('.fe-bar'), box = document.getElementById(id);
    if (!l || !l.getClientRects().length) return { open: false };
    const r = l.getBoundingClientRect(), b = bar.getBoundingClientRect(), y = Math.min(r.bottom - 8, innerHeight - 1), hit = document.elementFromPoint(r.left + 12, y);
    return { open: true, boxTop: Math.round(box.getBoundingClientRect().top), listBottom: Math.round(r.bottom), barTop: Math.round(b.top), clearOfBar: r.bottom <= b.top + 1,
      bottomRowTappable: !!(hit && l.contains(hit)) };
  }, id);
}
// the form's order on the screen, in its other states (the keeper's check, 26 Nov 2026): with the Save bar held in the
// flow, the pieces sorted by where they sit (top, then left); a new function, and a new function's draft restored
async function formOrder(p) {
  await p.addStyleTag({ content: '.fe-bar { position: static !important; }' }); await L.settle(p, 200);
  return p.evaluate(() => {
    const w = document.querySelector('#fe-root .fe-wrap'); if (!w) return 'no form';
    const name = e => e.matches('.fe-head') ? 'head' : e.matches('.fe-note') ? 'restored' : e.matches('p.hint') ? 'last changed' : e.matches('.fe-bar') ? 'SAVE BAR' : e.matches('.set-block') ?
      (e.querySelector('#fe-name') ? 'function' : e.querySelector('.fe-lines') ? 'platters' : e.querySelector('.fe-mode') ? 'when' : e.querySelector('#fe-notes') ? 'notes' : e.matches('.fe-kcb') ? 'comment' : 'history') :
      e.matches('.btn-row') ? 'buttons' : e.tagName.toLowerCase() + '.' + [...e.classList].join('.');
    return [...w.querySelectorAll(':scope > *, :scope > .fe-body > *, .fe-out > *, .fe-side > *')].filter(e => !e.matches('.fe-body, .fe-out, .fe-side') && e.getClientRects().length).map(e => ({ n: name(e), r: e.getBoundingClientRect() }))
      .sort((a, b) => Math.round(a.r.top) - Math.round(b.r.top) || a.r.left - b.r.left).map(x => x.n).join(', ');
  });
}
// two pictures the same, pixel for pixel (in the browser: no image package needed)
async function samePixels(b, f1, f2) {
  if (!fs.existsSync(f1) || !fs.existsSync(f2)) return 'missing';
  const a = fs.readFileSync(f1), c = fs.readFileSync(f2);
  if (a.equals(c)) return 'identical';
  const p = await (await b.newContext()).newPage();
  const n = await p.evaluate(async ([x, y]) => {
    const load = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
    const [i, j] = await Promise.all([load(x), load(y)]); if (i.width !== j.width || i.height !== j.height) return -1;
    const px = img => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0); return g.getImageData(0, 0, c.width, c.height).data; };
    const d1 = px(i), d2 = px(j); let k = 0; for (let q = 0; q < d1.length; q += 4) if (d1[q] !== d2[q] || d1[q + 1] !== d2[q + 1] || d1[q + 2] !== d2[q + 2]) k++; return k;
  }, [a.toString('base64'), c.toString('base64')]);
  await p.context().close();
  return n === 0 ? 'identical' : n < 0 ? 'different size' : n + ' pixels differ';
}
if (require.main === module) (async () => {
  const port = 20000 + Math.floor(Math.random() * 20000); await new Promise(r => server.listen(port, '127.0.0.1', r));
  const baseUrl = 'http://127.0.0.1:' + port + '/', b = await L.start(), out = { design: DESIGN || process.env.OUTDIR || 'today', cases: {}, checks: {} };
  fs.mkdirSync(OUT, { recursive: true });
  const open = async (hash, size, extra, o) => {
    const [w, h, touch] = SIZES[size];
    const p = await L.open(b, hash, Object.assign({ deviceMode: 'shared', width: w, height: h, touch, base: baseUrl, extra, wait: 2400 }, FAY, o || {}));
    await fonts(p); await dress(p); await L.settle(p, 700);
    return p;
  };
  for (const [name, hash, size, extra, o] of CASES) {
    const p = await open(hash, size, extra, o);
    out.cases[name] = Object.assign({ errors: p.errors.length }, await measure(p));
    await p.screenshot({ path: path.join(OUT, name + '.png') });
    // the whole page too, for the form and the service view at 1920 and the form on the laptop
    if (['form-1920', 'form-1280', 'fnnow-1920', 'form-390', 'form-768'].includes(name)) await p.screenshot({ path: path.join(OUT, name + '-whole.png'), fullPage: true });
    await p.context().close();
  }
  for (const size of ['1920', '1280']) {
    const p = await open('#/fn/now', size, data(3));
    out.checks['second-tap-' + size] = await secondTap(p); await p.context().close();
  }
  for (const size of ['1920m', '1280']) for (const id of ['fe-startT', 'fe-foodT']) {
    const p = await open('#/functions/b60', size, data(3));
    out.checks['time-list-' + size + '-' + id.slice(3)] = await timeList(p, id); await p.context().close();
  }
  for (const size of ['1920', '1280']) {
    let p = await open('#/functions/b60', size, data(3));
    out.checks['form-order-' + size] = await formOrder(p); await p.context().close();
    p = await open('#/functions/new', size, data(3));
    out.checks['form-order-new-' + size] = await formOrder(p);
    await p.fill('#fe-name', 'Quiz night prizes'); await L.settle(p, 1200);
    await p.reload(); await L.waitFor(p, () => !!document.querySelector('.fe-note'), null, 8000).catch(() => {}); await fonts(p); await dress(p); await L.settle(p, 700);
    out.checks['form-order-new-restored-' + size] = await formOrder(p); await p.context().close();
  }
  // a picture the same as today's is not kept twice: the check says so, and today's picture stands for it
  if (DESIGN || process.env.OUTDIR) for (const n of SAME) { const f = path.join(OUT, n + '.png'), r = out.checks['same-as-today-' + n] = await samePixels(b, f, path.join(DIR, 'today', n + '.png')); if (r === 'identical') fs.unlinkSync(f); }
  fs.writeFileSync(path.join(OUT, 'study.json'), JSON.stringify(out, null, 1) + '\n');
  await b.close(); server.close(); console.log('pictures and study.json in ' + OUT); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
