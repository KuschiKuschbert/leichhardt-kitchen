/* Round 2 designs drawn inside the book's real pages (26 Nov 2026). Not the book: the click-test stand-in opens a real
   page (its shell, top bar, tab bar, the Chef's Desk rail, the real form), and a design's markup, built from the book's
   own classes, is put into that page before the picture is taken. Nothing is saved and no application file changes.
   Run from a checkout at the commit the packet names (cwd), with the click tests' packages. */
const path = require('path'), ROOT = process.cwd();
const L = require(path.join(ROOT, 'tests/lib')), server = require(path.join(ROOT, 'tests/serve')), schedule = require(path.join(ROOT, 'js/cleaning-schedule'));
const key = (...p) => ['kitchens', L.PIN, ...p].join('/'), OPEN = 253402178400000, DAY = 86400000;
const WED = Date.parse('2026-12-02T04:00:00Z');   // Wednesday 2 December 2026, 14:00 Queensland
const SECS = [['grill', 'Grill'], ['pans', 'Pans'], ['fry', 'Fryers, salads and dessert'], ['hot', 'Hot larder']];
const cleaning = {};
schedule.drafts().concat(schedule.packDownDrafts(), schedule.sectionDrafts()).forEach(d => {
  const id = 'clean-template-' + d.plan.template, g = schedule.sectionGroupOf(d), sec = SECS.find(s => s[0] === g);
  cleaning[key('cleaningTasks', id)] = { ...d, shared: !sec, section: sec ? sec[0] : '', sectionName: sec ? sec[1] : '', root: id, prev: '', next: '', from: Date.parse('2026-11-01T00:00:00+10:00'), until: OPEN, at: WED - 20 * DAY, by: 'sam' };
});
SECS.forEach(([id, name]) => { cleaning[key('sections', id)] = { name, uses: 5, hidden: false }; });
cleaning[key('config', 'main')] = { ...L.seed()[key('config', 'main')], kitSecs: SECS.map(([id, name]) => ({ id, name })) };
const day = n => L.ymd(new Date(L.NOW - n * DAY)), rows = [];
for (let i = 40; i >= 1; i--) rows.push({ day: day(i), p: { n: 20, w: 18, t: 17, r: 2, sec: {}, mins: {}, who: {} }, w: { n: 0, reason: {}, sec: {}, items: [] }, x: { out: 0, in: 0 },
  fs: { v: 1, del: [], c: i === 1 ? { cv: 1, due: 52, done: 47, miss: ['Clean behind the pizza ovens'], missN: 1, unable: [], unableN: 0, wait: [], waitN: 0, ev: 4, evRec: 4 } : { cv: 1, due: 50, done: 46, miss: [], missN: 0, unable: [], unableN: 0, wait: [], waitN: 0, ev: 4, evRec: 4 }, cool: { k: 'none' } } });
const admin = { [key('analysis', 'dashboard')]: { v: 1, generation: 'g1', at: L.NOW - 11 * 3600000, from: day(40), to: day(1), days: rows }, [key('analysis', 'health')]: { at: L.NOW - 11 * 3600000, status: 'ok' } };
const fonts = p => p.addStyleTag({ content: ['barlow:Barlow:400', 'barlow-600:Barlow:600', 'barlow-700:Barlow:700', 'barlow-condensed:Barlow Condensed:700', 'caveat:Caveat:700'].map(f => { const [file, fam, w] = f.split(':'); return "@font-face{font-family:'" + fam + "';font-weight:" + w + ";src:url('/docs/cleaning-chef-options/fonts/" + file + ".woff2') format('woff2')}"; }).join('') }).then(() => p.evaluate(() => document.fonts.ready));
let base = '', browser = null;
async function start() { const port = 20000 + Math.floor(Math.random() * 20000); await new Promise(r => server.listen(port, '127.0.0.1', r)); base = 'http://127.0.0.1:' + port + '/'; browser = await L.start(); }
async function stop() { await browser.close(); server.close(); }
const size = w => ({ width: w, height: w === 390 ? 844 : 900 });
// the chef's Cleaning page on Repeat tasks; with edit, the real editor open on the first job that matches
async function chef(width, edit) {
  const p = await L.open(browser, '#/cleaning', { who: 'sam', ...size(width), base, extra: cleaning, clock: WED, wait: 1000 });
  await L.waitFor(p, () => { const pg = document.querySelector('.cln-page'); return pg && !/Loading cleaning/.test(pg.textContent); });
  await fonts(p); await p.click('[data-cln="setup"]'); await L.settle(p, 300);
  if (edit) {
    await p.fill('.cln-searchbar input', edit); await L.settle(p, 500); await p.click('[data-cln="edit"]'); await L.settle(p, 500);
    const title = await p.$eval('.cln-editor-title', e => e.textContent.trim());
    if (title.toLowerCase().indexOf(edit.toLowerCase()) < 0) throw new Error('the editor opened "' + title + '", not a job matching "' + edit + '"');
  }
  return p;
}
// a cook's Cleaning day, on a personal phone, having picked Grill: the page no design may change
async function cook(width) {
  const p = await L.open(browser, '#/cleaning', { who: 'ann', ...size(width), base, extra: cleaning, clock: WED, wait: 1000,
    init: () => { const d = new Date(Date.now() + 36e5 * 10).toISOString().slice(0, 10); localStorage.setItem('lk.sec.ann', JSON.stringify({ d, sec: 'grill', name: 'Grill', self: true, at: Date.now() })); } });
  await L.waitFor(p, () => { const pg = document.querySelector('.cln-page'); return pg && !/Loading cleaning/.test(pg.textContent); });
  await fonts(p); return p;
}
// the admin panel: '' is Today's Inbox; a tab name opens that Reports page
async function adminPage(width, tab) {
  const p = await L.open(browser, '#/admin', { admin: true, adminPage: tab ? undefined : '', who: tab ? undefined : '', ...size(width), base, extra: admin, wait: 2200 });
  await fonts(p); if (tab) { await L.adminTab(p, tab); await L.settle(p, 700); }
  return p;
}
// what the reviewers need counted, on the parts a design put into the page (marked data-design)
const measure = p => p.evaluate(() => {
  const lum = c => { const a = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
  const rgba = s => { const m = /rgba?\(([^)]+)\)/.exec(s); if (!m) return [0, 0, 0, 0]; const v = m[1].split(',').map(Number); return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1]; };
  const over = (top, under) => { const a = top[3]; return [0, 1, 2].map(i => top[i] * a + under[i] * (1 - a)).concat(1); };
  const bgOf = e => { const chain = []; for (let n = e; n; n = n.parentElement) chain.push(rgba(getComputedStyle(n).backgroundColor)); let bg = [255, 255, 255, 1]; for (let i = chain.length - 1; i >= 0; i--) if (chain[i][3] > 0) bg = over(chain[i], bg); return bg; };
  const opacityOf = e => { let o = 1; for (let n = e; n; n = n.parentElement) o *= +getComputedStyle(n).opacity; return o; };
  const roots = [...document.querySelectorAll('[data-design]')]; let worst = null; const small = [];
  roots.forEach(root => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      const text = t.textContent.trim(), e = t.parentElement; if (!text || !e.getClientRects().length) continue;
      const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || e.closest('.visually-hidden')) continue;
      const bg = bgOf(e), fg0 = rgba(cs.color); fg0[3] *= opacityOf(e); const fg = over(fg0, bg), l1 = lum(fg), l2 = lum(bg), ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      const px = parseFloat(cs.fontSize), large = px >= 24 || (px >= 18.66 && +cs.fontWeight >= 700);
      if (!worst || ratio / (large ? 3 : 4.5) < worst.margin) worst = { ratio: Math.round(ratio * 100) / 100, px, large, text: text.slice(0, 50), margin: ratio / (large ? 3 : 4.5) };
      if (px < 12) small.push(px + 'px: ' + text.slice(0, 30));
    }
  });
  const controls = roots.flatMap(r => [...r.querySelectorAll('button, a[href], select, input, textarea, summary, [role="button"]')]).filter(e => e.getClientRects().length && !e.closest('.visually-hidden'));
  const under = controls.filter(e => { const b = e.getBoundingClientRect(); return b.height < 44 || b.width < 44; }).map(e => (e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 24) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height));
  // a control's edge: its border against what it sits on, or its fill against that when it has no border
  const ratioOf = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  let edge = null;
  controls.filter(e => !e.matches('a, summary, .p-link')).forEach(e => {
    const cs = getComputedStyle(e), around = bgOf(e.parentElement), bw = parseFloat(cs.borderTopWidth), bc = rgba(cs.borderTopColor), fill = rgba(cs.backgroundColor);
    const line = bw > 0 && bc[3] > 0 ? over(bc, around) : fill[3] > 0 ? over(fill, around) : null; if (!line) return;
    const r = ratioOf(line, around); if (!edge || r < edge.ratio) edge = { ratio: Math.round(r * 100) / 100, passes: r >= 3, on: (e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 24), how: bw > 0 && bc[3] > 0 ? 'border' : 'fill' };
  });
  return { screensLong: Math.round(document.documentElement.scrollHeight / innerHeight * 10) / 10, sideways: document.documentElement.scrollWidth > innerWidth, controls: controls.length, under44: under,
    lowestContrast: worst && { ratio: worst.ratio, fontPx: worst.px, large: worst.large, passes: worst.margin >= 1, text: worst.text }, lowestControlEdge: edge, textUnder12px: small.slice(0, 5) };
});
// keyboard focus on the first control a design added: the ring the book draws, as rendered
// reached with the Tab key, not a scripted focus, so the browser draws the ring a keyboard user sees
async function focusRing(p) {
  const ok = await p.evaluate(() => { const all = [...document.querySelectorAll('button, a[href], select, input, textarea, summary')].filter(e => e.getClientRects().length && !e.disabled && e.tabIndex >= 0), first = all.findIndex(e => e.closest('[data-design]')); if (first < 1) return false; all[first - 1].focus(); return true; });
  if (!ok) return null;
  await p.keyboard.press('Tab');
  return p.evaluate(() => { const e = document.activeElement; if (!e || !e.closest('[data-design]')) return { reached: false, on: e ? (e.textContent || e.tagName).trim().slice(0, 24) : '' };
    const cs = getComputedStyle(e), rgba = s => { const m = /rgba?\(([^)]+)\)/.exec(s); const v = m ? m[1].split(',').map(Number) : [0, 0, 0, 0]; return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1]; };
    const lum = c => { const a = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
    let bg = [255, 255, 255, 1]; for (let n = e.parentElement; n; n = n.parentElement) { const c = rgba(getComputedStyle(n).backgroundColor); if (c[3] > 0) { bg = c; break; } }
    const ring = rgba(cs.outlineColor), l1 = lum(ring.slice(0, 3)), l2 = lum(bg.slice(0, 3));
    return { reached: true, on: (e.textContent || e.tagName).trim().slice(0, 24), focusVisible: e.matches(':focus-visible'), outline: cs.outlineStyle + ' ' + cs.outlineWidth, offset: cs.outlineOffset, ringAgainstSurround: Math.round((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) * 100) / 100 }; });
}
module.exports = { L, start, stop, chef, cook, adminPage, measure, focusRing, fonts, SECS, WED, schedule, day };
