// The phone's Back button and the guide page opened big (usability U8): Back closes the big page and the pings popup
// instead of leaving the page, closing them any other way leaves Back working as before, a swipe turns the page, and
// on a phone the page buttons sit at the bottom.
const L = require('./lib');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW));
const big = p => p.locator('.gz-wrap').count();
(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/guides', { extra: L.guides(), wait: 1200 });
  await p.click('.g-card[href="#/guides/combi"]'); await L.settle(p, 800);
  ok(/2 pages\./.test(await p.locator('.g-pages .hint').innerText()), 'guide: says how many pages');
  await p.click('[data-p="g-zoom"][data-i="0"]'); await L.settle(p, 300);
  ok(await big(p) === 1 && await p.locator('.gz-foot [data-gz="next"]').isVisible(), 'phone: Previous and Next sit at the bottom');
  // a swipe to the left turns to page 2
  await p.mouse.move(300, 450); await p.mouse.down(); await p.mouse.move(120, 455, { steps: 5 }); await p.mouse.up();
  await L.settle(p, 200);
  ok(/Page 2 of 2/.test(await p.locator('.gz-t').innerText()), 'swipe left: page 2');
  // Back closes the big page and stays on the guide
  await p.goBack(); await L.settle(p, 400);
  ok(await big(p) === 0 && await p.evaluate(() => location.hash) === '#/guides/combi', 'Back: closes the big page, the guide stays open');
  // closed with Close, Back then goes back as before
  await p.click('[data-p="g-zoom"][data-i="0"]'); await L.settle(p, 300);
  await p.click('[data-gz="close"]'); await L.settle(p, 400);
  ok(await big(p) === 0 && await p.evaluate(() => location.hash) === '#/guides/combi', 'Close: closes it');
  await p.goBack(); await L.settle(p, 500);
  ok(await p.evaluate(() => location.hash) === '#/guides', 'after Close, Back goes back to the guides list');
  ok(p.errors.length === 0, 'guides: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // pings: Back closes the popup and it stays unread
  const note = {}; note[fsKey(['notes', 'n1'])] = { text: 'Safety: fryer 2 is out', tag: 'safety', start: today, until: today, dows: [], removed: false, at: 1, by: 'sam' };
  p = await L.open(b, '#/prep', { extra: note, wait: 2000 });
  ok(await p.$('.nt') !== null, 'pings: the popup opens');
  await p.goBack(); await L.settle(p, 400);
  ok(await p.$('.nt') === null && await p.evaluate(() => location.hash) === '#/prep', 'pings: Back closes the popup and stays on the prep list');
  ok(!(await p.evaluate(() => localStorage.getItem('lk.note.seen'))), 'pings: Back does not mark them read');
  ok(p.errors.length === 0, 'pings: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})();
