const T = '../../tests/', ROOT = '../..', SP = __dirname;
const L = require(T + 'lib'), http = require('http'), fs = require('fs'), path = require('path');
const OUT = SP + '/pshots/'; fs.mkdirSync(OUT, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
const PREVIEW = process.env.PREVIEW !== '0';
const over = PREVIEW ? { '/js/prep.js': SP + '/preview/js/prep.js', '/css/app.css': SP + '/preview/css/app.css' } : {};
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.startsWith('/leichhardt-kitchen/')) p = p.slice(19); if (p.endsWith('/')) p += 'index.html';
  const f = over[p] || path.join(ROOT, p);
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Last-Modified': 'Sun, 18 Oct 2026 00:00:00 GMT' }); res.end(b); });
});
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const day = L.ymd(new Date(L.NOW)), CFG = key(['config', 'main']), TEAM = key(['team', day]);
const shifts = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'dinner', name: 'Dinner', from: 960, to: 1320 }, { id: 'smoker', name: 'Smoker', from: 360, to: 660, occ: true }];
const people = ['Sam:sous', 'Ann', 'Bo', 'Cal', 'Dee', 'Eli', 'Fin', 'Gus'].map(s => { const [n, r] = s.split(':'); return { id: n.toLowerCase(), name: n, role: r || 'staff', add: true, tick: true, active: true }; });
const cfg = sh => ({ people, sousIds: ['sam'], staffIds: people.map(p => p.id), kitShifts: sh, kitSecs: [{ id: 'grill', name: 'Grill' }, { id: 'pans', name: 'Pans' }, { id: 'larder', name: 'Larder' }], staffSee: { cleaning: true } });
const plan = { day, on: ['ann', 'bo', 'cal', 'dee', 'eli', 'fin'].flatMap(id => [{ id, sh: 'lunch', sec: 'grill' }, { id, sh: 'dinner', sec: 'pans' }]), br: [], v: 1, at: L.NOW, upd: L.NOW, by: 'sam' };
const results = {};
const log = (k, v) => { results[k] = v; console.log(k, JSON.stringify(v)); };
async function team(b, v, w, extra) {
  const p = await L.open(b, '#/team', { who: 'sam', width: w, height: 844, extra: Object.assign({ [CFG]: cfg(shifts), [TEAM]: plan }, extra || {}), wait: 1500, init: 'window.__occ=' + JSON.stringify(v) });
  await L.waitFor(p, () => !!document.querySelector('select[data-k="tm-sec:ann:dinner"]'), null, 8000);
  return p;
}
let taps = 0; const tap = async (p, sel) => { taps++; await p.locator(sel).first().click(); await L.settle(p, 250); };
const choose = async (p, sel, val) => { taps += 2; await L.pick(p, sel, val); await L.settle(p, 250); };
(async () => {
  await new Promise(r => srv.listen(8777, '127.0.0.1', r));
  const b = await L.start();
  for (const v of (PREVIEW ? ['A', 'B', 'C'] : ['base'])) {
    for (const w of [390, 1280]) {
      // Add staff open
      let p = await team(b, v, w);
      await p.locator('[data-p="tm-add-staff"]').first().click(); await L.settle(p, 300);
      log(v + ' ' + w + ' services fieldset px', await p.$eval('.tm-quick-services', e => Math.round(e.getBoundingClientRect().height)));
      log(v + ' ' + w + ' services shown', await p.$eval('.tm-quick-services', e => [...e.querySelectorAll('label,button')].map(x => x.textContent.trim() + (x.querySelector('input') && x.querySelector('input').checked ? ' [x]' : ''))));
      await p.locator('.tm-quick-add').screenshot({ path: OUT + v + '-addstaff-' + w + '.png' });
      if (w === 390) await p.screenshot({ path: OUT + v + '-page-' + w + '.png' });
      await p.locator('[data-p="tm-add-staff"]').first().click(); await L.settle(p, 300);
      // grid head
      await p.locator('.tm-grid-head').screenshot({ path: OUT + v + '-gridhead-' + w + '.png' });
      log(v + ' ' + w + ' grid head px', await p.$eval('.tm-grid-head', e => Math.round(e.getBoundingClientRect().height)));
      // details
      await p.locator('[data-p="tm-focus"][data-id="ann"]').click(); await L.settle(p, 400);
      log(v + ' ' + w + ' detail chips', await p.$eval('.tm-bench-shifts', e => ({ h: Math.round(e.getBoundingClientRect().height), t: [...e.querySelectorAll('button')].map(x => x.textContent) })));
      await p.locator('.tm-detail-workbench').screenshot({ path: OUT + v + '-details-' + w + '.png' });
      if (w === 1280) await p.screenshot({ path: OUT + v + '-page-' + w + '.png', fullPage: true });
      log(v + ' ' + w + ' errors', p.errors);
      await p.context().close();
    }
    // Task 1: Ann (Lunch and Dinner) onto Smoker, Larder, 390. Shortest path per design.
    let p = await team(b, v, 390); taps = 0;
    if (v === 'base' || v === 'A') { await tap(p, '[data-p="tm-focus"][data-id="ann"]'); await tap(p, '[data-p="tm-sh"][data-id="ann"][data-v="smoker"]'); await tap(p, '[data-p="tm-on"][data-id="ann"][data-sh="smoker"]'); }
    if (v === 'B') { await tap(p, '[data-p="tm-focus"][data-id="ann"]'); await tap(p, '[data-p="tm-occ-add"][data-id="ann"]'); }
    if (v === 'C') { await tap(p, '[data-p="tm-occ-group"]'); await tap(p, '[data-k="tm-quick-person:ann"]'); await tap(p, '[data-p="tm-quick-add"]'); }
    await L.waitFor(p, () => !!document.querySelector('select[data-k="tm-sec:ann:smoker"]'), null, 4000);
    await choose(p, 'select[data-k="tm-sec:ann:smoker"]', 'larder');
    const ok1 = await p.$eval('select[data-k="tm-sec:ann:smoker"]', e => e.value) === 'larder';
    log(v + ' task1 Ann onto Smoker taps', { taps, ok: ok1 });
    await p.screenshot({ path: OUT + v + '-task1-after-390.png' });
    // after: Smoker is now shown in Add staff and in Bo's chips
    await p.locator('[data-p="tm-add-staff"]').first().click(); await L.settle(p, 300);
    log(v + ' after task1 services shown', await p.$eval('.tm-quick-services', e => [...e.querySelectorAll('label,button')].map(x => x.textContent.trim())));
    await p.context().close();
    // Task 2: Gus (not on the day) onto Smoker only, Larder, 390
    p = await team(b, v, 390); taps = 0;
    if (v === 'C') { await tap(p, '[data-p="tm-occ-group"]'); }
    else {
      await tap(p, '[data-p="tm-add-staff"]');
      if (v !== 'base') await tap(p, '[data-p="tm-occ-show"][data-v="smoker"]'); else await tap(p, '[data-k="tm-quick-shift:smoker"]');
      await tap(p, '[data-k="tm-quick-shift:lunch"]');
    }
    await tap(p, '[data-k="tm-quick-person:gus"]'); await tap(p, '[data-p="tm-quick-add"]');
    await L.waitFor(p, () => !!document.querySelector('select[data-k="tm-sec:gus:smoker"]'), null, 4000);
    await choose(p, 'select[data-k="tm-sec:gus:smoker"]', 'larder');
    const g = await p.evaluate(() => [...document.querySelectorAll('select[data-k^="tm-sec:gus:"]')].map(e => e.getAttribute('data-k')));
    log(v + ' task2 Gus onto Smoker only taps', { taps, cells: g });
    await p.context().close();
    // Break-it 1: break tools set to Smoker, then Add staff: what is ticked?
    p = await team(b, v, 390);
    const tool = await p.$('select[data-k="tm-tool-sh"]');
    if (tool) { await L.pick(p, 'select[data-k="tm-tool-sh"]', 'smoker'); await L.settle(p, 300); }
    await p.locator('[data-p="tm-add-staff"]').first().click(); await L.settle(p, 300);
    log(v + ' breakit default tick after tools=Smoker', { tool: !!tool, boxes: await p.$eval('.tm-quick-services', e => [...e.querySelectorAll('label')].map(x => x.textContent.trim() + (x.querySelector('input').checked ? ' [x]' : ''))) });
    await p.context().close();
    // Break-it 2: remove-then-add (B and A path via details)
    if (v !== 'C') {
      p = await team(b, v, 390);
      await p.locator('[data-p="tm-focus"][data-id="ann"]').click(); await L.settle(p, 300);
      if (v === 'B') await p.locator('[data-p="tm-occ-add"][data-id="ann"]').click(); else { await p.locator('[data-p="tm-sh"][data-id="ann"][data-v="smoker"]').click(); await L.settle(p, 200); await p.locator('[data-p="tm-on"][data-id="ann"][data-sh="smoker"]').click(); }
      await L.settle(p, 300);
      await p.locator('[data-p="tm-on"][data-id="ann"][data-sh="smoker"]').click(); await L.settle(p, 300);
      const st = await p.evaluate(() => ({ chips: [...document.querySelectorAll('.tm-bench-shifts button')].map(x => x.textContent), add: [...document.querySelectorAll('[data-p="tm-on"]')].map(x => x.textContent) }));
      log(v + ' breakit remove then add', st);
      await p.context().close();
    }
  }
  // Admin Kitchen Shifts with the setting, 1280 and 390
  for (const w of [1280, 390]) {
    const a = await L.open(b, '#/admin', { admin: true, width: w, height: 1000, extra: { [CFG]: cfg(shifts) }, wait: 1500, init: 'window.__occ="B"' });
    await L.kitchenRow(a, 'shifts', 500);
    await a.locator('.a-ks.a-sh').first().screenshot({ path: OUT + 'admin-shifts-' + w + '.png' });
    log('admin ' + w + ' shifts block px', await a.$eval('.a-ks.a-sh', e => Math.round(e.getBoundingClientRect().height)));
    log('admin ' + w + ' errors', a.errors);
    await a.context().close();
  }
  // Home: Ann on a hidden Smoker shift still sees it (staff)
  const home = Object.assign({}, plan, { on: plan.on.concat([{ id: 'ann', sh: 'smoker', sec: 'larder' }]) });
  const h = await L.open(b, '#/', { who: 'ann', width: 390, height: 844, extra: { [CFG]: cfg(shifts), [TEAM]: home }, wait: 2000, init: 'window.__occ="B"' });
  await L.settle(h, 800);
  log('home ann sees Smoker', await h.evaluate(() => /Smoker/.test(document.body.innerText)));
  await h.context().close();
  fs.writeFileSync(OUT + 'results-' + (PREVIEW ? 'preview' : 'base') + '.json', JSON.stringify(results, null, 1));
  await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
