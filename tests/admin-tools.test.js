// Moving to a new kitchen PIN, sending missed recipe searches, and no learning writes from the phone (consistency audit fixes).
const L = require('./lib');
const R = [];
const ok = (c, m) => L.check(c, m, R);
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
  extra[fsKey(['notes', 'n1'])] = { text: 'Fryer oil change', tag: 'none', start: '2026-01-05', until: '2026-01-05', dows: [], removed: false, at: 1, upd: 1, by: 'sam' };
  extra[fsKey(['notes', 'n1', 'seen', today + '_ann'])] = { day: today, at: 1, by: 'ann' };
  extra[fsKey(['minutes', 'm1'])] = { no: 1, v: 2, status: 'published', date: today, att: [], acts: [], removed: false, at: 1, upd: 1 };
  extra[fsKey(['minutes', 'm1', 'hist', '1'])] = { no: 1, v: 1, status: 'published', date: today, att: [], acts: [], removed: false, at: 1, upd: 1 };
  extra[fsKey(['minutes', 'm1', 'signs', '2_ann'])] = { v: 2, st: 'present', at: 1, name: 'Ann', by: 'ann' };
  p = await L.open(b, '#/admin', { admin: true, wait: 1800, extra });
  await p.click('[data-p="a-tab"][data-t="tools"]');
  await p.waitForTimeout(200);
  await p.fill('#a-newpin', NEW);
  await p.click('[data-p="move-pin"]');
  await p.waitForTimeout(150);
  ok(!(await store(p))[newKey(['staffpins', 'sam'])], 'move PIN: the first tap only arms the button');
  await p.click('[data-p="move-pin"]');
  await p.waitForFunction(() => !window.LK_PREP.state.moving, null, { timeout: 8000 });
  const msg = await p.evaluate(() => window.LK_PREP.state.moveMsg);
  ok(/^Copied \d+ records/.test(msg) && !/left on the old PIN/.test(msg), 'move PIN: finished without refusals (' + msg.slice(0, 60) + ')');
  s = await store(p);
  ['sam', 'ann', 'bo'].forEach(id => ok(!!s[newKey(['staffpins', id])] && !!s[newKey(['pinset', id])], 'move PIN: PIN of ' + id + ' copied'));
  ok(!!s[newKey(['notes', 'n1'])], 'move PIN: notes copied');
  ok(!!s[newKey(['notes', 'n1', 'seen', today + '_ann'])], 'move PIN: seen records copied');
  ok(!!s[newKey(['minutes', 'm1'])], 'move PIN: minutes copied');
  ok(!!s[newKey(['minutes', 'm1', 'hist', '1'])], 'move PIN: earlier minutes versions copied');
  ok(!!s[newKey(['minutes', 'm1', 'signs', '2_ann'])], 'move PIN: sign-offs copied');
  ok(!!s[newKey(['orders', today, 'lines', 'o1'])], 'move PIN: order lines copied');
  ok(p.errors.length === 0, 'move PIN: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Missed recipe searches: a search queued while the queue is being sent is kept for next time
  p = await L.open(b, '#/prep', { wait: 1500 });
  await p.evaluate(() => {
    window.__fake.mode = 'hold';
    localStorage.setItem('lk.miss', JSON.stringify([{ q: 'lamb shank', at: 1 }]));
    window.LK_PREP.mount('prep', window.LK_PREP.state.root);
  });
  await p.waitForTimeout(100);
  await p.evaluate(() => {
    const l = JSON.parse(localStorage.getItem('lk.miss'));
    l.push({ q: 'pavlova', at: 2 });
    localStorage.setItem('lk.miss', JSON.stringify(l));
    window.__fake.mode = 'ok';
    window.__fake.release();
  });
  await p.waitForTimeout(200);
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
  await p.waitForTimeout(500);
  await p.fill('#p-text', 'Juice limes');
  await p.press('#p-text', 'Enter');
  await p.waitForTimeout(4000);
  const lw = await p.evaluate(() => window.__fake.writes.filter(w => w.some(o => /\/(learned|learnlog)\//.test(o.path))).length);
  ok(lw === 0, 'learning: the phone writes nothing to learned or learnlog (' + lw + ' writes)');
  ok(p.errors.length === 0, 'learning: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})();
