/*
  Round 3 of the band study (19 Nov 2026, docs/band-options/brief.md): the slim strip the book already pins once the
  band scrolls away, used on Prep from the start (D); Prep keeping its place when you come back from another tab (E,
  shown as the place you return to); and the cut-off joining that strip in its last hour, two fixed halves (F).
  Same pretend busy day and moments as shoot.js. Not loaded by the book or the tests.
    cd tests && BASE=http://127.0.0.1:<port>/ node ../docs/band-options/shoot-strip.js
*/
const path = require('path'), fs = require('fs');
const root = path.join(__dirname, '..', '..');
const L = require(path.join(root, 'tests', 'lib.js'));
const M = require(path.join(root, 'js', 'functions.js'));
const out = path.join(__dirname, 'previews');
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
const MOMENTS = { prep: 0, service: 255 };
const SHOTS = [['head', 390, 844, 'prep'], ['head', 390, 844, 'service'], ['staff', 390, 844, 'prep'], ['head', 768, 1024, 'prep'], ['head', 1280, 900, 'prep']];

// in the page: the strip's words, and (F) the cut-off's half beside them, two fixed halves
function cutHalf() {
  const row = document.querySelector('#cut-band .cut-row'); if (!row) return '';
  const a = row.querySelector('.cut-n'), t = row.querySelector('.cut-t').textContent.replace(/\s+/g, ' ');
  const by = (t.match(/by (\d\d:\d\d)/) || [])[1] || '', left = (t.match(/in ([^ ]+ [hm]+)/) || [])[1] || '', soon = row.classList.contains('is-soon');
  if (!soon) return '';   // only in its last hour
  return '<a class="fs-cut" href="' + a.getAttribute('href') + '"><span class="fs-l">Order</span> <b class="fn-due">' + by + '</b> <span class="fs-n">' + a.textContent + '</span> <span class="fs-pill">in ' + left + '</span></a>';
}
const CSS = '.fn-strip.fs-split, .fs-top.fs-split { display: flex; } .fs-split { max-width: 100%; overflow: hidden; } .fs-split .fn-strip-b { flex: 0 0 50%; width: auto; min-width: 0; max-width: 50%; box-sizing: border-box; margin: 0; border-right: 1px solid rgba(251, 248, 241, 0.22); }' +
  '.fs-cut { flex: 0 0 50%; max-width: 50%; box-sizing: border-box; display: flex; align-items: center; gap: 0.35rem; min-width: 0; min-height: 44px; padding: 0.45rem 0.9rem; color: var(--bar-text); text-decoration: none; white-space: nowrap; overflow: hidden; }' +
  '.fs-l { font: 700 0.75rem var(--display); letter-spacing: 0.12em; text-transform: uppercase; color: var(--bar-accent); flex: none; }' +
  '.fs-cut .fn-due { flex: none; } .fs-n { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; }' +
  '.fs-pill { flex: none; padding: 0 5px; border-radius: 4px; background: var(--bar-accent); color: var(--bar); font-weight: 700; }' +
  '.fs-top { position: static !important; box-shadow: inset 0 -3px 0 var(--accent-ink) !important; }';
function measure() {
  const vis = e => !!e && !e.hidden && e.getClientRects().length > 0 && e.getBoundingClientRect().bottom > 0;
  const dock = document.querySelector('.wk-dock'), tab = document.querySelector('.tabbar'), strip = [...document.querySelectorAll('.fn-strip')].find(e => vis(e) && getComputedStyle(e).position === 'fixed');
  const floor = Math.min(vis(dock) && getComputedStyle(dock).position === 'fixed' ? dock.getBoundingClientRect().top : innerHeight, vis(tab) ? tab.getBoundingClientRect().top : innerHeight);
  const ceil = strip ? strip.getBoundingClientRect().bottom : 0;
  const bars = [...document.querySelectorAll('#fn-band, #cut-band, .fs-top')].filter(vis).reduce((s, e) => s + Math.max(0, Math.min(e.getBoundingClientRect().bottom, innerHeight) - Math.max(e.getBoundingClientRect().top, 0)), 0) + (strip ? strip.offsetHeight : 0);
  return { barsH: Math.round(bars), lines: [...document.querySelectorAll('#prep-root .nb-row')].filter(r => { const x = r.getBoundingClientRect(); return x.top >= ceil - 1 && x.bottom <= floor + 1 && x.height > 0; }).length };
}
(async () => {
  const b = await L.start(), res = {};
  for (const v of ['d', 'f']) {
    for (const [who, w, h, moment] of SHOTS) {
      const p = await L.open(b, '#/prep', { admin: who === 'head', who: who === 'head' ? 'kit' : 'ann', width: w, height: h, touch: w < 720, wait: 2200, extra, clock: L.NOW + MOMENTS[moment] * 60000 });
      await L.waitFor(p, () => !!document.querySelector('#fn-band:not([hidden])'), null, 8000).catch(() => {});
      await p.addStyleTag({ content: CSS });
      // the place Prep would keep (E): the first line near the top, the band scrolled away and its strip pinned
      const goList = () => p.evaluate(() => { const s = document.querySelector('#prep-root .nb-row'); window.scrollTo(0, scrollY + s.getBoundingClientRect().top - 120); });
      // a short pretend list on a big screen cannot scroll the band away: a spacer stands in for a longer list
      await p.evaluate(() => { const sp = document.createElement('div'); sp.id = 'fs-spacer'; sp.style.height = '1200px'; document.body.appendChild(sp); });
      await goList(); await L.settle(p, 500);
      const half = v === 'f' ? await p.evaluate(cutHalf) : '';
      // the return picture (D+E, or D+E+F): today's pinned strip, with the cut-off half for F
      await p.evaluate(hf => { const s = document.querySelector('.fn-strip'); if (s && hf) { s.classList.add('fs-split'); s.insertAdjacentHTML('beforeend', hf); } }, half);
      await L.settle(p, 150);
      const ret = await p.evaluate(measure);
      await p.screenshot({ path: path.join(out, v + 'e-' + who + '-' + w + '-' + moment + '.png') });
      // the first opening (D, or D+F): that strip in the band's place at the top; with F in the cut-off's last hour the
      // cut-off bar is drawn in the strip instead
      await p.evaluate(hf => {
        const s = document.querySelector('.fn-strip'), band = document.getElementById('fn-band');
        const top = s.cloneNode(true); top.classList.add('fs-top'); top.hidden = false; top.style.position = 'static';
        band.style.display = 'none'; band.parentNode.insertBefore(top, band);
        s.remove();
        if (hf) { const c = document.getElementById('cut-band'); if (c) c.style.display = 'none'; }
        window.scrollTo(0, 0); const sp = document.getElementById('fs-spacer'); if (sp) sp.remove();
      }, half);
      await L.settle(p, 300);
      await p.evaluate(() => { const s = document.querySelector('body > .fn-strip'); if (s) s.hidden = true; });
      const open = await p.evaluate(measure);
      await p.screenshot({ path: path.join(out, v + '-' + who + '-' + w + '-' + moment + '.png') });
      const key = v + '-' + who + '-' + w + '-' + moment;
      res[key] = { open, ret, errors: p.errors.slice(), overflow: await L.overflow(p) };
      console.log(key, JSON.stringify({ open, ret, overflow: res[key].overflow || '' }));
      await p.context().close();
    }
  }
  await b.close();
  fs.writeFileSync(path.join(__dirname, 'measures-strip.json'), JSON.stringify(res, null, 1) + '\n');
})().catch(e => { console.error(e); process.exit(1); });
