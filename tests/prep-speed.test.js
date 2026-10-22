// Faster prep ticking (usability U10, head chef decision D5): a tap on a line's words ticks it, the box is bigger,
// the add box goes Line, Section, Amount in that order, "Add 2 tubs" adds in one tap, and unsent lines say so.
const L = require('./lib');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW));
const extra = {}; extra[fsKey(['learned', 'mise-onions'])] = { text: 'Mise onions', uses: 6, typed: 6, secs: { larder: { name: 'Larder', n: 6 } }, dow: {}, qtys: { '2-tubs': { q: '2 tubs', n: 4 } } };
const item = (p, id) => p.evaluate(k => window.__fake.dump()[k] || {}, fsKey(['days', today, 'items', id]));
(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/prep', { extra, wait: 1600 });
  await p.click('#nbr-i2 .nb-tt'); await L.settle(p, 400);
  ok((await item(p, 'i2')).done === true, 'a tap on the words ticks the line');
  ok(/Ticked/.test(await L.txt(p, '.p-toast') || ''), 'and says Ticked, with Undo');
  await p.click('#nbr-i3 .nb-star'); await L.settle(p, 300);
  ok(!(await item(p, 'i3')).done, 'a tap on ! does not tick the line');
  ok(await p.evaluate(() => Math.round(document.querySelector('.nb-box svg').getBoundingClientRect().width)) >= 32, 'the tick box is drawn bigger');
  await p.focus('#p-text'); await p.keyboard.press('Tab');
  ok(await p.evaluate(() => document.activeElement.id) === 'p-section', 'Tab from the line goes to Section, as it shows');
  ok(await p.getAttribute('#p-text', 'autocapitalize') === 'sentences', 'the line starts with a capital on a phone keyboard');
  await p.fill('#p-text', 'Mise onions'); await L.settle(p, 300);
  // a locator, not a handle: the add box can redraw between finding the chip and tapping it
  const chip = p.locator('[data-p="qset"]').first();
  const has = await chip.count() > 0;
  ok(has && /Add 2 tubs/.test(await chip.textContent()), 'the usual amount chip says Add 2 tubs');
  // the chip to the middle of the screen first, as a person would: a toast at the bottom takes the taps under it
  if (has) { await chip.evaluate(e => e.scrollIntoView({ block: 'center' })); await L.settle(p, 100); await chip.click(); await L.settle(p, 400); }
  ok(await p.evaluate(a => Object.values(window.__fake.dump()).some(v => v && v.text === 'Mise onions' && v.qty === '2 tubs'), today), 'one tap adds Mise onions, 2 tubs');
  // no signal: the line shows Not sent until the write goes through
  await p.evaluate(() => { window.__fake.mode = 'hold'; });
  await L.tap(p, '[data-p="tick"][data-id="i6"]'); await L.settle(p, 400);
  await p.evaluate(() => { window.__fake.mode = 'ok'; });
  await p.click('.nb-tab[data-v=""]', { timeout: 2000 }).catch(() => {});
  ok(/Not sent/.test(await p.evaluate(() => document.body.textContent)), 'an unsent tick shows Not sent');
  await p.evaluate(() => window.__fake.release()); await L.settle(p, 400);
  ok(!/Not sent/.test(await p.evaluate(() => [...document.querySelectorAll('.nb-unsent')].map(e => e.textContent).join(''))), 'Not sent goes once it is sent');
  ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
  // one redraw for a tick (22 Oct 2026): the change and its toast used to draw the whole list twice inside the tap
  await L.settle(p, 3800);
  const draws = await p.evaluate(() => {
    const root = document.getElementById('prep-root');
    const mo = new MutationObserver(() => {});
    mo.observe(root, { childList: true });
    document.querySelector('.nb-row:not(.is-done) [data-p="tick"]').click();
    // each full redraw replaces the page's contents: one childList record on the root per redraw, read before the tap ends
    const n = mo.takeRecords().filter(r => r.target === root && r.removedNodes.length).length; mo.disconnect();
    return n;
  });
  ok(draws <= 1, 'a tick redraws the list once inside the tap (' + draws + ')');
  await p.context().close();
  await b.close();
  L.report(R);
})();
