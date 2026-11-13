// The recipe editor (js/manage.js) saves what the card needs (13 Nov 2026): a linked ingredient keeps its allergen
// tags, a dish taken off the guest menu stays off, long method steps are refused with a clear message, and Undo after
// two multipliers goes back to the amounts before the first one.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true });
const cfg = () => ({ [fsKey(['config', 'main'])]: { people: [P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'head'), P('bo', 'Bo', 'staff')], headId: 'ann', sousIds: ['sam', 'ann'], pingIds: ['sam', 'ann'], showBadges: true } });
const wait = (p, fn, arg, t) => L.waitFor(p, fn, arg, t || 6000).catch(() => false);
const store = p => p.evaluate(() => window.__fake.dump());
const editor = p => wait(p, () => !!document.getElementById('mg-name'));
// waits until recipes/<id> is saved at version v and the Save button has settled
const savedAt = (p, id, v) => wait(p, ([root, id, v]) => {
  const s = window.__fake.dump(), r = s[root + '/recipes/' + id], save = document.querySelector('[data-mg="save"]');
  return !!(r && r.v === v && save && save.disabled);
}, [fsKey([]), id, v], 10000);
async function go(p, hash) { await p.evaluate(h => { location.hash = h; }, hash); await L.settle(p, 300); }

(async () => {
  const b = await L.start();
  let p, s;

  // 1. a linked ingredient keeps its allergen tags when the recipe is saved: the beer batter card is still to come,
  // so the fish's Gluten comes only from the tag on its Beer batter line
  p = await L.open(b, '#/manage/r/fish-chips', { who: 'ann', extra: cfg(), wait: 1400 });
  await editor(p);
  await L.chapter(p, 'card');
  await L.reveal(p, '#mg-yield'); await p.fill('#mg-yield', '1 plate');
  await p.click('[data-mg="save"]');
  await savedAt(p, 'fish-chips', 1);
  s = await store(p);
  const fc = (s[fsKey(['recipes', 'fish-chips'])] || {}).r || { ingredients: [] };
  const ingOf = n => fc.ingredients.find(i => i.name === n) || {};
  ok(JSON.stringify(ingOf('Beer batter').tags) === '["Gluten"]' && ingOf('Beer batter').link === 'beer-batter', 'linked tags: Beer batter keeps its link and its Gluten tag (' + JSON.stringify(ingOf('Beer batter')) + ')');
  ok(JSON.stringify(ingOf('Tartare sauce').tags) === '["Egg","Soy?"]', 'linked tags: Tartare sauce keeps Egg and Soy? (' + JSON.stringify(ingOf('Tartare sauce')) + ')');
  await go(p, '#/r/fish-chips'); await L.settle(p, 400);
  const alg = await txt(p, '#r-allergens') || '';
  ok(/Gluten/.test(alg) && /Egg/.test(alg) && /Fish/.test(alg), 'linked tags: the saved card still lists Gluten, Egg and Fish (' + alg.slice(0, 160) + ')');
  ok(p.errors.length === 0, 'linked tags: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 4. a js/data.js dish taken off the guest menu stays off: Chicken Adobo is a special in the book file
  const fileMenu = (() => { const c = { window: {} }; require('vm').runInNewContext(require('fs').readFileSync(require('path').join(__dirname, '../js/data.js'), 'utf8'), c); return c.window.LK_DATA.menuOrder; })();
  const fileSpecials = (fileMenu.find(m => m.title === 'Specials') || { ids: [] }).ids;
  const specialsShown = p => p.evaluate(() => ((window.LK_DATA.menuOrder || []).find(m => m.title === 'Specials') || { ids: [] }).ids.slice());
  p = await L.open(b, '#/manage/r/chicken-adobo', { who: 'ann', extra: cfg(), wait: 1400 });
  await editor(p);
  await L.chapter(p, 'card');
  ok(await p.getAttribute('[data-mg="sw-special"]', 'aria-checked') === 'true', 'off the menu: Chicken Adobo starts as a special');
  await L.reveal(p, '[data-mg="sw-special"]'); await p.click('[data-mg="sw-special"]'); await L.settle(p, 100);
  ok(await p.inputValue('#mg-msec') === '', 'off the menu: Not on the guest menu is chosen');
  await p.click('[data-mg="save"]');
  await savedAt(p, 'chicken-adobo', 1);
  s = await store(p);
  const idx = s[fsKey(['book', 'index'])] || {};
  ok((idx.menu || []).every(m => !(m.ids || []).includes('chicken-adobo')), 'off the menu: the saved menu does not have it');
  ok(((idx.menu || [])[0] || {}).seen && idx.menu[0].seen.includes('chicken-adobo'), 'off the menu: the saved menu says which book file dishes it saw');
  ok(!(await specialsShown(p)).includes('chicken-adobo'), 'off the menu: gone from Specials on this phone at once (' + (await specialsShown(p)).join(', ') + ')');
  await p.reload(); await L.settle(p, 1000);
  ok(!(await specialsShown(p)).includes('chicken-adobo'), 'off the menu: still gone after a reload');
  ok(p.errors.length === 0, 'off the menu: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  // a fresh phone gets the saved menu: Adobo stays off, the other specials stay on
  p = await L.open(b, '#/recipes', { who: 'bo', extra: Object.assign(cfg(), { [fsKey(['book', 'index'])]: idx, [fsKey(['recipes', 'chicken-adobo'])]: s[fsKey(['recipes', 'chicken-adobo'])] }), wait: 1400 });
  await wait(p, () => !!(window.LK_RX && window.LK_RX.syncedAt()), null, 8000);
  await L.settle(p, 300);
  const fresh = await specialsShown(p);
  ok(!fresh.includes('chicken-adobo') && fileSpecials.filter(id => id !== 'chicken-adobo').every(id => fresh.includes(id)), 'off the menu: a fresh phone shows the specials without Adobo (' + fresh.join(', ') + ')');
  await p.context().close();
  // a dish js/data.js put on the menu after the menu was saved still shows: a saved menu without lamb-nachos and
  // that never saw it, and an older saved menu with no seen list at all
  const without = id => fileMenu.map((m, i) => Object.assign({ title: m.title, ids: m.ids.filter(x => x !== id) }, i ? {} : { seen: [].concat(...fileMenu.map(x => x.ids)).filter(x => x !== id) }));
  for (const [label, menu] of [['a dish new in js/data.js', without('lamb-nachos')], ['a menu saved before seen', fileMenu.map(m => ({ title: m.title, ids: m.ids.filter(x => x !== 'lamb-nachos') }))]]) {
    p = await L.open(b, '#/recipes', { who: 'bo', extra: Object.assign(cfg(), { [fsKey(['book', 'index'])]: { r: {}, menu } }), wait: 1400 });
    await wait(p, () => !!(window.LK_RX && window.LK_RX.syncedAt()), null, 8000);
    await L.settle(p, 300);
    const shown = await specialsShown(p);
    ok(shown.includes('lamb-nachos') && shown.includes('chicken-adobo'), label + ': still shows in Specials (' + shown.join(', ') + ')');
    await p.context().close();
  }

  // 5. a method step longer than the book keeps, or too many steps, is refused with a clear message, never cut on Save
  p = await L.open(b, '#/manage/r/burger', { who: 'ann', extra: cfg(), wait: 1400 });
  await editor(p);
  await L.chapter(p, 'method');
  const longStep = ('Fold gently. ').repeat(50).trim() + ' Done';   // 604 characters
  await L.reveal(p, '#mg-ss-0'); await p.fill('#mg-ss-0', 'Toast the buns.\n' + longStep);
  await L.settle(p, 200);
  await p.click('[data-mg="save"]'); await L.settle(p, 300);
  const errsText = () => txt(p, '.mg-errs').then(t => t || '');
  ok(/Method, Cooking: step 2 is over 600 characters\./.test(await errsText()), 'long step: Save says Method, Cooking: step 2 is over 600 characters (' + await errsText() + ')');
  ok(!(await store(p))[fsKey(['recipes', 'burger'])], 'long step: nothing is saved');
  ok(/\bmethod\*?!/.test(await p.evaluate(() => [...document.querySelectorAll('.mg-chb')].map(c => c.getAttribute('data-v') + (c.getAttribute('aria-current') ? '*' : '') + (c.querySelector('.mg-chx') ? '!' : '')).join(' '))), 'long step: the Method chapter is marked to fix');
  await L.reveal(p, '#mg-ss-1'); await p.fill('#mg-ss-1', Array.from({ length: 61 }, (_, i) => 'Layer ' + (i + 1) + '.').join('\n'));
  await L.reveal(p, '#mg-ss-0'); await p.fill('#mg-ss-0', 'Toast the buns.\n' + longStep.slice(0, 600));
  await L.settle(p, 200);
  await p.click('[data-mg="save"]'); await L.settle(p, 300);
  ok(/Method, Plating, bottom to top: 60 steps at most\./.test(await errsText()) && !/over 600/.test(await errsText()), 'too many steps: Save says Method, Plating, bottom to top: 60 steps at most (' + await errsText() + ')');
  ok(!(await store(p))[fsKey(['recipes', 'burger'])], 'too many steps: nothing is saved');
  await L.reveal(p, '#mg-ss-1'); await p.fill('#mg-ss-1', Array.from({ length: 60 }, (_, i) => 'Layer ' + (i + 1) + '.').join('\n'));
  await L.settle(p, 200);
  await p.click('[data-mg="save"]');
  await savedAt(p, 'burger', 1);
  const bs = ((await store(p))[fsKey(['recipes', 'burger'])] || {}).r || {};
  ok(bs.sections && bs.sections[0].steps[1] === longStep.slice(0, 600) && bs.sections[1].steps.length === 60, 'at the limits: a 600 character step and 60 steps save whole');
  ok(p.errors.length === 0, 'long steps: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 6. Undo after two multipliers goes back to the amounts before the first one
  p = await L.open(b, '#/manage/r/burger', { who: 'ann', extra: cfg(), wait: 1400 });
  await editor(p);
  await L.chapter(p, 'ing');
  const amounts = () => p.evaluate(() => [...document.querySelectorAll('[data-f^="ing."][data-f$=".q"]')].map(i => i.value));
  const start = await amounts();
  const applyBy = async f => {
    await L.reveal(p, '[data-mg="scale"]');
    if (!await p.$('#mg-multiplier')) { await p.click('[data-mg="scale"]'); await wait(p, () => !!document.getElementById('mg-multiplier')); }
    await p.fill('#mg-multiplier', f); await p.click('[data-mg="multiply"]'); await L.settle(p, 200);
  };
  await applyBy('2');
  const twice = await amounts();
  ok(twice.includes('200 g') && twice.includes('300 g'), 'multiplier: x2 doubles the amounts (' + twice.join(', ') + ')');
  await applyBy('1.5');
  const then = await amounts();
  ok(then.includes('300 g') && then.includes('450 g'), 'multiplier: then x1.5 (' + then.join(', ') + ')');
  await L.reveal(p, '[data-mg="multiply-undo"]'); await p.click('[data-mg="multiply-undo"]'); await L.settle(p, 200);
  const back = await amounts();
  ok(JSON.stringify(back) === JSON.stringify(start), 'multiplier: Undo after x2 and x1.5 gives the amounts before the first one (' + back.join(', ') + ' vs ' + start.join(', ') + ')');
  ok(await p.$('[data-mg="multiply-undo"]') === null, 'multiplier: nothing left to undo');
  ok(p.errors.length === 0, 'multiplier: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
