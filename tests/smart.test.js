// Draw it for me (js/smart.js, 21 Oct 2026): the book draws the plate from the recipe. Without a browser, the matcher is
// measured on the book's own dishes. In the browser, the head chef's Draw it for me picks the servingware and the plating
// for a burger, steaks of two sizes, a Caesar, the grill board, a parmy, a batch recipe and a dessert; every part sits on
// the servingware, sauce under and toppings on top; Try another layout and Tidy up; the Pass labels come from the parts;
// a pick is remembered for the next recipe; an ingredient with its own card (Cowboy candy, Cowboy butter) is drawn from
// what that card makes, in the book's own look; the side view and the burger build are made from the recipe and save to
// their slots. With SHOTS=1 each drawing is saved to tests/shots/ to look at by eye.
const L = require('./lib');
const { R, ok } = L.results();
const M = require('./smart-match'), CR = require('./compose-read'), SC = require('./style-check');
const path = require('path'), fs = require('fs'), SHOTS = process.env.SHOTS ? path.join(__dirname, 'shots') : '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true });
const cfg = () => ({ [fsKey(['config', 'main'])]: { people: [P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'head'), P('bo', 'Bo', 'staff')], headId: 'ann', sousIds: ['sam', 'ann'], pingIds: ['sam', 'ann'], showBadges: true } });
const wait = (p, fn, arg, t) => L.waitFor(p, fn, arg, t || 8000).catch(() => false);
const store = p => p.evaluate(() => window.__fake.dump());
// the drawing as the editor has it: style, servingware, the note, the unsure picks and each part with its box
const S = p => p.evaluate(() => {
  const w = window.LK_DRAW.state(), Rn = window.LK_DRAW.render, a = Rn.area(w.d);
  return { style: w.d.layout && w.d.layout.style, surf: w.d.surf, unsure: (w.smart && w.smart.unsure || []).map(u => u.ing),
    onWare: w.d.els.filter(e => e.t === 'item').every(e => Rn.inArea(e.x, e.y, a)),
    els: w.d.els.map((e, k) => Object.assign(JSON.parse(JSON.stringify(e)), { k, id: e.a ? e.a.split('@')[0] : '', box: Rn.bbox(e) })) };
});
const errs = p => p.errors.filter(e => !/Failed to load resource/.test(e));
const inside = (e, h) => e.x >= h.box[0] && e.x <= h.box[2] && e.y >= h.box[1] && e.y <= h.box[3];
async function centreOf(p, sel) { const b = await p.locator(sel).first().boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; }

(async () => {
  // without a browser: the matcher on the book's own dishes
  const m = M.measure();
  ok(m.share >= 0.85, 'matcher: ' + Math.round(m.share * 100) + '% of the ' + m.shown + ' visible ingredients on ' + m.dishes + ' dishes matched with confidence (at least 85%); unsure: ' + m.unsure.length + ', none: ' + m.misses.join(', '));
  // the recipe reader (js/compose.js) on the book's own cards, and the drawings it makes against the book's look
  const cr = CR.check();
  ok(!cr.errs.length && cr.formShare >= 0.95 && cr.share >= 0.9, 'reader: ' + Math.round(cr.formShare * 100) + '% of ' + cr.cards + ' cards read into what they make, ' + Math.round(cr.share * 100) + '% of their lines; expected readings ' + (cr.errs.join('; ') || 'all match'));
  const sc = SC.check();
  ok(!sc.errs.length && sc.palShare >= 0.9 && Math.abs(sc.ratio - 0.74) < 0.05, 'look: ' + sc.parts + ' parts drawn from their cards, outlines at ' + sc.ratio.toFixed(2) + ' of their fill (the book: 0.74), ' + Math.round(sc.palShare * 100) + '% of fills the book\'s own colours ' + sc.errs.slice(0, 5).join('; '));
  const X = m.S;
  ok(X.matchIng({ name: 'Fried shallots' }, { name: 'x' }).id === 'crispy-shallots' && X.matchIng({ name: 'Tartare sauce' }, { name: 'x' }).id === 'tartare-dollop', 'matcher: fried shallots are crispy shallots, tartare sauce a dollop of tartare');
  ok(X.matchIng({ name: 'Roasted honey pumpkin purée', note: 'big kitchen spoon swoop and smear' }, { name: 'x' }).id === 'pumpkin-puree-swoosh', 'matcher: the recipe\'s words for the shape (swoop and smear) pick the swoosh');
  ok(X.hidden({ name: 'Sea salt flakes' }) && X.hidden({ name: 'Bay leaves' }) && X.hidden({ name: 'Wing flour' }) && !X.hidden({ name: 'Chips' }), 'matcher: what does not show on the plate is left off (salt, bay leaves, flour)');
  ok(X.split({ name: 'Chips and salad' }).map(i => i.name).join('|') === 'Chips|Salad' && X.split({ name: 'Bread and butter pickles' }).length === 1, 'matcher: Chips and salad is two parts, bread and butter pickles is one');

  const b = await L.start();
  let p, s, w;
  // opens a new drawing for a recipe's slot and asks the book to draw it
  async function drawn(route, o) {
    const pg = await L.open(b, '#/manage/draw/new/' + route, Object.assign({ who: 'ann', extra: cfg(), wait: 1200, width: 1280, height: 900 }, o || {}));
    await wait(pg, () => !!document.querySelector('[data-dw="sm-draw"]'), null, 20000);
    await pg.click('[data-dw="sm-draw"]');
    await wait(pg, () => window.LK_DRAW.state().d.els.length > 0 && !!document.querySelector('.dw-smart-note'), null, 10000);
    if (SHOTS) await (await pg.$('.dw-svg')).screenshot({ path: path.join(SHOTS, 'smart-' + route.replace(/\//g, '-') + '.png') });
    return pg;
  }

  // the burger: one burger from above beside its chips, the fillings named with it
  p = await drawn('burger/plate');
  w = await S(p);
  const bun = w.els.find(e => /burger/.test(e.id)), chips = w.els.find(e => e.ing === 'Chips');
  ok(w.style === 'side' && w.surf.fam === 'plate', 'burger: side by side on a dinner plate');
  ok(!!bun && !!chips && Math.abs(bun.x - chips.x) > 40 && w.els.filter(e => e.t === 'item').length === 2, 'burger: one burger and the chips, side by side');
  ok(!!bun && ['Crumbed chicken thigh', 'Sliced cheese', 'Ranch', 'Oak leaf', 'Tomato'].every(k => String(bun.also).split('|').indexOf(k) >= 0), 'burger: the chicken, cheese, ranch, leaf and tomato are named with the burger');
  ok(w.onWare && !w.unsure.length, 'burger: every part on the plate, nothing left to pick');
  ok(/side by side/i.test(await L.txt(p, '.dw-smart-note') || ''), 'burger: the note says how it was laid out');
  ok(await p.evaluate(() => !window.LK_DRAW.check().some(c => / is in the recipe but not on the /.test(c.msg))), 'burger: Check the drawing finds every ingredient on the plate');
  // the Pass labels come from the parts: every ingredient, with its allergens
  await p.click('[data-dw="save"]');
  await wait(p, () => /Saved/.test((document.querySelector('.mg-toasts .p-toast') || {}).textContent || ''));
  s = await store(p);
  const pins = ((s[fsKey(['recipes', 'burger'])] || { r: {} }).r.pins || []);
  ok(['Burger bun', 'Crumbed chicken thigh', 'Sliced cheese', 'Ranch', 'Oak leaf', 'Tomato', 'Chips'].every(k => pins.some(x => x.label === k)), 'burger: a Pass label for every ingredient (' + pins.map(x => x.label).join(', ') + ')');
  const thigh = pins.find(x => x.label === 'Crumbed chicken thigh') || {}, cheese = pins.find(x => x.label === 'Sliced cheese') || {};
  ok((thigh.tags || []).indexOf('Gluten') >= 0 && (cheese.tags || []).indexOf('Milk') >= 0, 'burger: the labels carry the allergens (gluten on the thigh, milk on the cheese)');
  ok(thigh.x !== cheese.x || thigh.y !== cheese.y, 'burger: the labels inside the burger are spread over it, not on one point');
  ok(/with crumbed chicken thigh/.test((s[fsKey(['drawings', 'burger-plate'])] || {}).alt || ''), 'burger: the words for screen readers say what is in it');
  ok(!errs(p).length, 'burger: no page errors ' + errs(p).join(' | '));
  await p.context().close();

  // the burger build: the fillings in the recipe's order between the bun top and base, no chips
  p = await drawn('burger/build');
  w = await S(p);
  const labs = w.els.filter(e => e.t === 'text' && e.auto).map(e => e.s);
  ok(labs.join('|') === 'Burger bun|Crumbed chicken thigh|Sliced cheese|Ranch|Oak leaf|Tomato', 'build: the layers in the recipe\'s order (' + labs.join(', ') + ')');
  const layers = w.els.filter(e => e.t === 'item');
  ok(/bun-top/.test(layers[0].id) && /bun-base/.test(layers[layers.length - 1].id) && layers.every((e, k) => !k || e.y > layers[k - 1].y), 'build: bun top first, bun base last, each layer below the one before');
  ok(w.els.some(e => e.t === 'text' && e.s === 'TOP') && w.els.some(e => e.t === 'text' && e.s === 'BOTTOM'), 'build: TOP and BOTTOM, like the book\'s burger build');
  await p.click('[data-dw="save"]');
  await wait(p, () => /Saved/.test((document.querySelector('.mg-toasts .p-toast') || {}).textContent || ''));
  s = await store(p);
  ok((s[fsKey(['recipes', 'burger'])] || { r: {} }).r.diagram === '@burger-build', 'build: saved to the recipe\'s build slot');
  ok(!errs(p).length, 'build: no page errors ' + errs(p).join(' | '));
  await p.context().close();

  // sizes follow the amount: the 500 g rump is drawn bigger than the 250 g; the sauce goes under the steak
  p = await drawn('rump-250/plate');
  w = await S(p);
  const r250 = w.els.find(e => e.id === 'rump'), sauce250 = w.els.find(e => e.ing === 'Mushroom sauce');
  ok(w.style === 'pub' && !!r250 && w.els.some(e => e.ing === 'Chips') && w.els.some(e => e.ing === 'Salad'), 'rump 250: pub split, steak with chips and salad');
  ok(!!sauce250 && sauce250.k < r250.k && inside(sauce250, r250), 'rump 250: the sauce under the steak');
  ok(!w.els.some(e => /salt/.test(e.id)), 'rump 250: the salt flakes are not drawn');
  await p.context().close();
  p = await drawn('rump-500/plate');
  w = await S(p);
  const r500 = w.els.find(e => e.id === 'rump');
  ok(!!r500 && r500.sx > r250.sx * 1.2 && w.surf.shape === 'oval', 'rump 500: a bigger steak (' + (r500 && r500.sx) + ' against ' + r250.sx + ') on an oval plate');
  ok(w.onWare, 'rump 500: every part on the plate');
  await p.context().close();

  // a Caesar: a bowl, the cos as its base, the rest over it
  p = await drawn('caesar/plate');
  w = await S(p);
  ok(w.style === 'bowl' && w.surf.fam === 'bowl', 'Caesar: in a bowl');
  const cos = w.els.find(e => e.ing === 'Cos lettuce');
  ok(!!cos && cos.k === 0 && w.els.filter(e => e.t === 'item').every(e => e === cos || e.k > cos.k), 'Caesar: the cos is the base, everything else on it');
  ok(w.onWare && new Set(w.els.map(e => e.ing)).size === w.els.length, 'Caesar: every part in the bowl, none twice');
  await p.context().close();

  // the grill board: a board, the sauces in ramekins
  p = await drawn('grill-board/plate');
  w = await S(p);
  ok(w.style === 'board' && w.surf.fam === 'board', 'grill board: on a board');
  ok(w.els.filter(e => e.id === 'sauce-ramekin').map(e => e.ing).sort().join('|') === 'Diane sauce|Mushroom sauce', 'grill board: the Diane and mushroom sauces in ramekins');
  const bris = w.els.filter(e => /brisket/.test(e.id));
  ok(bris.length === 1 && /Oven brisket/.test(bris[0].also || ''), 'grill board: smoked or oven brisket is one part, both named');
  ok(w.onWare, 'grill board: every part on the board');
  await p.context().close();

  // a parmy: pub split, the napoli, ham and mozzarella stacked on the schnitzel in the recipe's order
  p = await drawn('chicken-parmy/plate');
  w = await S(p);
  const sch = w.els.find(e => e.ing === 'Chicken schnitzel'), tops = ['Napoli sauce', 'Shaved leg ham', 'Mozzarella'].map(k => w.els.find(e => e.ing === k));
  ok(w.style === 'pub' && !!sch, 'parmy: pub split with the schnitzel');
  ok(tops.every(Boolean) && tops.every(e => inside(e, sch) && e.k > sch.k) && tops[0].k < tops[1].k && tops[1].k < tops[2].k, 'parmy: napoli, ham and mozzarella on the schnitzel, in that order');
  // Try another layout changes it; Tidy up leaves a part moved by hand where it is
  const before = JSON.stringify(w.els.map(e => [e.x, e.y]));
  await p.click('[data-dw="sm-again"]'); await L.settle(p, 300);
  w = await S(p);
  ok(JSON.stringify(w.els.map(e => [e.x, e.y])) !== before && w.onWare, 'Try another layout: a different layout, still all on the plate');
  const ck = w.els.find(e => e.ing === 'Chips').k;
  const c0 = await centreOf(p, '.dw-el[data-i="' + ck + '"]');
  await p.mouse.move(c0[0], c0[1]); await p.mouse.down(); await p.mouse.move(c0[0] + 25, c0[1] + 20, { steps: 5 }); await p.mouse.up(); await L.settle(p, 200);
  const moved = (await S(p)).els.find(e => e.ing === 'Chips');
  await p.click('[data-dw="sm-tidy"]'); await L.settle(p, 300);
  w = await S(p);
  const after = w.els.find(e => e.ing === 'Chips'), sch2 = w.els.find(e => e.ing === 'Chicken schnitzel');
  ok(moved.fixed === true && Math.abs(after.x - moved.x) < 0.2 && Math.abs(after.y - moved.y) < 0.2, 'Tidy up: the chips moved by hand stay where they were put');
  ok(['Napoli sauce', 'Shaved leg ham', 'Mozzarella'].every(k => inside(w.els.find(e => e.ing === k), sch2)), 'Tidy up: the toppings stay on the schnitzel');
  // a plating style picked by hand
  await p.click('[data-dw="panel"][data-v="style"]'); await L.settle(p, 200);
  await p.click('[data-dw="sm-st"][data-v="clock"]'); await L.settle(p, 300);
  ok((await S(p)).style === 'clock', 'Plating style: Classic lays it out the classic way');
  await p.click('[data-dw="panel"][data-v="style"]'); await L.settle(p, 200);
  await p.click('[data-dw="sm-st"][data-v=""]'); await L.settle(p, 300);
  w = await S(p);
  ok(w.style === 'pub', 'Plating style: Pick for me goes back to the pub split');
  // saved, then the side view is made from it
  await p.click('[data-dw="save"]');
  await wait(p, () => /Saved/.test((document.querySelector('.mg-toasts .p-toast') || {}).textContent || ''));
  const plate = w, saved = await store(p);
  ok(!errs(p).length, 'parmy: no page errors ' + errs(p).join(' | '));
  await p.context().close();

  // the side view, from the saved plate: left to right as on the plate, the toppings standing on the schnitzel, labelled
  p = await L.open(b, '#/manage/draw/new/chicken-parmy/side', { who: 'ann', extra: Object.assign({}, saved, cfg()), wait: 1200, width: 1280, height: 900 });
  await wait(p, () => !!document.querySelector('[data-dw="sm-draw"]') && window.LK_RX.arts().some(x => x.rid === 'chicken-parmy'), null, 20000);
  await p.click('[data-dw="sm-draw"]');
  await wait(p, () => window.LK_DRAW.state().d.els.some(e => e.t === 'text'), null, 10000);
  if (SHOTS) await (await p.$('.dw-svg')).screenshot({ path: path.join(SHOTS, 'smart-chicken-parmy-side.png') });
  w = await S(p);
  const sd = k => w.els.find(e => e.t === 'item' && e.ing === k), pl = k => plate.els.find(e => e.ing === k);
  ok(['Chips', 'Salad', 'Chicken schnitzel'].every(k => sd(k)) && (sd('Chips').x < sd('Salad').x) === (pl('Chips').x < pl('Salad').x), 'side view: the chips and salad left to right as on the plate');
  ok(['Napoli sauce', 'Shaved leg ham', 'Mozzarella'].every(k => sd(k) && sd(k).y < sd('Chicken schnitzel').y) && sd('Mozzarella').y < sd('Napoli sauce').y, 'side view: napoli, ham and mozzarella stacked on the schnitzel');
  const sl = w.els.filter(e => e.t === 'text' && e.auto);
  ok(sl.length === new Set(w.els.filter(e => e.t === 'item' && e.ing).map(e => e.ing)).size && sl.every(e => e.anchor === 'middle' && e.lx != null), 'side view: each part labelled above it with a line, like the book\'s side views');
  const boxes = sl.map(e => { const hw = Math.max(e.s.length * 5.8, (e.sub || '').length * 4.9) / 2; return [e.x - hw, e.y - 10, e.x + hw, e.y + (e.sub ? 9 : 2)]; });
  ok(!boxes.some((a, i) => boxes.some((c, j) => j > i && a[0] < c[2] && c[0] < a[2] && a[1] < c[3] && c[1] < a[3])), 'side view: no two labels on top of each other');
  await p.click('[data-dw="save"]');
  await wait(p, () => /Saved/.test((document.querySelector('.mg-toasts .p-toast') || {}).textContent || ''));
  s = await store(p);
  ok((s[fsKey(['recipes', 'chicken-parmy'])] || { r: {} }).r.side === '@chicken-parmy-side', 'side view: saved to the recipe\'s side slot');
  await p.goto(L.BASE + '#/r/chicken-parmy'); await L.settle(p, 900);
  ok(await p.evaluate(() => !!document.querySelector('.side-art svg [data-surf], .side-art svg g')) && await p.evaluate(() => !!document.querySelector('.stage svg.art [data-surf]')), 'side view: the card shows the plate and From the side');
  ok(!errs(p).length, 'side view: no page errors ' + errs(p).join(' | '));
  await p.context().close();

  // a batch recipe in a GN pan; a dessert; battered fish; a parmy with a topper card
  p = await drawn('rice/pan');
  w = await S(p);
  ok(w.style === 'pan' && w.surf.shape === 'gn' && w.els.some(e => e.ing === 'Rice') && w.onWare, 'batch: the rice in a GN pan');
  await p.context().close();
  p = await drawn('sticky-toffee/plate');
  w = await S(p);
  const pud = w.els.find(e => e.ing === 'Sticky date pudding'), bs = w.els.find(e => e.ing === 'Rum butterscotch'), hc = w.els.filter(e => e.ing === 'Honeycomb');
  ok(w.style === 'dessert' && !!pud && !!bs && bs.k < pud.k && inside(bs, pud), 'dessert: the butterscotch under the pudding');
  ok(hc.length >= 1 && hc.every(e => e.k > pud.k) && w.els.some(e => e.ing === 'Vanilla ice cream') && w.onWare, 'dessert: honeycomb on top, the ice cream beside it, all on the plate');
  await p.context().close();
  p = await drawn('fish-chips/plate');
  w = await S(p);
  const fish = w.els.find(e => e.ing === 'Fish fillet');
  ok(!!fish && /batter/.test(fish.id) && /Beer batter/.test(fish.also || '') && !w.els.some(e => e.ing === 'Beer batter'), 'fish and chips: the beer batter makes the fish battered, not a part of its own');
  ok(w.els.some(e => e.ing === 'Tartare sauce' && e.k > fish.k) && w.els.some(e => e.ing === 'Lemon'), 'fish and chips: tartare beside the fish, a lemon wedge');
  await p.context().close();
  p = await drawn('schnitzel-french/plate');
  w = await S(p);
  ok(w.els.some(e => e.id === 'parmy-french' && /French parmi topper/.test(e.also || '')), 'French parmy: the topper card makes the schnitzel a French parmy');
  await p.context().close();

  // drawn from its own card (asked for by the head chef, 21 Oct 2026): the wings' Cowboy candy is what the Cowboy candy
  // card makes, jalapeño rings in a turmeric syrup with mustard seed; nothing to pick
  p = await drawn('wings/plate');
  w = await S(p);
  const cc = w.els.find(e => e.ing === 'Cowboy candy');
  ok(!!cc && cc.t === 'raw' && cc.made === 'cowboy-candy' && w.unsure.indexOf('Cowboy candy') < 0, 'from its card: the wings\' Cowboy candy is drawn from the Cowboy candy card, nothing to pick');
  const madeNote = (await L.txt(p, '.dw-made')) || '';
  ok(/Cowboy candy/.test(madeNote) && /jalape/i.test(madeNote) && /turmeric/i.test(madeNote) && /mustard seed/i.test(madeNote), 'from its card: the note says what it is drawn from (' + madeNote + ')');
  // the colours by hue: rings drawn as green strokes, the syrup a gold fill
  const hues = !cc ? {} : await p.evaluate(k => {
    const hue = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255), mx = Math.max(...c), mn = Math.min(...c), d = mx - mn; if (!d) return -1; const x = mx === c[0] ? (c[1] - c[2]) / d % 6 : mx === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4; return (x * 60 + 360) % 360; };
    const body = window.LK_DRAW.state().d.defs[k] || '', out = { ring: [], fill: [] };
    body.replace(/<circle[^>]*fill="none"[^>]*stroke="(#[0-9A-Fa-f]{6})"/g, (m, c) => { out.ring.push(hue(c)); return m; });
    body.replace(/<path[^>]*fill="(#[0-9A-Fa-f]{6})"/g, (m, c) => { out.fill.push(hue(c)); return m; });
    return out;
  }, cc.a);
  ok((hues.ring || []).some(h => h >= 60 && h <= 110) && (hues.fill || []).some(h => h >= 30 && h <= 50), 'from its card: green jalapeño rings in a gold syrup (' + JSON.stringify(hues) + ')');
  await p.click('[data-dw="save"]');
  await wait(p, () => /Saved/.test((document.querySelector('.mg-toasts .p-toast') || {}).textContent || ''));
  s = await store(p);
  const wd = s[fsKey(['drawings', 'wings-plate'])] || {}, wpins = ((s[fsKey(['recipes', 'wings'])] || { r: {} }).r.pins || []);
  ok(!!cc && !!JSON.parse(wd.defs || '{}')[cc.a] && wpins.some(x => x.label === 'Cowboy candy' && x.link === 'cowboy-candy'), 'from its card: saved with its drawing, and its Pass label links to the card');
  ok(!errs(p).length, 'from its card: no page errors ' + errs(p).join(' | '));
  await p.context().close();
  // opened again: the same part, read back from the saved drawing
  p = await L.open(b, '#/manage/draw/wings-plate', { who: 'ann', extra: Object.assign({}, s, cfg()), wait: 1200, width: 1280, height: 900 });
  await wait(p, () => !!(window.LK_DRAW && window.LK_DRAW.state() && window.LK_DRAW.state().d && window.LK_DRAW.state().d.els.length), null, 20000);
  w = await S(p);
  ok(!!cc && w.els.some(e => e.made === 'cowboy-candy' && e.a === cc.a), 'from its card: the saved drawing opens with the same Cowboy candy');
  await p.context().close();
  // the flank's Cowboy butter is the butter with the bourbon BBQ rub through it; the steaks' mushroom sauce has its
  // mushrooms in it
  p = await drawn('flank/plate');
  w = await S(p);
  ok(w.els.some(e => e.ing === 'Cowboy butter' && e.made === 'cowboy-butter'), 'from its card: the flank\'s Cowboy butter is drawn from its card');
  await p.context().close();
  // added by hand: the chip for an ingredient with a card adds what its card makes
  p = await L.open(b, '#/manage/draw/new/riblets/plate', { who: 'ann', extra: cfg(), wait: 1200, width: 1280, height: 900 });
  await wait(p, () => !!document.querySelector('.dw-miss [data-dw="ing"][data-v="Cowboy candy"]'), null, 20000);
  await p.click('.dw-miss [data-dw="ing"][data-v="Cowboy candy"]');
  await wait(p, () => window.LK_DRAW.state().d.els.some(e => e.made === 'cowboy-candy'));
  w = await S(p);
  ok(w.els.some(e => e.ing === 'Cowboy candy' && e.made === 'cowboy-candy' && e.t === 'raw'), 'by hand: the Cowboy candy chip adds what its card makes');
  await p.context().close();

  // a pick is remembered: the donut fries are unsure; the head chef picks a drawing, saves, and the next drawing of them
  // gets it right first time
  p = await drawn('donut-fries/plate');
  w = await S(p);
  ok(w.unsure.indexOf('Donut fries') >= 0 && await p.$('.dw-un [data-dw="sm-pick"]') !== null, 'unsure: Donut fries asks which drawing, with guesses');
  const pick = await p.getAttribute('.dw-un [data-dw="sm-pick"]', 'data-v');
  await p.click('.dw-un [data-dw="sm-pick"]'); await L.settle(p, 300);
  w = await S(p);
  ok(w.els.some(e => e.ing === 'Donut fries') && w.unsure.indexOf('Donut fries') < 0, 'pick: one tap puts it on the plate');
  await p.click('[data-dw="save"]');
  await wait(p, () => /Saved/.test((document.querySelector('.mg-toasts .p-toast') || {}).textContent || ''));
  s = await store(p);
  const learnt = (s[fsKey(['book', 'matches'])] || {}).m || {};
  ok(learnt['donut fry'] === pick.split('|')[1] && (s[fsKey(['book', 'matches'])] || {}).by === 'ann', 'pick: saved to book/matches with the drawing (' + JSON.stringify(learnt) + ')');
  await p.context().close();
  p = await drawn('donut-fries/plate', { extra: Object.assign({}, s, cfg()) });
  w = await S(p);
  ok(w.unsure.indexOf('Donut fries') < 0 && w.els.some(e => e.ing === 'Donut fries' && e.id === pick.split('|')[1]), 'pick: the next drawing of Donut fries gets it right first time');
  ok(!errs(p).length, 'pick: no page errors ' + errs(p).join(' | '));
  await p.context().close();

  // a phone (390 px): the buttons fit and Draw it for me works
  p = await drawn('burger/plate', { width: 390, height: 844, touch: true });
  ok((await S(p)).els.length === 2 && !(await L.overflow(p)), 'phone: Draw it for me works with no sideways scroll');
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
