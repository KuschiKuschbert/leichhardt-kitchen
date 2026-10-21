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
  var STOP = /^(salt|table salt|pepper|black pepper|white pepper|cracked pepper|oil|olive oil|canola oil|vegetable oil|cooking oil|sesame oil|rice bran oil|oil spray|cooking spray|water|ice|stock|chicken stock|beef stock|flour|plain flour|self raising flour|wing flour|corn flour|cornflour|panko crumb|breadcrumb|sugar|caster sugar|brown sugar|icing sugar mix|seasoning|szechuan seasoning|white cooking wine|red cooking wine|cooking wine|wine|beer|baking powder|bicarb soda|butter for the pan|batter mix|eggwash|egg wash|garlic|ginger|onion powder|garlic powder|paprika|cumin|ground cinnamon|italian herb|dried oregano|vinegar|white vinegar|lemon juice|lime juice|cream for the sauce|milk|bay leaf|bay leaves|star anise|cinnamon stick|cinnamon sticks|cloves|sea salt|sea salt flakes|salt flakes|maldon salt|flaky salt)$/;
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
      var s = h.name === k ? 1 : (' ' + h.all.join(' ') + ' ').indexOf(' ' + k + ' ') >= 0 && ws.length > 1 ? 0.97 - Math.min(0.12, h.name.split(' ').filter(function (w) { return ws.indexOf(w) < 0; }).length * 0.02) + ((' ' + h.main.join(' ') + ' ').indexOf(' ' + k + ' ') >= 0 ? 0.03 : 0) : fit(ws, h, head);
      // the plain piece before its colour and size variants
      if (s && h.it.of) s -= 0.03;
      if (s) out.push({ id: h.it.id, s: s });
    });
    if (!out.length) LIB.search(name, o).slice(0, 3).forEach(function (it, i) { out.push({ id: it.id, s: 0.5 - i * 0.05 }); });
    out.sort(function (a, b) { return b.s - a.s; });
    return out.slice(0, 4);
  }
  // names the book uses often that say something else than their words (garnish is micro herbs on the plate)
  var SYN = { riblet: 'pork ribs', 'pork riblet': 'pork ribs', salad: 'garden salad', garnish: 'micro herbs', 'green garnish': 'micro herbs', 'side sauce': 'sauce ramekin', sauce: 'sauce ramekin', 'side salad': 'garden salad', mesclun: 'mixed leaves', 'green bowl': 'mixed leaves' };
  var SYN_K = {}; Object.keys(SYN).forEach(function (x) { SYN_K[key(x)] = SYN[x]; });
  // names that are one thing although they say "and"
  var ONE = /\b(bread and butter|salt and pepper|mac and cheese|fish and chips|sweet and sour|surf and turf|bangers and mash|pie and peas|shell and lid)\b/i;
  var FORMW = [[/swoosh|swoop|swipe|smear/, ['swoosh', 'smear']], [/drizzl/, ['drizzle']], [/\bdots?\b/, ['dots']], [/quenelle/, ['quenelle']], [/\bpool|puddle|ladle/, ['pool']], [/scatter|sprinkl/, ['scatter']], [/ramekin|on the side|in a pot/, ['bowlful']]];
  /* The library piece for an ingredient of recipe r: { id, conf, guesses, why }. Linked recipes count by their own
     name too (a link to "gravy" gives the gravy pool); a pick the head chef made before always wins. */
  function matchIng(i, r) {
    if (hidden(i)) return { id: '', conf: 1, guesses: [], why: 'hidden' };
    var k = key(i.name);
    if (learned && learned[k] && LIB.get(learned[k])) return { id: learned[k], conf: 1, guesses: [], why: 'learned' };
    var best = rank(i.name, { notCat: 'build' }), lk = i.link && (window.LK_APP.byId(i.link) || X.pristine(i.link));
    if (lk) rank(lk.name, { notCat: 'build' }).concat(rank(i.link.replace(/-/g, ' '), { notCat: 'build' })).forEach(function (x) { x.s = Math.min(1, x.s * 0.95); best.push(x); });
    // a sauce goes to the sauce shapes when its name says sauce, jus, gravy, aioli and the like
    if (/\b(sauce|jus|gravy|aioli|mayo|dressing|relish|ketchup|chutney|salsa|pesto|glaze|syrup|butterscotch|coulis|puree|dip)\b/.test(plain(i.name))) best.forEach(function (x) { var it = LIB.get(x.id); if (it && (it.cat === 'sauce')) x.s += 0.1; });
    // the recipe's words for the shape ("swoop and smear", "drizzled", "dots") pick between pieces that fit as well
    var how = (i.name + ' ' + (i.note || '')).toLowerCase();
    FORMW.forEach(function (f) { if (f[0].test(how)) best.forEach(function (x) { var it = LIB.get(x.id); if (it && f[1].indexOf(it.form) >= 0) x.s += 0.05; }); });
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
  // a coating on the main ("Beer batter" with "Fish fillet"): the fish is drawn battered, the batter is not a part of its own
  // only an ingredient that is the coating itself ("Beer batter", "Panko crumbs"), not something already coated ("Crumbed chicken thigh")
  var COAT = [[/\b(batter|tempura)$/i, 'battered'], [/\b(crumbs?|breadcrumbs?|panko)$/i, 'crumbed']];
  function coatOf(i) { var p = plain(i.name); if (/chip|salad|topping|scatter/.test(p)) return ''; for (var k = 0; k < COAT.length; k++) if (COAT[k][0].test(p) && p.split(' ').length <= 3) return COAT[k][1]; return ''; }
  // a burger or a sandwich: one piece from above, its fillings inside it (each still labelled on the Pass)
  function burgerOf(r, parts) {
    if (!/burger|slider|sandwich|sanga/i.test(r.name)) return null;
    var bun = parts.filter(function (p) { return p.it.role === 'bread' || /\b(bun|roll|brioche|turkish|bread)\b/i.test(p.ing); })[0];
    if (!bun) return null;
    var t = parts.map(function (p) { return p.ing; }).join(' ').toLowerCase(), id = 'beef-burger';
    if (/steak sand|steak sanga/i.test(r.name)) id = 'steak-sandwich';
    else if (/club/i.test(r.name)) id = 'club-sandwich';
    else if (/turkish|sandwich/.test(r.name.toLowerCase() + ' ' + bun.ing.toLowerCase())) id = bun.id;
    else if (/slider/i.test(r.name)) id = 'slider-burger';
    else if (/beetroot/.test(t) && /egg|pineapple/.test(t)) id = 'works-burger';
    else if (/chicken|schnit|fish|fillet|grenadier|barra|falafel/.test(t)) id = 'chicken-burger';
    return { bun: bun, it: LIB.get(id) || bun.it };
  }
  // every visible ingredient, matched and sized: [{ ing, i, id, it, scale, count, conf, guesses, also }]
  function partsOf(r, d, loose) {
    var out = [], unsure = [], also = {}, used = {}, parmy = /parm|schnit/i.test(r.name), toppers = [], coats = [];
    var fold = function (name, into) { also[name] = into.ing; (into.also = into.also || []).push(name); };
    (r.ingredients || []).forEach(function (i0) {
      split(i0).forEach(function (i) {
        if (hidden(i)) return;
        // a parmy topper ("French parmi topper"): the schnitzel becomes that parmy, the topper is drawn with it
        if (/topper/i.test(i.name)) {
          var tk = rank(String(i.name).replace(/\btopper\b/i, ' ').replace(/\bparmi\b/i, ' ') + ' parmy', { cat: 'meat' })[0];
          if (tk && tk.s >= 0.6 && /parm/i.test(LIB.get(tk.id).name)) { toppers.push({ ing: R.ingName(i), id: tk.id }); return; }
        }
        var c = coatOf(i); if (c) { coats.push({ ing: R.ingName(i), cook: c }); return; }
        var m = matchIng(i, r), name = R.ingName(i);
        if (!m.id) { unsure.push({ ing: name, guesses: [] }); return; }
        if (m.conf < 0.6) { unsure.push({ ing: name, guesses: m.guesses }); return; }
        // two ingredients for the same piece (the pie mix and the pie case, smoked or oven brisket): one part, both named
        if (used[m.id]) { fold(name, used[m.id]); return; }
        var it = LIB.get(m.id), part = { ing: name, i: i, id: m.id, it: it, scale: DR.scaleFor(it, i.q), count: countOf(it, i.q), conf: m.conf, guesses: m.guesses };
        // a garnish or topping given by weight gets more pieces, not one giant one; a sauce never floods the plate
        if (/^(garnish|topping)$/.test(it.role) && part.scale > 1.4) { part.count = Math.max(part.count, Math.min(3, Math.round(part.scale * part.scale / 1.6))); part.scale = 1.15; }
        if (/sauce/.test(it.role)) part.scale = Math.min(part.scale, 1.6);
        // a parmy's own sauce, ham and cheese go on the schnitzel, in the recipe's order
        if (parmy && /^(sauce|topping)$/.test(it.role) && /napoli|pizza|tomato|ham|cheese|mozzarella|bacon|pineapple|egg|avocado|prawn|hollandaise|bearnaise|brie|jalape|salsa|guac|sour cream/i.test(name + ' ' + it.name)) part.on = true;
        used[m.id] = part;
        out.push(part);
      });
    });
    // the parmy for a topper takes the schnitzel's place (one part, both ingredients named)
    toppers.forEach(function (t) {
      var sch = out.filter(function (p) { return /schnit/i.test(p.ing + ' ' + p.it.name); })[0], it = LIB.get(t.id);
      if (sch) { fold(t.ing, sch); sch.id = t.id; sch.it = it; }
      else out.push({ ing: t.ing, i: { name: t.ing, q: '' }, id: t.id, it: it, scale: 1, count: 1, conf: 0.9, guesses: [] });
    });
    // a coating: the main fish or meat drawn that way
    coats.forEach(function (c) {
      var host = out.filter(function (p) { return p.it.role === 'main' && /^(seafood|meat|prepared)$/.test(p.it.cat); })[0];
      if (!host) return;
      fold(c.ing, host);
      if (host.it.cook === c.cook) return;
      var alt = rank(c.cook + ' ' + host.ing, { cat: host.it.cat }).filter(function (x) { var it = LIB.get(x.id); return it.role === 'main' && (it.cook === c.cook || new RegExp(c.cook).test(it.name.toLowerCase())); })[0];
      if (alt && alt.s >= 0.5) { host.id = alt.id; host.it = LIB.get(alt.id); }
    });
    // a burger: the whole burger from above, what is inside it named with it; chips and side sauces stay on the plate
    var bg = loose ? null : burgerOf(r, out);
    if (bg) {
      var host = bg.bun, keep = [];
      out.forEach(function (p) {
        if (p === host) return keep.push(p);
        var sideOne = /^(starch|sidedish)$/.test(p.it.role) || /\bside\b|on the side|guest choose|choice/i.test(p.ing + ' ' + (p.i.note || ''));
        if (sideOne) keep.push(p); else { fold(p.ing, host); (p.also || []).forEach(function (x) { fold(x, host); }); }
      });
      host.id = bg.it.id; host.it = bg.it; host.scale = 1; host.count = 1;
      out = keep;
    }
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
     in the order of the recipe), sauces under or beside, garnish on top, then the solver pushes overlaps apart. What sits
     on the main moves with it. */
  var LAYER = { sauce: 0, dsauce: 0, starch: 1, bread: 1, veg: 1, salad: 1, sidedish: 1, main: 2, dessert: 2, dside: 2, topping: 3, garnish: 4 };
  function layout(d, r, parts, style, seed) {
    var rnd = LIB.P.rng('layout:' + d.rid + ':' + seed), a = areaOf(d.surf), els = [], mirror = seed % 2 === 1 && style !== 'pan' && style !== 'bowl';
    var order = parts.slice().sort(function (x, y) { return (y.it.w * y.it.h * y.scale * y.scale) - (x.it.w * x.it.h * x.scale * x.scale); });
    var byRole = {}, ramekin = LIB.get('sauce-ramekin');
    var place = function (p, at, rot, host) {
      p.placed = true;
      var it = p.it;
      // on a board a sauce comes in a ramekin
      if (STYLES[style].pack && /sauce/.test(it.role) && ramekin && it.id !== ramekin.id) it = ramekin;
      var k2 = it.id + '@' + it.v, col = /sauce/.test(p.it.role) || it === ramekin ? LIB.sauceColour(p.ing) : '';
      d.defs[k2] = LIB.body(it.id);
      for (var c = 0; c < p.count; c++) {
        var ang = p.count > 1 ? c / p.count * Math.PI * 2 + rnd() * 0.5 : 0, rr = p.count > 1 ? Math.max(it.w, it.h) * p.scale * 0.5 : 0;
        if (host && rr) { var hb = sizeEl(host); rr = Math.min(rr, Math.min(hb[0], hb[1]) * 0.28); }
        var el = { t: 'item', a: k2, x: n1(at[0] + Math.cos(ang) * rr), y: n1(at[1] + Math.sin(ang) * rr * 0.7), sx: n1(p.scale * 100) / 100, sy: n1(p.scale * 100) / 100, r: Math.round(rot + (p.count > 1 ? rnd() * 50 - 25 : 0)), ing: p.ing };
        if (p.also && p.also.length) el.also = p.also.join('|').slice(0, 400);
        if (col && it.side && it.side.c) el.cm = R.tintMap(d.defs[k2], it.side.c, col);
        if (host) { el._h = host; el._o = [el.x - host.x, el.y - host.y]; }
        if (p.on) el._on = 1;
        els.push(el);
      }
    };
    if (style === 'pan') {
      // a batch recipe: the main thing fills the pan, the rest scattered over it
      var big = order[0];
      if (big) { var fit = Math.min(a.rx * 1.8 / big.it.w, a.ry * 1.8 / big.it.h, 2.6); big.scale = Math.max(big.scale, fit); place(big, [a.cx, a.cy], 0); }
      order.slice(1).forEach(function (p) { var q = LIB.P.inEllipse(rnd, a.rx * 0.6, a.ry * 0.6); place(p, [a.cx + q[0], a.cy + q[1]], rnd() * 60 - 30); });
    } else if (STYLES[style].pack) {
      // a share board: the biggest first, in rows across the board, the sauces in ramekins along the front
      var x = a.cx - a.rx, y = a.cy - a.ry, rowH = 0, sauces = order.filter(function (p) { return /sauce/.test(p.it.role); });
      order.filter(function (p) { return sauces.indexOf(p) < 0 && !/^(garnish|topping)$/.test(p.it.role); }).forEach(function (p) {
        var w = p.it.w * p.scale * (p.count > 1 ? 1.6 : 1), h = p.it.h * p.scale * (p.count > 1 ? 1.4 : 1);
        if (x + w > a.cx + a.rx && x > a.cx - a.rx) { x = a.cx - a.rx; y += rowH + 4; rowH = 0; }
        place(p, [x + w / 2, Math.min(a.cy + a.ry - h / 2, y + h / 2)], rnd() * 20 - 10);
        x += w + 4; rowH = Math.max(rowH, h);
      });
      sauces.forEach(function (p, k) { place(p, [a.cx + a.rx - 26 - k * 50, a.cy + a.ry - 24], 0); });
    } else if (STYLES[style].bowl) {
      // a bowl: the base in the middle, the toppings in sectors round it, garnish on top
      var base = order.filter(function (p) { return /^(starch|salad|main)$/.test(p.it.role) && p.it.form === 'bowlful'; })[0] || order.filter(function (p) { return p.it.role === 'starch' || p.it.role === 'salad'; })[0];
      if (base) { base.scale = Math.max(base.scale, Math.min(a.rx * 1.7 / Math.max(base.it.w, base.it.h), 2.2)); place(base, [a.cx, a.cy], 0); }
      var ring = order.filter(function (p) { return p !== base && !/^(sauce|dsauce|garnish)$/.test(p.it.role); }), rr = Math.min(a.rx, a.ry) * 0.5;
      ring.forEach(function (p, k) {
        var ang = -Math.PI / 2 + k / Math.max(1, ring.length) * Math.PI * 2, room = rr * (ring.length > 3 ? 1 : 1.3);
        p.scale = Math.min(p.scale, room / Math.max(p.it.w, p.it.h));
        place(p, [a.cx + Math.cos(ang) * rr, a.cy + Math.sin(ang) * rr], Math.round(rnd() * 40 - 20));
      });
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
      var role = p.on ? 'topping' : p.it.role, h = host();
      if (p.placed || !/^(sauce|dsauce|topping|garnish)$/.test(role) || style === 'pan') return;
      if (!h) { place(p, [a.cx, a.cy], 0); return; }
      var hs = sizeEl(h), off = (k % 3 - 1) * 4;
      if (role === 'topping') place(p, [h.x + off, h.y + off * 0.5], h.r || 0, h);
      else if (role === 'garnish') place(p, [h.x + hs[0] * 0.18, h.y - hs[1] * 0.18], rnd() * 60 - 30, h);
      else if (style === 'dessert') place(p, [h.x - hs[0] * 0.06, h.y + hs[1] * 0.14], -12, h);
      // a dollop or a quenelle (tartare, aioli) sits beside the main, towards the middle of the plate
      else if (/^(dollop|quenelle|scoop|bowlful)$/.test(p.it.form)) { var sgn = h.x > a.cx + 10 ? -1 : 1; place(p, [h.x + sgn * hs[0] * 0.42, h.y - hs[1] * 0.3], 0, h); }
      else if (/^(swoosh|smear|line)$/.test(p.it.form)) place(p, [h.x - hs[0] * 0.18, h.y + hs[1] * 0.28], -8, h);
      // a sauce: in a ramekin at the side when the recipe says side or choice, else under the main
      else if (/\bside\b|ramekin|choice|choose/.test((p.ing + ' ' + (p.i.note || '')).toLowerCase())) place(p, spot(style, 'sidedish', a, 0), 0);
      else place(p, [h.x + hs[0] * 0.08, h.y + hs[1] * 0.12], 0, h);
    });
    // layers: sauce, base pieces, mains, toppings, garnish (the order js/draw.js keeps when adding by hand)
    var lay = function (e) { if (e._on) return 3; var it = LIB.get(e.a.split('@')[0]); return it ? LAYER[it.role] : 2; };
    els.forEach(function (e, k) { e._k = k; });
    els.sort(function (x, y) { return (lay(x) - lay(y)) || (x._k - y._k); });
    solve(els, a, rnd, false);
    // what sits on a part goes where that part went
    els.forEach(function (e) { if (e._h) { e.x = n1(e._h.x + e._o[0]); e.y = n1(e._h.y + e._o[1]); } });
    els.forEach(function (e) { delete e._k; delete e._h; delete e._o; delete e._on; });
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
    keep.forEach(function (e) { if (e.ing) keepIng[e.ing] = 1; String(e.also || '').split('|').forEach(function (x) { if (x) keepIng[x] = 1; }); });
    var els = layout(d, r, pp.parts.filter(function (p) { return !keepIng[p.ing]; }), style, seed);
    d.els = keep.concat(els);
    d.layout = { style: style, seed: seed, also: pp.also };
    return { style: style, unsure: pp.unsure, parts: pp.parts.length };
  }
  // the same solver over what is there: overlaps pushed apart, everything back on the servingware, hand-placed parts stay
  function tidy() {
    var d = DR.state().d, a = areaOf(d.surf), roleOf = function (e) { var it = e.t === 'item' && LIB.get(e.a.split('@')[0]); return it ? it.role : ''; };
    // a sauce, topping or garnish sitting on a part moves with that part
    var ride = [];
    d.els.forEach(function (e) {
      if (!/^(sauce|dsauce|topping|garnish)$/.test(roleOf(e)) || e.fixed) return;
      var best = null, bd = Infinity;
      d.els.forEach(function (h) { if (h === e || !roleOf(h) || /^(sauce|dsauce|topping|garnish)$/.test(roleOf(h))) return; var b = R.bbox(h), dd = Math.hypot(h.x - e.x, h.y - e.y); if (e.x >= b[0] && e.x <= b[2] && e.y >= b[1] && e.y <= b[3] && dd < bd) { bd = dd; best = h; } });
      if (best) ride.push([e, best, e.x - best.x, e.y - best.y]);
    });
    solve(d.els, a, LIB.P.rng('tidy'), true);
    ride.forEach(function (x) { x[0].x = n1(x[1].x + x[2]); x[0].y = n1(x[1].y + x[3]); });
  }

  /* ---------- the side view, from the plate ---------- */
  // a profile piece from the side: the build library's own one for the piece when there is one, else a shape for its role
  function sidePiece(it, ing) {
    // a whole burger or sandwich: the assembled stack from the side
    if (it.form === 'stack') { var st = rank(it.name, { cat: 'build' }).concat(rank(ing || '', { cat: 'build' })).filter(function (x) { return LIB.get(x.id).form === 'stack'; })[0]; return LIB.get(st ? st.id : 'side-cheeseburger'); }
    // a piece that names its own holder (a cone, a cup) or a whole dish only when the part says so too
    var own = (it.name + ' ' + (ing || '')).toLowerCase();
    var notStack = function (x) { var pc = x && LIB.get(x.id); return pc && pc.form !== 'stack' && !(/\b(cone|cup|benedict)\b/.test(pc.name.toLowerCase()) && !/\b(cone|cup|benedict)\b/.test(own)); };
    var hit = rank(it.name, { cat: 'build' }).filter(notStack)[0], h2 = ing ? rank(ing, { cat: 'build' }).filter(notStack)[0] : null;
    if (h2 && (!hit || h2.s > hit.s)) hit = h2;
    if (hit && hit.s >= 0.6 && !/^side-(ware|profile)-/.test(hit.id)) return LIB.get(hit.id);
    var prof = LIB.get('side-profile-' + ((it.side && it.side.s) || 'mound'));
    return prof || null;
  }
  function sideFrom(seed) {
    var W = DR.state(), d = W.d, api = B(), r = R.recipeOf(d.rid);
    var plate = (X.arts().filter(function (x) { return x.rid === d.rid && (x.slot === 'plate' || x.slot === 'pan') && !x.removed; })[0]);
    return (plate ? api.ready().then(function () { return api.fs().getDoc(api.docRef('drawings', plate.id)); }).then(function (sn) { return sn.exists() ? sn.data() : null; }, function () { return null; }) : Promise.resolve(null)).then(function (pd) {
      // no plate drawn yet: the one Draw it for me would make, so the side view matches it
      if (!pd || !Array.isArray(pd.els)) {
        var tmp = { rid: d.rid, slot: 'plate', surf: ware(r, 'plate'), defs: {}, els: [] }, pp = partsOf(r, tmp).parts;
        pd = { surf: tmp.surf, els: layout(tmp, r, pp, pickStyle(r, 'plate', tmp.surf, pp), seed || 0) };
      }
      var surfW = LIB.surface(pd.surf || { fam: 'plate', size: 30 }).w || 200;
      // in the plate's own order, bottom layer first (a sauce pool before its steak, the napoli after its schnitzel)
      var parts = pd.els.filter(function (e) { return e.t === 'item'; }).map(function (e) {
        var it = LIB.get(e.a.split('@')[0]); if (!it) return null;
        var b = R.bbox(e);
        return { it: it, ing: e.ing || it.name, x: e.x / surfW * 200, y: e.y / surfW * 200, w: (b[2] - b[0]) / surfW * 200, h: (b[3] - b[1]) / surfW * 200 };
      }).filter(Boolean);
      // pieces of the same part (three honeycomb shards): one from the side
      var seen = {}; parts = parts.filter(function (p) { var k2 = p.ing + '|' + p.it.id; if (seen[k2]) return false; seen[k2] = 1; return true; });
      return layoutSide(d, parts, seed, pd.surf || ware(r, 'plate'));
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
  /* The plate seen from the front: each part where it is from left to right on the plate, standing on the plate or on the
     part it sits on (a part on top of another from above: the napoli and cheese on the schnitzel, the main on its sauce).
     Parts at the back are drawn first, so the ones in front stand before them. */
  function layoutSide(d, parts, seed, surf) {
    var els = [], placed = [], base = 0, pit = LIB.get(wareSide(surf)), half = 70, k = 0.85;
    // the servingware a little narrower than the frame, so the labels have room either side
    if (pit) { var ps = Math.min(1, 170 / pit.w); d.defs[pit.id + '@' + pit.v] = LIB.body(pit.id); els.push({ t: 'item', a: pit.id + '@' + pit.v, x: 0, y: 0, sx: n1(ps * 100) / 100, sy: n1(ps * 100) / 100, r: 0 }); half = pit.w * ps * 0.4; k = pit.w * ps / 200; base = -(pit.side.s === 'cup' ? pit.h * ps * 0.2 : pit.h * ps * 0.7); }
    parts.filter(function (p) { return p.it.role !== 'garnish' || p.w > 20; }).forEach(function (p) {
      var pc = sidePiece(p.it, p.ing); if (!pc) return;
      var prof = /^side-profile-/.test(pc.id), w = Math.max(14, Math.min(half * 1.6, p.w * k)), edge = Math.max(0, half * 1.25 - w / 2), x = Math.max(-edge, Math.min(edge, p.x * half / 70)), sx = w / (pc.w || 40);
      var sy = prof ? ((p.it.side && p.it.side.h) || 12) * k / (pc.h || 20) : sx;
      sy = Math.max(0.3, Math.min(3, sy));
      // what it sits on: the highest part below it whose middle it sits in, seen from above
      var on = placed.filter(function (q) { return Math.abs(q.p.x - p.x) < q.p.w * 0.38 && Math.abs(q.p.y - p.y) < q.p.h * 0.38; }).sort(function (q1, q2) { return q1.top - q2.top; })[0];
      var key2 = pc.id + '@' + pc.v; d.defs[key2] = LIB.body(pc.id);
      var el = { t: 'item', a: key2, x: n1(on ? on.el.x + (x - on.el.x) * 0.3 : x), y: n1(on ? on.top + 1 : base), sx: n1(sx * 100) / 100, sy: n1(sy * 100) / 100, r: 0, ing: p.ing };
      if (prof && p.it.side && p.it.side.c) el.cm = R.tintMap(d.defs[key2], pc.side.c, p.it.side.c);
      var q = { p: p, el: el, top: el.y - (pc.h || 20) * sy, root: on ? on.root : p, lvl: on ? on.lvl + 1 : 0 };
      placed.push(q);
    });
    // back to front, and on each spot from the bottom up
    placed.sort(function (q1, q2) { return (q1.root.y - q2.root.y) || (q1.lvl - q2.lvl); }).forEach(function (q) { els.push(q.el); });
    d.els = els; d.layout = { style: 'side', seed: seed || 0 };
    DR.labelAll();
    return { style: 'side', parts: els.length };
  }

  /* ---------- the build view (burgers, sandwiches, stacks) ---------- */
  function buildFrom() {
    var W = DR.state(), d = W.d, r = R.recipeOf(d.rid), layers = [], bread = '';
    partsOf(r, d, true).parts.forEach(function (p) {
      var nm = (p.ing + ' ' + p.it.name).toLowerCase();
      if (/^(starch|sidedish)$/.test(p.it.role) || /\bside\b|on the side|guest choose|choice/.test(nm + ' ' + (p.i.note || '').toLowerCase())) return;
      if (!bread && (p.it.role === 'bread' || /\b(bun|roll|brioche|turkish|bread)\b/.test(nm))) { bread = p; return; }
      layers.push({ ing: p.ing, q: p.i.q, find: p.ing, it: p.it });
    });
    if (bread) {
      var tk = /turkish/.test(bread.ing.toLowerCase()) ? 'turkish' : '', top = tk ? 'side-turkish-top' : (rank('bun top ' + bread.ing, { cat: 'build' }).filter(function (x) { return /-top/.test(x.id); })[0] || { id: 'side-bun-top-sesame' }).id;
      layers.unshift({ ing: bread.ing, q: bread.i.q, pc: LIB.get(top) });
      layers.push({ ing: bread.ing, q: '', pc: LIB.get(tk ? 'side-turkish-base' : 'side-bun-base'), base: true });
    }
    // each layer's piece: its own from the build library, a sauce as a dripping layer in its colour, else a plain shape
    var pcs = layers.map(function (l) {
      if (l.pc) return { l: l, pc: l.pc, cm: null };
      if (l.it && /sauce/.test(l.it.role)) { var sl = LIB.get('side-sauce-layer'); return { l: l, pc: sl, cm: R.tintMap(LIB.body(sl.id), sl.side.c, LIB.sauceColour(l.ing)) }; }
      var hit = rank(l.find, { cat: 'build' })[0], pc = hit && hit.s >= 0.5 && !/^side-(ware|profile)-/.test(hit.id) ? LIB.get(hit.id) : sidePiece(l.it || { name: l.ing, side: { s: 'layer', h: 8, c: '#C98A45' } }, l.ing);
      return pc ? { l: l, pc: pc, cm: /^side-profile-/.test(pc.id) && l.it && l.it.side && l.it.side.c ? 'tint' : null } : null;
    }).filter(Boolean);
    pcs.forEach(function (o) {
      o.sx = 150 / (o.pc.w || 150);
      // a plain shape keeps the part's own height; a drawn layer keeps its proportions
      o.sy = /^side-profile-/.test(o.pc.id) ? Math.max(0.3, Math.min(1.5, ((o.l.it && o.l.it.side && o.l.it.side.h) || 8) / (o.pc.h || 16))) : Math.max(0.5, Math.min(2, o.sx));
      o.h = (o.pc.h || 16) * o.sy;
    });
    // everything fits between TOP and BOTTOM: the gaps first, then the layers a little flatter
    var avail = 206, sum = pcs.reduce(function (m, o) { return m + o.h; }, 0), gap = pcs.length > 1 ? Math.max(3, Math.min(12, (avail - sum) / (pcs.length - 1))) : 0;
    if (sum + gap * (pcs.length - 1) > avail) { var f = (avail - gap * (pcs.length - 1)) / sum; pcs.forEach(function (o) { o.sy *= f; o.h *= f; }); }
    var y = -104, els = [], labs = [];
    els.push({ t: 'text', s: 'TOP', x: -160, y: -110, size: 9, col: '#C2451A', anchor: 'start' });
    pcs.forEach(function (o, k) {
      var key2 = o.pc.id + '@' + o.pc.v;
      d.defs[key2] = LIB.body(o.pc.id);
      y += o.h + (k ? gap : 0);
      var el = { t: 'item', a: key2, x: -60, y: n1(y), sx: n1(o.sx * 100) / 100, sy: n1(o.sy * 100) / 100, r: 0, ing: o.l.ing };
      if (o.cm === 'tint') el.cm = R.tintMap(d.defs[key2], o.pc.side.c, o.l.it.side.c); else if (o.cm) el.cm = o.cm;
      els.push(el);
      // the bun base is the same ingredient as the top: one label at the top is enough
      if (!o.l.base) labs.push({ s: o.l.ing, sub: o.l.q || '', at: y - o.h / 2 });
    });
    // the labels down the right, each clear of the one above, the lines to the middle of their layer
    var last = -Infinity;
    labs.forEach(function (lb) { lb.y = Math.max(lb.at + 3, last + (lb.sub ? 23 : 15)); last = lb.y; });
    var over = labs.length ? labs[labs.length - 1].y - 112 : 0;
    if (over > 0) labs.forEach(function (lb) { lb.y = Math.max(-104, lb.y - over); });
    labs.forEach(function (lb) { els.push({ t: 'text', s: lb.s, sub: lb.sub, x: 40, y: n1(lb.y), size: 10, anchor: 'start', lx: 18, ly: n1(lb.at), auto: true }); });
    els.push({ t: 'text', s: 'BOTTOM', x: -160, y: n1(Math.min(118, y + 12)), size: 9, col: '#C2451A', anchor: 'start' });
    d.els = els; d.layout = { style: 'build', seed: 0 };
    return { style: 'build', parts: pcs.length };
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
