/* Review-only previews for the records page (R1 + R2), round 2. Drawn over the real admin panel on the click tests'
   stand-in, with made-up people and records. Nothing here is in the book.
   Run from tests/: cp ../docs/smart-book-options/preview/records.cjs zz-sbr.test.js && CHROME=... npm test -- zz-sbr; rm zz-sbr.test.js */
const path = require('path'), fs = require('fs');
const root = path.resolve(process.cwd(), '..');
const L = require(path.join(root, 'tests/lib'));
const out = path.join(root, 'docs/smart-book-options/evidence');

// One synthetic kitchen day, Saturday 8 November 2026. Ann, Bo and Sam are the stand-in's made-up cooks.
const DAY = {
  label: 'Saturday 8 November',
  team: [['Lunch 10:00 to 15:00', 'Ann: Larder · Bo: Grill · Sam: Pass'], ['Dinner 15:00 to 21:00', 'Ann: Larder · Bo: Fryer · Sam: Pass']],
  deliveries: [['07:42', 'Bidfood', '3.1 °C chilled', 'Ann'], ['09:05', 'Fresh produce', '4.0 °C chilled', 'Ann'], ['10:20', 'Seafood', '1.8 °C chilled, -19.5 °C frozen', 'Bo']],
  cooling: [['14:05', 'Batch started: Brisket, beef cheek', 'Bo'], ['16:07', '2 hour stage recorded in Operandio', 'Bo'], ['18:12', '4 hour stage recorded in Operandio', 'Ann']],
  cleaning: { done: 31, missed: ['Fryer oil change', 'Cool room floor'], unable: [['Hood filters', 'No degreaser']], pass: ['22:10', 'Sam'] },
  waste: [['21:30', 'Chips', '2 kg', 'Excess production', 'Fryer', 'Bo'], ['15:10', 'Brisket', '0.5 kg', 'Excess production', 'Smoker', 'Bo'], ['11:02', 'Rice', '1 portion', 'Expired stock', 'Pans', 'Ann']],
  prep: { written: 42, ticked: 39, rolled: 3, onit: 'Slowest from On it to tick: Make gravy, 1 h 40 min' },
  orders: [['13:40', 'Bidfood order recorded, 22 items', 'Sam']],
  functions: [['18:00', 'Smith 60th, 60 guests, Function room, 2 rounds']]
};
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const STYLE = `
.sb-st{display:flex;flex-wrap:wrap;gap:.35rem .5rem;margin:.2rem 0 .4rem;padding:0;list-style:none}
.sb-st li{display:inline-flex;align-items:center;gap:.35rem;min-height:30px;padding:0 .55rem;border:1.5px solid var(--line);border-radius:6px;background:var(--paper);font-size:.8125rem;font-weight:600}
.sb-st li b{font:700 .75rem var(--display);letter-spacing:.06em;text-transform:uppercase}
.sb-st li.ok b{color:var(--done-ink)} .sb-st li.none b{color:var(--muted)} .sb-st li.bad{border-color:var(--bad-ink);background:var(--bad-tint)} .sb-st li.bad b{color:var(--bad-ink)}
.sb-st li.old{border-color:var(--small-ink)} .sb-st li.old b{color:var(--small-ink)}
.sb-part{border-top:1px solid var(--line);padding:.6rem 0}
.sb-part>summary,.sb-part>h4{display:flex;justify-content:space-between;align-items:baseline;gap:.75rem;margin:0;cursor:pointer;font:700 1.125rem var(--display);min-height:44px;align-items:center}
.sb-part>summary span,.sb-part>h4 span{font:600 .875rem var(--body);color:var(--muted)}
.sb-rows{list-style:none;margin:.2rem 0 0;padding:0}
.sb-rows li{display:grid;grid-template-columns:3.4rem 1fr auto;gap:.6rem;padding:.4rem 0;border-bottom:1px dashed var(--line);font-size:.9375rem}
.sb-rows li time{font-variant-numeric:tabular-nums;color:var(--muted);font-weight:600}
.sb-rows li em{font-style:normal;color:var(--muted);font-size:.8125rem;align-self:center}
.sb-bad{margin:.3rem 0;padding:.5rem .7rem;border-left:3px solid var(--bad-ink);background:var(--bad-tint);color:var(--bad-ink);font-weight:700;font-size:.875rem;display:flex;justify-content:space-between;align-items:center;gap:.6rem}
.sb-note{margin:.3rem 0;padding:.45rem .7rem;border-left:3px solid var(--small-ink);background:var(--surface-reference);font-size:.875rem}
.sb-miss{color:var(--bad-ink);font-weight:700}
.sb-day{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}
.sb-day .chip{min-width:44px}
.sb-day strong{font:700 1.35rem var(--display);margin:0 .25rem}
.sb-tl{list-style:none;margin:.4rem 0 0;padding:0}
.sb-tl li{display:grid;grid-template-columns:3.4rem 6.2rem 1fr;gap:.6rem;padding:.45rem 0;border-bottom:1px solid var(--line);font-size:.9375rem;align-items:baseline}
.sb-tl li time{font-variant-numeric:tabular-nums;font-weight:700}
.sb-tl li .k{font:700 .75rem var(--display);letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.sb-tl li.fs .k{color:var(--small-ink)}
.sb-cal{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;margin:.4rem 0}
.sb-cal .h{font:700 .75rem var(--display);letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:.2rem .3rem}
.sb-cal button{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-height:76px;padding:.35rem .4rem;border:1.5px solid var(--line);border-radius:8px;background:var(--paper);text-align:left;font:600 .75rem var(--body);color:var(--ink);cursor:pointer}
.sb-cal button b{font:700 1rem var(--display)}
.sb-cal button.sel{border-color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--ink)}
.sb-cal button .m{color:var(--bad-ink);font-weight:700}
.sb-cal button .x{color:var(--bad-ink)}
.sb-cal button.off{background:transparent;border-style:dashed;color:var(--faint)}
.sb-cal-list{display:none}
@media (max-width:640px){.sb-cal{display:none}.sb-cal-list{display:block}.sb-tl li{grid-template-columns:3.2rem 1fr}.sb-tl li .k{grid-column:2}.sb-tl li span:last-child{grid-column:2}}
.sb-actions{display:flex;flex-wrap:wrap;gap:.5rem}
.sb-shot .tabbar{display:none!important}
.sb-legend{font-size:.8125rem;color:var(--muted);margin:.2rem 0}
`;
const status = fail => '<ul class="sb-st" aria-label="What loaded">' + [
  ['ok', 'Team'], ['ok', 'Prep'], ['ok', 'Deliveries'], ['ok', 'Cleaning'], ['old', 'Cooling'], ['ok', 'Wastage'], fail ? ['bad', 'Transfers'] : ['ok', 'Transfers'], ['ok', 'Orders'], ['none', 'Functions']
].map(([c, n]) => '<li class="' + c + '"><b>' + (c === 'ok' ? 'Loaded' : c === 'bad' ? 'Could not load' : c === 'old' ? 'Kept from 14 Nov' : 'None') + '</b>' + n + '</li>').join('') + '</ul>';
const failLine = '<div class="sb-bad" role="alert">Transfers could not load. This does not mean nothing moved. <button type="button" class="chip">Try again</button></div>';
const coolNote = '<p class="sb-note">Cooling is kept from 14 November, when the book started keeping a dated copy. Earlier days were not kept.</p>';
const rows = (arr, f) => '<ul class="sb-rows">' + arr.map(f).join('') + '</ul>';
const tempNote = '<p class="hint">Temperatures as recorded. The book sets no limits until the head chef confirms them.</p>';

// A: Records by kind, for a period (Reports, new Records page beside Wastage)
function designA() {
  const d = DAY;
  return '<section class="set-block"><h3 class="a-title">Records</h3>' +
    '<div class="sb-actions"><button type="button" class="chip" aria-haspopup="dialog">Period: Last 7 days ▾</button><button type="button" class="chip">Refresh</button><button type="button" class="chip">Export CSV</button><button type="button" class="chip">Print food safety</button></div>' +
    '<p class="hint wh-range">Sun 2 Nov to Sat 8 Nov (inclusive). Updated 14:00.</p>' + status(true) + failLine +
    '<details class="sb-part" open><summary>Deliveries <span>19 recorded, 7 days</span></summary>' + tempNote + rows(d.deliveries.map(x => ['Sat 8', ...x]), x => '<li><time>' + x[0] + '</time><span>' + x[1] + ' · ' + esc(x[2]) + ' · <strong>' + esc(x[3]) + '</strong></span><em>' + x[4] + '</em></li>') + '<p class="hint">Showing 3 of 19. Show all</p></details>' +
    '<details class="sb-part" open><summary>Cleaning <span>214 done · <span class="sb-miss">5 missed</span> · 1 not possible</span></summary>' + rows([['Sat 8', 'Missed: Fryer oil change, Cool room floor'], ['Sat 8', 'Not possible: Hood filters (No degreaser)'], ['Thu 6', 'Missed: Walk-in shelves'], ['Sat 8', 'Pass check 22:10, Sam']], x => '<li><time>' + x[0] + '</time><span>' + esc(x[1]) + '</span><em></em></li>') + '</details>' +
    '<details class="sb-part" open><summary>Cooling <span>3 stages confirmed</span></summary>' + coolNote + '</details>' +
    '<details class="sb-part"><summary>Wastage <span>14 entries · 9.5 kg, 4 portions</span></summary></details>' +
    '<details class="sb-part"><summary>Transfers <span class="sb-miss">Could not load</span></summary></details>' +
    '<details class="sb-part"><summary>Prep <span>286 lines written · 271 ticked</span></summary></details>' +
    '<details class="sb-part"><summary>Team <span>7 days planned</span></summary></details>' +
    '<details class="sb-part"><summary>Supplier orders <span>6 recorded</span></summary></details>' +
    '<details class="sb-part"><summary>Functions <span>None in this period</span></summary></details>' +
    '</section>';
}
// B: Day book, one day as a timeline (Reports, new Day book page)
function designB() {
  const d = DAY, ev = [];
  d.team.forEach((t, i) => ev.push([i ? '15:00' : '10:00', 'Team', t[0].replace(/ \d.*/, '') + ': ' + t[1], 0]));
  d.deliveries.forEach(x => ev.push([x[0], 'Delivery', x[1] + ' · ' + x[2] + ' · ' + x[3], 1]));
  d.cooling.forEach(x => ev.push([x[0], 'Cooling', x[1] + ' · ' + x[2], 1]));
  d.waste.forEach(x => ev.push([x[0], 'Wastage', x[1] + ' ' + x[2] + ' · ' + x[3] + ' · ' + x[4] + ' · ' + x[5], 0]));
  d.orders.forEach(x => ev.push([x[0], 'Order', x[1] + ' · ' + x[2], 0]));
  d.functions.forEach(x => ev.push([x[0], 'Function', x[1], 0]));
  ev.push(['22:10', 'Cleaning', 'Pass check by Sam · 31 done · Missed: Fryer oil change, Cool room floor · Not possible: Hood filters (No degreaser)', 1]);
  ev.sort((a, b) => a[0] < b[0] ? -1 : 1);
  return '<section class="set-block"><h3 class="a-title">Day book</h3>' +
    '<div class="sb-day"><button type="button" class="chip" aria-label="Day before">‹</button><strong>' + d.label + '</strong><button type="button" class="chip" aria-label="Day after">›</button><button type="button" class="chip">Pick a day</button><button type="button" class="chip">Print this day</button></div>' +
    status(true) + failLine +
    '<div class="chiprow" role="group" aria-label="Show"><button type="button" class="chip" aria-pressed="true">Everything</button><button type="button" class="chip" aria-pressed="false">Food safety</button><button type="button" class="chip" aria-pressed="false">Prep and orders</button><button type="button" class="chip" aria-pressed="false">Team</button></div>' +
    '<p class="hint">Prep: ' + d.prep.written + ' lines written, ' + d.prep.ticked + ' ticked, ' + d.prep.rolled + ' rolled to Sunday. ' + d.prep.onit + '. Temperatures as recorded; no limits set.</p>' +
    '<ol class="sb-tl">' + ev.map(e => '<li class="' + (e[3] ? 'fs' : '') + '"><time>' + e[0] + '</time><span class="k">' + e[1] + '</span><span>' + esc(e[2]) + '</span></li>').join('') + '</ol>' + coolNote + '</section>';
}
// C: Food safety month: a calendar of the three food safety records, tap a day for its detail, print the month
function designC() {
  const days = [];
  for (let i = 1; i <= 30; i++) days.push(i);
  const first = 6; // 1 Nov 2026 is a Sunday; Monday-first grid puts it in column 7
  const cell = n => {
    if (n > 14) return '<button type="button" class="off" disabled><b>' + n + '</b>Not yet</button>';
    const miss = { 6: 1, 8: 2, 12: 1 }[n], unable = n === 8;
    return '<button type="button" class="' + (n === 8 ? 'sel' : '') + '" aria-label="' + n + ' November"><b>' + n + '</b>' + ((n % 7 === 3 ? 0 : (n % 3) + 1) === 1 ? '1 delivery' : (n % 7 === 3 ? 0 : (n % 3) + 1) + ' deliveries') + '<span' + (miss ? ' class="m"' : '') + '>' + (miss ? miss + ' missed' : 'Cleaning done') + '</span>' + (n >= 14 ? '<span>Cooling 2 of 2</span>' : '<span>Cooling not kept</span>') + '</button>';
  };
  const grid = '<div class="sb-cal" role="grid" aria-label="November 2026">' + ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(h => '<span class="h">' + h + '</span>').join('') + '<span></span>'.repeat(first) + days.map(cell).join('') + '</div>';
  const list = '<ul class="sb-rows sb-cal-list">' + [['Sat 8', '3 deliveries · <span class="sb-miss">2 missed</span> · Cooling not kept'], ['Fri 7', '2 deliveries · Cleaning done · Cooling not kept'], ['Thu 6', '1 delivery · <span class="sb-miss">1 missed</span> · Cooling not kept'], ['Wed 5', '0 deliveries · Cleaning done · Cooling not kept']].map(x => '<li><time>' + x[0] + '</time><span>' + x[1] + '</span><em>›</em></li>').join('') + '</ul>';
  const d = DAY;
  const detail = '<h4 class="a-ch-h">Saturday 8 November</h4>' +
    '<div class="sb-part"><h4>Deliveries <span>3</span></h4>' + rows(d.deliveries, x => '<li><time>' + x[0] + '</time><span>' + x[1] + ' · <strong>' + esc(x[2]) + '</strong></span><em>' + x[3] + '</em></li>') + '</div>' +
    '<div class="sb-part"><h4>Cleaning <span>31 done · <span class="sb-miss">2 missed</span> · 1 not possible</span></h4>' + rows([['', 'Missed: Fryer oil change, Cool room floor'], ['', 'Not possible: Hood filters (No degreaser)'], ['22:10', 'Pass check by Sam']], x => '<li><time>' + x[0] + '</time><span>' + esc(x[1]) + '</span><em></em></li>') + '</div>' +
    '<div class="sb-part"><h4>Cooling <span>Not kept for this day</span></h4>' + coolNote + '</div>';
  return '<section class="set-block"><h3 class="a-title">Food safety</h3>' +
    '<div class="sb-day"><button type="button" class="chip" aria-label="Month before">‹</button><strong>November 2026</strong><button type="button" class="chip" aria-label="Month after">›</button><button type="button" class="chip">Print this month</button><button type="button" class="chip">Export CSV</button></div>' +
    '<ul class="sb-st"><li class="ok"><b>Loaded</b>Deliveries</li><li class="ok"><b>Loaded</b>Cleaning</li><li class="old"><b>Kept from 14 Nov</b>Cooling</li></ul>' +
    '<p class="sb-legend">Each day: deliveries recorded, cleaning missed, cooling stages confirmed. Temperatures as recorded; no limits set. Equipment temperature logs are not in the book.</p>' +
    grid + list + detail + '<p class="hint">Wastage, transfers, prep and team stay on their own Reports pages.</p></section>';
}

(async () => {
  const b = await L.start(), notes = [];
  const designs = { a: ['Records', designA], b: ['Day book', designB], c: ['Food safety', designC] };
  for (const k of Object.keys(designs)) {
    for (const w of [1280, 768, 390]) {
      const p = await L.open(b, '#/admin', { admin: true, adminPage: '', width: w, height: w === 390 ? 844 : 900, wait: 2500 });
      await L.adminTab(p, 'waste'); await L.settle(p, 600);
      await p.evaluate(([css, html, tab]) => {
        const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
        const tabs = document.querySelector('.a-tabs');
        if (tabs) { tabs.querySelectorAll('[aria-pressed]').forEach(x => x.setAttribute('aria-pressed', 'false')); const t = document.createElement('button'); t.type = 'button'; t.className = 'a-tab'; t.setAttribute('aria-pressed', 'true'); t.textContent = tab; tabs.insertBefore(t, tabs.children[1]); }
        document.querySelector('.a-pane').innerHTML = html;
      }, [STYLE, designs[k][1](), designs[k][0]]);
      await L.settle(p, 300);
      const m = await p.evaluate(() => ({ pageHeight: document.documentElement.scrollHeight, overflow: document.documentElement.scrollWidth - innerWidth,
        firstPartTop: Math.round((document.querySelector('.sb-part, .sb-tl, .sb-cal') || document.body).getBoundingClientRect().top + scrollY) }));
      notes.push({ design: k, width: w, ...m });
      await p.screenshot({ path: path.join(out, 'records-' + k + '-' + w + '-first.png') });
      // the whole page, with the fixed tab bar hidden so it does not sit over the middle of a long picture
      await p.evaluate(() => document.body.classList.add('sb-shot'));
      await p.screenshot({ path: path.join(out, 'records-' + k + '-' + w + '.png'), fullPage: true });
      await p.context().close();
    }
  }
  fs.writeFileSync(path.join(out, 'records-measurements.json'), JSON.stringify({ source: 'Preview over the implemented admin panel, click-test stand-in, synthetic data, test fallback fonts', notes }, null, 2) + '\n');
  console.log(JSON.stringify(notes));
  await b.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
