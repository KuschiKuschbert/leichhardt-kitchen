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
  ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  L.report(R);
})();
