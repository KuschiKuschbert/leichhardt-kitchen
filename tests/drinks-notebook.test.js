// The drinks notebook keeps one usual form and one counted order across phone and laptop layouts.
// Existing drinks.test.js covers onboarding, access, the complete picker and save contracts.
const L = require('./lib');
const { R, ok } = L.results(), { txt, tap } = L;
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', active: true, add: true, tick: true, del: true },
  { id: 'ann', name: 'Ann', role: 'staff', active: true, add: true, tick: true },
  { id: 'bo', name: 'Bo', role: 'staff', active: true, add: true, tick: true },
  { id: 'kim', name: 'Kim Lee', role: 'staff', active: true, add: true, tick: true }
];
const usual = (id, values) => Object.assign({ kind: 'flat', size: 'reg', milk: 'oat', shot: '', sugar: '1', note: '', cold: 'cokens', other: '', at: 1, by: id }, values || {});
const fixture = x => Object.assign({
  [key(['config', 'main'])]: { people, staffIds: people.map(p => p.id), sousIds: ['sam'], showBadges: true },
  [key(['drinks', 'bo'])]: usual('bo'),
  [key(['drinks', 'kim'])]: usual('kim', { kind: 'latte', size: 'large', milk: 'skim', sugar: '', cold: '' }),
  [key(['activity', 'ann'])]: { name: 'Ann', lastSeen: L.NOW - 3600000 },
  [key(['activity', 'bo'])]: { name: 'Bo', lastSeen: L.NOW - 1800000 },
  [key(['activity', 'kim'])]: { name: 'Kim Lee', lastSeen: L.NOW - 86400000 }
}, x || {});
const ready = p => L.waitFor(p, () => !!document.querySelector('.dr-notebook .dr-mine') && !/Loading/.test(document.querySelector('.dr-mine').textContent), null, 7000);
const reads = p => p.evaluate(() => window.__fake.reads.filter(k => /\/(drinks|activity)(\/|$)/.test(k)).length);
const order = p => p.$$eval('.dr-order li', all => all.map(e => e.textContent));
const saved = p => p.evaluate(k => window.__fake.dump()[k], key(['drinks', 'sam']));
const pick = async (p, f, v) => {
  if (!(await p.$('[data-f="' + f + '"][data-v="' + v + '"]'))) { await tap(p, '.dr-fold[data-f="' + f + '"]'); await L.settle(p, 100); }
  await tap(p, '[data-f="' + f + '"][data-v="' + v + '"]'); await L.settle(p, 100);
};
const form = p => p.evaluate(() => ({
  forms: document.querySelectorAll('.dr-page .dr-form').length,
  note: document.querySelector('[data-k="dk-note"]').value,
  other: document.querySelector('[data-k="dk-other"]').value,
  preview: document.querySelector('.dr-prev').textContent,
  saves: document.querySelectorAll('.dr-page [data-p="dk-save"]').length
}));
const geometry = p => p.evaluate(() => {
  const root = document.querySelector('.dr-notebook'), box = sel => { const e = root.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }; };
  const small = [...root.querySelectorAll('button, input, select, textarea')].filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden').filter(e => { const r = e.getBoundingClientRect(); return r.width < 43.9 || r.height < 43.9; }).map(e => e.textContent.trim().slice(0, 60));
  return { head: box('.dr-bookhead'), usual: box('.dr-usual'), work: box('.dr-work'), people: box('.dr-people'), overflow: document.documentElement.scrollWidth - innerWidth, small };
});

(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/drinks', { who: 'sam', width: 390, extra: fixture(), wait: 1200 });
  await ready(p);
  const initialReads = await reads(p), originalOrder = await order(p);
  ok(originalOrder.length === 3 && /^2 x Regular oat flat white, 1 sugar$/.test(originalOrder[0]) && /^2 x Coke No Sugar$/.test(originalOrder[1]) && /^1 x Large long black, extra shot$/.test(originalOrder[2]), 'order: the three counted drink groups still describe today\'s three people exactly');
  ok(await p.$$eval('.dr-run', all => all.length) === 1 && await p.$$eval('.dr-team .dr-row', all => all.length) === 3, 'read view: one order and one row per person on today');
  let g = await geometry(p);
  ok(g.head.bottom <= g.usual.y + 1 && g.usual.bottom <= g.work.y + 1 && g.work.bottom <= g.people.y + 1, 'phone: heading, Your usual, counted order and people remain in reading order');
  await p.setViewportSize({ width: 1280, height: 844 }); await L.settle(p, 200); g = await geometry(p);
  ok(g.work.right < g.usual.x && g.work.right < g.people.x, 'laptop: the order sits beside Your usual and the team');
  ok(await reads(p) === initialReads && JSON.stringify(await order(p)) === JSON.stringify(originalOrder), 'reflow: resizing preserves the counted order and adds no drinks or activity read');
  await tap(p, '[data-p="dk-all"]'); await L.settle(p, 150);
  ok(await p.$$eval('.dr-team .dr-row', all => all.length) === 4 && /Kim Lee/.test(await txt(p, '.dr-people') || ''), 'off shift: one Show them tap reveals the same fourth person');
  ok(JSON.stringify(await order(p)) === JSON.stringify(originalOrder), 'off shift: showing Kim never adds her drink to today\'s order');
  await tap(p, '[data-p="dk-all"]'); await L.settle(p, 150);
  ok(await p.$$eval('.dr-team .dr-row', all => all.length) === 3, 'off shift: Hide them folds the extra person again');

  await tap(p, '[data-p="dk-edit"]'); await L.settle(p, 150);
  ok(await p.$$eval('.dr-form', all => all.length) === 1 && !(await p.$('.dr-team, .dr-order')), 'edit: one original usual form opens in one tap while the team and order step aside');
  await pick(p, 'kind', 'flat'); await pick(p, 'milk', 'oat'); await pick(p, 'sugar', '1');
  await p.fill('[data-k="dk-note"]', 'Honey on the side'); await p.fill('[data-k="dk-other"]', 'No ice'); await L.settle(p, 150);
  const draft = await form(p), editReads = await reads(p);
  for (const width of [390, 768, 1280, 320]) {
    await p.setViewportSize({ width, height: 844 }); await p.evaluate(() => { document.documentElement.dataset.text = 'xlarge'; }); await L.settle(p, 180);
    const current = await form(p); g = await geometry(p);
    ok(current.forms === 1 && current.saves === 1 && current.note === draft.note && current.other === draft.other && current.preview === draft.preview && g.overflow <= 1 && !g.small.length, 'edit reflow: one complete draft and Save at ' + width + ' px, largest text, with no overflow or small controls ' + JSON.stringify(g.small));
  }
  ok(await reads(p) === editReads, 'edit reflow: the same draft uses the existing loaded drinks throughout resizing');
  await tap(p, '[data-p="dk-save"]');
  await L.waitFor(p, k => window.__fake.dump()[k].note === 'Honey on the side', key(['drinks', 'sam']), 7000);
  await ready(p);
  const out = await saved(p);
  ok(out.kind === 'flat' && out.milk === 'oat' && out.sugar === '1' && out.note === draft.note && out.other === draft.other && out.by === 'sam', 'Save: the form that survived reflow publishes the exact usual under the original writer');
  ok(!(await p.$('.dr-form')) && /Honey on the side/.test(await txt(p, '.dr-mine') || '') && !!(await p.$('.dr-order')), 'Save: one acknowledgement restores Your usual, counted order and people');
  ok(await reads(p) === editReads && !p.errors.length, 'Save: the cache is reused without new reads or browser errors ' + p.errors.join(' | '));
  await p.context().close();

  // A missing own usual is different from an unreadable team. Both keep the existing entry points.
  p = await L.open(b, '#/drinks', { who: 'sam', extra: fixture({ [key(['drinks', 'sam'])]: undefined }), wait: 1200 }); await ready(p);
  ok(/Not set yet/.test(await txt(p, '.dr-mine') || '') && /Set my usual/.test(await txt(p, '[data-p="dk-edit"]') || '') && /No usual yet/.test(await txt(p, '.dr-people') || ''), 'unset: an absent own usual retains Set my usual and the honest missing-usual line');
  await tap(p, '[data-p="dk-edit"]'); await L.settle(p, 100);
  ok(await p.$$eval('.dr-form', all => all.length) === 1 && !!(await p.$('[data-f="kind"][data-v="flat"]')), 'unset: Set my usual opens the original coffee choice');
  await p.context().close();
  p = await L.open(b, '#/drinks', { who: 'sam', extra: fixture({
    [key(['config', 'main'])]: { people: [people[0]], staffIds: ['sam'], sousIds: ['sam'] },
    [key(['drinks', 'sam'])]: undefined
  }), wait: 1200 }); await ready(p);
  ok(!(await p.$('.dr-order')) && /No usual yet/.test(await txt(p, '.dr-people') || '') && /Set my usual/.test(await txt(p, '.dr-mine') || ''), 'empty order: no saved usual remains distinct from a failed read and still offers the usual form');
  await p.context().close();
  p = await L.open(b, '#/prep', { who: 'sam', extra: fixture(), wait: 1000 });
  await p.evaluate(() => { window.__fake.failReads = /\/(drinks|activity)$/; location.hash = '#/drinks'; });
  await L.waitFor(p, () => !!document.querySelector('.dr-page .p-err'), null, 7000);
  ok(/Could not load the team's drinks/.test(await txt(p, '.dr-page') || '') && !!(await p.$('[data-p="dk-retry"]')) && !(await p.$('.dr-order, .dr-team')), 'failed read: the notebook keeps Try again and never invents an empty team or counted order');
  await p.context().close();

  const longPeople = people.map(p => p.id === 'ann' ? Object.assign({}, p, { name: 'A very long synthetic name for layout testing' }) : p);
  p = await L.open(b, '#/drinks', { who: 'sam', width: 320, extra: fixture({
    [key(['config', 'main'])]: { people: longPeople, staffIds: people.map(p => p.id), sousIds: ['sam'] },
    [key(['drinks', 'ann'])]: usual('ann', { note: 'Extra hot, honey on the side, thank you', other: 'No ice, water in a reusable bottle, thank you' })
  }), wait: 1200 }); await ready(p);
  const beforeLayouts = await reads(p);
  for (const width of [320, 390, 768, 1280]) for (const text of ['normal', 'xlarge']) {
    await p.setViewportSize({ width, height: 844 }); await p.evaluate(t => { document.documentElement.dataset.text = t; }, text); await L.settle(p, 120); g = await geometry(p);
    ok(g.overflow <= 1 && !g.small.length && !p.errors.length && await p.$$eval('.dr-run', all => all.length) === 1, 'long names and drink notes: readable ' + width + ' px ' + text + ' with one order, no overflow, errors or small targets ' + JSON.stringify(g.small));
  }
  ok(await reads(p) === beforeLayouts, 'layout: width and text-size changes add no drinks or activity reads');
  await p.context().close(); await b.close(); L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
