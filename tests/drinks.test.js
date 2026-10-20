// The drinks run: a new person is asked for their usual coffee or drink straight after setting their PIN, people who
// signed up before see a card once, and #/drinks shows everyone's usual so whoever does the run can share the order.
const L = require('./lib');
const { R, ok } = L.results(), { txt, tap } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const store = page => page.evaluate(() => window.__fake.dump());
(async () => {
  const b = await L.start();

  // a new person: PIN, then "One more thing"
  const cfg = { people: [
    { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
    { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
    { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, active: true },
    { id: 'kim', name: 'Kim Lee', role: 'staff', add: true, tick: true, del: false, active: true }
  ], sousIds: ['sam'], staffIds: ['sam', 'ann', 'bo', 'kim'], showBadges: true };
  let p = await L.open(b, '#/prep', { who: '', extra: { [fsKey(['config', 'main'])]: cfg }, wait: 1200 });
  await p.click('.p-name[data-id="kim"]');
  await p.keyboard.type('4444'); await p.waitForTimeout(600);
  await p.keyboard.type('4444'); await p.waitForTimeout(1000);
  ok(/One more thing, Kim/.test(await txt(p, '#prep-root') || ''), 'first PIN: asked for a usual drink straight after');
  ok(!!(await p.$('[data-p="dk-skip"]')), 'first PIN: Skip for now is offered');
  await tap(p, '[data-p="dk-save"]'); await p.waitForTimeout(200);
  ok(/Pick a coffee or drink first/.test(await txt(p, '.dk-form') || ''), 'first PIN: saving with nothing picked asks for a drink');
  ok(!(await p.$('[data-f="size"]')), 'form: no size until a coffee is picked');
  await tap(p, '[data-f="kind"][data-v="flat"]'); await p.waitForTimeout(150);
  await tap(p, '[data-f="size"][data-v="large"]');
  await tap(p, '[data-f="milk"][data-v="oat"]');
  await tap(p, '[data-f="shot"][data-v="extra"]');
  await tap(p, '[data-f="sugar"][data-v="1"]'); await p.waitForTimeout(150);
  await p.fill('[data-k="dk-note"]', 'Extra hot');
  await p.fill('[data-k="dk-other"]', 'Mother energy drink');
  await tap(p, '[data-f="milk"][data-v="skim"]'); await p.waitForTimeout(150);
  ok(await p.$eval('[data-k="dk-note"]', e => e.value) === 'Extra hot', 'form: typed words stay while picking');
  await tap(p, '[data-f="milk"][data-v="oat"]'); await p.waitForTimeout(150);
  const prev = await txt(p, '.dk-prev') || '';
  ok(/Large oat flat white, extra shot, 1 sugar\. Extra hot\. Also Mother energy drink/.test(prev), 'form: the preview reads like a cafe order (' + prev + ')');
  await tap(p, '[data-p="dk-save"]'); await p.waitForTimeout(900);
  let s = await store(p), d = s[fsKey(['drinks', 'kim'])];
  ok(!!d && d.by === 'kim' && d.kind === 'flat' && d.size === 'large' && d.milk === 'oat' && d.shot === 'extra' && d.sugar === '1' && d.note === 'Extra hot' && d.other === 'Mother energy drink' && d.at >= L.NOW, 'save: Kim\'s usual is saved under her own id');
  ok(/Writing as\s*Kim/.test(await txt(p, '.nb-top') || ''), 'save: then the prep list');
  ok(!(await p.$('.dk-nudge')), 'save: no drinks card afterwards');
  ok(p.errors.length === 0, 'first PIN: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // someone who signed up before: a card once, Not now keeps it away
  const noAnn = { [fsKey(['drinks', 'ann'])]: undefined };
  p = await L.open(b, '#/prep', { who: 'ann', extra: noAnn, wait: 1500 });
  ok(/New: the drinks run/.test(await txt(p, '.dk-nudge') || ''), 'card: Ann (no usual yet) sees the drinks run card');
  await tap(p, '[data-p="dk-later"]'); await p.waitForTimeout(200);
  ok(!(await p.$('.dk-nudge')), 'card: Not now hides it');
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1500);
  ok(!(await p.$('.dk-nudge')), 'card: and it stays away after a reload');
  await p.context().close();
  p = await L.open(b, '#/orders', { who: 'ann', extra: noAnn, wait: 1500 });
  ok(!!(await p.$('.dk-nudge')), 'card: shows on the order list too');
  await p.click('.dk-nudge a[data-p="dk-set"]'); await p.waitForTimeout(800);
  ok(/#\/drinks$/.test(p.url()) && !!(await p.$('.dk-page .dk-form')), 'card: Set my usual opens the drinks run with the form open');
  await tap(p, '[data-f="kind"][data-v="tea"]'); await p.waitForTimeout(150);
  ok(!(await p.$('[data-f="shot"]')), 'form: tea has no strength');
  await tap(p, '[data-f="milk"][data-v="none"]'); await p.waitForTimeout(100);
  await tap(p, '[data-p="dk-save"]'); await p.waitForTimeout(800);
  ok(/Regular tea, no milk/.test(await txt(p, '.dk-mine') || ''), 'save: Your usual shows the new drink (' + await txt(p, '.dk-mine') + ')');
  ok(p.errors.length === 0, 'card: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  // a person with a usual already: no card, and the check is not read again on this phone
  p = await L.open(b, '#/prep', { who: 'bo', wait: 1500 });
  ok(!(await p.$('.dk-nudge')), 'card: Bo (has a usual) sees no card');
  ok(await p.evaluate(() => localStorage.getItem('lk.drink.bo')) === 'set', 'card: the phone remembers Bo has one');
  await p.context().close();

  // the drinks run: from the chef mark menu, tick who is in, the order counts the same drinks together
  p = await L.open(b, '#/', { who: 'sam', extra: { [fsKey(['drinks', 'bo'])]: undefined, [fsKey(['drinks', 'kim'])]: undefined }, wait: 1500 });
  await tap(p, '.wtop-who'); await p.waitForTimeout(200);
  ok(!!(await p.$('.wm a[href="#/drinks"]')), 'menu: the chef mark offers Drinks run');
  await p.click('.wm a[href="#/drinks"]'); await p.waitForTimeout(1000);
  ok(/Drinks run/.test(await txt(p, '#rtitle') || ''), 'page: opens from the menu');
  ok(/Large long black, extra shot/.test(await txt(p, '.dk-mine') || ''), 'page: Sam sees his own usual');
  ok(/No usual yet/.test(await txt(p, '.dk-team') || ''), 'page: Bo has none yet and says so');
  await p.close();
  p = await L.open(b, '#/drinks', { who: 'sam', extra: { [fsKey(['drinks', 'bo'])]: { kind: 'flat', size: 'reg', milk: 'oat', shot: '', sugar: '1', note: '', other: '', at: 1, by: 'bo' } }, wait: 1500 });
  ok(/Tap the people who are in/.test(await txt(p, '.dk-runbox') || ''), 'run: nobody in yet');
  await tap(p, '[data-p="dk-in"][data-id="ann"]'); await p.waitForTimeout(100);
  await tap(p, '[data-p="dk-in"][data-id="bo"]'); await p.waitForTimeout(150);
  ok(await p.$eval('[data-p="dk-in"][data-id="ann"]', e => e.getAttribute('aria-pressed')) === 'true', 'run: Ann is ticked in');
  const order = await p.$$eval('.dk-order li', l => l.map(e => e.textContent));
  ok(order.length === 2 && /^2 x Regular oat flat white, 1 sugar$/.test(order[0]) && /^1 x Coke No Sugar$/.test(order[1]), 'run: the same drinks are counted together (' + order.join(' / ') + ')');
  ok(/2 people/.test(await txt(p, '.dk-run h3') || ''), 'run: says 2 people');
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1500);
  ok((await p.$$('.dk-order li')).length === 2, 'run: who is in stays after a reload');
  await tap(p, '[data-p="dk-in"][data-id="bo"]'); await p.waitForTimeout(150);
  ok((await p.$$eval('.dk-order li', l => l.map(e => e.textContent))).some(t => /^1 x Regular oat flat white/.test(t)), 'run: untick Bo, 1 flat white');
  await tap(p, '[data-p="dk-clear"]'); await p.waitForTimeout(150);
  ok(!(await p.$('.dk-order')), 'run: Start again empties it');
  // change it
  await tap(p, '[data-p="dk-edit"]'); await p.waitForTimeout(150);
  ok(await p.$eval('[data-f="kind"][data-v="long"]', e => e.getAttribute('aria-pressed')) === 'true', 'change: the form starts from the saved usual');
  await tap(p, '[data-f="kind"][data-v="cap"]'); await p.waitForTimeout(100);
  await tap(p, '[data-p="dk-save"]'); await p.waitForTimeout(800);
  s = await store(p);
  ok(s[fsKey(['drinks', 'sam'])].kind === 'cap' && s[fsKey(['drinks', 'sam'])].by === 'sam', 'change: saved');
  ok(!(await L.overflow(p)), 'page: no sideways scroll at 390 px');
  ok(p.errors.length === 0, 'run: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  for (const w of [768, 1280]) {
    p = await L.open(b, '#/drinks', { who: 'sam', width: w, height: 900, wait: 1500 });
    await tap(p, '[data-p="dk-in"][data-id="ann"]'); await tap(p, '[data-p="dk-edit"]'); await p.waitForTimeout(200);
    const ov = await L.overflow(p);
    ok(!ov, 'page: no sideways scroll at ' + w + ' px ' + (ov || ''));
    await p.context().close();
  }

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
