// A two-digit date and a wide fallback font must not push a staff member's day below the prep header.
const L = require('./lib');
const { R, ok } = L.results();
const key = path => ['kitchens', L.PIN].concat(path).join('/');
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
  { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true }
];
function fixture(day, clock) {
  const data = {
    [key(['config', 'main'])]: { people, sousIds: ['sam'], staffIds: ['sam', 'ann'], showBadges: true, prepStandardsEnabled: true,
      kitSecs: [{ id: 'grill', name: 'Grill' }], kitShifts: [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }] },
    [key(['team', day])]: { day, on: [{ id: 'ann', sh: 'lunch', sec: 'grill' }], br: [{ id: 'ann', sh: 'lunch', at: 870, len: 30 }],
      v: 1, at: clock - 3600000, upd: clock - 3600000, by: 'sam' }
  };
  for (const [path, item] of Object.entries(L.seed())) {
    const match = path.match(/\/days\/[^/]+\/items\/([^/]+)$/);
    if (match) data[key(['days', day, 'items', match[1]])] = { ...item, addedAt: clock - 3600000 };
  }
  return data;
}
async function measure(p) {
  return p.evaluate(() => {
    const header = document.querySelector('.nb-left .nb-ph'), line = header.querySelector('.nb-tmday');
    const bounds = () => ({ height: header.getBoundingClientRect().height, rows: [...document.querySelectorAll('[id^="nbr-"]')].map(e => {
      const r = e.getBoundingClientRect(); return { top: r.top, height: r.height };
    }) });
    const withDay = bounds(); line.style.display = 'none'; const withoutDay = bounds(); line.style.display = '';
    const view = document.querySelector('.ps-viewbar'); view.style.display = 'none';
    const dock = document.querySelector('.nb-addline').getBoundingClientRect().top;
    const visible = [...document.querySelectorAll('[id^="nbr-"]')].filter(e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= dock; }).length;
    view.style.display = '';
    return { withDay, withoutDay, visible, label: line.getAttribute('aria-label'), text: line.textContent };
  });
}
(async () => {
  const b = await L.start();
  for (const day of ['2026-11-10', '2026-09-30']) {
    const clock = Date.parse(day + 'T04:00:00Z');
    const p = await L.open(b, '#/prep', { who: 'ann', clock, extra: fixture(day, clock), wait: 1800 });
    await L.waitFor(p, () => !!document.querySelector('.nb-tmday'), null, 8000);
    await p.addStyleTag({ content: ':root { --body: "DejaVu Sans", sans-serif; }' });
    for (const width of [390, 768, 1280]) {
      await p.setViewportSize({ width, height: 844 }); await L.settle(p, 150);
      const m = await measure(p), label = day + ' at ' + width + ' px';
      ok(JSON.stringify(m.withDay) === JSON.stringify(m.withoutDay), label + ': showing her day keeps the header and every prep row in place (' + JSON.stringify(m) + ')');
      if (width === 390) ok(m.visible === 5, label + ': the existing five rows fit when the separate view choice is hidden (' + m.visible + ')');
      ok(m.text === 'Lunch: Grill · Break 14:30' && m.label === 'Your day: ' + m.text, label + ': the complete day stays in the accessible label');
      ok(!await L.overflow(p), label + ': the page fits');
    }
    ok(p.errors.length === 0, day + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  await b.close(); L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
