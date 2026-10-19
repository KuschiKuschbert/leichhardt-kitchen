// The prep list's first screen on a phone (usability U9b): Start here is one line until tapped, a Done today button
// jumps to the ticked lines, and Quick add sits in the add box.
const L = require('./lib');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const extra = {};
extra[fsKey(['learned', 'mise-onions'])] = { text: 'Mise onions', uses: 6, typed: 6, secs: { larder: { name: 'Larder', n: 6 } }, dow: {} };
extra[fsKey(['learned', 'make-aioli'])] = { text: 'Make aioli', uses: 5, typed: 5, secs: { sauce: { name: 'Sauce', n: 5 } }, dow: {} };
const top = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top) : -1; }, sel);
(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/prep', { extra, wait: 1600 });
  ok(await p.$('details.nb-start-l:not([open])') !== null && /Portion rump/.test(await L.txt(p, 'details.nb-start-l summary') || ''), 'phone: Start here is one line naming the jobs');
  const first = await top(p, '.nb-rows li');
  ok(first > 0 && first < 560, 'phone: the first line starts higher up (' + first + ')');
  await L.tap(p, 'details.nb-start-l summary'); await p.waitForTimeout(200);
  ok(await p.$('details.nb-start-l[open] .nb-sb') !== null, 'phone: a tap opens Start here');
  ok(await p.$('.nb-qadd [data-p="quick"]') !== null, 'phone: Quick add sits in the add box');
  await L.tap(p, '[data-p="tick"][data-id="i1"]'); await p.waitForTimeout(400);
  ok(/Done today \(1\)/.test(await L.txt(p, '.nb-donejump') || ''), 'phone: a Done today (1) button shows by the count');
  ok(p.errors.length === 0, 'phone: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  p = await L.open(b, '#/prep', { extra, width: 1280, height: 900, wait: 1600 });
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.nb-qadd') || document.body).display) === 'none' || !(await p.$('.nb-qadd')), 'laptop: Quick add stays in Handy only');
  await p.context().close();
  await b.close();
  L.report(R);
})();
