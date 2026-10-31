// Moving to a new kitchen PIN, the backup file, sending missed recipe searches, and no learning writes from the phone.
const L = require('./lib');
const { R, ok } = L.results();
const today = L.ymd(new Date());
const NEW = '4321';
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const newKey = p => ['kitchens', NEW].concat(p).join('/');
const store = page => page.evaluate(() => window.__fake.dump());
(async () => {
  const b = await L.start();
  let p, s;

  // Move to a new kitchen PIN: staff PINs, notes, minutes, earlier versions, sign-offs and seen records all come along
  const extra = {};
  const reference = { alias: 'Milk', label: 'Milk', recipeId: 'laksa', supplierId: '', itemId: '', guideId: '', v: 2, at: 1, by: 'owner' };
  const training = { personId: 'ann', section: 'Larder', recipeId: '', guideId: '', status: 'in-training', assessorId: 'sam', day: today, v: 2, at: 1, by: 'owner' };
  extra[fsKey(['references', 'ai-test'])] = reference;
  extra[fsKey(['references', 'ai-test', 'hist', '1'])] = { ...reference, v: 1 };
  extra[fsKey(['training', 'ai-test'])] = training;
  extra[fsKey(['training', 'ai-test', 'hist', '1'])] = { ...training, v: 1 };
  extra[fsKey(['analysis', 'current'])] = { generation: 'g1', at: L.NOW, from: today, to: today, days: 1 };
  extra[fsKey(['analysisDaily', 'g1_' + today])] = { day: today, entries: [], v: 1 };

  extra[fsKey(['deliveries', 'receipt-1'])] = { day: today, receivedAt: L.NOW - 60000, recordedAt: L.NOW, supplier: 'Test supplier', chilled: 0, frozen: -18.5, note: 'Sample goods', receivedBy: 'Ann', receivedById: 'ann', by: 'ann' };
  extra[fsKey(['notes', 'n1'])] = { text: 'Fryer oil change', tag: 'none', start: '2026-01-05', until: '2026-01-05', dows: [], removed: false, at: 1, upd: 1, by: 'sam' };
  extra[fsKey(['notes', 'n1', 'seen', today + '_ann'])] = { day: today, at: 1, by: 'ann' };
  extra[fsKey(['minutes', 'm1'])] = { no: 1, v: 2, status: 'published', date: today, att: [], acts: [], removed: false, at: 1, upd: 1 };
  extra[fsKey(['minutes', 'm1', 'hist', '1'])] = { no: 1, v: 1, status: 'published', date: today, att: [], acts: [], removed: false, at: 1, upd: 1 };
  extra[fsKey(['minutes', 'm1', 'signs', '2_ann'])] = { v: 2, st: 'present', at: 1, name: 'Ann', by: 'ann' };
  extra[fsKey(['ordlearned', 'milk'])] = { text: 'Milk', uses: 6, dow: { 1: 3 }, qtys: { '6 L': 4 }, by: 'ann' };
  // transfers between venues (23 Oct 2026): one taken back by the head chef, copied as it is
  extra[fsKey(['transfers', today, 'lines', 'x1'])] = { dir: 'out', venue: 'Riviera', person: 'Jess', text: 'Butter', amount: 2, unit: 'kg', note: '', addedBy: 'Ann', addedById: 'ann', addedAt: 1, deleted: true, deletedBy: 'Head chef', deletedAt: 2, by: 'ann' };
  // the head chef's recipe changes (Manage Recipes & Drawings) and an earlier version
  extra[fsKey(['book', 'index'])] = { r: { burger: 2 } };
  // the head chef's picks for Draw it for me; the rules allow book/index and book/matches by name only, never a query
  extra[fsKey(['book', 'matches'])] = { m: { 'donut fry': 'fries-shoestring' } };
  extra[fsKey(['recipes', 'burger'])] = { r: { id: 'burger', kind: 'main', name: 'Chicken Burger Deluxe', ingredients: [], sections: [] }, v: 2, upd: 1, src: 'book', base: 'abcd1234', removed: false };
  extra[fsKey(['recipes', 'burger', 'hist', '1'])] = { was: { r: { id: 'burger', kind: 'main', name: 'Chicken Burger', ingredients: [], sections: [] }, v: 1 }, at: 1 };
  // a plating template and a piece the head chef made (reuse)
  extra[fsKey(['drawtpl', 'pub-split-1'])] = { name: 'Pub split', slot: 'plate', surf: { fam: 'plate', size: 30 }, els: [], defs: '{}', vb: '-110 -110 220 220', svgS: '', svgF: '', v: 1, upd: 1, removed: false };
  extra[fsKey(['drawlib', 'house-slaw-1'])] = { type: 'item', name: 'House slaw', cat: 'veg', kw: '', role: 'salad', form: 'piece', n: 1, w: 40, h: 30, body: '<circle cx="0" cy="0" r="15" fill="#F1EEDC"/>', side: { s: 'mound', h: 9, c: '#F1EEDC' }, v: 1, upd: 1, removed: false };
  p = await L.open(b, '#/admin', { admin: true, wait: 1800, extra });
  await L.adminTab(p, 'tools');
  await L.settle(p, 200);
  await p.fill('#a-newpin', NEW);
  await p.fill('#a-newpin2', NEW);
  await p.click('[data-p="move-pin"]');
  await L.settle(p, 150);
  ok(!(await store(p))[newKey(['staffpins', 'sam'])], 'move PIN: the first tap only arms the button');
  await p.click('[data-p="move-pin"]');
  await L.waitFor(p, () => !window.LK_PREP.state.moving, null, 8000);
  const msg = await p.evaluate(() => window.LK_PREP.state.moveMsg);
  ok(/^Copied \d+ records/.test(msg) && !/left on the old PIN/.test(msg), 'move PIN: finished without refusals (' + msg.slice(0, 60) + ')');
  s = await store(p);
  ['sam', 'ann', 'bo'].forEach(id => ok(!!s[newKey(['staffpins', id])] && !!s[newKey(['pinset', id])], 'move PIN: PIN of ' + id + ' copied'));
  ok((s[newKey(['deliveries', 'receipt-1'])] || {}).frozen === -18.5, 'move PIN: delivery temperatures and original attribution copied');
  ok(s[newKey(['references', 'ai-test'])].v === 2 && s[newKey(['references', 'ai-test', 'hist', '1'])].v === 1 && s[newKey(['training', 'ai-test', 'hist', '1'])].status === 'in-training' && !!s[newKey(['analysisDaily', 'g1_' + today])], 'move PIN: analysis, references, training and histories copied');
  ok(!!s[newKey(['notes', 'n1'])], 'move PIN: notes copied');
  ok(!!s[newKey(['notes', 'n1', 'seen', today + '_ann'])], 'move PIN: seen records copied');
  ok(!!s[newKey(['minutes', 'm1'])], 'move PIN: minutes copied');
  ok(!!s[newKey(['minutes', 'm1', 'hist', '1'])], 'move PIN: earlier minutes versions copied');
  ok(!!s[newKey(['minutes', 'm1', 'signs', '2_ann'])], 'move PIN: sign-offs copied');
  ok(!!s[newKey(['orders', today, 'lines', 'o1'])], 'move PIN: order lines copied');
  ok(!!s[newKey(['ordlearned', 'milk'])], 'move PIN: what the order list learned copied');
  ok((s[newKey(['transfers', today, 'lines', 'x1'])] || {}).deletedBy === 'Head chef', 'move PIN: transfers copied as they are');
  ok(!!s[newKey(['book', 'matches'])], 'move PIN: the head chef\'s Draw it for me picks copied');
  ok(!!s[newKey(['book', 'index'])] && (s[newKey(['recipes', 'burger'])] || {}).v === 2 && !!s[newKey(['recipes', 'burger', 'hist', '1'])], 'move PIN: the head chef\'s recipe changes and their earlier versions copied');
  ok(!!s[newKey(['drawtpl', 'pub-split-1'])] && !!s[newKey(['drawlib', 'house-slaw-1'])], 'move PIN: the head chef\'s templates and own library pieces copied');
  ok(p.errors.length === 0, 'move PIN: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Backup: one JSON file with notes and who has seen them, minutes with earlier versions and sign-offs, and order learning
  p = await L.open(b, '#/admin', { admin: true, wait: 1800, extra });
  await L.adminTab(p, 'tools');
  await L.settle(p, 200);
  const dl = p.waitForEvent('download', { timeout: 15000 });
  await p.click('[data-p="export"]');
  const file = await dl;
  const chunks = []; for await (const c of await file.createReadStream()) chunks.push(c);
  const bk = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  ok(/^leichhardt-prep-backup-\d{4}-\d{2}-\d{2}\.json$/.test(file.suggestedFilename()), 'backup: a dated JSON file (' + file.suggestedFilename() + ')');
  ok(bk.references[0].v === 2 && bk.referencesHist['ai-test'][0].v === 1 && bk.training[0].status === 'in-training' && bk.trainingHist['ai-test'][0].v === 1 && bk.analysisDaily[0].day === today, 'backup: analysis, references, training and histories preserved');
  ok(bk.notes.length === 1 && bk.notes[0].id === 'n1' && bk.notes[0].text === 'Fryer oil change', 'backup: shift pings included');
  ok((bk.notesSeen.n1 || []).some(x => x.id === today + '_ann' && x.by === 'ann'), 'backup: who has seen a note included');
  ok(bk.minutes.length === 1 && bk.minutes[0].v === 2, 'backup: meeting minutes included');
  ok((bk.minutesHist.m1 || []).some(x => x.id === '1' && x.v === 1), 'backup: earlier versions of the minutes included');
  ok((bk.minutesSigns.m1 || []).some(x => x.id === '2_ann' && x.st === 'present'), 'backup: minutes sign-offs included');
  ok(bk.ordlearned.length === 1 && bk.ordlearned[0].text === 'Milk' && bk.ordlearned[0].uses === 6, 'backup: what the order list learned included');
  ok((bk.transfers[today] || []).some(x => x.id === 'x1' && x.venue === 'Riviera'), 'backup: transfers between venues included');
  ok(bk.book.some(x => x.id === 'matches' && x.m['donut fry'] === 'fries-shoestring'), 'backup: the Draw it for me picks included');
  ok(bk.book.some(x => x.id === 'index') && bk.recipes.length === 1 && bk.recipes[0].v === 2 && (bk.recipesHist.burger || []).some(x => x.id === '1'), 'backup: the head chef\'s recipe changes and their earlier versions included');
  ok(bk.deliveries.length === 1 && bk.deliveries[0].frozen === -18.5 && bk.deliveries[0].receivedById === 'ann', 'backup: delivery readings and original receiver included');
  ok(bk.drawtpl.length === 1 && bk.drawtpl[0].name === 'Pub split' && bk.drawlib.length === 1 && bk.drawlib[0].name === 'House slaw', 'backup: the head chef\'s templates and own library pieces included');
  ok(Object.keys(bk.days).length === 1 && bk.days[today].length === 6 && Array.isArray(bk.pins) && !bk.pins.some(x => x.hash), 'backup: prep lines still in, PIN fingerprints still left out');
  await L.settle(p, 200);
  ok(/6 lines from 1 day, 1 shift ping and minutes from 1 meeting/.test(await p.evaluate(() => window.LK_PREP.state.toast)), 'backup: the message counts shift pings and minutes');
  ok(p.errors.length === 0, 'backup: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a part the published rules do not allow yet (summary, 22 Oct 2026) is left out and named, not the end of the backup
  p = await L.open(b, '#/admin', { admin: true, wait: 1800, extra, denyReads: '/summary$' });
  await L.adminTab(p, 'tools');
  await L.settle(p, 200);
  const dl2 = p.waitForEvent('download', { timeout: 15000 }).catch(() => null);
  await p.click('[data-p="export"]');
  const file2 = await dl2;
  ok(!!file2, 'backup with a refused part: the file still downloads');
  await L.waitFor(p, () => /Backup saved/.test(window.LK_PREP.state.toast || ''), null, 5000).catch(() => {});
  const msg2 = await p.evaluate(() => window.LK_PREP.state.toast || '');
  ok(/Left out, the rules do not allow it yet: summary\./.test(msg2), 'backup with a refused part: the message names it (' + msg2.slice(-70) + ')');
  ok(p.errors.length === 0, 'backup with a refused part: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // transfers before their rules are published: left out and named, the rest of the days still in
  p = await L.open(b, '#/admin', { admin: true, wait: 1800, extra, denyReads: '/transfers/' });
  await L.adminTab(p, 'tools');
  await L.settle(p, 200);
  const dl3 = p.waitForEvent('download', { timeout: 15000 }).catch(() => null);
  await p.click('[data-p="export"]');
  const file3 = await dl3;
  await L.waitFor(p, () => /Backup saved/.test(window.LK_PREP.state.toast || ''), null, 5000).catch(() => {});
  const msg3 = await p.evaluate(() => window.LK_PREP.state.toast || '');
  ok(!!file3 && /Left out, the rules do not allow it yet: transfers\./.test(msg3), 'backup with transfers refused: the file downloads and the message names them (' + msg3.slice(-60) + ')');
  ok(p.errors.length === 0, 'backup with transfers refused: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Missed recipe searches: a search queued while the queue is being sent is kept for next time
  p = await L.open(b, '#/prep', { wait: 1500 });
  await p.evaluate(() => {
    window.__fake.mode = 'hold';
    localStorage.setItem('lk.miss', JSON.stringify([{ q: 'lamb shank', at: 1 }]));
    window.LK_PREP.mount('prep', window.LK_PREP.state.root);
  });
  await L.settle(p, 100);
  await p.evaluate(() => {
    const l = JSON.parse(localStorage.getItem('lk.miss'));
    l.push({ q: 'pavlova', at: 2 });
    localStorage.setItem('lk.miss', JSON.stringify(l));
    window.__fake.mode = 'ok';
    window.__fake.release();
  });
  await L.settle(p, 200);
  const left = await p.evaluate(() => JSON.parse(localStorage.getItem('lk.miss') || '[]').map(x => x.q));
  ok(left.length === 1 && left[0] === 'pavlova', 'missed searches: one queued during sending is kept (' + left.join(', ') + ')');
  s = await store(p);
  ok(!!s[fsKey(['misses', 'lamb-shank'])] || Object.keys(s).some(k => /\/misses\//.test(k)), 'missed searches: the sent one is in the book');
  ok(p.errors.length === 0, 'missed searches: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Learning is done on the server at night: adding and picking lines writes nothing to learned or learnlog
  p = await L.open(b, '#/prep', { wait: 1500 });
  await p.fill('#p-text', 'Slice lemons');
  await p.press('#p-text', 'Enter');
  await L.settle(p, 500);
  await p.fill('#p-text', 'Juice limes');
  await p.press('#p-text', 'Enter');
  await L.settle(p, 4000);
  const lw = await p.evaluate(() => window.__fake.writes.filter(w => w.some(o => /\/(learned|learnlog)\//.test(o.path))).length);
  ok(lw === 0, 'learning: the phone writes nothing to learned or learnlog (' + lw + ' writes)');
  ok(p.errors.length === 0, 'learning: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Print or save as PDF is gone (20 Oct 2026, the book is used on phones): Download CSV stays
  p = await L.open(b, '#/admin', { admin: true, wait: 1800 });
  ok(!(await p.$('[data-p="print-tab"]')) && !!(await p.$('[data-p="csv"]')), 'insights: no Print or save as PDF, Download CSV stays');
  await p.context().close();

  await b.close();
  L.report(R);
})();
