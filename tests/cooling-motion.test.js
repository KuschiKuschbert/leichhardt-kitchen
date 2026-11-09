// Approved B desktop pill and fixed mobile ring, through real app/session/controller code and fake Firestore.
const L = require('./lib');
const { R, ok } = L.results();
const CURRENT = ['kitchens', L.PIN, 'cooling', 'current'].join('/'), HOUR = 3600000;
const CONFIG = ['kitchens', L.PIN, 'config', 'main'].join('/'), DAY = L.ymd(new Date(L.NOW));
const TOMORROW = L.ymd(new Date(L.NOW + 24 * HOUR));
// Keep the real fourth header control present through both stages, with Cleaning's sixth page tab enabled.
const team = {
  [CONFIG]: { ...L.seed()[CONFIG], staffIds: ['sam', 'ann', 'bo'], kitSecs: [{ id: 'larder', name: 'Larder', off: false }], kitShifts: [{ id: 'day', name: 'Day', from: 600, to: 1320, off: false }] },
  [['kitchens', L.PIN, 'team', DAY].join('/')]: { day: DAY, v: 1, by: 'sam', at: L.NOW - HOUR, upd: L.NOW - HOUR, on: [{ id: 'ann', sh: 'day', sec: 'larder' }], br: [] },
  // The morning journey already has tomorrow's section, so its ordinary daily picker cannot cover Start.
  [['kitchens', L.PIN, 'shifts', TOMORROW + '_ann'].join('/')]: { day: TOMORROW, sec: 'larder', name: 'Larder', at: L.NOW + 10 * HOUR, auto: false, sh: 'day' }
};
const millis = value => value && (value.__fakeTimestamp != null ? value.__fakeTimestamp : value.seconds * 1000 + (value.nanoseconds || 0) / 1000000);
const saved = p => p.evaluate(path => __fake.dump()[path], CURRENT);
const writes = p => p.evaluate(path => __fake.writes.flat().filter(x => x.path === path), CURRENT);
async function phase(p, value) {
  await L.waitFor(p, value => document.querySelector('.cooling-clock')?.dataset.clockState === value, value, 10000);
  await L.settle(p, 450);
}
async function advance(p, at) {
  const before = await p.evaluate(() => LK_TIME.now());
  await p.clock.fastForward(Math.max(0, Math.ceil(at - before)));
  await p.evaluate(() => window.dispatchEvent(new Event('lk-clock')));
}
async function clockTap(p) { await p.locator('button[data-cooling="clock"]:visible').click(); }
async function fonts(p) {
  await p.context().unroute(/fonts\.(googleapis|gstatic)\.com/);
  const css = await p.addStyleTag({ url: 'https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700&family=Barlow+Condensed:wght@700&display=swap' }).then(() => true, () => false);
  const loaded = !!css && await p.evaluate(() => Promise.race([
    Promise.all(['600 16px Barlow', '700 16px "Barlow Condensed"'].map(f => document.fonts.load(f))).then(all => all.every(loaded => loaded.length)),
    new Promise(resolve => setTimeout(() => resolve(false), 8000))
  ]));
  if (loaded) await p.evaluate(() => document.fonts.ready);
  return loaded;
}
async function shape(p) {
  return p.evaluate(() => {
    const rect = el => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; };
    const control = [...document.querySelectorAll('.cooling-clock button, .cooling-clock-status')].find(el => getComputedStyle(el).visibility !== 'hidden' && !el.hidden && el.getClientRects().length);
    const nav = document.querySelector('.tabbar'), dock = document.querySelector('.wk-dock');
    const limit = Math.min(nav && nav.getBoundingClientRect().height ? nav.getBoundingClientRect().top : innerHeight, dock && getComputedStyle(dock).position === 'fixed' ? dock.getBoundingClientRect().top : innerHeight);
    const fullyVisible = el => {
      const r = el.getBoundingClientRect(); let top = 0, bottom = limit;
      for (let parent = el.parentElement; parent; parent = parent.parentElement) {
        if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(parent).overflowY)) { const box = parent.getBoundingClientRect(); top = Math.max(top, box.top); bottom = Math.min(bottom, box.bottom); }
      }
      return r.height > 0 && r.top >= top && r.bottom <= bottom;
    };
    return { control: rect(control), header: rect(document.querySelector('.wtop')), brand: rect(document.querySelector('.wtop-brand')),
      peers: [...document.querySelectorAll('.wtop-back, .wtop .tm-slot .tm-chip, .wtop .nbell, .wtop .wtop-who')].filter(el => el.getClientRects().length).map(rect),
      tabs: [...document.querySelectorAll('.wtop .pnav a')].map(rect),
      rows: [...document.querySelectorAll('.nb-row')].map(rect), fullRows: [...document.querySelectorAll('.nb-row')].filter(fullyVisible).length,
      expanded: document.querySelector('.cooling-clock').dataset.clockState, hasDialog: !!document.querySelector('.cooling-wrap') };
  });
}
function sameLayout(a, b) { return JSON.stringify([a.header, a.peers, a.tabs, a.rows, a.fullRows]) === JSON.stringify([b.header, b.peers, b.tabs, b.rows, b.fullRows]); }
function controlsFit(a, width) {
  const controls = [a.control, ...a.peers];
  return controls.every(r => r[2] >= 44 && r[3] >= 44 && r[0] >= 0 && r[0] + r[2] <= width) && controls.every((r, i) => controls.slice(i + 1).every(s => r[0] + r[2] <= s[0] + .5 || s[0] + s[2] <= r[0] + .5));
}
(async () => {
  const browser = await L.start(); let p;
  async function step(label, fn) {
    try { await fn(); }
    catch (e) { ok(false, label + ': ' + String(e.message || e).split('\n')[0]); }
    finally { if (p) { ok(!p.errors.length, label + ': no browser errors ' + p.errors.join(' | ')); await p.context().close(); p = null; } }
  }
  try {
    for (const width of [390, 768, 1200, 1280]) await step('clock states ' + width, async () => {
      p = await L.open(browser, '#/prep', { who: 'ann', width, clock: L.NOW - 3 * HOUR, deviceMode: 'personal', extra: team, wait: 1200 }); await phase(p, 'idle');
      await L.waitFor(p, () => !!document.querySelector('.wtop .tm-slot .tm-chip'));
      const realFonts = await fonts(p); await L.settle(p, 400);
      if (!realFonts) ok(true, width + ': real Barlow unavailable; width-sensitive navigation checks skipped');
      const baseline = await shape(p), mobile = width < 1280;
      ok(baseline.control[2] === 44 && baseline.control[3] === 44, width + ': idle clock has a 44px target');
      ok(await p.locator('.wtop .tm-slot .tm-chip').isVisible() && controlsFit(baseline, width), width + ': clock, Team, bell and chef controls fit together without overlap');
      if (realFonts && width >= 720) ok(baseline.tabs.length === 6 && baseline.tabs.every(r => r[1] === baseline.tabs[0][1] && r[3] === 44), width + ': all six page tabs stay on one row with Team and the clock in Barlow ' + JSON.stringify(baseline.tabs));
      await p.locator('button[data-cooling="clock"]').evaluate(el => { window.__clockButton = el; });
      await clockTap(p); await phase(p, 'armed');
      let drawn = await shape(p);
      ok((await writes(p)).length === 0 && !drawn.hasDialog, width + ': first tap only reveals Start in place, with no write or dropdown');
      ok(drawn.control[2] === (mobile ? 44 : 152) && drawn.control[3] === 44, width + ': armed control keeps the chosen phone circle or desktop pill');
      ok(sameLayout(baseline, drawn) && controlsFit(drawn, width), width + ': arming leaves the header, peers and prep lines still without overlap');
      if (mobile) ok(JSON.stringify(baseline.brand) === JSON.stringify(drawn.brand) && await p.locator('.wtop-brand').evaluate(el => getComputedStyle(el).opacity === '1'), width + ': mobile brand is never displaced or faded');
      await p.keyboard.press('Escape'); await phase(p, 'idle');
      ok((await writes(p)).length === 0, width + ': Escape disarms without starting a batch');
      await p.locator('button[data-cooling="clock"]').focus(); await p.keyboard.press('Enter'); await phase(p, 'armed');
      await p.evaluate(() => { __fake.mode = 'hold'; });
      await p.keyboard.press('Space'); await phase(p, 'pending');
      ok(await p.locator('button[data-cooling="clock"]').evaluate(el => el === window.__clockButton && el.disabled && el.getAttribute('aria-busy') === 'true'), width + ': keyboard start preserves its button and waits visibly for acknowledgement');
      await L.waitFor(p, path => __fake.writes.flat().some(x => x.path === path), CURRENT);
      ok((await writes(p)).length === 1 && await p.locator('.cooling-clock-status:visible').count() === 0, width + ': pending has one write and no confirmed running readout');
      await p.locator('button[data-cooling="clock"]').evaluate(el => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      await p.evaluate(() => __fake.ack()); await L.settle(p, 150);
      ok((await writes(p)).length === 1 && await p.locator('.cooling-clock').getAttribute('data-clock-state') === 'pending', width + ': repeated tap or listener acknowledgement alone cannot finish a pending start');
      await p.evaluate(() => { __fake.mode = 'ok'; __fake.release(); }); await phase(p, 'first');
      const first = await saved(p), firstAt = millis(first.firstAt), firstDue = firstAt + 2 * HOUR;
      ok(first.rev === 1 && first.secondAt === 0 && await p.locator('button[data-cooling="clock"]:visible').count() === 0 && await p.locator('.cooling-clock-status').getAttribute('aria-live') === 'off', width + ': accepted running timer is read-only and does not announce every countdown tick');
      drawn = await shape(p);
      ok(drawn.control[2] === (mobile ? 44 : 152) && sameLayout(baseline, drawn) && controlsFit(drawn, width), width + ': running has the selected footprint without moving list lines or overlapping Team');
      const beforeProgress = await p.locator('.cooling-clock-status').innerHTML();
      await advance(p, firstAt + HOUR); await phase(p, 'first');
      ok(await p.locator('.cooling-clock-status').innerHTML() !== beforeProgress && (await writes(p)).length === 1, width + ': the ring/countdown advances locally without more shared writes');
      ok(await p.locator('.cooling-clock-status').evaluate((host, mobile) => {
        const ring = host.querySelector('.cooling-clock-ring'), face = host.querySelector('.cooling-clock-sector');
        return mobile ? getComputedStyle(ring).display !== 'none' && Math.abs(parseFloat(ring.style.strokeDashoffset) - 50) < 1 && getComputedStyle(face).display === 'none'
          : getComputedStyle(face).display !== 'none' && !!face.getAttribute('d') && getComputedStyle(ring).display === 'none';
      }, mobile), width + ': halfway progress uses the chosen perimeter ring on mobile or filling face on desktop');
      if (!mobile) ok(/1:00:0\d|0:59:5\d/.test(await p.locator('.cooling-clock-status').textContent()), 'Desktop keeps a numeric countdown in its pill');
      await p.evaluate(() => { location.hash = '#/orders'; });
      await L.waitFor(p, () => !!document.querySelector('.ob') || location.hash === '#/orders' && document.querySelector('.cooling-clock')?.dataset.clockState === 'first');
      await phase(p, 'first');
      ok(await p.locator('.cooling-clock-status').isVisible() && await p.locator('button[data-cooling="clock"]:visible').count() === 0, width + ': route redraw paints the current running state immediately');
      await p.evaluate(() => { location.hash = '#/prep'; }); await phase(p, 'first');
      // A spoken alarm is delivered only when the corresponding screen ping can open.
      await p.evaluate(() => { window.__coolingSounds = 0; const original = LK_CHIME.playCooling; LK_CHIME.playCooling = function () { window.__coolingSounds++; return original ? original.apply(this, arguments) : true; }; });
      await advance(p, firstDue + 1000); await phase(p, 'record');
      await L.waitFor(p, () => !!document.querySelector('.cooling-ping'));
      ok(await p.getByText('Operandio batch cooling time 2 hours is done.', { exact: true }).isVisible() && await p.evaluate(() => __coolingSounds === 1), width + ': first completion shows the named ping and invokes one three-chime sequence');
      await p.getByRole('button', { name: 'Not yet', exact: true }).click();
      await advance(p, firstDue + HOUR); await phase(p, 'record');
      ok((await saved(p)).secondAt === 0 && (await writes(p)).length === 1 && await p.evaluate(() => __coolingSounds === 1), width + ': waiting an extra hour never starts four hours or repeats the alert');
      drawn = await shape(p);
      ok(drawn.control[2] === (mobile ? 44 : 152) && drawn.control[3] === 44 && sameLayout(baseline, drawn) && controlsFit(drawn, width), width + ': quiet unrecorded check retains its footprint, Team control and prep positions');
      ok(/needs recording/.test(await p.locator('button[data-cooling="clock"]').getAttribute('aria-label')), width + ': quiet clock names the outstanding external check');
      await clockTap(p);
      await L.waitFor(p, () => !!document.querySelector('.cooling-menu [data-confirm-stage="2"]'));
      await p.locator('[data-confirm-stage="2"]').click(); await phase(p, 'done1');
      ok(await p.locator('.cooling-record .lk-stamp').count() === 1 && (await saved(p)).secondAt === 0, width + ': recording two hours leaves its stamp without starting four hours');
      await p.keyboard.press('Escape');
      ok(/Start.*4.hour/i.test(await p.locator('button[data-cooling="clock"]').getAttribute('aria-label')), width + ': confirmed first check exposes the separate four-hour start');
      await clockTap(p); await phase(p, 'second');
      const second = await saved(p), secondAt = millis(second.secondAt);
      ok(second.rev === 2 && secondAt >= firstDue + HOUR && millis(second.firstAt) === firstAt && (await writes(p)).length === 2, width + ': only the explicit green-clock tap starts a further four hours');
      await advance(p, secondAt + 4 * HOUR + 1000); await phase(p, 'record');
      await L.waitFor(p, () => !!document.querySelector('.cooling-ping'));
      ok(await p.evaluate(() => __coolingSounds === 2), width + ': second completion invokes one further three-chime sequence');
      await p.getByRole('button', { name: 'I’ve recorded this in Operandio', exact: true }).click(); await phase(p, 'done2');
      ok(await p.locator('button[data-cooling="clock"]:visible').count() === 0 && /disabled until tomorrow/.test(await p.locator('.cooling-clock-status').getAttribute('aria-label')), width + ': completed clock is read-only and explains tomorrow’s reset');
      drawn = await shape(p);
      ok(sameLayout(baseline, drawn) && controlsFit(drawn, width), width + ': the completed lockout keeps the same prep rows and header positions');
      await p.locator('.cooling-clock-status').click();
      ok((await writes(p)).length === 2 && (await saved(p)).run === first.run, width + ': tapping the completed clock cannot arm or write a fresh batch');
      const cutoff = L.NOW + 7 * HOUR, unlock = L.NOW + 20 * HOUR;
      await p.clock.pauseAt(cutoff - 1);
      await p.evaluate(() => window.dispatchEvent(new Event('lk-clock')));
      ok(await p.locator('.cooling-clock').getAttribute('data-clock-state') === 'done2', width + ': completed batch remains locked just before 21:00');
      await advance(p, cutoff); await phase(p, 'off_hours');
      ok((await writes(p)).length === 2 && !await p.locator('.cooling-wrap').count(), width + ': 21:00 resets the presentation without a write or popup');
      drawn = await shape(p);
      ok(drawn.control[2] === (mobile ? 44 : 152) && sameLayout(baseline, drawn) && controlsFit(drawn, width), width + ': overnight status preserves the phone ring, desktop pill and all prep positions');
      ok(/10:00 Queensland/.test(await p.locator('.cooling-clock-status').getAttribute('aria-label')) && await p.locator('.cooling-clock-status').getAttribute('aria-disabled') === 'true', width + ': overnight status names 10:00 and is disabled');
      await p.locator('.cooling-clock-status').click(); await p.locator('.cooling-clock-status').focus(); await p.keyboard.press('Enter'); await p.keyboard.press('Space');
      await p.locator('button[data-cooling="clock"]').evaluate(el => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      ok((await writes(p)).length === 2 && !await p.locator('.cooling-wrap').count(), width + ': mouse, keyboard and synthetic taps do nothing overnight');
      // A fresh authorised morning session exercises the 10:00 boundary independently of the 04:00 PIN lock.
      await p.context().close();
      p = await L.open(browser, '#/prep', { who: 'ann', width, clock: unlock - 60000, deviceMode: 'personal', extra: { ...team, [CURRENT]: second }, wait: 1200 });
      await phase(p, 'off_hours'); await fonts(p);
      ok((await writes(p)).length === 0 && !await p.locator('.cooling-ping').count(), width + ': a morning login keeps yesterday’s record quiet');
      await p.clock.pauseAt(unlock - 1); await p.evaluate(() => window.dispatchEvent(new Event('lk-clock')));
      ok(await p.locator('.cooling-clock').getAttribute('data-clock-state') === 'off_hours', width + ': the final millisecond before 10:00 stays inert');
      await advance(p, unlock); await phase(p, 'idle');
      ok((await writes(p)).length === 0 && !await p.locator('.cooling-wrap').count() && (await saved(p)).run === first.run, width + ': 10:00 restores idle without starting a batch, replaying alerts or deleting the raw record');
      await p.clock.resume();
      await L.waitFor(p, day => {
        const section = JSON.parse(localStorage.getItem('lk.sec.ann') || 'null');
        return section && section.d === day && section.sec === 'larder';
      }, TOMORROW);
      await clockTap(p); await phase(p, 'armed');
      ok((await writes(p)).length === 0 && (await saved(p)).run === first.run, width + ': first new-batch tap arms without changing the previous record');
      await clockTap(p); await phase(p, 'first');
      ok((await saved(p)).run !== first.run && (await saved(p)).secondAt === 0 && (await writes(p)).length === 1, width + ': the second new-batch tap starts exactly one fresh two-hour timer');
      if (realFonts) ok(!await L.overflow(p), width + ': chosen clock fits the native-font header without sideways scroll');
      await p.emulateMedia({ reducedMotion: 'reduce' });
      ok(await p.locator('.cooling-clock-status').evaluate(el => getComputedStyle(el).animationName === 'none' && getComputedStyle(el).transitionDuration.split(',').every(v => parseFloat(v) === 0)), width + ': Reduce motion keeps status while removing decorative motion');
    });
    for (const width of [390, 768, 1280]) await step('idle overnight boundary ' + width, async () => {
      const cutoff = L.NOW + 7 * HOUR;
      p = await L.open(browser, '#/prep', { who: 'ann', width, touch: true, clock: cutoff - 60000, deviceMode: 'personal', extra: team, wait: 1200 });
      await phase(p, 'idle'); await fonts(p); await L.settle(p, 400);
      const before = await shape(p);
      await p.clock.pauseAt(cutoff - 1); await p.evaluate(() => window.dispatchEvent(new Event('lk-clock')));
      ok(await p.locator('.cooling-clock').getAttribute('data-clock-state') === 'idle', width + ': unused timer stays idle until the final millisecond before 21:00');
      await advance(p, cutoff);
      const motion = await p.locator('.cooling-clock-status').evaluate(el => ({ transition: getComputedStyle(el).transitionProperty, duration: getComputedStyle(el).transitionDuration, animations: el.getAnimations().map(a => a.transitionProperty) }));
      if (width >= 1280) ok(motion.transition.includes('width') && motion.duration.includes('0.34s') && motion.animations.includes('width'), width + ': the overnight pill expands with the existing 340ms width animation');
      await phase(p, 'off_hours');
      const after = await shape(p);
      ok(before.control[2] === 44 && after.control[2] === (width < 1280 ? 44 : 152) && after.control[3] === 44 && sameLayout(before, after) && controlsFit(after, width), width + ': overnight expansion preserves the header, visible prep lines and every adjacent 44px target');
      if (width >= 1280) ok(await p.locator('.cooling-clock-status strong').evaluate(el => { const r = el.getBoundingClientRect(), host = el.closest('.cooling-clock-control').getBoundingClientRect(); return el.textContent === 'Back at 10:00' && r.left >= host.left && r.right <= host.right && r.top >= host.top && r.bottom <= host.bottom; }), width + ': the complete Back at 10:00 label fits the expanded native-font pill');
      await p.locator('.cooling-clock-status').tap();
      ok((await writes(p)).length === 0 && !await p.locator('.cooling-wrap').count(), width + ': tapping the overnight clock leaves it inert');
      await p.locator('[data-p="write"]').click(); await L.waitFor(p, () => !!document.querySelector('.p-sheet #p-text'));
      ok(await p.locator('.p-sheet #p-text').isVisible(), width + ': Add a line still opens in one tap overnight');
      await p.keyboard.press('Escape');
      await p.emulateMedia({ reducedMotion: 'reduce' });
      ok(await p.locator('.cooling-clock-status').evaluate(el => getComputedStyle(el).animationName === 'none' && getComputedStyle(el).transitionDuration.split(',').every(v => parseFloat(v) === 0)), width + ': reduced motion removes the overnight expansion without hiding the status');
    });
    await step('clock read failure and retry', async () => {
      p = await L.open(browser, '#/prep', { who: 'ann', wait: 1200 }); await phase(p, 'idle');
      await clockTap(p); await phase(p, 'armed'); await p.evaluate(() => { __fake.mode = 'deny'; }); await clockTap(p); await phase(p, 'error');
      ok(!await saved(p) && /Operandio/.test(await p.locator('button[data-cooling="clock"]').getAttribute('aria-label')), 'Refused inline start does not claim success and retains named error state');
      await L.waitFor(p, () => !!document.querySelector('.cooling-menu .cooling-error'));
      ok(await p.locator('.cooling-menu [role="alert"]').isVisible(), 'Refused inline start opens readable error detail and explicit retry');
      await p.evaluate(() => { __fake.mode = 'ok'; });
      await p.getByRole('button', { name: 'Try again: start Operandio 2-hour timer' }).click(); await phase(p, 'first');
      ok((await saved(p)).rev === 1, 'Only explicit retry starts the refused first stage');
      await p.keyboard.press('Escape');
      await L.notYou(p); await L.waitFor(p, () => !LK_PREP.privateAccess());
      ok(await p.locator('.cooling-clock:visible').count() === 0, 'Changing person removes the previous private timer display');
    });
    await step('clock cached empty read', async () => {
      p = await L.open(browser, '#/prep', { who: 'ann', cold: '/cooling/current$', wait: 1200 });
      await L.waitFor(p, () => !!document.querySelector('.cooling-clock'));
      await clockTap(p); await L.waitFor(p, () => !!document.querySelector('.cooling-menu'));
      ok(await p.locator('.cooling-menu [data-stage="2"]').isDisabled() && (await writes(p)).length === 0, 'Cached empty clock opens connection details without offering a start');
      await p.evaluate(() => __fake.warm()); await L.waitFor(p, () => !document.querySelector('.cooling-menu [data-stage="2"]').disabled);
      await p.keyboard.press('Escape'); await phase(p, 'idle');
      ok((await writes(p)).length === 0, 'Reconnecting restores idle without replaying the earlier tap');
    });
  } finally { if (p) await p.context().close(); await browser.close(); }
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
