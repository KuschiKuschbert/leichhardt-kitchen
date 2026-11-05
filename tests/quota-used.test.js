// Today's free reads used up (5 Nov 2026, the head chef's laptop). Firestore's free plan allows 50,000 reads a day and
// then refuses every read with resource-exhausted until midnight in California (18:00 kitchen time, 17:00 while
// California is on daylight saving). The pages said "Could not connect. Check the connection" or "Could not finish.
// Check the connection", so people checked the wifi. Now they say the reads are used up and when they come back.
const L = require('./lib');
const F = require('./supplier-fixtures');
const { R, ok } = L.results(), { txt } = L;
const BACK = /(17|18):00/;
// every list refused while the kitchen's settings and the sign-in still answer, like the reads running out after the
// book opened
const SPENT_LISTS = '^kitchens/[^/]+/(?!config/|login/|sessions/|pinset/|staffpins/|adminDevices/)';
const said = async p => ((await txt(p, 'main')) || '').replace(/\s+/g, ' ');
(async () => {
  const b = await L.start();

  // nothing can be read: the kitchen pages say so, with the time, not "Could not connect"
  let p = await L.open(b, '#/prep', { who: 'ann', exhausted: '^kitchens/', wait: 1500 });
  await L.waitFor(p, () => /free reads|Could not connect/.test(document.body.textContent), null, 10000).catch(() => {});
  let t = await said(p);
  ok(/used up today's free reads/.test(t) && BACK.test(t) && !/Could not connect/.test(t), 'nothing readable: the prep page says the free reads are used up and when they come back (' + t.slice(0, 200) + ')');
  ok(!!(await p.$('[data-p="retry"]')), 'nothing readable: Try again stays, for after the reset');
  ok(p.errors.length === 0 && !(await L.overflow(p)), 'nothing readable: no page errors, no sideways scroll ' + p.errors.join(' | '));
  await p.context().close();

  // the kitchen opens, then today's prep lines are refused: one line at the top says why the list is not there
  p = await L.open(b, '#/prep', { who: 'sam', exhausted: SPENT_LISTS, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('.quota-note'), null, 10000).catch(() => {});
  const note = ((await txt(p, '.quota-note')) || '').replace(/\s+/g, ' ');
  ok(/used up today's free reads/.test(note) && BACK.test(note) && /Nothing saved is lost/.test(note), 'a list refused: one line at the top says the reads are used up, when they come back, and that nothing is lost (' + note + ')');
  ok((await p.$$('.quota-note')).length === 1, 'the line shows once');
  await L.settle(p, 600);
  const page = ((await txt(p, 'body')) || '').replace(/\s+/g, ' '), wifi = page.match(/[^.]*Check the (connection|signal)[^.]*/);
  ok(!wifi, 'no line on the page sends people to check the wifi (' + (wifi ? wifi[0] : 'none') + ')');
  ok(p.errors.length === 0 && !(await L.overflow(p)), 'list refused: no page errors, no sideways scroll ' + p.errors.join(' | '));
  await p.context().close();

  // the same on a laptop, on the order list
  p = await L.open(b, '#/orders', { who: 'sam', exhausted: SPENT_LISTS, width: 1280, height: 900, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('.quota-note'), null, 10000).catch(() => {});
  ok(/used up today's free reads/.test((await txt(p, '.quota-note')) || '') && !(await L.overflow(p)), '1280 px order list: the line shows, no sideways scroll');
  await p.context().close();

  // Supplier order: the reason and the time, not "Check the connection"
  p = await L.open(b, '#/suppliers', { who: 'bo', extra: F.fixture(), exhausted: '/suppliers$', wait: 1800 });
  await L.waitFor(p, () => !!document.querySelector('.su-error'), null, 15000).catch(() => {});
  t = ((await txt(p, '.su-error')) || '').replace(/\s+/g, ' ');
  ok(/used up today's free reads/.test(t) && BACK.test(t) && !/Check the connection/.test(t) && /usual way/.test(t), 'Supplier order: the reads are used up, when they come back, and to order the usual way until then (' + t + ')');
  ok(p.errors.length === 0, 'Supplier order: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the time comes from California's midnight, worked out on the phone
  p = await L.open(b, '#/', { who: 'sam', wait: 800 });
  const back = await p.evaluate(() => { const T = window.LK_TIME; if (typeof T.quotaBack !== 'function') return ['missing']; const t0 = T.at('2026-11-05', 14 * 60), t1 = T.at('2026-07-05', 14 * 60), t2 = T.at('2026-11-05', 19 * 60); return [T.clock(T.quotaBack(t0)), T.day(T.quotaBack(t0)), T.clock(T.quotaBack(t1)), T.day(T.quotaBack(t2))]; });
  ok(JSON.stringify(back) === JSON.stringify(['18:00', '2026-11-05', '17:00', '2026-11-06']), 'reset: 18:00 in November, 17:00 in July, and after 18:00 the next day (' + back.join(', ') + ')');
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
