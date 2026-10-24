// The first Ordered tap checks the private catalogue before deciding between review and reminder-only completion.
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
  const p = await L.open(b, name || '#/', { who: 'sam', extra: fixture(linked), wait: 1500 });
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
  await p.click(button); await request;
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
  await p.click(button); await request;
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

  // A read failure is not an empty catalogue. Preserve the reminder rather than guessing the old path.
  p = await L.open(b, '#/', { who: 'sam', extra: fixture(false), wait: 1500, failReads: '/suppliers$' });
  await L.waitFor(p, () => !!document.querySelector('#cut-band [data-cut="done"]'), null, 10000);
  await p.click(button);
  await L.waitFor(p, () => /Could not check supplier sheets/.test(document.body.textContent), null, 10000);
  ok(!!(await p.$(button)) && !(await dump(p))[completion] && (await completionWrites(p)).length === 0, 'failed catalogue lookup keeps the reminder and writes no false completion');
  ok(p.errors.length === 0, 'failed catalogue lookup: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})();
