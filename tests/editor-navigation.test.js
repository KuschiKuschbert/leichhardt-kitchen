// Back from an editor must keep the last entry, even before the draft debounce or a field's blur.
const L = require('./lib');
const M = require('../js/functions.js');
const { R, ok } = L.results();
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const person = (id, role) => ({ id, name: id === 'ann' ? 'Ann' : 'Sam', role, add: true, tick: true, del: true, active: true, fn: true });
const day = L.ymd(new Date(L.NOW));
const extra = {
  [key(['config', 'main'])]: { people: [person('ann', 'head'), person('sam', 'sous')], headId: 'ann', sousIds: ['sam', 'ann'], fnIds: ['ann'], showBadges: true },
  [key(['functions', 'test'])]: {
    v: 1, status: 'draft', name: 'Test booking', date: day, start: M.kat(day, 1080), guests: 20, gu: false, st: false, loc: 'Dining room', mode: 'all',
    rounds: [{ at: M.kat(day, 1110), note: '' }], lines: [{ rid: 'antipasto-platter', name: 'Antipasto Platter', unit: 'platter', spec: 'Per platter.', fp: '', qty: 2, u: M.toU([2]) }],
    notes: '', kc: '', by: 'ann', upd: L.NOW - 3600000, cAt: L.NOW - 86400000, cBy: 'ann'
  }
};
const go = async (p, hash) => { await p.evaluate(h => { location.hash = h; }, hash); await L.settle(p, 200); };
const back = '.wtop [data-act="back"]';
const editor = p => L.waitFor(p, () => !!document.querySelector('#mg-name'), null, 10000);
const noOverflow = async (p, name) => ok(!(await L.overflow(p)), name + ': no sideways scroll');
const pendingBack = async (p, mod, save, field, name) => {
  const url = p.url();
  await p.evaluate(() => { window.__fake.mode = 'hold'; });
  await p.click(save);
  await L.waitFor(p, () => !!document.querySelector('.wtop [data-act="back"]')?.disabled);
  ok(await p.isDisabled(back), name + ': header arrow is disabled while a save is pending');
  await p.evaluate(m => { window[m].back(); }, mod);
  ok(p.url() === url && !!(await p.$(field)), name + ': a blocked Back keeps the active editor and draft');
  await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
  await L.waitFor(p, () => !!document.querySelector('.wtop [data-act="back"]') && !document.querySelector('.wtop [data-act="back"]').disabled);
  ok(!(await p.isDisabled(back)), name + ': header arrow becomes available after the save finishes');
};

(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/manage/r/burger', { who: 'ann', extra, wait: 1500 });
  await editor(p);
  ok(p.urls.some(url => /\/js\/manage\.js\?v=4$/.test(url)), 'recipe form requests the revised editor address');
  ok(await p.getAttribute(back, 'aria-label') === 'Back to all recipes', 'recipe form: one header arrow names the parent list');
  ok(await p.locator('#mg-root a[href="#/manage"], [data-mg-back]').count() === 0, 'recipe form: no repeated return rows or breadcrumbs');
  // Input and Back in the same turn deliberately beat the 400 ms draft timer.
  await p.evaluate(() => {
    const el = document.querySelector('#mg-name'); el.value = 'Chicken Burger test draft'; el.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('.wtop [data-act="back"]').click();
  });
  await L.waitFor(p, () => !!document.querySelector('#mg-q'));
  let kept = await p.evaluate(() => JSON.parse(localStorage.getItem('lk.mg.draft.burger') || 'null'));
  ok(kept && kept.e.d.name === 'Chicken Burger test draft', 'quick recipe Back: the final entry is kept before leaving');
  await go(p, '#/manage/r/burger'); await editor(p);
  ok(await p.$('[data-mg="kept-use"]') !== null, 'return to recipe: draft can be recovered');
  await p.click('[data-mg="kept-use"]');
  ok(await p.inputValue('#mg-name') === 'Chicken Burger test draft', 'return to recipe: recover the exact entry');
  ok(await p.locator(back).count() === 1 && !(await p.isDisabled(back)), 'dirty recipe: the same header arrow stays available');
  await noOverflow(p, 'recipe form on phone');
  await pendingBack(p, 'LK_MG', '[data-mg="save"]', '#mg-name', 'Recipe save');
  ok(p.errors.length === 0, 'recipe Back: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  p = await L.open(b, '#/manage/draw/new/burger/plate', { who: 'ann', extra, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('.dw-svg'), null, 15000);
  ok(p.urls.some(url => /\/js\/draw\.js\?v=4$/.test(url)), 'drawing requests the revised editor address');
  ok(await p.getAttribute(back, 'aria-label') === 'Back to the recipe', 'drawing: header arrow names the parent recipe');
  ok(await p.locator('#mg-root a[href="#/manage/r/burger"], [data-dw-back]').count() === 0, 'drawing: no repeated return rows or breadcrumbs');
  await p.evaluate(() => { window.LK_DRAW.addItem('rump'); document.querySelector('.wtop [data-act="back"]').click(); });
  await editor(p);
  kept = await p.evaluate(() => JSON.parse(localStorage.getItem('lk.dw.draft.new-burger-plate') || 'null'));
  ok(kept && kept.els.length === 1 && kept.els[0].a === 'rump@1', 'quick drawing Back: the last piece is kept');
  await go(p, '#/manage/draw/new/burger/plate');
  await L.waitFor(p, () => !!document.querySelector('[data-dw="kept-use"]'), null, 15000);
  await p.click('[data-dw="kept-use"]');
  ok(await p.evaluate(() => window.LK_DRAW.state().d.els.length) === 1, 'return to drawing: recover the piece');
  await noOverflow(p, 'drawing on phone');
  await pendingBack(p, 'LK_DRAW', '[data-dw="save"]', '.dw-svg', 'Drawing save');
  ok(p.errors.length === 0, 'drawing Back: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  p = await L.open(b, '#/functions', { who: 'ann', extra, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('.fe-rows a[href="#/functions/test"]'), null, 10000);
  await p.click('.fe-rows a[href="#/functions/test"]');
  await L.waitFor(p, () => !!document.querySelector('#fe-name'), null, 10000);
  ok(p.urls.some(url => /\/js\/fnedit\.js\?v=4$/.test(url)), 'function form requests the revised editor address');
  ok(await p.getAttribute(back, 'aria-label') === 'Back to all functions', 'function form: header arrow names the parent list');
  ok(await p.locator('#fe-root a[href="#/functions"], [data-fe-back]').count() === 0, 'function form: no repeated return rows');
  await p.fill('#fe-name', 'Test booking draft');
  // Native browser Back can happen while a time field is still focused, without a blur/change.
  await p.evaluate(() => {
    const el = document.querySelector('#fe-startT'); el.focus(); el.value = '17:15'; el.dispatchEvent(new Event('input', { bubbles: true })); history.back();
  });
  await L.waitFor(p, () => !!document.querySelector('#fe-q'));
  kept = await p.evaluate(() => JSON.parse(localStorage.getItem('lk.fe.draft.test') || 'null'));
  ok(kept && kept.d.startT === '17:15' && kept.d.name === 'Test booking draft', 'browser Back: the focused time and name are kept');
  await go(p, '#/functions/test');
  await L.waitFor(p, () => !!document.querySelector('#fe-startT'));
  ok(await p.inputValue('#fe-startT') === '17:15' && await p.inputValue('#fe-name') === 'Test booking draft', 'return to function: exact draft is restored');
  await p.click('[data-fe="review"]');
  await L.waitFor(p, () => !!document.querySelector('.fe-review'));
  ok(await p.getAttribute(back, 'aria-label') === 'Back to the form', 'function review: the same header arrow returns to the form');
  ok(await p.locator('[data-fe="review-x"]').count() === 0, 'function review: no repeated Back buttons');
  await p.click(back);
  await L.waitFor(p, () => !!document.querySelector('#fe-name'));
  ok(await p.inputValue('#fe-name') === 'Test booking draft' && await p.inputValue('#fe-startT') === '17:15', 'review Back: form values stay intact');
  await pendingBack(p, 'LK_FE', '[data-fe="save"]', '#fe-name', 'Function save');
  await p.click(back);
  await L.waitFor(p, () => !!document.querySelector('#fe-q'));
  ok(/#\/functions$/.test(p.url()), 'function Back opens all functions');
  await noOverflow(p, 'function list on phone');
  ok(p.errors.length === 0, 'function Back: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // A role can be taken away while a write is awaiting acknowledgement. The access message still needs a way out.
  for (const c of [
    { name: 'recipe', mod: 'LK_MG', route: '#/manage/r/burger', parent: '#/manage', field: '#mg-name', save: '[data-mg="save"]', root: '#mg-root' },
    { name: 'drawing', mod: 'LK_DRAW', route: '#/manage/draw/new/burger/plate', parent: '#/manage', field: '.dw-svg', save: '[data-dw="save"]', root: '#mg-root' },
    { name: 'function', mod: 'LK_FE', route: '#/functions/test', parent: '#/functions', field: '#fe-name', save: '[data-fe="save"]', root: '#fe-root' }
  ]) {
    p = await L.open(b, c.route, { who: 'ann', extra, wait: 1500 });
    await L.waitFor(p, sel => !!document.querySelector(sel), c.field, 15000);
    if (c.name === 'drawing') await p.evaluate(() => window.LK_DRAW.addItem('rump'));
    else await p.fill(c.field, 'Private pending editor draft');
    await p.evaluate(() => { window.__fake.mode = 'hold'; });
    await p.click(c.save);
    await L.waitFor(p, () => !!document.querySelector('.wtop [data-act="back"]')?.disabled);
    const changed = Object.assign({}, extra[key(['config', 'main'])], c.name === 'function' ? { fnIds: [] } : {
      headId: 'sam', sousIds: ['sam'], people: [person('ann', 'staff'), person('sam', 'head')]
    });
    await p.evaluate(({ path, cfg }) => window.__fake.write(path, cfg), { path: key(['config', 'main']), cfg: changed });
    await L.waitFor(p, root => /Only (?:the head chef|function managers)/.test(document.querySelector(root)?.textContent || ''), c.root);
    ok(!(await p.$(c.field)) && !(await p.locator(c.root).innerText()).includes('Private pending editor draft'), c.name + ': permission loss removes the editor and its values');
    ok(!(await p.isDisabled(back)) && !(await p.evaluate(m => window[m].backDisabled(), c.mod)), c.name + ': permission loss clears the pending editor Back block');
    await p.click(back);
    await L.waitFor(p, hash => location.hash === hash, c.parent);
    ok(!(await p.$(c.field)), c.name + ': enabled header Back reaches its safe local parent without reopening the form');
    ok(p.errors.length === 0, c.name + ': pending-save permission loss has no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // A revised address can still receive an older offline response. Reject its API before mounting a partial form.
  for (const c of [
    { name: 'recipe', file: 'manage', global: 'LK_MG', route: '#/manage/r/burger', root: '#mg-root', field: '#mg-name' },
    { name: 'function', file: 'fnedit', global: 'LK_FE', route: '#/functions/test', root: '#fe-root', field: '#fe-name' },
    { name: 'drawing', file: 'draw', global: 'LK_DRAW', route: '#/manage/draw/new/burger/plate', root: '#mg-root', field: '.dw-svg' }
  ]) {
    p = await L.open(b, '#/', { who: 'ann', extra, wait: 1500 });
    const stale = 'window.' + c.global + ' = { api: 3, render: {}, mount: function () { window.__oldEditorMounted = true; }, unmount: function () {}, open: function () { return false; }, dirty: function () { return false; }, hasDraft: function () { return false; } };';
    await p.context().route(new RegExp('/js/' + c.file + '\\.js(?:\\?|$)'), route => route.fulfill({ status: 200, contentType: 'text/javascript', body: stale }));
    await go(p, c.route);
    await L.waitFor(p, root => /Reload the book/.test(document.querySelector(root)?.textContent || ''), c.root, 15000);
    ok(p.urls.some(url => new URL(url).pathname.endsWith('/js/' + c.file + '.js') && new URL(url).searchParams.get('v') === '4'), c.name + ': old response was delivered through the revised address');
    ok(await p.evaluate(() => !window.__oldEditorMounted) && !(await p.$(c.field)), c.name + ': old delivered editor is rejected before its form mounts');
    ok(p.errors.length === 0, c.name + ': old editor rejection has no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
