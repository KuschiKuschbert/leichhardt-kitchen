// Double ups on the prep list: the same item open twice on today's list, in any section, becomes one line by itself
// (with Undo), and writing an item that is already open does not add it again (with Add anyway).
const L = require('./lib');
const { R, ok } = L.results(), { row } = L;
const today = L.ymd(new Date(L.NOW));
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const ik = id => fsKey(['days', today, 'items', id]);
const store = page => page.evaluate(() => window.__fake.dump());
const toast = page => page.evaluate(() => { const e = document.querySelector('.p-toast'); return e ? e.textContent : ''; });
const serverReads = page => page.evaluate(() => window.__fake.reads.filter(r => /\/days\/[^/]+\/items\/[^/]+$/.test(r)).length);
(async () => {
  const b = await L.start();
  const item = (text, station, qty, mins, x) => Object.assign({ text, station, qty, recipe: '', addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - mins * 60000, done: false, deleted: false }, x || {});
  const extra = {};
  // obvious: the same item in two sections, one amount blank (the urgent mark and the amount move to the line kept)
  extra[ik('d1')] = item('Aioli', 'Larder', '', 50);
  extra[ik('d2')] = item('aioli.', 'Fryer', '2 L', 20, { urgent: true, urgentBy: 'Bo', urgentById: 'bo', urgentAt: L.NOW - 1200000 });
  // obvious: written today while the same line rolled over (the seed's Make gravy, 5 L, Sauce): the rolled one stays
  extra[ik('g2')] = item('make gravy', 'Larder', '5l', 10);
  // not obvious: different amounts, both stay and point at each other
  extra[ik('e1')] = item('Chips', 'Fryer', '2 kg', 40);
  extra[ik('e2')] = item('Chips', 'Prep', '5 kg', 30);
  // kept apart on purpose
  extra[ik('k1')] = item('Peel garlic', 'Larder', '', 40);
  extra[ik('k2')] = item('Peel garlic', 'Veg', '', 30, { dupOk: true });
  // a second batch after the first was ticked is not a double up
  extra[ik('t1')] = item('Mash', 'Larder', '', 300, { done: true, doneBy: 'Bo', doneById: 'bo', doneAt: L.NOW - 200 * 60000 });
  extra[ik('t2')] = item('Mash', 'Larder', '', 15);
  // this phone still shows Pick thyme open twice, but the server says one was ticked on another phone
  extra[ik('s1')] = item('Pick thyme', 'Larder', '', 45);
  extra[ik('s2')] = item('Pick thyme', 'Grill', '', 25);
  const fakeServer = {};
  fakeServer[ik('s1')] = Object.assign({}, extra[ik('s1')], { done: true, doneBy: 'Bo', doneById: 'bo', doneAt: L.NOW - 600000 });

  let p = await L.open(b, '#/prep', { extra, fakeServer, wait: 3500 });
  let s = await store(p);
  ok(s[ik('d2')].deleted === true && s[ik('d2')].mergedInto === 'd1', 'merge: the later line is removed and points at the one kept');
  ok(!s[ik('d1')].deleted && s[ik('d1')].qty === '2 L' && s[ik('d1')].urgent === true, 'merge: the line kept takes the amount and the urgent mark');
  ok(JSON.stringify(s[ik('d1')].also) === '["Fryer"]', 'merge: the line kept remembers the other section (' + JSON.stringify(s[ik('d1')].also) + ')');
  ok(s[ik('g2')].deleted === true && s[ik('g2')].mergedInto === 'i4' && !s[ik('i4')].deleted, 'merge: a line written today goes into the rolled line, "5l" and "5 L" agree');
  ok(!s[ik('e1')].deleted && !s[ik('e2')].deleted, 'different amounts: both lines stay');
  ok(!s[ik('k1')].deleted && !s[ik('k2')].deleted, 'kept apart on purpose: both lines stay');
  ok(!s[ik('t2')].deleted, 'a second batch after a tick: stays');
  ok(!s[ik('s1')].deleted && !s[ik('s2')].deleted, 'old copy on the phone: nothing removed when the server says one was ticked');
  const t = await toast(p);
  ok(/2 double ups merged/.test(t) && /Aioli/.test(t) && /Make gravy/.test(t), 'merge: the toast says what was merged (' + t + ')');
  ok(/Also Fryer/.test(await row(p, 'd1') || ''), 'list: the line kept says Also Fryer');
  ok(await row(p, 'd2') === null, 'list: the merged line is gone');
  ok(/Also Prep 5 kg/.test(await row(p, 'e1') || '') && /Also Fryer 2 kg/.test(await row(p, 'e2') || ''), 'list: different amounts point at each other');
  ok(!(await L.overflow(p)), 'phone: no sideways scroll');
  const reads = await serverReads(p);
  ok(reads === 6, 'reads: only the lines of the double ups are read from the server (' + reads + ')');

  await p.click('.nb-tab[data-v="Fryer"]');
  await L.settle(p, 200);
  ok(/Also Larder/.test(await row(p, 'd1') || ''), 'Fryer tab: the merged line shows there too, Also Larder');
  await p.click('.nb-tab[data-v=""]');
  await L.settle(p, 200);

  await p.click('.p-toast-btn');
  await L.settle(p, 3500);
  s = await store(p);
  ok(!s[ik('d2')].deleted && s[ik('d2')].dupOk === true && s[ik('d2')].mergedInto === '', 'Undo: the merged line is back, kept apart');
  ok(s[ik('d1')].qty === '' && s[ik('d1')].urgent === false && JSON.stringify(s[ik('d1')].also) === '[]', 'Undo: the line kept is as it was');
  ok(!s[ik('g2')].deleted, 'Undo: every line in that merge is back');
  ok(await serverReads(p) === reads, 'no repeat: after Undo, and with the old copy still on the phone, nothing is read again');
  ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // writing: Ann (staff) writes items already open on today's list
  p = await L.open(b, '#/prep', { who: 'ann', wait: 1500 });
  const add = async (sec, text, qty) => {
    await p.fill('#p-section', sec); await p.fill('#p-text', text); await p.fill('#p-qty', qty);
    await p.click('.nb-addbtn'); await L.settle(p, 400);
  };
  const lines = (st, re) => Object.keys(st).filter(k => k.indexOf('/days/' + today + '/items/') > 0 && re.test(st[k].text));
  await add('Grill', 'pick coriander', '1 bunch');
  s = await store(p);
  ok(/Pick coriander is already on the list under Larder, 1 bunch/.test(await toast(p)), 'write: says it is already on the list (' + await toast(p) + ')');
  ok(lines(s, /coriander/i).length === 1, 'write: no second line');
  ok(s[ik('i2')].qty === '1 bunch' && JSON.stringify(s[ik('i2')].also) === '["Grill"]', 'write: the open line takes the amount and the section');
  await p.click('.p-toast-btn');
  await L.settle(p, 400);
  s = await store(p);
  const two = lines(s, /coriander/i).filter(k => !k.endsWith('/i2'));
  ok(two.length === 1 && s[two[0]].dupOk === true && s[two[0]].station === 'Grill' && s[two[0]].qty === '1 bunch', 'Add anyway: a second line, kept apart');
  ok(s[ik('i2')].qty === '' && JSON.stringify(s[ik('i2')].also) === '[]', 'Add anyway: the open line is as it was');

  await add('Larder', 'Slice onion', '');
  s = await store(p);
  ok(/Slice onions is already on the list under Larder, 2 tubs/.test(await toast(p)) && lines(s, /onion/i).length === 1, 'write: singular and plural are the same item');

  await add('Sauce', 'Laksa', '2 batches');
  s = await store(p);
  const lk = lines(s, /laksa/i);
  ok(lk.length === 2, 'write: a different amount is added as its own line');
  const nid = lk.filter(k => !k.endsWith('/i5'))[0].split('/').pop();
  await L.settle(p, 3000);
  ok(/Also 1 batch/.test(await row(p, nid) || '') && /Also 2 batches/.test(await row(p, 'i5') || ''), 'list: same section, different amounts point at each other');
  s = await store(p);
  ok(!s[ik('i5')].deleted && !s[ik(nid)].deleted, 'different amounts: not merged');
  ok(await serverReads(p) === 0, 'reads: nothing read from the server when there is no double up to merge');
  ok(!(await L.overflow(p)), 'phone: no sideways scroll');
  ok(p.errors.length === 0, 'writing: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})();
