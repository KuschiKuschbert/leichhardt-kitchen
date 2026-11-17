// Today finishes today (owner, 17 Nov 2026: "Build A"; docs/mascot-presence-options/brief.md, docs/kitchen-mascot.md).
// Lines written tonight for tomorrow sit on today's list under "Tonight, for tomorrow". With a real night list (a batch
// of today's own lines that started near the kitchen's usual night list) they leave today's counts: the header, Home,
// Closing soon, the start-here marks, the finished card and a section's finished words, so today's list can finish
// and the mascot shows. An afternoon batch, or no usual night known, changes nothing. Synthetic staff only.
const L = require('./lib');
const { R, ok } = L.results();
const H = 3600000, EVE = L.NOW + 6 * H, day = L.ymd(new Date(L.NOW)), key = p => ['kitchens', L.PIN].concat(p).join('/'), item = id => key(['days', day, 'items', id]);
const line = (text, station, o) => Object.assign({ text, station, qty: '', recipes: [], addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - H, done: false, deleted: false }, o || {});
const dn = (t, s, o) => line(t, s, Object.assign({ done: true, doneBy: 'Sam', doneById: 'sam', doneAt: L.NOW + 2 * H }, o || {}));
const TODAY = {
  i1: dn('Portion rump', 'Grill'), i2: dn('Marinate chicken', 'Grill'), i3: line('Skewer prawns', 'Grill'), i15: dn('Trim steaks', 'Grill'),
  i4: line('Reduce jus', 'Pans'), i5: line('Caramelise onions', 'Pans'), i6: dn('Blanch beans', 'Pans'),
  i7: dn('Cut chips', 'Fryers'), i8: dn('Crumb schnitzels', 'Fryers'), i9: dn('Batter mix', 'Fryers'),
  i10: dn('Pick herbs', 'Hot larder'), i11: dn('Wash leaves', 'Hot larder'), i12: dn('Slice tomatoes', 'Hot larder'), i13: line('Dressing', 'Hot larder'), i14: dn('Pickle onions', 'Hot larder')
};
const TMR = [['Portion lamb', 'Grill'], ['Prep mash', 'Pans'], ['Crumb calamari', 'Fryers'], ['Make aioli', 'Hot larder'], ['Pick parsley', 'Hot larder'], ['Braise cheeks', 'Pans']];
// at: the minute after midnight the batch starts (19:30 is tonight's list; 15:20 is a dinner batch)
function lines(at, n) {
  const out = {}; Object.keys(TODAY).forEach(id => { out[item(id)] = TODAY[id]; });
  TMR.slice(0, n == null ? 6 : n).forEach(([t, s], i) => { out[item('t' + (i + 1))] = line(t, s, { addedBy: 'Sam', addedById: 'sam', addedAt: Date.parse(day + 'T00:00:00+10:00') + (at + i * 2) * 60000 }); });
  return out;
}
function fixture(o = {}) {
  const cfg = L.seed()[key(['config', 'main'])];
  cfg.kitSecs = [{ id: 'grill', name: 'Grill' }, { id: 'pans', name: 'Pans' }, { id: 'fryers', name: 'Fryers' }, { id: 'hot', name: 'Hot larder' }];
  cfg.kitShifts = [{ id: 'dinner', name: 'Dinner', from: 900, to: 1380 }];
  const out = { [key(['config', 'main'])]: cfg, [key(['team', day])]: { day, on: [{ id: 'ann', sh: 'dinner', sec: 'pans' }, { id: 'sam', sh: 'dinner', sec: 'grill' }, { id: 'bo', sh: 'dinner', sec: 'fryers' }], br: [], v: 1, at: L.NOW - H, upd: L.NOW - H, by: 'sam' },
    ...lines(o.at == null ? 19 * 60 + 30 : o.at, o.n) };
  // the kitchen's usual night list, as the 03:00 job clocks it (summary/learned): 20:30
  if (o.usual !== false) out[key(['summary', 'learned'])] = { day, items: [], lists: { days: {}, dow: {}, usual: 20 * 60 + 30, n: 4 }, at: L.NOW - H };
  return out;
}
const realErrors = p => p.errors.filter(e => !/Failed to load resource/.test(e));
async function run(p, ms) { await p.clock.runFor(ms); await L.settle(p, 150); }
async function tick(p, id) { await p.click('button.nb-box[data-id="' + id + '"]'); await L.settle(p, 250); }
const view = p => p.evaluate(() => {
  const q = s => document.querySelector(s), r = e => { const b = e && e.getBoundingClientRect(); return b ? [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)] : null; };
  const card = q('.nb-left .nb-fin:not(.nb-fin-sec)'), th = q('.nb-left .nb-hd-tonight'), tmr = [...document.querySelectorAll('.nb-left .nb-rows.nb-tmr .nb-row')];
  return { prog: q('.nb-left .nb-prog')?.textContent || '', note: q('.nb-tmr-n')?.textContent || '', head: r(q('.nb-left .nb-ph')), tonight: th ? th.textContent : '',
    close: q('.nb-close p')?.textContent || '', card: card ? card.textContent : '', cardFirst: !!(card && th && (card.compareDocumentPosition(th) & Node.DOCUMENT_POSITION_FOLLOWING)),
    scene: !!(card && card.classList.contains('nb-scene')), tmrRows: tmr.length, secondTmrBottom: tmr[1] ? Math.round(tmr[1].getBoundingClientRect().bottom) : null, winH: innerHeight,
    tmrMarks: document.querySelectorAll('.nb-left .nb-rows.nb-tmr .nb-t[data-n], .nb-left .nb-rows.nb-tmr .nb-why').length, firstRow: r(q('.nb-left .nb-rows .nb-row')),
    secWords: q('.nb-left .nb-fin-sec .nb-fin-say')?.textContent || '', secFirst: !!(q('.nb-left .nb-fin-sec') && th && (q('.nb-left .nb-fin-sec').compareDocumentPosition(th) & Node.DOCUMENT_POSITION_FOLLOWING)),
    plain: [...document.querySelectorAll('.nb-left .nb-empty')].map(e => e.textContent).join(' | '), scroll: document.documentElement.scrollWidth - innerWidth };
});

(async () => {
  const b = await L.start(); let p = null;
  async function open(hash, o = {}) {
    p = await L.open(b, hash, { who: 'ann', width: o.width || 1920, height: o.height || 1080, wait: 1400, clock: EVE, extra: fixture(o) });
    await L.waitFor(p, () => !!document.querySelector('.nb-left .nb-prog, #rtitle'), null, 8000); await run(p, 400);
    return p;
  }
  async function step(label, task) {
    try { await task(); } catch (e) { ok(false, label + ': ' + String(e.message || e).split('\n')[0]); }
    finally { if (p) { ok(!realErrors(p).length, label + ': no browser errors ' + realErrors(p).join(' | ')); await p.context().close(); p = null; } }
  }

  await step('a night list: tomorrow’s lines are not today’s', async () => {
    await open('#/prep');
    const v = await view(p);
    ok(v.prog === '11 of 15 done', 'the header counts today’s 15 lines, not tomorrow’s 6: ' + v.prog);
    ok(v.note === '· 6 for tomorrow', 'and says how many are for tomorrow beside the day line: ' + v.note);
    ok(/6$/.test(v.tonight), 'Tonight, for tomorrow still shows its 6 lines: ' + v.tonight);
    ok(/^4 lines are still open/.test(v.close), 'Closing soon counts today’s open lines only: ' + v.close);
    ok(v.tmrMarks === 0, 'no start-here number or Waiting longest on tomorrow’s lines');
  });

  await step('the header keeps its height when tomorrow’s list arrives from another screen', async () => {
    await open('#/prep', { n: 5 });
    const a = await view(p);
    ok(a.prog === '11 of 20 done' && !a.note, 'five lines are not a night list yet: every line counts, as before: ' + a.prog);
    const [t, s] = TMR[5];
    await p.evaluate(([path, d]) => window.__fake.write(path, d), [item('t6'), line(t, s, { addedBy: 'Sam', addedById: 'sam', addedAt: Date.parse(day + 'T19:40:00+10:00') })]);
    await run(p, 600);
    const v = await view(p);
    ok(v.prog === '11 of 15 done' && v.note === '· 6 for tomorrow', 'the sixth line makes it a night list: ' + v.prog + ' ' + v.note);
    ok(JSON.stringify(v.head) === JSON.stringify(a.head) && JSON.stringify(v.firstRow) === JSON.stringify(a.firstRow), 'the header and the first row stay exactly where they were: ' + JSON.stringify([a.head, v.head, a.firstRow, v.firstRow]));
  });

  await step('today finishes: the card above tomorrow’s lines (1920 x 1080)', async () => {
    await open('#/prep');
    for (const id of ['i3', 'i4', 'i5', 'i13']) { await tick(p, id); await run(p, 9500); }
    await run(p, 1500);
    const v = await view(p);
    ok(v.prog === '15 of 15 done', 'the header says today is done: ' + v.prog);
    ok(/Every line for today ticked\. 15 of 15\./.test(v.card) && /Tomorrow’s 6 lines are below\.|Tomorrow's 6 lines are below\./.test(v.card), 'the finished card says it, and where tomorrow’s lines are: ' + v.card);
    ok(v.cardFirst, 'the card stands above Tonight, for tomorrow');
    ok(v.tmrRows === 6, 'tomorrow’s 6 lines are still there to tick tonight');
    ok(v.scene && v.secondTmrBottom !== null && v.secondTmrBottom <= v.winH - 80, 'on a wide screen the words are large, with tomorrow’s heading and two of its lines still in view: ' + JSON.stringify([v.scene, v.secondTmrBottom, v.winH]));
    ok(!/^\d+ lines? (is|are) still open/.test(v.close), 'Closing soon has no open line of today to count: ' + v.close);
    await L.waitFor(p, () => { const s = window.LK_MASCOT && window.LK_MASCOT.stillState && window.LK_MASCOT.stillState(); return !!s && s.plays === 1; }, null, 8000).then(() => ok(true, 'he plays Serve once on the screen whose tick finished today'), () => ok(false, 'he plays Serve once on the screen whose tick finished today'));
    ok(v.scroll <= 0, 'no sideways scroll');
  });

  await step('a section’s own tab finishes too', async () => {
    await open('#/prep');
    for (const id of ['i3', 'i4', 'i5', 'i13']) { await tick(p, id); await run(p, 9500); }
    await p.click('.nb-tab[data-v="Pans"]'); await run(p, 1200);
    const v = await view(p);
    ok(/Tonight, for tomorrow/.test(v.tonight) && /2$/.test(v.tonight), 'on the Pans tab, tomorrow’s 2 Pans lines sit under their own heading: ' + v.tonight);
    ok(/Pans are done\./.test(v.secWords) && v.secFirst, 'the tab says "Pans are done." large, above tomorrow’s lines: ' + v.secWords);
  });

  await step('Home counts today’s lines', async () => {
    await open('#/');
    await L.waitFor(p, () => !!document.querySelector('.hm-pc'), null, 8000);
    const h = await p.evaluate(() => ({ count: document.querySelector('.hm-pc').textContent, pans: document.querySelector('.hm-sec[data-hm-sec="Pans"] .hm-sl')?.textContent || '' }));
    ok(/^11 of 15 done$/i.test(h.count), 'Prep by section says 11 of 15, the header’s count: ' + h.count);
    ok(h.pans === '2 left', 'Pans has 2 of today’s lines left, not 4 with tomorrow’s: ' + h.pans);
  });

  await step('an afternoon batch of dinner lines is not tonight’s list', async () => {
    await open('#/prep', { at: 15 * 60 + 20 });
    const v = await view(p);
    ok(v.prog === '11 of 21 done' && !v.note, 'every line counts, as before: ' + v.prog);
  });

  await step('no usual night list known yet: as before', async () => {
    await open('#/prep', { usual: false });
    const v = await view(p);
    ok(v.prog === '11 of 21 done' && !v.note, 'every line counts, as before: ' + v.prog);
  });

  await step('a phone: the small card above tomorrow’s lines', async () => {
    await open('#/prep', { width: 390, height: 844 });
    for (const id of ['i3', 'i4', 'i5', 'i13']) { await tick(p, id); await run(p, 9500); }
    await run(p, 1500);
    const v = await view(p);
    ok(/Every line for today ticked\. 15 of 15\./.test(v.card) && v.cardFirst && !v.scene, 'the small card says it above Tonight, for tomorrow: ' + v.card);
    ok(v.scroll <= 0, 'no sideways scroll');
  });

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
