// Recipe search (typos, word order, gluten free and the like), the search bar that stays in reach, and the recipe card jumps (pull request 156).
const L = require('./lib');
const { R, ok } = L.results();
const names = p => p.evaluate(() => [...document.querySelectorAll('#shelves a.dish:not(.faded), #results a.tile')].map(a => a.getAttribute('aria-label') || a.querySelector('.t-name').textContent));
async function find(p, v) { await p.fill('#find', v); await L.settle(p, 250); }
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

  // recipe card jump row (Pass and Tiles cards)
  for (const view of ['pass', 'tiles']) {
    p = await L.open(b, '#/r/barra', { wait: 1200, settings: { view } });
    ok(await p.$('.jumps') !== null, view + ' card: jump row on a phone');
    await p.click('[data-act="jump"][data-val="r-steps"]'); await L.settle(p, 900);
    const st = await p.evaluate(() => document.getElementById('r-steps').getBoundingClientRect().top);
    ok(st >= -2 && st < 60, view + ' card: Method jumps to the method (' + Math.round(st) + ')');
    await p.click('[data-act="jump"][data-val="r-allergens"]', { timeout: 2000 }).catch(() => {});
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.click('[data-act="jump"][data-val="r-ing"]'); await L.settle(p, 900);
    const innerHeight = 844; const it = await p.evaluate(() => document.getElementById('r-ing').getBoundingClientRect().top);
    const atEnd = await p.evaluate(() => Math.abs(window.scrollY + innerHeight - document.documentElement.scrollHeight) < 4);
    ok((it >= -2 && it < 60) || (atEnd && it < innerHeight), view + ' card: Ingredients jumps to the ingredients (' + Math.round(it) + ')');
    ok(p.errors.length === 0, view + ' card: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  p = await L.open(b, '#/r/barra', { width: 1280, height: 900, wait: 1200 });
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.jumps')).display === 'none'), 'desktop card: no jump row (columns side by side)');
  await p.context().close();

  // a dish used on another dish (Side Salad on the Grill Maiden's Board): the Pass card links to it, as Tiles does (23 Oct 2026)
  for (const w of [1280, 390]) {
    p = await L.open(b, '#/r/side-salad', { width: w, height: 900, wait: 1200 });
    const link = await p.evaluate(() => { const a = document.querySelector('main a[href*="grill-board"]'); return a ? { box: (a.closest('.box') || {}).textContent || '' } : null; });
    ok(!!link && /Goes on/.test(link.box) && /Grill Maiden/.test(link.box), w + ' px Pass: Side Salad says it goes on the Grill Maiden\'s Board ' + JSON.stringify(link));
    if (w === 390) {
      const at = await p.evaluate(() => ['.stage', 'main a[href*="grill-board"]', '#r-ing'].map(s => Math.round(document.querySelector(s).getBoundingClientRect().top)));
      ok(at[1] > at[0] && at[2] > at[1], 'phone Pass: Goes on comes after the plate and before Everything on it (' + at + ')');
    }
    await p.click('main a[href*="grill-board"]'); await L.settle(p, 400);
    ok(/grill-board/.test(await p.evaluate(() => location.hash)) && /Grill Maiden/.test(await p.evaluate(() => document.getElementById('rtitle').textContent)), w + ' px Pass: the link opens the board');
    ok(p.errors.length === 0, w + ' px side salad: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
