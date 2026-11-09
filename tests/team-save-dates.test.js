// The dated team Save must fit a narrow phone and keep its size until the server answers.
// These dates reproduce the two-digit Tuesday regression and longer Wednesday/month labels.
const L = require('./lib');
const { R, ok } = L.results();
const key = parts => ['kitchens', L.PIN].concat(parts).join('/');
const dates = [
  ['2026-11-10', 'Tuesday 10 November'],
  ['2026-11-11', 'Wednesday 11 November'],
  ['2026-09-30', 'Wednesday 30 September']
];
const fixture = (day, at) => ({
  [key(['config', 'main'])]: {
    people: [
      { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, active: true },
      { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, active: true }
    ],
    staffIds: ['sam', 'ann'], sousIds: ['sam'],
    kitSecs: [{ id: 'grill', name: 'Grill' }, { id: 'larder', name: 'Larder' }],
    kitShifts: [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }]
  },
  [key(['team', day])]: {
    day, on: [{ id: 'sam', sh: 'lunch', sec: 'larder' }, { id: 'ann', sh: 'lunch', sec: 'grill' }],
    br: [], v: 1, at: at - 3600000, upd: at - 3600000, by: 'sam'
  }
});
const button = p => p.evaluate(() => {
  const b = document.querySelector('[data-p="tm-save"]'), label = b.querySelector('.sv-now');
  const r = b.getBoundingClientRect(), text = label.getBoundingClientRect();
  return {
    text: b.textContent.trim(), disabled: b.disabled, busy: b.getAttribute('aria-busy'),
    done: !!b.querySelector('.ink-icon[data-state="done"]'),
    rect: { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height },
    fits: text.left >= r.left && text.right <= r.right && text.top >= r.top && text.bottom <= r.bottom,
    page: document.documentElement.scrollWidth, viewport: innerWidth
  };
});
const sameSize = (a, b) => a.rect.width === b.rect.width && a.rect.height === b.rect.height;
async function pause(p) {
  for (let i = 1; ; i++) {
    try { await p.clock.pauseAt(await p.evaluate(() => Date.now()) + 300 * i); return; }
    catch (e) { if (i > 4) throw e; }
  }
}

(async () => {
  const browser = await L.start();
  for (const [day, label] of dates) {
    const at = Date.parse(day + 'T14:00:00+10:00');
    const p = await L.open(browser, '#/team', { who: 'sam', width: 320, clock: at, extra: fixture(day, at), wait: 1200 });
    await L.waitFor(p, () => !!document.querySelector('[data-p="tm-save"]'), null, 6000);
    // Google Fonts are replaced in click tests. A wide fallback exposes the hidden Save-label sizing defect locally too.
    await p.addStyleTag({ content: ':root { --body: "DejaVu Sans", sans-serif; }' });
    await p.evaluate(() => document.documentElement.setAttribute('data-text', 'xlarge'));
    await L.settle(p, 150);
    const idle = await button(p);
    ok(idle.text === 'Save ' + label, day + ': Save names the full selected date (' + idle.text + ')');
    ok(idle.fits && idle.page <= idle.viewport && idle.rect.width >= 44 && idle.rect.height >= 44,
      day + ': the full date fits its 44 px target and the 320 px page at largest text (' + JSON.stringify(idle) + ')');

    await L.pick(p, 'select[data-k="tm-sec:sam"]', 'grill');
    await L.waitFor(p, () => !document.querySelector('[data-p="tm-save"]').disabled, null, 4000);
    const dirty = await button(p);
    await pause(p);
    await p.evaluate(() => { window.__fake.mode = 'hold'; });
    await L.tap(p, '[data-p="tm-save"]');
    await L.waitFor(p, () => document.querySelector('[data-p="tm-save"]').getAttribute('aria-busy') === 'true', null, 4000);
    const pending = await button(p);
    ok(pending.text === 'Saving...' && pending.disabled && !pending.done && sameSize(dirty, pending),
      day + ': pending Save keeps the dirty button dimensions (' + JSON.stringify({ dirty, pending }) + ')');

    await p.evaluate(() => window.__fake.ack());
    await L.settle(p, 150);
    const listener = await button(p);
    ok(listener.text === 'Saving...' && listener.busy === 'true' && !listener.done && sameSize(dirty, listener),
      day + ': a listener acknowledgement keeps Saving and the same dimensions (' + JSON.stringify(listener) + ')');

    await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
    await L.waitFor(p, () => !!document.querySelector('[data-p="tm-save"] .ink-icon[data-state="done"]'), null, 4000);
    const saved = await button(p);
    ok(saved.text === 'Saved' && saved.disabled && saved.busy === 'false' && sameSize(dirty, saved),
      day + ': server acknowledgement shows Saved at the same dimensions (' + JSON.stringify(saved) + ')');
    ok((await L.txt(p, '.tm-save') || '').includes('Team for ' + label + ' saved at '), day + ': acknowledgement names the saved date');
    await p.clock.runFor(1300);
    await L.waitFor(p, () => !document.querySelector('[data-p="tm-save"] .ink-icon[data-state="done"]'), null, 4000);
    const settled = await button(p);
    ok(settled.text === 'Save ' + label && settled.disabled && sameSize(dirty, settled),
      day + ': the dated idle label returns without resizing Save (' + JSON.stringify(settled) + ')');
    ok([dirty, pending, listener, saved, settled].every(s => s.fits && s.page <= s.viewport && s.rect.width >= 44 && s.rect.height >= 44),
      day + ': all Save states keep their text inside a 44 px target and the page');
    ok(p.errors.length === 0, day + ': no browser errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  await browser.close();
  L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
