// Renamed kitchen sections keep their history (head chef, 13 Nov 2026, docs/section-renames.md). A section renamed in
// its box keeps its old names (config/main kitSecs[].was), and the book counts lines, shifts and suggestions written
// under an old name under the name now. An old name two sections once had, or one a section has now, stays as written.
// Made-up cooks, sections and counts only.
const L = require('./lib');
const { R, ok } = L.results();
const path = (...p) => ['kitchens', L.PIN, ...p].join('/');
const CFG = path('config', 'main');
const DAY = 86400000, today = L.ymd(new Date(L.NOW)), dayN = n => L.ymd(new Date(L.NOW - n * DAY));
const store = p => p.evaluate(() => window.__fake.dump());
// Pans was renamed Saute. Wok was once Pass and once Larder, so its lines stay under Wok.
const SECS = [{ id: 'pans', name: 'Saute', off: false, was: ['Pans'] }, { id: 'grill', name: 'Grill', off: false }, { id: 'pass', name: 'Pass', off: false, was: ['Wok'] }, { id: 'larder', name: 'Larder', off: false, was: ['Wok'] }];
const line = (text, station, x) => Object.assign({ text, station, qty: '', recipe: '', addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 3600000, done: false, deleted: false }, x || {});
function extra(more) {
  const x = {};
  x[CFG] = { ...L.seed()[CFG], kitSecs: SECS };
  x[path('days', today, 'items', 't1')] = line('Sweat leeks', 'Pans');
  x[path('days', today, 'items', 't2')] = line('Make jus', 'Saute');
  x[path('days', today, 'items', 't3')] = line('Wok noodles', 'Wok');
  x[path('days', today, 'items', 't4')] = line('Grill steaks', 'Grill');
  // yesterday Ann ticked two lines written under the old name and one under the new
  const done = { done: true, doneBy: 'Ann', doneById: 'ann', addedAt: L.NOW - DAY, doneAt: L.NOW - DAY + 3600000 };
  x[path('days', dayN(1), 'items', 'y1')] = line('Peel shallots', 'Pans', done);
  x[path('days', dayN(1), 'items', 'y2')] = line('Pick thyme', 'Pans', done);
  x[path('days', dayN(1), 'items', 'y3')] = line('Reduce stock', 'Saute', done);
  // learned: Blanch greens went under Pans 4 times, Grill 3 and Saute once, so its usual section is Saute (5)
  x[path('learned', 'blanch-greens')] = { text: 'Blanch greens', uses: 8, typed: 8, secs: { pans: { name: 'Pans', n: 4 }, grill: { name: 'Grill', n: 3 }, saute: { name: 'Saute', n: 1 } }, dow: {} };
  x[path('waste', today, 'lines', 'w1')] = { text: 'Jus', amount: 1, unit: 'L', reason: 'prep', action: '', station: 'Pans', addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 1800000, deleted: false };
  // the shift counts from before the rename: five shifts under Pans, two under Saute
  const days = [];
  for (let i = 1; i <= 7; i++) days.push({ day: dayN(i), s: [{ p: 'ann', sec: i <= 5 ? 'Pans' : 'Saute', sh: 'lunch' }] });
  x[path('teamsum', 'main')] = { v: 1, at: L.NOW - 11 * 3600000, day: today, from: dayN(30), to: dayN(1), days, usual: {}, learn: {} };
  return Object.assign(x, more || {});
}
const tabs = p => p.$$eval('.nb-tabs [data-p="tab"]', l => l.map(e => e.getAttribute('data-v')));
const rows = p => p.$$eval('.nb-rows li', l => l.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
const pane = p => p.evaluate(() => ((document.querySelector('.a-pane') || {}).innerText || ''));

// a nightly dashboard record from before the rename: lines under Pans and under Saute
function dash() {
  const out = [];
  for (let i = 59; i >= 0; i--) {
    const day = L.ymd(new Date(L.NOW - (i + 1) * DAY));
    out.push({ day, p: { n: 12, w: 12, t: 10, r: 0, sec: { Pans: 6, Saute: 2, Grill: 4 }, mins: { Pans: [50, 60], Saute: [70], Grill: [30] }, who: { ann: 4 } },
      w: { n: 2, reason: { prep: 2 }, sec: { Pans: 1, Saute: 1 }, items: [{ t: 'Jus', u: 'L', a: 1, n: 2 }] }, x: { out: 0, in: 0 } });
  }
  return { [path('analysis', 'dashboard')]: { v: 1, generation: 'g1', at: L.NOW - 11 * 3600000, from: out[0].day, to: out[out.length - 1].day, days: out },
    [path('analysis', 'health')]: { at: L.NOW - 11 * 3600000, status: 'ok' } };
}

(async () => {
  const b = await L.start();
  let p, s;

  // the prep list: today's line under the old name is under Saute; Wok, shared by two sections once, stays apart
  p = await L.open(b, '#/prep', { who: 'sam', width: 390, extra: extra(), wait: 1600 });
  await L.waitFor(p, () => document.querySelectorAll('.nb-tabs [data-p="tab"]').length > 1, null, 8000).catch(() => {});
  let t = await tabs(p);
  ok(t.indexOf('Saute') >= 0 && t.indexOf('Pans') < 0, 'prep: one tab for the renamed section, under its name now (' + t.join(', ') + ')');
  ok(t.indexOf('Wok') >= 0 && t.indexOf('Grill') >= 0, 'prep: a name two sections once had stays as written, and a name a section has now is never moved (' + t.join(', ') + ')');
  await L.tap(p, '.nb-tabs [data-p="tab"][data-v="Saute"]'); await L.settle(p, 300);
  let r = await rows(p);
  ok(r.some(x => /Sweat leeks/.test(x)) && r.some(x => /Make jus/.test(x)) && !r.some(x => /Wok noodles|Grill steaks/.test(x)), 'prep: the Saute tab holds the line written under Pans (' + r.join(' | ').slice(0, 160) + ')');
  // a section typed under the old name is written under the new one, and the box says so
  await L.tap(p, '.nb-tabs [data-p="tab"][data-v=""]'); await L.settle(p, 200);
  await p.fill('[data-k="p-section"]', 'pans');
  await p.dispatchEvent('[data-k="p-section"]', 'change'); await L.settle(p, 300);
  ok(await p.inputValue('[data-k="p-section"]') === 'Saute' && /pans is now called Saute/.test(await p.evaluate(() => document.body.innerText)), 'prep: the old name typed in the box becomes Saute, and a note says so');
  // the box puts the name right when it is left (a change), before the line is written
  await p.fill('#p-section', 'Pans');
  await p.dispatchEvent('#p-section', 'change'); await L.settle(p, 400);
  await p.fill('#p-text', 'Blanch beans');
  await p.press('#p-text', 'Enter'); await L.settle(p, 600);
  s = await store(p);
  const added = Object.keys(s).filter(k => k.indexOf('/days/' + today + '/items/') > 0 && /beans/i.test(s[k].text)).map(k => s[k])[0];
  ok(added && added.station === 'Saute', 'prep: a line added under the old name is saved under Saute (' + (added ? added.station : 'none') + ')');
  // a section box left at the old name (no change event) is put right when the line is written
  await p.evaluate(() => { LK_PREP.state.section = 'Pans'; LK_PREP.state.secTyped = true; });
  await p.fill('#p-text', 'Boil eggs'); await p.press('#p-text', 'Enter'); await L.settle(p, 600);
  const lineAt = async text => { const d = await store(p); const k = Object.keys(d).filter(k => k.indexOf('/days/' + today + '/items/') > 0 && d[k].text === text)[0]; return k ? d[k].station : null; };
  ok(await lineAt('Boil eggs') === 'Saute', 'prep: a line written with Pans left in the box goes under Saute (' + await lineAt('Boil eggs') + ')');
  // the usual section adds up the old and new names
  await L.clear(p, '#p-section');
  await p.fill('#p-text', 'Blanch greens'); await p.press('#p-text', 'Enter'); await L.settle(p, 600);
  ok(await lineAt('Blanch greens') === 'Saute', 'prep: the learned usual section counts Pans and Saute together, so Saute beats Grill (' + await lineAt('Blanch greens') + ')');
  ok(!(await L.overflow(p)), 'prep: no sideways scroll');
  ok(p.errors.length === 0, 'prep: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // wastage: today's entry under the old name is said under the new one
  p = await L.open(b, '#/waste', { who: 'sam', width: 390, extra: extra(), wait: 1600 });
  await L.waitFor(p, () => !!document.querySelector('.w-secs'), null, 8000).catch(() => {});
  const ws = await L.txt(p, '.w-secs') || '';
  ok(/Saute/.test(ws) && !/Pans/.test(ws), 'wastage: the day\'s sections name Saute, not Pans (' + ws + ')');
  ok(p.errors.length === 0, 'wastage: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the Team report and a person's page count the old name under the new one
  p = await L.open(b, '#/admin', { admin: true, who: '', adminPage: 'team', width: 1280, height: 900, extra: extra(), wait: 2200 });
  await L.waitFor(p, () => !!document.querySelector('.sk-shifts') && LK_PREP.state.stats && !LK_PREP.state.stats.loading, null, 10000).catch(() => {});
  await L.settle(p, 400);
  t = await pane(p);
  const head = await p.$$eval('.sk-shifts thead th', l => l.map(e => e.textContent));
  const ann = await p.$$eval('.sk-shifts tbody tr', l => l.map(e => [...e.children].map(c => c.textContent)).filter(c => c[0] === 'Ann')[0] || []);
  ok(ann[head.findIndex(h => /^Saute/.test(h))] === '7', 'team: Ann\'s seven shifts count under Saute, five of them written as Pans (' + head.join(',') + ' / ' + ann.join(',') + ')');
  ok(!/Not counted/.test(t), 'team: no shifts are left uncounted under the old name');
  await L.adminTab(p, 'people'); await L.settle(p, 400);
  await L.tap(p, '[data-p="a-person"][data-id="ann"]'); await L.settle(p, 500);
  const pp = await L.txt(p, '.a-personpage') || '';
  ok(/Ticked off by section: Saute 3\./.test(pp) && !/Pans/.test(pp), 'person: Ann\'s ticks under Pans and Saute are one count (' + ((pp.match(/Ticked off by section[^.]*\./) || [''])[0]) + ')');
  ok(p.errors.length === 0, 'team: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the head chef renames a section in its box: the old name is kept, and renaming back takes it off
  p = await L.open(b, '#/admin', { admin: true, who: '', width: 390, extra: extra(), wait: 1800 });
  await L.kitchenRow(p, 'secs');
  let ks = await L.txt(p, '#k-b-secs .a-ks') || '';
  ok(/Old names: Pans is now Saute\./.test(ks) && !/Wok is now/.test(ks), 'admin: the row says Pans is now Saute, and not a name two sections once had (' + ((ks.match(/Old names[^]*?one\./) || [''])[0]) + ')');
  ok(/To rename a section, change its name in its box/.test(ks) && !/Renaming a section keeps its history/.test(ks), 'admin: the hint says how to rename and keep the history');
  await p.fill('[data-k="a-ks1"]', 'Char grill');
  await L.tap(p, '[data-p="a-save"]'); await L.settle(p, 800);
  s = await store(p);
  let saved = s[CFG].kitSecs || [];
  ok(saved[1] && saved[1].id === 'grill' && saved[1].name === 'Char grill' && JSON.stringify(saved[1].was) === '["Grill"]', 'admin: the renamed section keeps its id and its old name (' + JSON.stringify(saved[1]) + ')');
  ok(JSON.stringify(saved[0].was) === '["Pans"]' && JSON.stringify(saved[2].was) === '["Wok"]', 'admin: the other sections keep their old names (' + JSON.stringify(saved.map(x => x.was || [])) + ')');
  await L.kitchenRow(p, 'secs');
  ks = await L.txt(p, '#k-b-secs .a-ks') || '';
  ok(/Grill is now Char grill/.test(ks), 'admin: after Save the row says Grill is now Char grill');
  await p.fill('[data-k="a-ks0"]', 'Pans');
  await L.tap(p, '[data-p="a-save"]'); await L.settle(p, 800);
  s = await store(p);
  saved = s[CFG].kitSecs || [];
  ok(saved[0].name === 'Pans' && JSON.stringify(saved[0].was) === '["Saute"]', 'admin: renamed back, the name it has now leaves its old names (' + JSON.stringify(saved[0]) + ')');
  ok(!(await L.overflow(p)), 'admin: no sideways scroll');
  ok(p.errors.length === 0, 'admin: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the Dashboard: the nightly record's Pans lines count under Saute
  p = await L.open(b, '#/admin', { admin: true, adminPage: 'dashboard', who: '', width: 1280, height: 900, extra: extra(dash()), wait: 1800 });
  await L.waitFor(p, () => document.querySelectorAll('.dsh-cmp-t tbody tr').length === 6, null, 10000).catch(() => {});
  await L.settle(p, 400);
  t = await pane(p);
  ok(/Saute/.test(t) && !/\bPans\b/.test(t), 'dashboard: sections are named as they are now, Pans under Saute (' + ((t.match(/.{0,60}Saute.{0,60}/) || [''])[0]) + ')');
  ok(p.errors.length === 0, 'dashboard: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
