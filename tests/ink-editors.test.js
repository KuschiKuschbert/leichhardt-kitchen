// Pending writes keep their drafts and truthful labels until the server acknowledgement arrives.
// The Firebase stand-in holds acknowledgements; no kitchen records or external writes are used.
const L = require('./lib'), { R, ok } = L.results();
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const person = (id, role) => ({ id, name: id === 'ann' ? 'Ann' : 'Sam', role, add: true, tick: true, del: true, active: true });
const extra = { [key('config', 'main')]: { people: [person('ann', 'head'), person('sam', 'sous')], headId: 'ann', sousIds: ['ann', 'sam'] } };
const recipe = async b => {
  const p = await L.open(b, '#/manage/r/burger', { who: 'ann', extra, wait: 1800 });
  await p.waitForSelector('#mg-name');
  return p;
};
(async () => {
  const b = await L.start();
  let p = await recipe(b);
  await p.fill('#mg-name', 'Test burger pending');
  await p.evaluate(() => { window.__fake.mode = 'hold'; });
  await p.click('[data-mg="save"]');
  await p.waitForSelector('[data-mg="save"][aria-busy="true"] .ink-icon[data-state="busy"]');
  ok(await p.$eval('[data-mg="save"] .ink-stroke > *', el => getComputedStyle(el).animationName !== 'none'), 'online pending save runs the ink trace');
  await L.waitFor(p, k => !!window.__fake.dump()[k], key('recipes', 'burger'));
  ok(await p.inputValue('#mg-name') === 'Test burger pending' && await p.evaluate(() => window.LK_MG.dirty()), 'recipe keeps the edited form and unsaved state while its write awaits acknowledgement');
  ok(!await p.$('.mg-toasts .ink-icon[data-state="done"]'), 'local write visibility does not announce a confirmed recipe save');
  await L.settle(p, 4500);
  ok(/Waiting for the signal/.test(await L.txt(p, '.mg-state')), 'slow recipe save keeps the existing waiting-for-signal explanation');
  await p.context().setOffline(true);
  await p.waitForSelector('html.ink-offline');
  ok(await p.$eval('[data-mg="save"] .ink-stroke > *', el => getComputedStyle(el).animationName === 'none'), 'known offline stops the pending save animation');
  ok(await p.inputValue('#mg-name') === 'Test burger pending', 'going offline does not replace the recipe draft');
  await p.context().setOffline(false);
  await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
  await p.waitForSelector('.mg-toasts .ink-icon[data-state="done"]');
  ok(/Saved\. Version/.test(await L.txt(p, '.mg-toasts')) && !await p.$('[data-mg="save"][aria-busy="true"]'), 'recipe success appears only after acknowledgement and ends the busy button');
  await p.context().close();

  p = await recipe(b);
  await p.fill('#mg-name', 'Test burger retry');
  await p.evaluate(() => { window.__fake.mode = 'fail'; });
  await p.click('[data-mg="save"]');
  await L.waitFor(p, () => /Not saved/.test(document.querySelector('#mg-root').textContent));
  ok(!await p.$('[data-mg="save"] .ink-icon[data-state="busy"], .mg-toasts .ink-icon[data-state="done"]') && await p.inputValue('#mg-name') === 'Test burger retry', 'failed recipe save stops motion, retains the draft and never shows a success check');
  // A lazy module may run in a saved shell which predates the optional motion helper.
  await p.evaluate(() => { window.LK_MOTION = null; window.__fake.mode = 'hold'; });
  await p.click('[data-mg="save"]');
  await L.waitFor(p, () => document.querySelector('[data-mg="save"]').disabled && /Saving/.test(document.querySelector('[data-mg="save"]').textContent));
  ok(!await p.$('[data-mg="save"] .ink-icon') && await p.inputValue('#mg-name') === 'Test burger retry', 'an older shell still shows plain pending feedback and keeps the same draft');
  await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
  await L.waitFor(p, () => /Saved\. Version/.test(document.querySelector('.mg-toasts').textContent));
  ok(await p.evaluate(k => window.__fake.dump()[k].r.name === 'Test burger retry', key('recipes', 'burger')), 'plain-text fallback still completes the actual recipe save');
  await p.context().close();

  p = await L.open(b, '#/deliveries', { who: 'ann', wait: 1800 });
  await p.waitForSelector('#dl-supplier');
  await p.fill('#dl-supplier', 'Test delivery acknowledgement');
  await p.fill('#dl-chilled', '3.5');
  await p.evaluate(() => {
    const fs = window.LK_PREP.book().fs(), real = fs.writeBatch;
    fs.writeBatch = (...args) => {
      const batch = real(...args), commit = batch.commit;
      batch.commit = () => commit().then(() => new Promise(resolve => { window.releaseDeliveryAck = resolve; }));
      return batch;
    };
  });
  await p.click('[data-dl="save"]');
  await L.waitFor(p, () => !!window.releaseDeliveryAck);
  ok(!!await p.$('[data-dl="save"][aria-busy="true"] .ink-icon[data-state="busy"]') && await p.inputValue('#dl-supplier') === 'Test delivery acknowledgement', 'delivery retains entered details and pending feedback while acknowledgement is held');
  ok(!await p.$('#dl-save-note .ink-icon[data-state="done"]') && !/Delivery saved/.test(await L.txt(p, '#dl-save-note')), 'a receipt visible in the listener does not confirm its held save');
  await p.evaluate(() => window.releaseDeliveryAck());
  await p.waitForSelector('#dl-save-note .ink-icon[data-state="done"]');
  const records = await p.evaluate(prefix => Object.entries(window.__fake.dump()).filter(([k]) => k.startsWith(prefix)), key('deliveries') + '/');
  ok(records.length === 1 && records[0][1].chilled === 3.5 && await p.inputValue('#dl-supplier') === '', 'acknowledged delivery clears the form and creates exactly one receipt');
  ok(!p.errors.length, 'delivery save has no page errors: ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  console.log(R.join('\n'));
  process.exit(R.some(r => r.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
