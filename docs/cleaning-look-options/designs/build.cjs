/* Round 2: three designs for the cook's Cleaning page, drawn inside the real page (26 Nov 2026).
     (cd <a checkout at the packet's commit> && node docs/cleaning-look-options/designs/build.cjs)   ONLY=a node ... for one design
   The click-test stand-in opens the real Cleaning page (shell, top bar, tab bar, the real rows and their real tick, Undo
   and Who did this). Each design is a rearrangement of that page, put back after every redraw the page makes, so a real
   tick can be pressed and the next box measured (break-it S1). Parts a design adds or moves carry data-design, which the
   round 2 harness (../../cleaning-tracking-options/designs/frame.cjs) measures for contrast, 44 px targets and focus.
   Made-up people (Ann the cook, Sam the head chef) and the head chef's real lists under made-up sections. Nothing is saved
   outside the stand-in and no application file changes. Writes PNGs and measurements.json beside this file. */
const path = require('path'), fs = require('fs');
const F = require('../../cleaning-tracking-options/designs/frame.cjs');
const OUT = __dirname, ONLY = process.env.ONLY || '';

/* ---------- the designs, as functions run in the page: idempotent, put back after every redraw ---------- */
const COMMON = function () {
  // a row's small line without the section name its heading already says ("Grill · To do" under Grill reads "To do")
  window.dzStrip = function (scope, name) {
    if (!scope || !name) return;
    scope.querySelectorAll('.nb-meta').forEach(function (m) {
      var parts = m.textContent.split(' · '), kept = parts.filter(function (p) { return p.toLowerCase() !== name.toLowerCase(); });
      if (kept.length < parts.length) { m.textContent = kept.join(' · '); m.setAttribute('title', m.textContent); }
    });
  };
  window.dzCount = function (scope) { var d = 0, t = 0; (scope ? scope.querySelectorAll('.cln-group-count') : []).forEach(function (c) { var m = /(\d+)\/(\d+)/.exec(c.textContent); if (m) { d += +m[1]; t += +m[2]; } }); return [d, t]; };
  window.dzRestStrip = function (page) {
    page.querySelectorAll('.cln-body > section, .cln-body .cln-packdown-group').forEach(function (s) { var h = s.querySelector('.nb-hd > span'); if (h) window.dzStrip(s, h.textContent.replace(/: (section clean|pack down)$/i, '')); });
  };
  window.dzWho = function (page) {   // on a shared screen: the screen's section, and the cook's own when it is another
    var small = page.querySelector('.cln-mine-title small'), why = small ? small.textContent : '', m = /You are on (.+) today/.exec(why);
    return { screen: /This screen/.test(why), own: m ? m[1] : '', name: (page.querySelector('.cln-mine-title > span') || {}).textContent || '' };
  };
  window.dzTemp = '<p class="hint dz-temp" data-design>Temperature logs must be completed first thing in the morning and before dinner service. Record them in the venue\'s temperature log.</p>';
};

// A: the same page, tidied. One column everywhere. The frame shrinks; nothing moves out of its order.
const A = function () {
  var page = document.querySelector('#cleaning-root .cln-page'); if (!page || page.dataset.dz) return; page.dataset.dz = 'a';
  var mine = page.querySelector('.cln-mine'), who = window.dzWho(page), own = window.dzCount(mine), prog = page.querySelector('.cln-progress');
  var all = prog ? /(\d+)\/(\d+)/.exec(prog.textContent) : null;
  if (prog && mine) { prog.className = 'dz-prog'; prog.setAttribute('data-design', ''); prog.innerHTML = '<b>' + who.name + ': ' + own[0] + ' of ' + own[1] + '</b><small>' + (all ? all[1] + ' of ' + all[2] + ' in the kitchen' : '') + '</small>'; }
  var temp = page.querySelector('.cln-temperature'); if (temp && mine) { temp.remove(); mine.insertAdjacentHTML('beforeend', window.dzTemp); }
  var cov = page.querySelector('.cln-coverage'), shared = [].filter.call(page.querySelectorAll('.cln-body > section'), function (s) { return /Shared kitchen/.test(s.textContent.slice(0, 40)); })[0];
  if (cov && shared) { cov.remove(); cov.setAttribute('data-design', ''); cov.textContent = 'Jobs after each service, prep or use: record each one. The count only knows the ones recorded.'; shared.querySelector('.nb-hd').insertAdjacentElement('afterend', cov); }
  var title = page.querySelector('.cln-mine-title');
  if (title && who.screen) {
    var small = title.querySelector('small'); small.setAttribute('data-design', ''); small.className = 'dz-where';
    small.textContent = who.own ? 'This screen. You are on ' + who.own + ' today' : 'This screen';
    if (who.own) { var jump = page.querySelector('[data-cln="pack-down-jump"]'); if (jump) { jump.className = 'btn dz-jump'; jump.setAttribute('data-design', ''); title.insertAdjacentElement('afterend', jump); } }
  }
  window.dzStrip(mine, who.name); window.dzRestStrip(page);
};

// B: your section beside the rest. The title and the read line become one line; your section is a panel with its own big
// count; from 1100 px the panel is a column of its own, the rest of the kitchen beside it, across the whole screen.
const B = function () {
  var page = document.querySelector('#cleaning-root .cln-page'); if (!page || page.dataset.dz) return; page.dataset.dz = 'b';
  var mine = page.querySelector('.cln-mine'), who = window.dzWho(page), own = window.dzCount(mine), head = page.querySelector('.nb-ph'), read = page.querySelector('.cln-readline'), prog = page.querySelector('.cln-progress');
  var all = prog ? /(\d+)\/(\d+)/.exec(prog.textContent) : null;
  if (head && read) {
    var date = head.querySelector('.nb-date').textContent, checked = read.querySelector('.hint');
    head.classList.add('dz-head'); head.setAttribute('data-design', ''); if (prog) prog.remove();
    head.querySelector('.nb-date').remove();
    checked.textContent = date + ' · ' + checked.textContent; read.classList.add('dz-read'); read.setAttribute('data-design', '');
  }
  page.querySelector('.cln-temperature') && page.querySelector('.cln-temperature').remove();
  page.querySelector('.cln-coverage') && page.querySelector('.cln-coverage').remove();
  if (mine) {
    mine.classList.add('dz-panel'); mine.setAttribute('data-design', '');
    var title = mine.querySelector('.cln-mine-title');
    title.innerHTML = '<span>' + (who.screen ? 'This screen: ' : '') + who.name + '</span><b class="dz-big">' + own[0] + ' of ' + own[1] + ' done</b>';
    if (who.own) { var jump = page.querySelector('[data-cln="pack-down-jump"]'); if (jump) { var band = document.createElement('div'); band.className = 'dz-you'; band.setAttribute('data-design', ''); band.innerHTML = '<b>You: ' + who.own + '</b>'; jump.className = 'btn dark'; band.appendChild(jump); mine.insertAdjacentElement('beforebegin', band); } }
    mine.insertAdjacentHTML('beforeend', window.dzTemp);
    var body = page.querySelector('.cln-body'), rest = document.createElement('div'); rest.className = 'dz-rest';
    [].slice.call(body.children).forEach(function (c) { if (c !== mine && !c.classList.contains('dz-you')) rest.appendChild(c); });
    body.appendChild(rest); body.classList.add('dz-split');
    var rt = rest.querySelector('.cln-rest-title'); if (rt && all) rt.innerHTML = 'Rest of the kitchen <small data-design>' + (all[1] - own[0]) + ' of ' + (all[2] - own[1]) + ' done</small>';
    if (!rt) rest.insertAdjacentHTML('afterbegin', '<h3 class="cln-rest-title" data-design>Rest of the kitchen</h3>');
  }
  // the room on a wide screen: the page may use the whole width
  for (var n = page.parentElement; n && n !== document.body; n = n.parentElement) if (getComputedStyle(n).maxWidth !== 'none' && innerWidth >= 1100) n.style.maxWidth = 'none';
  window.dzStrip(mine, who.name); window.dzRestStrip(page);
};

// C: tonight's close first, the rest folded by section. The page opens on the cook's own section as its title; every other
// group is one line with its count that opens in place. On a shared screen the cook signed in leads, the screen's section
// is the first fold. Two of its parts change approved rules (folds on the staff page; order by the person on a shared
// screen): the head chef's call.
const C = function () {
  var page = document.querySelector('#cleaning-root .cln-page'); if (!page || page.dataset.dz) return; page.dataset.dz = 'c';
  window.dzOpen = window.dzOpen || {};
  var who = window.dzWho(page), body = page.querySelector('.cln-body'), mine = page.querySelector('.cln-mine'), head = page.querySelector('.nb-ph'), read = page.querySelector('.cln-readline'), prog = page.querySelector('.cln-progress');
  if (!mine || !body) return;
  // on a shared screen with a cook from another section, that cook's own Pack down leads
  var lead = mine, leadName = who.name;
  if (who.own) {
    var theirs = [].filter.call(page.querySelectorAll('.cln-body > .cln-packdown-group'), function (s) { return new RegExp('^' + who.own + ': pack down', 'i').test(s.querySelector('.nb-hd > span').textContent); })[0];
    if (theirs) { lead = document.createElement('section'); lead.className = 'cln-mine'; lead.appendChild(theirs); theirs.querySelector('.nb-hd > span').textContent = 'Pack down'; leadName = who.own; mine.querySelector('.cln-mine-title').remove(); var sh = mine; sh.dataset.dzFold = 'This screen: ' + who.name; body.insertBefore(lead, body.firstChild); }
  } else mine.querySelector('.cln-mine-title').remove();
  var own = window.dzCount(lead);
  if (head) {
    head.classList.add('dz-head'); head.setAttribute('data-design', '');
    head.querySelector('.nb-title').textContent = leadName; if (prog) { prog.className = 'dz-prog'; prog.innerHTML = '<b>' + own[0] + ' of ' + own[1] + '</b><small>' + (who.own ? 'you, tonight' : who.screen ? 'this screen, tonight' : 'your section, tonight') + '</small>'; }
    head.querySelector('.nb-date').textContent = 'Cleaning · ' + head.querySelector('.nb-date').textContent;
  }
  if (read) {
    read.classList.add('dz-read'); read.setAttribute('data-design', '');
    var jump = read.querySelector('[data-cln="pack-down-jump"]'); if (jump) jump.remove();
    var t = page.querySelector('.cln-temperature button'); if (t) { t.textContent = 'Temperature logs'; read.insertBefore(t, read.querySelector('[data-cln="refresh"]')); }
  }
  page.querySelector('.cln-temperature') && page.querySelector('.cln-temperature').remove();
  var cov = page.querySelector('.cln-coverage'); if (cov) cov.remove();
  // every other group: one line with its count, opened in place; opens by itself on unsent work (K2), never closes on a tick (S1)
  var list = document.createElement('div'); list.className = 'dz-folds'; list.setAttribute('data-design', '');
  list.insertAdjacentHTML('beforeend', '<h3 class="cln-rest-title">Rest of the kitchen</h3>');
  [].slice.call(body.querySelectorAll(':scope > .cln-rest-title')).forEach(function (t) { t.remove(); });
  var groups = [].slice.call(body.children).filter(function (c) { return c !== lead; });
  var items = [];
  groups.forEach(function (g) {
    if (g.classList.contains('cln-mine')) { items.push({ name: g.dataset.dzFold || who.name, nodes: [].slice.call(g.children) }); return; }
    var h = g.querySelector('.nb-hd > span'), name = h ? h.textContent.replace(/: (section clean|pack down)$/i, '') : '';
    var it = items.filter(function (i) { return i.name.toLowerCase() === name.toLowerCase(); })[0];
    if (!it) { it = { name: name, nodes: [] }; items.push(it); }
    it.nodes.push(g);
  });
  items.forEach(function (it) {
    var box = document.createElement('div'); it.nodes.forEach(function (n) { box.appendChild(n); });
    var c = window.dzCount(box), pending = box.querySelector('[aria-busy="true"], .cln-row-error, .is-pending'), open = window.dzOpen[it.name] || !!pending;
    var d = document.createElement('details'); d.className = 'dz-fold'; if (open) d.open = true;
    d.innerHTML = '<summary><span>' + it.name + '</span><span class="dz-fc">' + c[0] + ' of ' + c[1] + (pending ? ' · Not sent' : '') + '</span></summary>';
    if (/Shared kitchen/.test(it.name) && cov) { cov.textContent = 'Jobs after each service, prep or use: record each one. The count only knows the ones recorded.'; box.insertBefore(cov, box.firstChild.nextSibling); }
    d.appendChild(box); d.addEventListener('toggle', function () { window.dzOpen[it.name] = d.open; });
    list.appendChild(d);
  });
  body.appendChild(list);
  window.dzStrip(lead, leadName); window.dzRestStrip(page);
};

const CSS = `
.cln-page .dz-prog { text-align: right; font-family: var(--body); }
.cln-page .dz-prog b { display: block; font: 700 1.25rem/1.2 var(--display); color: var(--ink); white-space: nowrap; }
.cln-page .dz-prog small { display: block; font-size: .8125rem; color: var(--muted); }
.cln-page .dz-temp { margin: .6rem 0 .2rem; padding-top: .5rem; border-top: 1px solid var(--line); font-size: .875rem; color: var(--ink); }
.cln-page .dz-where { font: 700 1rem/1.3 var(--body) !important; color: var(--ink) !important; }
.cln-page .dz-jump { min-height: 44px; margin: .3rem 0 .4rem; }
/* B */
.cln-page .dz-head { padding: .6rem 0 .3rem; }
.cln-page .dz-head .nb-title { font-size: 2rem; }
.cln-page .dz-read .hint { font-size: .8125rem; }
.cln-page .dz-panel { padding: .2rem .8rem .7rem; border: 1px solid var(--line); border-left: 4px solid var(--ink); border-radius: 8px; background: var(--paper); }
.cln-page .dz-panel .cln-mine-title { display: flex; justify-content: space-between; align-items: baseline; margin: .5rem 0 0; }
.cln-page .dz-panel .cln-mine-title .dz-big { font: 700 1.5rem/1.2 var(--display); color: var(--ink); }
.cln-page .dz-you { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .5rem; margin: .4rem 0; padding: .55rem .8rem; border: 2px solid var(--ink); border-radius: 8px; background: var(--surface-paper); }
.cln-page .dz-you b { font: 700 1.5rem/1.2 var(--display); }
.cln-page .dz-you .btn { min-height: 44px; }
.cln-page .cln-rest-title small { font: 400 .875rem var(--body); color: var(--muted); margin-left: .5rem; }
@media (min-width: 1100px) {
  .cln-page .dz-split { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); column-gap: 2.5rem; align-items: start; }
  .cln-page .dz-split > .dz-you { grid-column: 1; }
  .cln-page .dz-split > .dz-panel { grid-column: 1; position: sticky; top: .5rem; }
  .cln-page .dz-split > .dz-rest { grid-column: 2; grid-row: 1 / span 3; }
  .cln-page .dz-split > .dz-rest > .cln-rest-title:first-child { margin-top: .4rem; }
  .cln-page .dz-panel .nb-t { font-size: 1.5rem; }
}
/* C */
.cln-page .dz-folds { margin-top: 1rem; }
.cln-page .dz-fold { border-top: 1px solid var(--line); }
.cln-page .dz-fold:last-child { border-bottom: 1px solid var(--line); }
.cln-page .dz-fold > summary { display: flex; justify-content: space-between; align-items: center; gap: .6rem; min-height: 48px; cursor: pointer; font: 700 1rem/1.2 var(--display); letter-spacing: .06em; text-transform: uppercase; color: var(--ink); }
.cln-page .dz-fold > summary::after { content: '▾'; margin-left: .3rem; }
.cln-page .dz-fold[open] > summary::after { content: '▴'; }
.cln-page .dz-fold .dz-fc { margin-left: auto; font: 400 .875rem var(--body); letter-spacing: 0; text-transform: none; color: var(--muted); }
@media (min-width: 1100px) {
  .cln-page .dz-folds { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 2rem; }
  .cln-page .dz-folds > .cln-rest-title, .cln-page .dz-fold[open] { grid-column: 1 / -1; }
}
`;

const DESIGNS = { a: A, b: B, c: C };

/* ---------- opening the real page as each person ---------- */
const SIZES = { 390: [390, 844], 768: [768, 1024], 1920: [1920, 1080] };
async function cookPage(width) { const p = await F.cook(width); await p.setViewportSize({ width: SIZES[width][0], height: SIZES[width][1] }); return p; }
async function station(picked) {
  const p = await F.L.open(F.browser(), '#/cleaning', { who: 'ann', width: 1920, height: 1080, touch: true, base: F.base(), extra: F.cleaning, clock: F.WED, wait: 1000, deviceMode: 'shared', profile: { v: 2, mode: 'shared', ownerId: '', sec: 'grill' },
    init: new Function("const d = new Date(Date.now() + 36e5 * 10).toISOString().slice(0, 10); localStorage.setItem('lk.sec.ann', JSON.stringify({ d, sec: '" + picked + "', name: '" + picked + "', self: true, at: Date.now() }));") });
  await F.L.waitFor(p, () => { const pg = document.querySelector('.cln-page'); return pg && !/Loading cleaning/.test(pg.textContent); });
  await F.fonts(p); return p;
}
async function apply(p, key) {
  await p.addStyleTag({ content: CSS });
  await p.evaluate(([common, fn]) => {
    (new Function('(' + common + ')()'))(); window.dzApply = new Function('(' + fn + ')()');
    window.dzApply(); new MutationObserver(() => window.dzApply()).observe(document.getElementById('cleaning-root'), { childList: true, subtree: false });
  }, [COMMON.toString(), DESIGNS[key].toString()]);
  await F.L.settle(p, 350);
}
// what the opening screen shows (the same count as the baseline)
const look = p => p.evaluate(() => {
  const vh = innerHeight, rows = [...document.querySelectorAll('.cln-page .nb-row')].filter(r => r.getClientRects().length);
  const bars = [...document.querySelectorAll('nav, .tabbar')].map(n => n.getBoundingClientRect()).filter(b => b.height > 0 && b.top > vh / 2 && b.bottom >= vh - 2), floor = bars.length ? Math.min(...bars.map(b => b.top)) : vh;
  const inView = rows.filter(r => { const b = r.getBoundingClientRect(); return b.top >= 0 && b.bottom <= floor; });
  const box = rows[0] && rows[0].querySelector('.nb-box');
  return { rowsTotal: rows.length, rowsInView: inView.length, firstBoxTop: box ? Math.round(box.getBoundingClientRect().top) : null, screensLong: Math.round(document.documentElement.scrollHeight / vh * 10) / 10, sideways: document.documentElement.scrollWidth > innerWidth };
});
// S1: a real tick on the first one-tap job, its acknowledgement, then Undo. Does the next box stay where it was?
async function tickStill(p, shared) {
  const sel = '.cln-mine [data-cln="flow-quick"]:not([disabled]), .cln-page [data-cln="flow-quick"]:not([disabled])';
  const id = await p.evaluate(s => { const b = document.querySelector(s); return b && b.getAttribute('data-id'); }, sel); if (!id) return { tried: false };
  const nextY = () => p.evaluate(i => { const row = document.querySelector('.nb-row [data-id="' + i + '"]').closest('.nb-row'), next = row.nextElementSibling || row.parentElement.closest('section').nextElementSibling; const b = next && next.querySelector('.nb-box'); return b ? Math.round(b.getBoundingClientRect().top + scrollY) : null; }, id);
  const before = await nextY();
  await p.click('[data-cln="flow-quick"][data-id="' + id + '"]');
  if (shared) { await F.L.waitFor(p, () => !!document.querySelector('#cln-worker-sheet [data-cln-person], #cln-worker-sheet [data-cln-picker="others"]')); if (!(await p.locator('#cln-worker-sheet [data-cln-person="ann"]').isVisible())) await p.click('[data-cln-picker="others"]'); await p.click('#cln-worker-sheet [data-cln-person="ann"]'); }
  await F.L.waitFor(p, () => !LK_PREP.unsent()); await F.L.settle(p, 400);
  const afterTick = await nextY();
  let afterUndo = null;
  if (!shared) { await p.click('[data-cln="flow-quick"][data-id="' + id + '"]'); await F.L.waitFor(p, () => !LK_PREP.unsent()); await F.L.settle(p, 400); afterUndo = await nextY(); }
  return { tried: true, nextBoxY: { before, afterTick, afterUndo }, moved: before !== afterTick || (afterUndo !== null && afterUndo !== before), stillApplied: await p.evaluate(() => !!document.querySelector('.cln-page[data-dz]')) };
}
// Not sent: no signal, a tick held; then a picture of what the cook sees
async function notSent(p) {
  await p.evaluate(() => { __fake.mode = 'hold'; });
  await p.click('.cln-page [data-cln="flow-quick"]:not([disabled])'); await F.L.settle(p, 600);
  return p.evaluate(() => { const r = document.querySelector('.cln-row.is-pending'); return r ? { row: r.querySelector('.nb-t').textContent, meta: r.querySelector('.nb-meta').textContent, visible: r.getBoundingClientRect().top < innerHeight } : null; });
}

(async () => {
  await F.start(); const out = {};
  const shoot = async (p, name, m) => { await p.evaluate(() => scrollTo(0, 0)); await p.screenshot({ path: path.join(OUT, name + '.png') }); out[name] = Object.assign(await look(p), m || {}); };
  try {
    for (const key of Object.keys(DESIGNS).filter(k => !ONLY || ONLY.indexOf(k) >= 0)) {
      for (const w of [390, 768]) {
        const p = await cookPage(w); await apply(p, key);
        const m = await F.measure(p);
        await shoot(p, key + '-cook-' + w, { checks: m });
        if (w === 390) { m.focus = await F.focusRing(p); await p.evaluate(() => document.activeElement && document.activeElement.blur()); }
        if (w === 390) {
          const tall = await p.evaluate(() => document.documentElement.scrollHeight); await p.setViewportSize({ width: 390, height: tall }); await F.L.settle(p, 250);
          await p.screenshot({ path: path.join(OUT, key + '-cook-390-full.png') }); await p.setViewportSize({ width: 390, height: 844 }); await F.L.settle(p, 250);
          out[key + '-cook-390'].s1 = await tickStill(p, false);
          out[key + '-cook-390'].notSent = await notSent(p); await p.evaluate(() => scrollTo(0, 0)); await p.screenshot({ path: path.join(OUT, key + '-cook-390-notsent.png') });
        }
        if (p.errors && p.errors.length) out[key + '-cook-' + w].errors = p.errors;
        await p.context().close();
      }
      for (const [name, picked] of [['station', 'grill'], ['station-pans-cook', 'pans']]) {
        const p = await station(picked); await apply(p, key);
        const m = await F.measure(p); await shoot(p, key + '-' + name + '-1920', { checks: m });
        if (name === 'station') out[key + '-station-1920'].s1 = await tickStill(p, true);
        if (p.errors && p.errors.length) out[key + '-' + name + '-1920'].errors = p.errors;
        await p.context().close();
      }
    }
    // the name on its own: today's page with Clean down on the tab and the title
    if (!ONLY || ONLY.indexOf('name') >= 0) for (const w of [390, 1920]) {
      const p = await (w === 390 ? cookPage(390) : station('grill'));
      await p.evaluate(() => { document.querySelectorAll('a[href="#/cleaning"]').forEach(a => { const walk = n => { for (const c of n.childNodes) { if (c.nodeType === 3 && /Cleaning/.test(c.textContent)) c.textContent = c.textContent.replace('Cleaning', 'Clean down'); else if (c.nodeType === 1) walk(c); } }; walk(a); }); const t = document.querySelector('.cln-page .nb-title'); if (t) t.textContent = 'Clean down'; });
      await F.L.settle(p, 200); await shoot(p, 'name-clean-down-' + w); await p.context().close();
    }
  } finally { await F.stop(); }
  const file = path.join(OUT, 'measurements.json'), prior = ONLY && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)).results : {};
  fs.writeFileSync(file, JSON.stringify({ kind: 'Preview inside the implemented app\'s real Cleaning page (click-test stand-in, synthetic data). The shell, top bar, tab bar, rows, tick, Undo and Who did this are the app\'s; the parts marked data-design are rearranged or drawn in and put back after every redraw.',
    commit: require('child_process').execSync('git rev-parse --short HEAD').toString().trim(), viewports: '390 x 844, 768 x 1024, 1920 x 1080 (section screen: shared, touch, set to Grill)', results: Object.assign(prior, out) }, null, 1) + '\n');
  for (const k of Object.keys(out)) { const o = out[k]; console.log(k, 'rows', o.rowsInView, 'box', o.firstBoxTop, 'long', o.screensLong, o.sideways ? 'SIDEWAYS' : '', o.s1 ? 'S1 ' + JSON.stringify(o.s1.nextBoxY) + (o.s1.moved ? ' MOVED' : '') : '', o.notSent ? 'notsent ' + JSON.stringify(o.notSent) : '', o.checks ? 'u44 ' + o.checks.under44.length + ' c ' + (o.checks.lowestContrast && o.checks.lowestContrast.ratio) : '', o.errors ? 'ERR ' + o.errors.join(';').slice(0, 200) : ''); }
})().catch(e => { console.error(e); process.exit(1); });
