// Feels fast (21 Oct 2026). Recipes opens faster: shelves and tile groups off screen are not drawn until they scroll near
// (content-visibility). Their height is a guess until then, so coming back from a recipe puts the plate you opened
// back at the same height on the screen, on the Pass and on Tiles, on a phone and a computer. And a press is answered
// at once: buttons and links give way a little while a finger is on them, and pins on a plate stay where they are.
const L = require('./lib');
const { R, ok } = L.results();
const top = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top) : null; }, sel);
(async () => {
  const b = await L.start();
  for (const view of ['pass', 'tiles']) for (const [w, h] of [[390, 844], [1280, 900]]) {
    const at = view + ' ' + w + ': ';
    const p = await L.open(b, '#/recipes', { width: w, height: h, settings: { view }, wait: 1000 });
    const group = view === 'pass' ? '.shelf' : '.tile-group';
    ok(await p.evaluate(s => getComputedStyle(document.querySelector(s)).contentVisibility === 'auto', group), at + 'groups off screen wait to be drawn');
    // a recipe far down the page: the last one in the last group
    const link = await p.evaluate(s => { const g = [...document.querySelectorAll(s)].pop(), a = [...g.querySelectorAll('a[href^="#/r/"]')].pop(); return a.getAttribute('href'); }, group);
    const sel = group + ':last-of-type a[href="' + link + '"]';   // the copy in the last group (a recipe can be on two shelves)
    await p.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), sel);
    await L.settle(p, 300);
    const before = await top(p, sel);
    await p.click(sel); await L.settle(p, 400);
    ok(await p.evaluate(() => location.hash) === '#' + link.slice(1) || await p.evaluate(l => location.hash === l, link), at + 'the recipe opens');
    await p.evaluate(() => history.back()); await L.settle(p, 500);
    const after = await top(p, sel);
    ok(after !== null && Math.abs(after - before) <= 4, at + 'back from the recipe, the plate is where it was (' + before + ', now ' + after + ')');
    ok(p.errors.length === 0, at + 'no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  // a press: the docket gives way while held, and springs back
  const held = (p, sel, v) => L.waitFor(p, a => getComputedStyle(document.querySelector(a[0])).scale === a[1], [sel, v], 3000).then(() => true, () => false);
  const middle = (p, sel) => L.waitFor(p, s => { const e = document.querySelector(s), r = e && e.getBoundingClientRect(); return r && r.width ? r : null; }, sel, 5000)
    .then(() => p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel));
  let p = await L.open(b, '#/', { touch: true, wait: 800 });
  let at = await middle(p, '.docket');
  await p.evaluate(() => document.addEventListener('click', e => e.preventDefault(), { capture: true, once: true }));   // stay on the landing page
  await p.mouse.move(at.x, at.y); await p.mouse.down();
  ok(await held(p, '.docket', '0.97'), 'press: a docket gives way while held');
  await p.mouse.up();
  ok(await held(p, '.docket', 'none'), 'press: it springs back when let go');
  await p.context().close();
  // a pin on the plate keeps its own transform (it is placed with one) and is only scaled while held
  p = await L.open(b, '#/r/barra', { width: 1280, height: 900, wait: 800 });
  at = await middle(p, '.stage .pin');
  const tf = () => p.evaluate(() => getComputedStyle(document.querySelector('.stage .pin')).transform), t0 = await tf();
  await p.mouse.move(at.x, at.y); await p.mouse.down();
  ok(await held(p, '.stage .pin', '0.97') && await tf() === t0, 'press: a pin keeps its place on the plate while held');
  await p.mouse.up();
  await p.context().close();
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
