// What already works well and must keep working while the usability plan changes the pages around it:
// "Logged often" fills the whole wastage form, Back walks out of a sub-recipe, the admin lists show more on request,
// the reason sheet closes with Escape, and a read lost to a bad signal does not break the wastage page.
const L = require('./lib');
const { R, ok } = L.results();
const day = n => L.ymd(new Date(L.NOW - n * 86400000));
const wKey = (d, id) => ['kitchens', L.PIN, 'waste', d, 'lines', id].join('/');
function riceTwice() {
  const x = {};
  [1, 2].forEach(n => { x[wKey(day(n), 'r' + n)] = { text: 'Rice', amount: 1, unit: 'portions', reason: 'expired', action: '', station: 'Pans', addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - n * 86400000, deleted: false }; });
  return x;
}
(async () => {
  const b = await L.start();
  let p;

  // wastage: "Logged often" fills item, unit, reason and section in one tap, and puts the cursor in Amount
  p = await L.open(b, '#/waste', { wait: 1500, extra: riceTwice() });
  const often = await p.$('[data-p="woften"]');
  ok(!!often && /Rice/.test(await often.textContent()), 'waste: Rice logged on two days shows under Logged often');
  if (often) await often.click();
  await L.settle(p, 250);
  const f = await p.evaluate(() => ({
    text: (document.getElementById('w-text') || {}).value,
    unit: (document.querySelector('[data-p="wunit"][aria-checked="true"]') || {}).textContent,
    reason: (document.querySelector('.w-rbtn') || {}).textContent || (document.querySelector('.w-rchips [aria-pressed="true"]') || {}).textContent,
    sec: (document.getElementById('w-sec') || {}).value,
    focus: document.activeElement && document.activeElement.getAttribute('data-k')
  }));
  ok(f.text === 'Rice' && f.unit === 'portions' && /Expired stock/.test(f.reason || '') && f.sec === 'Pans', 'waste: Logged often fills item, unit, reason and section ' + JSON.stringify(f));
  ok(f.focus === 'w-amt', 'waste: the cursor goes to Amount (' + f.focus + ')');

  // wastage: the reason sheet closes with Escape and gives focus back to its button
  await p.click('.w-rbtn');
  await L.settle(p, 200);
  ok(await p.$('.sheet') !== null, 'waste: the reason sheet opens');
  await p.keyboard.press('Escape');
  await L.settle(p, 250);
  ok(await p.$('.sheet') === null, 'waste: Escape closes the reason sheet');
  ok(await p.evaluate(() => !!document.activeElement && document.activeElement.classList.contains('w-rbtn')), 'waste: focus goes back to the reason button');
  ok(p.errors.length === 0, 'waste: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // wastage: a past day that cannot be read (bad signal) does not break the page or the form
  p = await L.open(b, '#/waste', { wait: 1500, extra: riceTwice(), failReads: '/waste/' + day(1) + '/lines$' });
  ok(await p.$('#w-text') !== null && await p.$('.w-row') !== null, 'waste: with one day unreadable the form and today\'s entries still show');
  ok(await p.evaluate(() => window.__fake.reads.some(r => r.indexOf('/waste/') > 0)), 'waste: the past days were asked for');
  ok(p.errors.length === 0, 'waste, one day unreadable: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // recipes: into a sub-recipe and Back out again, with the trail linking up
  p = await L.open(b, '#/recipes', { wait: 1200 });
  const dishes = await p.evaluate(() => [...document.querySelectorAll('#shelves a.dish')].map(a => a.getAttribute('href')));
  let dish = '', sub = '';
  for (const h of dishes) {
    await p.evaluate(x => { location.hash = x; }, h);
    await L.settle(p, 250);
    sub = await p.evaluate(x => { const a = [...document.querySelectorAll('#main a[href^="' + x + '/"]')][0]; return a ? a.getAttribute('href') : ''; }, h);
    if (sub) { dish = h; break; }
  }
  ok(!!sub, 'recipes: a dish links to a sub-recipe (' + dish + ' to ' + sub + ')');
  if (sub) {
    const dishName = await p.evaluate(() => document.querySelector('.card-head h2').textContent);
    await L.tap(p, '#main a[href="' + sub + '"]');
    await L.settle(p, 300);
    ok(await p.evaluate(() => location.hash) === sub, 'recipes: the sub-recipe opens on its own address');
    ok(await p.$('.trail a[href="' + dish + '"], .crumbs a[href="' + dish + '"]') !== null, 'recipes: the trail links back to the dish');
    ok(await p.$('.zoombar a[href="' + dish + '"]') !== null, 'recipes: Zoom out links back to the dish');
    await p.goBack();
    await L.settle(p, 300);
    ok(await p.evaluate(() => location.hash) === dish && await p.evaluate(() => document.querySelector('.card-head h2').textContent) === dishName, 'recipes: Back returns to the dish');
  }
  ok(p.errors.length === 0, 'recipes: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // admin: a long list shows 15, then more on request, then fewer; the search narrows it
  const cfg = L.seed()[['kitchens', L.PIN, 'config', 'main'].join('/')];
  const many = cfg.people.concat(Array.from({ length: 17 }, (_, i) => ({ id: 'p' + i, name: 'Cook ' + (i + 1), role: 'staff', add: true, tick: true, del: false, active: true })));
  const extra = {}; extra[['kitchens', L.PIN, 'config', 'main'].join('/')] = Object.assign({}, cfg, { people: many });
  p = await L.open(b, '#/admin', { admin: true, wait: 1800, width: 1280, height: 900, extra });
  await L.adminTab(p, 'people');
  await L.settle(p, 300);
  const cnt = () => p.evaluate(() => (document.querySelector('[data-lvb="people"] .lv-count') || {}).textContent || '');
  ok(/Showing 15 of 20 people/.test(await cnt()), 'admin: the people list shows 15 of 20 (' + await cnt() + ')');
  await p.click('[data-p="lv-more"][data-lv="people"]');
  await L.settle(p, 200);
  ok(/^20 people/.test(await cnt()) && await p.$('[data-p="lv-less"][data-lv="people"]') !== null, 'admin: Show more shows all 20, with Show fewer');
  await p.fill('[data-k="lv-q:people"]', 'cook 1');
  await L.settle(p, 300);
  ok(/matching/.test(await cnt()) && await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-k')) === 'lv-q:people', 'admin: the search narrows the list and keeps the cursor (' + await cnt() + ')');
  ok(p.errors.length === 0, 'admin: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})();
