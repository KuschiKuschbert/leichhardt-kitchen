// The Christmas countdown (head chef, 17 Nov 2026; docs/seasonal-celebrations.md, Coming up;
// docs/mascot-festive-options/brief.md). From 1 December Home's Coming up card says "Christmas Day, in 24 days" with
// the Christmas stamp, a day less each Queensland day, until its own 7 days reach Christmas Day on 18 December.
// Nothing above Your day moves, the welcome keeps its own words, Off shows nothing, and there is no read.
// Synthetic staff only.
const L = require('./lib');
const { R, ok } = L.results();
const at = s => Date.parse(s + '+10:00');
const realErrors = p => p.errors.filter(e => !/Failed to load resource/.test(e));
const coming = p => p.evaluate(() => {
  const card = document.querySelector('.hm-up'), items = [...document.querySelectorAll('[data-kb-coming] .kb-coming-item')];
  return { shown: !!card && getComputedStyle(card).display !== 'none', items: items.map(e => e.textContent.trim()),
    stamp: items.some(e => /Christmas Day/.test(e.textContent) && !!e.querySelector('.kb-coming-mark svg')) };
});
const geo = p => p.evaluate(() => ['#rtitle', '.wall-date', '#hm-day'].map(s => { const r = document.querySelector(s)?.getBoundingClientRect(); return r ? [Math.round(r.y), Math.round(r.height)].join(',') : ''; }).join(' | '));

(async () => {
  const b = await L.start(); let p = null;
  async function open(when, o = {}) {
    p = await L.open(b, '#/', Object.assign({ who: 'ann', width: 390, height: 844, wait: 1400, clock: when, server: when,
      seasonal: { selection: 'auto', motion: 'still', density: 'light' } }, o));
    await L.waitFor(p, () => !!document.querySelector('#rtitle.hm-welcome'), null, 6000);
    await p.clock.runFor(500); await L.settle(p, 300);
    return p;
  }
  async function step(label, task) {
    try { await task(); } catch (e) { ok(false, label + ': ' + String(e.message || e).split('\n')[0]); }
    finally { if (p) { ok(!realErrors(p).length, label + ': no browser errors ' + realErrors(p).join(' | ')); await p.context().close(); p = null; } }
  }

  let before = '';
  await step('30 November: no countdown yet', async () => {
    await open(at('2026-11-30T14:00:00'));
    const c = await coming(p); before = await geo(p);
    ok(!c.items.some(t => /Christmas/.test(t)) && !c.shown, 'no Christmas line and the card stays hidden: ' + JSON.stringify(c));
  });

  await step('1 December: Christmas Day, in 24 days', async () => {
    await open(at('2026-12-01T14:00:00'));
    const c = await coming(p);
    ok(c.shown && c.items.includes('Christmas Day, in 24 days') && c.stamp, 'Coming up counts down, with the Christmas stamp: ' + JSON.stringify(c));
    ok(await geo(p) === before, 'the welcome, date line and Your day stay where they were: ' + before);
    ok(!/Christmas/.test(await p.evaluate(() => document.querySelector('#rtitle').textContent)), 'the welcome keeps its own words');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll at 390 px');
  });

  await step('the next Queensland day counts one less, with Home left open', async () => {
    await open(at('2026-12-01T23:59:30'));
    ok((await coming(p)).items.includes('Christmas Day, in 24 days'), '1 December, 23:59: 24 days');
    await p.clock.runFor(90000); await L.settle(p, 400);
    const c = await coming(p);
    ok(c.items.includes('Christmas Day, in 23 days'), 'after midnight: 23 days, without a reload: ' + JSON.stringify(c));
  });

  await step('17 and 18 December: the card’s own week takes over', async () => {
    await open(at('2026-12-17T14:00:00'));
    let c = await coming(p);
    ok(c.items.length === 2 && /^Christmas Eve, /.test(c.items[0]) && c.items[1] === 'Christmas Day, in 8 days', '17 December: Christmas Eve from its week, Christmas Day still counting: ' + JSON.stringify(c));
    await p.context().close();
    await open(at('2026-12-18T14:00:00'));
    c = await coming(p);
    ok(c.items.some(t => /^Christmas Day, /.test(t)) && !c.items.some(t => /in \d+ days/.test(t)), '18 December: the usual words, no count: ' + JSON.stringify(c));
  });

  await step('celebrations Off on this device: no countdown', async () => {
    await open(at('2026-12-01T14:00:00'), { seasonal: { selection: 'off' } });
    const c = await coming(p);
    ok(!c.items.length && !c.shown, 'Off: nothing in Coming up: ' + JSON.stringify(c));
  });

  await step('a tablet at 1280 px', async () => {
    await open(at('2026-12-01T14:00:00'), { width: 1280, height: 800 });
    const c = await coming(p);
    ok(c.shown && c.items.includes('Christmas Day, in 24 days'), 'the laptop and tablet say it too: ' + JSON.stringify(c));
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll at 1280 px');
  });

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
