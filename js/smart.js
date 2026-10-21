/*
  Leichhardt Kitchen Book: the smart creator (Manage Recipes & Drawings, asked for by the head chef, 21 Oct 2026)
  =============================================================================================================
  "Draw it for me": the book draws a plate from the recipe by itself, then the head chef only tweaks it. Plain rules
  on the device, no AI service (the site is static and public, with no safe place for a key), the same result every
  time for the same recipe ("Try another layout" changes the seed), and what it makes is an ordinary drawing that can
  be changed part by part. Loaded with the drawing editor (js/draw.js) on the head chef's device only.

    match(ingredient)  the library piece for an ingredient: a pick the head chef made before (book/matches), its
                       exact name, a search word, the recipe it links to, the words it shares, or one slip away
    drawIt(drawing)    servingware, a plating style, every visible ingredient matched, sized by its amount and laid
                       out by the solver; sauce under, garnish on top, nothing off the servingware
    tidy(drawing)      the same solver over what is there, leaving alone what the head chef moved by hand
    sideFrom(plate)    the view from the side, from the plate (left to right as on the plate, stacked by layer)
    buildFrom(recipe)  the exploded build for a burger, sandwich or stack, top to bottom in the ingredient order

  The drawing parts carry the ingredient they show (ing), so the Pass labels are made from them (js/draw.js).
*/
(function () {
  'use strict';
  var LIB = window.LK_LIB, DR = window.LK_DRAW, R = DR.render, X = window.LK_RX, P = window.LK_PREP;
  function B() { return P.book(); }
  function n1(x) { return Math.round(x * 10) / 10; }

  /* ---------- words ---------- */
  function words(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean); }
  // one form for plurals and cooked words: slices and sliced are slic, roasted and roast are roast
  function stem(w) {
    if (w.length <= 3) return w;
    w = w.replace(/ies$/, 'y').replace(/oes$/, 'o').replace(/([^s])s$/, '$1').replace(/es$/, 'e');
    if (w.length > 5) w = w.replace(/ed$/, '');
    return w.length > 4 ? w.replace(/e$/, '') : w;
  }
  // words that say how it is bought or cooked, not what it looks like
  var FILLER = { bought: 1, in: 1, house: 1, made: 1, homemade: 1, fresh: 1, frozen: 1, cooked: 1, of: 1, the: 1, a: 1, an: 1, and: 1, with: 1, on: 1, for: 1, style: 1, our: 1, choice: 1, side: 0, light: 1, chunky: 1, double: 1, smoked: 0, seasonal: 0, mix: 0, x: 1, g: 1, kg: 1, ml: 1, l: 1, pcs: 1, piece: 1, pieces: 1 };
  function key(name) { return words(String(name || '').replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')).filter(function (w) { return !FILLER[w] && !/^\d+$/.test(w); }).map(stem).join(' '); }
  // the ingredients that never show on the plate: they are cooked in, or under everything
  var STOP = /^(salt|table salt|pepper|black pepper|white pepper|cracked pepper|oil|olive oil|canola oil|vegetable oil|cooking oil|sesame oil|rice bran oil|oil spray|cooking spray|water|ice|stock|chicken stock|beef stock|flour|plain flour|self raising flour|wing flour|corn flour|cornflour|panko crumb|breadcrumb|sugar|caster sugar|brown sugar|icing sugar mix|seasoning|szechuan seasoning|white cooking wine|red cooking wine|cooking wine|wine|beer|baking powder|bicarb soda|butter for the pan|batter mix|eggwash|egg wash|garlic|ginger|onion powder|garlic powder|paprika|cumin|ground cinnamon|italian herb|dried oregano|vinegar|white vinegar|lemon juice|lime juice|cream for the sauce|milk)$/;
  function plain(name) { return words(String(name || '').replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')).filter(function (w) { return !FILLER[w] && !/^\d+$/.test(w); }).join(' '); }
  function hidden(i) { var p = plain(i.name); return !p || STOP.test(p) || STOP.test(p.replace(/s$/, '')); }

  /* ---------- learned matches (book/matches, the head chef's picks) ---------- */
  var learned = null, learnP = null;
  function loadLearned() {
    if (learnP) return learnP;
    var api = B();
    learnP = api.ready().then(function () { return api.fs().getDoc(api.docRef('book', 'matches')); }).then(function (sn) {
      learned = sn.exists() && sn.data().m && typeof sn.data().m === 'object' ? sn.data().m : {};
    }, function () { learned = {}; });
    return learnP;
  }
  // a pick or a correction: kept so the next recipe gets it right first time (written with the drawing's save)
  var pending = {};
  function teach(name, id) { var k = key(name); if (!k || !LIB.get(id)) return; (learned = learned || {})[k] = id; pending[k] = id; }
  function pendingOps() {
    var ks = Object.keys(pending); if (!ks.length) return [];
    var api = B(), m = {}; ks.forEach(function (k) { m[k] = pending[k]; });
    return [['set', api.docRef('book', 'matches'), { m: m, upd: api.now() }, true]];
  }
  function saved() { pending = {}; }

  /* ---------- the matcher ---------- */
  var hay = null;
  function itemsHay() {
    if (hay && hay.n === LIB.items.length) return hay.h;
    hay = { n: LIB.items.length, h: LIB.items.map(function (it) {
      var nm = key(it.name.split(',')[0].split(/ with /i)[0]).split(' ');
      return { it: it, name: key(it.name), main: nm, head: nm[nm.length - 1], all: key([it.name, it.kw, it.sub, it.cook].join(' ')).split(' ') };
    }) };
    return hay.h;
  }
  /* How well a piece fits a name, 0 to 1. In a kitchen name the last word says what it is ("Pork Cumberland sausage" is a
     sausage, "Shaved parmesan" is parmesan): a piece that has that word scores 0.62 and up, by how many of the other words
     it has too. Without it, at most 0.55, which counts as unsure. */
  // a last word that only says which part ("pie shell", "cob loaf mix", "cookie dough"): the word before it says what it is
  var WEAK = { mix: 1, shell: 1, lid: 1, wrapper: 1, dough: 1, base: 1, filling: 1, topper: 1, batter: 0, portion: 1, serve: 1, selection: 1 };
  // words that say how it is cut, cooked or bought: a piece without them still fits
  var DESC = {}; ['crispy', 'shortcut', 'light', 'oven', 'texas', 'smok', 'roast', 'toast', 'charr', 'season', 'kid', 'vegan', 'dairy', 'free', 'double', 'chunky', 'continental', 'julienn', 'shredd', 'grat', 'dic', 'slic', 'shav', 'baby', 'small', 'large', 'mini', 'american', 'korean', 'southern', 'style', 'hot', 'cold', 'warm', 'new', 'classic', 'plain', 'whole', 'half', 'thick', 'thin', 'red', 'green', 'white', 'king', 'vege', 'veg', 'vegetarian', 'gluten', 'gf'].forEach(function (w) { DESC[stem(w)] = 1; });
  // last words that say only the shape (bites, fillet, roll): with none of the other words, the match is a guess
  var GENERIC = {}; ['bite', 'fillet', 'sauce', 'stick', 'roll', 'ball', 'slice', 'piece', 'strip', 'chip', 'fry', 'fries', 'wedge', 'cake', 'patty', 'mix', 'salad', 'skewer', 'dip', 'cream', 'butter', 'candy', 'bowl'].forEach(function (w) { GENERIC[stem(w)] = 1; });
  function headOf(ws) { var k = ws.length - 1; while (k > 0 && WEAK[ws[k]]) k--; return k; }
  function fit(ws, h, head) {
    var hk = ws.indexOf(head); if (hk < 0) { hk = headOf(ws); head = ws[hk]; }
    var has = function (w) { return h.all.indexOf(w) >= 0; }, other = ws.filter(function (w, k) { return k !== hk && !WEAK[w] && (!DESC[w] || has(w)); });
    if (has(head)) {
      var found = other.filter(has).length, nm = h.name.split(' '), extra = nm.filter(function (w) { return ws.indexOf(w) < 0; }).length, ratio = other.length ? found / other.length : 1;
      // the piece's own name: that word in its main part (a cheese slice before mac and cheese for "Cheese"), few words of its own
      return Math.min(0.99, (ratio || !GENERIC[head] ? 0.64 : 0.56) + 0.28 * ratio + (ratio > 0 && h.main.indexOf(head) >= 0 ? 0.05 : 0) - Math.min(0.15, extra * 0.04) - (nm.indexOf(head) < 0 ? 0.04 : 0));
    }
    var hit = ws.filter(has).length;
    return hit ? 0.55 * hit / ws.length : 0;
  }
  // the best few pieces for a name: [{ id, s }] with s from 0 to 1
  function rank(name, o) {
    o = o || {};
    var k0 = key(name), kw0 = k0.split(' ').filter(function (w) { return !WEAK[w]; }).join(' '), syn = SYN_K[k0] || SYN_K[kw0];
    var k = syn ? key(syn) : k0, ws = k ? k.split(' ') : [], out = [];
    if (!ws.length) return [];
    // what it is comes from the part before a comma ("Spring rolls, cocktail" are spring rolls)
    var hw = key(syn || String(name).split(',')[0]).split(' '), head = hw[headOf(hw)];
    itemsHay().forEach(function (h) {
      if (o.cat && h.it.cat !== o.cat) return;
      if (o.notCat && h.it.cat === o.notCat) return;
      var s = h.name === k ? 1 : (' ' + h.all.join(' ') + ' ').indexOf(' ' + k + ' ') >= 0 && ws.length > 1 ? 0.95 - Math.min(0.12, h.name.split(' ').filter(function (w) { return ws.indexOf(w) < 0; }).length * 0.03) + ((' ' + h.main.join(' ') + ' ').indexOf(' ' + k + ' ') >= 0 ? 0.03 : 0) : fit(ws, h, head);
      // the plain piece before its colour and size variants
      if (s && h.it.of) s -= 0.03;
      if (s) out.push({ id: h.it.id, s: s });
    });
    if (!out.length) LIB.search(name, o).slice(0, 3).forEach(function (it, i) { out.push({ id: it.id, s: 0.5 - i * 0.05 }); });
    out.sort(function (a, b) { return b.s - a.s; });
    return out.slice(0, 4);
  }
  // names the book uses often that say something else than their words (garnish is micro herbs on the plate)
  var SYN = { riblet: 'pork ribs', 'pork riblet': 'pork ribs', garnish: 'micro herbs', 'green garnish': 'micro herbs', 'side sauce': 'sauce ramekin', sauce: 'sauce ramekin', 'side salad': 'garden salad', mesclun: 'mixed leaves', 'green bowl': 'mixed leaves' };
  var SYN_K = {}; Object.keys(SYN).forEach(function (x) { SYN_K[key(x)] = SYN[x]; });
  // names that are one thing although they say "and"
  var ONE = /\b(bread and butter|salt and pepper|mac and cheese|fish and chips|sweet and sour|surf and turf|bangers and mash|pie and peas|shell and lid)\b/i;
  /* The library piece for an ingredient of recipe r: { id, conf, guesses, why }. Linked recipes count by their own
     name too (a link to "gravy" gives the gravy pool); a pick the head chef made before always wins. */
  function matchIng(i, r) {
    if (hidden(i)) return { id: '', conf: 1, guesses: [], why: 'hidden' };
    var k = key(i.name);
    if (learned && learned[k] && LIB.get(learned[k])) return { id: learned[k], conf: 1, guesses: [], why: 'learned' };
    var best = rank(i.name, { notCat: 'build' }), lk = i.link && (window.LK_APP.byId(i.link) || X.pristine(i.link));
    if (lk) rank(lk.name, { notCat: 'build' }).concat(rank(i.link.replace(/-/g, ' '), { notCat: 'build' })).forEach(function (x) { x.s = Math.min(1, x.s * 0.95); best.push(x); });
    // a sauce goes to the sauce shapes when its name says sauce, jus, gravy, aioli and the like
    if (/\b(sauce|jus|gravy|aioli|mayo|dressing|relish|ketchup|chutney|salsa|pesto|glaze|syrup|butterscotch|coulis|puree|dip)\b/.test(plain(i.name))) best.forEach(function (x) { var it = LIB.get(x.id); if (it && (it.cat === 'sauce')) x.s += 0.06; });
    var seen = {}, uniq = [];
    best.sort(function (a, b) { return b.s - a.s; }).forEach(function (x) { if (!seen[x.id]) { seen[x.id] = 1; uniq.push(x); } });
    if (!uniq.length) return { id: '', conf: 0, guesses: [], why: 'none' };
    return { id: uniq[0].id, conf: Math.min(1, uniq[0].s), guesses: uniq.slice(0, 3).map(function (x) { return x.id; }), why: 'name' };
  }
  // "Chips and salad": two parts when both halves are pieces of their own
  function split(i) {
    var m = String(i.name).match(/^(.+?)\s+(?:and|&|with)\s+(.+)$/i);
    if (!m || ONE.test(i.name)) return [i];
    var a = matchIng({ name: m[1] }), b = matchIng({ name: m[2] });
    if (a.conf >= 0.8 && b.conf >= 0.8 && a.id !== b.id) return [Object.assign({}, i, { name: m[1].trim(), whole: i.name }), Object.assign({}, i, { name: m[2].trim(), whole: i.name })];
    return [i];
  }

  /* ---------- servingware for the recipe ---------- */
  function text(r) { return (r.name + ' ' + (r.forLine || '') + ' ' + (r.menu || '') + ' ' + (r.ingredients || []).map(function (i) { return i.name; }).join(' ')).toLowerCase(); }
  function ware(r, slot) {
    var t = text(r), nm = (r.name + ' ' + (r.forLine || '')).toLowerCase();
    if (slot === 'pan' || r.kind === 'batch' || r.kind === 'component') {
      var y = String(r.yield || '').toLowerCase(), v = parseFloat((y.match(/([\d.]+)\s*(l|litre|kg)\b/) || [])[1]) || 0;
      return { fam: 'other', shape: 'gn', gn: v >= 8 ? '1/1' : v >= 3 ? '1/2' : v >= 1 ? '1/3' : '1/6' };
    }
    if (/board|platter|share|grazing/.test(nm)) return { fam: 'board', shape: 'rect', size: 50, tone: 'medium', finish: 'straight', edge: 'rounded' };
    if (/pasta|spaghetti|fettuccine|carbonara|bolognese|risotto|linguine|penne/.test(nm)) return { fam: 'bowl', shape: 'round', size: 28, rim: 'flat', depth: 'shallow', col: 'white' };
    if (/salad|bowl|curry|poke|laksa|soup|chowder|ramen|pho/.test(nm)) return { fam: 'bowl', shape: 'round', size: 26, rim: 'rolled', depth: 'deep', col: 'white' };
    if (r.kind === 'side') return { fam: 'bowl', shape: 'round', size: 18, rim: 'rolled', depth: 'deep', col: 'white' };
    if (r.kind === 'dessert') return { fam: 'plate', shape: 'round', size: 26, rim: 'wide', finish: 'gloss', col: 'white' };
    if (/\bkids?\b|junior/.test(nm)) return { fam: 'plate', shape: 'round', size: 24, rim: 'narrow', finish: 'gloss', col: 'white', divided: true };
    if (/senior/.test(nm)) return { fam: 'plate', shape: 'round', size: 27, rim: 'wide', finish: 'gloss', col: 'white' };
    if (/fish (and|&) chips|beer batter|battered fish/.test(t) && /chip/.test(t)) return { fam: 'plate', shape: 'oval', size: 34, rim: 'narrow', finish: 'gloss', col: 'white' };
    if (/mixed grill|platter|tomahawk|t-bone|500 ?g/.test(nm)) return { fam: 'plate', shape: 'oval', size: 36, rim: 'narrow', finish: 'gloss', col: 'white' };
    return { fam: 'plate', shape: 'round', size: 30, rim: 'wide', finish: 'gloss', col: 'white' };
  }

  /* ---------- plating styles: where each role goes, as a share of the servingware's usable area ----------
     x and y from -1 to 1 (y below 0 is the back of the plate, away from the guest). */
  var STYLES = {
    clock: { name: 'Classic', main: [0.05, 0.28], starch: [-0.45, -0.32], veg: [0.45, -0.32], salad: [0.42, -0.35], sidedish: [0.55, 0.35], bread: [-0.5, 0.3], dessert: [0, 0], dside: [0.45, 0.2] },
    pub: { name: 'Pub split', main: [0, 0.3], starch: [-0.38, -0.32], salad: [0.38, -0.32], veg: [0.38, -0.32], sidedish: [0.6, 0.15], bread: [-0.55, 0.3], dessert: [0, 0], dside: [0.45, 0.2] },
    bed: { name: 'On a bed', starch: [-0.05, 0.1], main: [-0.05, 0.05], veg: [0.48, -0.28], salad: [0.45, -0.35], sidedish: [0.55, 0.4], bread: [-0.5, -0.3], dessert: [0, 0], dside: [0.45, 0.2] },
    side: { name: 'Side by side', main: [-0.3, 0.05], bread: [-0.3, 0.05], starch: [0.38, 0], salad: [0.1, -0.5], veg: [0.1, -0.5], sidedish: [0.45, 0.5], dessert: [0, 0], dside: [0.45, 0.2] },
    stack: { name: 'Stacked', starch: [0, 0.02], main: [0, 0], veg: [0.5, 0.3], salad: [-0.5, -0.3], sidedish: [0.6, 0.4], bread: [-0.55, 0.3], dessert: [0, 0], dside: [0.45, 0.2] },
    grill: { name: 'Mixed grill', main: [-0.3, 0.25], starch: [0.4, -0.3], salad: [-0.35, -0.35], veg: [0.4, 0.35], sidedish: [0.62, 0.05], bread: [0, -0.55], dessert: [0, 0], dside: [0.45, 0.2] },
    board: { name: 'Share board', pack: true },
    bowl: { name: 'Bowl', bowl: true },
    dessert: { name: 'Dessert', dessert: [-0.15, 0.05], dside: [0.42, 0.05], main: [-0.15, 0.05], starch: [0.4, -0.3], veg: [0.4, -0.3], salad: [0.4, -0.3], sidedish: [0.5, 0.4], bread: [-0.5, -0.3] },
    pan: { name: 'In the pan', pan: true }
  };
  function pickStyle(r, slot, surf, parts) {
    var nm = (r.name + ' ' + (r.forLine || '')).toLowerCase(), roles = {};
    parts.forEach(function (p) { roles[p.it.role] = (roles[p.it.role] || 0) + 1; });
    if (slot === 'pan') return 'pan';
    if (surf.fam === 'board' || /board|platter|share/.test(nm)) return 'board';
    if (surf.fam === 'bowl') return 'bowl';
    if (r.kind === 'dessert' || roles.dessert) return 'dessert';
    if (/mixed grill/.test(nm)) return 'grill';
    var has = function (re) { return parts.some(function (p) { return re.test(p.ing.toLowerCase() + ' ' + p.it.name.toLowerCase()); }); };
    if ((/burger|sandwich|wrap|roll|slider|toastie|taco/.test(nm) || roles.bread) && has(/chip|fries|wedge/)) return 'side';
    if (has(/chip|fries/) && has(/salad|slaw/)) return 'pub';
    if (has(/mash|puree|polenta|risotto/) && roles.main) return 'bed';
    if (/parm|schnit|fish (and|&) chips/.test(nm)) return 'pub';
    return 'clock';
  }

  /* ---------- the parts of a recipe ---------- */
  // every visible ingredient, matched and sized: [{ ing, i, id, it, scale, count, conf, guesses }]
  function partsOf(r, d) {
    var out = [], unsure = [], also = {}, used = {}, parmy = /parm|schnit/i.test(r.name), toppers = [];
    (r.ingredients || []).forEach(function (i0) {
      split(i0).forEach(function (i) {
        if (hidden(i)) return;
        // a parmy topper ("French parmi topper"): the schnitzel becomes that parmy, the topper is drawn with it
        if (/topper/i.test(i.name)) {
          var tk = rank(String(i.name).replace(/\btopper\b/i, ' ').replace(/\bparmi\b/i, ' ') + ' parmy', { cat: 'meat' })[0];
          if (tk && tk.s >= 0.6 && /parm/i.test(LIB.get(tk.id).name)) { toppers.push({ ing: R.ingName(i), id: tk.id }); return; }
        }
        var m = matchIng(i, r), name = R.ingName(i);
        if (!m.id) { unsure.push({ ing: name, guesses: [] }); return; }
        if (m.conf < 0.6) { unsure.push({ ing: name, guesses: m.guesses }); return; }
        // two ingredients for the same piece (the pie mix and the pie case): one part, both named
        if (used[m.id]) { also[name] = used[m.id]; return; }
        var it = LIB.get(m.id), part = { ing: name, i: i, id: m.id, it: it, scale: DR.scaleFor(it, i.q), count: countOf(it, i.q), conf: m.conf, guesses: m.guesses };
        // a parmy's own sauce, ham and cheese go on the schnitzel, in the recipe's order
        if (parmy && /^(sauce|topping)$/.test(it.role) && /napoli|pizza|tomato|ham|cheese|mozzarella|bacon|pineapple|egg|avocado|prawn|hollandaise|bearnaise|brie|jalape|salsa|guac|sour cream/i.test(name + ' ' + it.name)) part.on = true;
        used[m.id] = name;
        out.push(part);
      });
    });
    // the parmy for a topper takes the schnitzel's place (one part, both ingredients named)
    toppers.forEach(function (t) {
      var sch = out.filter(function (p) { return /schnit/i.test(p.ing + ' ' + p.it.name); })[0], it = LIB.get(t.id);
      if (sch) { also[t.ing] = sch.ing; sch.id = t.id; sch.it = it; }
      else { out.push({ ing: t.ing, i: { name: t.ing, q: '' }, id: t.id, it: it, scale: 1, count: 1, conf: 0.9, guesses: [] }); }
    });
    return { parts: out, unsure: unsure, also: also };
  }
  function countOf(it, q) { var a = DR.amount(q); return a && a.n && it && it.n ? Math.max(1, Math.min(12, Math.round(a.n / it.n))) : 1; }

  /* ---------- the solver ---------- */
  function areaOf(surf) { var s = LIB.surface(surf); return s.area; }
  function sizeEl(el) { var b = R.bbox(el); return [b[2] - b[0], b[3] - b[1]]; }
  // what stays where it is and what moves: sauces sit under their main, toppings and garnish on it
  function solve(els, a, rnd, keep) {
    var LAY = { sauce: 0, dsauce: 0, topping: 3, garnish: 4 };
    var movers = els.filter(function (e) { var it = e.t === 'item' && LIB.get(e.a.split('@')[0]); return it && LAY[it.role] === undefined && !(keep && e.fixed); });
    var all = els.filter(function (e) { var it = e.t === 'item' && LIB.get(e.a.split('@')[0]); return it && LAY[it.role] === undefined; });
    for (var iter = 0; iter < 80; iter++) {
      var moved = 0;
      for (var x = 0; x < all.length; x++) {
        for (var y = x + 1; y < all.length; y++) {
          var A = all[x], Bb = all[y], sa = sizeEl(A), sb = sizeEl(Bb);
          var need = (Math.min(sa[0], sa[1]) + Math.min(sb[0], sb[1])) * 0.42, dx = Bb.x - A.x, dy = Bb.y - A.y, dd = Math.hypot(dx, dy) || 0.01;
          if (dd >= need) continue;
          var push = (need - dd) / 2, ux = dx / dd, uy = dy / dd;
          var ma = movers.indexOf(A) >= 0, mb = movers.indexOf(Bb) >= 0;
          if (!ma && !mb) continue;
          var ka = ma && mb ? 1 : ma ? 2 : 0, kb = ma && mb ? 1 : mb ? 2 : 0;
          A.x -= ux * push * ka * 0.6; A.y -= uy * push * ka * 0.6; Bb.x += ux * push * kb * 0.6; Bb.y += uy * push * kb * 0.6;
          moved++;
        }
      }
      // keep every part on the servingware
      movers.forEach(function (e) {
        var s = sizeEl(e), rx = Math.max(4, a.rx - s[0] * 0.42), ry = Math.max(4, a.ry - s[1] * 0.42), dx = (e.x - a.cx) / rx, dy = (e.y - a.cy) / ry;
        if (a.shape === 'box') { e.x = a.cx + Math.max(-1, Math.min(1, dx)) * rx; e.y = a.cy + Math.max(-1, Math.min(1, dy)) * ry; }
        else { var k = Math.hypot(dx, dy); if (k > 1) { e.x = a.cx + dx / k * rx; e.y = a.cy + dy / k * ry; } }
      });
      if (!moved) break;
    }
    els.forEach(function (e) { if (e.x != null) { e.x = n1(e.x); e.y = n1(e.y); } });
  }
  // a part's place for its role in the style, on the servingware
  function spot(style, role, a, k) {
    var S = STYLES[style], p = S[role] || S.veg || [0, 0];
    return [a.cx + p[0] * a.rx + (k || 0) * 8, a.cy + p[1] * a.ry + (k || 0) * 6];
  }
  /* Lays the parts out: the biggest first in their zones, toppings stacked on the main (a parmy's ham, napoli and cheese
     in the order of the recipe), sauces under or beside, garnish on top, then the solver pushes overlaps apart. */
  function layout(d, r, parts, style, seed) {
    var rnd = LIB.P.rng('layout:' + d.rid + ':' + seed), a = areaOf(d.surf), els = [], mirror = seed % 2 === 1 && style !== 'pan' && style !== 'bowl';
    var key2 = function (p) { return p.it.id + '@' + p.it.v; };
    var mains = parts.filter(function (p) { return /^(main|dessert)$/.test(p.it.role); });
    var order = parts.slice().sort(function (x, y) { return (y.it.w * y.it.h * y.scale * y.scale) - (x.it.w * x.it.h * x.scale * x.scale); });
    var byRole = {};
    var place = function (p, at, rot) {
      d.defs[key2(p)] = LIB.body(p.it.id);
      var col = (p.it.role === 'sauce' || p.it.role === 'dsauce') ? LIB.sauceColour(p.ing) : '';
      for (var c = 0; c < p.count; c++) {
        var ang = p.count > 1 ? c / p.count * Math.PI * 2 + rnd() * 0.5 : 0, rr = p.count > 1 ? Math.max(p.it.w, p.it.h) * p.scale * 0.5 : 0;
        var el = { t: 'item', a: key2(p), x: n1(at[0] + Math.cos(ang) * rr), y: n1(at[1] + Math.sin(ang) * rr * 0.7), sx: n1(p.scale * 100) / 100, sy: n1(p.scale * 100) / 100, r: Math.round(rot + (p.count > 1 ? rnd() * 50 - 25 : 0)), ing: p.ing };
        if (col && p.it.side && p.it.side.c) el.cm = R.tintMap(d.defs[key2(p)], p.it.side.c, col);
        els.push(el);
      }
    };
    if (style === 'pan') {
      // a batch recipe: the main thing fills the pan, the rest scattered over it
      var big = order[0];
      if (big) { var fit = Math.min(a.rx * 1.8 / big.it.w, a.ry * 1.8 / big.it.h, 2.6); big.scale = Math.max(big.scale, fit); place(big, [a.cx, a.cy], 0); }
      order.slice(1).forEach(function (p, k) { var q = LIB.P.inEllipse(rnd, a.rx * 0.6, a.ry * 0.6); place(p, [a.cx + q[0], a.cy + q[1]], rnd() * 60 - 30); });
    } else if (STYLES[style].pack) {
      // a share board: the biggest first, in rows across the board
      var x = a.cx - a.rx, y = a.cy - a.ry, rowH = 0;
      order.forEach(function (p) {
        var w = p.it.w * p.scale * (p.count > 1 ? 1.6 : 1), h = p.it.h * p.scale * (p.count > 1 ? 1.4 : 1);
        if (x + w > a.cx + a.rx) { x = a.cx - a.rx; y += rowH + 4; rowH = 0; }
        place(p, [x + w / 2, Math.min(a.cy + a.ry - h / 2, y + h / 2)], rnd() * 20 - 10);
        x += w + 4; rowH = Math.max(rowH, h);
      });
    } else if (STYLES[style].bowl) {
      // a bowl: the base in the middle, the toppings in sectors round it, garnish on top
      var base = order.filter(function (p) { return /^(starch|salad|main)$/.test(p.it.role) && p.it.form === 'bowlful'; })[0] || order.filter(function (p) { return p.it.role === 'starch' || p.it.role === 'salad'; })[0];
      if (base) { base.scale = Math.max(base.scale, Math.min(a.rx * 1.5 / base.it.w, 1.8)); place(base, [a.cx, a.cy], 0); }
      var ring = order.filter(function (p) { return p !== base && !/^(sauce|dsauce|garnish)$/.test(p.it.role); });
      ring.forEach(function (p, k) { var ang = -Math.PI / 2 + k / Math.max(1, ring.length) * Math.PI * 2, rr = Math.min(a.rx, a.ry) * 0.48; place(p, [a.cx + Math.cos(ang) * rr, a.cy + Math.sin(ang) * rr], ang * 57 + 90); });
    } else {
      order.forEach(function (p) {
        var role = p.it.role;
        if (/^(sauce|dsauce|topping|garnish)$/.test(role) || p.on) return;
        var k = byRole[role] = (byRole[role] || 0) + 1, at = spot(style, role, a, k - 1);
        if (mirror) at[0] = a.cx - (at[0] - a.cx);
        place(p, at, role === 'main' || role === 'dessert' ? Math.round(rnd() * 20 - 10) : Math.round(rnd() * 40 - 20));
      });
    }
    // what sits on the main: toppings stacked in the recipe's order, then sauces under or beside it, garnish on top
    var host = function () { var m = els.filter(function (e) { var it = LIB.get(e.a.split('@')[0]); return it && /^(main|dessert)$/.test(it.role); })[0]; return m || els[0]; };
    parts.forEach(function (p, k) {
      var role = p.it.role, h = host();
      if (p.on) role = 'topping';
      if (!/^(sauce|dsauce|topping|garnish)$/.test(role) || style === 'pan') return;
      if (!h) { place(p, [a.cx, a.cy], 0); return; }
      var hs = sizeEl(h), off = (k % 3 - 1) * 4;
      if (role === 'topping') place(p, [h.x + off, h.y + off * 0.5], h.r || 0);
      else if (role === 'garnish') place(p, [h.x + hs[0] * 0.18, h.y - hs[1] * 0.18], rnd() * 60 - 30);
      else if (style === 'dessert') place(p, [h.x - hs[0] * 0.15, h.y + hs[1] * 0.35], -12);
      // a pub plate's sauce: in a ramekin at the side when the recipe says side, else under the main
      else if (/side|ramekin|on the side|choice/.test(p.ing.toLowerCase())) place(p, spot(style, 'sidedish', a, 0), 0);
      else place(p, [h.x + hs[0] * 0.08, h.y + hs[1] * 0.12], 0);
    });
    // layers: sauce, base pieces, mains, toppings, garnish (the order js/draw.js keeps when adding by hand)
    var lay = function (e) { var it = LIB.get(e.a.split('@')[0]); return it ? (DR.render ? ({ sauce: 0, dsauce: 0, starch: 1, bread: 1, veg: 1, salad: 1, sidedish: 1, main: 2, dessert: 2, dside: 2, topping: 3, garnish: 4 })[it.role] : 2) : 2; };
    els.forEach(function (e, k) { e._k = k; });
    els.sort(function (x, y) { return (lay(x) - lay(y)) || (x._k - y._k); });
    els.forEach(function (e) { delete e._k; });
    solve(els, a, rnd, false);
    return els;
  }

  /* ---------- Draw it for me ---------- */
  function drawIt(seed) {
    var W = DR.state(), d = W.d, r = R.recipeOf(d.rid);
    if (!r) return null;
    seed = seed || 0;
    if (d.slot === 'side') return sideFrom(seed);
    if (d.slot === 'build') return buildFrom();
    var pp = partsOf(r, d), surf = d.surf && d.els.length ? d.surf : ware(r, d.slot);
    d.surf = surf;
    var style = W.styleChoice || pickStyle(r, d.slot, surf, pp.parts);
    var keep = d.els.filter(function (e) { return e.fixed || e.t !== 'item'; }), keepIng = {};
    keep.forEach(function (e) { if (e.ing) keepIng[e.ing] = 1; });
    var els = layout(d, r, pp.parts.filter(function (p) { return !keepIng[p.ing]; }), style, seed);
    d.els = keep.concat(els);
    d.layout = { style: style, seed: seed, also: pp.also };
    return { style: style, unsure: pp.unsure, parts: pp.parts.length };
  }
  // the same solver over what is there: overlaps pushed apart, everything back on the servingware, hand-placed parts stay
  function tidy() {
    var d = DR.state().d, a = areaOf(d.surf);
    solve(d.els, a, LIB.P.rng('tidy'), true);
  }

  /* ---------- the side view, from the plate ---------- */
  // a profile piece from the side: the build library's own one for the piece when there is one, else a shape for its role
  function sidePiece(it, ing) {
    var hit = rank(ing || it.name, { cat: 'build' })[0] || rank(it.name, { cat: 'build' })[0];
    if (hit && hit.s >= 0.6) return LIB.get(hit.id);
    var prof = LIB.get('side-profile-' + ((it.side && it.side.s) || 'mound'));
    return prof || null;
  }
  function sideFrom(seed) {
    var W = DR.state(), d = W.d, api = B(), r = R.recipeOf(d.rid);
    var plate = (X.arts().filter(function (x) { return x.rid === d.rid && (x.slot === 'plate' || x.slot === 'pan') && !x.removed; })[0]);
    return (plate ? api.ready().then(function () { return api.fs().getDoc(api.docRef('drawings', plate.id)); }).then(function (sn) { return sn.exists() ? sn.data() : null; }, function () { return null; }) : Promise.resolve(null)).then(function (pd) {
      var src = pd && Array.isArray(pd.els) ? pd.els : null, parts;
      if (src) {
        var defs = {}; try { defs = JSON.parse(pd.defs || '{}'); } catch (e) {}
        var surfW = LIB.surface(pd.surf || { fam: 'plate', size: 30 }).w || 200;
        parts = src.filter(function (e) { return e.t === 'item'; }).map(function (e) { var it = LIB.get(e.a.split('@')[0]); return it ? { it: it, ing: e.ing || it.name, x: e.x / surfW * 200, w: it.w * Math.abs(e.sx || 1) / surfW * 200 } : null; }).filter(Boolean);
      } else {
        var pp = partsOf(r, d).parts;
        parts = pp.map(function (p, k) { return { it: p.it, ing: p.ing, x: (k - (pp.length - 1) / 2) * 50, w: p.it.w * p.scale }; });
      }
      return layoutSide(d, parts, seed, (pd && pd.surf) || ware(r, 'plate'));
    });
  }
  // the servingware from the side, for the plate's own servingware
  function wareSide(surf) {
    var s = surf || {};
    if (s.fam === 'board') return 'side-ware-board';
    if (s.fam === 'bowl') return s.depth === 'shallow' || s.size >= 28 ? 'side-ware-pasta-bowl' : 'side-ware-deep-bowl';
    if (s.shape === 'gn') return 'side-ware-gn-pan';
    if (s.shape === 'skillet') return 'side-ware-skillet';
    return 'side-ware-dinner-plate';
  }
  function layoutSide(d, parts, seed, surf) {
    var LAY = { sauce: 0, dsauce: 0, starch: 1, bread: 1, veg: 1, salad: 1, sidedish: 1, main: 2, dessert: 2, dside: 2, topping: 3, garnish: 4 };
    var els = [], tops = [], base = 0, pit = LIB.get(wareSide(surf)), half = 70;
    // the servingware a little narrower than the frame, so the labels have room either side
    if (pit) { var ps = Math.min(1, 170 / pit.w); d.defs[pit.id + '@' + pit.v] = LIB.body(pit.id); els.push({ t: 'item', a: pit.id + '@' + pit.v, x: 0, y: 0, sx: n1(ps * 100) / 100, sy: n1(ps * 100) / 100, r: 0 }); half = pit.w * ps * 0.4; base = -(pit.side.s === 'cup' ? pit.h * ps * 0.2 : pit.h * ps * 0.7); }
    parts.filter(function (p) { return p.it.role !== 'garnish' || p.w > 20; }).sort(function (x, y) { return (LAY[x.it.role] || 2) - (LAY[y.it.role] || 2); }).forEach(function (p) {
      var pc = sidePiece(p.it, p.ing); if (!pc) return;
      var x = Math.max(-half, Math.min(half, p.x * half / 95)), w = Math.max(14, Math.min(half * 1.6, p.w * 0.8)), sx = w / (pc.w || 40), h = (p.it.side && p.it.side.h) || 12, sy = h / (pc.h || 20);
      // stacked on whatever is already under this spot
      var under = tops.filter(function (t) { return Math.abs(t.x - x) < (t.w + w) * 0.4; }).reduce(function (m, t) { return Math.min(m, t.top); }, base);
      var key2 = pc.id + '@' + pc.v; d.defs[key2] = LIB.body(pc.id);
      var el = { t: 'item', a: key2, x: n1(x), y: n1(under), sx: n1(sx * 100) / 100, sy: n1(Math.max(0.4, Math.min(3, sy)) * 100) / 100, r: 0, ing: p.ing };
      if (/^side-profile-/.test(pc.id) && p.it.side && p.it.side.c) el.cm = R.tintMap(d.defs[key2], pc.side.c, p.it.side.c);
      els.push(el);
      tops.push({ x: x, w: w, top: under - (pc.h || 20) * el.sy });
    });
    d.els = els; d.layout = { style: 'side', seed: seed || 0 };
    DR.labelAll();
    return { style: 'side', parts: els.length };
  }

  /* ---------- the build view (burgers, sandwiches, stacks) ---------- */
  function buildFrom() {
    var W = DR.state(), d = W.d, r = R.recipeOf(d.rid), pp = partsOf(r, d).parts, layers = [];
    pp.forEach(function (p) {
      var nm = (p.ing + ' ' + p.it.name).toLowerCase();
      if (/\bbun|roll|brioche|bread\b/.test(nm)) { layers.unshift({ ing: p.ing, q: p.i.q, find: 'bun top ' + p.ing, top: true }); layers.push({ ing: p.ing, q: '', find: 'bun base ' + p.ing, base: true }); return; }
      layers.splice(layers.length && layers[layers.length - 1].base ? layers.length - 1 : layers.length, 0, { ing: p.ing, q: p.i.q, find: p.ing, it: p.it });
    });
    var y = -110, els = [], gap = 10;
    els.push({ t: 'text', s: 'TOP', x: -160, y: -114, size: 9, col: '#C2451A', anchor: 'start' });
    layers.forEach(function (l) {
      var hit = rank(l.find, { cat: 'build' })[0], pc = hit && hit.s >= 0.5 ? LIB.get(hit.id) : sidePiece(l.it || { name: l.ing, side: { s: 'layer', h: 8, c: '#C98A45' } }, l.ing);
      if (!pc) return;
      var key2 = pc.id + '@' + pc.v, sx = 150 / (pc.w || 150), sy = Math.max(0.5, Math.min(2, sx));
      d.defs[key2] = LIB.body(pc.id);
      var h = (pc.h || 16) * sy;
      y += h + gap;
      var el = { t: 'item', a: key2, x: -60, y: n1(y), sx: n1(sx * 100) / 100, sy: n1(sy * 100) / 100, r: 0, ing: l.ing };
      if (/^side-profile-/.test(pc.id) && l.it && l.it.side && l.it.side.c) el.cm = R.tintMap(d.defs[key2], pc.side.c, l.it.side.c);
      els.push(el);
      els.push({ t: 'text', s: l.ing, sub: l.q || '', x: 40, y: n1(y - h / 2 + 3), size: 10, anchor: 'start', lx: 18, ly: n1(y - h / 2), auto: true });
    });
    els.push({ t: 'text', s: 'BOTTOM', x: -160, y: n1(Math.min(118, y + 16)), size: 9, col: '#C2451A', anchor: 'start' });
    d.els = els; d.layout = { style: 'build', seed: 0 };
    return { style: 'build', parts: layers.length };
  }

  /* ---------- the buttons and the panel on the drawing page (js/draw.js asks for them) ---------- */
  function esc(t) { return window.LK_APP.esc(t); }
  function run(W, seed) {
    DR.before();
    var res = drawIt(seed);
    var done = function (r) { W.smart = r || null; W.sel = []; DR.redraw(); if (r) DR.say((r.parts ? 'Drawn: ' + r.parts + (r.parts === 1 ? ' part' : ' parts') : 'Drawn') + (r.unsure && r.unsure.length ? ', ' + r.unsure.length + ' to pick' : '') + '.'); };
    if (res && typeof res.then === 'function') res.then(done, function () { DR.redraw(); }); else done(res);
  }
  var ui = {
    tools: function (W, btn) {
      var side = W.d.slot === 'side' || W.d.slot === 'build';
      return btn('sm-draw', W.d.els.length ? 'Draw it again for me' : 'Draw it for me', { cls: 'p-x dw-add' }) + (side ? '' : btn('sm-again', 'Try another layout') + btn('sm-tidy', 'Tidy up') + btn('panel', 'Plating style', { v: 'style', on: W.panel === 'style' }));
    },
    panel: function (W, btn) {
      var out = '', r = W.smart;
      if (W.panel === 'style') {
        var cur = (W.d.layout && W.d.layout.style) || '';
        out += '<section class="dw-panel" aria-labelledby="dw-h-st"><h3 class="h3" id="dw-h-st">Plating style</h3><p class="hint">Draw it for me lays the plate out this way.</p><div class="chips">' +
          Object.keys(STYLES).filter(function (k) { return k !== 'pan'; }).map(function (k) { return btn('sm-st', STYLES[k].name, { v: k, on: (W.styleChoice || cur) === k, cls: 'chip' }); }).join('') + btn('sm-st', 'Pick for me', { v: '', on: !W.styleChoice, cls: 'chip' }) + '</div></section>';
      }
      if (r && r.unsure && r.unsure.length) {
        out += '<section class="dw-panel" aria-labelledby="dw-h-un"><h3 class="h3" id="dw-h-un">Which drawing?</h3><p class="hint">The book was not sure about these. One tap puts it on and remembers it for the next recipe.</p>' +
          r.unsure.map(function (u) {
            return '<div class="dw-un"><b>' + esc(u.ing) + '</b><div class="chips">' + u.guesses.map(function (id) { var it = LIB.get(id); return it ? btn('sm-pick', it.name, { v: u.ing + '|' + id, cls: 'chip' }) : ''; }).join('') + btn('sm-find', 'Find it in the library', { v: u.ing, cls: 'chip' }) + btn('sm-skip', 'Leave it off', { v: u.ing, cls: 'chip' }) + '</div></div>';
          }).join('') + '</section>';
      }
      if (r && r.style && STYLES[r.style]) out = '<p class="hint dw-smart-note" role="status">Drawn by the book: ' + esc(STYLES[r.style].name.toLowerCase()) + (r.style === 'side' || r.style === 'build' ? '' : ' plating') + '. Move anything; Tidy up leaves what you moved where it is.</p>' + out;
      return out;
    },
    cmd: function (a, v, W) {
      if (a === 'sm-draw') { W.seed = 0; run(W, 0); return true; }
      if (a === 'sm-again') { W.seed = (W.seed || 0) + 1; run(W, W.seed); return true; }
      if (a === 'sm-tidy') { DR.before(); tidy(); DR.redraw(); DR.say('Tidied up'); return true; }
      if (a === 'sm-st') { W.styleChoice = v || ''; W.panel = ''; run(W, W.seed || 0); return true; }
      if (a === 'sm-pick') {
        var k = v.lastIndexOf('|'), ing = v.slice(0, k), id = v.slice(k + 1), it = LIB.get(id), i = (R.recipeOf(W.d.rid).ingredients || []).filter(function (x) { return R.ingName(x) === ing; })[0] || {};
        teach(ing, id);
        if (W.smart) W.smart.unsure = W.smart.unsure.filter(function (u) { return u.ing !== ing; });
        W.sel = [];
        DR.addItem(id, { ing: ing, scale: DR.scaleFor(it, i.q) });
        DR.say(ing + ': ' + it.name);
        return true;
      }
      if (a === 'sm-find') { W.panel = 'lib'; W.q = v; W.pendingIng = v; W.more = 0; if (W.smart) W.smart.unsure = W.smart.unsure.filter(function (u) { return u.ing !== v; }); DR.redraw(); return true; }
      if (a === 'sm-skip') { if (W.smart) W.smart.unsure = W.smart.unsure.filter(function (u) { return u.ing !== v; }); DR.redraw(); return true; }
      return false;
    }
  };
  loadLearned();

  window.LK_SMART = {
    ui: ui,
    match: function (i, d) { var m = matchIng(i, d && R.recipeOf(d.rid)); return m.conf >= 0.6 ? m.id : ''; },
    matchIng: matchIng, rank: rank, key: key, hidden: hidden, split: split, ware: ware, pickStyle: pickStyle, STYLES: STYLES,
    partsOf: partsOf, drawIt: drawIt, tidy: tidy, loadLearned: loadLearned, teach: teach, pendingOps: pendingOps, saved: saved,
    learned: function () { return learned || {}; }
  };
})();
