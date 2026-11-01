// Multiply the recipe draft, then use the existing versioned save and public mirror. No live data is touched.
const L = require('./lib');
const { R, ok } = L.results();
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const person = (id, role) => ({ id, name: id, role, active: true, add: true, tick: true, del: true });
const cfg = { people: [person('ann', 'head'), person('sam', 'sous'), person('bo', 'staff'), person('fay', 'fnc')], headId: 'ann', sousIds: ['ann', 'sam'], staffIds: ['ann', 'sam', 'bo', 'fay'], fnOnlyIds: ['fay'], fnIds: ['fay'] };
const marker = '<img src=x onerror="window.__pwn=1">';
const recipe = { id: 'multiply-test', no: '999', kind: 'batch', name: 'Multiplier test', yield: 'Batch: 1 L. 50 ml per serve.',
  ingredients: [{ q: '100 g', name: 'Flour', tags: ['Gluten'], note: 'Sifted' }, { q: '½ portion', name: 'Sauce', link: 'gravy' }, { q: '1 1/2 L', name: 'Milk' }, { q: '380 to 420 g', name: 'Potatoes' }, { q: '[Qty]', name: 'Salt' }, { q: 'to taste', name: 'Pepper' }, { q: '', name: 'Garnish' }, { q: '6 or 4', name: marker }],
  sections: [{ title: 'Method', steps: ['Cook at 180 C for 20 minutes. Use 50 ml per serve.'] }], art: 'gravy' };
const extra = { [key(['config', 'main'])]: cfg, [key(['book', 'index'])]: { r: { 'multiply-test': 1 } }, [key(['recipes', 'multiply-test'])]: { r: recipe, v: 1, upd: L.NOW - 60000, by: 'ann', src: 'new', removed: false }, [key(['pinset', 'fay'])]: { at: 1 } };
const quantities = p => p.locator('[data-f^="ing."][data-f$=".q"]').evaluateAll(xs => xs.map(x => x.value));
const original = recipe.ingredients.map(i => i.q);
const doubled = ['200 g', '1 portion', '3 L', '760 to 840 g', '[Qty]', 'to taste', '', '6 or 4'];
async function open(b, options) {
  const p = await L.open(b, '#/manage/r/multiply-test', Object.assign({ extra, wait: 1600 }, options));
  await L.waitFor(p, () => document.querySelector('#mg-name')?.value === 'Multiplier test');
  return p;
}
async function apply(p, factor) { await p.fill('#mg-multiplier', factor); await p.click('[data-mg="multiply"]'); }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
(async () => {
  const b = await L.start();
  for (const [who, admin, width] of [['ann', false, 390], ['sam', false, 768], ['', true, 1280]]) {
    const p = await open(b, { who, admin, width });
    const role = admin ? 'admin' : who === 'ann' ? 'head chef' : 'sous chef';
    ok(!!await p.$('#mg-multiplier'), role + ': multiplier is available');
    await p.fill('#mg-multiplier', '3');
    ok(!await p.evaluate(() => LK_MG.dirty()), role + ': typing a factor alone does not change the recipe');
    await apply(p, '2');
    ok(same(await quantities(p), doubled), role + ': doubles numbers, fractions and ranges, preserving unclear amounts');
    ok(await p.inputValue('#mg-yield') === recipe.yield && await p.inputValue('#mg-ss-0') === recipe.sections[0].steps[0], role + ': portion line, temperature and cooking time stay as written');
    ok(await p.evaluate(() => !document.querySelector('img[src="x"]') && !window.__pwn) && /Check by hand:/.test(await p.locator('#mg-h-ing').locator('..').innerText()), role + ': skipped amounts are listed as safe plain text');
    ok(await p.evaluate(k => !__fake.dump()[k+'/hist/1'] && JSON.parse(localStorage.getItem('lk.mg.draft.multiply-test')).e.d.ingredients[0].q === '200 g', key(['recipes', 'multiply-test'])), role + ': apply keeps a draft without writing to Firestore');
    // A second tap does not accidentally multiply twice. The factor resets to 1 after applying.
    await p.click('[data-mg="multiply"]');
    ok(same(await quantities(p), doubled), role + ': a repeated apply leaves the quantities unchanged');
    ok(!await L.overflow(p), role + ': fits at ' + width + ' px');
    if (who === 'ann') {
      await p.screenshot({ path: 'shots/recipe-multiplier.png', fullPage: true });
      await p.click('[data-mg="multiply-undo"]');
      ok(same(await quantities(p), original) && !await p.evaluate(() => LK_MG.dirty()), 'Undo multiplier restores the original draft');
      for (const invalid of ['', '0', '-2', 'Infinity', '2x', '1e3']) {
        await apply(p, invalid);
        ok(same(await quantities(p), original) && /greater than 0/.test(await p.locator('#mg-h-ing').locator('..').innerText()), 'invalid factor ' + JSON.stringify(invalid) + ' changes nothing and explains the error');
      }
      await apply(p, '0,5');
      ok((await quantities(p))[0] === '50 g', 'decimal comma halves the current draft');
      await p.fill('[data-f="ing.0.q"]', '60 g');
      await p.click('[data-mg="ing-up"][data-i="1"]');
      await p.click('[data-mg="multiply-undo"]');
      ok(same((await quantities(p)).slice(0, 3), ['½ portion', '60 g', '1 1/2 L']), 'Undo follows moved rows and preserves a later manual quantity edit');
      await p.context().close();
      continue;
    }
    await p.click('[data-mg="save"]');
    await L.waitFor(p, k => __fake.dump()[k]?.v === 2, key(['recipes', 'multiply-test']));
    const saved = await p.evaluate(k => __fake.dump()[k], key(['recipes', 'multiply-test']));
    ok(same(saved.r.ingredients.map(i => i.q), doubled) && saved.by === (admin ? 'ann' : who), role + ': normal Save persists the quantities with the correct PIN writer');
    ok(saved.r.ingredients[0].tags[0] === 'Gluten' && saved.r.ingredients[1].link === 'gravy' && saved.r.ingredients[0].note === 'Sifted', role + ': links, allergens and notes stay intact');
    ok(await p.evaluate(k => __fake.dump()[k+'/hist/1'].was.r.ingredients[0].q === '100 g' && __fake.dump()['publicRecipes/multiply-test'].r.ingredients[0].q === '200 g', key(['recipes', 'multiply-test'])), role + ': save keeps history and updates the public recipe');
    await p.reload();
    await L.waitFor(p, () => document.querySelector('[data-f="ing.0.q"]')?.value === '200 g');
    ok((await quantities(p))[0] === '200 g', role + ': saved amounts survive reloading');
    ok(!p.errors.length, role + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  // Draft recovery uses the existing kept-changes flow.
  let p = await open(b, { who: 'ann' });
  await apply(p, '2'); await p.reload();
  await L.waitFor(p, () => !!document.querySelector('[data-mg="kept-use"]'));
  await p.click('[data-mg="kept-use"]');
  ok(same(await quantities(p), doubled), 'multiplied draft can be restored after reloading without saving');
  await p.evaluate(() => LK_PREP.signOut(true)); await L.settle(p, 700);
  ok(!await p.$('#mg-multiplier') && !await p.evaluate(() => localStorage.getItem('lk.mg.draft.multiply-test')), 'handover removes the multiplier and private recipe draft');
  await p.context().close();
  for (const options of [{ who: 'bo' }, { who: 'fay' }, { who: '' }, { who: '', noPin: true }, { who: 'bo', admin: true }]) {
    p = await L.open(b, '#/manage/r/multiply-test', Object.assign({ extra, wait: 1600 }, options));
    ok(!await p.$('#mg-multiplier') && !await p.$('[data-mg="multiply"]'), JSON.stringify(options) + ': cannot open the multiplier');
    await p.context().close();
  }
  await b.close(); L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
