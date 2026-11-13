/* Review-only previews for "filled for you" (I1 with I4), round 2. Drawn over the real Wastage and Orders sheets on
   the click tests' stand-in, with made-up people and records. Nothing here is in the book.
   Run from tests/: cp ../docs/smart-book-options/preview/fill.cjs zz-sbf.test.js && CHROME=... npm test -- zz-sbf; rm zz-sbf.test.js */
const path = require('path'), fs = require('fs');
const root = path.resolve(process.cwd(), '..');
const L = require(path.join(root, 'tests/lib'));
const out = path.join(root, 'docs/smart-book-options/evidence');
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const extra = Object.assign({}, L.wasteSum([
  { t: 'Chips', n: 3, r: { excess: 3 }, unit: 'kg', reason: 'excess', sec: 'Fryer', amt: 2, last: { unit: 'kg', reason: 'excess', sec: 'Fryer', amt: 2 } },
  { t: 'Brisket', n: 2, r: { excess: 2 }, unit: 'kg', reason: 'excess', sec: 'Smoker', amt: 0.5, last: { unit: 'kg', reason: 'excess', sec: 'Smoker', amt: 0.5 } }
]));
extra[key(['ordlearned', 'duck-fat'])] = { text: 'Duck fat', uses: 6, dow: {}, qtys: { a: { q: '2 tubs', n: 5 } } };
const STYLE = `
.sb-tag{display:inline-flex;align-items:center;min-height:20px;margin-left:.4rem;padding:0 .35rem;border:1.5px solid var(--muted);border-radius:4px;background:var(--paper);color:var(--ink);font:700 .6875rem/1 var(--display);letter-spacing:.08em;text-transform:uppercase;vertical-align:.1em}
.sb-filled{background:var(--surface-reference)!important;font-style:italic}
.sb-fill{margin:.25rem 12px .5rem;padding:.5rem .65rem;border-left:3px solid var(--ink);background:var(--surface-reference);font-size:.9375rem;line-height:1.35}
.sb-fill strong{font-weight:700}
.sb-fill button{margin-left:.25rem;border:0;background:none;padding:0;font:inherit;font-weight:700;text-decoration:underline;color:var(--ink);min-height:24px}
.sb-use{display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:calc(100% - 24px);margin:.25rem 12px .5rem;min-height:52px;padding:.45rem .75rem;border:1.5px solid var(--ink);border-radius:8px;background:var(--paper);text-align:left;cursor:pointer;color:var(--ink)}
.sb-use strong{font:700 1rem var(--body)}
.sb-use span{font-size:.8125rem;color:var(--muted)}
.sb-weigh{outline:2.5px solid var(--accent);outline-offset:1px}
`;
// The same item and record in every design: Chips, logged 3 times in the last 2 weeks, last 2 kg, Excess production, Fryer.
const LINE = 'Fryer · 2 kg · Excess production';
function fillAll(p, opts) {
  return p.evaluate(([css, o]) => {
    if (!document.getElementById('sb-css')) { const st = document.createElement('style'); st.id = 'sb-css'; st.textContent = css; document.head.appendChild(st); }
    const q = s => document.querySelector(s), form = q('.w-add'), row = form.querySelector('.nb-add-row');
    const setv = (sel, v, tag) => { const el = q(sel); el.value = v; if (tag) el.classList.add('sb-filled'); };
    const tagOn = (lab) => { const l = q(lab); if (l && !l.querySelector('.sb-tag')) l.insertAdjacentHTML('beforeend', '<span class="sb-tag">Filled</span>'); };
    const sec = () => { const chips = q('.sec-chips'); if (!chips.querySelector('[data-v="Fryer"]')) chips.insertAdjacentHTML('beforeend', '<button type="button" class="chip" aria-pressed="true">Fryer</button>'); };
    const reason = () => { q('[data-p="wreason"][data-v="excess"]').setAttribute('aria-checked', 'true'); tagOn('#w-reason-l'); };
    const unit = () => tagOn('#w-unit-l');
    if (o.mode === 'a' || o.mode === 'b-after') {
      setv('#w-sec', 'Fryer', 1); setv('#w-amt', '2', 1); sec(); reason(); unit();
      row.insertAdjacentHTML('afterend', '<p class="sb-fill" role="status"><strong>Filled from last time:</strong> ' + o.line + '. Change any of it before Log it.' + (o.mode === 'b-after' ? '<button type="button">Undo fill</button>' : '') + '</p>');
      q('.nb-addbtn').textContent = 'Log 2 kg Chips';
    }
    if (o.mode === 'b') {
      row.insertAdjacentHTML('afterend', '<button type="button" class="sb-use"><strong>Use last time: ' + o.line + '</strong><span>Chips was logged 3 times in the last 2 weeks.</span></button>');
    }
    if (o.mode === 'c' || o.mode === 'c-after') {
      setv('#w-sec', 'Fryer', 1); sec(); reason(); unit();
      const amt = q('#w-amt'); amt.placeholder = 'Weigh it'; amt.classList.add('sb-weigh');
      if (o.mode === 'c-after') { amt.value = '1.5'; amt.classList.remove('sb-weigh'); }
      row.insertAdjacentHTML('afterend', '<p class="sb-fill" role="status"><strong>Filled from last time:</strong> Fryer · kg · Excess production. ' + (o.mode === 'c-after' ? 'Change any of it before Log it.' : 'Weigh it and write the amount. Last time was 2 kg.') + '</p>');
      const b = q('.nb-addbtn'); if (o.mode === 'c') { b.textContent = 'Log Chips'; b.setAttribute('disabled', ''); } else b.textContent = 'Log 1.5 kg Chips';
    }
  }, [STYLE, Object.assign({ line: LINE }, opts)]);
}
function orders(p, mode) {
  return p.evaluate(([css, mode]) => {
    if (!document.getElementById('sb-css')) { const st = document.createElement('style'); st.id = 'sb-css'; st.textContent = css; document.head.appendChild(st); }
    const q = s => document.querySelector(s), qty = q('#o-qty'), row = qty.closest('.nb-add-row') || qty.parentElement;
    // remove today's own "Usual amount filled in" words: each design says it in its own way
    document.querySelectorAll('.o-sheet .hint, .o-sheet .nb-hint').forEach(h => { if (/Usual amount filled in/.test(h.textContent)) h.textContent = h.textContent.replace(/Usual amount filled in: [^.]*\. ?/, ''); });
    if (mode === 'a') { qty.value = '2 tubs'; qty.classList.add('sb-filled'); row.insertAdjacentHTML('afterend', '<p class="sb-fill" role="status"><strong>Filled:</strong> 2 tubs, the usual amount. Change it if you need more or less.</p>'); }
    if (mode === 'b') { qty.value = ''; row.insertAdjacentHTML('afterend', '<button type="button" class="sb-use"><strong>Use the usual: 2 tubs</strong><span>Ordered 5 times with this amount.</span></button>'); }
    if (mode === 'c') { qty.value = ''; qty.placeholder = 'Usually 2 tubs'; row.insertAdjacentHTML('afterend', '<p class="sb-fill" role="status">Usually 2 tubs. Write how much you need.</p>'); }
  }, [STYLE, mode]);
}
async function measure(p) {
  return p.evaluate(() => {
    const vis = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), onFirstScreen: r.top >= 0 && r.bottom <= innerHeight }; };
    return { fill: vis('.sb-fill') || vis('.sb-use'), reason: vis('[data-p="wreason"][data-v="excess"]'), log: vis('.nb-addbtn'), overflow: document.documentElement.scrollWidth - innerWidth };
  });
}
(async () => {
  const b = await L.start(), notes = [];
  const states = [['a', 'a'], ['b', 'b'], ['b-after', 'b-after'], ['c', 'c'], ['c-after', 'c-after']];
  for (const [name, mode] of states) {
    for (const w of [390, 768, 1280]) {
      if ((name === 'b-after' || name === 'c-after') && w !== 390) continue;
      const p = await L.open(b, '#/waste', { who: 'bo', extra, width: w, height: w === 390 ? 844 : 900, wait: 2000, touch: true });
      await L.wLog(p); await p.fill('#w-text', 'Chips'); await L.settle(p, 400);
      await fillAll(p, { mode }); await L.settle(p, 200);
      notes.push({ design: name, page: 'waste', width: w, ...(await measure(p)) });
      await p.screenshot({ path: path.join(out, 'fill-' + name + '-' + w + '.png') });
      await p.context().close();
    }
  }
  for (const mode of ['a', 'b', 'c']) {
    const p = await L.open(b, '#/orders', { who: 'ann', extra, width: 390, height: 844, wait: 2000, touch: true });
    await L.oLog(p); await p.fill('#o-text', 'Duck fat'); await L.settle(p, 400);
    await orders(p, mode); await L.settle(p, 200);
    notes.push({ design: mode, page: 'orders', width: 390, ...(await measure(p)) });
    await p.screenshot({ path: path.join(out, 'fill-' + mode + '-orders-390.png') });
    await p.context().close();
  }
  fs.writeFileSync(path.join(out, 'fill-measurements.json'), JSON.stringify({ source: 'Preview over the implemented Wastage and Orders sheets, click-test stand-in, synthetic data, test fallback fonts', notes }, null, 2) + '\n');
  console.log(JSON.stringify(notes));
  await b.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
