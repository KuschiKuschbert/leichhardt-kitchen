// Functions ahead of time, step 4 (head chef, 10 Nov 2026, docs/function-ahead-options/brief.md): Got it on Home's
// function card reaches the chefs. Each Got it becomes one small record (fnseen/<function>_<person>_<card>_<g>) once
// its Undo has gone; an Undo writes nothing; marks made before this change go at the next open; nothing goes with no
// signal or for someone else on the phone. On a function's own page the head chef, the sous chefs and the admin tap
// Who has seen it: one read, then who said Got it, who said it before the last change, and who has not yet. Staff never
// see it or read it. All people and functions here are made up.
const L = require('./lib'), M = require('../js/functions.js');
const { R, ok } = L.results(), { txt } = L;
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW)), at = (d, hm) => M.kat(d, M.hmMin(hm));
const names = { ann: 'Ann', bo: 'Bo', cleo: 'Cleo', dev: 'Dev', sam: 'Sam', fay: 'Fay' };
const people = Object.keys(names).map(id => ({ id, name: names[id], role: id === 'bo' ? 'head' : id === 'sam' ? 'sous' : id === 'fay' ? 'fnc' : 'staff', active: true, add: true, tick: true, del: id === 'bo' || id === 'sam', fn: id === 'fay' }));
const cfg = { people, headId: 'bo', sousIds: ['sam', 'bo'], pingIds: ['bo'], fnIds: ['fay'], fnOnlyIds: ['fay'], staffIds: Object.keys(names), showBadges: true };
function fn(name, plus, o) {
  o = o || {};
  const date = M.addDays(today, plus), rounds = (o.rounds || ['18:30']).map(x => ({ at: at(date, x), note: '' }));
  return M.derive(Object.assign({ v: 1, status: 'confirmed', name, date, start: at(date, '17:30'), loc: 'Function room', guests: o.guests || 40,
    mode: 'all', notes: o.notes || '', kc: '', kcBy: '', kcAt: 0, rounds, od: M.addDays(today, -2),
    lines: [{ rid: 'antipasto-platter', name: 'Antipasto Platter', unit: 'platter', spec: '', fp: '', qty: 5, u: M.toU([5]) }],
    was: {}, chg: [], cBy: 'bo', cAt: 1, confBy: 'bo', confAt: 1, by: 'bo', upd: L.NOW - 86400000 }, o.x || {}));
}
const SMITH = fn('Smith 60th', 2, { guests: 60, notes: '4 gluten free.' });
const SIG = M.kitchenSig(SMITH);
const extra = (more) => Object.assign({ [key(['config', 'main'])]: cfg, [key(['functions', 'smith'])]: SMITH }, more || {});
const mark = (who, m) => "localStorage.setItem('lk.fn.hu." + who + "', " + JSON.stringify(JSON.stringify(m)) + ')';
const homeWait = p => L.waitFor(p, () => { const e = document.getElementById('fn-hm'); return !!e && !e.hidden && !!e.textContent.trim(); }, null, 6000);
const seenWrites = p => p.evaluate(() => window.__fake.writes.flat().filter(x => /\/fnseen\//.test(x.path)));
const store = p => p.evaluate(() => window.__fake.dump());
const seenId = (who, s, g) => 'smith_' + who + '_' + (s || 'week') + '_' + (g || SIG);
const marks = (p, who) => p.evaluate(w => JSON.parse(localStorage.getItem('lk.fn.hu.' + w) || '{}'), who);

(async () => {
  const b = await L.start(); let p;
  async function step(name, task) {
    try { await task(); }
    catch (e) { ok(false, name + ': ' + String(e.message || e).split('\n')[0]); }
    finally { if (p) { ok(!p.errors.length, name + ': no browser errors ' + p.errors.join(' | ')); await p.context().close(); p = null; } }
  }

  // 1. Got it: nothing is sent while Undo is there; once it has gone, one record in Ann's name, and her mark says so
  await step('got it is recorded', async () => {
    p = await L.open(b, '#/', { who: 'ann', extra: extra(), width: 390, height: 844, wait: 1800 });
    await homeWait(p);
    ok(/Your chefs see who has/.test(await txt(p, '#fn-hm .fn-hu-foot') || ''), 'the card says chefs see who has said Got it');
    await p.clock.fastForward(1000); await p.click('#fn-hm .fn-hu-got'); await L.settle(p, 400);
    ok(!(await seenWrites(p)).length, 'while Undo is on screen nothing is sent');
    await p.clock.fastForward(10000); await L.settle(p, 600);
    const w = await seenWrites(p), s = await store(p), rec = s[key(['fnseen', seenId('ann')])];
    ok(w.length === 1 && w[0].path === key(['fnseen', seenId('ann')]), 'after Undo has gone: one write, fnseen/' + seenId('ann') + ' (' + w.map(x => x.path.split('/').pop()).join(', ') + ')');
    ok(rec && rec.fid === 'smith' && rec.g === SIG && rec.s === 'week' && rec.day === today && Number.isInteger(rec.at) && rec.by === 'ann' && Object.keys(rec).sort().join() === 'at,by,day,fid,g,s', 'the record: function, what the card showed, the card, the day, when, who (' + JSON.stringify(rec) + ')');
    ok((await marks(p, 'ann')).smith.w === 1, 'Ann\'s mark on the phone says it is in');
    await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await L.settle(p, 600);
    ok((await seenWrites(p)).length === 1, 'the next open sends nothing again');
  });

  // 2. Undo: nothing reaches the chefs
  await step('undo writes nothing', async () => {
    p = await L.open(b, '#/', { who: 'ann', extra: extra(), width: 390, height: 844, wait: 1800 });
    await homeWait(p);
    await p.clock.fastForward(1000); await p.click('#fn-hm .fn-hu-got'); await L.settle(p, 300);
    await p.click('#fn-hm .fn-hu-undo'); await L.settle(p, 300);
    await p.clock.fastForward(12000); await L.settle(p, 600);
    await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await L.settle(p, 600);
    ok(!(await seenWrites(p)).length, 'Got it then Undo: no record is sent');
  });

  // 3. a Got it from before this change (a mark with no w) goes at the next open, once; someone else's marks never do
  await step('older marks', async () => {
    const init = mark('ann', { smith: { s: 'week', g: SIG, d: SMITH.date, t: L.NOW - 3600000 } }) + ';' + mark('bo', { smith: { s: 'week', g: SIG, d: SMITH.date, t: L.NOW - 7200000 } });
    p = await L.open(b, '#/', { who: 'ann', extra: extra(), init, width: 390, height: 844, wait: 1800 });
    await homeWait(p); await L.settle(p, 800);
    const w = await seenWrites(p), rec = (await store(p))[key(['fnseen', seenId('ann')])];
    ok(w.length === 1 && rec && rec.at === L.NOW - 3600000 && rec.by === 'ann', 'Ann\'s earlier Got it is sent at the open, with its own time (' + w.length + ' writes)');
    ok(!(await store(p))[key(['fnseen', seenId('bo')])] && !w.some(x => /_bo_/.test(x.path)), 'Bo\'s mark on the same phone is not sent as Ann');
    ok((await marks(p, 'ann')).smith.w === 1 && !(await marks(p, 'bo')).smith.w, 'Ann\'s mark says it is in; Bo\'s is left as it was');
    await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await L.settle(p, 800);
    ok((await seenWrites(p)).length === 1, 'the next open sends nothing again');
  });

  // 3b. a second Got it to the same card and version (after a cancel and restore) moves the record's time forward, so the
  // chefs see Got it, not Before the last change; a refusal is not taken as sent
  await step('again after a restore', async () => {
    const pre = { [key(['fnseen', seenId('ann')])]: { fid: 'smith', g: SIG, s: 'week', day: today, at: L.NOW - 3 * 3600000, by: 'ann' },
      [key(['fnseen', seenId('ann', 'off')])]: { fid: 'smith', g: SIG, s: 'off', day: today, at: L.NOW - 2 * 3600000, by: 'ann' } };
    p = await L.open(b, '#/', { who: 'ann', extra: extra(pre), init: mark('ann', { smith: { s: 'week', g: SIG, d: SMITH.date, t: L.NOW - 3600000 } }), width: 390, height: 844, wait: 1800 });
    await homeWait(p); await L.settle(p, 800);
    const rec = (await store(p))[key(['fnseen', seenId('ann')])];
    ok(rec && rec.at === L.NOW - 3600000 && (await marks(p, 'ann')).smith.w === 1, 'the Back on Got it moves Ann\'s week record on to its own time (' + (rec && rec.at) + ')');
  });
  await step('refused, not sent', async () => {
    const pre = { [key(['fnseen', seenId('ann')])]: { fid: 'smith', g: SIG, s: 'week', day: today, at: L.NOW - 60000, by: 'ann' } };
    p = await L.open(b, '#/', { who: 'ann', extra: extra(pre), init: mark('ann', { smith: { s: 'week', g: SIG, d: SMITH.date, t: L.NOW - 3600000 } }), width: 390, height: 844, wait: 1800 });
    await homeWait(p); await L.settle(p, 800);
    const m = (await marks(p, 'ann')).smith;
    ok(m && !m.w && m.n === 1, 'a refused Got it is counted, not marked as sent (' + JSON.stringify(m) + ')');
    await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await L.settle(p, 600);
    ok((await seenWrites(p)).length === 1, 'and is not tried again until the book loads again');
    ok((await store(p))[key(['fnseen', seenId('ann')])].at === L.NOW - 60000, 'the newer record on the server is kept');
  });

  // 4. no signal: nothing waits to be sent; back online, the next open sends it
  await step('no signal', async () => {
    p = await L.open(b, '#/', { who: 'ann', extra: extra(), width: 390, height: 844, wait: 1800 });
    await homeWait(p);
    await p.context().setOffline(true); await L.settle(p, 300);
    await p.clock.fastForward(1000); await p.click('#fn-hm .fn-hu-got'); await L.settle(p, 300);
    await p.clock.fastForward(10000); await L.settle(p, 600);
    ok(!(await seenWrites(p)).length, 'with no signal no record is queued');
    await p.context().setOffline(false); await L.settle(p, 300);
    await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await L.settle(p, 800);
    ok((await seenWrites(p)).length === 1 && !!(await store(p))[key(['fnseen', seenId('ann')])], 'back online, the next open sends it');
  });

  // 5. a sous chef on the function's page: one read when asked, then who has, who said it before a change, who has not
  const SEEN = {
    [key(['fnseen', seenId('ann')])]: { fid: 'smith', g: SIG, s: 'week', day: today, at: L.NOW - 600000, by: 'ann' },
    [key(['fnseen', seenId('dev', 'off')])]: { fid: 'smith', g: SIG, s: 'off', day: today, at: L.NOW - 7200000, by: 'dev' },
    [key(['fnseen', seenId('dev')])]: { fid: 'smith', g: SIG, s: 'week', day: today, at: L.NOW - 3600000, by: 'dev' },
    [key(['fnseen', seenId('cleo', 'week', 'old1')])]: { fid: 'smith', g: 'old1', s: 'week', day: M.addDays(today, -1), at: L.NOW - 86400000, by: 'cleo' },
    [key(['fnseen', seenId('bo', 'week')])]: { fid: 'smith', g: SIG, s: 'week', day: M.addDays(today, -1), at: L.NOW - 90000000, by: 'bo' },
    [key(['fnseen', seenId('bo', 'off')])]: { fid: 'smith', g: SIG, s: 'off', day: today, at: L.NOW - 300000, by: 'bo' },
    [key(['fnseen', seenId('zed')])]: { fid: 'smith', g: SIG, s: 'week', day: today, at: L.NOW - 1000, by: 'zed' },
    [key(['fnseen', 'jones_dev_week_abc'])]: { fid: 'jones', g: 'abc', s: 'week', day: today, at: L.NOW - 1000, by: 'dev' },
    // damaged records (never written by the book): nothing from them is drawn as markup, and none counts
    [key(['fnseen', 'pwn1'])]: { fid: 'smith', g: '<i id="pwn">', s: 'week', day: today, at: L.NOW, by: 'dev" data-pwn="1' },
    [key(['fnseen', 'pwn2'])]: { fid: 'smith', g: SIG, s: '<img src="x" onerror="window.__pwn=1">', day: today, at: L.NOW, by: 'dev' },
    [key(['fnseen', 'pwn3'])]: { fid: 'smith', g: SIG, s: 'week', day: today, at: '1" data-pwn="1', by: 'dev' }
  };
  for (const w of [390, 1280]) await step('chef sees ' + w, async () => {
    p = await L.open(b, '#/fn/smith', { who: 'sam', extra: extra(SEEN), width: w, height: 900, wait: 1800 });
    await L.waitFor(p, () => !!document.querySelector('#fn-seen .fn-seen-b'), null, 6000);
    ok(!(await p.evaluate(() => window.__fake.reads)).some(r => /\/fnseen/.test(r)), w + ': nothing is read until asked');
    await p.focus('#fn-seen .fn-seen-b'); await p.keyboard.press('Enter');
    await L.waitFor(p, () => !!document.querySelector('#fn-seen .fn-seen-l'), null, 6000);
    const t = await p.evaluate(() => document.getElementById('fn-seen').innerText.replace(/\s+/g, ' '));
    ok(/Got it \(\d\) Ann today \d\d:\d\d/.test(t), w + ': Got it names Ann with when (' + t.slice(0, 160) + ')');
    ok(/Before the last change \(2\) Bo today \d\d:\d\d, Cleo \w{3} \d\d:\d\d/.test(t), w + ': Cleo said it to an older booking, Bo last heard it was cancelled');
    ok(/Got it \(2\) Ann today \d\d:\d\d, Dev today \d\d:\d\d/.test(t), w + ': Dev said Got it again after the cancellation was undone: Got it');
    ok(/Not yet \(1\) Sam/.test(t), w + ': not yet: Sam; Fay (functions only), the record off the list and another function are left out');
    ok(!/zed|Fay|Someone/.test(t), w + ': nobody off the list is shown');
    ok((await p.evaluate(() => window.__fake.reads)).filter(r => /\/fnseen/.test(r)).length === 1, w + ': one read');
    ok(await p.evaluate(() => { const a = document.activeElement; return !!a && a.getAttribute('data-fn') === 'seen'; }), w + ': the focus stays on the button (now Check again)');
    ok(await L.waitFor(p, () => /Got it: 2\. Before the last change: 2\. Not yet: 1\./.test((document.getElementById('lk-live') || {}).textContent || ''), null, 3000).then(() => true, () => false), w + ': the result is said for a screen reader');
    ok(!(await L.overflow(p)), w + ': no sideways scroll');
    ok(await p.evaluate(() => !document.querySelector('#pwn, [data-pwn], img[src="x"]') && !window.__pwn), w + ': damaged records add no markup');
  });

  // 6. at extra large text the names wrap; nothing goes sideways
  await step('chef sees, extra large text', async () => {
    p = await L.open(b, '#/fn/smith', { who: 'sam', extra: extra(SEEN), width: 390, height: 844, wait: 1800, settings: { text: 'xlarge' } });
    await L.waitFor(p, () => !!document.querySelector('#fn-seen .fn-seen-b'), null, 6000);
    await p.click('#fn-seen .fn-seen-b');
    await L.waitFor(p, () => !!document.querySelector('#fn-seen .fn-seen-l'), null, 6000);
    ok(!(await L.overflow(p)), 'extra large text: no sideways scroll');
  });

  // 7. staff and a function manager: no block, no read; the manager's preview is not changed
  for (const who of ['ann', 'fay']) await step('not for ' + who, async () => {
    p = await L.open(b, '#/fn/smith', { who, extra: extra(SEEN), width: 390, height: 844, wait: 1800 });
    await L.settle(p, 600);
    ok(!(await p.$('#fn-seen')), who + ': no Who has seen it on the function\'s page');
    ok(!(await p.evaluate(() => window.__fake.reads)).some(r => /\/fnseen/.test(r)), who + ': nothing is read');
  });

  // 8. a failed read says so and never lists everyone as Not yet
  await step('failed read', async () => {
    p = await L.open(b, '#/fn/smith', { who: 'sam', extra: extra(SEEN), width: 390, height: 844, wait: 1800, failReads: '/fnseen' });
    await L.waitFor(p, () => !!document.querySelector('#fn-seen .fn-seen-b'), null, 6000);
    await p.click('#fn-seen .fn-seen-b');
    await L.waitFor(p, () => !!document.querySelector('#fn-seen .p-err'), null, 6000);
    const t = (await txt(p, '#fn-seen') || '');
    ok(/Could not check\./.test(t) && !/Not yet/.test(t), 'a failed read: Could not check, and no Not yet list (' + t.replace(/\s+/g, ' ').slice(0, 100) + ')');
  });

  // 9. a function that has passed or is cancelled has no block
  await step('only while it is to come', async () => {
    const OLD = fn('Old do', -1), OFF = fn('Off do', 3, { x: { status: 'cancelled', canAt: L.NOW - 1000, canBy: 'bo' } });
    p = await L.open(b, '#/fn/old', { who: 'sam', extra: extra({ [key(['functions', 'old'])]: OLD, [key(['functions', 'off'])]: OFF }), width: 390, height: 844, wait: 1800 });
    await L.settle(p, 600);
    ok(!(await p.$('#fn-seen')), 'a function that has passed: no block');
    await p.evaluate(() => { location.hash = '#/fn/off'; }); await L.settle(p, 800);
    ok(!(await p.$('#fn-seen')), 'a cancelled function: no block');
  });

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
