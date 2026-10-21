// The drawing library (js/library.js, js/lib/): every item has its fields and draws plain SVG, ids are unique, each
// category has the drawings the plan asked for, search finds every item by its name and the menu survey's words,
// brand names are only search words, and every category and the servingware draw in the browser without an error
// (the contact sheets are saved to tests/shots/ to look at by eye).
const L = require('./lib');
const { R, ok } = L.results();
const C = require('./library-check');
const TARGET = { meat: 70, seafood: 55, veg: 65, potato: 34, grains: 40, bread: 65, prepared: 55, sauce: 25, garnish: 50, sweet: 65, dairy: 28, build: 32 };
// words the menu survey says staff will look for (menu-survey.md): each must find at least one drawing
const SURVEY = ['parmy', 'schnitzel', 'chips', 'potato scallop', 'calamari', 'barramundi', 'moreton bay bug', 'mud crab', 'oysters', 'prawns', 'scallops', 'finger lime', 'lemon wedge', 'gravy', 'pepper sauce', 'mushroom sauce', 'diane', 'aioli', 'tartare', 'hollandaise', 'mash', 'wedges', 'slaw', 'garden salad', 'caesar', 'garlic bread', 'burger bun', 'brioche', 'pizza', 'pie', 'sausage roll', 'spring roll', 'dumpling', 'arancini', 'nachos', 'pavlova', 'sticky toffee', 'ice cream', 'brownie', 'cheesecake', 'lamington', 'fried egg', 'poached egg', 'bacon', 'ribs', 'brisket', 'pork belly', 'lamb shank', 'rump', 'eye fillet', 'wings', 'karaage', 'laksa', 'pho', 'poke', 'fried rice', 'spaghetti', 'lasagne', 'risotto', 'gnocchi', 'chiko', 'dagwood', 'nutella', 'biscoff', 'kewpie'];
const BRANDS = /\b(nutella|biscoff|chiko|pluto pup|paddle pop|oreo|kewpie|xxxx|coca-cola|coke|snickers|tim tam)\b/i;

(async () => {
  // without a browser: the items themselves
  const r = C.check();
  ok(!r.missing.length, 'every category file is there' + (r.missing.length ? ' (missing: ' + r.missing.join(', ') + ')' : ''));
  ok(!r.errs.length, 'every item has its fields and draws plain SVG' + (r.errs.length ? ': ' + r.errs.slice(0, 8).join(' | ') : ''));
  Object.keys(TARGET).forEach(c => ok(r.counts[c].distinct >= TARGET[c], c + ': ' + r.counts[c].distinct + ' distinct drawings (at least ' + TARGET[c] + '), ' + r.counts[c].items + ' with variants'));
  const total = r.L.distinct();
  ok(total >= 540, 'the library: ' + total + ' distinct drawings (at least 540), ' + r.L.items.length + ' with variants');
  const lost = r.L.items.filter(it => r.L.search(it.name).slice(0, 8).indexOf(it) < 0).map(it => it.id);
  ok(lost.length <= 5, 'search finds each item by its own name in the first 8 (' + lost.length + ' do not: ' + lost.slice(0, 10).join(', ') + ')');
  const none = SURVEY.filter(w => !r.L.search(w).length);
  ok(!none.length, 'search finds the menu survey\'s words' + (none.length ? ' (nothing for: ' + none.join(', ') + ')' : ''));
  // single ingredients that come up most in the head chef's recipe library (21 Oct 2026): each finds its own drawing
  const SINGLE = { celery: 'celery-sticks', lentils: 'red-lentils', 'star anise': 'star-anise', cashews: 'cashews', turkey: 'roast-turkey-breast', tofu: 'tofu-cubes', cranberries: 'cranberries-fresh', 'rolled oats': 'rolled-oats', 'butternut': 'butternut-wedges', 'egg yolk': 'egg-yolk', rhubarb: 'rhubarb-stalks', okra: 'okra', radicchio: 'radicchio-leaves', 'cardamom': 'cardamom-pods', sardines: 'sardines-grilled', 'cod': 'cod-fillet' };
  const missed = Object.keys(SINGLE).filter(w => r.L.search(w).slice(0, 6).map(it => it.id).indexOf(SINGLE[w]) < 0);
  ok(!missed.length, 'search finds the recipe library\'s single ingredients' + (missed.length ? ' (not for: ' + missed.join(', ') + ')' : ''));
  const branded = r.L.items.filter(it => BRANDS.test(it.name)).map(it => it.id);
  ok(!branded.length, 'brand names are search words only, never in a name' + (branded.length ? ' (' + branded.join(', ') + ')' : ''));
  const roles = {}; r.L.items.forEach(it => { roles[it.role] = (roles[it.role] || 0) + 1; });
  ok(['main', 'starch', 'veg', 'salad', 'sauce', 'garnish', 'topping', 'bread', 'dessert', 'dside'].every(k => roles[k] > 0), 'every role the layout uses has drawings (' + Object.keys(roles).map(k => k + ' ' + roles[k]).join(', ') + ')');
  ok(r.L.items.every(it => it.side && it.side.h > 0), 'every item says how it looks from the side');
  // the same body every time (a seeded random, no Math.random)
  const again = C.load().L, diff = r.L.items.filter(it => r.L.body(it.id) !== again.body(it.id)).map(it => it.id);
  ok(!diff.length, 'every piece draws the same way every time' + (diff.length ? ' (' + diff.slice(0, 6).join(', ') + ')' : ''));
  // servingware: every preset draws, with its food area inside it
  const badWare = [];
  r.L.WARE.forEach(f => f.list.forEach(x => { const s = r.L.surface(x.p); if (!s.body || C.svgProblems(s.body).length || !(s.area.rx > 0 && s.area.rx <= s.w / 2 + 1 && s.area.ry <= s.h / 2 + 1)) badWare.push(x.name); }));
  ok(!badWare.length, 'servingware: every preset draws plain SVG with its food area inside it' + (badWare.length ? ' (' + badWare.join(', ') + ')' : ''));
  ok(r.L.WARE.reduce((n, f) => n + f.list.length, 0) >= 60, 'servingware: ' + r.L.WARE.reduce((n, f) => n + f.list.length, 0) + ' presets in ' + r.L.WARE.length + ' families');
  ok(r.L.sauceColour('Pepper sauce') && r.L.sauceColour('Mushroom sauce') !== r.L.sauceColour('Hollandaise'), 'a sauce takes its colour from its name');

  // in the browser: every category and the servingware draw without an error
  const b = await L.start();
  const fs = require('fs'), path = require('path'), shots = path.join(__dirname, 'shots'); fs.mkdirSync(shots, { recursive: true });
  for (const c of Object.keys(TARGET).concat(['ware'])) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }), p = await ctx.newPage(), errs = [];
    p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
    await p.goto(L.BASE + 'tests/contact.html?' + (c === 'ware' ? 'ware=1' : 'cat=' + c));
    const ready = await L.waitFor(p, () => document.body.getAttribute('data-ready') === '1', null, 20000).then(() => true, () => false);
    const bad = await p.evaluate(() => document.querySelectorAll('.err').length);
    ok(ready && !bad && !errs.length, 'contact sheet: ' + c + ' draws' + (bad ? ', ' + bad + ' did not draw' : '') + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
    if (process.env.SHOTS) await p.screenshot({ path: path.join(shots, 'contact-' + c + '.png'), fullPage: true });
    await ctx.close();
  }
  await b.close();
  L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
