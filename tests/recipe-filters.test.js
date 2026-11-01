// Recipe search and allergen filters (usability U11): Free from works on the Pass too, the count follows the filters,
// the search box has no autocorrect, a Clear button and a Search key that drops the keyboard, and an empty result
// offers to clear everything.
const L = require('./lib');
const { R, ok } = L.results();
const visible = p => p.evaluate(() => document.querySelectorAll('#shelves a.dish:not(.faded)').length);
const count = p => p.evaluate(() => document.getElementById('count').textContent);
(async () => {
  const b = await L.start();
  const p = await L.open(b, '#/recipes', { wait: 1200 });
  const all = await visible(p);
  ok(await p.getAttribute('#find', 'autocorrect') === 'off' && await p.getAttribute('#find', 'spellcheck') === 'false' && await p.getAttribute('#find', 'enterkeyhint') === 'search', 'search: no autocorrect, Search key');
  ok(await p.$('[data-act="lens"]') !== null && await p.$('[data-act="free"]') === null, 'pass: one row of allergen chips, Show where by default');
  await L.tap(p, '[data-act="amode"][data-val="free"]'); await L.settle(p, 300);
  await L.tap(p, '[data-act="free"][data-val="Gluten"]'); await L.settle(p, 300);
  const gf = await visible(p);
  ok(gf > 0 && gf < all, 'pass: Free from gluten works on the Pass (' + gf + ' of ' + all + ')');
  ok(new RegExp('^' + gf + ' of ').test(await count(p)), 'pass: the count says what is shown (' + await count(p) + ')');
  await L.tap(p, '[data-act="free"][data-val="Gluten"]'); await L.settle(p, 300);
  const kind = await p.evaluate(() => { const c = [...document.querySelectorAll('[data-act="kind"]')].find(e => e.getAttribute('data-val') !== 'all'); return c ? c.getAttribute('data-val') : ''; });
  await L.tap(p, '[data-act="kind"][data-val="' + kind + '"]'); await L.settle(p, 300);
  await p.fill('#find', 'chicken'); await L.settle(p, 300);
  const shown = await visible(p);
  ok(new RegExp('^' + shown + ' of ').test(await count(p)), 'pass: with a kind picked the count matches the dishes shown (' + await count(p) + ', ' + shown + ' shown)');
  ok(await p.$('.find-wrap.has-q .ux-search-clear') !== null, 'search: a Clear button shows while something is typed');
  await p.press('#find', 'Enter'); await L.settle(p, 150);
  ok(await p.evaluate(() => document.activeElement.id) !== 'find', 'search: Enter drops the keyboard');
  await p.click('.ux-search-clear'); await L.settle(p, 300);
  ok(await p.inputValue('#find') === '' && await p.evaluate(() => document.activeElement.id) === 'find', 'search: Clear empties the box and keeps the cursor there');
  await p.fill('#find', 'zzqqxx'); await L.settle(p, 300);
  ok(await p.$('.empty [data-act="clearall"]') !== null, 'search: nothing found offers Clear search and filters');
  await p.click('.empty [data-act="clearall"]'); await L.settle(p, 300);
  ok(await visible(p) === all && await p.inputValue('#find') === '', 'search: Clear search and filters shows everything again');
  // Batch recipes and Components share the Bains and prep shelf: each chip shows only its own (23 Oct 2026, both showed all 46)
  for (const k of ['component', 'batch']) {
    await L.tap(p, '[data-act="kind"][data-val="' + k + '"]'); await L.settle(p, 300);
    const want = await p.evaluate(s => +((document.querySelector(s).textContent.match(/\((\d+)\)/) || [])[1] || -1), '[data-act="kind"][data-val="' + k + '"]');
    const got = await p.evaluate(() => document.querySelectorAll('#shelves a.dish').length);
    const kinds = await p.evaluate(() => [...document.querySelectorAll('#shelves a.dish')].map(a => window.LK_APP.byId(a.getAttribute('href').slice(4)).kind).filter((x, i, l) => l.indexOf(x) === i).join());
    ok(want > 0 && got === want && kinds === k && /Bains and prep/.test(await p.evaluate(() => document.getElementById('shelves').textContent)), 'pass: the ' + k + ' chip shows only its ' + want + ' on the Bains and prep shelf (' + got + ', ' + kinds + ')');
    ok(await count(p) === want + ' recipes on the pass', 'pass: the count says the same (' + await count(p) + ')');
  }
  await L.tap(p, '[data-act="kind"][data-val="all"]'); await L.settle(p, 300);
  ok(await visible(p) === all, 'pass: All shows every recipe again');
  ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Tiles: the Free from chips are round like every other filter (22 Oct 2026 look rule), as on the Pass
  const t = await L.open(b, '#/recipes', { wait: 1200, settings: { view: 'tiles' } });
  const rad = await t.evaluate(() => [document.querySelector('[data-act="free"]'), document.querySelector('[data-act="kind"][data-val="all"]')].map(e => e ? getComputedStyle(e).borderTopLeftRadius : ''));
  ok(rad[0] && rad[0] === rad[1], 'tiles: Free from chips are as round as the other chips (' + rad + ')');
  await t.context().close();
  await b.close();
  L.report(R);
})();
