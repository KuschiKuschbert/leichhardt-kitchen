// Nothing typed on the staff pages goes without asking (28 Oct 2026, keep-typed-work). A regular tapped on the order
// list adds itself and leaves a half-typed line in its boxes. Save the review (the wastage page and the admin Daily
// reviews form) and Save my usual (the drinks run) are off with nothing changed, and the saves refuse too. Cancel on a
// changed drink asks a second tap, the drinks form counts as not saved, and a sign-out takes it with the person. A
// reload or closing the tab asks first over words typed on any of these pages, and Update now's own second tap still
// reloads with no Reload site? box. Since 29 Oct 2026: a regular tapped over its own name typed empties the boxes; a
// space added to another chef's review, or a drink picked away and back, is no change; Skip for now on the first usual
// asks over a pick; and a sign-out takes a half-typed review, the open reason sheet and a typed section with the person.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW));
const day = n => L.ymd(new Date(L.NOW - n * 86400000));
const S = (p, f, a) => p.evaluate(f, a);
// a reload or closing the tab: true when the page asks first
const asks = p => p.evaluate(() => { const e = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; });
// a button left on by an older page: the save itself must refuse too
const force = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.disabled = false; e.click(); return true; }, sel);
const off = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.disabled : null; }, sel);
const fits = async (p, label) => { const o = await L.overflow(p); ok(!o, label + ': no sideways scroll' + (o ? ' (' + o + ')' : '')); };
const store = p => p.evaluate(() => window.__fake.dump());
async function safe(label, fn) { try { await fn(); } catch (e) { ok(false, label + ' threw ' + String(e).split('\n')[0]); } }
// the page reloaded since mark() (offline-writes.test.js)
const mark = p => p.evaluate(() => { window.__mark = 1; });
const reloaded = p => p.evaluate(() => window.__mark !== 1).catch(() => true);
const waitReload = p => L.waitFor(p, () => window.__mark !== 1, null, 15000).catch(() => {});

// six past days of Cream, so it is a regular on the order list
const hist = {};
for (let i = 1; i <= 6; i++) hist[fsKey(['orders', day(i), 'lines', 'c' + i])] = { text: 'Cream', qty: '2 L', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - i * 86400000, ordered: true, deleted: false };
// today's review, saved by Bo this morning
const rvBo = { [fsKey(['waste', today])]: { avoidable: 'Over-portioned chips', change: 'Chips to order after 21:00', reviewBy: 'Bo', reviewAt: L.NOW - 3600000 } };

(async () => {
  const b = await L.start();
  let p;

  // the order list: a regular over a half-typed line adds the regular and keeps the line in its boxes
  await safe('regular', async () => {
    p = await L.open(b, '#/orders', { who: 'ann', extra: hist, wait: 1500 });
    await L.waitFor(p, () => !!document.querySelector('[data-p="oreg"]'), null, 8000);
    await p.fill('#o-text', 'Lemons');
    await p.fill('#o-qty', '2 kg');
    await p.click('[data-p="oreg"]'); await L.settle(p, 400);
    const box = await S(p, () => ({ t: document.querySelector('#o-text').value, q: document.querySelector('#o-qty').value, st: window.LK_PREP.state.otext }));
    const lines = Object.entries(await store(p)).filter(([k, v]) => k.indexOf(fsKey(['orders', today, 'lines'])) === 0 && v && !v.deleted).map(([, v]) => v.text + ' ' + v.qty);
    ok(/^Added to the order list\s*Undo/.test((await txt(p, '.p-toast') || '').trim()) && lines.indexOf('Cream 2 L') >= 0 && lines.indexOf('Lemons 2 kg') < 0, 'regular: Cream goes on with its usual amount, Lemons is not saved yet (' + JSON.stringify(lines) + ')');
    ok(box.t === 'Lemons' && box.q === '2 kg' && box.st === 'Lemons', 'regular: the half-typed Lemons and 2 kg stay in the boxes (' + JSON.stringify(box) + ')');
    ok(await asks(p), 'regular: Lemons still typed, a reload asks first');
    await p.press('#o-text', 'Enter'); await L.settle(p, 500);
    const after = Object.values(await store(p)).filter(v => v && v.text === 'Lemons' && !v.deleted);
    ok(after.length === 1 && after[0].qty === '2 kg', 'regular: Add then saves Lemons with its 2 kg (' + JSON.stringify(after.map(v => v.qty)) + ')');
    ok(!(await asks(p)), 'regular: the boxes empty again, a reload does not ask');
    ok(p.errors.length === 0, 'regular: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  });

  // a regular tapped over its own name typed (or the start of it): the boxes empty, so Add never puts it on twice
  const creams = q => store(q).then(st => Object.entries(st).filter(([k, v]) => k.indexOf(fsKey(['orders', today, 'lines'])) === 0 && v && !v.deleted && /^cre/i.test(v.text)).map(([, v]) => v.text + '|' + v.qty));
  for (const typed of ['Cream', 'Cre']) {
    await safe('regular ' + typed, async () => {
      p = await L.open(b, '#/orders', { who: 'ann', extra: hist, wait: 1500 });
      await L.waitFor(p, () => !!document.querySelector('[data-p="oreg"]'), null, 8000);
      await p.fill('#o-text', typed);
      await p.click('[data-p="oreg"]'); await L.settle(p, 400);
      ok(await p.inputValue('#o-text') === '' && !(await asks(p)), 'regular ' + typed + ': tapped over "' + typed + '", the box empties and a reload does not ask');
      await p.press('#o-text', 'Enter'); await L.settle(p, 500);
      ok(JSON.stringify(await creams(p)) === JSON.stringify(['Cream|2 L']), 'regular ' + typed + ': Enter then adds nothing more: one Cream line (' + JSON.stringify(await creams(p)) + ')');
      await p.context().close();
    });
  }
  // a regular that could not be saved leaves the empty boxes empty: its words were never typed there
  await safe('regular refused', async () => {
    p = await L.open(b, '#/orders', { who: 'ann', extra: hist, wait: 1500 });
    await L.waitFor(p, () => !!document.querySelector('[data-p="oreg"]'), null, 8000);
    await S(p, () => { window.__fake.mode = 'fail'; });
    await p.click('[data-p="oreg"]'); await L.settle(p, 800);
    ok(await p.inputValue('#o-text') === '' && await p.inputValue('#o-qty') === '', 'regular refused: the boxes stay empty');
    await p.context().close();
  });

  // the wastage page: Save the review is off with nothing typed, and saves nothing even when forced
  for (const w of [390, 768, 1280]) {
    await safe(w + ' review', async () => {
      p = await L.open(b, '#/waste', { who: 'sam', width: w, height: w > 400 ? 900 : 844, wait: 1500 });
      const sel = '[data-p="wreview"][data-v="page"]';
      await L.waitFor(p, s => !!document.querySelector(s), sel, 8000);
      ok(await off(p, sel) === true, w + ' review: Save the review is off with nothing typed');
      await force(p, sel); await L.settle(p, 600);
      ok(!(await store(p))[fsKey(['waste', today])] && !/Review saved/.test(await txt(p, '.p-toast') || ''), w + ' review: a forced tap saves nothing');
      await p.fill('#w-ra', 'Chips cooked too early'); await L.settle(p, 100);
      ok(await off(p, sel) === false, w + ' review: typing turns Save the review on, with no redraw');
      ok(await asks(p), w + ' review: words typed, a reload asks first');
      await fits(p, w + ' review');
      await p.fill('#w-ra', ''); await L.settle(p, 100);
      ok(await off(p, sel) === true && !(await asks(p)), w + ' review: back as it was, Save is off again and a reload does not ask');
      if (w === 390) {
        await p.fill('#w-rc', 'Drop chips to order after 21:00');
        await p.click(sel); await L.settle(p, 700);
        const rv = (await store(p))[fsKey(['waste', today])] || {};
        ok(rv.change === 'Drop chips to order after 21:00' && rv.reviewBy === 'Sam' && /Review saved/.test(await txt(p, '.p-toast') || ''), w + ' review: a changed review saves (' + JSON.stringify(rv) + ')');
        ok(await off(p, sel) === true, w + ' review: once saved, Save is off again');
      }
      ok(p.errors.length === 0, w + ' review: no page errors ' + p.errors.join(' | '));
      await p.context().close();
    });
  }

  // another chef's review untouched: a forced Save keeps their name on it
  await safe('review by Bo', async () => {
    p = await L.open(b, '#/waste', { who: 'sam', extra: rvBo, wait: 1500 });
    const sel = '[data-p="wreview"][data-v="page"]';
    await L.waitFor(p, () => /Over-portioned chips/.test((document.querySelector('#w-ra') || {}).value || ''), null, 8000);
    ok(await off(p, sel) === true, 'review by Bo: Save the review is off on Bo\'s review left as it is');
    await force(p, sel); await L.settle(p, 700);
    const rv = (await store(p))[fsKey(['waste', today])] || {};
    ok(rv.reviewBy === 'Bo' && rv.reviewAt === L.NOW - 3600000, 'review by Bo: a forced tap leaves Bo\'s review and name as they were (' + JSON.stringify(rv) + ')');
    // a keyboard's space or a new line at the end is not a change: Save stays off, a reload does not ask
    await p.fill('#w-ra', 'Over-portioned chips '); await L.settle(p, 100);
    ok(await off(p, sel) === true && !(await asks(p)), 'review by Bo: a space added leaves Save off, and a reload does not ask');
    await p.fill('#w-ra', 'Over-portioned chips\n'); await L.settle(p, 100);
    ok(await off(p, sel) === true, 'review by Bo: a new line added leaves Save off');
    await force(p, sel); await L.settle(p, 700);
    const rv2 = (await store(p))[fsKey(['waste', today])] || {};
    ok(rv2.reviewBy === 'Bo' && rv2.reviewAt === L.NOW - 3600000, 'review by Bo: a forced tap then still keeps Bo\'s name (' + JSON.stringify(rv2) + ')');
    await p.context().close();
  });

  // the admin Daily reviews form: the same
  await safe('daily reviews', async () => {
    p = await L.open(b, '#/admin', { admin: true, who: '', wait: 1800 });
    await L.adminTab(p, 'waste');
    await p.click('[data-p="wh-view"][data-v="reviews"]');
    const sel = '[data-p="wreview"][data-v="admin"]';
    await L.waitFor(p, s => !!document.querySelector(s), sel, 8000);
    ok(await off(p, sel) === true, 'daily reviews: Save the review is off with nothing typed');
    await force(p, sel); await L.settle(p, 700);
    ok(!(await store(p))[fsKey(['waste', today])], 'daily reviews: a forced tap saves nothing');
    await p.fill('#w-ra', 'Too much rice cooked'); await L.settle(p, 100);
    ok(await off(p, sel) === false, 'daily reviews: typing turns Save the review on');
    await p.click(sel); await L.settle(p, 800);
    ok(((await store(p))[fsKey(['waste', today])] || {}).avoidable === 'Too much rice cooked', 'daily reviews: the typed review saves');
    ok(p.errors.length === 0, 'daily reviews: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  });

  // the drinks run: Save my usual is off on a usual not changed, Cancel asks over a change, and it counts as not saved
  for (const w of [390, 768, 1280]) {
    await safe(w + ' drinks', async () => {
      p = await L.open(b, '#/drinks', { who: 'sam', width: w, height: w > 400 ? 900 : 844, wait: 1500 });
      await L.waitFor(p, () => !!document.querySelector('[data-p="dk-edit"]'), null, 8000);
      const at0 = (await store(p))[fsKey(['drinks', 'sam'])].at;
      await p.click('[data-p="dk-edit"]'); await L.settle(p, 200);
      ok(await off(p, '[data-p="dk-save"]') === true, w + ' drinks: Save my usual is off on the usual as it was');
      ok(!(await S(p, () => window.LK_PREP.unsaved())) && !(await asks(p)), w + ' drinks: the form untouched is nothing not saved');
      await force(p, '[data-p="dk-save"]'); await L.settle(p, 600);
      ok((await store(p))[fsKey(['drinks', 'sam'])].at === at0 && !/Saved/.test(await txt(p, '.p-toast') || ''), w + ' drinks: a forced tap saves nothing');
      await p.click('[data-p="dk-cancel"]'); await L.settle(p, 200);
      ok(!(await p.$('.dr-form')), w + ' drinks: Cancel on the form untouched closes it in one tap');
      await p.click('[data-p="dk-edit"]'); await L.settle(p, 200);
      await p.fill('[data-k="dk-other"]', 'A banana bread'); await L.settle(p, 100);
      ok(await off(p, '[data-p="dk-save"]') === false, w + ' drinks: typing turns Save my usual on, with no redraw');
      ok(await S(p, () => window.LK_PREP.unsaved()) && await asks(p), w + ' drinks: words typed count as not saved, and a reload asks first');
      await p.click('[data-p="dk-cancel"]'); await L.settle(p, 200);
      ok(await txt(p, '[data-p="dk-cancel"]') === 'Tap again to discard' && await p.inputValue('[data-k="dk-other"]') === 'A banana bread', w + ' drinks: the first tap on Cancel keeps the words and says Tap again to discard');
      await fits(p, w + ' drinks asking');
      await p.clock.runFor(4100); await L.settle(p, 150);
      ok(await txt(p, '[data-p="dk-cancel"]') === 'Cancel' && !!(await p.$('.dr-form')), w + ' drinks: left alone, Cancel reads Cancel again');
      await p.click('[data-p="dk-cancel"]'); await L.settle(p, 150);
      await p.click('[data-p="dk-cancel"]'); await L.settle(p, 200);
      ok(!(await p.$('.dr-form')) && (await store(p))[fsKey(['drinks', 'sam'])].other === '', w + ' drinks: the second tap discards, the usual stays as saved');
      ok(p.errors.length === 0, w + ' drinks: no page errors ' + p.errors.join(' | '));
      await p.context().close();
    });
  }

  // the drinks run: a detour back to the drink as saved, or a space, is no change
  const pickDk = async (q, f, v) => {
    if (!(await q.$('[data-f="' + f + '"][data-v="' + v + '"]'))) { await L.tap(q, '.dr-fold[data-f="' + f + '"]'); await L.settle(q, 100); }
    await L.tap(q, '[data-f="' + f + '"][data-v="' + v + '"]'); await L.settle(q, 150);
  };
  await safe('drinks detour', async () => {
    p = await L.open(b, '#/drinks', { who: 'sam', wait: 1500 });
    await L.waitFor(p, () => !!document.querySelector('[data-p="dk-edit"]'), null, 8000);
    await p.click('[data-p="dk-edit"]'); await L.settle(p, 200);
    await pickDk(p, 'kind', 'latte'); await pickDk(p, 'milk', 'full'); await pickDk(p, 'kind', 'long');
    ok(await off(p, '[data-p="dk-save"]') === true && !(await S(p, () => window.LK_PREP.unsaved())), 'drinks: Latte, Full cream, then Long black again is the usual as saved: Save is off and nothing counts as not saved');
    await p.fill('[data-k="dk-other"]', ' '); await L.settle(p, 100);
    ok(await off(p, '[data-p="dk-save"]') === true, 'drinks: a space typed alone leaves Save off');
    await p.context().close();
  });
  // the first usual: Skip for now over something picked asks a second tap, like Cancel
  await safe('drinks skip', async () => {
    const cfgK = { people: [
      { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
      { id: 'kim', name: 'Kim Lee', role: 'staff', add: true, tick: true, del: false, active: true }
    ], sousIds: ['sam'], staffIds: ['sam', 'kim'], showBadges: true };
    p = await L.open(b, '#/prep', { who: '', extra: { [fsKey(['config', 'main'])]: cfgK }, wait: 1200 });
    await p.click('.p-name[data-id="kim"]');
    await p.keyboard.type('4444'); await L.settle(p, 600);
    await p.keyboard.type('4444'); await L.settle(p, 1000);
    await L.waitFor(p, () => !!document.querySelector('[data-p="dk-skip"]'), null, 8000);
    await pickDk(p, 'kind', 'flat');
    await p.click('[data-p="dk-skip"]'); await L.settle(p, 200);
    ok(!!(await p.$('.dr-form')) && await txt(p, '[data-p="dk-skip"]') === 'Tap again to skip', 'drinks skip: the first tap on Skip for now keeps the pick and asks again');
    await fits(p, 'drinks Skip armed at 390');
    await p.click('[data-p="dk-skip"]'); await L.settle(p, 300);
    ok(!(await p.$('.dr-form')) && !(await store(p))[fsKey(['drinks', 'kim'])], 'drinks skip: the second tap skips, with nothing saved');
    await p.context().close();
  });

  // a sign-out takes the drinks form with the person: the next person never gets it, ready to save as their usual
  await safe('drinks hand-over', async () => {
    p = await L.open(b, '#/drinks', { who: 'sam', wait: 1500 });
    await L.waitFor(p, () => !!document.querySelector('[data-p="dk-edit"]'), null, 8000);
    await p.click('[data-p="dk-edit"]'); await L.settle(p, 200);
    await p.fill('[data-k="dk-other"]', 'Sam wants a banana bread');
    await p.click('.wtop-who'); await L.settle(p, 150);
    await p.click('.wm [data-who="out"]'); await L.settle(p, 300);
    ok(await S(p, () => window.LK_PREP.state.who) === 'sam' && await txt(p, '.wm-out small') === 'Not saved yet. Tap again to sign out', 'drinks hand-over: the first Sign out asks (' + await txt(p, '.wm-out small') + ')');
    await p.click('.wm [data-who="out"]'); await L.settle(p, 400);
    ok(!(await S(p, () => window.LK_PREP.state.who)) && !(await S(p, () => window.LK_PREP.unsaved())), 'drinks hand-over: the second tap signs out, with nothing left not saved');
    await S(p, () => { location.hash = '#/prep'; }); await L.settle(p, 500);
    await L.waitFor(p, () => !!document.querySelector('.p-name[data-id="ann"]'), null, 8000);
    await p.click('.p-name[data-id="ann"]'); await L.settle(p, 300);
    await p.fill('#pf1', '2222'); await L.settle(p, 1500);
    await S(p, () => { location.hash = '#/drinks'; }); await L.settle(p, 800);
    const ann = await S(p, () => ({ who: window.LK_PREP.state.who, form: !!document.querySelector('.dr-form'), page: (document.querySelector('.dr-page') || {}).textContent || '' }));
    ok(ann.who === 'ann' && !ann.form && ann.page.indexOf('banana') < 0, 'drinks hand-over: Ann gets her own usual, not Sam\'s form (' + JSON.stringify({ who: ann.who, form: ann.form }) + ')');
    ok(p.errors.length === 0, 'drinks hand-over: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  });

  // a sign-out takes a review half typed with the person: Bo (a sous chef here) gets the saved review, not Sam's words
  await safe('review hand-over', async () => {
    const people = [
      { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
      { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
      { id: 'bo', name: 'Bo', role: 'sous', add: true, tick: true, del: true, active: true }];
    p = await L.open(b, '#/waste', { who: 'sam', settings: { shared: true }, extra: { [fsKey(['config', 'main'])]: { people, sousIds: ['sam', 'bo'], showBadges: true } }, wait: 1500 });
    await L.waitFor(p, () => !!document.querySelector('#w-ra'), null, 8000);
    await p.fill('#w-ra', 'Sam half typed this'); await L.settle(p, 100);
    await p.click('.wtop-who'); await L.settle(p, 150);
    await p.click('.wm [data-who="out"]'); await L.settle(p, 300);
    await p.click('.wm [data-who="out"]'); await L.settle(p, 500);
    await S(p, () => { location.hash = '#/prep'; }); await L.settle(p, 500);
    await L.waitFor(p, () => !!document.querySelector('.p-name[data-id="bo"]'), null, 8000);
    await p.click('.p-name[data-id="bo"]'); await L.settle(p, 300);
    await p.fill('#pf1', '3333'); await L.settle(p, 1500);
    await S(p, () => { location.hash = '#/waste'; }); await L.settle(p, 800);
    await L.waitFor(p, () => !!document.querySelector('#w-ra'), null, 8000);
    ok(await S(p, () => window.LK_PREP.state.who) === 'bo' && await p.inputValue('#w-ra') === '' && !(await S(p, () => window.LK_PREP.unsaved())) && await off(p, '[data-p="wreview"][data-v="page"]') === true, 'review hand-over: Bo gets an empty review box, nothing not saved, and Save off');
    ok(p.errors.length === 0, 'review hand-over: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  });
  // the waste reason sheet left open, and a section typed on the prep list, go with the person too
  await safe('sheet hand-over', async () => {
    p = await L.open(b, '#/waste', { who: 'sam', settings: { shared: true }, wait: 1500 });
    await L.waitFor(p, () => !!document.querySelector('[data-p="sheet"]'), null, 8000);
    await p.click('[data-p="sheet"]'); await L.settle(p, 200);
    ok(await S(p, () => window.LK_PREP.state.sheet) === 'reason' && await S(p, () => window.LK_PREP.unsaved()), 'sheet hand-over: the reason sheet open counts as open');
    await S(p, () => window.LK_PREP.signOut(true, true)); await L.settle(p, 500);
    ok(!(await S(p, () => window.LK_PREP.state.sheet)) && !(await S(p, () => window.LK_PREP.unsaved())) && !(await p.$('.sheet')), 'sheet hand-over: the idle lock closes it, so nothing holds the next person\'s Sign out or the self-update');
    await p.context().close();
  });
  await safe('section hand-over', async () => {
    p = await L.open(b, '#/prep', { who: 'sam', settings: { shared: true }, wait: 1500 });
    await L.waitFor(p, () => !!document.querySelector('#p-section'), null, 8000);
    await p.fill('#p-section', 'Larder'); await p.fill('#p-text', 'Peel garlic');
    await p.press('#p-text', 'Enter'); await L.settle(p, 500);
    ok(await p.inputValue('#p-section') === 'Larder', 'section hand-over: the section typed stays for Sam\'s next line');
    await p.click('.nb-top [data-p="who-change"]'); await L.settle(p, 500);
    await L.waitFor(p, () => !!document.querySelector('.p-name[data-id="bo"]'), null, 8000);
    await p.click('.p-name[data-id="bo"]'); await L.settle(p, 300);
    await p.fill('#pf1', '3333'); await L.settle(p, 1500);
    await L.waitFor(p, () => !!document.querySelector('#p-section'), null, 8000);
    ok(await S(p, () => window.LK_PREP.state.who) === 'bo' && await p.inputValue('#p-section') === '' && !(await S(p, () => window.LK_PREP.state.secTyped)), 'section hand-over: Bo\'s Section box does not hold Sam\'s Larder (' + await p.inputValue('#p-section') + ')');
    ok(p.errors.length === 0, 'section hand-over: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  });

  // a reload or closing the tab asks first over words typed on each page, and not with the boxes empty
  const PAGES = [
    ['a prep line', '#/prep', 'ann', '#p-text', 'Peel garlic'],
    ['an amount on the prep list', '#/prep', 'ann', '#p-qty', '2 kg'],
    ['an order line', '#/orders', 'ann', '#o-text', 'Lemons'],
    ['a wastage entry', '#/waste', 'ann', '#w-text', 'Rice'],
    ['a transfer', '#/transfers', 'ann', '#tr-text', 'Cream'],
    ['kitchen mail', '#/mail', 'ann', '[data-k="ml-text"]', 'The fryer thermostat reads low'],
    ['a to-do job', '#/todo', 'sam', '[data-k="todo-text"]', 'Book the hood clean'],
    ['the review on the wastage page', '#/waste', 'sam', '#w-ra', 'Too much rice cooked']
  ];
  for (const [label, hash, who, sel, words] of PAGES) {
    await safe(label, async () => {
      p = await L.open(b, hash, { who, wait: 1500 });
      await L.waitFor(p, s => !!document.querySelector(s), sel, 8000);
      ok(!(await asks(p)), label + ': nothing typed, a reload does not ask');
      await p.fill(sel, words); await L.settle(p, 150);
      ok(await asks(p), label + ': typed, a reload or closing the tab asks first');
      await p.fill(sel, ''); await L.settle(p, 150);
      ok(!(await asks(p)), label + ': emptied again, a reload does not ask');
      await p.context().close();
    });
  }

  // a transfer logged: the venue and person stay for the next item of the same pick-up, and do not count
  await safe('transfer logged', async () => {
    p = await L.open(b, '#/transfers', { who: 'ann', wait: 1500 });
    await L.waitFor(p, () => !!document.querySelector('#tr-venue'), null, 8000);
    await p.fill('#tr-venue', 'Riviera'); await p.fill('#tr-person', 'Jess');
    ok(!(await asks(p)), 'transfer: a venue and a person alone do not ask');
    await p.fill('#tr-text', 'Cream'); await p.fill('#tr-amt', '2');
    await p.click('[data-p="tr-unit"][data-v="L"]');
    ok(await asks(p), 'transfer: an item typed asks first');
    await p.click('.tr-add .nb-addbtn'); await L.settle(p, 400);
    ok(await p.inputValue('#tr-venue') === 'Riviera' && !(await asks(p)), 'transfer: logged, the venue stays and a reload does not ask');
    await p.context().close();
  });

  // Update now's own second tap over half a line still reloads, with no Reload site? box on top
  await safe('update now', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', wait: 1500 });
    let asked = 0;
    p.on('dialog', d => { asked++; d.dismiss().catch(() => {}); });
    await p.clock.fastForward(10000);
    await p.evaluate(() => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: 'lk-new' })));
    await L.waitFor(p, () => !!document.querySelector('.upd-bar'), null, 3000);
    await mark(p);
    await p.fill('#p-text', 'Half a line');
    ok(await asks(p), 'update now: half a line typed, a reload asks first');
    await p.click('.upd-bar button'); await L.settle(p, 1500);
    ok(!(await reloaded(p)) && /Tap again to update/.test(await txt(p, '.upd-bar') || ''), 'update now: the first tap asks for a second (' + await txt(p, '.upd-bar') + ')');
    await p.click('.upd-bar button');
    await waitReload(p);
    ok(await reloaded(p) && asked === 0, 'update now: the second tap updates, with no Reload site? box (' + asked + ' asked)');
    await p.context().close();
  });

  await b.close();
  L.report(R);
})();
