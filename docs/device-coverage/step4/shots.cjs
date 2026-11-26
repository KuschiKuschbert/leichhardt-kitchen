/* Step 4 of the device coverage plan (27 Nov 2026, docs/device-coverage.md): the head chef's admin panel and the head
   chef / sous chef panel, on the click-test stand-in. Synthetic data, made-up people.
     node docs/device-coverage/step4/shots.cjs   (from the repo root, with the click tests' packages installed;
     CHROME=... as for the click tests in a cloud session)
   14:00 on a working day: today's prep, orders and wastage from the usual fixture, 90 finished days of the nightly
   record for the Dashboard and Inbox, the item analysis for 7, 30 and 90 days, kitchen mail, guides. No function today
   (the band is small); one picture of the Inbox on a busy functions day shows what the band costs on the laptop.
   Sizes: the head chef's computer (1920 x 1080, its window taken as 1920 x 1008, a mouse) and a laptop (1280 x 800,
   a mouse); a phone (390 x 844) for the two landing pages only. The chef panel's Dashboard once more at 1920 with touch,
   as a sous chef on a shared screen, only in case sous chefs use it on the section screens.
   A picture of what shows without scrolling for each, and measurements in metrics.json. */
const path = require('path'), fs = require('fs'), ROOT = process.cwd(), OUT = process.env.OUT || path.join(ROOT, 'docs/device-coverage/step4');
const L = require(path.join(ROOT, 'tests/lib')), server = require(path.join(ROOT, 'tests/serve'));
const C = require(path.join(ROOT, 'js/analysis-core')), M = require(path.join(ROOT, 'js/functions.js'));
const K = (...p) => ['kitchens', L.PIN, ...p].join('/'), DAY = 86400000, today = L.ymd(new Date(L.NOW)), last = L.ymd(new Date(L.NOW - DAY));
const P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true });
// 90 finished days of the nightly record (as tests/admin-dashboard.test.js): busier weekends, more waste the last week
function rows() {
  const out = [];
  for (let i = 89; i >= 0; i--) {
    const t = L.NOW - (i + 1) * DAY, day = L.ymd(new Date(t)), dw = new Date(t).getDay(), busy = dw === 5 || dw === 6 ? 2 : 1;
    const n = 20 * busy + (i % 3), tk = n - 2 - (i % 4), w = i < 7 ? 3 : 1;
    out.push({ day, p: { n, w: n - 2, t: tk, r: 2, sec: { Larder: 8 * busy, Grill: 6 * busy, Garnish: 4 * busy + (i % 3) }, mins: { Larder: [60, 70, 80], Grill: [40, 45, 50], Garnish: [200, 210, 220] }, who: { sam: 5 + (i % 3), ann: 4, bo: 3 } },
      w: { n: w, reason: { excess: w - (i < 7 ? 1 : 0), ...(i < 7 ? { expired: 1 } : {}) }, sec: { Larder: w }, items: [{ t: 'Brisket', u: 'kg', a: 0.5 * w, n: w }] }, x: { out: 1, in: i % 2 },
      // the night's food safety count for Records (the older whole-day shape, as tests/cleaning-results.test.js): one job missed every fifth night
      fs: { v: 1, del: [], c: { cv: 1, due: 12, done: i % 5 ? 12 : 11, miss: i % 5 ? [] : ['Clean behind the fryers'], missN: i % 5 ? 0 : 1, unable: [], unableN: 0, wait: [], waitN: 0, ev: 0, evRec: 0 }, cool: { k: 'none' } } });
  }
  return out;
}
// yesterday's item analysis (as tests/admin-chefs-desk.test.js), for Insights, Item evidence and the chef's desk
const daily = C.daily(last, { prep: [
  { id: 'slaw', text: 'House slaw', recipe: 'slaw', station: 'Grill', done: true, doneById: 'ann' },
  { id: 'herbs', text: 'Chop herbs', station: 'Grill', done: true, doneById: 'ann' },
  { id: 'rump', text: 'Portion rump', station: 'Grill', done: true, doneById: 'sam' },
  { id: 'gravy', text: 'Make gravy', recipe: 'gravy', station: 'Sauce', done: true, doneById: 'bo' }
] }, []);
const aggregate = C.aggregate([daily]);
function data(o = {}) {
  // the config without its derived lists: the opener's seed works out staff, capabilities and the login roster from the
  // people, as a deployed kitchen has them (copying the usual fixture's lists made the Inbox show a capability change)
  const x = Object.assign(L.guides(), L.mail(), {
    [K('config', 'main')]: { people: [P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'head'), P('bo', 'Bo', 'staff'), P('cy', 'Cy', 'staff'), P('di', 'Di', 'staff')],
      headId: 'ann', sousIds: ['sam', 'ann'], pingIds: ['sam', 'ann'], kitSecs: [{ id: 'larder', name: 'Larder' }, { id: 'grill', name: 'Grill' }, { id: 'sauce', name: 'Sauce' }, { id: 'fryer', name: 'Fryer' }], kitShifts: [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'dinner', name: 'Dinner', from: 960, to: 1320 }], showBadges: true, staffSee: { cleaning: true } },
    [K('config', 'admins')]: { x: 1, mailOpened: L.NOW },   // Mail opened just now: no nudge over the tabs
    [K('analysis', 'dashboard')]: { v: 1, generation: 'g1', at: L.NOW - 11 * 3600000, from: rows()[0].day, to: last, days: rows() },
    [K('analysis', 'health')]: { at: L.NOW - 11 * 3600000, status: 'ok' },
    [K('analysis', 'current')]: { generation: 'desk', at: L.NOW - 11 * 3600000, from: last, to: last, days: 1 },
    [K('analysisDaily', 'desk_' + last)]: daily
  });
  for (const n of [7, 30, 90]) x[K('analysis', 'range-' + n)] = { ...aggregate, generation: 'desk', at: L.NOW - 11 * 3600000, from: last, to: last, days: 1, dates: [{ day: last, counts: daily.counts }], totalItems: aggregate.items.length };
  // 30 finished days of prep lines (more at weekends, most ticked, a few rolled over) and some wastage, for the reports
  const TASKS = [['Slice onions', 'Larder', '2 tubs'], ['Pick coriander', 'Larder', ''], ['Portion rump', 'Grill', '20'], ['Make gravy', 'Sauce', '5 L'], ['Laksa base', 'Sauce', '1 batch'],
    ['Wash bok choy', 'Larder', ''], ['Blanch chips', 'Fryer', '3 tubs'], ['Crumb schnitzels', 'Grill', '30'], ['Aioli', 'Sauce', '2 L'], ['Slaw', 'Larder', '1 tub']];
  const NAME = { sam: 'Sam', ann: 'Ann', bo: 'Bo', cy: 'Cy', di: 'Di' };
  for (let i = 1; i <= 30; i++) {
    const t = L.NOW - i * DAY, d = L.ymd(new Date(t)), dw = new Date(t).getDay(), n = dw === 5 || dw === 6 ? 10 : 7;
    TASKS.slice(0, n).forEach(([text, station, qty], k) => {
      const who = ['sam', 'ann', 'bo', 'cy', 'di'][(i + k) % 5], done = (i + k) % 9 !== 0;
      x[K('days', d, 'items', 'p' + k)] = Object.assign({ text, station, qty, recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: t - 8 * 3600000 + k * 60000, done, deleted: false },
        done ? { doneAt: t - 6 * 3600000 + k * 600000, doneBy: NAME[who], doneById: who } : { rolled: 1 });
    });
    if (i % 3 === 0) x[K('waste', d, 'lines', 'w' + i)] = { text: i % 2 ? 'Chips' : 'Brisket', amount: 1.5, unit: 'kg', reason: 'excess', action: '', station: i % 2 ? 'Fryer' : 'Grill', addedBy: 'Bo', addedById: 'bo', addedAt: t - 3 * 3600000, deleted: false };
  }
  ['cy', 'di'].forEach(id => { x[K('pinset', id)] = { at: 1 }; x[K('staffpins', id)] = (L.seed()[K('staffpins', 'bo')]); });
  if (o.busy) {   // a functions afternoon: a 60th with a round due within the hour keeps the band open
    const at = (d, hm) => M.kat(d, M.hmMin(hm)), rounds = ['14:10', '14:50', '15:30'].map(t => ({ at: at(today, t), note: '' }));
    x[K('functions', 'b60')] = M.derive({ v: 1, status: 'confirmed', name: 'Birthday 60th', date: today, start: at(today, '13:45'), loc: 'Function room', guests: 40, mode: 'stag', notes: '3 gluten free.',
      kc: '', kcBy: '', kcAt: 0, rounds, lines: [{ rid: 'antipasto-platter', name: 'Antipasto Platter', unit: 'platter', spec: '', fp: '', qty: 3, u: M.toU([2, 1, 0]) }],
      was: {}, chg: [], cBy: 'ann', cAt: 1, confBy: 'ann', confAt: 1, by: 'ann', upd: L.NOW - 3600000 });
  }
  return x;
}
const quiet = data(), busy = data({ busy: true });
// [picture name, route, admin page or chef tab, who]
const ADMIN = [['inbox', ''], ['insights', 'insights'], ['records', 'records'], ['reports-team', 'team'], ['people', 'people'], ['plan', 'plan'],
  ['kitchen', 'kitchen-home'], ['cutoffs', 'cutoffs'], ['suppliers', 'suppliers'], ['prep-standards', 'prep-standards']];
const CHEF = [['chef-dashboard', 'dashboard'], ['chef-kitchen', 'kitchen-home'], ['chef-todo', 'todo']];
const SIZES = [[1920, 1008, false, '1920'], [1280, 800, false, '1280']];
const fonts = p => p.addStyleTag({ content: ['barlow:Barlow:400', 'barlow-600:Barlow:600', 'barlow-700:Barlow:700', 'barlow-condensed:Barlow Condensed:700', 'caveat:Caveat:700']
  .map(f => { const [file, fam, w] = f.split(':'); return "@font-face{font-family:'" + fam + "';font-weight:" + w + ";src:url('/docs/cleaning-chef-options/fonts/" + file + ".woff2') format('woff2')}"; }).join('') })
  .then(() => p.evaluate(() => document.fonts.ready.then(() => true)));
// what the device contract asks of a laptop or admin page: what is above the fold, the room beside the column, where a
// Save bar sits, the bars over the page, and (on touch only) the controls under 44 px
const measure = (p, touch) => p.evaluate(touch => {
  const vh = innerHeight, vw = innerWidth, main = document.querySelector('.ad-main, #main, main'), mr = main ? main.getBoundingClientRect() : null;
  const col = document.querySelector('.p-admin, .page, main'), cr = col ? col.getBoundingClientRect() : null;
  const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const ctl = [...document.querySelectorAll('button, a[href], select, input:not([type=hidden]), textarea, [role="tab"]')].filter(e => vis(e) && e.getBoundingClientRect().top >= 0 && e.getBoundingClientRect().bottom <= vh);
  const small = touch ? ctl.filter(e => { const r = e.getBoundingClientRect(); return r.height < 44 || r.width < 44; }).map(e => (e.textContent || e.getAttribute('aria-label') || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 30)) : [];
  const bars = [...document.querySelectorAll('.wtop, #fn-band, #cut-band, .tabbar')].filter(vis).map(e => ({ cls: (e.id || e.className).toString().slice(0, 24), bottom: Math.round(e.getBoundingClientRect().bottom) }));
  const save = [...document.querySelectorAll('.sv-dock, .a-savebar')].filter(vis).map(e => { const r = e.getBoundingClientRect(); return { cls: e.className.toString().slice(0, 30), top: Math.round(r.top), sticky: getComputedStyle(e).position }; });
  const h = [...document.querySelectorAll('.ad-main h2, .ad-main h3, main h2, main h3')].filter(vis).filter(e => e.getBoundingClientRect().top < vh).map(e => e.textContent.replace(/\s+/g, ' ').trim().slice(0, 40)).slice(0, 10);
  const words = (main ? main.innerText : document.body.innerText).replace(/\s+/g, ' ');
  // the content's own width: the widest block inside the main column
  let right = 0, left = vw; if (main) [...main.querySelectorAll('*')].filter(vis).forEach(e => { const r = e.getBoundingClientRect(); if (r.width > 40 && r.height > 8) { right = Math.max(right, r.right); left = Math.min(left, r.left); } });
  return { vw, vh, column: cr ? { left: Math.round(cr.left), width: Math.round(cr.width) } : null, main: mr ? { left: Math.round(mr.left), width: Math.round(mr.width), top: Math.round(mr.top) } : null,
    content: { left: Math.round(left), right: Math.round(right) }, emptyRight: Math.round(vw - right), headingsInView: h, controlsInView: ctl.length, under44: small.slice(0, 12), under44Count: small.length,
    bars, save, screens: +(document.documentElement.scrollHeight / vh).toFixed(2), sideways: document.documentElement.scrollWidth > vw + 1,
    emptyWords: /(Nothing yet|No data|Not read yet|Could not|nothing to show)/i.test(words) ? words.match(/(Nothing yet|No data|Not read yet|Could not[^.]*|nothing to show)/i)[0] : '' };
}, touch);
async function chefTab(p, t) {
  await p.evaluate(t => {
    const leaf = () => document.querySelector('[data-p="c-tab"][data-t="' + t + '"]');
    if (leaf()) { leaf().click(); return; }
    for (const g of [...document.querySelectorAll('[data-p="c-group"]')].map(x => x.getAttribute('data-g'))) {
      document.querySelector('[data-p="c-group"][data-g="' + g + '"]').click();
      if (leaf()) { leaf().click(); return; }
    }
  }, t);
  await L.settle(p, 400);
}
if (require.main === module) (async () => {
  const port = 20000 + Math.floor(Math.random() * 20000); await new Promise(r => server.listen(port, '127.0.0.1', r));
  const baseUrl = 'http://127.0.0.1:' + port + '/', b = await L.start(), out = {};
  fs.mkdirSync(OUT, { recursive: true });
  const shoot = async (p, name, touch, route) => {
    await fonts(p); await L.settle(p, 700);
    out[name] = Object.assign({ route, errors: p.errors.length, touch }, await measure(p, touch));
    await p.screenshot({ path: path.join(OUT, name + '.png') });
  };
  const admin = (w, h, touch, page, extra) => L.open(b, '#/admin', { base: baseUrl, admin: true, adminPage: page, who: '', width: w, height: h, touch, extra, wait: 2200 });
  for (const [w, h, touch, label] of SIZES) {
    for (const [name, page] of ADMIN) { const p = await admin(w, h, touch, page, quiet); await shoot(p, name + '-' + label, touch, '#/admin ' + (page || 'inbox')); await p.context().close(); }
    for (const [name, tab] of CHEF) {
      const p = await L.open(b, '#/chef', { base: baseUrl, who: 'ann', width: w, height: h, touch, extra: quiet, wait: 2200 });
      if (tab !== 'dashboard') await chefTab(p, tab);
      await shoot(p, name + '-' + label, touch, '#/chef ' + tab); await p.context().close();
    }
  }
  // the two landings on a phone, the Inbox on a busy functions day on the laptop, the chef Dashboard on a shared screen
  let p = await admin(390, 844, true, '', quiet); await shoot(p, 'inbox-390', true, '#/admin inbox'); await p.context().close();
  p = await L.open(b, '#/chef', { base: baseUrl, who: 'ann', width: 390, height: 844, touch: true, extra: quiet, wait: 2200 }); await shoot(p, 'chef-dashboard-390', true, '#/chef dashboard'); await p.context().close();
  p = await admin(1280, 800, false, '', busy); await shoot(p, 'inbox-1280-busy', false, '#/admin inbox, a functions day'); await p.context().close();
  p = await L.open(b, '#/chef', { base: baseUrl, who: 'sam', deviceMode: 'shared', width: 1920, height: 1008, touch: true, extra: quiet, wait: 2200 }); await shoot(p, 'chef-dashboard-1920-touch-sous', true, '#/chef dashboard, a sous chef on a shared screen'); await p.context().close();
  fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify(out, null, 1) + '\n');
  await b.close(); server.close(); console.log('pictures and metrics.json in ' + OUT); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
