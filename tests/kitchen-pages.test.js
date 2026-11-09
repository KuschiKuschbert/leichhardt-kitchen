// The chef hat as a list and the kitchen pages in the new look (redesign step 7, head chef 8 Nov 2026,
// docs/whole-app-redesign-options/brief.md, Build step 7, and every-page.html). The hat: Every day, then More, one row
// each, Settings last. Shift pings as an inbox (a dot until read, who it is for and from, the time). The drinks run's
// order as a docket first. Minutes: Signing as and Not you? beside Sign. A guide step by step (opens on All steps; Back
// and Next; no reads). Today's team at a glance above the plan. Manage staff: a row each with the role and what they may
// do. Nothing here reads more than before.
const L = require('./lib');
const { R, ok } = L.results(), { txt, tap } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW));
const bill = p => p.evaluate(() => window.__fake.bill.reduce((n, x) => n + x.n, 0));
const ping = (id, text, x) => ({ [fsKey(['notes', id])]: Object.assign({ text, tag: 'none', start: today, until: today, dows: [], tm: 835, removed: false, at: 1, by: 'sam', author: 'sam' }, x || {}) });
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
  { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
  { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, active: true }
];
const teamSeed = {
  [fsKey(['config', 'main'])]: { people, sousIds: ['sam'], pingIds: ['sam'], staffIds: ['sam', 'ann', 'bo'], showBadges: true,
    kitSecs: [{ id: 'grill', name: 'Grill', off: false }, { id: 'larder', name: 'Larder', off: false }],
    kitShifts: [{ id: 'lunch', name: 'Lunch', from: 600, to: 900, off: false }, { id: 'long', name: 'Long day', from: 600, to: 1320, off: false }] },
  [fsKey(['team', today])]: { day: today, on: [{ id: 'ann', sh: 'lunch', sec: 'grill' }, { id: 'bo', sh: 'long', sec: 'larder' }],
    br: [{ id: 'ann', sh: 'lunch', at: 780, len: 30 }, { id: 'bo', sh: 'long', at: 870, len: 180 }], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' }
};
(async () => {
  const b = await L.start();
  let p;

  // the chef hat as a list: Every day, then More, Settings last; rows the menu's width, the small line on the right
  p = await L.open(b, '#/recipes', { who: 'sam', width: 390, height: 844, wait: 1600 });
  await p.click('.wtop-who'); await L.settle(p, 300);
  let hat = await p.evaluate(() => {
    const m = document.querySelector('.wm'), mr = m.getBoundingClientRect();
    const heads = [...m.querySelectorAll('.wm-sh')].map(e => e.textContent.trim());
    const rows = [...m.querySelectorAll('.wm-tile')].map(e => { const r = e.getBoundingClientRect(), s = e.querySelector('small'); return { w: Math.round(r.width), h: Math.round(r.height), small: s ? Math.round(r.right - s.getBoundingClientRect().right) : null, t: e.querySelector('b').textContent }; });
    const all = [...m.querySelectorAll('.wm-a')], last = all[all.length - 1];
    return { heads, rows, last: last && last.classList.contains('wm-set'), mw: Math.round(mr.width) };
  });
  ok(hat.heads.join('|') === 'Every day|More', 'hat: two groups, Every day then More (' + hat.heads.join(', ') + ')');
  ok(hat.rows.length === 14 && ['Sous chef panel', 'Kitchen cleaning', 'Guides'].every(t => hat.rows.some(r => r.t === t)) && hat.rows.every(r => r.h >= 44 && r.w >= hat.mw - 40) && hat.last, 'hat: fourteen rows including the chef panel, Kitchen cleaning and Guides, each the width of the menu, 44 px or more, Settings last (' + JSON.stringify(hat.rows.map(r => [r.w, r.h])) + ')');
  const team = hat.rows.filter(r => r.t === 'Today\'s team')[0];
  ok(!!team && team.small !== null && team.small < 40, 'hat: Today\'s team\'s Not set yet sits at the right of its row (' + JSON.stringify(team) + ')');
  ok(!(await L.overflow(p)) && p.errors.length === 0, 'hat 390: no sideways scroll, no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Shift pings as an inbox: a dot until read, the words, who it is for and from, the time; a Safety ping keeps its tag
  p = await L.open(b, '#/recipes', { who: 'ann', extra: Object.assign(ping('n1', 'Fryer 2 is down. Use fryer 1.'), ping('n2', 'Walk-in door sticks.', { tag: 'safety', tm: 820 })), wait: 2000 });
  await L.waitFor(p, () => !!document.querySelector('.nt .nt-i')).catch(() => {});
  let rows = await p.$$eval('.nt .nt-i', l => l.map(e => ({ news: e.classList.contains('is-new'), dot: !!e.querySelector('.nt-dot'), meta: (e.querySelector('.nt-meta') || {}).textContent, at: (e.querySelector('.nt-at') || {}).textContent, text: e.querySelector('p').textContent })));
  ok(rows.length === 2 && rows.every(r => r.news && r.dot), 'pings: both rows have the dot while not read (' + JSON.stringify(rows) + ')');
  const fr = rows.filter(r => /Fryer 2/.test(r.text))[0] || {}, wk = rows.filter(r => /Walk-in/.test(r.text))[0] || {};
  ok(fr.meta === 'Everyone · from Sam' && fr.at === '13:55', 'pings: who it is for and from, and its time (' + fr.meta + ', ' + fr.at + ')');
  ok(/^Safety Everyone · from Sam$/.test(wk.meta || '') && wk.at === '13:40', 'pings: a Safety ping keeps its tag (' + wk.meta + ')');
  await p.click('.nt-got'); await L.settle(p, 300);
  await p.click('[data-note="open"]'); await L.settle(p, 400);
  rows = await p.$$eval('.nt .nt-i', l => l.map(e => e.classList.contains('is-new')));
  ok(rows.length === 2 && rows.every(x => !x), 'pings: once Got it, the bell shows them with no dot');
  ok(p.errors.length === 0, 'pings: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the drinks run: the order as a docket first, with how many drinks for how many people, then who is on today
  p = await L.open(b, '#/drinks', { who: 'ann', wait: 1600 });
  await L.waitFor(p, () => !!document.querySelector('.dr-run')).catch(() => {});
  const dr = await p.evaluate(() => { const run = document.querySelector('.dr-run'), h = document.querySelector('.dr-h'); return { first: !!run && !!h && !!(run.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING), n: (document.querySelector('.dr-oh .dr-n') || {}).textContent }; });
  ok(dr.first && /^\d+ drinks? · \d+ (person|people)$/.test(dr.n || ''), 'drinks: the order first, with its count (' + JSON.stringify(dr) + ')');
  ok(/you're in/.test(await txt(p, '.dr-mine .label') || ''), 'drinks: your usual says you are in');
  await p.context().close();

  // minutes: Signing as and Not you? beside the Sign button, not in the top bar
  const pub = { [fsKey(['minutes', 'm1'])]: { no: 1, v: 1, status: 'published', date: L.ymd(new Date(L.NOW - 86400000)), start: '14:00', loc: 'Kitchen', chair: 'sam', taker: 'sam',
    att: [{ id: 'ann', st: 'present' }], guests: '', decisions: 'New menu from Friday', menu: '', safety: '', dates: '', other: '', acts: [], next: '', pubAt: L.NOW - 86400000, removed: false, at: 1, upd: 1, by: 'sam' } };
  p = await L.open(b, '#/minutes', { who: 'ann', extra: pub, wait: 1800 });
  await L.waitFor(p, () => !!document.querySelector('.mn-signbtn')).catch(() => {});
  const mn = await p.evaluate(() => { const r = document.querySelector('.mn-signrow'); return { row: r ? r.textContent.replace(/\s+/g, ' ').trim() : '', btn: !!(r && r.querySelector('.mn-signbtn')), notYou: !!(r && r.querySelector('[data-p="who-change"]')), top: !!document.querySelector('.nb-top') && /Signing as/.test(document.querySelector('.nb-top').textContent) }; });
  ok(/^Signing as Ann\. Not you\?\s*Sign as Ann$/.test(mn.row) && mn.btn && mn.notYou && !mn.top, 'minutes: Signing as Ann, Not you? and Sign in one row at the end, not in the top bar (' + JSON.stringify(mn) + ')');
  await p.context().close();

  // a guide step by step: it opens on All steps; Step by step goes one step at a time with Back and Next; no reads
  p = await L.open(b, '#/guides/fryer', { who: 'ann', extra: L.guides(), wait: 1800 });
  await L.waitFor(p, () => !!document.querySelector('.g-ol')).catch(() => {});
  ok((await p.$$('.g-ol li')).length === 3 && await p.$eval('[data-p="g-mode"][data-v="all"]', e => e.getAttribute('aria-pressed')) === 'true', 'guide: opens on All steps, the three steps listed');
  const reads = await bill(p);
  await p.click('[data-p="g-mode"][data-v="one"]'); await L.settle(p, 200);
  let g = await p.evaluate(() => ({ h: document.querySelector('.g-one .g-h3').textContent, bar: document.querySelectorAll('.g-bar i').length, on: document.querySelectorAll('.g-bar i.on').length, back: document.querySelector('.g-nav [data-p="g-step"]').disabled, text: document.querySelector('.g-onetxt').textContent }));
  ok(g.h === 'Step 1 of 3' && g.bar === 3 && g.on === 1 && g.back && /Turn the fryer off/.test(g.text), 'guide: Step by step shows step 1 of 3, the bar and Back off (' + JSON.stringify(g) + ')');
  // the audit (8 Nov 2026): on a phone Back and Next stay at the bottom of the screen, above the tab bar, within thumb reach
  const gn = await p.evaluate(() => { const n = document.querySelector('.g-nav'), t = document.querySelector('.tabbar'); return { pos: getComputedStyle(n).position, gap: Math.round(t.getBoundingClientRect().top - parseFloat(getComputedStyle(n).bottom) - (innerHeight - t.getBoundingClientRect().height) + t.getBoundingClientRect().height) }; });
  ok(gn.pos === 'sticky', 'guide: Back and Next stick to the bottom on a phone (' + JSON.stringify(gn) + ')');
  await p.click('.g-nav [data-p="g-step"][data-v="1"]'); await L.settle(p, 200);
  await p.click('.g-nav [data-p="g-step"][data-v="2"]'); await L.settle(p, 200);
  g = await p.evaluate(() => ({ h: document.querySelector('.g-one .g-h3').textContent, text: document.querySelector('.g-onetxt').textContent, done: !!document.querySelector('.g-nav [data-p="g-mode"][data-v="all"]') }));
  ok(g.h === 'Step 3 of 3' && /refill to the line/.test(g.text) && g.done, 'guide: Next walks to the last step, where All steps takes its place (' + JSON.stringify(g) + ')');
  await p.click('.g-nav [data-p="g-mode"][data-v="all"]'); await L.settle(p, 200);
  ok((await p.$$('.g-ol li')).length === 3 && await bill(p) === reads, 'guide: back on All steps, and stepping read nothing');
  await p.goto(L.BASE + '#/guides/combi'); await L.settle(p, 800);
  ok(!(await p.$('[data-p="g-mode"]')), 'guide: a guide with no written steps has no Step by step');
  ok(p.errors.length === 0, 'guide: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Today's team at a glance: the saved plan by section, hours and breaks in words, a bar; the plan to change below
  p = await L.open(b, '#/team', { who: 'sam', extra: teamSeed, wait: 1800 });
  await L.waitFor(p, () => !!document.querySelector('.tm-tl')).catch(() => {});
  const tl = await p.evaluate(day => {
    const picker = (row, key, value) => {
      const field = row.querySelector('select[data-k="' + key + '"]'), trigger = field && field._uxTrigger;
      return !!(field && field.value === value && field.dataset.day === day && !field.disabled &&
        trigger && !trigger.disabled && trigger.getClientRects().length);
    };
    const expected = [['ann', 'lunch', 'grill'], ['bo', 'long', 'larder']];
    return {
      secs: [...document.querySelectorAll('.tm-tls')].map(e => e.textContent),
      rows: [...document.querySelectorAll('.tm-tlr')].map(e => e.querySelector('.tm-tln').textContent),
      bars: [...document.querySelectorAll('.tm-tlbar i')].map(e => e.getAttribute('style')),
      editor: document.querySelectorAll('.tm-person-row').length === expected.length && expected.every(([id, service, section]) => {
        const row = document.querySelector('.tm-person-row[data-id="' + id + '"]');
        return row && picker(row, 'tm-row-sh:' + id, service) && picker(row, 'tm-sec:' + id, section);
      })
    };
  }, today);
  ok(tl.secs.join(',') === 'Grill,Larder', 'team: grouped by section (' + tl.secs.join(', ') + ')');
  ok(tl.rows[0] === 'AnnLunch 10:00 to 15:00 · break 13:00' && tl.rows[1] === 'BoLong day 10:00 to 22:00 · split 14:30, back 17:30', 'team: hours and breaks in words (' + tl.rows.join(' | ') + ')');
  ok(tl.bars.length === 4 && tl.bars.every(s => /^left:\d+(\.\d)?%;width:\d+(\.\d)?%$/.test(s)), 'team: each bar a checked number (' + tl.bars.join(' | ') + ')');
  const beforeEdit = await p.evaluate(k => ({ saved: JSON.stringify(__fake.dump()[k]), writes: __fake.writes.length }), fsKey(['team', today]));
  if (tl.editor) await L.pick(p, 'select[data-k="tm-sec:ann"]', 'larder');
  const inlineEdit = await p.evaluate(k => {
    const save = document.querySelector('[data-p="tm-save"]');
    return { section: document.querySelector('select[data-k="tm-sec:ann"]')?.value,
      canSave: !!save && !save.disabled, saved: JSON.stringify(__fake.dump()[k]), writes: __fake.writes.length };
  }, fsKey(['team', today]));
  ok(tl.editor && inlineEdit.section === 'larder' && inlineEdit.canSave && inlineEdit.saved === beforeEdit.saved && inlineEdit.writes === beforeEdit.writes,
    'team: visible dated service/section pickers edit the draft directly, with no extra view tap or write before Save');
  for (const w of [390, 768, 1280]) { await p.setViewportSize({ width: w, height: 900 }); await L.settle(p, 200); ok(!(await L.overflow(p)), 'team ' + w + ' px: no sideways scroll'); }
  ok(p.errors.length === 0, 'team: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Manage staff: a row each with the initial, the name, the role and what they may do
  p = await L.open(b, '#/recipes', { who: 'sam', wait: 1600 });
  await L.chef(p, 'staff'); await L.settle(p, 500);
  // the audit (8 Nov 2026): Manage staff is drawn on the prep route, but the tab bar does not light Prep for it
  ok(!(await p.$('.tabbar a[href="#/prep"][aria-current], .pnav a[href="#/prep"][aria-current]')), 'Manage staff: the tab bar lights nothing, not Prep');
  const st = await p.$$eval('.st-row', l => l.map(e => ({ av: (e.querySelector('.st-av') || {}).textContent, can: (e.querySelector('.st-can') || {}).textContent })));
  ok(st.length === 3 && st[0].av === 'S' && st[0].can === 'Sous chef · Add, tick, remove' && st[1].can === 'Staff · Add, tick', 'staff: initial, role and what they may do (' + JSON.stringify(st) + ')');
  ok(!(await L.overflow(p)) && p.errors.length === 0, 'staff: no sideways scroll, no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the restyled pages at every width: no sideways scroll, no page errors
  for (const [h, who, extra] of [['#/drinks', 'ann', {}], ['#/todo', 'sam', {}], ['#/mail', 'ann', {}], ['#/minutes', 'ann', pub], ['#/guides/fryer', 'ann', L.guides()]]) {
    for (const w of [390, 768, 1280]) {
      p = await L.open(b, h, { who, extra, width: w, height: 900, wait: 1400 });
      ok(!(await L.overflow(p)) && p.errors.length === 0, h + ' ' + w + ' px: no sideways scroll, no page errors ' + p.errors.join(' | '));
      await p.context().close();
    }
  }

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
