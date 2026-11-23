/* The Pass pin and its Contains mark use the same ingredient checks as the recipe card. */
const L = require('./lib');
const { R, ok } = L.results();
const NOT_CHECKED = /Allergens not checked yet/;
const NONE = /No listed allergens/;
const VERIFY = /Check the supplier label or ask the head chef or sous chef/;

function pin(p, name) {
  return p.locator('.stage .pin').filter({ has: p.getByText(new RegExp('^' + name + '( · |$)')) });
}

async function openPin(p, name) {
  await pin(p, name).press('Enter');
  return p.locator('.stage + .box').innerText({ timeout: 2000 }).catch(() => '');
}

async function lens(p, allergen) {
  if (!(await p.locator('.lens-fold').getAttribute('open') !== null)) await p.locator('.lens-fold summary').press('Enter');
  await L.choose(p, '.lens-fold [data-val="' + allergen + '"]');
  await L.waitFor(p, a => document.querySelector('.lens-fold [aria-pressed="true"]')?.dataset.val === a, allergen);
}

function plate(id, name, ingredients, pins, allergens = {}) {
  return { id, no: '900', kind: 'side', forLine: 'Plate', name, yield: 'Per plate', ingredients, pins, ...allergens };
}

function fixture() {
  const recipes = [
    plate('zz-pin-checks', 'Test service plate', [
      { q: '20 g', name: 'Cream (from the cold room)', tags: ['Milk'] },
      { q: '10 g', name: 'Pickled garnish', none: false },
      { q: '5 g', name: 'Greens', none: true },
      { q: '1 pot', name: 'Checked dressing', link: 'zz-pin-dressing' },
      { q: '5 g', name: 'Sesame and cracked pepper', tags: ['Sesame'] },
      { q: '1', name: 'Ambiguous (first product)', none: true },
      { q: '1', name: 'Ambiguous (second product)', none: false }
    ], [
      { label: 'Mixed topping', ing: 'Cream|Pickled garnish', tags: ['Mustard?'], note: '30 g, over the greens.', x: 30, y: 20 },
      { label: 'Cream with garnish', ing: 'Cream and Pickled garnish', x: 70, y: 20 },
      { label: 'Fresh garnish', ing: 'Pickled garnish', x: 30, y: 37 },
      { label: 'Greens', x: 70, y: 37 },
      { label: 'Pepper', ing: 'Cracked pepper', x: 30, y: 54 },
      { label: 'Ambiguous', x: 70, y: 54 },
      { label: 'Old marker', x: 30, y: 71 },
      { label: 'Dressing', link: 'zz-pin-dressing', x: 70, y: 71 },
      { label: 'Unwritten side', link: 'zz-pin-missing', note: 'In a small pot.', x: 50, y: 88 }
    ]),
    plate('zz-pin-dressing', 'Checked dressing', [{ q: '10 g', name: 'Yoghurt', tags: ['Milk'] }], []),
    plate('zz-pin-stock', 'Replacement stock', [{ q: '10 g', name: 'Tofu', tags: ['Soy'] }], []),
    // A kept Studio drawing can retain the old link after the ingredient is edited in Manage.
    plate('zz-pin-changed', 'Test updated ingredients', [
      { q: '20 g', name: 'Unlinked garnish', none: false },
      { q: '10 g', name: 'Relinked sauce', link: 'zz-pin-stock' },
      { q: '1 pot', name: 'Unchanged dressing', link: 'zz-pin-dressing' },
      { q: '5 g', name: 'Split topping (first)', link: 'zz-pin-stock' },
      { q: '5 g', name: 'Split topping', link: 'zz-pin-dressing' },
      { q: '5 g', name: 'Checked herbs', none: true }
    ], [
      { label: 'Unlinked garnish', ing: 'Unlinked garnish', link: 'zz-pin-dressing', x: 30, y: 24 },
      { label: 'Relinked sauce', ing: 'Relinked sauce', link: 'zz-pin-dressing', x: 70, y: 24 },
      { label: 'Unchanged dressing', ing: 'Unchanged dressing', link: 'zz-pin-dressing', x: 30, y: 55 },
      { label: 'Authored garnish', ing: 'Unlinked garnish', link: 'zz-pin-dressing', own: true, x: 70, y: 55 },
      { label: 'Split topping', ing: 'Split topping', link: 'zz-pin-dressing', x: 50, y: 80 },
      { label: 'Checked herbs', ing: 'Checked herbs', tags: ['Milk'], x: 15, y: 78 },
      { label: 'House herbs', ing: 'Checked herbs', tags: ['Milk'], own: true, x: 85, y: 78 }
    ]),
    plate('zz-pin-hand', 'Test hand-set plate', [{ q: '100 g', name: 'Green beans' }], [
      { label: 'Green beans', x: 50, y: 50 }
    ], { contains: [], check: [] })
  ];
  const records = { 'publicBook/index': { r: Object.fromEntries(recipes.map(r => [r.id, 1])) } };
  recipes.forEach(r => { records['publicRecipes/' + r.id] = { r, v: 1, upd: L.NOW - 3600000, src: 'new' }; });
  return records;
}

(async () => {
  const b = await L.start();
  const opts = { who: '', noPin: true, settings: { view: 'pass' } };
  try {
    let p = await L.open(b, '#/r/carbonara', opts);
    let body = await openPin(p, 'Bacon');
    ok(NOT_CHECKED.test(body) && VERIFY.test(body) && !NONE.test(body) && body.includes('120 g, cooked in the pan first.'), 'Carbonara: Bacon says unchecked, keeps the amount and says what to check');
    body = await openPin(p, 'Chives');
    ok(NONE.test(body) && !NOT_CHECKED.test(body), 'Carbonara: explicitly checked Chives keeps No listed allergens');
    body = await openPin(p, 'Garlic bread');
    ok(/Gluten[\s\S]*Milk[\s\S]*Soy\?/.test(body) && !NOT_CHECKED.test(body), 'Carbonara: tagged Garlic bread keeps its definite and possible allergens');
    await lens(p, 'Fish');
    ok(/Bacon · Fish\?/.test(await pin(p, 'Bacon').innerText()), 'Contains Fish: unchecked Bacon is marked possible');
    ok(!(await pin(p, 'Chives').getAttribute('class')).includes('lit'), 'Contains Fish: checked Chives is not marked');
    ok(/Bacon[\s\S]*Fish\?/.test(await p.locator('.ing-row').filter({ hasText: 'Bacon' }).innerText()), 'Contains Fish: the Bacon ingredient line agrees');
    ok(!await L.overflow(p) && !p.errors.length, 'Carbonara: the card fits a 390 px phone without browser errors');
    await p.context().close();

    p = await L.open(b, '#/r/steak-sandwich', { ...opts, width: 1280 });
    body = await openPin(p, 'Side sauce');
    ok(NOT_CHECKED.test(body) && body.includes('Sauce of choice.'), 'Steak Sandwich: the Side sauce alias follows Side sauce of choice');
    body = await openPin(p, 'Steak sandwich');
    ok(NOT_CHECKED.test(body) && /Gluten/.test(body) && /Milk/.test(body) && /Egg/.test(body), 'Steak Sandwich: the shared portion gives its known tags and unchecked ingredient together');
    await p.context().close();

    // PIN_FIXTURE_BASE optionally opens a generated second-venue site. The same signed-out mirror is exercised in CI.
    p = await L.open(b, '#/recipes', { ...opts, base: process.env.PIN_FIXTURE_BASE, extra: fixture(), width: 320, settings: { view: 'pass', text: 'xlarge' } });
    await L.waitFor(p, () => !!document.querySelector('a[href="#/r/zz-pin-checks"]'), null, 10000);
    if (process.env.PIN_FIXTURE_BASE) {
      ok(await p.evaluate(() => !window.LK_APP.byId('carbonara') && window.LK_DATA.recipes.length === 5), 'separate venue: signed out, only its own five mirrored recipes are present');
    }
    await p.locator('a[href="#/r/zz-pin-checks"]').first().press('Enter');
    const count = () => p.evaluate(() => [window.__fake.bill.length, window.__fake.writes.length]);
    const before = await count();
    body = await openPin(p, 'Mixed topping');
    ok(/Milk/.test(body) && /Mustard\?/.test(body) && NOT_CHECKED.test(body) && VERIFY.test(body) && !NONE.test(body) && body.includes('30 g, over the greens.'), 'public mixed pin: mapped Milk, authored Mustard?, uncertainty and the same amount coexist');
    body = await openPin(p, 'Cream with garnish');
    ok(/Milk/.test(body) && NOT_CHECKED.test(body), 'public composite name: both literal ingredient parts are represented');
    ok(NOT_CHECKED.test(await openPin(p, 'Fresh garnish')), 'public alias: a different pin label can point to the same unchecked ingredient');
    ok(NONE.test(await openPin(p, 'Greens')), 'public explicitly checked-none pin keeps its certainty');
    ok(/Sesame/.test(await openPin(p, 'Pepper')), 'public drawing label for half an ingredient retains the whole ingredient’s known allergen');
    body = await openPin(p, 'Ambiguous');
    ok(VERIFY.test(body) && !NONE.test(body), 'public duplicate name: the pin does not pick the first candidate or say none');
    body = await openPin(p, 'Old marker');
    ok(VERIFY.test(body) && !NONE.test(body), 'public unmatched label: the pin directs staff to check');
    body = await openPin(p, 'Unwritten side');
    ok(/Allergens incomplete/.test(body) && VERIFY.test(body) && !NONE.test(body), 'public missing linked card: the button opens an incomplete detail');
    await lens(p, 'Milk');
    ok(/Mixed topping · Milk$/.test(await pin(p, 'Mixed topping').innerText()), 'public Contains Milk: known Milk is solid even when another part is unchecked');
    ok(/Open recipe: Dressing, has Milk/.test(await pin(p, 'Dressing').getAttribute('aria-label')), 'public linked pin: its accessible name keeps the action and says the lens state');
    await lens(p, 'Fish');
    ok(/Mixed topping · Fish\?/.test(await pin(p, 'Mixed topping').innerText()), 'public Contains Fish: the same mixed pin marks an unchecked allergen as possible');
    ok(!await L.overflow(p) && !p.errors.length, 'public fixture: open details fit 320 px with Extra large text');
    ok((await count()).join() === before.join(), 'pin and lens interactions add no reads or writes');
    await pin(p, 'Dressing').press('Enter');
    await L.waitFor(p, () => location.hash === '#/r/zz-pin-checks/zz-pin-dressing');
    ok((await p.locator('#rtitle').innerText()).includes('Checked dressing'), 'a linked pin still opens its own recipe');
    await p.evaluate(() => { location.hash = '#/r/zz-pin-changed'; });
    await L.waitFor(p, () => document.querySelector('#rtitle')?.textContent === 'Test updated ingredients');
    const local = async name => (await pin(p, name).evaluate(el => el.tagName)) === 'BUTTON';
    const href = name => pin(p, name).getAttribute('href');
    ok(/Unlinked garnish[\s\S]*Fish\?/.test(await p.locator('.ing-row').filter({ hasText: 'Unlinked garnish' }).innerText()) && /Fish\?/.test(await pin(p, 'Unlinked garnish').innerText()), 'a retained Studio pin marks the now-unlinked unchecked ingredient as possible');
    ok(await local('Unlinked garnish') && NOT_CHECKED.test(await openPin(p, 'Unlinked garnish')), 'a retained Studio pin opens the unlinked ingredient’s local warning');
    ok((await href('Relinked sauce')) === '#/r/zz-pin-changed/zz-pin-stock', 'a retained Studio pin opens the ingredient’s current replacement recipe');
    ok((await href('Unchanged dressing')) === '#/r/zz-pin-changed/zz-pin-dressing', 'an unchanged Studio pin keeps its recipe link');
    ok((await href('Authored garnish')) === '#/r/zz-pin-changed/zz-pin-dressing', 'a hand-authored pin keeps its independent recipe link');
    ok(await local('Split topping') && VERIFY.test(await openPin(p, 'Split topping')), 'an exact name colliding with a shorter Studio name asks for confirmation without opening the old recipe');
    body = await openPin(p, 'Checked herbs');
    ok(/Milk\?/.test(body) && VERIFY.test(body) && !NONE.test(body), 'conflicting stored Milk is kept as possible when the mapped ingredient has been checked as none');
    body = await openPin(p, 'House herbs');
    ok(/Milk/.test(body) && !/Milk\?/.test(body) && !VERIFY.test(body), 'explicitly authored Milk stays definite on its own distinct pin');
    ok(!(await pin(p, 'Checked herbs').getAttribute('class')).includes('lit'), 'the stored Milk disagreement does not mark unrelated Fish');
    await lens(p, 'Milk');
    ok(/Checked herbs · Milk\?/.test(await pin(p, 'Checked herbs').innerText()), 'Contains Milk keeps the same disagreement as possible');
    await p.evaluate(() => { location.hash = '#/r/zz-pin-hand'; });
    await L.waitFor(p, () => document.querySelector('#rtitle')?.textContent === 'Test hand-set plate');
    body = await openPin(p, 'Green beans');
    ok(/See the recipe’s allergen list/.test(body) && !NONE.test(body) && !NOT_CHECKED.test(body), 'a hand-set recipe stays checked as a whole and makes no claim about an untagged individual part');
    await p.context().close();
  } finally { await b.close(); }
  process.exit(L.report(R));
})().catch(e => { console.error(e); process.exit(1); });
