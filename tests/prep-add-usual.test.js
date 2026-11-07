// Add a line, your usual lines first (redesign step 1, 8 Nov 2026, head chef; Todoist's quick add as drawn in
// docs/whole-app-redesign-options/every-page.html). Typing shows at most four suggestions right under the box, each with
// what the book knows (usual amount, section, a recipe). The words fill the form as before; Add puts the line on in one
// tap with its usual amount and section, says so by name, and leaves the box empty and ready for the next. A line with
// no section known has no Add: nothing is guessed. Typing reads nothing.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const today = L.ymd(new Date(L.NOW));
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const extra = {
  [fsKey(['learned', 'dice-onions'])]: { text: 'Dice onions', uses: 9, typed: 9, secs: { larder: { name: 'Larder', n: 9 } }, qtys: { a: { q: '1 tub', n: 7 } }, dow: {} },
  [fsKey(['learned', 'pickled-red-onion'])]: { text: 'Pickled red onion', uses: 3, typed: 3, secs: { larder: { name: 'Larder', n: 3 } }, dow: {} },
  [fsKey(['learned', 'onion-jam'])]: { text: 'Onion jam', uses: 2, typed: 2, secs: {}, dow: {} }
};
const todays = p => p.evaluate(d => Object.entries(window.__fake.dump()).filter(([k]) => k.indexOf('/days/' + d + '/items/') > 0).map(([k, v]) => Object.assign({ id: k.split('/').pop() }, v)), today);
const rows = p => p.$$eval('#p-sugg .nb-sgr', l => l.map(r => ({ t: r.querySelector('.nb-sgt').textContent, us: (r.querySelector('.nb-us') || {}).textContent || '', add: !!r.querySelector('.nb-sgadd') })));
const bill = p => p.evaluate(() => window.__fake.bill.reduce((n, x) => n + x.n, 0));
(async () => {
  const b = await L.start();

  let p = await L.open(b, '#/prep', { who: 'sam', extra, width: 390, height: 844, wait: 1600 });
  await p.click('.nb-addline'); await L.settle(p, 400);
  const before = await bill(p), n0 = (await todays(p)).length;
  await p.type('[data-k="p-text"]', 'oni', { delay: 30 }); await L.settle(p, 300);
  let r = await rows(p);
  const row = t => r.filter(x => x.t === t)[0] || {};
  ok(r.length >= 3 && r.length <= 4 && r.slice(0, 3).map(x => x.t).sort().join() === 'Dice onions,Onion jam,Pickled red onion', 'typing oni: your usual lines first, at most four (' + JSON.stringify(r.map(x => x.t)) + ')');
  ok(row('Dice onions').us === '1 tub · Larder' && row('Dice onions').add, 'Dice onions says its usual amount and section, with Add (' + row('Dice onions').us + ')');
  ok(row('Pickled red onion').us === 'Larder' && row('Pickled red onion').add, 'Pickled red onion: its section, no amount to guess, with Add');
  ok(!row('Onion jam').add, 'Onion jam has no section anywhere: no Add, nothing guessed');
  const place = await p.evaluate(() => { const t = document.getElementById('p-text').getBoundingClientRect(), s = document.getElementById('p-sugg').getBoundingClientRect(), sec = document.getElementById('p-section').getBoundingClientRect(); return { under: s.top >= t.bottom - 1, above: s.bottom <= sec.top + 1 }; });
  ok(place.under && place.above, 'the suggestions sit right under the box, above the section and amount (' + JSON.stringify(place) + ')');
  ok(await p.$$eval('#p-sugg button', l => l.every(e => { const q = e.getBoundingClientRect(); return q.height >= 44 - .1 && q.width >= 44 - .1; })), 'every suggestion button is at least 44 px');
  ok(await bill(p) === before, 'typing reads nothing');

  // Add: one tap puts Dice onions on with 1 tub under Larder, says so by name, and the box is ready for the next line
  await p.click('#p-sugg .nb-sgr:has(.nb-sgt:text-is("Dice onions")) .nb-sgadd'); await L.settle(p, 600);
  const added = (await todays(p)).filter(x => x.text === 'Dice onions' && !x.deleted);
  ok(added.length === 1 && added[0].qty === '1 tub' && added[0].station === 'Larder' && added[0].addedById === 'sam', 'Add: Dice onions, 1 tub, under Larder, by Sam (' + JSON.stringify(added.map(x => [x.qty, x.station])) + ')');
  ok(/Added Dice onions to Larder/.test(await p.evaluate(() => document.body.innerText)), 'the slip names it: Added Dice onions to Larder');
  ok(await p.evaluate(() => { const t = document.getElementById('p-text'); return !!t && t.value === '' && document.activeElement === t; }) && !(await p.$('#p-sugg .nb-sgr')), 'the box is empty and ready for the next line, the suggestions gone');
  ok(!!(await p.$('#nbr-' + added[0].id)), 'the line is on the list');

  // the words fill the form, as before: nothing is added until Add
  await p.type('[data-k="p-text"]', 'pickled', { delay: 30 }); await L.settle(p, 300);
  await p.click('#p-sugg .nb-sg'); await L.settle(p, 300);
  ok(await p.$eval('#p-text', e => e.value) === 'Pickled red onion' && (await todays(p)).length === n0 + 1, 'a tap on the words fills the box and adds nothing');
  ok(p.errors.length === 0 && !(await L.overflow(p)), '390 px: no page errors, no sideways scroll ' + p.errors.join(' | '));
  await p.context().close();

  // a laptop: right under the box when the box has its own row; under the whole row when it shares it with the amount
  p = await L.open(b, '#/prep', { who: 'sam', extra, width: 1280, height: 900, wait: 1600 });
  await p.click('.nb-addline'); await L.settle(p, 400);
  await p.type('[data-k="p-text"]', 'oni', { delay: 30 }); await L.settle(p, 300);
  r = await rows(p);
  const wide = await p.evaluate(() => {
    const t = document.getElementById('p-text').getBoundingClientRect(), s = document.getElementById('p-sugg').getBoundingClientRect(), q = document.getElementById('p-qty').getBoundingClientRect();
    const shared = Math.abs(t.top - q.top) < 2;
    return { shared, ok: shared ? s.top >= Math.max(t.bottom, q.bottom) - 1 : s.top >= t.bottom - 1 && s.bottom <= q.top + 1, w: Math.round(s.width), tw: Math.round(t.width) };
  });
  ok(r.length >= 3 && wide.ok && wide.w >= wide.tw - 1, '1280 px: the suggestions under the box, as wide as it, never between it and the amount on one row (' + JSON.stringify(wide) + ')');
  ok(p.errors.length === 0 && !(await L.overflow(p)), '1280 px: no page errors, no sideways scroll ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
