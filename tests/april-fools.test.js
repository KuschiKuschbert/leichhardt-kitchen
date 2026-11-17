// April Fools on Home (head chef, 17 Nov 2026; docs/april-fools.md). On 1 April (the kitchen's day) each named person's
// first Home view of the day on a device plays their joke from js/fools.js on a copy laid over Home, own phones and the
// shared display alike, then the mascot owns up. Once per person per day on a device; the reveal comes back after a
// reload; Still gives the words only; celebrations Off gives nothing; other days load nothing. The admin panel's
// Kitchen page lists who gets which and Preview plays one now, keeping nothing. No reads, no writes. Synthetic staff only.
const L = require('./lib');
const { R, ok } = L.results();
// 08:00 Queensland on 1 April 2027, the day before and the day after
const APR1 = Date.UTC(2027, 2, 31, 22, 0), MAR31 = Date.UTC(2027, 2, 30, 22, 0), APR2 = Date.UTC(2027, 3, 1, 22, 0);
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const ON = { selection: 'auto', motion: 'gentle', density: 'festive' };
function fixture(day) {
  const cfg = L.seed()[key(['config', 'main'])];
  cfg.kitSecs = [{ id: 'pans', name: 'Pans' }, { id: 'grill', name: 'Grill' }];
  cfg.kitShifts = [{ id: 'lunch', name: 'Lunch', from: 600, to: 1260 }];
  return { [key(['config', 'main'])]: cfg, [key(['team', day])]: { day, on: [{ id: 'ann', sh: 'lunch', sec: 'pans' }, { id: 'sam', sh: 'lunch', sec: 'grill' }],
    br: [], v: 1, at: APR1 - 3600000, upd: APR1 - 3600000, by: 'sam' } };
}
const realErrors = p => p.errors.filter(e => !/Failed to load resource/.test(e));
const rec = (p, id = 'ann') => p.evaluate(id => JSON.parse(localStorage.getItem('lk.fools.' + id) || 'null'), id);
const layer = p => p.evaluate(() => !!document.querySelector('.fl-layer'));
const cardUp = p => p.evaluate(() => !!document.querySelector('.fl-card'));
const heading = p => p.evaluate(() => (document.querySelector('#app #rtitle') || {}).textContent || '');

(async () => {
  const b = await L.start(); let p = null;
  async function open(o = {}) {
    const day = L.ymd(new Date((o.clock || APR1) + 10 * 3600000));
    p = await L.open(b, o.hash || '#/', { who: 'ann', width: 390, height: 844, clock: APR1, fools: true, seasonal: ON, extra: fixture(day), wait: 1200, ...o });
    p.__files = []; p.on('request', r => { if (/js\/fools\.js|css\/fools\.css/.test(r.url())) p.__files.push(r.url()); });
    return p;
  }
  async function step(label, task) {
    try { await task(); } catch (e) { ok(false, label + ': ' + String(e.message || e).split('\n')[0]); }
    finally { if (p) { ok(!realErrors(p).length, label + ': no browser errors ' + realErrors(p).join(' | ')); await p.context().close(); p = null; } }
  }
  const started = () => L.waitFor(p, () => !!document.querySelector('.fl-layer'), null, 9000);

  await step('1 April on a personal phone', async () => {
    await open();
    await started();
    ok(await p.evaluate(() => !!window.LK_FOOLS && window.LK_FOOLS.api === 1), 'personal phone: js/fools.js loaded on 1 April');
    ok(await p.evaluate(() => !!document.querySelector('link#fl-css')), 'personal phone: css/fools.css loaded');
    ok((await rec(p) || {}).st === 'play', 'personal phone: lk.fools.ann says it started');
    ok(await p.evaluate(() => document.getElementById('app').classList.contains('fl-under')), 'personal phone: the real Home is hidden under the copy, not changed');
    ok(/Ann/.test(await heading(p)), 'personal phone: the real welcome still says the name (only the copy changes)');
    ok(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, 'personal phone: no sideways scroll while it plays');
    // press and hold anywhere for 1.2 s stops it, and the press that stops it does not close the reveal
    await p.mouse.move(195, 500); await p.mouse.down(); await p.clock.runFor(1400); await L.settle(p, 100); await p.mouse.up();
    await L.waitFor(p, () => !!document.querySelector('.fl-card'), null, 4000);
    ok(!(await layer(p)) || await p.evaluate(() => getComputedStyle(document.querySelector('.fl-layer')).opacity !== '1'), 'press and hold: the copy goes');
    ok((await rec(p) || {}).st === 'seen', 'press and hold: the reveal is kept as seen');
    ok(/April Fools, Ann!/.test(await p.evaluate(() => document.querySelector('.fl-card h2').textContent)), 'reveal: April Fools with the name');
    ok(/You did nothing wrong/.test(await p.evaluate(() => document.querySelector('.fl-card').textContent)), 'reveal: says they did nothing wrong');
    await p.mouse.click(20, 20); await L.settle(p, 200);
    ok(await cardUp(p), 'reveal: a tap outside in the first moment does not close it unread');
    await p.clock.runFor(1600); await L.settle(p, 100);
    await p.click('.fl-rv-b'); await L.settle(p, 300);
    ok(!(await cardUp(p)), 'reveal: Back to my day closes it');
    ok(await heading(p) === 'Got you, Ann.', 'after: his bubble says Got you');
    ok(!(await p.evaluate(() => document.getElementById('app').classList.contains('fl-under'))), 'after: the real Home is back');
    ok(await p.evaluate(() => document.activeElement && document.activeElement.id === 'rtitle'), 'after: focus on the Home heading');
    await p.reload(); await L.settle(p, 2500);
    ok(!(await layer(p)) && !(await cardUp(p)), 'once a day: a reload plays nothing again');
    ok(await heading(p) === 'Got you, Ann.', 'once a day: the bubble still says Got you');
  });

  await step('1 April on the shared display', async () => {
    await open({ deviceMode: 'shared' });
    await started();
    ok(await layer(p), 'shared display: the joke plays there too');
  });

  await step('it ends by itself', async () => {
    await open({ init: () => { window.__lkFoolsLength = 10; } });
    await started();
    await p.clock.runFor(10500); await L.settle(p, 300);
    ok(await cardUp(p), 'by itself: the reveal comes at the end');
    ok((await rec(p) || {}).st === 'seen', 'by itself: kept as seen');
  });

  await step('the reveal after a reload part way', async () => {
    await open({ init: () => { localStorage.setItem('lk.fools.ann', JSON.stringify({ d: '2027-04-01', st: 'play' })); } });
    await L.waitFor(p, () => !!document.querySelector('.fl-card'), null, 8000);
    ok(!(await layer(p)), 'reload part way: the reveal only, no second scare');
    ok((await rec(p) || {}).st === 'seen', 'reload part way: kept as seen');
  });

  await step('Still: the words only', async () => {
    await open({ seasonal: { selection: 'auto', motion: 'still', density: 'festive' } });
    await L.waitFor(p, () => /April Fools, Ann/.test((document.querySelector('#app #rtitle') || {}).textContent || ''), null, 8000);
    ok(!(await layer(p)), 'Still: no copy and no movement');
    ok(await heading(p) === 'April Fools, Ann. Nothing is broken today.', 'Still: the mascot says it');
    ok((await rec(p) || {}).st === 'quiet', 'Still: kept as quiet');
  });

  await step('celebrations Off and other days', async () => {
    await open({ seasonal: { selection: 'off' } });
    await L.settle(p, 2500);
    ok(!p.__files.length && !(await layer(p)), 'celebrations Off: nothing loads and nothing plays');
    await p.context().close();
    for (const [label, clock] of [['31 March', MAR31], ['2 April', APR2]]) {
      await open({ clock });
      await L.settle(p, 2500);
      ok(!p.__files.length && !(await layer(p)), label + ': nothing loads and nothing plays');
      if (label !== '2 April') { ok(!realErrors(p).length, label + ': no browser errors'); await p.context().close(); }
    }
  });

  await step('the deal', async () => {
    await open({ seasonal: { selection: 'off' } });
    await p.evaluate(() => window.LK_APP.load('js/fools.js?v=1'));
    const r = await p.evaluate(() => {
      const ids = Array.from({ length: 20 }, (_, i) => 'id' + i * 7919), out = [];
      for (let y = 2027; y <= 2036; y++) {
        const a = window.LK_FOOLS.deal(ids, y), b = window.LK_FOOLS.deal(ids, y - 1);
        out.push(new Set(ids.map(i => a[i].slot)).size === ids.length && ids.every(i => a[i].design !== b[i].design));
      }
      return out.every(Boolean);
    });
    ok(r, 'deal: 20 people get 20 different jokes, and nobody gets last year\'s design, 2027 to 2036');
  });

  await step('the admin panel preview', async () => {
    p = await L.open(b, '#/admin', { admin: true, adminPage: 'kitchen-home', width: 1280, height: 900, clock: L.NOW, fools: true, seasonal: ON, wait: 1600 });
    p.__files = [];
    await L.waitFor(p, () => !!document.querySelector('[data-p="k-row"][data-r="fools"]'), null, 8000);
    await p.click('[data-p="k-row"][data-r="fools"]');
    await L.waitFor(p, () => document.querySelectorAll('[data-p="fools-play"]').length > 0, null, 8000);
    const rows = await p.evaluate(() => document.querySelectorAll('[data-p="fools-play"]').length);
    ok(rows >= 3, 'admin: a Preview for each person on the staff list (' + rows + ')');
    ok(await p.evaluate(() => /Joke on 1 April 20\d\d/.test(document.querySelector('[data-lv="fools"]').textContent)), 'admin: the list says which 1 April');
    ok(await p.evaluate(() => document.querySelectorAll('#fools-any option').length) === 24, 'admin: Any joke offers all 24');
    const who = await p.evaluate(() => window.LK_PREP.whoId());
    await p.click('[data-p="fools-play"]');
    await L.waitFor(p, () => location.hash === '#/' && !!document.querySelector('.fl-layer'), null, 9000);
    ok(true, 'admin: Preview opens Home and plays the joke now');
    ok(await p.evaluate(id => localStorage.getItem('lk.fools.' + id), who) === null, 'admin: a preview keeps nothing');
    ok(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, 'admin: no sideways scroll at 1280 px');
    await p.keyboard.press('Escape'); await L.settle(p, 300);
    ok(await cardUp(p), 'admin: Escape ends it with the reveal');
  });

  for (const [w, h] of [[768, 1024], [1280, 900]]) {
    await step('1 April at ' + w + ' px', async () => {
      await open({ width: w, height: h });
      await started();
      await p.clock.runFor(3000); await L.settle(p, 200);
      ok(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, w + ' px: no sideways scroll while it plays');
    });
  }

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
