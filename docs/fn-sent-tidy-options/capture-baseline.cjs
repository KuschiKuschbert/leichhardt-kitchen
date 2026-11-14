/* Baseline for the "function sent, lines off" council (14 Nov 2026). Opens the real book in the click-test stand-in
   (no Firebase, nothing written to the real book) with made-up people and one made-up function, Smith 60th, today at
   lunch: two rounds, both ticked Sent; one platter prep line ticked, one still open; its Function stock order line rolled
   over twice and never ticked; two ingredient lines added yesterday from What the platters need, rolled over once.
   Saves screenshots at 390 px, static snapshots (scripts removed) the design previews start from, and measurements.
   Run from tests/: cp ../docs/fn-sent-tidy-options/capture-baseline.cjs zz-fst.test.js && BASE=... npm test -- zz-fst; rm zz-fst.test.js */
const path = require('path'), fs = require('fs');
const root = path.resolve(process.cwd(), '..');
const L = require(path.join(root, 'tests/lib')), M = require(path.join(root, 'js/functions.js'));
const out = path.join(root, 'docs/fn-sent-tidy-options/baseline');
fs.mkdirSync(out, { recursive: true });
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW)), yday = M.addDays(today, -1), at = (d, hm) => M.kat(d, M.hmMin(hm));
const rounds = [at(today, '12:00'), at(today, '12:45')];
const smith = M.derive({ v: 1, status: 'confirmed', name: 'Smith 60th', date: today, start: at(today, '11:30'), loc: 'Function room', guests: 60,
  mode: 'stag', notes: '', kc: '', kcBy: '', kcAt: 0, rounds: rounds.map(r => ({ at: r, note: '' })), od: M.addDays(today, -2),
  lines: [['aussie-platter', 'Aussie Platter', [3, 2]], ['pizza-platter', 'Pizza Platter', [2, 3]]].map(([rid, name, a]) => ({ rid, name, unit: 'platter', spec: '', fp: '', qty: a[0] + a[1], u: M.toU(a) })),
  was: {}, chg: [], cBy: 'sam', cAt: 1, confBy: 'sam', confAt: 1, by: 'sam', upd: L.NOW - 3 * 86400000 });
function extra(sent) {
  const e = { [key(['functions', 'smith'])]: smith };
  smith.lines.forEach((l, k) => {
    const b = M.prepBody(smith, l, 'smith');
    e[key(['days', today, 'items', 'fn-smith-' + l.rid])] = Object.assign({}, b, { deleted: false, addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 3 * 86400000, done: k === 0 },
      k === 0 ? { doneBy: 'Ann', doneById: 'ann', doneAt: at(today, '11:40') } : {});
  });
  const ob = M.orderBody(smith, 'smith');
  e[key(['orders', today, 'lines', 'r' + today.replace(/-/g, '') + '-fn-smith'])] = { text: ob.text, qty: ob.qty, recipes: ob.recipes, addedBy: 'Rolled over', addedById: '', addedAt: L.NOW - 8 * 3600000,
    ordered: false, deleted: false, rolled: 2, root: 'fn-smith', from: 'fn-smith', rolledFrom: yday, origBy: 'Sam', origAt: L.NOW - 3 * 86400000 };
  [['Party pies', '50'], ['Sausage rolls', '50']].forEach(([text, qty], k) => {
    e[key(['days', today, 'items', 'r' + today.replace(/-/g, '') + '-need' + k])] = { text, qty, station: 'Larder', recipe: '', addedBy: 'Rolled over', addedById: '', addedAt: L.NOW - 8 * 3600000,
      done: false, deleted: false, rolled: 1, root: 'need' + k, from: 'need' + k, rolledFrom: yday, origBy: 'Ann', origAt: L.NOW - 26 * 3600000 };
  });
  if (sent) rounds.forEach((r, i) => { e[key(['fnsent', 'smith_' + r])] = { fid: 'smith', at: r, day: today, sent: true, sentAt: r + (2 + i) * 60000, sentBy: 'ann', by: 'ann' }; });
  return e;
}
async function snap(p, name) {
  const html = await p.evaluate(() => {
    const d = document.documentElement.cloneNode(true);
    d.querySelectorAll('script, link[rel="manifest"], link[rel="preconnect"], meta[http-equiv]').forEach(e => e.remove());
    return '<!doctype html>\n' + d.outerHTML;
  });
  const fixed = html.replace('<head>', '<head><base href="../../../">').replace(/<link[^>]+fonts\.googleapis[^>]+>/g, '<link rel="stylesheet" href="docs/order-list-options/assets/fonts.css">');
  fs.writeFileSync(path.join(out, name + '.html'), fixed);
}
async function measure(p) {
  return p.evaluate(() => {
    const vh = innerHeight, vis = s => [...document.querySelectorAll(s)].filter(e => { const r = e.getBoundingClientRect(); return r.height && r.top >= 0 && r.bottom <= vh; }).length;
    const tab = document.querySelector('.nb-tab-fn');
    return { rowsInView: vis('.nb-row'), rowsTotal: document.querySelectorAll('.nb-row').length, fnTab: tab ? tab.textContent.trim() : null,
      text: [...document.querySelectorAll('.nb-row')].map(r => r.textContent.replace(/\s+/g, ' ').trim().slice(0, 90)), overflow: document.documentElement.scrollWidth - innerWidth };
  });
}
(async () => {
  const b = await L.start(), notes = [];
  const runs = [['prep-all', '#/prep', 'ann', null], ['prep-functions', '#/prep', 'ann', '.nb-tab-fn'], ['orders-sous', '#/orders', 'sam', null], ['service-view', '#/fn/now', 'ann', null], ['function-page', '#/fn/smith', 'ann', null]];
  for (const [name, hash, who, click] of runs) {
    const p = await L.open(b, hash, { who, extra: extra(true), width: 390, height: 844, wait: 2500 });
    await L.settle(p, 1500);
    if (click) { await p.click(click); await L.settle(p, 800); }
    notes.push({ name, hash, who, ...(await measure(p)) });
    await p.screenshot({ path: path.join(out, name + '.png') });
    await p.screenshot({ path: path.join(out, name + '-full.png'), fullPage: true });
    await snap(p, name);
    await p.context().close();
  }
  fs.writeFileSync(path.join(out, 'measurements.json'), JSON.stringify({ source: 'Implemented app (main 6f706fe), click-test stand-in, synthetic data, 390 x 844, ' + today + ' 14:00 Queensland', notes }, null, 2) + '\n');
  console.log(JSON.stringify(notes, null, 1));
  await b.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
