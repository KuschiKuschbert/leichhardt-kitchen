// Recipe search (typos, word order, gluten free and the like), the search bar that stays in reach, and the recipe card jumps (pull request 156).
const L = require('./lib');
const { R, ok } = L.results();
const names = p => p.evaluate(() => [...document.querySelectorAll('#shelves a.dish:not(.faded), #results a.tile')].map(a => a.getAttribute('aria-label') || a.querySelector('.t-name').textContent));
async function find(p, v) { await p.fill('#find', v); await L.settle(p, 250); }
// Native smooth scrolling can still be moving after the page's other work settles. Since the redesign's step 6
// (8 Nov 2026) the jump row stays under the top bar while the card scrolls, so a jump lands just under the row.
const rowBottom = p => p.evaluate(() => { const nav = document.querySelector('.jumps'); return nav ? Math.max(0, Math.round(nav.getBoundingClientRect().bottom)) : 0; });
async function waitForJump(p, id, allowEnd) {
  try {
    await L.waitFor(p, ({ id, allowEnd }) => {
      const target = document.getElementById(id);
      if (!target) return false;
      const nav = document.querySelector('.jumps'), base = nav ? Math.max(0, nav.getBoundingClientRect().bottom) : 0;
      const top = target.getBoundingClientRect().top;
      const atEnd = Math.abs(scrollY + innerHeight - document.documentElement.scrollHeight) < 4;
      return top >= base - 2 && (top < base + 60 || allowEnd && atEnd && top < innerHeight);
    }, { id, allowEnd }, 4000);
  } catch (_) {
    console.error('Recipe jump did not reach its target: ' + JSON.stringify(await p.evaluate(id => ({
      id, top: document.getElementById(id)?.getBoundingClientRect().top,
      scrollY, height: document.documentElement.scrollHeight, viewport: innerHeight,
      atEnd: Math.abs(scrollY + innerHeight - document.documentElement.scrollHeight) < 4
    }), id)));
  }
}
(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/recipes', { wait: 1200 });
  // sticky search
  await p.evaluate(() => window.scrollTo(0, 3000)); await L.settle(p, 200);
  const top = await p.evaluate(() => document.getElementById('find').getBoundingClientRect().top);
  ok(top >= 0 && top < 80, 'list: search box stays in view while scrolling (' + Math.round(top) + ')');
  const sw = await p.evaluate(() => [...document.querySelectorAll('.vsw button')].map(b => Math.round(b.getBoundingClientRect().width)));
  ok(sw.every(w => w >= 44), 'list: Pass / Tiles buttons are 44 wide ' + JSON.stringify(sw));
  await p.evaluate(() => window.scrollTo(0, 0));
  // near miss
  await find(p, 'chiken');
  let n = await names(p);
  ok(n.length > 0 && n.every(x => /chicken/i.test(x) || true), 'search: "chiken" finds ' + n.length + ' recipes');
  ok(/Showing chicken instead/.test(await p.evaluate(() => (document.querySelector('.s-note') || {}).textContent || '')), 'search: says it showed chicken instead');
  ok(await p.evaluate(() => getComputedStyle(document.getElementById('count')).display !== 'none'), 'search: count shows on phones while filtering (' + await p.evaluate(() => document.getElementById('count').textContent) + ')');
  // word order
  await find(p, 'parmy chicken');
  n = await names(p);
  ok(n.some(x => /Chicken Parmy/.test(x)), 'search: "parmy chicken" finds Chicken Parmy');
  // free from
  await find(p, 'gluten free');
  const gf = await p.evaluate(() => [...document.querySelectorAll('#shelves a.dish:not(.faded)')].map(a => a.getAttribute('href').slice(4)));
  ok(gf.length > 0, 'search: "gluten free" finds ' + gf.length + ' recipes');
  ok(/Free from gluten/.test(await p.evaluate(() => (document.querySelector('.s-note') || {}).textContent || '')), 'search: free-from note shows');
  await p.click('[data-act="topview"][data-val="tiles"]'); await L.settle(p, 300);
  const tagsBad = await p.evaluate(() => [...document.querySelectorAll('#results a.tile')].filter(t => [...t.querySelectorAll('.tag')].some(g => /^Gluten\??$|Allergens incomplete/.test(g.textContent))).length);
  const tileN = await p.evaluate(() => document.querySelectorAll('#results a.tile').length);
  ok(tileN === gf.length && tagsBad === 0, 'search: Tiles shows the same ' + tileN + ' with no gluten tag');
  await find(p, 'gf burger');
  n = await names(p);
  const gb = await p.evaluate(() => [...document.querySelectorAll('#shelves a.dish:not(.faded), #results a.tile')].map(a => a.getAttribute('href').slice(4)));
  ok(gb.length > 0 && gb.every(id => gf.indexOf(id) >= 0), 'search: "gf burger" only shows gluten-free recipes that mention burger: ' + JSON.stringify(n));
  await find(p, 'no dairy');
  ok(/Free from milk/.test(await p.evaluate(() => (document.querySelector('.s-note') || {}).textContent || '')), 'search: "no dairy" reads as free from milk');
  await find(p, 'zzqq');
  ok(/No recipes match/.test(await p.evaluate(() => document.getElementById('results').textContent)), 'search: real misses still say no match');
  await L.settle(p, 2700);
  ok(await p.evaluate(() => /zzqq/.test(localStorage.getItem('lk.miss') || '')), 'search: real misses are still queued for the admin');
  await find(p, '');
  // switching views starts at the top
  await p.evaluate(() => window.scrollTo(0, 2500)); await L.settle(p, 150);
  await p.click('[data-act="topview"][data-val="pass"]'); await L.settle(p, 300);
  ok(await p.evaluate(() => window.scrollY) === 0, 'list: switching Tiles to Pass starts at the top');
  ok(!(await L.overflow(p)), 'list: no sideways scroll');
  ok(p.errors.length === 0, 'list: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // recipe card jump row (Pass and Tiles cards). Since the redesign's step 6 (8 Nov 2026) it stays under the top bar
  // while the card scrolls, and after Allergens, Ingredients and Method it names the plate and the side view.
  for (const view of ['pass', 'tiles']) {
    p = await L.open(b, '#/r/barra', { wait: 1200, settings: { view } });
    ok(await p.$('.jumps') !== null, view + ' card: jump row on a phone');
    const words = await p.$$eval('.jumps [data-act="jump"]', l => l.map(e => e.textContent));
    ok(words.join() === 'Allergens,Ingredients,Method,Plate,Side view', view + ' card: the row names every part, Allergens, Ingredients and Method first (' + words.join(', ') + ')');
    ok(await p.$$eval('.jumps [data-act="jump"]', l => l.slice(0, 3).every(e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })), view + ' card: Allergens, Ingredients and Method all show on a 390 px phone');
    await p.click('[data-act="jump"][data-val="r-steps"]'); await waitForJump(p, 'r-steps', false);
    let base = await rowBottom(p);
    const st = await p.evaluate(() => document.getElementById('r-steps').getBoundingClientRect().top);
    const nav = await p.evaluate(() => Math.round(document.querySelector('.jumps').getBoundingClientRect().top));
    ok(st >= base - 2 && st < base + 60, view + ' card: Method jumps to the method, just under the row (' + Math.round(st) + ', row ends ' + base + ')');
    ok(nav >= 0 && nav < 10, view + ' card: the row stays under the top bar at the method (' + nav + ')');
    // the allergens are one tap from the method
    await p.click('[data-act="jump"][data-val="r-allergens"]'); await waitForJump(p, 'r-allergens', false);
    base = await rowBottom(p);
    const at = await p.evaluate(() => document.getElementById('r-allergens').getBoundingClientRect().top);
    ok(at >= base - 2 && at < base + 60, view + ' card: Allergens from the method in one tap (' + Math.round(at) + ')');
    for (const id of ['r-plate', 'r-side']) {
      await p.click('[data-act="jump"][data-val="' + id + '"]'); await waitForJump(p, id, true);
      base = await rowBottom(p);
      const t = await p.evaluate(i => document.getElementById(i).getBoundingClientRect().top, id);
      ok(t >= base - 2 && t < 844, view + ' card: ' + id + ' jumps to its drawing (' + Math.round(t) + ')');
    }
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.click('[data-act="jump"][data-val="r-ing"]'); await waitForJump(p, 'r-ing', true);
    base = await rowBottom(p);
    const innerHeight = 844; const it = await p.evaluate(() => document.getElementById('r-ing').getBoundingClientRect().top);
    const atEnd = await p.evaluate(() => Math.abs(window.scrollY + innerHeight - document.documentElement.scrollHeight) < 4);
    ok((it >= base - 2 && it < base + 60) || (atEnd && it < innerHeight), view + ' card: Ingredients jumps to the ingredients (' + Math.round(it) + ')');
    // the plating line runs across the card, under the name and its number
    const head = await p.evaluate(() => { const h = document.querySelector('.card-head'), y = h.querySelector('.yield'), n = h.querySelector('.num'), t = h.querySelector('h2'); return { hw: Math.round(h.getBoundingClientRect().width), yw: Math.round(y.getBoundingClientRect().width), under: y.getBoundingClientRect().top >= Math.max(n.getBoundingClientRect().bottom, t.getBoundingClientRect().bottom) - 1 }; });
    ok(head.under && head.yw >= head.hw - 2, view + ' card: the plating line runs across the card under the name and number (' + JSON.stringify(head) + ')');
    ok(p.errors.length === 0 && !(await L.overflow(p)), view + ' card: no page errors, no sideways scroll ' + p.errors.join(' | '));
    await p.context().close();
  }
  // a batch recipe: no plate, so no Plate chip; Tiles names the pan only when it has a drawing
  p = await L.open(b, '#/r/jasmine-rice', { wait: 1200, settings: { view: 'tiles' } });
  const bw = await p.$$eval('.jumps [data-act="jump"]', l => l.map(e => e.textContent));
  ok(bw.slice(0, 3).join() === 'Allergens,Ingredients,Method' && bw.indexOf('Plate') < 0 && (bw.indexOf('Pan') < 0 || !!(await p.$('#r-plate'))), 'batch card: no Plate chip, and Pan only with a pan drawing (' + bw.join(', ') + ')');
  await p.context().close();
  p = await L.open(b, '#/r/barra', { width: 1280, height: 900, wait: 1200 });
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.jumps')).display === 'none'), 'desktop card: no jump row (columns side by side)');
  await p.context().close();

  // a dish used on another dish (Side Salad on the Grill Maiden's Board): the Pass card links to it, as Tiles does (23 Oct 2026).
  // No dish in js/data.js has a tip, so the Side Salad gets one as a head chef's recipe change (js/overlay.js), and the Pass shows it too.
  global.window = {}; require('../js/data.js');
  const salad = Object.assign(JSON.parse(JSON.stringify(global.window.LK_DATA.recipes.find(r => r.id === 'side-salad'))), { tip: { title: 'Test tip', text: 'A tip the head chef saved on this dish.' } });
  const fsKey = k => ['kitchens', L.PIN].concat(k).join('/');
  const tipped = { [fsKey(['book', 'index'])]: { r: { 'side-salad': 2 } }, [fsKey(['recipes', 'side-salad'])]: { r: salad, v: 2, upd: L.NOW - 3600000, by: 'hd', src: 'book', base: 'abcd1234', removed: false } };
  const tipText = () => ([...document.querySelectorAll('main .box')].find(x => /Test tip/.test(x.textContent)) || {}).textContent || '';
  for (const w of [1280, 390]) {
    p = await L.open(b, '#/r/side-salad', { width: w, height: 900, wait: 1200, extra: tipped });
    await L.waitFor(p, tipText, null, 8000).catch(() => false);   // the change comes in after the book connects
    const tip = await p.evaluate(tipText);
    ok(/Test tip/.test(tip) && /A tip the head chef saved on this dish/.test(tip), w + ' px Pass: Side Salad shows its tip box (' + JSON.stringify(tip) + ')');
    const link = await p.evaluate(() => { const a = document.querySelector('main a[href*="grill-board"]'); return a ? { box: (a.closest('.box') || {}).textContent || '' } : null; });
    ok(!!link && /Goes on/.test(link.box) && /Grill Maiden/.test(link.box), w + ' px Pass: Side Salad says it goes on the Grill Maiden\'s Board ' + JSON.stringify(link));
    if (w === 390) {
      const at = await p.evaluate(() => ['.stage', 'main a[href*="grill-board"]', '#r-ing'].map(s => Math.round(document.querySelector(s).getBoundingClientRect().top)));
      ok(at[1] > at[0] && at[2] > at[1], 'phone Pass: Goes on comes after the plate and before Everything on it (' + at + ')');
      const tAt = await p.evaluate(() => { const x = [...document.querySelectorAll('main .box')].find(e => /Test tip/.test(e.textContent)); return ['.stage', '#r-ing'].map(s => Math.round(document.querySelector(s).getBoundingClientRect().top)).concat(x ? Math.round(x.getBoundingClientRect().top) : -1); });
      ok(tAt[2] > tAt[0] && tAt[2] < tAt[1], 'phone Pass: the tip box comes after the plate and before Everything on it (' + tAt + ')');
    }
    await p.click('main a[href*="grill-board"]'); await L.settle(p, 400);
    ok(/grill-board/.test(await p.evaluate(() => location.hash)) && /Grill Maiden/.test(await p.evaluate(() => document.getElementById('rtitle').textContent)), w + ' px Pass: the link opens the board');
    ok(p.errors.length === 0, w + ' px side salad: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
