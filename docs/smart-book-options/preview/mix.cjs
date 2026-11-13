/* Review-only combined previews (the council's mix for each set), round 2. Drawn over the real book on the click
   tests' stand-in with made-up people and records. Nothing here is in the book.
   Run from tests/: cp ../docs/smart-book-options/preview/mix.cjs zz-sbm.test.js && CHROME=... npm test -- zz-sbm; rm zz-sbm.test.js */
const path = require('path'), fs = require('fs');
const root = path.resolve(process.cwd(), '..');
const L = require(path.join(root, 'tests/lib'));
const out = path.join(root, 'docs/smart-book-options/evidence');
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/* ---------- Set 1 mix: the month as a list of days, a tapped day in time order ---------- */
// November 2026: 1 Nov is a Sunday. The stand-in's today is Saturday 14 Nov; finished days are 1 to 13.
// Cooling has been saved since Tuesday 3 Nov in this made-up story (the day the dated copy shipped).
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS = [];
for (let n = 13; n >= 1; n--) {
  const wd = WD[(n - 1) % 7], miss = { 6: ['Walk-in shelves'], 7: ['Fryer oil change', 'Cool room floor'], 12: ['Hood filters'] }[n] || [], unable = n === 7 ? 1 : 0;
  const del = n === 13 ? null : n === 7 ? 3 : [1, 4, 8].includes(n) ? 0 : (n % 3) + 1;
  const cool = n < 3 ? 'none' : n === 9 ? 'nobatch' : n === 11 ? '1of2' : '2of2';
  DAYS.push({ n, wd, del, miss, unable, cool, counted: n !== 13, nopass: n === 9 });
}
const coolWords = c => c === 'none' ? 'Cooling: no record before 3 Nov' : c === 'nobatch' ? 'Cooling: no batch started' : c === '1of2' ? '<span class="sb-adv">Cooling: 1 of 2 stages recorded</span>' : 'Cooling: 2 of 2 stages recorded';
const dayRow = (d, sel) => '<li><button type="button" class="sb-dayrow' + (sel ? ' sel' : '') + '"' + (sel ? ' aria-current="true"' : '') + '><span class="d"><b>' + d.wd + ' ' + d.n + '</b></span><span class="t">' +
  (!d.counted ? '<span class="sb-wait">Count not ready.</span> The nightly run has not counted this day yet. Open the day to read it.' :
    (d.del === 1 ? '1 delivery' : d.del + ' deliveries') + ' · ' + (d.miss.length ? '<span class="sb-adv">Cleaning: ' + d.miss.length + ' missed</span>' : 'Cleaning: 0 missed') + (d.unable ? ', ' + d.unable + ' not possible' : '') + (d.nopass ? ', <span class="sb-adv">no Pass check</span>' : '') + ' · ' + coolWords(d.cool)) +
  '</span><span class="go" aria-hidden="true">›</span></button></li>';
const month = sel => '<div class="sb-month"><div class="sb-head"><h4 class="a-ch-h">November 2026</h4><div class="sb-actions"><button type="button" class="chip">‹ October</button><button type="button" class="chip" disabled>December ›</button><button type="button" class="chip">Print this month</button><button type="button" class="chip">Export CSV</button></div></div>' +
  '<p class="hint">Each finished day: deliveries recorded, cleaning missed and not possible, cooling stages recorded. Counted by the nightly run to Thu 12 Nov. Temperatures as recorded; the book sets no limits until the head chef confirms them. Equipment temperature logs are not in the book.</p>' +
  '<ul class="sb-days">' + DAYS.map(d => dayRow(d, sel && d.n === 7)).join('') + '</ul></div>';
const SAT = {
  fs: [['07:42', 'Delivery', 'Bidfood · <b>3.1 °C chilled</b> · Ann'], ['09:05', 'Delivery', 'Fresh produce · <b>4.0 °C chilled</b> · Ann'], ['10:20', 'Delivery', 'Seafood · <b>1.8 °C chilled, -19.5 °C frozen</b> · Bo'],
    ['14:05', 'Cooling', 'Batch started · Bo'], ['16:07', 'Cooling', '2 hour stage recorded in Operandio · Bo'], ['18:12', 'Cooling', '4 hour stage recorded in Operandio · Ann'],
    ['22:10', 'Cleaning', 'Pass check by Sam · 31 done · <span class="sb-adv">2 missed: Fryer oil change, Cool room floor</span> · 1 not possible: Hood filters (No degreaser)']],
  more: [['11:02', 'Wastage, time logged', 'Rice 1 portion · Expired stock · Pans · Ann'], ['13:40', 'Order', 'Bidfood order recorded, 22 items · Sam'], ['15:10', 'Wastage, time logged', 'Brisket 0.5 kg · Excess production · Smoker · Bo'],
    ['18:00', 'Function', 'Smith 60th · 60 guests · Function room · 2 rounds'], ['21:30', 'Wastage, time logged', 'Chips 2 kg · Excess production · Fryer · Bo']]
};
function dayView(all, phone) {
  const ev = SAT.fs.concat(all ? SAT.more : []).sort((a, b) => a[0] < b[0] ? -1 : 1);
  return '<div class="sb-dayv">' + (phone ? '<button type="button" class="chip sb-back">Back to November</button>' : '') +
    '<div class="sb-head"><h4 class="sb-dt">Saturday 7 November</h4><div class="sb-actions"><button type="button" class="chip">‹ Fri 6</button><button type="button" class="chip">Sun 8 ›</button><button type="button" class="chip">Print this day</button></div></div>' +
    '<div class="chiprow" role="group" aria-label="Show"><button type="button" class="chip" aria-pressed="' + !all + '">Food safety</button><button type="button" class="chip" aria-pressed="' + all + '">Everything</button></div>' +
    (all ? '<p class="sb-line">Shown: deliveries, cooling, cleaning, wastage, orders, functions, prep, team.</p><div class="sb-bad" role="alert"><span>Transfers could not load. Transfers may have moved; they are not shown.</span><button type="button" class="chip">Try again</button></div>' +
      '<p class="sb-line"><b>Team (the plan):</b> Lunch: Ann Larder, Bo Grill, Sam Pass. Dinner: Ann Larder, Bo Fryer, Sam Pass.</p><p class="sb-line"><b>Prep:</b> 42 lines written, 39 ticked, 3 rolled to Sunday.</p>'
      : '<p class="sb-line">All three shown: deliveries, cooling, cleaning.</p>') +
    '<ol class="sb-tl">' + ev.map(e => '<li><time>' + e[0] + '</time><span class="k">' + e[1] + '</span><span>' + e[2] + '</span></li>').join('') + '</ol>' +
    '' + '</div>';
}
const S1CSS = `
.sb-wrap1{display:grid;grid-template-columns:minmax(0,1fr);gap:1rem}
@media (min-width:1100px){.sb-wrap1.two{grid-template-columns:minmax(300px,380px) minmax(0,1fr);align-items:start}.sb-wrap1.two .sb-dayv{border-left:1px solid var(--line);padding-left:1rem}}
.sb-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.5rem}
.sb-actions{display:flex;flex-wrap:wrap;gap:.5rem}
.sb-days{list-style:none;margin:.3rem 0 0;padding:0}
.sb-dayrow{display:grid;grid-template-columns:4.2rem 1fr 1rem;gap:.5rem;align-items:center;width:100%;min-height:56px;padding:.45rem .5rem;border:0;border-bottom:1px solid var(--line);background:none;text-align:left;font:500 .875rem/1.35 var(--body);color:var(--ink);cursor:pointer}
.sb-dayrow .d b{font:700 1rem var(--display)}
.sb-dayrow .go{color:var(--muted);font-size:1.25rem}
.sb-dayrow.sel{background:var(--surface-reference);box-shadow:inset 3px 0 0 var(--ink)}
.sb-adv{color:var(--bad-ink);font-weight:700}
.sb-wait{color:var(--muted);font-weight:700}
.sb-pick{padding:1rem;border:1.5px dashed var(--line);border-radius:8px;color:var(--muted)}
.sb-dt{margin:0;font:700 1.35rem var(--display)}
.sb-line{margin:.25rem 0;font-size:.9375rem}
.sb-bad{margin:.3rem 0;padding:.5rem .7rem;border-left:3px solid var(--bad-ink);background:var(--bad-tint);color:var(--bad-ink);font-weight:700;font-size:.875rem;display:flex;justify-content:space-between;align-items:center;gap:.6rem}
.sb-tl{list-style:none;margin:.4rem 0 0;padding:0}
.sb-tl li{display:grid;grid-template-columns:3.4rem 5.4rem 1fr;gap:.6rem;padding:.5rem 0;border-bottom:1px solid var(--line);font-size:.9375rem;align-items:baseline}
.sb-tl li time{font-variant-numeric:tabular-nums;font-weight:700}
.sb-tl li .k{font:700 .75rem var(--display);letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
@media (max-width:640px){.sb-tl li{grid-template-columns:3.2rem 1fr}.sb-tl li .k{grid-column:2}.sb-tl li span:last-child{grid-column:2}}
.sb-back{margin-bottom:.4rem}
.sb-shot .tabbar{display:none!important}
`;
/* ---------- Set 2 mix: fill what describes it, the cook writes the amount ---------- */
const extra = Object.assign({}, L.wasteSum([
  { t: 'Chips', n: 3, r: { excess: 3 }, unit: 'kg', reason: 'excess', sec: 'Fryer', amt: 2, last: { unit: 'kg', reason: 'excess', sec: 'Fryer', amt: 2 } },
  { t: 'Brisket', n: 2, r: { excess: 2 }, unit: 'kg', reason: 'excess', sec: 'Smoker', amt: 0.5, last: { unit: 'kg', reason: 'excess', sec: 'Smoker', amt: 0.5 } }
]));
extra[key(['ordlearned', 'duck-fat'])] = { text: 'Duck fat', uses: 6, dow: {}, qtys: { a: { q: '2 tubs', n: 5 } } };
const S2CSS = `
.sb-in{position:relative;display:flex;min-width:0}
.sb-in>input{flex:1 1 auto;width:100%}
.sb-in.has-tag>input{padding-right:5.6rem!important}
.sb-tag{display:inline-flex;align-items:center;min-height:20px;padding:0 .35rem;border:1.5px solid var(--muted);border-radius:4px;background:var(--paper);color:var(--ink);font:700 .6875rem/1 var(--display);letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}
.sb-in .sb-tag{position:absolute;right:.35rem;top:50%;transform:translateY(-50%)}
label .sb-tag,.nb-ql .sb-tag{margin-left:.4rem;vertical-align:.1em}
.sb-filled{background:var(--surface-reference)!important}
.sb-fill{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem .6rem;margin:.25rem 12px .5rem;padding:.5rem .65rem;border-left:3px solid var(--ink);background:var(--surface-reference);font-size:.9375rem;line-height:1.35}
.sb-fill p{margin:0;flex:1 1 14rem}
.sb-fill .chip{min-height:44px}
.sb-weigh{outline:2.5px solid var(--accent);outline-offset:1px}
.sb-why{margin:0 .6rem 0 0;align-self:center;font-size:.875rem;font-weight:700;color:var(--ink)}
`;
function wasteMix(p, typed) {
  return p.evaluate(([css, typed]) => {
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const q = s => document.querySelector(s), row = q('.w-add .nb-add-row');
    const wrap = (inp, tag) => { const w = document.createElement('span'); w.className = 'sb-in'; w.style.flex = getComputedStyle(inp).flex; inp.parentNode.insertBefore(w, inp); w.appendChild(inp); if (tag) { w.classList.add('has-tag'); w.insertAdjacentHTML('beforeend', '<span class="sb-tag" aria-hidden="true">Last time</span>'); } };
    const sec = q('#w-sec'); sec.value = 'Fryer'; sec.classList.add('sb-filled'); sec.setAttribute('aria-describedby', 'sb-fill'); wrap(sec, true);
    const amt = q('#w-amt'); amt.placeholder = 'Amount (kg)'; wrap(amt, false);
    if (typed) amt.value = '1.5'; else amt.classList.add('sb-weigh');
    const chips = q('.sec-chips'), lab = chips.querySelector('.nb-ql');
    lab.insertAdjacentHTML('afterend', '<button type="button" class="chip" aria-pressed="true">Fryer</button>');
    q('[data-p="wreason"][data-v="excess"]').setAttribute('aria-checked', 'true');
    q('#w-reason-l').insertAdjacentHTML('beforeend', '<span class="sb-tag">Last time</span>');
    row.insertAdjacentHTML('afterend', '<div class="sb-fill" id="sb-fill" role="status"><p><b>Last time</b> (logged 3 times in the last 2 weeks): Fryer, Excess production, in kg. ' + (typed ? 'Change anything before you log it.' : 'Weigh or count it and write today’s amount.') + '</p><button type="button" class="chip">Empty these boxes</button></div>');
    const b = q('.nb-addbtn');
    if (typed) b.textContent = 'Log 1.5 kg Chips';
    else { b.textContent = 'Log Chips'; b.setAttribute('disabled', ''); b.insertAdjacentHTML('beforebegin', '<span class="sb-why">Write the amount first.</span>'); }
  }, [S2CSS, typed]);
}
function ordersMix(p) {
  return p.evaluate(css => {
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const q = s => document.querySelector(s), qty = q('#o-qty');
    const before = [...document.querySelectorAll('.o-sheet *')].filter(e => e.children.length === 0 && /Usual amount filled in/.test(e.textContent)).map(e => e.textContent.trim());
    document.querySelectorAll('.o-sheet *').forEach(e => { if (e.children.length === 0 && /Usual amount filled in/.test(e.textContent)) e.textContent = e.textContent.replace(/Usual amount filled in: [^.]*\. ?/, ''); });
    qty.value = '2 tubs'; qty.classList.add('sb-filled');
    document.querySelectorAll('.o-sheet .nb-sugg, .o-sheet .nb-ql').forEach(e => { const r = e.closest('.nb-sugg') || e.parentElement; if (r && /Add 2 tubs/.test(r.textContent) && /usual amount/i.test(r.textContent)) r.style.display = 'none'; });
    const w = document.createElement('span'); w.className = 'sb-in'; w.style.flex = getComputedStyle(qty).flex; qty.parentNode.insertBefore(w, qty); w.appendChild(qty); w.classList.add('has-tag'); w.insertAdjacentHTML('beforeend', '<span class="sb-tag" aria-hidden="true">Usual</span>');
    (qty.closest('.nb-add-row') || w.parentElement).insertAdjacentHTML('afterend', '<div class="sb-fill" role="status"><p><b>Filled with the usual amount:</b> 2 tubs (ordered 5 times with this amount). Change it if you need more or less.</p></div>');
    return { before, header: ((document.querySelector('.p-count, .nb-count, [class*="count"]') || {}).textContent || '').trim().slice(0, 40) };
  }, S2CSS);
}
(async () => {
  const b = await L.start(), notes = [];
  // Set 1
  const shots = [['month', 1280, 'two-none'], ['month', 1280, 'two-fs'], ['month', 1280, 'two-all'], ['month', 768, 'list'], ['day', 768, 'fs'], ['month', 390, 'list'], ['day', 390, 'fs'], ['day', 390, 'all']];
  for (const [kind, w, v] of shots) {
    const p = await L.open(b, '#/admin', { admin: true, adminPage: '', width: w, height: w === 390 ? 844 : 900, wait: 2500 });
    await L.adminTab(p, 'waste'); await L.settle(p, 600);
    const html = '<section class="set-block"><h3 class="a-title">Records</h3>' +
      (v === 'two-none' ? '<div class="sb-wrap1 two">' + month(false) + '<div class="sb-dayv"><p class="sb-pick">Pick a day to read its records.</p></div></div>' : v.startsWith('two') ? '<div class="sb-wrap1 two">' + month(true) + dayView(v === 'two-all', false) + '</div>' : kind === 'month' ? '<div class="sb-wrap1">' + month(false) + '</div>' : '<div class="sb-wrap1">' + dayView(v === 'all', true) + '</div>') + '</section>';
    await p.evaluate(([css, html]) => {
      const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
      const tabs = document.querySelector('.a-tabs');
      tabs.querySelectorAll('[aria-pressed]').forEach(x => x.setAttribute('aria-pressed', 'false'));
      const t = document.createElement('button'); t.type = 'button'; t.className = 'a-tab'; t.setAttribute('aria-pressed', 'true'); t.textContent = 'Records'; tabs.insertBefore(t, tabs.children[1]);
      document.querySelector('.a-pane').innerHTML = html;
    }, [S1CSS, html]);
    await L.settle(p, 300);
    const m = await p.evaluate(() => { const f = document.querySelector('.sb-dayrow, .sb-tl li'); return { pageHeight: document.documentElement.scrollHeight, overflow: document.documentElement.scrollWidth - innerWidth, firstRecordTop: f ? Math.round(f.getBoundingClientRect().top + scrollY) : null, rowsOnFirstScreen: [...document.querySelectorAll('.sb-dayrow, .sb-tl li')].filter(e => e.getBoundingClientRect().bottom <= innerHeight).length }; });
    const name = 'mix-records-' + kind + '-' + v + '-' + w;
    notes.push({ set: 1, name, width: w, ...m });
    await p.screenshot({ path: path.join(out, name + '-first.png') });
    await p.evaluate(() => document.body.classList.add('sb-shot'));
    await p.screenshot({ path: path.join(out, name + '.png'), fullPage: true });
    await p.context().close();
  }
  // Set 2
  for (const [typed, w] of [[false, 390], [true, 390], [false, 768], [false, 1280]]) {
    const p = await L.open(b, '#/waste', { who: 'bo', extra, width: w, height: w === 390 ? 844 : 900, wait: 2000, touch: true });
    await L.wLog(p); await p.fill('#w-text', 'Chips'); await L.settle(p, 400);
    await wasteMix(p, typed); await L.settle(p, 200);
    const m = await p.evaluate(() => { const v = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { top: Math.round(r.top), onFirstScreen: r.top >= 0 && r.bottom <= innerHeight }; };
      return { line: v('.sb-fill'), weigh: v('#w-amt'), log: v('.nb-addbtn'), why: v('.sb-why'), clear: (() => { const e = document.querySelector('.sb-fill .chip'); return e ? Math.round(e.getBoundingClientRect().height) : null; })(), overflow: document.documentElement.scrollWidth - innerWidth }; });
    const name = 'mix-fill-' + (typed ? 'typed' : 'start') + '-' + w;
    notes.push({ set: 2, name, width: w, ...m });
    await p.screenshot({ path: path.join(out, name + '.png') });
    if (w === 390) { await p.evaluate(() => document.querySelector('.nb-addbtn').scrollIntoView({ block: 'end' })); await L.settle(p, 200); await p.screenshot({ path: path.join(out, name + '-log.png') }); }
    await p.context().close();
  }
  {
    const p = await L.open(b, '#/orders', { who: 'ann', extra, width: 390, height: 844, wait: 2000, touch: true });
    const head = await p.evaluate(() => (document.querySelector('main') || document.body).innerText.match(/\d+ of \d+ ordered/));
    await L.oLog(p); await p.fill('#o-text', 'Duck fat'); await L.settle(p, 400);
    const r = await ordersMix(p); await L.settle(p, 200);
    notes.push({ set: 2, name: 'mix-fill-orders-390', todayWords: r.before, orderHeader: head && head[0] });
    await p.screenshot({ path: path.join(out, 'mix-fill-orders-390.png') });
    await p.context().close();
  }
  fs.writeFileSync(path.join(out, 'mix-measurements.json'), JSON.stringify({ source: 'Preview over the implemented admin panel and work sheets, click-test stand-in, synthetic data, test fallback fonts', notes }, null, 2) + '\n');
  console.log(JSON.stringify(notes));
  await b.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
