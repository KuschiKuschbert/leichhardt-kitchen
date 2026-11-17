// The New Year show (head chef, 17 Nov 2026; docs/seasonal-celebrations.md, The New Year show). On New Year's Eve and
// New Year's Day, when Home's arrival plays, Home's own pieces go off for about 7 seconds: card pins fire rockets, the
// mascot's star, the festival drawing, the Coming up stamp and the KB mark burst, the welcome bubble throws confetti,
// rockets cross the screen and a finale bursts over the board; the cards, bubble, mascot and icons dance meanwhile.
// It never takes a tap, sits below every sheet and pop-up, ends by itself, and every dancer ends where it started.
// Reduced motion, Still, Off, other celebrations, a hidden tab and leaving Home: none of it. Synthetic staff only.
const L = require('./lib');
const { R, ok } = L.results();
const at = s => Date.parse(s + '+10:00');
const NYE = at('2026-12-31T14:00:00'), MIDNIGHT = at('2026-12-31T23:59:30'), XMAS = at('2026-12-25T14:00:00');
const festive = { selection: 'auto', motion: 'gentle', density: 'festive' };
const realErrors = p => p.errors.filter(e => !/Failed to load resource/.test(e));
const show = p => p.evaluate(() => {
  const s = document.getElementById('kb-ny-show');
  const dancing = document.getAnimations().filter(a => a.effect && a.effect.composite === 'add' && a.playState !== 'finished' && a.playState !== 'idle');
  return { on: !!s, pieces: s ? +s.dataset.pieces : 0, z: s ? +getComputedStyle(s).zIndex : null, taps: s ? getComputedStyle(s).pointerEvents : '', hidden: s ? s.getAttribute('aria-hidden') : '',
    dancers: dancing.length, kinds: [...new Set(dancing.map(a => a.effect.target.matches('.mascot') ? 'mascot' : a.effect.target.matches('#rtitle') ? 'bubble' : a.effect.target.matches('.hm-board, .hm-paper, .kb-season-note') ? 'card' : 'icon'))].sort().join(','),
    bursts: document.querySelectorAll('#kb-festive-effects [data-ambient-motion="burst"]').length };
});
// Only transform and opacity move, in the show and the dance.
const light = p => p.evaluate(() => document.getAnimations().filter(a => a.effect && (a.effect.composite === 'add' || a.effect.target.closest('#kb-ny-show')))
  .every(a => a.effect.getKeyframes().every(k => Object.keys(k).every(x => ['transform', 'opacity', 'offset', 'easing', 'composite', 'computedOffset'].includes(x)))));
const rects = p => p.evaluate(() => [...document.querySelectorAll('.kb-season-note, .kb-home .hm-board, .kb-home .hm-paper, #rtitle, .mascot, .wtop button, .tabbar a')]
  .filter(e => e.getClientRects().length).map(e => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(v => Math.round(v * 10) / 10).join(','); }).join(' '));
const replay = p => p.evaluate(() => window.KB_THEME_BRIDGE.replay());
async function over(p) { await p.clock.runFor(9000); await L.settle(p, 300); }

(async () => {
  const b = await L.start(); let p = null;
  async function open(o) {
    p = await L.open(b, '#/', Object.assign({ who: 'ann', width: 390, height: 844, wait: 1200, server: o.clock, seasonal: festive }, o));
    await L.waitFor(p, () => !!document.querySelector('#rtitle'), null, 6000);
    return p;
  }
  async function step(label, task) {
    try { await task(); } catch (e) { ok(false, label + ': ' + String(e.message || e).split('\n')[0]); }
    finally { if (p) { ok(!realErrors(p).length, label + ': no browser errors ' + realErrors(p).join(' | ')); await p.context().close(); p = null; } }
  }

  await step('New Year’s Eve, the first Home view of the day', async () => {
    await open({ clock: NYE });
    await L.waitFor(p, () => !!document.getElementById('kb-ny-show'), null, 6000);
    ok((await show(p)).on, 'the show goes off by itself on the first Home view of the day');
    // Opening the page runs its clock on, so the rest is checked from a fresh Replay.
    await over(p); await replay(p); await L.settle(p, 150);
    const s = await show(p);
    ok(s.on && s.pieces >= 20, 'Replay: the whole show: ' + JSON.stringify(s));
    ok(s.z < 60 && s.taps === 'none' && s.hidden === 'true', 'it sits below every sheet and pop-up (60 and up), takes no tap and is hidden from a screen reader: ' + JSON.stringify([s.z, s.taps, s.hidden]));
    ok(s.bursts > 0, 'fireworks burst in the arrival behind the page too: ' + s.bursts);
    ok(s.dancers >= 10 && s.kinds === 'bubble,card,icon,mascot', 'the cards, the bubble, the mascot and the icons dance: ' + JSON.stringify([s.dancers, s.kinds]));
    ok(await light(p), 'only transform and opacity move');
    await over(p);
    const after = await show(p), r1 = await rects(p);
    ok(!after.on && !after.dancers, 'about 7 seconds later it has gone, and nothing still dances: ' + JSON.stringify(after));
    await replay(p); await L.settle(p, 200);
    ok((await show(p)).on, 'Replay plays it again');
    await p.clock.runFor(1500);
    ok(await rects(p) !== r1, 'mid-dance the pieces have moved');
    await over(p);
    ok(await rects(p) === r1, 'every card, the bubble, the mascot and every icon end exactly where they stood');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll at 390 px');
  });

  await step('a tap during the show reaches the page', async () => {
    await open({ clock: NYE }); await over(p);
    await replay(p); await L.settle(p, 300);
    const prep = await p.evaluate(() => { const a = [...document.querySelectorAll('.tabbar a[href="#/prep"]')].find(e => e.getClientRects().length); const r = a.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    ok((await show(p)).dancers > 0, 'the tab bar is dancing when tapped');
    await p.mouse.click(prep[0], prep[1]); await L.settle(p, 500);
    const s = await show(p);
    ok(await p.evaluate(() => location.hash) === '#/prep', 'the tap on Prep opens Prep');
    ok(!s.on && !s.dancers, 'leaving Home ends the show and the dance: ' + JSON.stringify(s));
  });

  await step('a hidden tab ends it', async () => {
    await open({ clock: NYE }); await over(p);
    await replay(p); await L.settle(p, 200);
    await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    await L.settle(p, 200);
    const s = await show(p);
    ok(!s.on && !s.dancers, 'a hidden tab stops the show and the dance: ' + JSON.stringify(s));
  });

  await step('midnight with Home left open', async () => {
    await open({ clock: MIDNIGHT, width: 1280, height: 800 }); await over(p);
    ok(!(await show(p)).on, 'New Year’s Eve at 23:59: the day’s show has ended');
    let s = null;
    for (let i = 0; i < 80; i++) { await p.clock.runFor(1000); s = await p.evaluate(() => ({ theme: window.KB_THEME_BRIDGE.status().themeId, on: !!document.getElementById('kb-ny-show') })); if (s.theme === 'au-new-years-day') break; }
    await L.settle(p, 200);
    const now = await show(p);
    ok(s.theme === 'au-new-years-day' && now.on, 'at midnight New Year’s Day goes off by itself on a screen left on Home: ' + JSON.stringify([s, now.pieces]));
    ok(now.pieces > 30, 'a wide screen gets the full show: ' + now.pieces);
  });

  await step('Christmas Day keeps its own arrival', async () => {
    await open({ clock: XMAS }); await L.settle(p, 600);
    const s = await show(p);
    ok(!s.on && !s.dancers && !s.bursts, 'no New Year show, dance or bursts on Christmas Day: ' + JSON.stringify(s));
  });

  await step('Still, celebrations Off and reduced motion', async () => {
    await open({ clock: NYE, seasonal: { ...festive, motion: 'still' } }); await L.settle(p, 600);
    let s = await show(p);
    ok(!s.on && !s.dancers, 'Still: no show and no dance: ' + JSON.stringify(s));
    await p.context().close();
    await open({ clock: NYE, seasonal: { selection: 'off' } }); await L.settle(p, 600);
    s = await show(p);
    ok(!s.on && !s.dancers, 'Off: no show and no dance: ' + JSON.stringify(s));
    await p.context().close();
    await open({ clock: NYE }); await over(p);
    await p.emulateMedia({ reducedMotion: 'reduce' });
    await p.evaluate(() => window.KB_THEME_BRIDGE.status()); await replay(p); await L.settle(p, 300);
    s = await show(p);
    ok(!s.on && !s.dancers, 'reduced motion: Replay plays no show and no dance: ' + JSON.stringify(s));
  });

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
