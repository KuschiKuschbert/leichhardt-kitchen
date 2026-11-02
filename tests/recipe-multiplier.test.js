// Multiply the recipe draft, then use the existing versioned save and public mirror. No live data is touched.
const L = require('./lib');
const fs = require('fs'), path = require('path');
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
// Hold this one authorised recipe response until the lazy editor has opened. This reproduces a slow
// first download without depending on a sleep or changing the stand-in's access and write checks.
const heldRecipeSDK = fs.readFileSync(path.join(__dirname, 'fake/firebase-firestore.js'), 'utf8')
  .replace('export function getDoc(ref) {', 'function multiplierGetDoc(ref) {') + `
let multiplierRecipeHeld = false;
export function getDoc(ref) {
  const response = multiplierGetDoc(ref);
  if (!ref.path.join('/').endsWith('/recipes/multiply-test') || multiplierRecipeHeld) return response;
  multiplierRecipeHeld = true;
  return new Promise(resolve => {
    window.__releaseMultiplierRecipe = () => Promise.resolve(response).then(value => {
      window.__multiplierRecipeSettled = true; resolve(value);
    });
  });
}`;
async function heldRecipe(b, options) {
  const p = await L.open(b, '#/manage/r/multiply-test', Object.assign({
    who: 'ann', admin: false, extra, wait: 1600,
    fakeSDK: { 'firebase-firestore.js': heldRecipeSDK }
  }, options));
  await L.waitFor(p, () => typeof window.__releaseMultiplierRecipe === 'function' && window.LK_MG && /Recipe not found/.test(document.querySelector('#rtitle')?.textContent || ''));
  return p;
}
async function coldRecipeChecks(b) {
  let p = await heldRecipe(b);
  await p.evaluate(() => LK_MG.changed());
  ok(await p.locator('#mg-name').count() === 0 && /Recipe not found/.test(await L.txt(p, '#rtitle')), 'an absent recipe stays absent until its own record arrives');
  await p.evaluate(recipe => {
    const draft = structuredClone(recipe); draft.ingredients[0].q = '200 g';
    localStorage.setItem('lk.mg.draft.multiply-test', JSON.stringify({ at: LK_TIME.now(), e: {
      id: draft.id, d: draft, menu: { sec: '', after: '' },
      meta: { v: 1, src: 'new', base: '', removed: false, off: false, by: 'ann', upd: 0 }, handTags: false
    } }));
  }, recipe);
  const before = await p.evaluate(() => ({ reads: __fake.reads.filter(x => x.endsWith('/recipes/multiply-test')).length, writes: __fake.writes.length }));
  await p.evaluate(() => window.__releaseMultiplierRecipe());
  const recovered = await L.waitFor(p, () => document.querySelector('#mg-name')?.value === 'Multiplier test').catch(() => false);
  ok(recovered, 'a recipe arriving after the editor opens replaces Recipe not found with its form');
  if (recovered) {
    ok(await p.evaluate(() => location.hash === '#/manage/r/multiply-test' && LK_PREP.bookEdit() && LK_PREP.privateAccess()) && await p.locator('#mg-multiplier').count() === 1, 'late recipe recovery keeps the exact route and current head-chef permissions');
    ok(await p.evaluate(before => __fake.reads.filter(x => x.endsWith('/recipes/multiply-test')).length === before.reads && __fake.writes.length === before.writes, before), 'late recipe recovery adds no recipe read or database write');
    ok(await p.locator('[data-mg="kept-use"]').count() === 1, 'late recipe recovery offers the existing kept draft');
    await p.click('[data-mg="kept-use"]');
    ok((await quantities(p))[0] === '200 g', 'accepting the kept draft restores its quantity instead of replacing it');
    await p.fill('[data-f="ing.0.q"]', '123 g');
    await p.evaluate(() => {
      const item = structuredClone(LK_RX.change('multiply-test'));
      item.v += 1; item.r.name = 'Later server copy';
      LK_RX.take(LK_RX.pin(), { r: { 'multiply-test': item.v } }, [['multiply-test', item]]);
      window.dispatchEvent(new Event('lk-rx'));
    });
    ok(await p.inputValue('#mg-name') === 'Multiplier test' && (await quantities(p))[0] === '123 g' && await p.evaluate(() => LK_MG.dirty()), 'a later recipe update preserves actual edits in the recovered draft');
  }
  ok(!p.errors.length, 'late recipe recovery has no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  p = await heldRecipe(b);
  await p.evaluate(() => { location.hash = '#/recipes'; });
  await L.waitFor(p, () => !!document.querySelector('#find'));
  await p.evaluate(() => window.__releaseMultiplierRecipe());
  await L.waitFor(p, () => LK_RX.change('multiply-test')?.r?.name === 'Multiplier test');
  ok(await p.evaluate(() => location.hash === '#/recipes' && !LK_MG.open() && !document.querySelector('#mg-name')), 'a recipe arriving after navigation does not reopen its old editor');
  await p.evaluate(() => { location.hash = '#/manage/r/multiply-test'; });
  await L.waitFor(p, () => document.querySelector('#mg-name')?.value === 'Multiplier test');
  ok(await p.locator('#mg-multiplier').count() === 1 && !p.errors.length, 'returning deliberately opens the now available recipe');
  await p.context().close();

  p = await heldRecipe(b);
  await p.evaluate(recipe => {
    const draft = structuredClone(recipe); draft.ingredients[0].q = '200 g';
    localStorage.setItem('lk.mg.draft.multiply-test', JSON.stringify({ identity: LK_PREP.book().identity(), at: LK_TIME.now(), e: {
      id: draft.id, d: draft, menu: { sec: '', after: '' },
      meta: { v: 1, src: 'new', base: '', removed: false, off: false, by: 'ann', upd: 0 }, handTags: false
    } }));
    window.__multiplierOldRoot = document.querySelector('#mg-root');
    window.__multiplierOldRoot.remove();
  }, recipe);
  await p.evaluate(() => window.__releaseMultiplierRecipe());
  await L.waitFor(p, () => LK_RX.change('multiply-test')?.r?.name === 'Multiplier test');
  ok(await p.evaluate(() => !document.querySelector('#mg-name') && !window.__multiplierOldRoot.querySelector('#mg-name') && /Recipe not found/.test(window.__multiplierOldRoot.textContent)), 'a detached recipe root stays untouched when the authorised recipe arrives');
  const remounted = await p.evaluate(() => {
    const reads = __fake.reads.length, writes = __fake.writes.length;
    const root = document.createElement('div'); root.id = 'mg-root'; document.querySelector('#main').appendChild(root);
    LK_MG.mount(root, { sub: ['r', 'multiply-test'] });
    return { opened: root.querySelector('#mg-name')?.value === 'Multiplier test', sameRoute: location.hash === '#/manage/r/multiply-test',
      kept: !!root.querySelector('[data-mg="kept-use"]'), reads: __fake.reads.length === reads, writes: __fake.writes.length === writes };
  });
  ok(remounted.opened && remounted.sameRoute, 'remounting the exact missing route opens its already received recipe');
  ok(remounted.reads && remounted.writes, 'cached recipe remount adds no SDK read or database write');
  ok(remounted.kept, 'cached recipe remount offers the original person\'s kept draft');
  if (remounted.kept) {
    await p.click('[data-mg="kept-use"]');
    ok((await quantities(p))[0] === '200 g', 'cached recipe remount restores the kept quantity when accepted');
  }
  ok(!p.errors.length, 'cached recipe remount has no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  const cutoff = Date.parse(L.ymd(new Date(L.NOW)) + 'T04:00:00+10:00');
  p = await heldRecipe(b, { clock: cutoff - 60000 });
  await p.clock.fastForward(90000);
  await L.waitFor(p, () => !LK_PREP.privateAccess());
  await p.evaluate(() => window.__releaseMultiplierRecipe());
  await L.waitFor(p, () => window.__multiplierRecipeSettled);
  await L.settle(p, 300);
  ok(await p.evaluate(() => !LK_PREP.bookEdit() && !LK_MG.open() && !document.querySelector('#mg-name,#mg-multiplier')), 'a late recipe cannot reopen private editing after the daily PIN lock');
  ok(await p.evaluate(() => !LK_RX.change('multiply-test')), 'the expired access epoch discards its held recipe response');
  const choice = p.locator('.p-name[data-id="ann"]');
  if (await choice.count() && await choice.isVisible()) await choice.click();
  await p.fill('#pf1', '2222');
  await L.waitFor(p, () => LK_PREP.bookEdit() && LK_PREP.state.who === 'ann', null, 8000);
  await p.clock.fastForward(61000);
  await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  const unlocked = await L.waitFor(p, () => document.querySelector('#mg-name')?.value === 'Multiplier test').catch(() => false);
  ok(unlocked && await p.evaluate(() => LK_PREP.privateAccess() && LK_PREP.state.who === 'ann' && location.hash === '#/manage/r/multiply-test' && __fake.reads.filter(x => x.endsWith('/recipes/multiply-test')).length === 2), 'the same person unlocks and a normal wake opens the freshly accepted recipe after the existing retry delay');
  ok(!p.errors.length, 'locked late recipe has no browser errors ' + p.errors.join(' | '));
  await p.context().close();
}
(async () => {
  const b = await L.start();
  await coldRecipeChecks(b);
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
