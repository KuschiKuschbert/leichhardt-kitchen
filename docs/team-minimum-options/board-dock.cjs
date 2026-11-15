// The On break now board and the Save dock on the first screen (docs/team-minimum-options/brief.md, Board above the dock).
// The study's made-up day at 18:30 (four on a break), with no busy time set and with the Dinner busy time short.
// Synthetic data only. Run from tests/:  CHROME=<headless shell> node ../docs/team-minimum-options/board-dock.cjs [label] [fonts]
// With "fonts" each page loads the book's own fonts from Google (Barlow, Barlow Condensed, Caveat), as the phones show
// them; without it the stand-in's fallback fonts, which differ from machine to machine (wider on GitHub's runner).
const path = require('path');
const L = require(path.resolve(__dirname, '../../tests/lib'));
const OUT = __dirname, LABEL = process.argv[2] || 'now', FONTS = process.argv[3] === 'fonts';
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700&family=Barlow+Condensed:wght@700&family=Caveat:wght@700&display=swap';
async function bookFonts(p) {
  if (!FONTS) return;
  await p.context().unroute(/fonts\.(googleapis|gstatic)\.com/);
  await p.addStyleTag({ url: FONT_CSS });
  const got = await p.evaluate(() => Promise.all(['400 13px Barlow', '700 13px Barlow', '600 13px Barlow', '700 16px "Barlow Condensed"', '700 16px Caveat'].map(f => document.fonts.load(f))).then(r => r.every(x => x.length > 0)));
  if (!got) throw new Error('the book\'s fonts did not load');
  await p.evaluate(() => document.fonts.ready); await L.settle(p, 300);
}
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const today = L.ymd(new Date(L.NOW));
global.window = {}; require('./data.js'); const D = window.TM_DATA;
const people = [{ id: 'gus', name: 'Gus', role: 'head', active: true, add: true, tick: true, del: true }, { id: 'sam', name: 'Sam K', role: 'sous', active: true, add: true, tick: true, del: true },
  ...['Ari', 'Bea', 'Cal', 'Dev', 'Eli', 'Fen', 'Gia', 'Hal'].map(n => ({ id: n.toLowerCase(), name: n, role: 'staff', active: true, add: true, tick: true }))];
const BUSY = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900, busy: { from: 720, to: 840, n: 3 } }, { id: 'dinner', name: 'Dinner', from: 900, to: 1260, busy: { from: 1050, to: 1230, n: 6 } }];
const PLAIN = BUSY.map(s => ({ id: s.id, name: s.name, from: s.from, to: s.to }));
const fx = shifts => ({ [key('config', 'main')]: { people, headId: 'gus', sousIds: ['sam'], staffIds: people.map(p => p.id), kitShifts: shifts, kitSecs: D.sections },
  [key('team', today)]: { day: today, on: D.on, br: D.br, v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'gus' } });
const measure = p => p.evaluate(() => {
  const r = s => { const e = document.querySelector(s); return e && e.getClientRects().length ? e.getBoundingClientRect() : null; };
  const dock = r('.tm-focus-save'), board = r('.tm-away'), names = [...document.querySelectorAll('.tm-away-row')];
  const line = document.querySelector('.tm-short-line'), state = document.querySelector('.tm-focus-save .tm-save-state');
  return { dockTop: Math.round(dock.top), dockH: Math.round(dock.height), boardBottom: board ? Math.round(board.bottom) : null,
    boardNames: names.filter(e => e.getBoundingClientRect().bottom <= dock.top + .5).length + ' of ' + names.length,
    lastName: names.length ? names[names.length - 1].innerText.replace(/\s+/g, ' ').trim() + ' ' + Math.round(names[names.length - 1].getBoundingClientRect().top) + ' to ' + Math.round(names[names.length - 1].getBoundingClientRect().bottom) : '',
    rows: [...document.querySelectorAll('.tm-person-row')].filter(e => { const b = e.getBoundingClientRect(); return b.top >= 0 && b.bottom <= dock.top + .5; }).length,
    line: line && !line.hidden ? line.innerText.replace(/\s+/g, ' ').trim() : '', state: state && !state.hidden ? state.innerText.trim() : '',
    saveOnScreen: (() => { const b = r('.tm-focus-save .btn'); return !!b && b.top >= 0 && b.bottom <= innerHeight; })(),
    overflow: document.documentElement.scrollWidth > innerWidth };
});
(async () => {
  const b = await L.start(), out = {};
  for (const [label, hash, o] of [['admin-390', '#/admin', { admin: true, adminPage: 'plan', width: 390, height: 844 }], ['team-390', '#/team', { who: 'sam', width: 390, height: 844 }], ['admin-768', '#/admin', { admin: true, adminPage: 'plan', width: 768 }], ['admin-1280', '#/admin', { admin: true, adminPage: 'plan', width: 1280 }]]) {
    out[label] = {};
    for (const [state, shifts] of [['enough', PLAIN], ['short', BUSY]]) {
      const p = await L.open(b, hash, Object.assign({ extra: fx(shifts), wait: 1800, clock: L.NOW + 270 * 60000 }, o));
      await L.waitFor(p, () => document.querySelectorAll('.tm-person-row').length >= 7 && document.querySelectorAll('.tm-away-row').length >= 4, null, 9000); await L.settle(p, 400); await bookFonts(p);
      out[label][state] = Object.assign(await measure(p), { errors: p.errors.length });
      if (label === 'admin-390') await p.screenshot({ path: path.join(OUT, 'board-dock-' + LABEL + '-' + label + '-' + state + '.png') });
      await p.context().close();
    }
  }
  // how many on a break still fit: more people away at 18:30 on Dinner (Eli, Gia, Ari, Bea), admin 390 only
  out.more = {};
  for (const extra of [['eli'], ['eli', 'gia'], ['eli', 'gia', 'ari']]) {
    const br = D.br.filter(x => !extra.includes(x.id) || x.sh !== 'dinner').concat(extra.map(id => ({ id, sh: 'dinner', at: 1110, len: 30 })));
    for (const [state, shifts] of [['enough', PLAIN], ['short', BUSY]]) {
      const f = fx(shifts); f[key('team', today)].br = br;
      const p = await L.open(b, '#/admin', { admin: true, adminPage: 'plan', width: 390, height: 844, extra: f, wait: 1800, clock: L.NOW + 270 * 60000 });
      await L.waitFor(p, n => document.querySelectorAll('.tm-away-row').length >= n, 4 + extra.length, 9000); await L.settle(p, 400); await bookFonts(p);
      const m = await measure(p); out.more[(4 + extra.length) + ' away, ' + state] = m.boardNames + ' (last name ends ' + m.lastName.replace(/.* (\d+) to (\d+)$/, '$2') + ' px, dock from ' + m.dockTop + ' px)';
      await p.context().close();
    }
  }
  require('fs').writeFileSync(path.join(OUT, 'board-dock-' + LABEL + '.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
