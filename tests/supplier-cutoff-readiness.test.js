// The order-list tick for a supplier's order (5 Nov 2026, the one place to tick it, head chef): it confirms the order
// at once, for a supplier linked to the catalogue or not, without quantities and without loading the supplier tools or
// reading the private catalogue. Before, it looked the supplier up first and opened a linked supplier's sheet instead of
// ticking; the bar's Order done confirmed without the lookup. These checks hold the supplier tools back, refuse and fail
// catalogue reads, as a slow live site or unpublished rules would, and the tick must not wait for any of them.
const L = require('./lib');
const F = require('./supplier-fixtures');
const { R, ok } = L.results();
const completion = F.key(['cutdone', F.today + '_northside']);
const tick = '.cut-tl [data-p="cut-tick"][data-id^="northside|"]';
const reminder = '#cut-band a.cut-n[href*="/northside/"]';
const fixture = linked => {
  const seed = F.fixture();
  if (!linked) Object.keys(seed).filter(k => /\/suppliers\//.test(k)).forEach(k => delete seed[k]);
  return seed;
};
const dump = p => p.evaluate(() => window.__fake.dump());
const completionWrites = p => p.evaluate(k => window.__fake.writes.flat().filter(o => o.path === k), completion);
const pressed = p => p.$eval(tick, e => e.getAttribute('aria-pressed'));
async function open(b, linked, o) {
  const p = await L.open(b, '#/orders', Object.assign({ who: 'sam', extra: fixture(linked), wait: 1500 }, o || {}));
  await L.waitFor(p, s => !!document.querySelector(s), tick, 10000);
  return p;
}
async function saved(p, on) { await L.waitFor(p, ([k, v]) => { const d = window.__fake.dump()[k]; return d && d.on === v; }, [completion, on !== false], 10000); }

(async () => {
  const b = await L.start();
  let p;

  // Linked and unlinked, with the supplier tools held back from the start (the order list asks for them to group a
  // chef's requests by supplier, since 5 Nov 2026): the tick saves at once, asks for none of them and waits for none
  for (const linked of [true, false]) {
    const name = linked ? 'linked' : 'unlinked';
    p = await open(b, linked, { hold: 'js/supplier-(core|store)\\.js|js/suppliers\\.js' });
    const tools = () => p.urls.filter(u => /\/js\/(suppliers|supplier-core|supplier-store)\.js(?:\?|$)/.test(u)).length, asked = tools();
    await p.click(tick); await saved(p);
    await L.waitFor(p, s => !document.querySelector(s), reminder, 10000);
    ok((await dump(p))[completion].by === 'sam' && await pressed(p) === 'true', name + ': the tick saves as the chef and shows ticked');
    ok(tools() === asked && await p.evaluate(() => location.hash === '#/orders' && !window.LK_SUP_CORE), name + ': no supplier tools are loaded and no supplier sheet opens');
    ok((await completionWrites(p)).length === 1, name + ': one completion write');
    ok(p.errors.length === 0, name + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // A linked supplier's sheet is one tap away on its name, for recording the quantities
  p = await open(b, true);
  await p.click('.cut-tl a.cut-n[href*="/northside/"]');
  await L.waitFor(p, day => location.hash === '#/suppliers/cutoff/northside/' + day, F.today, 10000);
  await L.waitFor(p, () => !!document.querySelector('input[data-sf="qty"]'), null, 10000);
  ok(!(await dump(p))[completion], 'the supplier\'s name opens its sheet, and opening it ticks nothing');
  ok(p.errors.length === 0, 'name link: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // A tick then an untick straight after: the list ends unticked, the reminder back on the bar
  p = await open(b, false);
  await p.click(tick);
  await L.waitFor(p, s => document.querySelector(s).getAttribute('aria-pressed') === 'true', tick, 10000);
  await p.click(tick); await saved(p, false);
  ok(await pressed(p) === 'false' && (await dump(p))[completion].on === false, 'tick then untick: the last tap wins');
  await L.waitFor(p, s => !!document.querySelector(s), reminder, 10000);
  ok(!!(await p.$(reminder)), 'tick then untick: the reminder is back on the bar');
  await p.context().close();

  // Supplier reads refused (rules not published) or failing: the tick does not read the catalogue, so it still saves
  for (const o of [{ denyReads: '/suppliers$' }, { failReads: '/suppliers$' }]) {
    const name = o.denyReads ? 'refused catalogue reads' : 'failing catalogue reads';
    p = await open(b, true, o);
    await p.click(tick); await saved(p);
    ok((await dump(p))[completion].by === 'sam' && await p.evaluate(() => location.hash === '#/orders'), name + ': the tick still saves, on the order list');
    ok(p.errors.length === 0, name + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // On the shared tablet the tick is the signed in chef's
  p = await open(b, false, { who: 'bo', deviceMode: 'shared' });
  await p.click(tick); await saved(p);
  ok((await dump(p))[completion].by === 'bo', 'shared tablet: the tick is Bo\'s');
  await p.context().close();

  await b.close();
  L.report(R);
})();
