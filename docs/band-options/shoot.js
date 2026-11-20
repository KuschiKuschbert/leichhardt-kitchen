/*
  Pictures and measurements of the band designs on the real book (19 Nov 2026, docs/band-options/brief.md).
  The click tests' stand-in, a pretend busy day: three functions tonight (rounds 18:30, 19:00, 19:30; the first already
  sent), and a supplier whose order closes at 15:00. Two moments: Prep at 14:00 (the cut-off in its last hour,
  food 4.5 hours away) and service at 18:15 (the cut-off passed, rounds due). Not loaded by the book or the tests.
    cd tests && BASE=http://127.0.0.1:<port>/ node ../docs/band-options/shoot.js
  Writes docs/band-options/previews/*.png and measures.json.
*/
const path = require('path'), fs = require('fs');
const root = path.join(__dirname, '..', '..');
const L = require(path.join(root, 'tests', 'lib.js'));
const M = require(path.join(root, 'js', 'functions.js'));
const out = path.join(__dirname, 'previews');
fs.mkdirSync(out, { recursive: true });
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW)), t = hm => M.kat(today, M.hmMin(hm));
const P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true });
const next = (new Date(L.NOW).getDay() + 1) % 7;
const fn = (id, name, start, round) => M.derive({ v: 1, status: 'confirmed', name, date: today, start: t(start), loc: 'Beer garden', guests: 40, mode: 'all', notes: '', kc: '', kcBy: '', kcAt: 0,
  rounds: [{ at: t(round), note: '' }], lines: [{ rid: 'antipasto-platter', name: 'Antipasto Platter', unit: 'platter', spec: 'Per platter.', fp: '', qty: 2, u: M.toU([2]) }],
  was: {}, chg: [], cBy: 'kit', cAt: L.NOW - 86400000, confBy: 'kit', confAt: L.NOW - 86400000, by: 'kit', upd: L.NOW - 3600000 });
const extra = {
  [fsKey(['config', 'main'])]: { people: [P('kit', 'Kit', 'head'), P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'staff'), P('bo', 'Bo', 'staff')], headId: 'kit', sousIds: ['kit', 'sam'], pingIds: ['kit', 'sam'],
    staffIds: ['kit', 'sam', 'ann', 'bo'], showBadges: true, cutoffs: [{ id: 'northside', name: 'Northside Test Foods', dd: [next], at: 900, pre: 1, lead: 240 }] },
  [fsKey(['config', 'admins'])]: { x: 1, mailOpened: L.NOW },
  [fsKey(['functions', 'smith'])]: fn('smith', 'Smith 50th', '18:00', '18:30'),
  [fsKey(['functions', 'jones'])]: fn('jones', 'Jones wedding', '18:30', '19:00'),
  [fsKey(['functions', 'brown'])]: fn('brown', 'Brown wake', '19:00', '19:30'),
  [fsKey(['fnsent', 'smith_' + t('18:30')])]: { fid: 'smith', at: t('18:30'), day: today, sent: true, sentAt: L.NOW - 60000, sentBy: 'kit' }
};
['kit', 'sam', 'ann', 'bo'].forEach(id => { extra[fsKey(['pinset', id])] = { at: 1 }; extra[fsKey(['drinks', id])] = { kind: 'flat', size: 'reg', milk: '', shot: '', sugar: '', note: '', other: '', at: L.NOW - 86400000, by: id }; });
const MOMENTS = { prep: 0, service: 255 };   // minutes after 14:00
const SHOTS = [
  ['head', 390, 844, 'prep'], ['head', 390, 844, 'service'], ['staff', 390, 844, 'prep'], ['head', 768, 1024, 'prep'], ['head', 1280, 900, 'prep']
];
function measure() {
  const vis = e => !!e && !e.hidden && e.getClientRects().length > 0;
  const bars = [...document.querySelectorAll('#fn-band, #cut-band, .bv-wrap, .fn-band, .cut-band')].filter(vis).filter((e, i, a) => !a.some(o => o !== e && o.contains(e)));
  const barsH = Math.round(bars.reduce((s, e) => s + e.getBoundingClientRect().height, 0));
  const dock = document.querySelector('.wk-dock'), tab = document.querySelector('.tabbar');
  const floor = Math.min(vis(dock) && getComputedStyle(dock).position === 'fixed' ? dock.getBoundingClientRect().top : innerHeight, vis(tab) ? tab.getBoundingClientRect().top : innerHeight);
  const lines = [...document.querySelectorAll('#prep-root .nb-row')].filter(r => { const x = r.getBoundingClientRect(); return x.top >= 0 && x.bottom <= floor + 1 && x.height > 0; }).length;
  const taps = bars.flatMap(b => [...b.querySelectorAll('a, button')]).filter(vis).map(e => ({ w: (e.getAttribute('aria-label') || e.textContent).replace(/\s+/g, ' ').trim().slice(0, 30), h: Math.round(e.getBoundingClientRect().height) }));
  return { barsH, lines, taps };
}
(async () => {
  const b = await L.start(), res = {};
  for (const v of (process.env.ONLY || 'today,a,b,c,mix').split(',')) {
    for (const [who, w, h, moment] of SHOTS) {
      const p = await L.open(b, '#/prep', { admin: who === 'head', who: who === 'head' ? 'kit' : 'ann', width: w, height: h, touch: w < 720, wait: 2200, extra, clock: L.NOW + MOMENTS[moment] * 60000 });
      await L.waitFor(p, () => !!document.querySelector('#fn-band:not([hidden])'), null, 8000).catch(() => {});
      // A: the band folds itself while the next round is more than an hour away (at 14:00 it is 5 hours away)
      if ((v === 'a' || v === 'mix') && moment === 'prep') { await p.click('.fn-band .fn-fold'); await L.settle(p, 300); }
      await p.addScriptTag({ url: (process.env.BASE || L.BASE) + 'docs/band-options/variants.js' });
      const r = await p.evaluate(x => window.bandVariant(x), v);
      await L.settle(p, 250);
      const m = await p.evaluate(measure);
      m.overflow = await L.overflow(p);
      m.errors = p.errors.slice();
      m.ok = r.ok;
      const key = v + '-' + who + '-' + w + '-' + moment;
      res[key] = m;
      await p.screenshot({ path: path.join(out, key + '.png') });
      await p.context().close();
      console.log(key, JSON.stringify({ bars: m.barsH, lines: m.lines, minTap: Math.min(...m.taps.map(x => x.h), 999), overflow: m.overflow || '' }));
    }
  }
  await b.close();
  const file = path.join(__dirname, 'measures.json'), old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  fs.writeFileSync(file, JSON.stringify(Object.assign(old, res), null, 1) + '\n');
})().catch(e => { console.error(e); process.exit(1); });
