// Page reset commands cancel a pending search as well as the committed query.
// Dispatch and reset in one turn to exercise the real debounce race without timing guesses.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const ago = n => L.ymd(new Date(L.NOW - n * 86400000));
const billed = p => p.evaluate(() => __fake.bill.reduce((sum, row) => sum + row.n, 0));
async function pendingReset(p, input, command, value) {
  await p.evaluate(({ input, command, value }) => {
    const field = document.querySelector(input), reset = document.querySelector(command);
    if (!field || !reset || !reset.getClientRects().length) throw Error('The real page reset is not available');
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    reset.click();
  }, { input, command, value });
  await L.settle(p, 350);
}
const cleared = (p, selector) => p.locator(selector).evaluate(el => el.value === '' && el.dataset.committedQuery === '');

(async () => {
  const b = await L.start(); let p;
  try {
    p = await L.open(b, '#/recipes', { settings: { view: 'tiles' } });
    const all = await p.locator('.tile').count();
    await L.choose(p, '[data-act="kind"]:has-text("Dessert")');
    await L.choose(p, '[data-act="free"][data-val="Gluten"]');
    ok(await p.locator('.empty [data-act="clearall"]').isVisible() && await cleared(p, '#find'), 'recipes: an empty dietary/category combination offers the real reset while search is empty');
    const reads = await billed(p);
    await pendingReset(p, '#find', '.empty [data-act="clearall"]', 'chicken');
    ok(await cleared(p, '#find') && await p.locator('.tile').count() === all, 'recipes: Clear search and filters cancels a pending query and restores every recipe');
    ok(await p.locator('[data-act="free"][aria-pressed="true"]').count() === 0 && await p.locator('[data-act="kind"][data-val="all"]').getAttribute('aria-pressed') === 'true', 'recipes: the same reset clears dietary and category filters');
    ok(await billed(p) === reads, 'recipes: clearing local search and filters adds no document reads');
    ok(!p.errors.length, 'recipes: no browser errors ' + p.errors.join(' | '));
  } catch (e) { ok(false, 'recipes reset: ' + e.message.split('\n')[0]); }
  if (p) await p.context().close();

  try {
    p = await L.open(b, '#/guides', { who: 'ann', extra: L.guides() });
    await L.choose(p, '[data-p="g-cat"][data-v="cleaning"]');
    await p.fill('#g-q', 'zzmissing'); await p.press('#g-q', 'Enter');
    await L.waitFor(p, () => !!document.querySelector('.p-empty [data-p="g-clear"]'));
    const reads = await billed(p);
    await pendingReset(p, '#g-q', '.p-empty [data-p="g-clear"]', 'Fryer');
    ok(await cleared(p, '#g-q') && await p.locator('.g-card').count() === 1 && /Fryer/.test(await p.locator('.g-card').innerText()), 'guides: Clear the search cancels a pending replacement and restores category results');
    ok(await p.locator('[data-p="g-cat"][data-v="cleaning"]').getAttribute('aria-pressed') === 'true', 'guides: clearing search preserves the selected category');
    ok(await billed(p) === reads, 'guides: clearing local search adds no document reads');
    ok(!p.errors.length, 'guides: no browser errors ' + p.errors.join(' | '));
  } catch (e) { ok(false, 'guides reset: ' + e.message.split('\n')[0]); }
  if (p) await p.context().close();

  try {
    const extra = {};
    for (const [age, id, text, reason] of [[2, 'fish', 'Fish fillets', 'expired'], [3, 'cream', 'Cream', 'prep'], [10, 'old', 'Old fish', 'expired']]) {
      extra[key('waste', ago(age), 'lines', id)] = { text, reason, amount: 1, unit: 'kg', station: 'Grill', action: '', addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - age * 86400000, deleted: false };
    }
    p = await L.open(b, '#/admin', { admin: true, who: '', extra });
    await L.adminTab(p, 'waste');
    await L.waitFor(p, () => !!document.querySelector('[data-lv="waste-log"]'));
    await L.pick(p, '[data-k="wh-period"]', '7');
    const rows = '[data-lv="waste-log"] tbody tr';
    const all = await p.locator(rows).count();
    const range = await p.locator('.wh-range').innerText();
    await p.locator('.wh-filters > summary').click();
    await L.pick(p, '[data-k="af-reason"]', 'expired');
    ok(await p.locator(rows).count() === 1 && await cleared(p, '#wh-search'), 'wastage: a categorical filter offers Clear filters while search is empty');
    const reads = await billed(p);
    await pendingReset(p, '#wh-search', '[data-p="wh-clear"]', 'Fish');
    ok(await cleared(p, '#wh-search') && await p.locator(rows).count() === all, 'wastage: Clear filters cancels a pending search and restores every entry in range');
    ok(await p.locator('[data-k="wh-period"]').inputValue() === '7' && await p.locator('.wh-range').innerText() === range && !(await p.locator(rows).allTextContents()).some(text => /Old fish/.test(text)), 'wastage: clearing filters retains the selected dates and excludes older records');
    ok(await p.locator('[data-k="af-reason"]').inputValue() === '', 'wastage: Clear filters also clears the selected reason');
    ok(await billed(p) === reads, 'wastage: clearing local filters adds no document reads');
    ok(!p.errors.length, 'wastage: no browser errors ' + p.errors.join(' | '));
  } catch (e) { ok(false, 'wastage reset: ' + e.message.split('\n')[0]); }
  if (p) await p.context().close();
  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
