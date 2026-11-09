// Top bar feedback keeps its targets still and respects touch, timer state and reduced motion.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const DAY = L.ymd(new Date(L.NOW)), CONFIG = key('config', 'main');
const team = {
  [CONFIG]: { ...L.seed()[CONFIG], kitSecs: [{ id: 'larder', name: 'Larder', off: false }], kitShifts: [{ id: 'day', name: 'Day', from: 600, to: 1320, off: false }] },
  [key('team', DAY)]: { day: DAY, v: 1, by: 'sam', at: L.NOW - 3600000, upd: L.NOW - 3600000, on: [{ id: 'ann', sh: 'day', sec: 'larder' }], br: [] }
};
const TEAM = '.wtop .tm-slot .tm-chip', CLOCK = '.cooling-chip';
const controls = [[TEAM, TEAM + ' > svg', 'team'], [CLOCK, CLOCK + ' .cooling-clock-drawing > svg', 'clock']];
const style = (p, sel) => p.$eval(sel, el => {
  const s = getComputedStyle(el), r = el.getBoundingClientRect();
  return { rotate: s.rotate, scale: s.scale, translate: s.translate, rect: [r.x, r.y, r.width, r.height] };
});
const still = s => s.rotate === 'none' && s.scale === 'none' && s.translate === 'none';
async function rotation(p, sel, value) {
  await L.waitFor(p, ({ sel, value }) => getComputedStyle(document.querySelector(sel)).rotate === value, { sel, value }, 2000).catch(() => {});
  return (await style(p, sel)).rotate === value;
}
async function phase(p, value) {
  await L.waitFor(p, value => document.querySelector('.cooling-clock')?.dataset.clockState === value, value);
  await L.settle(p, 450);
}
async function ready(p) { await phase(p, 'idle'); await L.waitFor(p, sel => !!document.querySelector(sel), TEAM); }
(async () => {
  const browser = await L.start(); let p;
  try {
    for (const who of ['sam', 'ann']) {
      p = await L.open(browser, '#/prep', { who, width: 1440, deviceMode: 'personal', extra: team, wait: 1200 }); await ready(p);
      ok(await p.$eval(TEAM, (el, who) => el.tagName === (who === 'sam' ? 'A' : 'BUTTON'), who), who + ': real chef link or staff button is present');
      for (const [control, icon, name] of controls) {
        const before = (await style(p, control)).rect;
        await p.hover(control);
        ok(await rotation(p, icon, '-8deg'), who + ': ' + name + ' tilts left on mouse hover');
        await p.mouse.down();
        ok(await rotation(p, icon, '-12deg'), who + ': ' + name + ' tilts further while pressed');
        ok(JSON.stringify((await style(p, control)).rect) === JSON.stringify(before), who + ': ' + name + ' target stays fixed during hover and press');
        await p.mouse.move(5, 200); await p.mouse.up();
        ok(await rotation(p, icon, 'none') && await p.evaluate(() => location.hash === '#/prep'), who + ': dragging off releases ' + name + ' without navigating');
      }
      await p.emulateMedia({ reducedMotion: 'reduce' });
      for (const [control, icon, name] of controls) {
        await p.hover(control); await p.mouse.down(); await L.settle(p, 250);
        ok(still(await style(p, icon)) && still(await style(p, control)), who + ': reduced motion keeps ' + name + ' still');
        await p.mouse.move(5, 200); await p.mouse.up();
      }
      await p.emulateMedia({ reducedMotion: 'no-preference' });
      if (who === 'sam') {
        await p.click(CLOCK); await phase(p, 'armed');
        await p.evaluate(() => { __fake.mode = 'hold'; }); await p.click(CLOCK); await phase(p, 'pending');
        const rect = await p.locator(CLOCK).boundingBox();
        await p.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2); await p.mouse.down(); await L.settle(p, 250);
        ok(await p.locator(CLOCK).isDisabled() && still(await style(p, controls[1][1])), 'pending: disabled clock stays still on hover and press');
        await p.mouse.up(); await p.evaluate(() => { __fake.mode = 'ok'; __fake.release(); }); await phase(p, 'first');
        const status = '.cooling-clock-status', drawing = status + ' .cooling-clock-drawing > svg';
        await p.hover(status); await p.mouse.down(); await L.settle(p, 250);
        ok(still(await style(p, drawing)) && still(await style(p, status + ' .cooling-clock-progress')), 'running: read-only clock and progress stay still on hover and press');
        ok(!await p.locator(CLOCK).isVisible(), 'running: feedback never exposes the hidden action');
        await p.mouse.up();
      }
      ok(!p.errors.length && !await L.overflow(p), who + ': desktop has no page errors or sideways scroll');
      await p.context().close(); p = null;
    }
    p = await L.open(browser, '#/prep', { who: 'ann', width: 390, touch: true, deviceMode: 'personal', extra: team, wait: 1200 }); await ready(p);
    const touch = await p.context().newCDPSession(p);
    await touch.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    for (const [control, icon, name] of controls) {
      const rect = await p.locator(control).boundingBox(), point = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
      ok(await rotation(p, icon, '-12deg'), 'touch: ' + name + ' tilts while held');
      await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
      ok(await rotation(p, icon, 'none') && !await p.$('.is-pressed'), 'touch: cancellation releases ' + name);
      ok(await p.evaluate(() => location.hash === '#/prep' && document.querySelector('.cooling-clock').dataset.clockState === 'idle'), 'touch: cancelled ' + name + ' press performs no action');
      await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
      await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      ok(await rotation(p, icon, 'none') && !await p.$('.is-pressed'), 'touch: release leaves no sticky ' + name + ' tilt');
      await p.keyboard.press('Escape'); await phase(p, 'idle');
    }
    ok(!p.errors.length && !await L.overflow(p), 'touch: no page errors or sideways scroll');
  } finally { if (p) await p.context().close(); await browser.close(); }
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
