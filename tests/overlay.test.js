// The head chef's recipe changes laid over js/data.js (js/overlay.js, 21 Oct 2026): changed, new and hidden recipes
// from Firestore show on every recipe page, a phone keeps them for the next start, reads only what changed, and a
// change that is not a recipe (or that fails to draw) never takes the book down.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
global.window = {}; require('../js/data.js');
const D = global.window.LK_DATA, base = id => JSON.parse(JSON.stringify(D.recipes.find(r => r.id === id)));
const burger = Object.assign(base('burger'), { name: 'Chicken Burger Deluxe' });
burger.ingredients.push({ q: '3 slices', name: 'Pickles' });
const batter = { id: 'beer-batter', no: '122', kind: 'batch', forLine: 'For the fish', name: 'Beer Batter', yield: '2 L batch', ingredients: [{ q: '500 g', name: 'Self-raising flour', tags: ['Gluten'] }, { q: '750 ml', name: 'XXXX Gold', tags: ['Gluten'] }], sections: [{ title: 'Method', steps: ['Whisk the beer into the flour until smooth.'] }] };
const rec = (r, v, x) => Object.assign({ r, v, upd: L.NOW - 3600000, by: 'hd', src: 'book', base: 'abcd1234', removed: false }, x || {});
function changes(x) {
  return Object.assign({
    [fsKey(['book', 'index'])]: { r: { burger: 2, 'beer-batter': 1, 'side-salad': 3, broken: 1 } },
    [fsKey(['recipes', 'burger'])]: rec(burger, 2),
    [fsKey(['recipes', 'beer-batter'])]: rec(batter, 1, { src: 'new', base: '' }),
    [fsKey(['recipes', 'side-salad'])]: rec(base('side-salad'), 3, { removed: true }),
    [fsKey(['recipes', 'broken'])]: rec({ id: 'broken', name: '', kind: 'drink' }, 1, { src: 'new' })
  }, x || {});
}
// waits for something read from Firestore; a timeout is not a crash here, the check after it says what went wrong
const wait = (p, fn, t) => L.waitFor(p, fn, null, t || 6000).catch(() => false);
const changed = p => wait(p, () => !!(window.LK_RX && window.LK_RX.syncedAt()), 8000);
const reads = p => p.evaluate(() => (window.__fake ? window.__fake.reads.slice() : []));

(async () => {
  const b = await L.start();
  // a staff phone with the kitchen PIN: the changes come in after the book connects
  let p = await L.open(b, '#/r/burger', { who: 'ann', extra: changes(), wait: 1500 });
  await changed(p);
  await wait(p, () => /Deluxe/.test((document.getElementById('rtitle') || {}).textContent || ''));
  ok(/Chicken Burger Deluxe/.test(await txt(p, '#rtitle') || ''), 'changed recipe: the open card shows the new name');
  ok(/Pickles/.test(await txt(p, '.ing') || ''), 'changed recipe: the new ingredient is listed');
  await p.goto(L.BASE + '#/r/fish-burger'); await L.settle(p, 600);
  ok(/Recipe 122/.test(await txt(p, '.ing') || '') && !/Card to come/.test(await txt(p, '.ing') || ''), 'new recipe: the Fish Burger links its beer batter (no Card to come)');
  ok(!/Not complete yet/.test(await txt(p, '#r-allergens') || '') && /Beer Batter/.test(await txt(p, '#r-allergens') || ''), 'new recipe: the Fish Burger\'s allergens are complete and name the Beer Batter');
  await p.goto(L.BASE + '#/recipes'); await L.settle(p, 600);
  ok(await p.$('a[href="#/r/side-salad"]') === null, 'hidden recipe: gone from the Pass');
  ok(await p.$('a[href="#/r/beer-batter"]') !== null, 'new recipe: on the Pass with the batch recipes');
  ok(await p.$('a[href="#/r/broken"]') === null, 'a change that is not a recipe is left out');
  await p.fill('#find', 'beer batter'); await L.settle(p, 400);
  ok(/1 of/.test(await txt(p, '#count') || '') || await p.$('#shelves a[href="#/r/beer-batter"]:not(.faded)') !== null, 'search finds the new recipe');
  ok(p.errors.length === 0, 'changes: no page errors ' + p.errors.join(' | '));

  // the next start: the changes are on the phone, drawn before Firebase connects, and nothing is read again (checked 30 minutes ago)
  await p.goto(L.BASE + '#/r/beer-batter'); await p.reload(); await L.settle(p, 1200);
  ok(/Beer Batter/.test(await txt(p, '#rtitle') || ''), 'next start: a link straight to the new recipe opens it');
  ok(!(await reads(p)).some(r => /book\/index|\/recipes\//.test(r)), 'next start: no reads (the last check is less than 30 minutes old)');

  // the head chef changes the burger again on another phone; the next check reads the index and only that recipe
  const burger3 = Object.assign(base('burger'), { name: 'Chicken Burger Supreme' });
  await p.goto(L.BASE + '#/r/burger'); await L.settle(p, 800);
  await p.evaluate(([k1, v1, k2, v2]) => { window.__fake.write(k1, v1); window.__fake.write(k2, v2); window.__fake.reads.length = 0; },
    [fsKey(['recipes', 'burger']), rec(burger3, 3), fsKey(['book', 'index']), { r: { burger: 3, 'beer-batter': 1, 'side-salad': 3, broken: 1 } }]);
  await p.evaluate(() => window.LK_PREP.rxSync(true));
  await wait(p, () => /Supreme/.test((document.getElementById('rtitle') || {}).textContent || ''));
  ok(/Chicken Burger Supreme/.test(await txt(p, '#rtitle') || ''), 'another phone\'s change: the open card redraws with it');
  const r2 = await reads(p);
  ok(r2.filter(r => /\/recipes\//.test(r)).length === 1 && r2.some(r => /recipes\/burger$/.test(r)), 'another phone\'s change: only the changed recipe is read (' + r2.join(', ') + ')');
  await p.evaluate(() => { window.__fake.reads.length = 0; });
  await p.evaluate(() => window.LK_PREP.rxSync(true));
  const r3 = await reads(p);
  ok(r3.filter(r => /book\/index$/.test(r)).length === 1 && !r3.some(r => /\/recipes\//.test(r)), 'nothing changed: one read of the index, no recipe read (' + r3.join(', ') + ')');

  // a start that failed to draw with the changes: the next start shows js/data.js alone
  await p.evaluate(() => { const c = JSON.parse(localStorage.getItem('lk.rx')); localStorage.setItem('lk.rx.bad', String(c.at)); });
  await p.reload(); await L.settle(p, 1200);
  ok(/^Chicken Burger$/.test(await txt(p, '#rtitle') || ''), 'failed start: the next start shows the book\'s own recipe');
  ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a phone without the kitchen PIN reads nothing and shows js/data.js
  p = await L.open(b, '#/r/burger', { noPin: true, who: '', extra: changes(), wait: 1500 });
  ok(/^Chicken Burger$/.test(await txt(p, '#rtitle') || ''), 'no kitchen PIN: the book\'s own recipe');
  ok(!(await reads(p)).some(r => /book\/index/.test(r)), 'no kitchen PIN: nothing read');
  await p.context().close();

  // staff cannot write the head chef's book, even straight to Firestore through their own PIN session
  p = await L.open(b, '#/prep', { who: 'ann', extra: changes(), wait: 1500 });
  const res = await p.evaluate(async k => {
    const fs = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
    const db = fs.getFirestore(), bt = fs.writeBatch(db);
    bt.set(fs.doc(db, 'kitchens', k, 'recipes', 'burger'), { r: { id: 'burger', kind: 'main', name: 'Hacked' }, v: 4, upd: 1, by: 'ann' });
    try { await bt.commit(); return 'saved'; } catch (e) { return e.code; }
  }, L.PIN);
  ok(res === 'permission-denied', 'staff: a straight write to a recipe is refused (' + res + ')');
  await p.context().close();
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
