// Manage Recipes & Drawings (#/manage, js/manage.js, 21 Oct 2026): only the head chef sees it and can save. A saved
// change shows on the card, in search and on a fresh phone; a new recipe fills a card to come. Checks, a change made on
// another device, a refused save, drafts kept on the device, hiding a recipe and earlier versions.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true });
// Ann is the head chef here (headId), Sam a sous chef and Bo staff
const cfg = () => ({ [fsKey(['config', 'main'])]: { people: [P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'head'), P('bo', 'Bo', 'staff')], headId: 'ann', sousIds: ['sam', 'ann'], pingIds: ['sam', 'ann'], showBadges: true } });
const wait = (p, fn, arg, t) => L.waitFor(p, fn, arg, t || 6000).catch(() => false);
const store = p => p.evaluate(() => window.__fake.dump());
// a toast not read yet: the last one can still be on screen for 4 s, and on a fast computer the next check would read it
const toast = p => wait(p, () => { const t = document.querySelector('.mg-toasts .p-toast'); return t && !t.dataset.read ? t.textContent : ''; }, null, 10000);
const toastText = p => p.evaluate(() => { const t = document.querySelector('.mg-toasts .p-toast'); if (!t) return null; t.dataset.read = '1'; return t.textContent; });
const editor = p => wait(p, () => !!document.getElementById('mg-name'));
const mgFetched = p => p.urls.some(u => /js\/manage\.js/.test(u));
async function go(p, hash) { await p.evaluate(h => { location.hash = h; }, hash); await L.settle(p, 300); }

(async () => {
  const b = await L.start();
  let p, s, l;

  // who sees it: the head chef by PIN, the head chef's Google device with nobody signed in; not a sous chef or staff
  p = await L.open(b, '#/recipes', { who: 'ann', extra: cfg(), wait: 1400 });
  l = await L.chefItems(p);
  ok(l.includes('manage') && l.indexOf('manage') < l.indexOf('pings'), 'head chef by PIN: Manage Recipes & Drawings is in the Chef group (' + l.join(', ') + ')');
  await go(p, '#/r/burger');
  ok(await p.$('#r-edit a[href="#/manage/r/burger"]') !== null, 'head chef: the card has Change this recipe');
  await p.context().close();
  for (const who of ['bo']) {
    p = await L.open(b, '#/r/burger', { who, extra: cfg(), wait: 1400 });
    l = await L.chefItems(p);
    ok(!l.includes('manage'), who + ': no Manage Recipes & Drawings in the menu (' + l.join(', ') + ')');
    ok(await p.$('#r-edit a') === null, who + ': no Change this recipe on the card');
    await go(p, '#/manage'); await L.settle(p, 500);
    ok(/Only the head chef can change recipes/.test(await txt(p, '#rtitle') || ''), who + ': #/manage says only the head chef can change recipes');
    ok(!mgFetched(p), who + ': the recipe editor is never downloaded');
    if (who === 'bo') {
      const res = await p.evaluate(k => {
        const api = window.LK_PREP.book();
        return api.ready().then(() => api.W([['set', api.docRef('recipes', 'burger'), { r: { id: 'burger', kind: 'main', name: 'Hacked' }, v: 1, upd: 1, src: 'book', base: '', removed: false }]])).then(() => 'saved', e => e.code);
      }, L.PIN);
      ok(res === 'permission-denied', 'staff: a save through the book\'s own write path is refused (' + res + ')');
    }
    await p.context().close();
  }
  p = await L.open(b, '#/recipes', { who: '', admin: true, extra: cfg(), wait: 1400 });
  l = await L.chefItems(p);
  ok(l.includes('manage'), 'head chef\'s Google device, nobody signed in: Manage Recipes & Drawings in the menu (' + l.join(', ') + ')');
  await p.context().close();
  p = await L.open(b, '#/recipes', { who: 'sam', admin: true, extra: cfg(), wait: 1400 });
  l = await L.chefItems(p);
  ok(!l.includes('manage'), 'head chef\'s Google device with a sous chef signed in: no Manage Recipes & Drawings');
  await p.context().close();

  // the head chef changes the burger
  p = await L.open(b, '#/manage', { who: 'ann', extra: cfg(), wait: 1400 });
  await wait(p, () => !!document.getElementById('mg-q'));
  ok(mgFetched(p) && await p.$('#mg-q') !== null, 'head chef: #/manage loads the editor and lists the recipes');
  await p.fill('#mg-q', 'chicken burger'); await L.settle(p, 200);
  ok(await p.$('#mg-results a[href="#/manage/r/burger"]') !== null, 'the list finds the burger');
  await p.click('#mg-results a[href="#/manage/r/burger"]');
  await editor(p);
  ok(await p.inputValue('#mg-name') === 'Chicken Burger', 'the form opens with the burger as the book has it');
  await p.fill('#mg-name', 'Chicken Burger Deluxe');
  await p.click('[data-mg="ing-add"]'); await L.settle(p, 150);
  const n = await p.evaluate(() => document.querySelectorAll('.mg-ing').length);
  await p.fill('[data-f="ing.' + (n - 1) + '.q"]', '3 slices');
  await p.fill('[data-f="ing.' + (n - 1) + '.name"]', 'Pickles');
  await L.settle(p, 500);
  ok(/Not saved yet/.test(await txt(p, '.mg-state') || '') && await p.evaluate(() => window.LK_MG.dirty() && window.LK_PREP.unsaved()), 'typing: the bar says Not saved yet, and sign out waits for it');
  ok(!!(await p.evaluate(() => localStorage.getItem('lk.mg.draft.burger'))), 'typing: a draft is kept on this device');
  await p.click('[data-mg="save"]');
  await toast(p);
  ok(/Saved\. Version 1\./.test(await toastText(p) || ''), 'save: Saved. Version 1.');
  s = await store(p);
  const rb = s[fsKey(['recipes', 'burger'])] || {};
  ok(rb.v === 1 && rb.r && rb.r.name === 'Chicken Burger Deluxe' && rb.by === 'ann' && rb.src === 'book' && /^[0-9a-f]{8}$/.test(rb.base || ''), 'save: recipes/burger is version 1 by Ann, from the book file');
  ok(rb.r && rb.r.ingredients.some(i => i.name === 'Pickles' && i.q === '3 slices'), 'save: the new ingredient is saved');
  ok(rb.r && !rb.r.sec && !('rolled' in rb.r), 'save: nothing the book works out is saved');
  ok((s[fsKey(['book', 'index'])] || {}).r && s[fsKey(['book', 'index'])].r.burger === 1, 'save: book/index says burger is version 1');
  ok(!(await p.evaluate(() => localStorage.getItem('lk.mg.draft.burger'))), 'save: the draft is cleared');
  await go(p, '#/r/burger'); await L.settle(p, 400);
  ok(/Chicken Burger Deluxe/.test(await txt(p, '#rtitle') || '') && /Pickles/.test(await txt(p, '.ing') || ''), 'the card shows the change at once');
  await go(p, '#/recipes'); await L.settle(p, 300);
  await p.fill('#find', 'deluxe'); await L.settle(p, 400);
  ok(await p.$('#shelves a[href="#/r/burger"]:not(.faded)') !== null, 'search finds the new name');
  await p.reload(); await L.settle(p, 1000);
  await go(p, '#/r/burger');
  ok(/Chicken Burger Deluxe/.test(await txt(p, '#rtitle') || ''), 'reload: the change is still there');
  ok(p.errors.length === 0, 'head chef: no page errors ' + p.errors.join(' | '));
  const saved = await store(p);
  await p.context().close();

  // a fresh phone (Bo) gets the change when the book connects
  p = await L.open(b, '#/r/burger', { who: 'bo', extra: Object.assign(cfg(), { [fsKey(['book', 'index'])]: saved[fsKey(['book', 'index'])], [fsKey(['recipes', 'burger'])]: saved[fsKey(['recipes', 'burger'])] }), wait: 1400 });
  await wait(p, () => /Deluxe/.test((document.getElementById('rtitle') || {}).textContent || ''));
  ok(/Chicken Burger Deluxe/.test(await txt(p, '#rtitle') || ''), 'a fresh phone: the card shows the head chef\'s change');
  await p.context().close();

  // a new recipe for a card to come: the beer batter the fish burger links to
  p = await L.open(b, '#/manage', { who: 'ann', extra: cfg(), wait: 1400 });
  await wait(p, () => !!document.getElementById('mg-q'));
  await p.click('[data-mg="chip"][data-v="tocome"]'); await L.settle(p, 200);
  ok(await p.$('a[href="#/manage/new/beer-batter"]') !== null, 'Cards to come lists beer-batter');
  await p.click('a[href="#/manage/new/beer-batter"]');
  await editor(p);
  ok(await p.inputValue('#mg-id') === 'beer-batter' && await p.inputValue('#mg-kind') === 'batch', 'new card: the id is filled in and it starts as a batch recipe');
  await p.click('[data-mg="save"]'); await L.settle(p, 300);
  ok(/Give the recipe a name/.test(await txt(p, '.mg-errs') || ''), 'checks: a recipe needs a name');
  ok(await p.evaluate(() => document.activeElement && document.activeElement.id === 'mg-name'), 'checks: the name box gets the focus');
  await p.fill('#mg-name', 'Beer Batter');
  await p.fill('#mg-yield', '2 L batch');
  for (const [q, name] of [['500 g', 'Self-raising flour'], ['750 ml', 'Lager']]) {
    await p.click('[data-mg="ing-add"]'); await L.settle(p, 150);
    const k = await p.evaluate(() => document.querySelectorAll('.mg-ing').length - 1);
    await p.fill('[data-f="ing.' + k + '.q"]', q); await p.fill('[data-f="ing.' + k + '.name"]', name);
    await p.click('[data-mg="ing-tags"][data-i="' + k + '"]'); await L.settle(p, 150);
    await p.click('[data-mg="tag"][data-i="' + k + '"][data-v="Gluten"]'); await L.settle(p, 150);
  }
  await p.fill('#mg-ss-0', 'Whisk the beer into the flour until smooth.\nRest 20 minutes in the cool room.');
  await L.settle(p, 200);
  ok(/Gluten/.test(await txt(p, '.mg-alg-now') || ''), 'new card: the allergens follow the tagged ingredients');
  await p.click('[data-mg="save"]');
  await toast(p);
  ok(/Saved\. Version 1\./.test(await toastText(p) || ''), 'new card: saved as version 1');
  ok(/#\/manage\/r\/beer-batter$/.test(p.url()), 'new card: the page is now the recipe\'s own form');
  s = await store(p);
  const nb = s[fsKey(['recipes', 'beer-batter'])] || {};
  ok(nb.src === 'new' && nb.base === '' && nb.r && nb.r.sections[0].steps.length === 2 && nb.r.ingredients.every(i => i.tags && i.tags[0] === 'Gluten'), 'new card: saved as new, with its steps and tags');
  await go(p, '#/r/fish-burger'); await L.settle(p, 400);
  ok(!/Card to come/.test(await txt(p, '.ing') || '') && /Beer Batter/.test(await txt(p, '#r-allergens') || ''), 'new card: the fish burger links to it and its allergens are complete');

  // the id of a new recipe must be free
  await go(p, '#/manage/new'); await editor(p);
  await p.fill('#mg-name', 'Burger');
  await p.click('[data-mg="save"]'); await L.settle(p, 300);
  ok(/already used/.test(await txt(p, '.mg-errs') || ''), 'checks: a new recipe cannot take an id in use');
  await p.click('[data-mg="undo-all"]'); await p.click('[data-mg="undo-all"]'); await L.settle(p, 200);

  // a change saved on another device after the form opened: the head chef picks
  await go(p, '#/manage/r/burger'); await editor(p);
  await p.evaluate(([k, v]) => window.__fake.write(k, v), [fsKey(['recipes', 'burger']), Object.assign({}, saved[fsKey(['recipes', 'burger'])], { v: 2, r: Object.assign({}, saved[fsKey(['recipes', 'burger'])].r, { name: 'Chicken Burger Other' }), upd: L.NOW - 60000 })]);
  await p.fill('#mg-name', 'Chicken Burger Mine');
  await p.click('[data-mg="save"]');
  await wait(p, () => !!document.querySelector('[data-mg="mine"]'));
  ok(/Changed on another device/.test(await txt(p, '.mg-ed .warn') || '') && /Version 2/.test(await txt(p, '.mg-ed .warn') || ''), 'another device: the save stops and says version 2 was saved meanwhile');
  await p.click('[data-mg="mine"]');
  await toast(p);
  ok(/Version 3/.test(await toastText(p) || ''), 'another device: Save mine over it saves version 3');
  s = await store(p);
  ok(s[fsKey(['recipes', 'burger'])].r.name === 'Chicken Burger Mine' && (s[fsKey(['recipes', 'burger', 'hist', '2'])] || {}).was && s[fsKey(['recipes', 'burger', 'hist', '2'])].was.r.name === 'Chicken Burger Other', 'another device: their version is kept as an earlier version');

  // a refused save: the change stays on the device
  await p.evaluate(() => { window.__fake.mode = 'deny'; });
  await p.fill('#mg-name', 'Chicken Burger Refused');
  await p.click('[data-mg="save"]');
  await wait(p, () => !!document.querySelector('.mg-bar .p-err'));
  ok(/refused/.test(await txt(p, '.mg-bar .p-err') || ''), 'refused: the bar says the book refused it');
  ok(/Refused/.test(await p.evaluate(() => localStorage.getItem('lk.mg.draft.burger') || '')), 'refused: the change is kept on this device');
  await p.evaluate(() => { window.__fake.mode = 'ok'; });

  // leaving with changes not saved: offered back when the recipe opens again, also after a reload
  await go(p, '#/manage'); await L.settle(p, 200);
  await go(p, '#/manage/r/burger'); await editor(p);
  ok(await p.$('.mg-kept') !== null && await p.inputValue('#mg-name') === 'Chicken Burger Mine', 'draft: offered back, the form shows the saved recipe until asked');
  await p.reload(); await L.settle(p, 1000); await editor(p);
  ok(await p.$('.mg-kept') !== null, 'draft: still offered after a reload');
  await p.click('[data-mg="kept-use"]'); await L.settle(p, 200);
  ok(await p.inputValue('#mg-name') === 'Chicken Burger Refused', 'draft: Keep editing them puts the change back in the form');

  // earlier versions: the other device's version 2 (kept when version 3 went over it) goes back in as the card
  await p.click('[data-mg="hist"]');
  await wait(p, () => document.querySelectorAll('.mg-hist li').length >= 1);
  ok(await p.evaluate(() => document.querySelectorAll('.mg-hist li').length) === 1 && /Version 2/.test(await txt(p, '.mg-hist') || ''), 'earlier versions: version 2 is listed');
  // its own toast ("Version 2 is in the form") can come late on a busy computer: read it here, not after the save
  await p.click('.mg-hist li:first-child [data-mg="hist-use"]'); await toast(p); await toastText(p);
  ok(await p.inputValue('#mg-name') === 'Chicken Burger Other', 'earlier versions: version 2 is in the form');
  await p.click('[data-mg="save"]'); await toast(p);
  ok(/Version 4/.test(await toastText(p) || ''), 'earlier versions: saved again as version 4');

  // hide a recipe and put it back
  await go(p, '#/manage/r/side-salad'); await editor(p);
  ok(await p.getAttribute('[data-mg="sw-show"]', 'aria-checked') === 'true', 'hide: the Show in the book switch starts on');
  await p.click('[data-mg="sw-show"]'); await L.settle(p, 100);
  ok(await p.getAttribute('[data-mg="sw-show"]', 'aria-checked') === 'false', 'hide: the switch turns off');
  ok(/Not saved yet/.test(await txt(p, '.mg-state') || ''), 'hide: the switch waits for Save');
  await p.click('[data-mg="save"]');
  await toast(p);
  ok(/Hidden from the book/.test(await toastText(p) || ''), 'hide: the toast says hidden');
  await go(p, '#/recipes'); await L.settle(p, 300);
  ok(await p.$('a[href="#/r/side-salad"]') === null, 'hide: gone from the recipes');
  await go(p, '#/manage'); await L.settle(p, 200);
  await p.click('[data-mg="chip"][data-v="hidden"]'); await L.settle(p, 200);
  ok(await p.$('#mg-results a[href="#/manage/r/side-salad"]') !== null, 'hide: listed under Hidden');
  await p.click('#mg-results a[href="#/manage/r/side-salad"]'); await editor(p);
  await p.click('[data-mg="sw-show"]'); await p.click('[data-mg="save"]');
  await wait(p, () => /Version 2/.test((document.querySelector('.mg-toasts .p-toast') || {}).textContent || ''));
  await go(p, '#/recipes'); await L.settle(p, 300);
  ok(await p.$('a[href="#/r/side-salad"]') !== null, 'hide: put back in the book');

  // Special: the switch moves a dish into Specials, first on the Pass with its own chip; off puts it back in Salads
  // (Chicken Adobo is a special in the book file, so Specials always holds it too)
  await go(p, '#/manage/r/caesar'); await editor(p);
  ok(await p.getAttribute('[data-mg="sw-special"]', 'aria-checked') === 'false', 'special: the switch starts off');
  await p.click('[data-mg="sw-special"]'); await L.settle(p, 100);
  ok(await p.inputValue('#mg-msec') === 'Specials', 'special: the menu section reads Specials');
  await p.click('[data-mg="save"]'); await toast(p);
  ok(/Saved/.test(await toastText(p) || ''), 'special: saved');
  await go(p, '#/recipes'); await L.settle(p, 300);
  const chips = await p.$$eval('[data-act="kind"]', els => els.map(e => e.textContent));
  ok(/^Specials \(2\)$/.test(chips[1] || ''), 'special: the Specials chip comes first after All ' + chips.slice(0, 3).join(', '));
  ok(await p.getAttribute('#shelves .shelf', 'aria-label') === 'Specials', 'special: the Specials shelf is first');
  await p.click('[data-act="kind"][data-val="sp"]'); await L.settle(p, 300);
  ok(await p.$$eval('#shelves a[href^="#/r/"]', els => els.map(e => e.getAttribute('href')).sort().join(',')) === '#/r/caesar,#/r/chicken-adobo', 'special: the chip shows only the specials');
  await go(p, '#/manage/r/caesar'); await editor(p);
  ok(await p.getAttribute('[data-mg="sw-special"]', 'aria-checked') === 'true', 'special: the switch opens on');
  await p.click('[data-mg="sw-special"]'); await L.settle(p, 100);
  ok(await p.inputValue('#mg-msec') === '', 'special: off with no earlier section leaves it to pick');
  await p.selectOption('#mg-msec', 'Salads'); await p.click('[data-mg="save"]'); await toast(p);
  await go(p, '#/recipes'); await L.settle(p, 300);
  ok((await p.$$eval('[data-act="kind"]', els => els.map(e => e.textContent))).includes('Specials (1)'), 'special: off takes the dish out of Specials');
  ok(p.errors.length === 0, 'editing: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the head chef's Google device with nobody signed in can save too (no PIN proof, by is empty)
  p = await L.open(b, '#/manage/r/aioli', { who: '', admin: true, extra: cfg(), wait: 1400 });
  await editor(p);
  const aioliOk = await p.$('#mg-name') !== null;
  if (aioliOk) {
    await p.fill('#mg-yield', '1 L batch');
    await p.click('[data-mg="save"]'); await toast(p);
    ok(/Saved\. Version 1\./.test(await toastText(p) || ''), 'head chef\'s Google device: saved');
  } else ok(false, 'head chef\'s Google device: the form opens');
  ok(p.errors.length === 0, 'Google device: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a sous chef saves, then the head chef's Google device with nobody signed in saves the same recipe (27 Oct 2026). The
  // index is saved with merge: its by has to be empty after the head chef's save, or the rules refuse it (bookBy()).
  p = await L.open(b, '#/manage/r/aioli', { who: 'sam', extra: cfg(), wait: 1400 });
  await editor(p);
  await p.fill('#mg-yield', '800 ml batch');
  await p.click('[data-mg="save"]'); await toast(p);
  ok(/Saved\. Version 1\./.test(await toastText(p) || ''), 'after a sous chef: Sam saves version 1');
  s = await store(p);
  ok((s[fsKey(['book', 'index'])] || {}).by === 'sam', 'after a sous chef: the index names Sam');
  await p.context().close();
  p = await L.open(b, '#/manage/r/aioli', { who: '', admin: true, extra: s, wait: 1400 });
  await editor(p);
  await p.fill('#mg-yield', '1 L batch');
  await p.click('[data-mg="save"]'); await toast(p);
  const ownSaid = await toastText(p) || await txt(p, '.mg-bar') || '';
  ok(/Saved\. Version 2\./.test(ownSaid), 'after a sous chef: the head chef\'s Google device saves version 2 (' + ownSaid.slice(0, 120) + ')');
  s = await store(p);
  ok((s[fsKey(['book', 'index'])] || {}).by === '' && (s[fsKey(['recipes', 'aioli'])] || {}).by === '' && ((s[fsKey(['book', 'index'])] || {}).r || {}).aioli === 2, 'after a sous chef: the index and the recipe are saved by nobody, version 2');
  ok(p.errors.length === 0, 'after a sous chef: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.log(R.join("\n")); console.error(e); process.exit(1); });
