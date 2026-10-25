// A return to a parent is a step out of the task, not a new visit back into its child.
// Synthetic records and the Firebase stand-in keep these journeys away from the real book.
const L = require('./lib');
const F = require('./supplier-fixtures');
const M = require('../js/functions.js');
const { R, ok } = L.results();
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const back = '.wtop [data-act="back"]';
const day = L.ymd(new Date(L.NOW));
const person = (id, role) => ({ id, name: id === 'ann' ? 'Ann' : 'Sam', role, add: true, tick: true, del: true, active: true, fn: true });
const booking = status => M.derive({
  v: 1, status, name: status === 'confirmed' ? 'Visible test function' : 'Draft test function', date: day,
  start: M.kat(day, 1080), guests: 20, loc: 'Dining room', mode: 'all', notes: '', kc: '', kcBy: '', kcAt: 0,
  rounds: [{ at: M.kat(day, 1110), note: '' }],
  lines: [{ rid: 'antipasto-platter', name: 'Antipasto Platter', unit: 'platter', spec: 'Per platter.', fp: '', qty: 2, u: M.toU([2]) }],
  was: {}, chg: [], cBy: 'ann', cAt: L.NOW - 86400000, confBy: 'ann', confAt: L.NOW - 86400000, by: 'ann', upd: L.NOW - 3600000
});
const extra = {
  [key(['config', 'main'])]: { people: [person('ann', 'head'), person('sam', 'sous')], headId: 'ann', sousIds: ['sam', 'ann'], fnIds: ['ann'], showBadges: true },
  [key(['functions', 'draft'])]: booking('draft'),
  [key(['functions', 'visible'])]: booking('confirmed')
};
const wait = (p, selector) => L.waitFor(p, s => !!document.querySelector(s), selector, 15000);
const hash = p => p.evaluate(() => location.hash);
const go = async (p, h, selector) => {
  await p.evaluate(v => { location.hash = v; }, h);
  await L.waitFor(p, v => location.hash === v, h, 6000);
  if (selector) await wait(p, selector);
  await L.settle(p, 150);
};
const writes = p => p.evaluate(() => window.__fake.writes.flat().filter(w => /\/(recipes|drawings|functions|fncontact|suppliers|cutdone|book)(\/|$)/.test(w.path)).length);
async function step(p, destination, selector, name) {
  const before = await hash(p);
  await p.click(back);
  await L.waitFor(p, v => location.hash === v.to || location.hash !== v.before, { to: destination, before }, 6000).catch(() => false);
  await L.settle(p, 200);
  const actual = await hash(p), reached = actual === destination;
  ok(reached, name + ': Back reaches ' + destination + ', got ' + actual);
  if (reached && selector) await wait(p, selector);
  return reached;
}
async function homeCheck(p, name) {
  ok(await hash(p) === '#/' && !(await p.$(back)) && !!(await p.$('.dockets')), name + ': the return trail ends at the landing page');
  ok(await writes(p) === 0, name + ': returning makes no recipe, drawing, function, supplier or cut-off writes');
  ok(p.errors.length === 0 && !(await L.overflow(p)), name + ': no page errors or sideways scroll ' + p.errors.join(' | '));
}
async function walk(p, paths, name) {
  for (const [route, selector] of paths) if (!await step(p, route, selector, name)) return false;
  await homeCheck(p, name); return true;
}

(async () => {
  const b = await L.start();
  let p;
  for (const c of [
    { name: 'Direct sub-recipe', start: '#/r/barra/laksa', ready: '#rtitle', options: {}, paths: [['#/r/barra', '#rtitle'], ['#/recipes', '#find'], ['#/', '.dockets']] },
    { name: 'Direct guide', start: '#/guides/combi', ready: '.g-top', options: { extra: L.guides() }, paths: [['#/guides', '.g-list'], ['#/', '.dockets']] },
    { name: 'Direct kitchen function', start: '#/fn/visible', ready: '.fn-page .fn-last', options: { who: 'ann', extra }, paths: [['#/fn', '.fn-page'], ['#/', '.dockets']] }
  ]) {
    p = await L.open(b, c.start, Object.assign({ wait: 1500 }, c.options));
    await wait(p, c.ready); await walk(p, c.paths, c.name); await p.context().close();
  }

  p = await L.open(b, '#/manage/r/burger', { who: 'ann', extra, wait: 1500 });
  await wait(p, '#mg-name');
  await p.fill('#mg-name', 'Exact recipe draft after parent return');
  if (await step(p, '#/manage', '#mg-q', 'Direct recipe editor')) {
    const kept = await p.evaluate(() => JSON.parse(localStorage.getItem('lk.mg.draft.burger') || 'null'));
    ok(kept && kept.e.d.name === 'Exact recipe draft after parent return', 'Direct recipe editor: the final name is kept before leaving');
    await walk(p, [['#/', '.dockets']], 'Direct recipe editor');
  }
  await p.context().close();

  p = await L.open(b, '#/manage/draw/new/burger/plate', { who: 'ann', extra, wait: 1500, width: 1280 });
  await wait(p, '.dw-svg'); await p.evaluate(() => window.LK_DRAW.addItem('rump'));
  if (await step(p, '#/manage/r/burger', '#mg-name', 'Direct drawing')) {
    const kept = await p.evaluate(() => JSON.parse(localStorage.getItem('lk.dw.draft.new-burger-plate') || 'null'));
    ok(kept && kept.els.length === 1 && kept.els[0].a === 'rump@1', 'Direct drawing: its exact last piece survives parent return');
    await walk(p, [['#/manage', '#mg-q'], ['#/', '.dockets']], 'Direct drawing');
  }
  await p.context().close();

  for (const review of [false, true]) {
    const name = review ? 'Direct function review' : 'Direct function form';
    p = await L.open(b, '#/functions/draft', { who: 'ann', extra, wait: 1500 });
    await wait(p, '#fe-name'); await p.fill('#fe-name', 'Exact function draft after return');
    await p.fill('#fe-startT', '17:15');
    if (review) {
      await p.press('#fe-startT', 'Tab'); await L.settle(p, 150);
      await p.click('[data-fe="review"]'); await wait(p, '.fe-review'); await p.click(back); await wait(p, '#fe-name');
      ok(await p.inputValue('#fe-name') === 'Exact function draft after return' && await p.inputValue('#fe-startT') === '17:15', name + ': review return keeps exact form values');
    }
    if (await step(p, '#/functions', '#fe-q', name)) {
      const kept = await p.evaluate(() => JSON.parse(localStorage.getItem('lk.fe.draft.draft') || 'null'));
      ok(kept && kept.d.name === 'Exact function draft after return' && kept.d.startT === '17:15', name + ': parent return keeps the focused name and time');
      await walk(p, [['#/', '.dockets']], name);
    }
    await p.context().close();
  }

  for (const route of ['#/suppliers/northside/manage', '#/suppliers/manage']) {
    const name = 'Direct catalogue ' + route, orderRoute = route === '#/suppliers/manage' ? '#/suppliers' : '#/suppliers/northside';
    p = await L.open(b, route, { who: 'bo', extra: F.fixture(), wait: 1800 });
    await wait(p, '[data-su="edit"][data-i="t-stock"]');
    if (await step(p, orderRoute, 'input[data-sf="qty"][data-i="t-stock"]', name)) {
      await p.fill('input[data-sf="qty"][data-i="t-stock"]', '7 kg');
      if (orderRoute === '#/suppliers' || await step(p, '#/suppliers', 'input[data-sf="qty"][data-i="t-stock"]', name)) {
        ok(await p.inputValue('input[data-sf="qty"][data-i="t-stock"]') === '7 kg', name + ': supplier quantity survives the return to its workspace');
        await walk(p, [['#/', '.dockets']], name);
      }
    }
    await p.context().close();
  }

  // Existing parents use their original history entry, so Forward still reaches the same draft.
  p = await L.open(b, '#/orders', { who: 'ann', extra, wait: 1500 });
  await wait(p, '#o-text'); await p.fill('#o-text', 'Exact underlying order draft'); await p.fill('#o-qty', '3 tubs');
  await go(p, '#/manage', '#mg-q');
  await p.click('#mg-results a[href="#/manage/r/burger"]'); await wait(p, '#mg-name');
  await p.fill('#mg-name', 'Exact draft reopened by Forward');
  if (await step(p, '#/manage', '#mg-q', 'Existing recipe parent') && await step(p, '#/orders', '#o-text', 'Existing recipe origin')) {
    ok(await p.inputValue('#o-text') === 'Exact underlying order draft' && await p.inputValue('#o-qty') === '3 tubs', 'Existing recipe origin: underlying unsaved order values stay intact');
    await p.goForward(); await wait(p, '#mg-q');
    ok(await hash(p) === '#/manage', 'Forward first restores the existing recipe list');
    await p.goForward(); await wait(p, '#mg-name');
    await wait(p, '[data-mg="kept-use"]'); await p.click('[data-mg="kept-use"]');
    ok(await hash(p) === '#/manage/r/burger' && await p.inputValue('#mg-name') === 'Exact draft reopened by Forward', 'Forward then restores the editor with its exact draft available');
    ok(await writes(p) === 0 && p.errors.length === 0, 'Existing recipe parent: Back and Forward save nothing and raise no page errors');
  }
  await p.context().close();

  p = await L.open(b, '#/orders', { who: 'ann', extra, wait: 1500 });
  await go(p, '#/functions', '#fe-q');
  await p.click('.fe-rows a[href="#/functions/draft"]'); await wait(p, '#fe-name');
  await p.fill('#fe-name', 'Exact function draft reopened by Forward');
  if (await step(p, '#/functions', '#fe-q', 'Existing function parent') && await step(p, '#/orders', '#o-text', 'Existing function origin')) {
    await p.goForward(); await wait(p, '#fe-q'); await p.goForward(); await wait(p, '#fe-name');
    ok(await hash(p) === '#/functions/draft' && await p.inputValue('#fe-name') === 'Exact function draft reopened by Forward', 'Function Forward restores the same form and exact draft after two returns');
    ok(await writes(p) === 0 && p.errors.length === 0, 'Existing function parent: Back and Forward save nothing and raise no page errors');
  }
  await p.context().close();

  // Duplicate adds another task below the same list. Returning must skip both forms, while Forward keeps them.
  p = await L.open(b, '#/orders', { who: 'ann', extra, wait: 1500 });
  await wait(p, '#o-text'); await p.fill('#o-text', 'Order draft beneath a duplicate'); await p.fill('#o-qty', '8 trays');
  await go(p, '#/functions', '#fe-q');
  await p.click('.fe-rows a[href="#/functions/draft"]'); await wait(p, '#fe-name');
  await p.fill('#fe-name', 'Exact original before duplicate');
  await p.click('[data-fe="dup"]');
  await L.waitFor(p, () => location.hash === '#/functions/new' && !!document.querySelector('#fe-name'), null, 6000);
  await p.fill('#fe-name', 'Exact duplicate after ancestor return');
  if (await step(p, '#/functions', '#fe-q', 'Duplicate function parent') && await step(p, '#/orders', '#o-text', 'Duplicate function origin')) {
    ok(await p.inputValue('#o-text') === 'Order draft beneath a duplicate' && await p.inputValue('#o-qty') === '8 trays', 'Duplicate function origin: the underlying order draft is unchanged');
    await p.goForward(); await wait(p, '#fe-q');
    ok(await hash(p) === '#/functions', 'Duplicate Forward first restores the original function list');
    await p.goForward(); await wait(p, '#fe-name');
    ok(await hash(p) === '#/functions/draft' && await p.inputValue('#fe-name') === 'Exact original before duplicate', 'Duplicate Forward preserves the original form and its own exact draft');
    await p.goForward(); await wait(p, '#fe-name');
    ok(await hash(p) === '#/functions/new' && await p.inputValue('#fe-name') === 'Exact duplicate after ancestor return', 'Duplicate Forward then restores the separate new form and its exact draft');
    ok(await writes(p) === 0 && p.errors.length === 0, 'Duplicate parent return and Forward make no domain writes or page errors');
  }
  await p.context().close();

  p = await L.open(b, '#/suppliers/northside/manage', { who: 'bo', extra: F.fixture(), wait: 1800 });
  await wait(p, '[data-su="order-mode"]'); await p.click('[data-su="order-mode"]');
  await L.waitFor(p, () => location.hash === '#/suppliers/northside', null, 6000);
  await wait(p, 'input[data-sf="qty"][data-i="t-stock"]');
  ok(await hash(p) === '#/suppliers/northside', 'Supplier order chip leaves the direct catalogue address as well as its local mode');
  await walk(p, [['#/suppliers', 'input[data-sf="qty"][data-i="t-stock"]'], ['#/', '.dockets']], 'Supplier order chip parent');
  await p.context().close();

  p = await L.open(b, '#/orders', { who: 'ann', extra, wait: 1500 });
  await go(p, '#/functions', '#fe-q');
  await p.click('a[href="#/functions/new"]'); await wait(p, '#fe-name');
  await p.fill('#fe-name', 'Exact new draft to drop after restoring');
  if (await step(p, '#/functions', '#fe-q', 'New function draft parent')) {
    await p.goForward(); await wait(p, '#fe-name');
    ok(await p.inputValue('#fe-name') === 'Exact new draft to drop after restoring' && !!(await p.$('.fe-note')), 'Forward restores the exact new draft before an explicit discard');
    await p.locator('[data-fe="drop"]').first().click(); await L.settle(p, 150);
    await p.locator('[data-fe="drop"]').first().click();
    await L.waitFor(p, () => location.hash === '#/functions' && !!document.querySelector('#fe-q'), null, 6000);
    ok(await p.evaluate(() => !localStorage.getItem('lk.fe.draft.new')), 'Dropping the restored new function clears only its device draft');
    if (await step(p, '#/orders', '#o-text', 'Discarded new function origin')) {
      ok(!(await p.$('#fe-name')) && await writes(p) === 0 && p.errors.length === 0, 'Back after dropping a new draft reaches the origin without reopening a blank form or saving');
    }
  }
  await p.context().close();
  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
