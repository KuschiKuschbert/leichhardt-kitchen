// Implemented app for docs/team-short-ok-options/brief.md (Built): the band in the click-test stand-in, the study's
// made-up day at 18:30, Dinner busy time 17:30 to 20:30 with 6 needed. States: short (saved plan), accepting (Accept
// tapped, not saved), accepted (saved, from the record), worse (accepted at 18:00, Sam K's save left 3 on), and the
// plan with no busy time set (as before the warning). Fallback fonts. Synthetic data only.
// Run from tests/:  CHROME=<headless shell> node ../docs/team-short-ok-options/implemented.cjs
const path = require('path'), fs = require('fs');
const L = require(path.resolve(__dirname, '../../tests/lib'));
const OUT = __dirname, key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const today = L.ymd(new Date(L.NOW)), AT = m => L.NOW + (m - 840) * 60000;
global.window = {}; require('../team-minimum-options/data.js'); const D = window.TM_DATA;
const people = [{ id: 'gus', name: 'Gus', role: 'head', active: true, add: true, tick: true, del: true }, { id: 'sam', name: 'Sam K', role: 'sous', active: true, add: true, tick: true, del: true },
  ...['Ari', 'Bea', 'Cal', 'Dev', 'Eli', 'Fen', 'Gia', 'Hal'].map(n => ({ id: n.toLowerCase(), name: n, role: 'staff', active: true, add: true, tick: true }))];
const BUSY = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900, busy: { from: 720, to: 840, n: 3 } }, { id: 'dinner', name: 'Dinner', from: 900, to: 1260, busy: { from: 1050, to: 1230, n: 6 } }];
const PLAIN = BUSY.map(s => ({ id: s.id, name: s.name, from: s.from, to: s.to }));
const OK = { sh: 'dinner', from: 1110, to: 1140, n: 6, low: 4, by: 'gus', at: AT(1080) };
const team = x => Object.assign({ day: today, on: D.on, br: D.br, v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'gus' }, x || {});
const fx = (shifts, t) => ({ [key('config', 'main')]: { people, headId: 'gus', sousIds: ['sam'], staffIds: people.map(p => p.id), kitShifts: shifts, kitSecs: D.sections }, [key('team', today)]: t });
const STATES = {
  before: () => fx(PLAIN, team()), short: () => fx(BUSY, team()), accepting: () => fx(BUSY, team()),
  accepted: () => fx(BUSY, team({ ok: [OK], v: 2, upd: AT(1085) })),
  worse: () => fx(BUSY, team({ br: D.br.concat([{ id: 'eli', sh: 'dinner', at: 1110, len: 30 }]), ok: [OK], v: 2, upd: AT(1090), by: 'sam' }))
};
const measure = p => p.evaluate(() => {
  const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); };
  const bg = e => { while (e) { const b = getComputedStyle(e).backgroundColor; if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) return b; e = e.parentElement; } return 'rgb(255,255,255)'; };
  const ratio = s => { const e = document.querySelector(s); if (!e) return null; const a = lum(getComputedStyle(e).color), b = lum(bg(e)); return Math.round((Math.max(a, b) + .05) / (Math.min(a, b) + .05) * 100) / 100; };
  const dock = document.querySelector('.tm-focus-save').getBoundingClientRect(), head = document.querySelector('.tm-planhead').getBoundingClientRect();
  let bottom = innerHeight; const nav = document.querySelector('.tabbar'); if (nav && nav.getClientRects().length) { const r = nav.getBoundingClientRect(); if (r.top > innerHeight / 2) bottom = Math.min(bottom, r.top); }
  bottom = Math.min(bottom, dock.top); const top = head.top >= 0 && head.top <= 200 ? head.bottom : 0;
  const sz = s => { const e = document.querySelector(s); if (!e) return ''; const r = e.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); };
  const band = document.querySelector('.tm-short-line');
  return { dockH: Math.round(dock.height), listPx: Math.max(0, Math.round(bottom - top)), words: band && !band.hidden ? band.innerText.replace(/\s+/g, ' ').trim() : '',
    board: [...document.querySelectorAll('.tm-away-row')].filter(e => e.getBoundingClientRect().bottom <= dock.top + .5).length + ' of ' + document.querySelectorAll('.tm-away-row').length,
    accept: sz('[data-p="tm-short-ok"]'), link: sz('[data-p="tm-short-go"]'), undo: sz('[data-p="tm-short-undo"]'),
    contrast: { tooFew: ratio('.tm-short-tf'), fact: ratio('.tm-short-fact'), why: ratio('.tm-short-why'), accept: ratio('[data-p="tm-short-ok"]'), link: ratio('[data-p="tm-short-go"]'), mark: ratio('.tm-short-mark:not([hidden])') },
    overflow: document.documentElement.scrollWidth > innerWidth };
});
(async () => {
  const b = await L.start(), out = {};
  for (const [label, hash, o] of [['admin-390', '#/admin', { admin: true, adminPage: 'plan', width: 390 }], ['team-390', '#/team', { who: 'sam', width: 390 }], ['admin-768', '#/admin', { admin: true, adminPage: 'plan', width: 768 }], ['admin-1280', '#/admin', { admin: true, adminPage: 'plan', width: 1280 }]]) {
    for (const st of Object.keys(STATES)) {
      const p = await L.open(b, hash, Object.assign({ extra: STATES[st](), wait: 1800, clock: AT(1110) }, o));
      await L.waitFor(p, () => document.querySelectorAll('.tm-tlrow').length >= 7, null, 9000); await L.settle(p, 400);
      if (st === 'accepting') { await p.evaluate(() => document.querySelector('.tm-short-line [data-p="tm-short-ok"]').click()); await L.settle(p, 300); }   // a plain tap: Playwright's click scrolls the sticky dock's button into view
      const first = await measure(p);
      if (st !== 'before') await p.screenshot({ path: path.join(OUT, 'implemented-' + label + '-' + st + '.png') });
      await p.evaluate(() => { const h = document.querySelector('.tm-planhead'); window.scrollTo(0, h.getBoundingClientRect().top + scrollY - 60); }); await L.settle(p, 200);
      const working = await measure(p);
      if (/390/.test(label) && ['short', 'accepted'].includes(st)) await p.screenshot({ path: path.join(OUT, 'implemented-' + label + '-' + st + '-working.png') });
      out[label + '-' + st] = { first, working: { listPx: working.listPx, dockH: working.dockH }, errors: p.errors.length };
      await p.context().close();
    }
  }
  fs.writeFileSync(path.join(OUT, 'implemented.json'), JSON.stringify(out, null, 2));
  for (const k in out) { const v = out[k]; console.log(k, 'dock', v.first.dockH, 'list', v.working.listPx, 'board', v.first.board, 'acc', v.first.accept, 'link', v.first.link, 'undo', v.first.undo, JSON.stringify(v.first.contrast), v.first.overflow ? 'OVERFLOW' : '', v.errors ? 'ERR' : ''); }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
