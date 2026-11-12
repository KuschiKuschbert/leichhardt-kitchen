// Review-only previews for the "Worth a look" council, round 2. Drawn over the real book on the click tests' stand-in,
// made-up people and numbers. Nothing here is in the book. Run from the worktree's tests folder (needs its lib and server).
const T = process.argv[3], L = require(T + '/lib'), fs = require('fs'), OUT = process.argv[2];
const path = (...p) => ['kitchens', L.PIN, ...p].join('/');
const DAY = 86400000, dayN = n => L.ymd(new Date(L.NOW - n * DAY)), last = dayN(1);
const rows = [];
for (let i = 89; i >= 0; i--) {
  const t = L.NOW - (i + 1) * DAY, day = L.ymd(new Date(t)), dw = new Date(t).getDay(), busy = dw === 5 || dw === 6 ? 2 : 1;
  const n = 20 * busy + (i % 3), tk = n - 2 - (i % 4), w = i < 7 ? 3 : 1;
  rows.push({ day, p: { n, w: n - 2, t: tk, r: 2, sec: { Larder: 8 * busy, Grill: 6 * busy, Sauce: 4 * busy + (i % 3) }, mins: { Larder: [60, 70, 80], Grill: [40, 45, 50], Sauce: [200, 210, 220] }, who: { sam: 5 + (i % 3) } },
    w: { n: w, reason: { excess: w - (i < 7 ? 1 : 0), ...(i < 7 ? { expired: 1 } : {}) }, sec: { Larder: w }, items: [{ t: 'Brisket', u: 'kg', a: 0.5 * w, n: w }] }, x: { out: 1, in: i % 2 } });
}
const extra = { [path('analysis', 'dashboard')]: { v: 1, generation: 'g1', at: L.NOW - 11 * 3600000, from: rows[0].day, to: last, days: rows },
  [path('analysis', 'health')]: { at: L.NOW - 11 * 3600000, status: 'ok' } };
const sh = [];
for (let i = 1; i <= 30; i++) sh.push({ day: dayN(i), s: [{ p: 'ann', sec: i % 4 === 1 ? 'Pans' : 'Larder', sh: 'lunch' }, { p: 'sam', sec: 'Grill', sh: 'lunch' }, { p: 'bo', sec: i % 3 ? 'Sauce' : 'Grill', sh: 'dinner' }] });
extra[path('teamsum', 'main')] = { v: 1, at: L.NOW, day: dayN(0), from: dayN(30), to: dayN(1), days: sh, usual: {}, learn: {} };
const cfg = L.seed()[path('config', 'main')];
extra[path('config', 'main')] = { ...cfg,
  kitSecs: [{ id: 'grill', name: 'Grill' }, { id: 'larder', name: 'Larder' }, { id: 'sauce', name: 'Sauce' }, { id: 'pans', name: 'Pans' }] };

// The words every design uses (worded by the round 1 council: time-bound, a count is not a skill)
const W = {
  few: [['Sauce', 'Only Bo worked Sauce in the last 30 days (20 shifts).', 'No Sauce shifts in 30 days: Ann, Sam.'],
        ['Pans', 'Only Ann worked Pans in the last 30 days (8 shifts).', 'No Pans shifts in 30 days: Bo, Sam.']],
  one: ['Sam: 30 of 30 shifts on Grill.'],
  order: 'Milk was on the order list on 4 days in the last 14. A standing order with the supplier saves writing it each time.',
  fresh: 'Counted to yesterday by the nightly run, Thu 12 Nov at 03:00. A count of shifts is activity, not a sign someone can run a section alone.',
  stale: 'These counts are from Mon 9 Nov. The nightly run has not finished since, so the last 3 days are missing.',
  fail: 'Could not load the shift counts. Check the signal and tap Refresh. Nothing here means nobody worked a section.'
};

async function A(p, state) {   // A: Team page, words first. The written lines move above the table, in time-bound words.
  await L.waitFor(p, () => !!document.querySelector('.sk-shifts'), null, 8000);
  await p.evaluate(([W, state]) => {
    const pane = document.querySelector('.a-pane'), first = [...pane.querySelectorAll('h3.a-ch-h')].find(h => h.textContent === 'Who has worked where');
    const box = document.createElement('div'); box.className = 'pv-a';
    const status = state === 'ok' ? '<p class="hint">' + W.fresh + '</p>' : state === 'stale' ? '<p class="p-err" role="status">' + W.stale + '</p>' : '<p class="p-err" role="status">' + W.fail + '</p>';
    box.innerHTML = '<h3 class="a-ch-h">Sections few people worked lately</h3>' + status +
      (state === 'fail' ? '' : '<ul class="a-list sk-few">' + W.few.map(f => '<li><strong>' + f[0] + ':</strong> ' + f[1] + ' ' + f[2] + '</li>').join('') + '</ul>' +
      '<h3 class="a-ch-h">Mostly on one section</h3><ul class="a-list sk-one">' + W.one.map(t => '<li>' + t.replace(/^(\w+):/, '<strong>$1:</strong>') + '</li>').join('') + '</ul>' +
      '<h3 class="a-ch-h">Standing order candidates</h3><p>' + W.order + ' <a href="#" class="pv-link">See the order list below</a></p>');
    first.parentNode.insertBefore(box, first);
    // the old copies further down go: one place for each sentence
    [...pane.querySelectorAll('h3.a-ch-h')].filter(h => !box.contains(h) && /Sections few people worked lately|Mostly on one section/.test(h.textContent)).forEach(h => { const n = h.nextElementSibling; h.remove(); if (n) n.remove(); });
  }, [W, state]);
}
async function F(p, state) {   // A as repaired by round 2: orange (attention) for old counts, dated words, no copies left below.
  await L.waitFor(p, () => !!document.querySelector('.sk-shifts'), null, 8000);
  await p.evaluate((state) => {
    const pane = document.querySelector('.a-pane'), first = [...pane.querySelectorAll('h3.a-ch-h')].find(h => h.textContent === 'Who has worked where');
    const box = document.createElement('div'); box.className = 'pv-a';
    const att = 'style="color:var(--small-ink);border-left:4px solid var(--accent);padding-left:10px"';
    const status = state === 'ok' ? '<p class="hint">Shift counts to Wed 11 Nov, from the nightly run. A count of shifts is activity, not a sign someone can run a section alone.</p>'
      : state === 'stale' ? '<p class="hint" role="status" ' + att + '><strong>Old counts:</strong> shift counts only go to Mon 9 Nov. The nightly run has not finished since, so the last 2 days are missing.</p>'
      : '<p class="p-err" role="status">Could not load the shift counts. This does not mean nobody worked a section. The book tries again by itself in a few minutes.</p>';
    box.innerHTML = '<h3 class="a-ch-h">Sections few people worked lately</h3>' + status +
      (state === 'fail' ? '' : '<ul class="a-list sk-few"><li><strong>Sauce:</strong> only Bo in the last 30 days (20 shifts). Ann and Sam had no Sauce shifts.</li><li><strong>Pans:</strong> only Ann in the last 30 days (8 shifts). Bo and Sam had no Pans shifts.</li></ul>' +
      '<h3 class="a-ch-h">Mostly on one section</h3><ul class="a-list sk-one"><li><strong>Sam:</strong> 30 of 30 shifts on Grill.</li></ul>') +
      '<h3 class="a-ch-h">Standing order candidates</h3><p>On the order list on 3 or more days in the last 14: <strong>Milk</strong> (4 days). A standing order with the supplier saves writing it each time.</p>';
    first.parentNode.insertBefore(box, first);
    [...pane.querySelectorAll('h3.a-ch-h')].filter(h => !box.contains(h) && /Sections few people worked lately|Mostly on one section|Standing order candidates/.test(h.textContent)).forEach(h => { let n = h.nextElementSibling; while (n && !/^H3$/.test(n.tagName)) { const x = n.nextElementSibling; n.remove(); n = x; } h.remove(); });
  }, state);
}
async function B(p, state) {   // B: two more fixed-rule cards in the Dashboard's What changed strip, each opening its report.
  await L.waitFor(p, () => document.querySelectorAll('.dsh-head').length >= 3, null, 10000);
  await p.evaluate(([W, state]) => {
    const list = document.querySelector('.dsh-head-list'), card = (tone, tag, h, t, open) => '<article class="dsh-head"><p class="dsh-tag dsh-tag-' + tone + '">' + tag + '</p><h4>' + h + '</h4><p>' + t + '</p><button type="button" class="dsh-more">' + open + '</button></article>';
    list.insertAdjacentHTML('beforeend', state === 'fail'
      ? card('bad', 'Could not load, shifts', 'The shift counts did not load.', 'Check the signal and tap Refresh. This does not mean nobody worked a section.', 'Open Team')
      : card('flat', 'Few cooks, last 30 days', 'Only Bo worked Sauce in the last 30 days.', '20 shifts. ' + W.few[0][2] + ' A count of shifts, not of skill.' + (state === 'stale' ? ' Counted to Mon 9 Nov: the nightly run has not finished since.' : ''), 'Open Team') +
        card('flat', 'Standing order?, last 14 days', 'Milk was on the order list on 4 days in 2 weeks.', 'A standing order with the supplier saves writing it each time.', 'Open Team'));
  }, [W, state]);
}
async function C(p, state) {   // C: one quiet Inbox row once a week, a pointer that opens the Team page at the words.
  await L.waitFor(p, () => !!document.querySelector('.dsh-inbox .dsh-need-list, .dsh-inbox .dsh-needs'), null, 10000);
  await p.evaluate(([W, state]) => {
    const list = document.querySelector('.dsh-inbox .dsh-need-list');
    const row = state === 'fail'
      ? '<li class="dsh-need dsh-need-wait"><span class="dsh-need-mark" aria-hidden="true"></span><div><p class="dsh-tag dsh-tag-bad">Could not load</p><p class="dsh-need-title">This week\'s team and order notes</p><p class="dsh-need-detail">The shift counts did not load. Tap Refresh, or open Team.</p></div><button type="button" class="btn">Open Team</button></li>'
      : '<li class="dsh-need dsh-need-wait"><span class="dsh-need-mark" aria-hidden="true"></span><div><p class="dsh-tag dsh-tag-flat">This week</p><p class="dsh-need-title">2 team and order notes</p><p class="dsh-need-detail">Sauce had one cook in 30 days (Bo). Milk could be a standing order.' + (state === 'stale' ? ' Counted to Mon 9 Nov.' : '') + '</p></div><span style="display:flex;gap:8px"><button type="button" class="btn">Seen</button><button type="button" class="btn">Open Team</button></span></li>';
    list.insertAdjacentHTML('beforeend', row);
  }, [W, state]);
}
(async () => {
  const b = await L.start(), out = {};
  const shots = process.argv[4] === 'final' ? [['A2', 'team', F]] : [['A', 'team', A], ['B', 'dashboard', B], ['C', 'inbox', C]];
  for (const [name, page, fn] of shots) for (const [w, h] of [[1280, 900], [390, 844]]) for (const state of w === 1280 ? ['ok', 'stale', 'fail'] : ['ok']) {
    const p = await L.open(b, '#/admin', { admin: true, who: '', adminPage: page, width: w, height: h, extra, wait: 2200 });
    await L.settle(p, 1500); await fn(p, state); await L.settle(p, 300);
    const key = name + '-' + w + '-' + state;
    out[key] = await p.evaluate(() => {
      const els = [...document.querySelectorAll('.pv-a, .dsh-head, .dsh-need')].map(e => e.getBoundingClientRect());
      const vis = els.filter(r => r.top < innerHeight && r.bottom > 0).length;
      return { blocks: els.length, onFirstScreen: vis, sideways: document.documentElement.scrollWidth > innerWidth, pageHeight: document.documentElement.scrollHeight };
    });
    await p.screenshot({ path: OUT + '/' + key + '.png', fullPage: state === 'ok' && w === 1280 && /^A/.test(name) });
    if (state === 'ok') await p.screenshot({ path: OUT + '/' + key + '-first-screen.png' });
    await p.close();
  }
  fs.writeFileSync(OUT + '/measure' + (process.argv[4] || '') + '.json', JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
