// The order-list tick still checks the private catalogue before deciding between review and reminder-only completion.
// Hold its first module request so these checks cover a slow live-site load, not just a fast local server.
const L = require('./lib');
const F = require('./supplier-fixtures');
const { R, ok } = L.results();
const completion = F.key(['cutdone', F.today + '_northside']);
const button = '#cut-band [data-cut="done"][data-id^="northside|"]';
const tick = '.cut-tl [data-p="cut-tick"][data-id^="northside|"]';
const fixture = linked => {
  const seed = F.fixture();
  if (!linked) Object.keys(seed).filter(k => /\/suppliers\//.test(k)).forEach(k => delete seed[k]);
  return seed;
};
const dump = p => p.evaluate(() => window.__fake.dump());
const completionWrites = p => p.evaluate(k => window.__fake.writes.flat().filter(o => o.path === k), completion);
async function holdTools(p) {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await p.context().route(/\/js\/supplier-core\.js(?:\?|$)/, async route => { await gate; await route.continue(); });
  return release;
}
async function open(b, linked, name) {
  const p = await L.open(b, name || '#/orders', { who: 'sam', extra: fixture(linked), wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('#cut-band [data-cut="done"]'), null, 10000);
  return p;
}

(async () => {
  const b = await L.start();
  let p, release, request;

  // An unlinked supplier is only marked after its delayed catalogue lookup confirms the old completion path.
  p = await open(b, false);
  release = await holdTools(p);
  request = p.waitForRequest(/\/js\/supplier-core\.js(?:\?|$)/);
  await p.click(tick); await request;
  await L.settle(p, 500);
  ok(!!(await p.$(button)) && !(await dump(p))[completion], 'delayed tools: reminder stays on and no completion is saved while the supplier is unknown');
  ok((await completionWrites(p)).length === 0, 'delayed tools: no optimistic completion is written before the lookup');
  release();
  await L.waitFor(p, k => { const d = window.__fake.dump()[k]; return d && d.on === true; }, completion, 10000);
  await L.waitFor(p, () => !document.querySelector('#cut-band [data-cut="done"][data-id^="northside|"]'), null, 10000);
  ok((await dump(p))[completion].by === 'sam' && !(await p.$(button)), 'delayed tools: unlinked supplier completes as the chef once the lookup finishes');
  ok(p.errors.length === 0, 'delayed unlinked completion: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // A linked supplier opens review. Loading it must never silently mark its reminder as ordered.
  p = await open(b, true);
  release = await holdTools(p);
  request = p.waitForRequest(/\/js\/supplier-core\.js(?:\?|$)/);
  await p.click(tick); await request;
  await L.settle(p, 500);
  ok(!!(await p.$(button)) && !(await dump(p))[completion], 'linked delayed tools: waiting never marks an order that has no recorded quantities');
  release();
  await L.waitFor(p, day => location.hash === '#/suppliers/cutoff/northside/' + day, F.today, 10000);
  await L.waitFor(p, () => !!document.querySelector('input[data-sf="qty"]'), null, 10000);
  ok(!(await dump(p))[completion] && (await completionWrites(p)).length === 0, 'linked delayed tools: the correct supplier sheet opens without a completion write');
  ok(p.errors.length === 0, 'delayed linked review: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // A second tap while the lookup is held cancels the first intent. It must not record true and then false.
  p = await open(b, false, '#/orders');
  release = await holdTools(p);
  request = p.waitForRequest(/\/js\/supplier-core\.js(?:\?|$)/);
  await p.click(tick); await request;
  await p.click(tick);
  await L.settle(p, 500);
  ok(!(await dump(p))[completion] && (await completionWrites(p)).length === 0, 'held lookup: tick then untick saves neither intent early');
  release();
  await L.waitFor(p, k => { const d = window.__fake.dump()[k]; return d && d.on === false; }, completion, 10000);
  const writes = await completionWrites(p);
  ok(writes.length === 1 && writes[0].data.on === false, 'held lookup: the final untick wins with one false write and no transient ordered record');
  ok(await p.$eval(tick, e => e.getAttribute('aria-pressed') === 'false') && !!(await p.$(button)), 'held lookup: the list stays unticked and its reminder remains visible');
  ok(p.errors.length === 0, 'held lookup intent queue: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // A denied lookup started by one chef must not use its legacy fallback as the next chef on the same tablet.
  p = await L.open(b, '#/orders', { who: 'bo', deviceMode: 'shared', extra: fixture(false), wait: 1500, denyReads: '/suppliers$' });
  await L.waitFor(p, () => !!document.querySelector('#cut-band [data-cut="done"]') && window.LK_PREP.supplier().read(), null, 10000);
  release = await holdTools(p);
  request = p.waitForRequest(/\/js\/supplier-core\.js(?:\?|$)/);
  await p.click(tick); await request;
  await p.click('.nb-top [data-p="who-change"]');
  await L.waitFor(p, () => !!document.querySelector('.p-name[data-id="sam"]'), null, 10000);
  await p.click('.p-name[data-id="sam"]');
  await p.type('#pf1', '1111');
  await L.waitFor(p, () => window.LK_PREP.whoName() === 'Sam' && window.LK_PREP.supplier().read(), null, 10000);
  ok(!(await dump(p))[completion], 'chef handover: the old order-list intent is still pending while the next valid chef signs in');
  release();
  await L.waitFor(p, k => /Not saved/.test(document.body.textContent) || !!window.__fake.dump()[k], completion, 10000);
  ok(!(await dump(p))[completion] && (await completionWrites(p)).length === 0, 'chef handover: a denied old lookup cannot mark an order as the next chef');
  ok(await p.evaluate(() => location.hash === '#/orders') && !!(await p.$(button)), 'chef handover: the next chef stays on their page with the reminder unchanged');
  ok(p.errors.length === 0, 'denied lookup after chef handover: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // On the same chef's device, unpublished supplier rules still leave the established reminder-only action usable.
  p = await L.open(b, '#/orders', { who: 'sam', extra: fixture(false), wait: 1500, denyReads: '/suppliers$' });
  await L.waitFor(p, () => !!document.querySelector('#cut-band [data-cut="done"]'), null, 10000);
  release = await holdTools(p);
  request = p.waitForRequest(/\/js\/supplier-core\.js(?:\?|$)/);
  await p.click(tick); await request;
  await L.settle(p, 500);
  ok(!(await dump(p))[completion], 'same chef denied lookup: the pending action is not saved early');
  release();
  await L.waitFor(p, k => { const d = window.__fake.dump()[k]; return d && d.on === true; }, completion, 10000);
  await L.waitFor(p, () => !document.querySelector('#cut-band [data-cut="done"][data-id^="northside|"]'), null, 10000);
  ok((await dump(p))[completion].by === 'sam', 'same chef denied lookup: the legacy completion still saves under that chef');
  ok((await completionWrites(p)).length === 1 && await p.evaluate(() => location.hash === '#/orders'), 'same chef denied lookup: one completion is saved without opening a supplier sheet');
  ok(p.errors.length === 0, 'same chef denied lookup fallback: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // A read failure is not an empty catalogue. Preserve the reminder rather than guessing the old path.
  p = await L.open(b, '#/orders', { who: 'sam', extra: fixture(false), wait: 1500, failReads: '/suppliers$' });
  await L.waitFor(p, () => !!document.querySelector('#cut-band [data-cut="done"]'), null, 10000);
  await p.click(tick);
  await L.waitFor(p, () => /Not saved/.test(document.body.textContent), null, 10000);
  ok(!!(await p.$(button)) && !(await dump(p))[completion] && (await completionWrites(p)).length === 0, 'failed catalogue lookup keeps the reminder and writes no false completion');
  ok(p.errors.length === 0, 'failed catalogue lookup: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})();
