// The prep list's section box after a line is added (usability U2): a section the book filled in is cleared, so the
// next line goes to its own usual section; a section the person typed stays for the next line.
const L = require('./lib');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const extra = {};
extra[fsKey(['learned', 'pick-mint'])] = { text: 'Pick mint', uses: 3, typed: 3, secs: { larder: { name: 'Larder', n: 3 } }, dow: {} };
extra[fsKey(['learned', 'make-aioli'])] = { text: 'Make aioli', uses: 5, typed: 5, secs: { sauce: { name: 'Sauce', n: 5 } }, dow: {} };
const today = L.ymd(new Date(L.NOW));
const stationOf = (p, text) => p.evaluate(a => { const s = window.__fake.dump(), k = Object.keys(s).filter(k => k.indexOf('/days/' + a.d + '/items/') > 0 && s[k].text === a.t && !s[k].deleted)[0]; return k ? s[k].station : null; }, { d: today, t: text });
async function add(p, text) { await p.fill('#p-text', text); await p.press('#p-text', 'Enter'); await L.settle(p, 350); }
const box = p => p.inputValue('#p-section');
(async () => {
  const b = await L.start();
  const p = await L.open(b, '#/prep', { wait: 1500, extra });

  await add(p, 'Pick mint');
  ok(await stationOf(p, 'Pick mint') === 'Larder', 'learned: Pick mint goes under its usual Larder');
  ok(await box(p) === '', 'learned: the section box is empty again (' + JSON.stringify(await box(p)) + ')');
  await add(p, 'Make aioli');
  ok(await stationOf(p, 'Make aioli') === 'Sauce', 'learned: Make aioli next goes under Sauce, not Larder (' + await stationOf(p, 'Make aioli') + ')');

  await p.fill('#p-section', 'Grill');
  await add(p, 'Trim steaks');
  ok(await stationOf(p, 'Trim steaks') === 'Grill' && await box(p) === 'Grill', 'typed: Grill is used and stays in the box');
  await add(p, 'Salt steaks');
  ok(await stationOf(p, 'Salt steaks') === 'Grill', 'typed: the next line goes under Grill too');

  await L.clear(p, '#p-section');
  await add(p, 'Pick mint again');
  await add(p, 'Make aioli');
  ok(await box(p) === '', 'cleared: with the box emptied the book fills it in again and clears it after');

  // one section control (3 Nov 2026, work pages redesign S2): the sections as chips under the box, no Choose Section picker
  const chips = () => p.evaluate(() => [...document.querySelectorAll('#prep-root .sec-chips [data-p="sec-pick"]')].map(c => c.textContent + (c.getAttribute('aria-pressed') === 'true' ? '*' : '')));
  ok(!(await p.$('#p-section + .ux-picker-trigger')) && !(await p.$('#p-section[list]')), 'chips: no Choose Section picker next to the box');
  const first = await chips();
  ok(first.length >= 2 && !first.some(c => c.endsWith('*')), 'chips: the kitchen sections show, none lit while the box is empty (' + first.join(', ') + ')');
  await p.click('#prep-root [data-p="sec-pick"][data-v="Grill"]'); await L.settle(p, 200);
  ok(await box(p) === 'Grill' && (await chips()).includes('Grill*'), 'chips: a tap puts Grill in the box and lights its chip');
  await add(p, 'Portion steaks');
  ok(await stationOf(p, 'Portion steaks') === 'Grill' && await box(p) === 'Grill', 'chips: the line goes under Grill and Grill stays for the next line, like a typed section (' + await stationOf(p, 'Portion steaks') + ', box ' + await box(p) + ')');
  await p.click('#prep-root [data-p="sec-pick"][data-v="Grill"]'); await L.settle(p, 200);
  ok(await box(p) === '' && !(await chips()).some(c => c.endsWith('*')), 'chips: a tap on the lit chip clears it');
  await add(p, 'Wash leeks');
  ok(await stationOf(p, 'Wash leeks') !== 'Grill', 'chips: cleared, the next line no longer goes under Grill (' + await stationOf(p, 'Wash leeks') + ')');
  for (const w of [390, 768, 1280]) {
    await p.setViewportSize({ width: w, height: w > 400 ? 900 : 844 }); await L.settle(p, 200);
    ok(!(await L.overflow(p)) && await p.evaluate(() => [...document.querySelectorAll('#prep-root .sec-chips .chip')].every(c => c.getBoundingClientRect().height >= 44)), w + ' px: the chips are 44 px tall and nothing scrolls sideways');
  }
  ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // wastage: the same chips under its section box
  const q = await L.open(b, '#/waste', { wait: 1500, extra });
  await L.wLog(q);
  ok(!(await q.$('#w-sec + .ux-picker-trigger')) && (await q.$$('.sec-chips [data-p="sec-pick"][data-sk="w-sec"]')).length >= 2, 'wastage: section chips, no Choose Section picker');
  await q.click('.sec-chips [data-p="sec-pick"][data-sk="w-sec"][data-v="Larder"]'); await L.settle(q, 200);
  ok(await q.inputValue('#w-sec') === 'Larder', 'wastage: a tap puts Larder in the section box');
  ok(q.errors.length === 0, 'wastage: no page errors ' + q.errors.join(' | '));
  await q.context().close();
  await b.close();
  L.report(R);
})();
