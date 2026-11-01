/*
  Each sign-in's own book (28 Oct 2026, design B pull request 1): staff, a lead, view only, a sous chef, the head chef on
  their PIN, the head chef's Google device, a shared tablet person and functions only, at 390, 768 and 1280 px. Each one
  opens the landing page, the prep list, orders, wastage, transfers, recipes, Functions, and the admin panel where its
  menu offers it, and this records for every page:
    - the controls on show and enabled (buttons and links): how many, how many on the first screen, and their names;
    - the share of the first screen under bars (first: the top bar, the bands, strips and the tab bar at the top of the
      page; kept: what stays on screen once the page is scrolled one screen down, empty for a page too short to get
      there, with how far it scrolled), and each bar's height;
    - the chef hat menu's items and the tabs.
  The record goes to tests/shots/roles.json (git ignores tests/shots) with a short summary in the log. Only what holds
  today and must keep holding is checked: no page errors, no sideways scroll at the default text size, the menu and tab
  rights of each sign-in (the whole tab list), and no read the rules refuse. The stand-in refuses those like the rules
  (tests/fake/firebase-firestore.js, colRefused() and the record-by-record checks) and lists each in __fake.refused, so a
  page that starts asking for one here fails. The book here has minutes to sign, pings on now and guides (extra()), so
  the reads those bring run too; a read that needs other data (a sheet opened by a tap) is checked by its own test file
  and by tests/rules/client-shapes.test.mjs. Budgets for the bars and checks for dead controls come in later pull requests.
*/
const L = require('./lib');
const M = require('../js/functions.js');
const fs = require('fs'), path = require('path');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW)), DAY = 86400000;
const P = (id, name, role, x) => Object.assign({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true }, x || {});
const PEOPLE = [P('kit', 'Kit', 'head'), P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'staff'), P('bo', 'Bo', 'staff'), P('lou', 'Lou', 'lead'),
  P('vic', 'Vic', 'view', { add: false, tick: false, del: false }), P('fay', 'Fay', 'fnc', { add: false, tick: false, del: false, fn: true })];
// a supplier whose order closes at 15:00 today (the cut-off bar shows for the chefs at 14:00) and a function tonight
const next = (new Date(L.NOW).getDay() + 1) % 7;
// what staff see of the new pages (config/main staffSee): the tabs below follow it
const SEE = { guides: true, pings: true, minutes: true };
/* Also what makes a page read more than an empty book does, so the reads it brings run under "no read the rules
   refuse": minutes published yesterday (each phone reads its own sign-off, loadMine()), an Everyone ping and personal
   pings to Ann and Lou on now (13:55, so they pop up and Got it writes who has seen them), and the guides. */
function extra() {
  const x = {
    [fsKey(['config', 'main'])]: { people: PEOPLE, headId: 'kit', sousIds: ['kit', 'sam'], pingIds: ['kit', 'sam'], staffIds: PEOPLE.map(p => p.id), fnIds: ['fay'], fnOnlyIds: ['fay'],
      showBadges: true, staffSee: SEE, cutoffs: [{ id: 'northside', name: 'Northside Test Foods', dd: [next], at: 900, pre: 1, lead: 240 }] },
    [fsKey(['config', 'admins'])]: { x: 1, mailOpened: L.NOW }
  };
  Object.assign(x, L.guides());
  x[fsKey(['minutes', 'mr1'])] = { no: 1, v: 1, status: 'published', date: L.ymd(new Date(L.NOW - DAY)), start: '14:00', loc: 'Kitchen', chair: 'sam', taker: 'sam',
    att: ['kit', 'sam', 'ann', 'bo', 'lou', 'vic'].map(id => ({ id, st: 'present' })), guests: '', decisions: 'Label every tub', menu: '', safety: '', dates: '', other: '',
    acts: [], next: '', pubAt: L.NOW - DAY, removed: false, at: 1, upd: 1, by: 'sam' };
  const ping = (text, to) => Object.assign({ text, tag: 'none', start: today, until: today, dows: [], tm: 835, removed: false, upd: L.NOW - 3600000, at: L.NOW - 3600000, author: 'sam', by: 'sam' }, to ? { to } : {});
  x[fsKey(['notes', 'nr1'])] = ping('Fish delivery at 15:00');
  x[fsKey(['directnotes', 'dr1'])] = ping('Ann, pastry cream first', 'ann');
  x[fsKey(['directnotes', 'dr2'])] = ping('Lou, check the cool room', 'lou');
  ['kit', 'lou', 'vic', 'fay'].forEach(id => { x[fsKey(['pinset', id])] = { at: 1 }; x[fsKey(['drinks', id])] = { kind: 'flat', size: 'reg', milk: '', shot: '', sugar: '', note: '', other: '', at: L.NOW - DAY, by: id }; });
  const t = hm => M.kat(today, M.hmMin(hm));
  x[fsKey(['functions', 'smith'])] = M.derive({ v: 1, status: 'confirmed', name: 'Smith 50th', date: today, start: t('18:00'), loc: 'Beer garden', guests: 60, mode: 'all', notes: '', kc: '', kcBy: '', kcAt: 0,
    rounds: [{ at: t('18:30'), note: '' }], lines: [{ rid: 'antipasto-platter', name: 'Antipasto Platter', unit: 'platter', spec: 'Per platter.', fp: '', qty: 3, u: M.toU([3]) }],
    was: {}, chg: [], cBy: 'fay', cAt: L.NOW - DAY, confBy: 'fay', confAt: L.NOW - DAY, by: 'fay', upd: L.NOW - 3600000 });
  x[fsKey(['transfers', today, 'lines', 't1'])] = { dir: 'out', venue: 'Riviera', person: 'Jess', text: 'Brioche buns', amount: 2, unit: 'packs', note: '', addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - 5400000, deleted: false };
  return x;
}
// the 8 sign-ins: who is on the phone, and what its menu and tabs must and must not hold. Guides shows for everyone in
// the kitchen while staff see it (SEE.guides), and never for functions only
const KITCHEN_TABS = ['Recipes', 'Prep', 'Orders', 'Wastage', 'Transfers'].concat(SEE.guides ? ['Guides'] : []);
const CREW_NO = ['admin', 'todo', 'manage', 'pings', 'staff', 'functions', 'suppliers'];
const SIGNINS = [
  { id: 'staff', name: 'staff (Ann)', o: { who: 'ann' }, has: ['mail', 'drinks', 'fn', 'deliveries', 'settings', 'out'], no: CREW_NO, tabs: KITCHEN_TABS },
  { id: 'lead', name: 'lead (Lou)', o: { who: 'lou' }, has: ['mail', 'drinks', 'fn', 'out'], no: CREW_NO, tabs: KITCHEN_TABS },
  { id: 'view', name: 'view only (Vic)', o: { who: 'vic' }, has: ['mail', 'drinks', 'fn', 'out'], no: CREW_NO, tabs: KITCHEN_TABS },
  { id: 'sous', name: 'sous chef (Sam)', o: { who: 'sam' }, has: ['todo', 'manage', 'pings', 'staff', 'fn', 'out'], no: ['admin', 'functions'], tabs: KITCHEN_TABS },
  { id: 'head', name: 'head chef on PIN (Kit)', o: { who: 'kit' }, has: ['admin', 'todo', 'manage', 'pings', 'staff', 'out'], no: ['mail', 'functions'], tabs: KITCHEN_TABS, admin: true },
  { id: 'owner', name: 'head chef\'s Google device with daily head PIN', o: { admin: true, who: 'kit' }, has: ['admin', 'todo', 'manage', 'functions', 'out'], no: ['mail'], tabs: KITCHEN_TABS, admin: true },
  { id: 'tablet', name: 'shared tablet (Bo)', o: { who: 'bo', settings: { shared: true }, touch: true }, has: ['mail', 'drinks', 'fn', 'out'], no: CREW_NO, tabs: KITCHEN_TABS },
  { id: 'fnonly', name: 'functions only (Fay)', o: { who: 'fay' }, has: ['functions', 'deliveries', 'out'], no: ['admin', 'todo', 'manage', 'pings', 'staff', 'mail', 'drinks', 'fn', 'suppliers'], tabs: ['Recipes'], fnOnly: true }
];
const PAGES = ['#/', '#/prep', '#/orders', '#/waste', '#/transfers', '#/recipes', '#/fn'];
const SIZES = [[390, 844], [768, 1024], [1280, 900]];
const LISTS = ['#/prep', '#/orders', '#/waste', '#/transfers'];

/* what the page shows now: the controls, the bars over the screen, the tabs. Run in the page. stuckOnly: count only
   the bars that stick (fixed or sticky), for the page scrolled one screen down. */
function look(stuckOnly) {
  const vw = innerWidth, vh = innerHeight;
  const shown = e => { if (!e.getClientRects().length || e.closest('[hidden], [inert]')) return false; const cs = getComputedStyle(e); return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity !== 0; };
  const enabled = e => !e.disabled && e.getAttribute('aria-disabled') !== 'true' && !e.closest('fieldset[disabled]');
  const nameOf = e => (e.getAttribute('aria-label') || e.textContent || e.getAttribute('title') || e.value || '').replace(/\s+/g, ' ').trim().slice(0, 48) || '(no name)';
  const onFirst = r => r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
  // on show: drawn, not hidden, more than a pixel and not pushed off the side (a skip link waits off screen until it has focus)
  const onShow = e => { if (!shown(e)) return false; const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && r.right > 0 && r.left < vw; };
  const ctl = [...document.querySelectorAll('button, a[href], [role="button"], input[type="button"], input[type="submit"], summary')].filter(e => onShow(e) && enabled(e));
  const first = ctl.filter(e => onFirst(e.getBoundingClientRect()));
  // the bars: the top bar, the bands, the strips, the tab bar and anything else that sticks (not a table header, a
  // sheet, a menu or a toast)
  const named = '.wtop, #fn-band, #cut-band, .fn-strip, .p-sync, .upd-bar, .tabbar, .find-bar, .a-nav';
  const out = [];
  document.querySelectorAll('body *').forEach(e => {
    if (!shown(e) || e.closest('table, [role="dialog"], .wm-wrap, .p-toasts, .p-toast, .sheet, .sheet-bg, .nt-wrap, .fn-pop, .ks-wrap, .mlp-wrap')) return;
    const pos = getComputedStyle(e).position, stuck = pos === 'fixed' || pos === 'sticky';
    if (stuckOnly ? !stuck : !(stuck || e.matches(named))) return;
    if (out.some(o => o.e.contains(e))) return;   // inside a bar already counted
    const r = e.getBoundingClientRect();
    if (!onFirst(r) || r.height <= 0 || r.height > vh * 0.6) return;
    out.push({ e, name: e.id ? '#' + e.id : e.className ? '.' + String(e.className).split(' ')[0] : e.tagName.toLowerCase(), top: Math.max(0, r.top), bottom: Math.min(vh, r.bottom), left: Math.max(0, r.left), right: Math.min(vw, r.right) });
  });
  // the area under them, rows of 2 px across the screen, so two bars on top of each other count once
  let area = 0;
  for (let y = 0; y < vh; y += 2) {
    const xs = out.filter(b => b.top <= y && b.bottom > y).map(b => [b.left, b.right]).sort((a, b) => a[0] - b[0]);
    let end = -1, w = 0;
    xs.forEach(([a, b]) => { if (b <= end) return; w += b - Math.max(a, end); end = b; });
    area += w * 2;
  }
  const bars = { share: Math.round(1000 * area / (vw * vh)) / 1000, parts: out.map(b => b.name + ' ' + Math.round(b.bottom - b.top)) };
  const tabsBar = [...document.querySelectorAll('.tabbar a, .wtop .pnav a')].filter(shown).map(a => a.textContent.trim());
  return { controls: ctl.length, firstScreen: first.length, names: ctl.map(nameOf), bars, tabs: [...new Set(tabsBar)] };
}
async function lookPage(p) {
  const a = await p.evaluate(look, false);
  // one screen down: only what sticks stays on screen. A page shorter than two screens cannot get there: its kept share
  // is left empty (null), with how far it did scroll and how tall it is, so a later budget reads only real numbers
  await p.evaluate(() => window.scrollTo(0, innerHeight)); await L.settle(p, 300);
  a.scroll = await p.evaluate(() => ({ y: Math.round(scrollY), height: document.documentElement.scrollHeight, screen: innerHeight }));
  a.kept = a.scroll.y >= a.scroll.screen - 1 ? (await p.evaluate(look, true)).bars : { share: null, parts: [] };
  await p.evaluate(() => window.scrollTo(0, 0)); await L.settle(p, 200);
  return a;
}
const refusedNow = p => p.evaluate(() => (window.__fake.refused || []).map(x => x.kind + ' ' + x.path.replace(/^kitchens\/[^/]+\//, '')));

(async () => {
  const b = await L.start(), out = { at: new Date(L.NOW).toISOString().slice(0, 16), pages: PAGES, sizes: SIZES.map(s => s[0]), signins: {} };
  // two sign-ins at a time, each at the three sizes side by side
  const queue = SIGNINS.slice();
  await Promise.all([0, 1].map(async () => {
    while (queue.length) {
      const s = queue.shift(), rec = out.signins[s.id] = { name: s.name, sizes: {} };
      await Promise.all(SIZES.map(async ([w, h]) => {
        const at = s.name + ' ' + w + ' px', p = await L.open(b, '#/', Object.assign({ width: w, height: h, wait: 1400, extra: extra() }, s.o));
        const r = rec.sizes[w] = { menu: [], tabs: [], pages: {} };
        let errs = 0, refused = 0;
        r.menu = await L.chefItems(p);
        for (const hash of PAGES.concat(s.admin ? ['#/admin'] : [])) {
          if (hash !== '#/') { await p.evaluate(x => { location.hash = x; }, hash); await L.settle(p, 1200); }
          await L.waitFor(p, () => !!document.querySelector('#rtitle, .wall, h1, h2'), null, 5000).catch(() => {});
          if (LISTS.includes(hash) && !s.fnOnly) await L.waitFor(p, () => !document.querySelector('.is-loading'), null, 5000).catch(() => {});
          const a = await lookPage(p), e = p.errors.slice(errs), rf = (await refusedNow(p)).slice(refused);
          errs = p.errors.length; refused += rf.length;
          r.pages[hash] = { controls: a.controls, firstScreen: a.firstScreen, names: a.names, bars: { first: a.bars.share, kept: a.kept.share, firstParts: a.bars.parts, keptParts: a.kept.parts, keptScroll: a.scroll }, refused: rf };
          if (hash === '#/prep') r.tabs = a.tabs;
          ok(!e.length, at + ' ' + hash + ': no page errors ' + e.join(' | '));
          const of = await L.overflow(p);
          ok(!of, at + ' ' + hash + ': no sideways scroll' + (of ? ': ' + of : ''));
          ok(!rf.length, at + ' ' + hash + ': no read the rules refuse (' + rf.join(', ') + ')');
          if (LISTS.includes(hash)) {
            // the list itself, not Who are you?, a PIN box, Loading... or the Functions account card
            const st = await p.evaluate(() => { const r = document.getElementById('prep-root'), t = r ? r.textContent : '';
              return { list: !!r && !!r.querySelector('#rtitle') && !r.querySelector('.p-name, #pf1, .is-loading') && !/Functions account/.test(t), card: /Functions account/.test(t) }; });
            ok(s.fnOnly ? st.card && !st.list : st.list, at + ' ' + hash + (s.fnOnly ? ': the Functions account card, no kitchen list' : ': the list opens'));
          }
        }
        // the menu and the tabs this sign-in has, and must not have
        const miss = s.has.filter(x => !r.menu.includes(x)), extraItems = s.no.filter(x => r.menu.includes(x));
        ok(!miss.length && !extraItems.length, at + ': the chef hat menu (' + r.menu.join(', ') + ')' + (miss.length ? ' is missing ' + miss.join(', ') : '') + (extraItems.length ? ' should not have ' + extraItems.join(', ') : ''));
        ok(JSON.stringify(r.tabs) === JSON.stringify(s.tabs), at + ': the tabs (' + r.tabs.join(', ') + ')' + (JSON.stringify(r.tabs) === JSON.stringify(s.tabs) ? '' : ', not ' + s.tabs.join(', ')));
        await p.context().close();
      }));
    }
  }));
  await b.close();
  const dir = path.join(__dirname, 'shots');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'roles.json'), JSON.stringify(out, null, 1));
  // the summary: per sign-in and size, the menu, then per page the controls (first screen) and the bar shares
  const pct = v => v === null ? '-' : Math.round(v * 100) + '%';
  for (const s of SIGNINS) for (const [w] of SIZES) {
    const r = out.signins[s.id].sizes[w];
    console.log(s.name + ' ' + w + ' px, menu ' + r.menu.length + ' (' + r.menu.join(' ') + '), tabs ' + r.tabs.length + ': ' +
      Object.keys(r.pages).map(h => (h.replace('#/', '') || 'landing') + ' ' + r.pages[h].controls + '/' + r.pages[h].firstScreen + ' bars ' + pct(r.pages[h].bars.first) + '|' + pct(r.pages[h].bars.kept)).join(', '));
  }
  console.log('(controls on the page/on the first screen, bars over the first screen at the top|one screen down, - for a page too short to scroll a screen) Written to tests/shots/roles.json');
  L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
