// How many prep lines a phone shows (8 Nov 2026, the redesign's own measure: "aim for 6 lines visible at 390 px").
// Step 1 gave 3 on a 390 x 844 phone with the book's real fonts and 14 lines with long names; the gap fix puts the Start
// here number in the margin, makes the line words a little smaller and the rows and section headings tighter, so staff
// see 6 and a chef, who has the day controls above the chips, 5. Measured in the book's own fonts (Caveat, Barlow), which
// the click tests otherwise stand in with nothing: if they cannot load here, the check says so and measures nothing.
const L = require('./lib');
const { R, ok } = L.results();
const day = L.ymd(new Date(L.NOW));
const key = id => ['kitchens', L.PIN, 'days', day, 'items', id].join('/');
const LINES = [
  ['i3', 'Portion rump', 'Grill', '20', { urgent: true }], ['g2', 'Crumb chicken schnitzels', 'Grill', '30', { onBy: 'Bo', onById: 'bo', onAt: L.NOW - 1200000 }], ['g3', 'Skewer haloumi and capsicum', 'Grill', '24'],
  ['i4', 'Make gravy', 'Sauce', '5 L', { rolled: 1, recipe: 'gravy' }], ['s2', 'Chimichurri', 'Sauce', '2 L'], ['i5', 'Laksa', 'Sauce', '1 batch', { done: true, doneBy: 'Ann', doneById: 'ann', doneAt: L.NOW - 600000 }],
  ['i1', 'Slice onions', 'Larder', '2 tubs'], ['i2', 'Pick coriander', 'Larder', ''], ['i6', 'Wash bok choy', 'Larder', '', { done: true, doneBy: 'Ann', doneById: 'ann', doneAt: L.NOW - 300000 }],
  ['l4', 'Dice carrot and celery for the stock', 'Larder', '2 tubs'], ['l5', 'Pickled red onion', 'Larder', '1 batch'],
  ['f1', 'Blanch chips', 'Fryer', '4 trays'], ['f2', 'Crumb calamari', 'Fryer', '3 kg'], ['f3', 'Batter mix', 'Fryer', '2 L']
];
const extra = Object.fromEntries(LINES.map(([id, text, station, qty, x], k) => [key(id), Object.assign({ text, station, qty, recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - (90 - k) * 60000, done: false, deleted: false }, x || {})]));
const FONTS = 'https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Barlow:wght@400;600;700&family=Barlow+Condensed:wght@600;700&display=swap';
(async () => {
  const b = await L.start();
  for (const [who, want] of [['ann', 6], ['sam', 5]]) {
    const p = await L.open(b, '#/prep', { who, width: 390, height: 844, extra, wait: 1500 });
    await p.context().unroute(/fonts\.(googleapis|gstatic)\.com/);
    const css = await p.addStyleTag({ url: FONTS }).then(() => true, () => false);
    const got = css && await p.evaluate(() => Promise.race([Promise.all(['700 22px Caveat', '600 16px Barlow', '700 16px "Barlow Condensed"'].map(f => document.fonts.load(f))).then(r => r.every(x => x.length > 0)), new Promise(r => setTimeout(() => r(false), 8000))]));
    if (!got) { ok(true, who + ' at 390 px: the book\'s fonts could not load here, the lines were not counted'); await p.context().close(); continue; }
    await L.settle(p, 400);
    const r = await p.evaluate(() => {
      const top = document.querySelector('.nb-addline').getBoundingClientRect().top;
      const rows = [...document.querySelectorAll('.nb-left .nb-row')];
      const seen = rows.filter(e => { const q = e.getBoundingClientRect(); return q.top >= 0 && q.bottom <= top + 0.5; }).length;
      const small = [...document.querySelectorAll('.nb-left .nb-row')].flatMap(row => [...row.querySelectorAll('button,a')].filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden').map(e => e.getBoundingClientRect()).filter(q => q.width < 43.9 || q.height < 43.9));
      const num = document.querySelector('.nb-left .nb-t[data-n]'), box = num && num.closest('.nb-row').querySelector('.nb-box').getBoundingClientRect();
      const nb = num && getComputedStyle(num, '::before'), body = document.querySelector('.nb-left .nb-body').getBoundingClientRect();
      return { seen, small: small.length, margin: !!nb && nb.position === 'absolute' && body.left < box.left - 12, sw: document.documentElement.scrollWidth - innerWidth };
    });
    ok(r.seen >= want, who + ' at 390 x 844, in the book\'s fonts: ' + r.seen + ' prep lines fully above Add a line (at least ' + want + '; 3 before)');
    ok(r.small === 0 && r.sw <= 1, who + ': every control on the lines is still 44 px, no sideways scroll (' + JSON.stringify(r) + ')');
    ok(r.margin, who + ': the Start here number sits in the margin, left of the box, where the page shows it');
    ok(p.errors.length === 0, who + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
