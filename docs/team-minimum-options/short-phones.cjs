// The On break now board on shorter phones (docs/team-minimum-options/brief.md, Short phones). The study's made-up day at
// 18:30, four on a break, the Dinner busy time short (the too few line shows) and not. In the book's own fonts.
// Synthetic data only. Run from tests/:  CHROME=<headless shell> node ../docs/team-minimum-options/short-phones.cjs [label] [css file]
// With a css file, its rules are added to each page first (a preview of a repair; nothing in the book changes).
const path = require('path'), fs = require('fs');
const L = require(path.resolve(__dirname, '../../tests/lib'));
const OUT = process.env.OUT || __dirname, LABEL = process.argv[2] || 'now', EXTRA = process.argv[3] ? fs.readFileSync(process.argv[3], 'utf8') : '';
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const today = L.ymd(new Date(L.NOW));
global.window = {}; require('./data.js'); const D = window.TM_DATA;
const people = [{ id: 'gus', name: 'Gus', role: 'head', active: true, add: true, tick: true, del: true }, { id: 'sam', name: 'Sam K', role: 'sous', active: true, add: true, tick: true, del: true },
  ...['Ari', 'Bea', 'Cal', 'Dev', 'Eli', 'Fen', 'Gia', 'Hal'].map(n => ({ id: n.toLowerCase(), name: n, role: 'staff', active: true, add: true, tick: true }))];
const BUSY = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900, busy: { from: 720, to: 840, n: 3 } }, { id: 'dinner', name: 'Dinner', from: 900, to: 1260, busy: { from: 1050, to: 1230, n: 6 } }];
const PLAIN = BUSY.map(s => ({ id: s.id, name: s.name, from: s.from, to: s.to }));
const fx = shifts => ({ [key('config', 'main')]: { people, headId: 'gus', sousIds: ['sam'], staffIds: people.map(p => p.id), kitShifts: shifts, kitSecs: D.sections },
  [key('team', today)]: { day: today, on: D.on, br: D.br, v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'gus' } });
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700&family=Barlow+Condensed:wght@700&family=Caveat:wght@700&display=swap';
async function bookFonts(p) {
  await p.context().unroute(/fonts\.(googleapis|gstatic)\.com/);
  await p.addStyleTag({ url: FONT_CSS });
  const got = await p.evaluate(() => Promise.all(['400 13px Barlow', '600 13px Barlow', '700 13px Barlow', '700 16px "Barlow Condensed"', '700 16px Caveat'].map(f => document.fonts.load(f))).then(r => r.every(x => x.length > 0)));
  if (!got) throw new Error('the book\'s fonts did not load');
  await p.evaluate(() => document.fonts.ready); await L.settle(p, 300);
}
const measure = p => p.evaluate(() => {
  const dock = document.querySelector('.tm-focus-save').getBoundingClientRect(), names = [...document.querySelectorAll('.tm-away-row')], board = document.querySelector('.tm-away').getBoundingClientRect();
  const top = s => { const e = document.querySelector(s); return e && e.getClientRects().length ? Math.round(e.getBoundingClientRect().top) : null; };
  return { names: names.filter(e => e.getBoundingClientRect().bottom <= dock.top + .5).length + ' of ' + names.length, boardTop: Math.round(board.top), boardBottom: Math.round(board.bottom), dockTop: Math.round(dock.top), dockH: Math.round(dock.height),
    short: Math.max(0, Math.round(names.length ? names[names.length - 1].getBoundingClientRect().bottom - dock.top : 0)),
    heads: { pbar: top('.p-bar'), rooms: top('.a-nav'), heading: top('.ad-heading'), tabs: top('.a-tabs'), nhead: top('.tm-nhead'), date: top('.tm-date-controls') },
    overflow: document.documentElement.scrollWidth > innerWidth };
});
const PAGES = [['admin', '#/admin', { admin: true, adminPage: 'plan' }], ['team', '#/team', { who: 'sam' }], ['chef', '#/chef', { who: 'sam' }]];
const SIZES = (process.env.SIZES || '320x568,375x667,360x740,390x844,412x915').split(',').map(s => s.split('x').map(Number));
async function chefPlan(p) {
  await L.waitFor(p, () => !!document.querySelector('[data-p="c-group"][data-g="team"]'), null, 8000);
  await p.evaluate(() => document.querySelector('[data-p="c-group"][data-g="team"]').click()); await L.settle(p, 300);
  await p.evaluate(() => { const t = document.querySelector('[data-p="c-tab"][data-t="plan"]'); if (t && t.getAttribute('aria-pressed') !== 'true') t.click(); });
}
(async () => {
  const b = await L.start(), out = {};
  for (const [w, h] of SIZES) for (const [page, hash, o] of PAGES) for (const [state, shifts] of [['enough', PLAIN], ['short', BUSY]]) {
    const p = await L.open(b, hash, Object.assign({ extra: fx(shifts), wait: 1800, clock: L.NOW + 270 * 60000, width: w, height: h }, o));
    if (page === 'chef') await chefPlan(p);
    await L.waitFor(p, () => document.querySelectorAll('.tm-person-row').length >= 7 && document.querySelectorAll('.tm-away-row').length >= 4, null, 9000);
    if (EXTRA) await p.addStyleTag({ content: EXTRA });
    await L.settle(p, 300); await bookFonts(p);
    const m = await measure(p); out[w + 'x' + h + ' ' + page + ' ' + state] = Object.assign(m, { errors: p.errors.length });
    if (process.env.SHOTS && state === 'short') await p.screenshot({ path: path.join(OUT, 'short-' + LABEL + '-' + page + '-' + w + 'x' + h + '.png') });
    await p.context().close();
  }
  fs.writeFileSync(path.join(OUT, 'short-phones-' + LABEL + '.json'), JSON.stringify(out, null, 2));
  for (const [k, m] of Object.entries(out)) console.log(k.padEnd(24), m.names.padEnd(7), 'board', m.boardTop + '-' + m.boardBottom, 'dock', m.dockTop, '(' + m.dockH + ')', 'cut', m.short, m.overflow ? 'OVERFLOW' : '', m.errors ? 'ERR' : '');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
