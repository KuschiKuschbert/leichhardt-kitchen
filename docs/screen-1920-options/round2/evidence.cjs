/* Round 2 evidence for the 1920 screens council (26 Nov 2026, docs/screen-1920-options/brief.md). Run from a checkout of
   main with the click tests' packages installed (CHROME=... in a cloud session):
     OUT=<this folder> node <this file>
   Uses the step 2 busy afternoon (docs/device-coverage/step2/shots.cjs): synthetic data, made-up people. Ann is a cook on
   a shared section screen (on Larder today), Sam the sous chef. Pictures of what shows without scrolling, numbers in
   metrics.json. Nothing here changes the book. */
const path = require('path'), fs = require('fs'), ROOT = process.cwd(), OUT = process.env.OUT || __dirname;
const S = require(path.join(__dirname, '../../device-coverage/step2/shots.cjs'));
const L = require(path.join(ROOT, 'tests/lib')), server = require(path.join(ROOT, 'tests/serve'));
const K = (...p) => ['kitchens', L.PIN, ...p].join('/'), today = L.ymd(new Date(L.NOW)), HOUR = 3600000;
// a long order day: 24 requests (the step 2 day had 8)
const long = Object.assign({}, S.extra);
['Butter', 'Flour', 'Caster sugar', 'Olive oil', 'Rice', 'Coconut milk', 'Limes', 'Coriander', 'Red onions', 'Garlic', 'Ginger', 'Chillies', 'Spring onions', 'Bean sprouts', 'Prawns', 'Chicken thighs', 'Beef mince', 'Brioche buns']
  .forEach((text, k) => { long[K('orders', today, 'lines', 'l' + k)] = { text, qty: '1 box', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - (90 - k) * 60000, ordered: false, deleted: false }; });
const wall = "localStorage.setItem('lk.wall', '1')";
const shot = (p, name) => p.screenshot({ path: path.join(OUT, name + '.png') });
// complete rows in view (not under a bar or a dock), per section heading where the page has them
const rows = (p, sel) => p.evaluate(sel => {
  const hit = (e, x, y) => { const a = document.elementFromPoint(x, y); return !!a && (a === e || e.contains(a)); };
  const all = [...document.querySelectorAll(sel)].filter(e => e.getClientRects().length);
  const whole = e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && hit(e, r.left + 12, r.top + 3) && hit(e, r.left + 12, r.bottom - 3); };
  const hs2 = all.map(e => Math.round(e.getBoundingClientRect().height)).sort((a, b) => a - b);
  return { rows: all.length, whole: all.filter(whole).length, medianRowH: hs2[Math.floor(hs2.length / 2)] || 0, tallestRowH: hs2[hs2.length - 1] || 0 };
}, sel);
// the controls on each row: tick, On it, Urgent, More (the ⋯), and how far the last one sits from the tick
const reach = (p, sel) => p.evaluate(sel => {
  const r = [...document.querySelectorAll(sel)].filter(e => e.getClientRects().length).slice(0, 6);
  return r.map(row => {
    const b = row.querySelector('.nb-box'), m = row.querySelector('.nb-more, [data-p="more"]'), on = row.querySelector('.nb-onbtn'), u = row.querySelector('[data-p="urgent"]');
    const R = e => e && e.getClientRects().length ? e.getBoundingClientRect() : null;
    const br = R(b), mr = R(m);
    return { tick: !!br, onIt: !!R(on), urgent: !!R(u), more: !!mr, tickToMore: br && mr ? Math.round(mr.left - br.right) : null, rowW: Math.round(row.getBoundingClientRect().width) };
  });
}, sel);
const cols = p => p.evaluate(() => {
  const hit = (e, x, y) => { const a = document.elementFromPoint(x, y); return !!a && (a === e || e.contains(a)); };
  return [...document.querySelectorAll('.wb-col')].map(c => {
    const rs = [...c.querySelectorAll('.nb-row')], cr = c.getBoundingClientRect();
    const whole = rs.filter(e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && hit(e, r.left + 12, r.top + 3) && hit(e, r.left + 12, r.bottom - 3); });
    const hs2 = rs.map(e => Math.round(e.getBoundingClientRect().height)).sort((a, b) => a - b);
    return { name: c.getAttribute('aria-label'), x: Math.round(cr.left), w: Math.round(cr.width), top: Math.round(cr.top), rows: rs.length, whole: whole.length,
      medianRowH: hs2[Math.floor(hs2.length / 2)] || 0, more: rs.filter(e => e.querySelector('.nb-more, [data-p="more"]')).length, onIt: rs.filter(e => e.querySelector('.nb-onbtn')).length };
  });
});
const places = p => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('.nb-left .nb-row, .wb-col .nb-row')].filter(e => e.id).map(e => { const r = e.getBoundingClientRect(); return [e.id, [Math.round(r.left), Math.round(r.top)]]; })));
// tick every open line of one section (Fryer: two open lines), wait past the linger, and list the other rows that moved
async function lastLine(p, label, out) {
  const before = await places(p);
  const ids = await p.evaluate(() => [...document.querySelectorAll('.nb-row')].filter(r => /Blanch chips|Crumb the calamari/.test(r.textContent) && !r.classList.contains('is-done')).map(r => r.id));
  // a tap where the line is, with no scroll first (Playwright's click scrolls the row into view, which moved everything)
  const scrolls = () => p.evaluate(() => [Math.round(scrollY), Math.round((document.querySelector('.nb-left .nb-body') || {}).scrollTop || 0)]);
  const s0 = await scrolls();
  for (const id of ids) { await p.evaluate(id => document.querySelector('#' + id + ' .nb-box').click(), id); await L.settle(p, 300); }
  await L.settle(p, 4500);
  const after = await places(p), s1 = await scrolls();
  // the test data starts with no ticks in the last 7 days, so the first tick also draws Top tickers above the book and
  // every row moves down by the same amount (in a kitchen that ticks every day it is already there): that shared move
  // is reported apart; any other move is a row changing place under a finger
  const keys = Object.keys(before).filter(k => after[k] && !ids.includes(k));
  const d = k => (after[k][0] - before[k][0]) + ',' + (after[k][1] - before[k][1]), tally = {};
  keys.forEach(k => { tally[d(k)] = (tally[d(k)] || 0) + 1; });
  const shared = Object.keys(tally).sort((x, y) => tally[y] - tally[x])[0] || '0,0';
  const other = keys.filter(k => d(k) !== shared).map(k => k + ' ' + before[k].join(',') + ' -> ' + after[k].join(','));
  out[label] = { scrollBefore: s0, scrollAfter: s1, ticked: ids.length, otherRows: keys.length, sharedMove: shared, rowsWithSharedMove: tally[shared] || 0, movedOtherwise: other.length, examples: other.slice(0, 8) };
  await shot(p, label);
}
(async () => {
  const port = 20000 + Math.floor(Math.random() * 20000); await new Promise(r => server.listen(port, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + port + '/', b = await L.start(), out = {};
  const open = async (hash, o) => { const p = await L.open(b, hash, Object.assign({ base, wait: 2200, touch: true }, o)); await S.fonts(p); await L.settle(p, 600); return p; };
  const ann = { who: 'ann', deviceMode: 'shared' };
  // 1. Prep at 1920: the notebook (as live now, own section first) and the Wall board, default and Extra large text
  for (const [txt, settings] of [['default', {}], ['xlarge', { text: 'xlarge' }]]) {
    let p = await open('#/prep', Object.assign({ width: 1920, height: 1008, extra: S.extra, settings }, ann));
    out['prep-notebook-' + txt] = Object.assign(await rows(p, '.nb-left .nb-row'), { controls: await reach(p, '.nb-left .nb-row') });
    await shot(p, 'prep-notebook-1920-' + txt); await p.context().close();
    p = await open('#/prep', Object.assign({ width: 1920, height: 1008, extra: S.extra, settings, init: wall }, ann));
    out['prep-wall-' + txt] = { columns: await cols(p), controls: await reach(p, '.wb-col .nb-row') };
    await shot(p, 'prep-wall-1920-' + txt); await p.context().close();
  }
  // 2. a section's last line ticked: does any other row move? (notebook All, and the Wall board)
  // (on Ann's own device: a shared screen asks who did the line first, docs/shared-prep-attribution.md; the layout is the same)
  let p = await open('#/prep', { who: 'ann', width: 1920, height: 1008, extra: S.extra }); await lastLine(p, 'last-line-notebook-1920', out); await p.context().close();
  p = await open('#/prep', { who: 'ann', width: 1920, height: 1008, extra: S.extra, init: wall }); await lastLine(p, 'last-line-wall-1920', out); await p.context().close();
  // 3. Orders: a long order day (24 requests) for the cook and the sous chef, and 18:45 with the 18:30 round due
  for (const [who, mode] of [['ann', 'shared'], ['sam', 'personal']]) {
    p = await open('#/orders', { who, deviceMode: mode, width: 1920, height: 1008, extra: long });
    out['orders-long-' + who] = Object.assign(await rows(p, '.o-main .nb-row'), { controls: await reach(p, '.o-main .nb-row') });
    await shot(p, 'orders-long-1920-' + who); await p.context().close();
  }
  p = await open('#/orders', { who: 'sam', width: 1920, height: 1008, extra: long, clock: L.NOW + 4.75 * HOUR });
  out['orders-long-sam-1845'] = Object.assign(await rows(p, '.o-main .nb-row'), { band: await p.evaluate(() => Math.round((document.getElementById('fn-band') || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height)) });
  await shot(p, 'orders-long-1920-sam-1845'); await p.context().close();
  // 4. a section screen set to 125 % (1536 x 806): Prep and Orders
  for (const [name, hash, data] of [['prep', '#/prep', S.extra], ['orders', '#/orders', long]]) {
    p = await open(hash, Object.assign({ width: 1536, height: 806, extra: data }, ann));
    const sel = name === 'prep' ? '.nb-left .nb-row' : '.o-main .nb-row';
    out[name + '-1536'] = Object.assign(await rows(p, sel), { overflow: await L.overflow(p), controls: await reach(p, sel) });
    await shot(p, name + '-1536'); await p.context().close();
  }
  fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify(out, null, 1) + '\n');
  await b.close(); server.close(); console.log('round 2 evidence in ' + OUT); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
