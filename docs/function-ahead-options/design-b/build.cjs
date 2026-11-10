/* Design B, "The run-up": builds the preview pages from the baseline snapshots of the real app (../baseline/*.html).
   Synthetic data only. Today in the main pages: Tuesday 10 Nov 2026, 14:00 Queensland. Writes:
   home.html, prep.html, orders.html, home-head-1280.html, runup.html and states/*.html (the run-up frames).
   Run: node build.cjs (capture.cjs runs it first). Nothing here is loaded by the book. */
const fs = require('fs'), path = require('path');
const here = __dirname, base = path.join(here, '..', 'baseline');
const css = fs.readFileSync(path.join(here, 'src', 'b.css'), 'utf8'), js = fs.readFileSync(path.join(here, 'src', 'b.js'), 'utf8');
const read = n => fs.readFileSync(path.join(base, n), 'utf8');

/* ---------- dates (Queensland, no daylight saving: plain calendar maths is enough here) ---------- */
const D = s => new Date(s + 'T12:00:00Z'), ymd = d => d.toISOString().slice(0, 10);
const add = (s, n) => { const d = D(s); d.setUTCDate(d.getUTCDate() + n); return ymd(d); };
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const wd = s => WD[D(s).getUTCDay()], dn = s => D(s).getUTCDate();
const short = s => wd(s) + ' ' + dn(s) + ' Nov', long = s => WDL[D(s).getUTCDay()] + ' ' + dn(s) + ' November';
const orderDay = date => { const d = add(date, -4); return add(d, -D(d).getUTCDay()); };   // js/functions.js orderDay()
const words = (s, t) => short(s) + (s === t ? ', today' : s === add(t, 1) ? ', tomorrow' : '');

/* ---------- synthetic functions ---------- */
const FN = {
  smith: { id: 'smith', name: 'Smith 60th', date: '2026-11-12', guests: 60, loc: 'Function room', event: '18:00', food: ['18:30', '19:15'], lines: '5 × Antipasto, 5 × Pizza', tot: 10, need: 13, diet: '4 gluten free, 1 nut allergy' },
  jones: { id: 'jones', name: 'Jones wedding', date: '2026-11-14', guests: 90, loc: 'Beer garden', event: '17:00', food: ['18:00'], lines: '6 × Antipasto', tot: 6, need: 9, diet: '' },
  lee: { id: 'lee', name: 'Lee engagement', date: '2026-11-14', guests: 40, loc: 'Function room', event: '19:00', food: ['19:30'], lines: '3 × Pizza', tot: 3, need: 5, diet: '2 vegetarian' }
};
const food = f => f.food.length > 1 ? f.food.slice(0, -1).join(', ') + ' and ' + f.food[f.food.length - 1] : f.food[0];
function steps(f, t) {
  const od = orderDay(f.date), pa = add(f.date, -1);
  const xs = [
    { k: 'order', title: 'Order the stock', day: od },
    { k: 'ahead', title: 'Prep ahead', day: pa },
    { k: 'service', title: 'Service', day: f.date }
  ];
  const nx = xs.findIndex(x => x.day >= t);
  return xs.map((x, i) => {
    const st = x.day < t ? 'past' : i === nx ? 'next' : 'later', w = words(x.day, t);
    let s;
    if (x.k === 'order') s = x.day < t ? w + '. Function stock stays on the order list until a chef ticks it.' : x.day === t ? 'Today. Function stock is on the order list.' : w + '. Function stock goes on the order list that day.';
    else if (x.k === 'ahead') s = x.day < t ? w + '.' : (x.day === t ? 'Today. What the platters need is on Prep. ' : w + '. What the platters need shows on Prep that day. ') + '<span class="ru-tc">[Prep ahead list] To come</span>';
    else s = (x.day === t ? 'Today' : w) + ' · food ' + food(f) + '. ' + (x.day === t ? 'The band shows each round.' : 'Platter lines go on Prep that day.');
    return { ...x, st, s };
  });
}
function nextWords(f, t) {
  const n = steps(f, t).find(x => x.st === 'next');
  if (!n) return '';
  if (n.k === 'service') return n.day === t ? 'Food ' + food(f) : 'Next: service ' + short(n.day);
  return 'Next: ' + (n.k === 'order' ? 'order the stock ' : 'prep ahead ') + (n.day === t ? 'today' : short(n.day));
}

/* ---------- page plumbing ---------- */
function page(html, depth, title) {
  html = html.replace('<base href="../../../">', '<base href="' + '../'.repeat(depth) + '">');
  html = html.replace(/<title>[^<]*<\/title>/, '<title>' + title + '</title>');
  return html.replace('</head>', '<style>\n' + css + '\n</style>\n</head>').replace('</body>', '<script>\n' + js + '</script>\n</body>');
}
function must(html, re, to, what) { if (!re.test(html)) throw new Error('not found: ' + what); return html.replace(re, to); }

/* ---------- Home: This week strip and the run-up card ---------- */
function stripHTML(t, list, o = {}) {
  const days = [...Array(7)].map((_, i) => add(t, i)), by = {};
  list.forEach(x => { if (days.includes(x.f.date)) (by[x.f.date] = by[x.f.date] || []).push(x); });
  const inWeek = Object.values(by).flat(), nLive = inWeek.filter(x => !x.off).length, off = inWeek.length - nLive;
  const head = '<div class="ru-sh"><h3 class="ru-st" id="ru-st">This week</h3>';
  if (o.err) return '<section class="ru-strip" aria-labelledby="ru-st" data-ru-strip>' + head + '</div><p class="ru-stale is-err" role="status">Could not load functions. Check the signal.</p></section>';
  if (!inWeek.length) return '';
  const count = nLive + (nLive === 1 ? ' function' : ' functions') + (off ? ', ' + off + ' cancelled' : '');
  const cols = days.map(d => by[d] ? 'minmax(0, 3fr)' : 'minmax(26px, 1fr)').join(' ');
  const cells = days.map(d => {
    const isT = d === t ? ' is-today' : '', xs = by[d];
    if (!xs) return '<li class="ru-day' + isT + '"><span class="ru-d"><span class="ru-wd">' + wd(d) + '</span><span class="ru-dn">' + dn(d) + (isT ? '<span class="visually-hidden">, today</span>' : '') + '</span></span></li>';
    const hd = d === t ? 'Today' : d === add(t, 1) ? 'Tomorrow' : wd(d) + ' ' + dn(d), one = xs.length === 1 ? xs[0] : null;
    const allOff = xs.every(x => x.off), open = o.open === d;
    const name = one ? one.f.name : xs.length + ' functions', g = allOff ? 'Cancelled' : xs.filter(x => !x.off).reduce((s, x) => s + x.f.guests, 0) + ' guests';
    const gw = one && !allOff ? '<span class="ru-gw"> · food ' + one.f.food[0] + '</span>' : '', nx = one && !allOff ? '<span class="ru-nx">' + nextWords(one.f, t) + '</span>' : '';
    return '<li class="ru-day has-fn' + isT + '"><button type="button" class="ru-d ru-fn' + (allOff ? ' is-off' : '') + '" data-ru-day="' + d + '" aria-expanded="' + open + '" aria-controls="ru-card-' + d + '">' +
      '<span class="ru-wd">' + hd + (/^(Today|Tomorrow)$/.test(hd) ? '<span class="visually-hidden">, ' + short(d) + '</span>' : '') + '</span><span class="ru-n">' + name + '</span><span class="ru-g">' + g + gw + '</span>' + nx + '</button></li>';
  }).join('');
  const cards = Object.keys(by).sort().map(d => cardHTML(d, by[d], t, o)).join('');
  // today's milestone, in words, in the label line (no extra height): the order day, or the day before a function
  const live = list.filter(x => !x.off), ms = live.some(x => orderDay(x.f.date) === t && x.f.date > t) ? '<span class="fn-tag fn-t-order">Order the stock today</span>' :
    live.some(x => x.f.date === add(t, 1)) ? '<span class="fn-tag fn-t-tom">Prep ahead today</span>' : '';
  return '<section class="ru-strip" aria-labelledby="ru-st" data-ru-strip>' + head + ms + '<span class="ru-sc">' + count + '</span></div>' +
    '<ul class="ru-days" style="grid-template-columns: ' + cols + '">' + cells + '</ul>' +
    (o.stale ? '<p class="ru-stale" role="status">No signal. Functions last updated 13:42.</p>' : '') + cards + '</section>';
}
function cardHTML(d, xs, t, o) {
  const fc = xs.map(x => {
    const f = x.f, st = steps(f, t);
    const det = (x.off ? '<p class="ru-off-note"><b>Cancelled.</b> Do not prep or send. Cancelled by Bo, Tue 10 Nov 13:40.</p>' : '') +
      '<p class="fn-c0">' + short(f.date) + ' · ' + f.loc + ' · ' + f.guests + ' guests</p><h3 class="ru-cn">' + (x.off ? '<s>' + f.name + '</s>' : f.name) + '</h3>' +
      '<p class="ru-cl">Event ' + f.event + ' · food ' + food(f) + '</p><p class="ru-cl"><b>' + f.lines + '</b> (' + f.tot + ' platters)</p>' +
      (f.diet ? '<p class="ru-diet"><span class="ru-dl">Dietaries</span>' + f.diet + '</p>' : '') +
      (o.head && !x.off ? '<p class="ru-chk"><b>To check</b>Nothing to check for this function.</p>' : '');
    const acts = '<div class="ru-acts"><a class="btn" href="#/fn/' + f.id + '">Open the full sheet</a>' + (o.head && !x.off ? '<a class="btn" href="#/functions/' + f.id + '">Change this function</a>' : '') +
      (x === xs[xs.length - 1] ? '<button type="button" class="linkish ru-close">Close</button>' : '') + '</div>';
    const run = x.off ? '<h4 class="ru-rh">The run-up</h4><p class="ru-cl">Stopped. Its platter lines are off the prep list, and the order list says: Function cancelled, check the order.</p>' :
      '<h4 class="ru-rh">The run-up</h4><ol class="ru-steps">' + st.map(s => '<li class="is-' + s.st + '"><span class="ru-dot" aria-hidden="true"></span><span class="ru-sw"><b>' + s.title + '</b>' +
        (s.st === 'next' ? '<span class="ru-next">Next</span>' : '') + (s.st === 'past' ? '<span class="visually-hidden"> (past)</span>' : '') + '<small>' + s.s + '</small></span></li>').join('') + '</ol>';
    return '<div class="ru-fc"><div class="ru-fd">' + det + '</div><div class="ru-fr">' + run + '</div>' + acts + '</div>';
  }).join('');
  return '<section class="ru-card" id="ru-card-' + d + '" aria-label="Run-up for ' + short(d) + '"' + (o.open === d ? '' : ' hidden') + '>' + fc + '</section>';
}
function home(src, o) {
  let h = page(read(src), o.depth, o.title);
  if (o.t !== '2026-11-10') h = must(h, /<span data-home-date="">[^<]*<\/span>/, '<span data-home-date="">' + long(o.t) + '</span>', 'home date');
  const s = o.noStrip ? '' : stripHTML(o.t, o.list, o);
  h = must(h, /(<p class="wall-date">[\s\S]*?<\/p>)/, '$1' + s, 'wall-date');
  // Coming up keeps celebrations and the chefs' cut-offs; the functions move into the strip
  h = must(h, /<div id="fn-land"><div class="fn-land">[\s\S]*?<\/div><\/div>/, '<div id="fn-land" hidden=""></div>', 'fn-land');
  return h;
}

/* ---------- Prep: This week inside the list's own frame ---------- */
function wrow(x, t) {
  const f = x.f;
  return '<li><button type="button" class="ru-wrow' + (x.off ? ' is-off' : '') + '" data-fn="open" data-id="' + f.id + '" aria-haspopup="dialog"><span class="ru-wdate">' + wd(f.date) + '<br>' + dn(f.date) + ' Nov</span>' +
    '<span class="ru-wt"><b>' + f.name + '</b>' + (x.off ? ' <span class="fn-tag fn-t-off">Cancelled</span>' : '') + '</span>' +
    (x.off ? '<span class="ru-wn">Do not prep or send.</span>' : '<span class="ru-wg">' + f.guests + ' guests · food ' + food(f) + '</span><span class="ru-wm">' + f.lines + ' (' + f.tot + ')' + (f.diet ? ' · <b>' + f.diet + '</b>' : '') + '</span><span class="ru-wn">' + nextWords(f, t) + '</span>') + '</button></li>';
}
function weekHTML(t, list, o = {}) {
  const xs = list.filter(x => x.f.date > t && x.f.date <= add(t, 6));
  if (o.err) return '<div class="ru-week" data-ru-added><p class="ru-stale is-err" role="status" style="margin:0;padding:0.7rem 0">Could not load functions. Check the signal.</p></div>';
  if (o.mode === 'ahead' || o.mode === 'ahead-shut') {
    const tom = xs.filter(x => x.f.date === add(t, 1) && !x.off), f = tom[0].f, shut = o.mode === 'ahead-shut';
    return '<div class="ru-week is-ahead" data-ru-added><button type="button" class="ru-wsum" aria-expanded="' + !shut + '" aria-controls="ru-tom"><span class="ru-wh">Prep ahead</span>' +
      '<span class="ru-wnames">Tomorrow: ' + f.name + '</span><span class="ru-wcue">' + (shut ? 'Show' : 'Hide') + '</span></button>' +
      '<div class="ru-tom" id="ru-tom" data-ru-fold' + (shut ? ' hidden' : '') + '><p>' + f.lines.replace(/ × /g, ' ') + ' (' + f.tot + ')' + (f.diet ? ' · <b class="ru-db">' + f.diet + '</b>' : '') + '</p>' +
      '<div class="ru-tomr"><button type="button" class="fnn-sum" data-p="fnneed-fold" aria-expanded="false">What the platters need: ' + f.need + ' <span aria-hidden="true">▾</span></button><span class="ru-tc">[Prep ahead list] To come</span></div></div></div>';
  }
  if (!xs.length) return '';
  const od = xs.some(x => !x.off && orderDay(x.f.date) === t);
  const names = (od ? '<span class="fn-tag fn-t-order">Order today</span>' : '') + xs.map(x => wd(x.f.date) + ' ' + (x.off ? '<s>' + x.f.name + '</s>' : x.f.name)).join(' · ');
  const open = o.mode === 'open';
  return '<div class="ru-week' + (o.mode === 'end' ? ' is-end' : '') + '" data-ru-added><button type="button" class="ru-wsum" aria-expanded="' + open + '" aria-controls="ru-wlist"><span class="ru-wh">This week</span>' +
    '<span class="ru-wnames">' + names + '</span><span class="ru-wcue">' + (open ? 'Hide' : 'Show') + '</span></button>' +
    (o.stale ? '<p class="ru-stale" role="status">No signal. Functions last updated 13:42.</p>' : '') +
    '<ul class="ru-wlist" id="ru-wlist" data-ru-fold' + (open ? '' : ' hidden') + '>' + xs.map(x => wrow(x, t)).join('') + '</ul></div>';
}
function prep(o) {
  let h = page(read(o.src || 'prep-staff.html'), o.depth, o.title);
  h = h.replace(/<span class="nb-date">10 November 2026<\/span>/, '<span class="nb-date">' + dn(o.t) + ' November 2026</span>');
  if (o.drop) {   // the day before: the band's Tomorrow line and Handy's For the functions move into the list's frame
    h = must(h, /<div class="fn-band" id="fn-band" role="region" aria-label="Functions">[\s\S]*?<\/div><div class="cut-band"/, '<div class="fn-band" id="fn-band" role="region" aria-label="Functions" hidden=""></div><div class="cut-band"', 'band');
    h = must(h, /<h3 class="nb-sh">For the functions<\/h3><button[^>]*class="fnn-sum"[\s\S]*?<\/button>/, '', 'handy fn');
  }
  if (o.bandTime) h = h.replace('<span class="fn-due">14:10</span>', '<span class="fn-due">' + o.bandTime + '</span>');
  if (o.top) h = must(h, /<div class="nb-body">/, '<div class="nb-body">' + o.top, 'nb-body');
  if (o.end) h = must(h, /<\/div><\/section><div class="nb-spine"/, o.end + '</div></section><div class="nb-spine"', 'list end');
  return h;
}

/* ---------- Orders: the function stock line carries its milestone ---------- */
function orders(o) {
  let h = page(read('orders-staff.html'), o.depth, o.title);
  h = h.replace(/<span class="nb-date">10 November 2026<\/span>/, '<span class="nb-date">' + dn(o.t) + ' November 2026</span>');
  const box = (h.match(/<button type="button" class="nb-box"[\s\S]*?<\/button>/) || [''])[0];
  const more = (h.match(/<button type="button" class="nb-more[\s\S]*?<\/button>/) || [''])[0];
  const rows = (o.rows || []).map((r, i) => '<li class="nb-row" data-ln="' + o.t + '/fs' + i + '" data-ru-line>' + box.replace(/aria-label="[^"]*"/, 'aria-label="Ordered: ' + r.text + '"').replace(/data-id="[^"]*"/, 'data-id="fs' + i + '"') +
    '<span class="nb-main"><span class="nb-t">' + r.text + ' <span class="nb-q">' + r.qty + '</span><span class="nb-marks"><span class="fn-tag fn-t-order">' + r.tag + '</span></span><span class="nb-mk"></span></span>' +
    '<span class="nb-meta"><span class="ru-ometa">' + r.for + '</span> · ' + r.meta + '</span></span>' + more.replace(/aria-label="[^"]*"/, 'aria-label="More for ' + r.text + '"').replace(/data-id="[^"]*"/, 'data-id="fs' + i + '"') + '</li>').join('');
  h = must(h, /(<div class="nb-body o-main"><ul class="nb-rows">)/, '$1' + rows, 'orders list');
  if (o.rows && o.rows.length) h = h.replace('0 of 2 ordered', '0 of ' + (2 + o.rows.length) + ' ordered');
  return h;
}

/* ---------- the run-up days for a Thursday function (Smith 60th, Thu 12 Nov), with Saturday's wedding in the same week ---------- */
const L = [{ f: FN.smith }, { f: FN.jones }];
const stock = {
  smithToday: { text: 'Function stock: Smith 60th, Thu 12 Nov: 5 Antipasto, 5 Pizza', qty: '10 platters', tag: 'Order today', for: 'For Thu 12 Nov', meta: 'Bo' },
  jonesToday: { text: 'Function stock: Jones wedding, Sat 14 Nov: 6 Antipasto', qty: '6 platters', tag: 'Order today', for: 'For Sat 14 Nov', meta: 'Bo' },
  jonesLate: { text: 'Function stock: Jones wedding, Sat 14 Nov: 6 Antipasto', qty: '6 platters', tag: 'Not ordered yet', for: 'For Sat 14 Nov', meta: 'order day was Sun 8 Nov · Bo' }
};
const DAYS = [
  { key: 'd5', t: '2026-11-07', label: '5 days before', sub: 'Sat 7 Nov' },
  { key: 'od', t: '2026-11-08', label: 'Order day', sub: 'Sun 8 Nov' },
  { key: 'd2', t: '2026-11-10', label: '2 days before (today)', sub: 'Tue 10 Nov' },
  { key: 'd1', t: '2026-11-11', label: 'The day before', sub: 'Wed 11 Nov' },
  { key: 'd0', t: '2026-11-12', label: 'The day', sub: 'Thu 12 Nov' }
];
const out = (n, h) => fs.writeFileSync(path.join(here, n), h);
fs.mkdirSync(path.join(here, 'states'), { recursive: true });

// main pages, Tuesday 10 Nov 14:00
out('home.html', home('home-staff.html', { depth: 3, title: 'B Home, staff', t: '2026-11-10', list: L }));
out('prep.html', prep({ depth: 3, title: 'B Prep, staff', t: '2026-11-10', top: weekHTML('2026-11-10', L) }));
out('orders.html', orders({ depth: 3, title: 'B Orders, staff', t: '2026-11-10', rows: [stock.jonesLate] }));
out('home-head-1280.html', home('home-head-1280.html', { depth: 3, title: 'B Home, head chef', t: '2026-11-10', list: L, head: true }));

// run-up frames
const frames = [];
function frame(name, html) { out('states/' + name + '.html', html); return 'states/' + name + '.html'; }
const S = 4;   // states/ is one folder deeper
DAYS.forEach(d => {
  const row = { label: d.label, sub: d.sub, frames: [] };
  row.frames.push({ cap: 'Home', src: frame(d.key + '-home', home('home-staff.html', { depth: S, title: 'B ' + d.key + ' Home', t: d.t, list: L })) });
  let p;
  if (d.key === 'd1') p = prep({ depth: S, title: 'B d1 Prep', t: d.t, src: 'prep-staff-day-before.html', drop: true, top: weekHTML(d.t, L, { mode: 'ahead' }) });
  else if (d.key === 'd0') p = prep({ depth: S, title: 'B d0 Prep', t: d.t, src: 'prep-staff-on-the-day.html', bandTime: '18:30', end: weekHTML(d.t, L, { mode: 'end' }) });
  else p = prep({ depth: S, title: 'B ' + d.key + ' Prep', t: d.t, top: weekHTML(d.t, L) });
  row.frames.push({ cap: 'Prep' + (d.key === 'd0' ? ' (band unchanged; This week moves to the end of the list)' : d.key === 'd1' ? ' (band line moved into the list)' : ''), src: frame(d.key + '-prep', p) });
  const rows = d.key === 'od' ? [stock.smithToday, stock.jonesToday] : d.key === 'd2' ? [stock.jonesLate] : [];
  row.frames.push({ cap: 'Orders' + (rows.length ? '' : ' (nothing new)'), src: frame(d.key + '-orders', orders({ depth: S, title: 'B ' + d.key + ' Orders', t: d.t, rows })) });
  frames.push(row);
});
// the extra states
const T = '2026-11-10', X = [];
X.push({ label: 'Opened', sub: 'one tap', frames: [
  { cap: 'Home: tap Thu, its run-up card opens in place', src: frame('x-home-open', home('home-staff.html', { depth: S, title: 'B Home open', t: T, list: L, open: '2026-11-12' })) },
  { cap: 'Prep: tap This week', src: frame('x-prep-open', prep({ depth: S, title: 'B Prep open', t: T, top: weekHTML(T, L, { mode: 'open' }) })) },
  { cap: 'Prep, the day before, after Hide', src: frame('x-prep-ahead-shut', prep({ depth: S, title: 'B Prep ahead hidden', t: '2026-11-11', src: 'prep-staff-day-before.html', drop: true, top: weekHTML('2026-11-11', L, { mode: 'ahead-shut' }) })) }
] });
X.push({ label: 'No signal', sub: 'saved copy, and none', frames: [
  { cap: 'Home: copy kept, says when', src: frame('x-home-stale', home('home-staff.html', { depth: S, title: 'B Home no signal', t: T, list: L, stale: true })) },
  { cap: 'Prep: copy kept, opened', src: frame('x-prep-stale', prep({ depth: S, title: 'B Prep no signal', t: T, top: weekHTML(T, L, { mode: 'open', stale: true }) })) },
  { cap: 'Home: opened offline, no copy (never "nothing on")', src: frame('x-home-err', home('home-staff.html', { depth: S, title: 'B Home no copy', t: T, list: L, err: true })) }
] });
const LC = [{ f: FN.smith }, { f: FN.jones, off: true }];
X.push({ label: 'Cancelled', sub: 'Jones wedding, cancelled Tue 13:40', frames: [
  { cap: 'Home: struck through, with the word', src: frame('x-home-off', home('home-staff.html', { depth: S, title: 'B Home cancelled', t: T, list: LC, open: '2026-11-14' })) },
  { cap: 'Prep: This week, opened', src: frame('x-prep-off', prep({ depth: S, title: 'B Prep cancelled', t: T, top: weekHTML(T, LC, { mode: 'open' }) })) },
  { cap: 'Home: a week with no functions (no strip)', src: frame('x-home-none', home('home-staff.html', { depth: S, title: 'B Home none', t: T, list: [], noStrip: true })) }
] });
const L2 = [{ f: FN.smith }, { f: FN.jones }, { f: FN.lee }];
X.push({ label: 'Two on one day', sub: 'and the head chef', frames: [
  { cap: 'Home: Sat holds two functions', src: frame('x-home-two', home('home-staff.html', { depth: S, title: 'B Home two', t: T, list: L2, open: '2026-11-14' })) },
  { cap: 'Prep: This week with three', src: frame('x-prep-two', prep({ depth: S, title: 'B Prep two', t: T, top: weekHTML(T, L2, { mode: 'open' }) })) },
  { cap: 'Head chef, 390: To check and Change', src: frame('x-head-open', home('home-head.html', { depth: S, title: 'B Head open', t: T, list: L, head: true, open: '2026-11-12' })) }
] });

const block = (r, h) => '<section class="rw"><div class="rl"><h2>' + r.label + '</h2><p>' + r.sub + '</p></div>' + r.frames.map(f => '<figure><figcaption>' + f.cap + '</figcaption><iframe src="docs/function-ahead-options/design-b/' + f.src + '" width="390" height="' + h + '" loading="eager" title="' + f.cap + '"></iframe></figure>').join('') + '</section>';
out('runup.html', `<!doctype html>
<html lang="en-AU"><head><base href="../../../"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>B The run-up, frames</title>
<link rel="stylesheet" href="docs/order-list-options/assets/fonts.css"><link rel="stylesheet" href="css/app.css">
<style>
body { margin: 0; padding: 24px; background: var(--bg); color: var(--ink); font-family: var(--body); }
h1 { margin: 0 0 4px; font: 700 2rem var(--display); }
.lead { max-width: 70rem; margin: 0 0 18px; color: var(--muted); }
.rw { display: flex; gap: 16px; align-items: flex-start; padding: 14px 0; border-top: 2px solid var(--line); }
.rl { flex: 0 0 150px; } .rl h2 { margin: 0; font: 700 1.25rem var(--display); } .rl p { margin: 2px 0 0; color: var(--muted); font-size: .9rem; }
figure { margin: 0; flex: 0 0 390px; } figcaption { min-height: 2.6em; font-size: .8125rem; font-weight: 600; color: #3b3a36; }
iframe { display: block; border: 1.5px solid var(--ink); border-radius: 14px; background: #fff; }
.h2x { margin: 18px 0 0; font: 700 1.5rem var(--display); }
</style></head><body>
<h1>B, The run-up: what shows on each run-up day</h1>
<p class="lead">Preview. A Thursday function, Smith 60th (Thu 12 Nov, 60 guests, food 18:30 and 19:15), with the Jones wedding on Saturday. Each frame is the real stylesheet in a 390 x 700 phone, 14:00 Queensland, staff member Ann unless named. The band on other work pages keeps only the day itself.</p>
${frames.map(r => block(r, 700)).join('\n')}
<h2 class="h2x">States the design adds</h2>
${X.map(r => block(r, 700)).join('\n')}
</body></html>
`);
module.exports = { FN, steps, orderDay };
if (require.main === module) console.log('built');
