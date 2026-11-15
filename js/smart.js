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
  An ingredient with a recipe card of its own is drawn from what that card is made of and how it is prepped (js/compose.js).
*/
(function () {
  'use strict';
  var LIB = window.LK_LIB, DR = window.LK_DRAW, R = DR.render, X = window.LK_RX, P = window.LK_PREP;
  function B() { return P.book(); }
  function n1(x) { return Math.round(x * 10) / 10; }

  /* ---------- words ---------- */
  function words(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\b([a-z])\.\s?([a-z])\.(?![a-z])/g, '$1$2').replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean).map(function (w, k, all) { return CHILLI_KIND[all[k - 1]] && /^peppers?$/.test(w) ? 'chilli' : ALIAS[w] || w; }); }
  // "Habanero peppers" and "Poblano peppers" are chillies, not capsicum
  var CHILLI_KIND = { serrano: 1, poblano: 1, habanero: 1, chipotle: 1, ancho: 1, guajillo: 1, pasilla: 1, anaheim: 1, fresno: 1, thai: 1, birdseye: 1, cayenne: 1, scotch: 1, padron: 1 };
  // the same thing spelt another way (the recipe library's US spellings): read as the book's word
  var ALIAS = { romaine: 'cos', chile: 'chilli', chiles: 'chilli', chili: 'chilli', chilis: 'chilli', chilies: 'chilli', chillies: 'chilli', beet: 'beetroot', beets: 'beetroot', yogurt: 'yoghurt', yogurts: 'yoghurt', eggplants: 'eggplants', cilantro: 'coriander', scallion: 'spring', scallions: 'spring', arugula: 'rocket', zucchinis: 'zucchini', rutabaga: 'swede', cantaloupe: 'rockmelon', garbanzo: 'chickpea', garbanzos: 'chickpeas', shrimp: 'prawn', shrimps: 'prawns', ketchup: 'tomato' };
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
  /* the ingredients that never show on the plate: they are cooked in, or under everything. One list with Check, kept in
     js/draw.js (render.HIDDEN, 15 Nov 2026); an older js/draw.js without it is caught by fresh() below */
  var STOP = R.HIDDEN || /^$/;
  function plain(name) { return words(String(name || '').replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')).filter(function (w) { return !FILLER[w] && !/^\d+$/.test(w); }).join(' '); }
  // "Corn ribs per serve": a note on how many, not an ingredient
  function hidden(i) { var p = plain(i.name); return !p || STOP.test(p) || STOP.test(p.replace(/s$/, '')) || /\bper (serve|plate|portion)\b/.test(p); }
  // on a dish's plate a rub, a paste or a stock is cooked into the meat or the sauce ("Brisket rub", "Tomato paste")
  // (a card read for what it makes still counts them: the rub through the Cowboy butter)
  function cookedIn(i) { return /\b(rub|paste|stock)$/.test(plain(i.name)); }
  // "Wrap each Snickers": what a step wraps in the recipe's wrappers or pastry is inside them, out of sight
  var WRAPPER = /wrapper|pastry|filo|phyllo|tortilla|rice paper|wonton|gyoza/i;
  function wrapped(i, r) {
    if (WRAPPER.test(i.name || '') || !(r.ingredients || []).some(function (x) { return WRAPPER.test(x.name || ''); })) return false;
    var mine = key(i.name).split(' '), t = (r.sections || []).map(function (sc) { return (sc.steps || []).join(' '); }).join(' ').toLowerCase(), m, re = /\bwrap(?:s|ped)?\s+(?:each|every|all|the|a|an)?\s*([a-z]+)/g;
    while ((m = re.exec(t))) if (mine.indexOf(stem(m[1])) >= 0) return true;
    return false;
  }
  // what shows on a dish's plate (Check asks the same, js/draw.js plateIngs())
  function shown(i, r) { return !hidden(i) && !cookedIn(i) && !(r && wrapped(i, r)); }

  /* ---------- learned matches (book/matches, the head chef's picks) ---------- */
  /* One getDoc when the editor opens. A read that failed (no signal) is not taken as "no picks" for the rest of the page
     (28 Oct 2026): the picks taught since stay, and the next Draw it for me, or the next drawing on save, reads again
     (one read, only after a failure). */
  var learned = null, learnP = null, learnIn = false;   // learnIn: read from the server at least once on this page
  function loadLearned() {
    if (learnP) return learnP;
    var api = B();
    learnP = api.ready().then(function () { return api.fs().getDoc(api.docRef('book', 'matches')); }).then(function (sn) {
      var m = sn.exists() && sn.data().m && typeof sn.data().m === 'object' ? sn.data().m : {};
      learned = Object.assign({}, m, pending); learnIn = true;   // a pick taught here and not saved yet stays
    }, function () { learnP = null; });
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
  var WEAK = { loin: 1, pod: 1, heart: 1, guajillo: 1, ancho: 1, serrano: 1, pasilla: 1, chipotl: 1, poblano: 1, habanero: 1, mix: 1, shell: 1, lid: 1, wrapper: 1, dough: 1, base: 1, filling: 1, topper: 1, batter: 0, portion: 1, serve: 1, selection: 1 };
  // words that say how it is cut, cooked or bought: a piece without them still fits
  var DESC = {}; ['crispy', 'shortcut', 'light', 'oven', 'texas', 'smok', 'roast', 'toast', 'charr', 'season', 'kid', 'vegan', 'dairy', 'free', 'double', 'chunky', 'continental', 'julienn', 'shredd', 'grat', 'dic', 'slic', 'shav', 'baby', 'small', 'large', 'mini', 'american', 'korean', 'southern', 'style', 'hot', 'cold', 'warm', 'new', 'classic', 'plain', 'whole', 'half', 'thick', 'thin', 'red', 'green', 'white', 'king', 'vege', 'veg', 'vegetarian', 'gluten', 'gf',
    // chillies by their kind, fish by where they swim: a sliced chilli or a fish fillet still fits
    'serrano', 'poblano', 'habanero', 'thai', 'birdseye', 'bird', 'chipotle', 'ancho', 'guajillo', 'pasilla', 'anaheim', 'fresno', 'jalapeno', 'dried', 'skinless', 'boneless', 'skin', 'on', 'seedless', 'unsalted', 'salted', 'peeled', 'raw', 'cooked', 'curly', 'tuscan', 'golden', 'portobello'].forEach(function (w) { DESC[stem(w)] = 1; });
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
  var SYN = { 'sweet pepper': 'capsicum strips', 'sweet peppers': 'capsicum strips', 'bell pepper': 'capsicum strips', 'bell peppers': 'capsicum strips', 'peppadew peppers': 'capsicum strips', 'sweet paprika': 'cayenne dusting', 'hot paprika': 'cayenne dusting', 'roasted red peppers': 'capsicum strips', 'roasted red pepper': 'capsicum strips', 'red peppers': 'capsicum strips', 'roasted peppers': 'capsicum strips', 'unsalted butter': 'butter pat', 'salted butter': 'butter pat', 'bacon slices': 'bacon', 'bacon strips': 'bacon', 'bacon rashers': 'bacon', 'streaky bacon': 'bacon', 'jalapeno pepper': 'jalapeno slices', 'jalapeno peppers': 'jalapeno slices', 'banana peppers': 'banana pepper rings', 'portobello mushrooms': 'field mushroom', 'portobello caps': 'field mushroom', riblet: 'pork ribs', 'pork riblet': 'pork ribs', salad: 'garden salad', butter: 'butter pat', garnish: 'micro herbs', 'green garnish': 'micro herbs', 'side sauce': 'sauce ramekin', sauce: 'sauce ramekin', 'side salad': 'garden salad', mesclun: 'mixed leaves', 'green bowl': 'mixed leaves' };
  var SYN_K = {}; Object.keys(SYN).forEach(function (x) { SYN_K[key(x)] = SYN[x]; });
  // names that are one thing although they say "and"
  var ONE = /\b(bread and butter|salt and pepper|mac and cheese|fish and chips|sweet and sour|surf and turf|bangers and mash|pie and peas|shell and lid)\b/i;
  // the recipe's words for a shape; a wave across the plate and oil round it added 15 Nov 2026
  var FORMW = [[/wav|squiggl/, ['line']], [/zigzag/, ['drizzle']], [/\bacross\b/, ['line', 'swoosh', 'smear']], [/\b(a)?round\b/, ['dots']], [/swoosh|swoop|swipe|smear/, ['swoosh', 'smear']], [/drizzl/, ['drizzle']], [/\bdots?\b/, ['dots']], [/quenelle/, ['quenelle']], [/\bpool|puddle|ladle/, ['pool']], [/scatter|sprinkl/, ['scatter']], [/ramekin|on the side|in a pot/, ['bowlful']]];
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
    // a name that ends in a sauce word is a sauce, not a main or a side of pasta ("Basil pesto" is not fusilli pesto)
    if (/\b(sauce|jus|gravy|aioli|mayo|dressing|relish|ketchup|chutney|salsa|pesto|glaze|syrup|coulis|puree|dip)$/.test(plain(i.name))) best.forEach(function (x) { var it = LIB.get(x.id); if (it && /^(main|starch)$/.test(it.role)) x.s -= 0.3; });
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
    var cap = function (t) { t = t.trim(); return t.charAt(0).toUpperCase() + t.slice(1); };
    if (a.conf >= 0.8 && b.conf >= 0.8 && a.id !== b.id) return [Object.assign({}, i, { name: cap(m[1]), whole: i.name }), Object.assign({}, i, { name: cap(m[2]), whole: i.name })];
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
    // the size of the book's own boards (about 36 cm across on the editor's scale; 50 before 15 Nov 2026)
    if (/board|platter|share|grazing/.test(nm)) return { fam: 'board', shape: 'rect', size: 36, tone: 'medium', finish: 'straight', edge: 'rounded' };
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
     x and y from -1 to 1 (y below 0 is the back of the plate, away from the guest). Measured from the book's own 76 plates
     (15 Nov 2026): the protein at the back left, the chips at the front left, the salad or veg at the front right, a sauce
     of choice in a ramekin at about 2 o'clock; a lone main in the middle. cap: the biggest part's share of the food area
     at most (a schnitzel does not fill a pub plate). */
  var STYLES = {
    clock: { name: 'Classic', main: [-0.06, -0.08], starch: [-0.52, 0.42], veg: [0.08, 0.5], salad: [0.52, 0.42], sidedish: [0.52, 0.42], ramekin: [0.66, -0.38], bread: [-0.52, 0.3], dessert: [0, 0], dside: [0.45, 0.2], cap: 0.44 },
    pub: { name: 'Pub split', main: [-0.15, -0.35], starch: [-0.55, 0.45], salad: [0.6, 0.45], veg: [0.6, 0.45], sidedish: [0.6, 0.45], ramekin: [0.7, -0.27], bread: [-0.55, 0.3], dessert: [0, 0], dside: [0.45, 0.2], cap: 0.32 },
    bed: { name: 'On a bed', starch: [-0.18, 0.08], main: [-0.18, -0.05], veg: [0.56, 0.33], salad: [0.56, 0.33], sidedish: [0.56, 0.33], ramekin: [0.62, -0.42], bread: [-0.5, -0.4], dessert: [0, 0], dside: [0.45, 0.2], cap: 0.44 },
    side: { name: 'Side by side', main: [0.31, -0.35], bread: [0.31, -0.35], starch: [-0.53, 0.39], salad: [0.1, 0.55], veg: [0.1, 0.55], sidedish: [0.1, 0.55], ramekin: [0.6, 0.55], dessert: [0, 0], dside: [0.45, 0.2], cap: 0.47 },
    stack: { name: 'Stacked', starch: [0, 0.02], main: [0, 0], veg: [0.5, 0.3], salad: [-0.5, -0.3], sidedish: [0.6, 0.4], ramekin: [0.62, -0.42], bread: [-0.55, 0.3], dessert: [0, 0], dside: [0.45, 0.2], cap: 0.44 },
    grill: { name: 'Mixed grill', main: [-0.3, 0.25], starch: [0.4, -0.3], salad: [-0.35, -0.35], veg: [0.4, 0.35], sidedish: [0.62, 0.05], ramekin: [0.62, -0.42], bread: [0, -0.55], dessert: [0, 0], dside: [0.45, 0.2], cap: 0.4 },
    board: { name: 'Share board', pack: true, cap: 0.16 },
    bowl: { name: 'Bowl', bowl: true },
    dessert: { name: 'Dessert', dessert: [-0.06, 0.02], dside: [0.58, 0.38], main: [-0.06, 0.02], starch: [0.45, -0.35], veg: [0.45, -0.35], salad: [0.45, -0.35], sidedish: [0.45, -0.35], ramekin: [0.62, -0.42], bread: [-0.5, -0.3], cap: 0.4 },
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
    // a main on its mash, purée or rice (the chicken adobo on its rice, 15 Nov 2026)
    if (has(/mash|puree|polenta|risotto|\brice\b|noodle/) && roles.main) return 'bed';
    if (/parm|schnit|fish (and|&) chips/.test(nm)) return 'pub';
    return 'clock';
  }

  /* ---------- drawn from its recipe card (js/compose.js) ---------- */
  function C() { return window.LK_COMPOSE; }
  // the part an ingredient's own card makes (the Cowboy candy, the slaw, the mushroom sauce), or null
  function cardPart(i, r, m) { return C() ? C().partFor(i, r, m) : null; }
  // a part of the drawing as the layout sees it: the library piece, or a piece drawn from its recipe (its role kept on it)
  function itemOfEl(e) { return e.t === 'item' ? LIB.get(e.a.split('@')[0]) : e.t === 'raw' && e.role ? { role: e.role } : null; }

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
    var out = [], unsure = [], also = {}, used = {}, parmy = /parm|schnit/i.test(r.name), toppers = [], coats = [], made = [];
    /* A card written for a whole batch (its yield says Batch, or a line is 1 kg or more, as the chicken adobo's 2.5 kg):
       its amounts are not one plate's, so only a line marked per plate sizes its part (15 Nov 2026) */
    var batch = /\bbatch\b/i.test(String(r.yield || '')) || (r.ingredients || []).some(function (i) { var am = DR.amount(i.q); return !!(am && am.g >= 1000); });
    var qOf = function (i) { return !batch || /\bper (plate|serve|portion|bowl|board)\b/i.test((i.q || '') + ' ' + (i.note || '')) ? i.q : ''; };
    var fold = function (name, into) { also[name] = into.ing; (into.also = into.also || []).push(name); };
    (r.ingredients || []).forEach(function (i0) {
      split(i0).forEach(function (i) {
        if (hidden(i) || cookedIn(i) || wrapped(i, r)) return;
        // a parmy topper ("French parmi topper"): drawn from its card, or from its note while the card is to come
        // (js/compose.js topper()), on the schnitzel; else the schnitzel becomes that parmy, the topper drawn with it
        if (/topper/i.test(i.name)) {
          var tm = matchIng(i, r), tp = tm.why === 'learned' ? null : cardPart(i, r, tm);
          if (tp) { made.push({ ing: R.ingName(i), from: tp.from, note: !!tp.own }); out.push({ ing: R.ingName(i), i: i, id: tp.id, it: tp, scale: 1, count: 1, conf: 0.9, guesses: [] }); return; }
          var tk = rank(String(i.name).replace(/\btopper\b/i, ' ').replace(/\bparmi\b/i, ' ') + ' parmy', { cat: 'meat' })[0];
          if (tk && tk.s >= 0.6 && /parm/i.test(LIB.get(tk.id).name)) { toppers.push({ ing: R.ingName(i), id: tk.id }); return; }
        }
        var c = coatOf(i); if (c) { coats.push({ ing: R.ingName(i), cook: c }); return; }
        var m = matchIng(i, r), name = R.ingName(i);
        // its own card says what it is made of and how it is prepped: drawn from that (a pick the head chef made still wins)
        var mk = cardPart(i, r, m);
        // no amount on the dish's line ("[Qty]"): the card's own grams per plate, when it says (the slaw's 150 g)
        if (mk) { made.push({ ing: name, from: mk.from }); out.push({ ing: name, i: i, id: mk.id, it: mk, scale: DR.scaleFor(mk, DR.amount(qOf(i)) ? qOf(i) : mk.per ? mk.per + ' g' : ''), count: 1, conf: 0.9, guesses: m.guesses || [] }); return; }
        // no card, but the dish cuts or cooks it its own way ("Broccolini (charred)"): the piece in that state
        var dp = C() && C().dress(i, r, m);
        if (dp) { m = { id: dp.id, conf: m.conf, guesses: m.guesses, it: dp }; }
        if (!m.id || m.conf < 0.6) { unsure.push({ ing: name, guesses: m.id ? m.guesses : [] }); return; }
        // two ingredients for the same piece (the pie mix and the pie case, smoked or oven brisket): one part, both named
        if (used[m.id]) { fold(name, used[m.id]); return; }
        var it = m.it || LIB.get(m.id), part = { ing: name, i: i, id: m.id, it: it, scale: DR.scaleFor(it, qOf(i)), count: countOf(it, qOf(i)), conf: m.conf, guesses: m.guesses };
        // a sauce never floods the plate (a garnish is sized to its main when the plate is laid out, 15 Nov 2026)
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
      // no fish or meat to coat (the mac and cheese's panko crumbs): named on the biggest part, where they are on top
      if (!host) { var top = out.filter(function (p) { return !RIDER[p.it.role]; })[0]; if (top) fold(c.ing, top); return; }
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
      // drawn from its own layers (js/compose.js): the bun on top, what is in it peeking out
      var st = C() && C().stack ? C().stack(r, host.ing + ' ' + (host.i && host.i.note || ''), host.also || [], bg.it.id) : null;
      if (st) { host.id = st.id; host.it = st; }
      out = keep;
    }
    return { parts: out, unsure: unsure, also: also, made: made };
  }
  function idxIn(r, name) { return (r.ingredients || []).map(R.ingName).indexOf(name); }
  function countOf(it, q) { var a = DR.amount(q); return a && a.n && it && it.n ? Math.max(1, Math.min(12, Math.round(a.n / it.n))) : 1; }

  /* ---------- the solver ---------- */
  function areaOf(surf) { var s = LIB.surface(surf); return s.area; }
  function sizeEl(el) { var b = R.bbox(el); return [b[2] - b[0], b[3] - b[1]]; }
  var RIDER = { sauce: 1, dsauce: 1, topping: 1, garnish: 1 };
  function riderEl(e) { var it = itemOfEl(e); return !it || !!RIDER[it.role] || !!e._on; }
  // a part's centre back on the servingware: it may hang 15% over the rim, as the book's own plates do
  function clampEl(e, a, k) {
    var o = R.oval(e), rx = Math.max(4, a.rx - R.reach(o, 1, 0) * (k == null ? 0.85 : k)), ry = Math.max(4, a.ry - R.reach(o, 0, 1) * (k == null ? 0.85 : k)), dx = (o.x - a.cx) / rx, dy = (o.y - a.cy) / ry, nx = o.x, ny = o.y;
    if (a.shape === 'box') { nx = a.cx + Math.max(-1, Math.min(1, dx)) * rx; ny = a.cy + Math.max(-1, Math.min(1, dy)) * ry; }
    else { var kk = Math.hypot(dx, dy); if (kk > 1) { nx = a.cx + dx / kk * rx; ny = a.cy + dy / kk * ry; } }
    e.x += nx - o.x; e.y += ny - o.y;
  }
  /* Parts that would overlap are pushed apart until they only touch, and every part stays on the servingware. A part is
     an oval (js/draw.js render.oval), so two touch when their centres are their two reaches apart (15 Nov 2026; before, 0.42
     of the short sides, so long parts lay over each other). A main on its bed moves with the bed and is never pushed off
     it (_bed); a bowl's toppings lie over its base (_over) and may touch each other (_loose); copies of one part on a board
     may overlap a little (_grp). Parts that stay where they are (moved by hand, kept) still push the others. Sauces,
     toppings and garnish ride on their part and are not pushed. */
  function solve(els, a, keep) {
    var all = els.filter(function (e) { return !riderEl(e); }), root = function (e) { return e._bed || e; }, still = function (e) { return !!e._still || !!(keep && e.fixed); };
    var sync = function () { all.forEach(function (e) { if (e._bed) { e.x = e._bed.x + e._bo[0]; e.y = e._bed.y + e._bo[1]; } }); };
    for (var iter = 0; iter < 80; iter++) {
      var moved = 0;
      for (var x = 0; x < all.length; x++) {
        for (var y = x + 1; y < all.length; y++) {
          var A = all[x], Bb = all[y], ra = root(A), rb = root(Bb);
          if (ra === rb || A._over === Bb || Bb._over === A || (A._over && A._over === Bb._bed) || (Bb._over && Bb._over === A._bed)) continue;
          var ma = !still(ra), mb = !still(rb);
          if (!ma && !mb) continue;
          var oa = R.oval(A), ob = R.oval(Bb), dx = ob.x - oa.x, dy = ob.y - oa.y, dd = Math.hypot(dx, dy);
          // two parts on the same spot: apart along a fixed direction, so the same plate always comes out the same
          if (dd < 0.01) { dx = 1; dy = (y - x) % 2 ? 0.5 : -0.5; dd = Math.hypot(dx, dy); }
          // on a board the pieces are slabs (brisket slices, a pizza): kept a little further apart, as their corners fill the box
          var ux = dx / dd, uy = dy / dd, k = A._grp && A._grp === Bb._grp ? 0.65 : A._loose && Bb._loose ? 0.85 : a.shape === 'box' ? 1.12 : 0.97, need = (R.reach(oa, ux, uy) + R.reach(ob, ux, uy)) * k + 2;
          if (dd >= need) continue;
          var push = (need - dd) * 0.6, ka = ma && mb ? 0.5 : ma ? 1 : 0, kb = ma && mb ? 0.5 : mb ? 1 : 0;
          ra.x -= ux * push * ka; ra.y -= uy * push * ka; rb.x += ux * push * kb; rb.y += uy * push * kb;
          sync(); moved++;
        }
      }
      all.forEach(function (e) { if (!e._bed && !still(e)) clampEl(e, a); });
      sync();
      if (!moved) break;
    }
    els.forEach(function (e) { if (e.x != null && !e._still) { e.x = n1(e.x); e.y = n1(e.y); } });
  }
  /* The solver as it was before 15 Nov 2026, for a batch recipe's GN pan only: no pan drawing changes. */
  function solvePan(els, a, keep) {
    var LAY = { sauce: 0, dsauce: 0, topping: 3, garnish: 4 };
    var movers = els.filter(function (e) { var it = itemOfEl(e); return it && LAY[it.role] === undefined && !(keep && e.fixed); });
    var all = els.filter(function (e) { var it = itemOfEl(e); return it && LAY[it.role] === undefined; });
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
      movers.forEach(function (e) {
        var s = sizeEl(e), rx = Math.max(4, a.rx - s[0] * 0.42), ry = Math.max(4, a.ry - s[1] * 0.42), dx = (e.x - a.cx) / rx, dy = (e.y - a.cy) / ry;
        if (a.shape === 'box') { e.x = a.cx + Math.max(-1, Math.min(1, dx)) * rx; e.y = a.cy + Math.max(-1, Math.min(1, dy)) * ry; }
        else { var k = Math.hypot(dx, dy); if (k > 1) { e.x = a.cx + dx / k * rx; e.y = a.cy + dy / k * ry; } }
      });
      if (!moved) break;
    }
    els.forEach(function (e) { if (e.x != null) { e.x = n1(e.x); e.y = n1(e.y); } });
  }
  // a part's place for its role in the style, on the servingware (mirrored left to right for Try another)
  function spot(style, role, a, k, tv) {
    var S = STYLES[style], p = S[role] || S.veg || [0, 0];
    return [a.cx + (tv && tv.m ? -p[0] : p[0]) * a.rx + (k || 0) * 8 * (tv && tv.m ? -1 : 1), a.cy + p[1] * a.ry + (k || 0) * 6];
  }
  // how a layout is turned for a seed: odd seeds are the mirror image (a bowl is never mirrored)
  function tvFor(style, seed) { return { m: seed % 2 === 1 && style !== 'bowl' && style !== 'pan' }; }
  var LAYER = { sauce: 0, dsauce: 0, starch: 1, bread: 1, veg: 1, salad: 1, sidedish: 1, main: 2, dessert: 2, dside: 2, topping: 3, garnish: 4 };
  function layEl(e) { if (e._on) return 3; var it = itemOfEl(e); return it && LAYER[it.role] != null ? LAYER[it.role] : 2; }
  // one element for each copy of a part: its piece, place, size and turn, its label and what is drawn inside it
  function elsFor(d, r, p, at, rot, o) {
    o = o || {};
    var it = p.it, out = [], k2 = it.raw ? it.key : it.id + '@' + it.v, col = p.ram ? p.ram.col : !it.raw && /sauce/.test(it.role) ? LIB.sauceColour(p.ing) : '';
    d.defs[k2] = it.raw ? it.body : LIB.body(it.id);
    for (var c = 0; c < p.count; c++) {
      var dx = 0, dy = 0, dr = 0;
      if (p.count > 1 && o.row) { dx = (c - (p.count - 1) / 2) * it.w * p.scale * 0.6; dr = (c - (p.count - 1) / 2) * 8; }
      else if (p.count > 1) { var ang = c / p.count * Math.PI * 2 + (o.rnd ? o.rnd() * 0.5 : 0), rr = Math.min(Math.max(it.w, it.h) * p.scale * 0.5, o.ring || Infinity); dx = Math.cos(ang) * rr; dy = Math.sin(ang) * rr * 0.7; dr = o.rnd ? o.rnd() * 50 - 25 : 0; }
      var el = { t: 'item', a: k2, x: n1(at[0] + dx), y: n1(at[1] + dy), sx: n1(p.scale * 100) / 100, sy: n1((p.sy || p.scale) * 100) / 100, r: Math.round(rot + dr), ing: p.ing };
      if (it.raw) { el.t = 'raw'; el.bx = it.box.map(n1).join(' '); el.role = it.role; if (it.made) { el.made = it.made; el.ms = it.ms; } if (it.dr) { el.dr = it.dr; el.ck = it.cook; } }
      // a sauce in a ramekin keeps the card it is drawn from, so a change to the card still draws the dish again
      if (p.ram && p.ram.made) { el.made = p.ram.made; el.ms = p.ram.ms; }
      var ii = idxIn(r, p.ing); if (ii < 0 && p.i && p.i.whole) ii = idxIn(r, R.ingName({ name: p.i.whole })); if (ii >= 0) el.ii = ii;
      if (p.also && p.also.length) { el.also = p.also.join('|').slice(0, 400); el.ai = p.also.map(function (x) { return idxIn(r, x); }).join('|'); }
      if (col && it.side && it.side.c) el.cm = R.tintMap(d.defs[k2], it.side.c, col);
      if (o.host) { el._h = o.host; el._o = [el.x - o.host.x, el.y - o.host.y]; }
      if (o.on || p.on) el._on = 1;
      if (o.grp) el._grp = o.grp;
      out.push(el);
    }
    return out;
  }
  /* A batch recipe in its GN pan: the main thing fills the pan, the rest scattered over it. Laid out exactly as before 15
     Nov 2026 (the same random steps in the same order), so no pan drawing changes. */
  function layoutPan(d, r, parts, seed) {
    var rnd = LIB.P.rng('layout:' + d.rid + ':' + seed), a = areaOf(d.surf), els = [];
    var order = parts.slice().sort(function (x, y) { return (y.it.w * y.it.h * y.scale * y.scale) - (x.it.w * x.it.h * x.scale * x.scale); });
    var place = function (p, at, rot) {
      p.placed = true;
      var it = p.it, k2 = it.raw ? it.key : it.id + '@' + it.v, col = !it.raw && /sauce/.test(p.it.role) ? LIB.sauceColour(p.ing) : '';
      d.defs[k2] = it.raw ? it.body : LIB.body(it.id);
      for (var c = 0; c < p.count; c++) {
        var ang = p.count > 1 ? c / p.count * Math.PI * 2 + rnd() * 0.5 : 0, rr = p.count > 1 ? Math.max(it.w, it.h) * p.scale * 0.5 : 0;
        var el = { t: 'item', a: k2, x: n1(at[0] + Math.cos(ang) * rr), y: n1(at[1] + Math.sin(ang) * rr * 0.7), sx: n1(p.scale * 100) / 100, sy: n1(p.scale * 100) / 100, r: Math.round(rot + (p.count > 1 ? rnd() * 50 - 25 : 0)), ing: p.ing };
        if (it.raw) { el.t = 'raw'; el.bx = it.box.map(n1).join(' '); el.role = it.role; if (it.made) { el.made = it.made; el.ms = it.ms; } if (it.dr) { el.dr = it.dr; el.ck = it.cook; } }
        var ii = idxIn(r, p.ing); if (ii < 0 && p.i && p.i.whole) ii = idxIn(r, R.ingName({ name: p.i.whole })); if (ii >= 0) el.ii = ii;
        if (p.also && p.also.length) { el.also = p.also.join('|').slice(0, 400); el.ai = p.also.map(function (x) { return idxIn(r, x); }).join('|'); }
        if (col && it.side && it.side.c) el.cm = R.tintMap(d.defs[k2], it.side.c, col);
        els.push(el);
      }
    };
    var big = order[0];
    if (big) { var fit = Math.min(a.rx * 1.8 / big.it.w, a.ry * 1.8 / big.it.h, 2.6); big.scale = Math.max(big.scale, fit); place(big, [a.cx, a.cy], 0); }
    order.slice(1).forEach(function (p) { var q = LIB.P.inEllipse(rnd, a.rx * 0.6, a.ry * 0.6); place(p, [a.cx + q[0], a.cy + q[1]], rnd() * 60 - 30); });
    els.forEach(function (e, k) { e._k = k; });
    els.sort(function (x, y) { return (layEl(x) - layEl(y)) || (x._k - y._k); });
    solvePan(els, a, false);
    els.forEach(function (e) { delete e._k; });
    return els;
  }

  /* ---------- the plate's layout, measured from the book's own plates (15 Nov 2026) ---------- */
  // a sauce the recipe serves on the side, or a dip that comes with fried food: in a ramekin, as the book draws every one
  var SIDE_W = /on the side|side sauce|\bramekin|sauce of choice|\bchoice\b|\bchoose\b|\bguests?\b|in a (small )?pot\b/;
  var ON_W = /\b(over|on top|under|underneath|drizzl\w*|spoon\w* over|pour\w* over|smother\w*|across|swoop\w*|swoosh\w*|smear\w*|squiggl\w*|wav\w*)\b/;
  var DIP_W = /\b(aioli|mayo|mayonnaise|tartare|sour cream|sweet chilli|ketchup|tomato sauce|ranch|dip|relish|syrup)\b/;
  var FRIED_W = /chip|fries|wedge|batter|tempura|calamari|spring roll|nacho|donut|doughnut|fried|schnit|parm|crumbed|panko/;
  function sideSauce(p, style, dishT, small) {
    var it = p.it, t = (p.ing + ' ' + (p.i && p.i.note || '')).toLowerCase();
    var sauce = /sauce/.test(it.role) || (it.role === 'topping' && /\b(sauce|gravy|jus|aioli|mayo)\b/.test(t));
    if (!sauce || p.on || it.form === 'drizzle' || style === 'bowl' && small) return false;
    if (SIDE_W.test(t)) return true;
    if (ON_W.test(t)) return false;
    if ((style === 'pub' || style === 'side') && /\b(gravy|sauce|jus|aioli|mayo)\b/.test(t)) return true;
    return DIP_W.test(t) && FRIED_W.test(dishT);
  }
  // a sauce whose own words say it goes across the plate (a wave, a squiggle, a swoop), or round it in dots
  // a sauce whose own words say where it goes: over the main ("smothered over", "a thin zigzag over the gravy"), across
  // the whole plate (a wave, a squiggle, a swoop), or round it in dots ("drizzled round")
  function acrossOf(p) {
    if (!/sauce/.test(p.it.role)) return '';
    var t = (p.ing + ' ' + (p.i && p.i.note || '')).toLowerCase();
    if (/\bover\b|on top|smother|pour/.test(t)) return 'over';
    if (/wav|squiggl|across|swoop|swoosh|swipe/.test(t)) return 'across';
    if (/\b(a)?round\b/.test(t) && (/\bdots?\b|\boil\b|drizzl/.test(t) || p.it.form === 'dots')) return 'round';
    return '';
  }
  // two solid parts still lying over each other by more than a tenth of their reach (the solver could not part them)
  function crowded(els) {
    var all = els.filter(function (e) { return !riderEl(e) && (e.t === 'item' || e.t === 'raw'); });
    for (var x = 0; x < all.length; x++) for (var y = x + 1; y < all.length; y++) {
      var A = all[x], B = all[y];
      if ((A._bed || A) === (B._bed || B) || A._over === B || B._over === A || A._over && A._over === B._over || A._grp && A._grp === B._grp) continue;
      var oa = R.oval(A), ob = R.oval(B), dx = ob.x - oa.x, dy = ob.y - oa.y, dd = Math.hypot(dx, dy) || 0.01, ux = dx / dd, uy = dy / dd, ra = R.reach(oa, ux, uy), rb = R.reach(ob, ux, uy);
      if (dd < ra + rb - 0.2 * Math.min(ra, rb)) return true;
    }
    return false;
  }
  // the share of the food area a part covers at its size
  function areaShare(it, sc, a) { return Math.PI / 4 * it.w * it.h * sc * sc / (a.shape === 'box' ? 4 * a.rx * a.ry : Math.PI * a.rx * a.ry); }
  function ovalArea(e) { var o = R.oval(e); return Math.PI * o.a * o.b; }
  // a board's spots, biggest part first (box fractions, measured from the book's boards: the brisket at the back left,
  // the slaw at the back right, the fries in front), and its sauces in pots along the front right
  var BOARD = [[-0.48, -0.42], [0.48, -0.45], [-0.05, 0.38], [-0.62, 0.28], [0.08, -0.62], [0.25, 0.1], [-0.3, 0], [0.62, 0.05], [0.35, -0.15], [-0.15, -0.2], [0, 0.62], [-0.55, 0.62]];
  var POTS = [[0.72, 0.38], [0.52, 0.66], [0.3, 0.8], [0.8, 0.7]];
  /* Lays the parts out: each solid part on its spot for the style (the book's own), a main on its bed, sauces of choice
     and dips in ramekins, toppings and garnish on the main sized to it, sauces under it, a swoop or a wave across the
     plate; then the parts are sized so the food covers about as much of the plate as on the book's own plates, the food
     is put in the middle, and the solver pushes overlaps apart. Parts the head chef keeps (moved by hand or picked) stay
     where they are and the rest is laid out round them. */
  function layout(d, r, parts, style, seed, keep, tv) {
    if (style === 'pan') return layoutPan(d, r, parts, seed);
    var a = areaOf(d.surf), S0 = STYLES[style] || STYLES.clock, els = [], R0 = Math.sqrt(a.rx * a.ry), foodA = a.shape === 'box' ? 4 * a.rx * a.ry : Math.PI * a.rx * a.ry;
    tv = tv || tvFor(style, seed);
    var rng = function (p, k) { return LIB.P.rng('layout:' + d.rid + ':' + seed + ':' + p.ing + ':' + (k || 0)); };
    var still = (keep || []).filter(function (e) { return e.t === 'item' || e.t === 'raw'; });
    still.forEach(function (e) { e._still = 1; });
    var dishT = (r.name + ' ' + parts.map(function (p) { return p.ing + ' ' + p.it.name + ' ' + (p.it.cook || ''); }).join(' ')).toLowerCase(), small = d.surf && d.surf.size && d.surf.size < 20;
    var order = parts.slice().sort(function (x, y) { return (y.it.w * y.it.h * y.scale * y.scale) - (x.it.w * x.it.h * x.scale * x.scale); });
    var ramekin = LIB.get('sauce-ramekin');
    // the role each part plays here: a side sauce becomes a ramekin, a solid part on its own spot
    order.forEach(function (p) {
      p.role = p.on ? 'topping' : p.it.role;
      if (ramekin && (S0.pack && /sauce/.test(p.it.role) && !p.on || sideSauce(p, style, dishT, small))) {
        p.ram = { col: (p.it.raw && p.it.side && p.it.side.c) || LIB.sauceColour(p.ing), made: p.it.raw ? p.it.made : '', ms: p.it.raw ? p.it.ms : '' };
        p.it = ramekin; p.scale = 1; p.count = 1; p.role = 'ramekin';
      }
    });
    var solidP = order.filter(function (p) { return p.role === 'ramekin' || !RIDER[p.role]; });
    // at most 3 extra copies on a plate (a board shows every piece)
    if (!S0.pack) { var extra = 0; order.forEach(function (p) { if (p.count > 1) { var e2 = Math.max(0, Math.min(p.count - 1, 3 - extra)); p.count = 1 + e2; extra += e2; } }); }
    var hostEl = function () { var m = els.concat(still).filter(function (e) { var it = itemOfEl(e); return it && /^(main|dessert)$/.test(it.role) && !e._ram; }).sort(function (x, y) { return ovalArea(y) - ovalArea(x); })[0]; return m || els.filter(function (e) { return !riderEl(e) && !e._ram; }).sort(function (x, y) { return ovalArea(y) - ovalArea(x); })[0] || null; };
    var push = function (list) { list.forEach(function (e) { els.push(e); }); return list; }, boardFill = 0.4;

    if (S0.pack) {
      /* a board: every solid sized so together they cover what the book's boards do (a board of three, as the brisket
         board, about 30%; a full butcher's board about 45%), on the book's spots, copies fanned in a row */
      var bs = solidP.filter(function (p) { return p.role !== 'ramekin'; }), tot = 0;
      boardFill = Math.min(0.45, 0.24 + 0.025 * bs.length);
      bs.forEach(function (p) { tot += Math.PI / 4 * p.it.w * p.it.h * p.scale * p.scale * p.count; });
      var kb = tot ? Math.max(0.35, Math.min(2.2, Math.sqrt(boardFill * foodA / tot))) : 1;
      // a small board's few parts sit out towards its edges, as on the book's brisket board
      var spread = bs.length <= 4 ? 1.2 : 1;
      bs.forEach(function (p, k) {
        p.scale *= kb;
        // one part's copies (the taco board's tortillas) no more than a fifth of the board
        var shp = Math.PI / 4 * p.it.w * p.it.h * p.scale * p.scale * p.count / foodA; if (shp > 0.2) p.scale *= Math.sqrt(0.2 / shp);
        var s0 = BOARD[k % BOARD.length], at = [a.cx + (tv.m ? -s0[0] : s0[0]) * spread * a.rx + (k >= BOARD.length ? 10 : 0), a.cy + s0[1] * spread * a.ry];
        push(elsFor(d, r, p, at, Math.round(rng(p)() * 20 - 10), { row: true, grp: p.count > 1 ? p.ing : '' }));
      });
      solidP.filter(function (p) { return p.role === 'ramekin'; }).forEach(function (p, k) {
        var s0 = POTS[k % POTS.length]; push(elsFor(d, r, p, [a.cx + (tv.m ? -s0[0] : s0[0]) * a.rx, a.cy + s0[1] * a.ry], 0)).forEach(function (e) { e._ram = 1; });
      });
    } else if (S0.bowl) {
      // a bowl: the base heaped in the middle, a little towards the front left as the book's salads are, the rest
      // round it on top of the base, each a good share of the bowl
      var bOrder = solidP.filter(function (p) { return p.role !== 'ramekin'; }), sauceW = /\b(sauce|jus|gravy|aioli|mayo|dressing|relish|ketchup|chutney|salsa|pesto|glaze|syrup|coulis|puree|dip)$/;
      var base = bOrder.filter(function (p) { return /^(starch|salad|main)$/.test(p.it.role) && p.it.form === 'bowlful'; })[0] || bOrder.filter(function (p) { return p.it.role === 'starch' || p.it.role === 'salad'; })[0] ||
        (bOrder.length > 1 ? bOrder.filter(function (p) { return /^(salad|veg)$/.test(p.it.role) && !sauceW.test(plain(p.ing)); })[0] : null);
      if (!base && bOrder.length === 1) {
        // one thing in the bowl (the calamari topper's strips): it fills the bowl, not a corner of it
        base = bOrder[0]; base.scale = Math.min(a.rx * 1.6 / Math.max(base.it.w, base.it.h), 2.2);
        push(elsFor(d, r, base, [a.cx, a.cy], 0));
      } else if (base) {
        // big enough to fill the middle, never longer than the bowl is wide (a cos leaf stays inside the bowl)
        base.scale = Math.min(Math.max(base.scale, Math.min(2.4, Math.sqrt(0.38 * foodA / (Math.PI / 4 * base.it.w * base.it.h)) / Math.sqrt(base.count))), 1.6 * Math.min(a.rx, a.ry) / Math.max(base.it.w, base.it.h));
        var bels = push(elsFor(d, r, base, [a.cx - 0.085 * a.rx, a.cy + 0.085 * a.ry], 0, { rnd: rng(base) }));
        bels.forEach(function (e) { e._base = 1; });
      }
      var ring = bOrder.filter(function (p) { return p !== base; }), t0 = LIB.P.rng('layout:' + d.rid + ':' + seed + ':bowl')() * Math.PI * 2;
      ring.forEach(function (p, k) {
        var ang = -Math.PI / 2 + t0 + k / Math.max(1, ring.length) * Math.PI * 2, rr = Math.min(a.rx, a.ry) * (base ? 0.3 : 0.38);
        var sh = areaShare(p.it, p.scale, a) * p.count; if (sh < 0.06 || sh > 0.15) p.scale *= Math.sqrt(Math.max(0.06, Math.min(0.15, sh)) / Math.max(1e-6, sh));
        push(elsFor(d, r, p, [a.cx + Math.cos(ang) * rr, a.cy + Math.sin(ang) * rr], Math.round(rng(p)() * 40 - 20), { rnd: rng(p, 1) })).forEach(function (e) { if (base) e._over = els.filter(function (b) { return b._base; })[0]; e._loose = 1; });
      });
      // a side sauce in a ramekin on the rim at about 2 o'clock
      solidP.filter(function (p) { return p.role === 'ramekin'; }).forEach(function (p, k) { var ang = -Math.PI / 3 + k * 0.6; push(elsFor(d, r, p, [a.cx + (tv.m ? -1 : 1) * Math.cos(ang) * a.rx * 0.75, a.cy + Math.sin(ang) * a.ry * 0.75], 0)).forEach(function (e) { e._ram = 1; }); });
    } else {
      // a plate: each solid part on its spot, the biggest first
      var byRole = {}, bedStyle = style === 'bed' || style === 'stack';
      var bedP = bedStyle ? solidP.filter(function (p) { return p.it.role === 'starch'; })[0] || solidP.filter(function (p) { return /^(veg|salad)$/.test(p.it.role) && /mash|pur|rice|polenta|risotto|greens|spinach|leaves|slaw|noodle/.test((p.ing + ' ' + p.it.name).toLowerCase()); })[0] : null;
      var rideP = bedP ? solidP.filter(function (p) { return p.it.role === 'main' && !/^(bowlful|pool)$/.test(p.it.form); })[0] : null;
      // a wave of purée across the plate: the bed sits in the middle of it, as on the book's pork belly
      var waveBed = bedP && parts.some(function (p) { return RIDER[p.role] && p.it.form === 'line' && acrossOf(p) === 'across'; });
      solidP.forEach(function (p) {
        if (p === rideP) return;
        var role = p.role === 'ramekin' ? 'ramekin' : p.role, k = byRole[role] = (byRole[role] || 0) + 1, at = p === bedP && waveBed ? [a.cx, a.cy - 0.04 * a.ry] : spot(style, role === 'ramekin' ? 'ramekin' : p === bedP ? 'starch' : role, a, k - 1, tv);
        var list = push(elsFor(d, r, p, at, role === 'main' || role === 'dessert' ? Math.round(rng(p)() * 20 - 10) : role === 'ramekin' ? 0 : Math.round(rng(p)() * 40 - 20), { rnd: rng(p, 1) }));
        if (role === 'ramekin') list.forEach(function (e) { e._ram = 1; });
        if (p === bedP) list.forEach(function (e) { e._bedPart = 1; });
      });
      // the main on its bed (the pork on its mash, the chicken on its rice): it moves with the bed, slightly to the back
      if (rideP) {
        var bedEl = els.filter(function (e) { return e._bedPart; })[0], bo = R.oval(bedEl), n = rideP.count, one = rideP.count; rideP.count = 1;
        for (var c = 0; c < n; c++) {
          var ox = n > 1 ? (c / (n - 1) - 0.5) * 0.9 * bo.a : 0, oy = -0.22 * bo.b;
          push(elsFor(d, r, rideP, [bedEl.x + ox, bedEl.y + oy], Math.round(rng(rideP, c)() * 20 - 10))).forEach(function (e) { e._bed = bedEl; e._bo = [e.x - bedEl.x, e.y - bedEl.y]; });
        }
        rideP.count = one;
        // the bed shows round the main, as the book's mash and rice do: at least about 1.4 times the main's size
        var mainA = els.filter(function (e) { return e._bed === bedEl; }).reduce(function (t, e) { return t + ovalArea(e); }, 0), bedA = ovalArea(bedEl);
        if (mainA > 0.7 * bedA) { var kbd = Math.min(1.8, Math.sqrt(mainA / (0.7 * bedA))); bedEl.sx = n1(bedEl.sx * kbd * 100) / 100; bedEl.sy = n1(bedEl.sy * kbd * 100) / 100; }
      }
    }

    // what rides on the main: toppings stacked in the recipe's order, garnish spread over its back half, both sized to it;
    // a sauce under it, a dollop at its edge, a wave or a swoop across the plate, oil in dots round it
    var garn = [], hostA = 0;
    parts.forEach(function (p, k) {
      if (p.placed || p.role === 'ramekin' || !RIDER[p.role]) return;
      var h = hostEl(), role = p.role, how = acrossOf(p), rnd = rng(p, 2);
      p.placed = true;
      if (!h) { push(elsFor(d, r, p, [a.cx, a.cy], 0)); return; }
      var ho = R.oval(h), hs = sizeEl(h), Ah = Math.PI * ho.a * ho.b, A1 = Math.PI / 4 * p.it.w * p.it.h, off = (k % 3 - 1) * 4;
      hostA = Ah;
      if (role === 'topping') {
        // a parmy's napoli, ham and cheese cover the schnitzel; any other topping at most half of the main
        if (!p.on || !/parm|schnit/i.test(r.name)) p.scale = Math.min(p.scale, Math.sqrt(0.48 * Ah / (A1 * p.count)));
        push(elsFor(d, r, p, [h.x + off, h.y + off * 0.5], h.r || 0, { host: h, rnd: rnd, ring: Math.min(ho.a, ho.b) * 0.28 }));
      } else if (role === 'garnish') garn.push(p);
      else if (p.it.form === 'drizzle') { p.scale = Math.min(p.scale, hs[0] * 0.9 / p.it.w); p.on = true; push(elsFor(d, r, p, [h.x, h.y], -8, { host: h })); }
      // over the main, drawn on it: never more than half of it, so the main still shows
      else if (how === 'over') { p.scale = Math.min(p.scale, Math.sqrt(0.5 * Ah / A1)); p.on = true; push(elsFor(d, r, p, [h.x + off, h.y + off * 0.5], h.r || 0, { host: h })); }
      else if (how === 'across') {
        /* across the whole plate, as the book draws it: a wave of purée right across the middle with the mash on it (the
           pork belly), a swoop in front of the main with the main above its tail (the beef cheek) */
        var bed = els.filter(function (e) { return e._bedPart; })[0], line = p.it.form === 'line';
        p.scale = (line ? 0.92 : 0.85) * 2 * R0 / p.it.w; p.sy = line ? p.scale * 1.8 : p.scale;
        push(elsFor(d, r, p, line ? [a.cx, a.cy + 0.05 * R0] : [a.cx, a.cy + 0.22 * R0], line ? 0 : tv.m ? 8 : -8, line ? {} : { host: h })).forEach(function (e) { e._line = 1; if (tv.m && !line) e.flip = true; });
      } else if (how === 'round') {
        // drizzled round the plate: in dots in three places round the food
        [200, 320, 80].forEach(function (deg, j) { var q = Object.assign({}, p, { count: 1, scale: Math.min(p.scale, 0.6) }), t = (tv.m ? 180 - deg : deg) * Math.PI / 180; push(elsFor(d, r, q, [a.cx + Math.cos(t) * a.rx * 0.72, a.cy + Math.sin(t) * a.ry * 0.72], Math.round(rnd() * 60 - 30))).forEach(function (e) { e._line = 1; }); });
      }
      else if (style === 'dessert') push(elsFor(d, r, p, [h.x - hs[0] * 0.06, h.y + hs[1] * 0.14], -12, { host: h }));
      else if (/^(dollop|quenelle|scoop|bowlful)$/.test(p.it.form)) {
        // a dollop or a quenelle sits at the main's edge, towards the middle of the plate, drawn over it
        var ux = a.cx - h.x, uy = a.cy - h.y, ul = Math.hypot(ux, uy); if (ul < 4) { ux = tv.m ? -1 : 1; uy = 0; ul = 1; }
        var t2 = -35 * Math.PI / 180, vx = (ux * Math.cos(t2) - uy * Math.sin(t2)) / ul, vy = (ux * Math.sin(t2) + uy * Math.cos(t2)) / ul, rch = R.reach(ho, vx, vy) * 0.85;
        p.scale = Math.min(p.scale, Math.sqrt(0.5 * Ah / A1)); p.on = true;
        push(elsFor(d, r, p, [h.x + vx * rch, h.y + vy * rch], 0, { host: h }));
      }
      // a swoosh or smear the recipe does not ask to go across: under the main, no longer than it (not a stick out of it)
      // (a library swoosh is drawn as a pool there: under a main a long swoosh reads as a stick, 15 Nov 2026)
      else if (/^(swoosh|smear|line)$/.test(p.it.form)) { if (!p.it.raw && LIB.get('sauce-pool')) { p.it = LIB.get('sauce-pool'); A1 = Math.PI / 4 * p.it.w * p.it.h; } p.scale = Math.min(p.scale, Math.sqrt(0.6 * Ah / A1), 1.8 * Math.max(ho.a, ho.b) / p.it.w); push(elsFor(d, r, p, [h.x, h.y + ho.b * 0.1], (h.r || 0) + (tv.m ? 8 : -8), { host: h })); }
      // any other sauce: under the main, never bigger than most of it, so it reads as under the main
      else { p.scale = Math.min(p.scale, Math.sqrt(0.6 * Ah / A1)); push(elsFor(d, r, p, [h.x + hs[0] * 0.05, h.y + hs[1] * 0.08], 0, { host: h })); }
    });
    // garnish: all together at most about 0.36 of the main, each at its own place over the main's back half
    if (garn.length) {
      var h0 = hostEl(), go = R.oval(h0), GA = Math.PI * go.a * go.b;
      garn.forEach(function (p, j) {
        var A1 = Math.PI / 4 * p.it.w * p.it.h, phi = (-100 + j * 140 / Math.max(1, garn.length - 1)) * Math.PI / 180, lx = 0.22 * go.a * Math.cos(phi), ly = 0.22 * go.b * Math.sin(phi);
        p.scale = Math.max(0.35, Math.min(p.scale, Math.sqrt(0.36 * GA / (garn.length * A1 * p.count))));
        push(elsFor(d, r, p, [go.x + lx * Math.cos(go.t) - ly * Math.sin(go.t), go.y + lx * Math.sin(go.t) + ly * Math.cos(go.t)], Math.round(rng(p, 3)() * 60 - 30), { host: h0, rnd: rng(p, 4), ring: Math.min(go.a, go.b) * 0.18 }));
      });
    }
    // garnish and toppings on the main together at most 0.6 of it (a parmy's own toppers apart)
    var hostNow = hostEl();
    if (hostNow && !/parm|schnit/i.test(r.name)) {
      var Ah2 = ovalArea(hostNow), onIt = els.filter(function (e) { var it = itemOfEl(e); return e._h === hostNow && it && /^(topping|garnish)$/.test(it.role); }), sum = 0;
      onIt.forEach(function (e) { sum += ovalArea(e); });
      if (sum > 0.6 * Ah2) { var kk = Math.sqrt(0.6 * Ah2 / sum); onIt.forEach(function (e) { e.sx = n1(e.sx * kk * 100) / 100; e.sy = n1(e.sy * kk * 100) / 100; }); }
    }

    /* Sized and centred like the book's own plates: the food covers about 40% of a plate (27 to 55%), 30 to 50% of a
       board; the biggest part no more than the style's share; the middle of the food in the middle of the plate. Ramekins,
       kept parts and a wave across the plate keep their size. */
    var solidEls = function () { return els.filter(function (e) { return !riderEl(e); }); };
    // a bowl's base is sized to the bowl already (the one thing that fills a side bowl, the caesar's cos)
    var growable = function (e) { return !e._ram && !e._line && !e._base; };
    /* a lone main (a beef cheek, wings) covers less of its plate in the book than a full pub plate does, and a main on a
       sweep of purée stays small, so the sweep shows (the book's beef cheek: about 13% of the plate) */
    var nSolid = els.filter(function (e) { return !riderEl(e) && !e._ram; }).length, swept = els.some(function (e) { return e._line; });
    var band = S0.pack ? [0.22, 0.50] : swept && nSolid <= 2 ? [0.12, 0.35] : swept ? [0.18, 0.40] : nSolid <= 2 ? [0.32, 0.50] : [0.27, 0.55], mid = S0.pack ? boardFill : swept && nSolid <= 2 ? 0.18 : swept ? 0.28 : nSolid <= 2 ? 0.40 : 0.40, cap = swept ? Math.min(S0.cap || 1, 0.15) : S0.cap;
    var scaleAll = function (k) {
      els.forEach(function (e) {
        if (!growable(e)) return;
        e.sx = n1(e.sx * k * 100) / 100; e.sy = n1(e.sy * k * 100) / 100;
        if (e._h) { e._o = [e._o[0] * k, e._o[1] * k]; }
        if (e._bed) { e._bo = [e._bo[0] * k, e._bo[1] * k]; }
      });
    };
    var follow = function () { els.forEach(function (e) { if (e._h) { e.x = e._h.x + e._o[0]; e.y = e._h.y + e._o[1]; } if (e._bed) { e.x = e._bed.x + e._bo[0]; e.y = e._bed.y + e._bo[1]; } }); };
    // a wave or a swoop is a thin stroke across its box: it is not counted as food when sizing and centring
    var food = function () { return els.filter(function (e) { return !e._line; }).concat(still); };
    for (var pass = 0; pass < 3; pass++) {
      var cv = R.cover(food(), a);
      if (cv.cov && (cv.cov < band[0] || cv.cov > band[1])) scaleAll(Math.max(0.7, Math.min(1.45, Math.sqrt(mid / cv.cov))));
      // the biggest part no bigger than the style allows (a schnitzel does not fill the plate)
      // (on a plate with a sweep across it the bed counts too, so the sweep shows either side of it)
      var big = solidEls().filter(function (e) { return growable(e) && (swept || !e._bedPart) && !e._base && !e._bed; }).sort(function (x, y) { return ovalArea(y) - ovalArea(x); })[0];
      if (big && cap) {
        var sh = ovalArea(big) / foodA;
        if (sh > cap) { var kc = Math.sqrt(cap / sh); [big].concat(els.filter(function (e) { return e._h === big || e._bed === big; })).forEach(function (e) { e.sx = n1(e.sx * kc * 100) / 100; e.sy = n1(e.sy * kc * 100) / 100; if (e._h === big) e._o = [e._o[0] * kc, e._o[1] * kc]; if (e._bed === big) e._bo = [e._bo[0] * kc, e._bo[1] * kc]; }); }
      }
      follow(); solve(els.concat(still), a, false); follow();
      // the middle of the food in the middle of the servingware
      var cv2 = R.cover(food(), a), ox2 = cv2.cx - a.cx, oy2 = cv2.cy - a.cy;
      if (Math.hypot(ox2 / a.rx, oy2 / a.ry) > 0.05) {
        solidEls().forEach(function (e) { if (!e._bed && !e._over) { e.x -= ox2; e.y -= oy2; } });
        els.forEach(function (e) { if (e._over) { e.x -= ox2; e.y -= oy2; } });
        follow(); solve(els.concat(still), a, false); follow();
      }
      var cv3 = R.cover(food(), a);
      if (cv3.cov >= band[0] && cv3.cov <= band[1] && pass) break;
    }
    // still too crowded to part (a full board): everything a little smaller, then apart again
    for (var tries = 0; tries < 5 && crowded(els.concat(still)); tries++) { scaleAll(0.92); follow(); solve(els.concat(still), a, false); follow(); }
    // and once more in the middle, now everything has its size
    var cv4 = R.cover(food(), a), ox4 = cv4.cx - a.cx, oy4 = cv4.cy - a.cy;
    if (Math.hypot(ox4 / a.rx, oy4 / a.ry) > 0.04) { solidEls().forEach(function (e) { if (!e._bed && !e._over) { e.x -= ox4; e.y -= oy4; } }); els.forEach(function (e) { if (e._over) { e.x -= ox4; e.y -= oy4; } }); follow(); solve(els.concat(still), a, false); follow(); }
    // what rides on a part goes where that part went, and stays on the servingware
    follow();
    els.forEach(function (e) { if (riderEl(e) && !e._line) clampEl(e, a, 0); });
    // layers: sauce, base pieces, mains, toppings, garnish (the order js/draw.js keeps when adding by hand)
    els.forEach(function (e, k) { e._k = k; });
    els.sort(function (x, y) { return (layEl(x) - layEl(y)) || (x._k - y._k); });
    els.forEach(function (e) { e.x = n1(e.x); e.y = n1(e.y); ['_k', '_h', '_o', '_on', '_bed', '_bo', '_bedPart', '_over', '_base', '_loose', '_grp', '_ram', '_line'].forEach(function (f) { delete e[f]; }); });
    still.forEach(function (e) { delete e._still; });
    return els;
  }

  /* ---------- Draw it for me ---------- */
  /* The layout version (15 Nov 2026): a plate Draw it for me lays out now carries layout.lv 2. A plate laid out the older
     way (no lv) is kept exactly as it is until the head chef taps Draw it again (head chef, 15 Nov 2026): it is not drawn
     again when its recipe or a card it uses is saved. LV goes up only when the rules for where parts go change. */
  var LV = 2;
  // the drawing editor this file was written with (render.oval, cover and HIDDEN, 15 Nov 2026): an older copy still
  // open on the phone is caught here, so nothing is drawn with half the new rules
  function fresh() { return !!(R.oval && R.reach && R.cover && R.HIDDEN); }
  var RELOAD_SAY = 'Reload the book to draw this: a part of the drawing editor is out of date.';
  // the board the book picked before 15 Nov 2026 (50 cm): an older plate drawn again takes today's board
  function oldBoard(s) { return !!s && s.fam === 'board' && s.shape === 'rect' && s.size === 50 && s.tone === 'medium' && s.finish === 'straight' && s.edge === 'rounded'; }
  function drawIt(seed, tv) {
    var W = DR.state(), d = W.d, r = R.recipeOf(d.rid);
    if (!r) return null;
    seed = seed || 0;
    if (d.slot === 'side') return sideFrom(seed);
    if (d.slot === 'build') return buildFrom();
    // kept as they are: parts moved by hand, pieces the head chef picked or swapped in, and drawn shapes
    var keep = d.els.filter(function (e) { return e.fixed || e.pick || (e.t !== 'item' && !e.made && !e.dr); }), keepIng = {};
    keep.forEach(function (e) { if (e.ing) keepIng[e.ing] = 1; String(e.also || '').split('|').forEach(function (x) { if (x) keepIng[x] = 1; }); });
    var keptPiece = keep.some(function (e) { return e.t === 'item' || e.t === 'raw'; });
    var pp = partsOf(r, d), surf = d.surf && d.els.length && !(oldBoard(d.surf) && !keptPiece && !(d.layout && d.layout.lv >= LV)) ? d.surf : ware(r, d.slot);
    d.surf = surf;
    // a batch recipe's own pan: filled with what its card makes, every ingredient on it named (js/compose.js)
    var pf = d.slot === 'pan' && C() && C().panPart ? C().panPart(r, areaOf(surf)) : null;
    if (pf) {
      var al = {}; pf.ings.slice(1).forEach(function (x) { al[x] = pf.ings[0]; });
      pp = { parts: [{ ing: pf.ings[0], i: (r.ingredients || []).filter(function (i) { return R.ingName(i) === pf.ings[0]; })[0] || { name: pf.ings[0], q: '' }, id: pf.id, it: pf, scale: 1, count: 1, conf: 1, guesses: [], also: pf.ings.slice(1) }], unsure: [], also: al, made: [{ ing: r.name, from: pf.from }] };
    }
    var style = W.styleChoice || pickStyle(r, d.slot, surf, pp.parts);
    tv = tv || tvFor(style, seed);
    var els = layout(d, r, pp.parts.filter(function (p) { return !keepIng[p.ing]; }), style, seed, keep, tv);
    d.els = keep.concat(els);
    d.layout = { style: style, seed: seed, also: pp.also, auto: true, uses: usesOf(d) };
    // a plate carries the layout version and its turn; a pan is laid out as before and carries neither
    if (d.slot === 'plate') { d.layout.lv = LV; d.layout.tv = { m: !!tv.m }; }
    return { style: style, unsure: pp.unsure, parts: pp.parts.length, made: pp.made };
  }
  // the cards a drawing is drawn from, with their signature when it was drawn: { card id: signature }
  function usesOf(d) { var u = {}; (d.els || []).forEach(function (e) { if (e.made && e.ms) u[e.made] = e.ms; }); return u; }

  /* ---------- drawn on save, and drawn again when a card changes (head chef, 21 Oct 2026) ----------
     A recipe saved with an empty drawing slot gets that slot drawn by itself: the plate (or the GN pan for a batch
     recipe), the side view, and the build for a burger or sandwich. A saved card's own book-made drawings, and those of
     every dish that uses it, are drawn again so they show the change; parts the head chef moved by hand stay, and a
     side view or build with a part moved by hand is left alone. The book's own drawings (js/art.js) and drawings made
     by hand (no layout) are never touched. Everything runs on the head chef's device, after the recipe's own save. */
  function drawFresh(d, plate) {
    var r = R.recipeOf(d.rid);
    if (!r) return d;
    var seed = d.layout && d.layout.seed || 0, tv = d.layout && d.layout.tv || null;
    DR.withDrawing(d, function () {
      if (d.slot === 'side') sideOf(d, r, plate, seed);
      else if (d.slot === 'build') buildFrom();
      else drawIt(seed, tv);
    });
    return d;
  }
  function slotsToDraw(r) {
    var A = window.LK_ART || {}, arts = X.arts();
    var has = function (k, g) { if (!k) return false; if (String(k).charAt(0) === '@') return arts.some(function (x) { return '@' + x.id === k && !x.removed; }); return g.some(function (n) { return !!(A[n] && A[n][k]); }); };
    var batch = /^(batch|component)$/.test(r.kind || ''), out = [];
    if (!has(r.art, ['plates', 'pans'])) out.push(batch ? 'pan' : 'plate');
    if (!batch) {
      // the book's own way: a burger or sandwich has its build instead of a side view, and a share board, a platter or a
      // topper has neither
      var stack = /burger|slider|sandwich|sanga/i.test(r.name || ''), flat = /platter|board/i.test(r.name || '') || r.kind === 'side';
      if (!stack && !flat && !(r.side ? has(r.side, []) : A.sides && A.sides[r.id])) out.push('side');
      if (stack && !has(r.diagram, ['diagrams'])) out.push('build');
    }
    return out;
  }
  function autoDraw(rid) {
    var r = R.recipeOf(rid), res = { drawn: [], redrawn: [], sideLeft: [] }, made = {}, plate = null, cur = X.change(rid);
    if (!r) return Promise.resolve(res);
    // worked out before its own slots are drawn, as drawing them saves the recipe again (version 2)
    var first = !X.pristine(rid) && !!cur && cur.v === 1 && /\btopper\b/i.test(rid + ' ' + (r.name || ''));
    // the head chef's picks first (a read only when the last one failed). Not read (no signal, a lost read, 28 Oct
    // 2026): nothing is drawn or drawn again, so no drawing is saved from a guess without the picks; the save says so
    // (nopicks) and the next save draws them
    return loadLearned().then(function () {
      if (!learnIn) { res.nopicks = true; return res; }
      var chain = Promise.resolve();
      slotsToDraw(r).forEach(function (slot) {
        chain = chain.then(function () {
          var d = drawFresh(DR.blank(rid, slot), plate);
          if (!d.els.length) return null;
          return DR.persist(d).then(function (done) { if (done && !done.conflict) { res.drawn.push(slot); made[d.id] = 1; if (slot === 'plate' || slot === 'pan') plate = d; } });
        });
      });
      return chain.then(function () { return first ? firstCard(rid, res, made) : null; }).then(function () { return redrawFrom(rid, res, made); }).then(function () { return res; });
    });
  }
  /* A topper card to come written for the first time (the French, Mexican and Americana toppers, head chef 22 Oct 2026):
     a topper is what the dish looks like, so the dishes that link to it and still show the book's own plate drawing
     (js/art.js, drawn from the card's note) get a plate drawn from the new card, and the recipe links to it. Only toppers,
     and only on the card's first save: after that the plate is book-made and redrawFrom() keeps it in step. Other cards to
     come and the book's own side views leave the book's drawings as they are. */
  function firstCard(rid, res, made) {
    var A = window.LK_ART || {}, chain = Promise.resolve();
    ((window.LK_DATA && window.LK_DATA.recipes) || []).filter(function (r) {
      return r.id !== rid && (r.ingredients || []).some(function (i) { return i.link === rid; }) && r.art && String(r.art).charAt(0) !== '@' && !!(A.plates && A.plates[r.art]);
    }).forEach(function (r) {
      chain = chain.then(function () {
        var d = drawFresh(DR.blank(r.id, /^(batch|component)$/.test(r.kind || '') ? 'pan' : 'plate'), null);
        if (!d.els.length) return null;
        return DR.persist(d).then(function (done) { if (done && !done.conflict) { made[d.id] = 1; if (res.redrawn.indexOf(r.name) < 0) res.redrawn.push(r.name); } });
      }).catch(function () { return null; });
    });
    return chain;
  }
  function redrawFrom(rid, res, skip) {
    var A = window.LK_APP, ids = [], todo = [rid], seen = {}, api = B(), chain = Promise.resolve(), plateDone = {};
    // the card and every dish that uses it, through the cards between (a dish using the slaw that uses the aioli)
    while (todo.length) { var x = todo.shift(); if (seen[x]) continue; seen[x] = 1; ids.push(x); ((A && A.usedIn && A.usedIn(x)) || []).forEach(function (u) { if (!seen[u]) todo.push(u); }); }
    var order = { plate: 0, pan: 0, side: 1, build: 2 };
    X.arts().filter(function (a) { return ids.indexOf(a.rid) >= 0 && !a.removed && !skip[a.id]; }).sort(function (p, q) { return (order[p.slot] || 0) - (order[q.slot] || 0); }).forEach(function (a) {
      chain = chain.then(function () {
        return api.ready().then(function () { return api.fs().getDocFromServer(api.docRef('drawings', a.id)); }).then(function (sn) {
          var x = sn.exists() ? sn.data() : null;
          if (!x || !x.layout || !x.layout.auto || x.removed) return null;
          var d = DR.fromDoc(a.id, x);
          // only a drawing of the card itself, one with a part drawn from one of these cards, or the side view and build
          // of a dish whose plate was just drawn again
          var flat = d.slot === 'side' || d.slot === 'build';
          if (a.rid !== rid && !(flat ? plateDone[a.rid] : d.els.some(function (e) { return e.made && ids.indexOf(e.made) >= 0; }))) return null;
          if ((d.slot === 'side' || d.slot === 'build') && d.els.some(function (e) { return e.fixed || e.pick; })) return null;
          // a side view stands on the dish's plate drawing as it is now (drawn again just before)
          var pl = d.slot === 'side' ? X.arts().filter(function (y) { return y.rid === a.rid && (y.slot === 'plate' || y.slot === 'pan') && !y.removed; })[0] : null;
          // the plate could not be read (no signal, a lost read): this side view is left as it is, never drawn from a
          // guessed plate and saved (28 Oct 2026). A plate that is not there is drawn from, as before.
          return (pl ? api.fs().getDocFromServer(api.docRef('drawings', pl.id)).then(function (ps) { return ps.exists() ? ps.data() : null; }, function () { return NO_PLATE; }) : Promise.resolve(null)).then(function (plate) {
            // said in the save's message (sideLeft), so the head chef knows it still shows the plate before
            if (plate === NO_PLATE) { var lr = R.recipeOf(a.rid), ln = lr ? lr.name : a.rid; if (res.sideLeft && res.sideLeft.indexOf(ln) < 0) res.sideLeft.push(ln); return null; }
            var was = JSON.stringify(d.els);
            drawFresh(d, plate);
            // drawn again exactly as it was (the change was to the method or the yield): nothing to save
            return JSON.stringify(d.els) === was ? null : DR.persist(d);
          }).then(function (done) {
            var rr = R.recipeOf(a.rid), nm = rr ? rr.name : a.rid;
            if (!done || done.conflict) return;
            if (!flat) plateDone[a.rid] = 1;
            if (res.redrawn.indexOf(nm) < 0) res.redrawn.push(nm);
          });
        }, function () { return null; });
      });
    });
    return chain;
  }

  // the same solver over what is there: overlaps pushed apart, everything back on the servingware, hand-placed parts stay
  function tidy() {
    var d = DR.state().d, a = areaOf(d.surf), roleOf = function (e) { var it = itemOfEl(e); return it ? it.role : ''; };
    // a sauce, topping or garnish sitting on a part moves with that part
    var ride = [];
    d.els.forEach(function (e) {
      if (!/^(sauce|dsauce|topping|garnish)$/.test(roleOf(e)) || e.fixed) return;
      var best = null, bd = Infinity;
      d.els.forEach(function (h) { if (h === e || !roleOf(h) || /^(sauce|dsauce|topping|garnish)$/.test(roleOf(h))) return; var b = R.bbox(h), dd = Math.hypot(h.x - e.x, h.y - e.y); if (e.x >= b[0] && e.x <= b[2] && e.y >= b[1] && e.y <= b[3] && dd < bd) { bd = dd; best = h; } });
      if (best) ride.push([e, best, e.x - best.x, e.y - best.y]);
    });
    if (d.slot === 'pan' || !fresh()) solvePan(d.els, a, true);
    else {
      // a part sitting on a bigger one (a main on its mash, a topping in a bowl) stays on it and moves with it (15 Nov 2026)
      var solids = d.els.filter(function (e) { return (e.t === 'item' || e.t === 'raw') && !riderEl(e); });
      solids.forEach(function (e) {
        if (e.fixed) return;
        var o = R.oval(e), ae = o.a * o.b, best = null, ba = Infinity;
        solids.forEach(function (h) { if (h === e) return; var ho = R.oval(h), ah = ho.a * ho.b; if (ah >= 1.3 * ae && ah < ba && R.inOval(ho, o.x, o.y)) { ba = ah; best = h; } });
        if (best) { e._bed = best; e._bo = [e.x - best.x, e.y - best.y]; }
      });
      solids.forEach(function (e) { if (e._bed && e._bed._bed) { delete e._bed; delete e._bo; } });
      solve(d.els, a, true);
      solids.forEach(function (e) { delete e._bed; delete e._bo; });
    }
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
  /* A plate drawing that could not be read (no signal, a lost read): not the same as no plate drawn yet, so nothing is
     drawn from a guessed plate in its place (28 Oct 2026). Draw it for me says so in the editor; drawn on save
     (redrawFrom()) leaves that side view as it is. */
  var NO_PLATE = { code: 'no-plate' }, NO_PLATE_SAY = 'Could not read the plate drawing, so the side view is not drawn. Check the signal and try again.';
  function sideFrom(seed) {
    var W = DR.state(), d = W.d, api = B(), r = R.recipeOf(d.rid);
    var plate = (X.arts().filter(function (x) { return x.rid === d.rid && (x.slot === 'plate' || x.slot === 'pan') && !x.removed; })[0]);
    return (plate ? api.ready().then(function () { return api.fs().getDoc(api.docRef('drawings', plate.id)); }).then(function (sn) { return sn.exists() ? sn.data() : null; }, function () { throw NO_PLATE; }) : Promise.resolve(null)).then(function (pd) {
      return DR.withDrawing(d, function () { return sideOf(d, r, pd, seed); });
    });
  }
  function sideOf(d, r, pd, seed) {
    // no plate drawn yet: the one Draw it for me would make, so the side view matches it
    if (!pd || !Array.isArray(pd.els)) {
      var tmp = { rid: d.rid, slot: 'plate', surf: ware(r, 'plate'), defs: {}, els: [] }, pp = partsOf(r, tmp).parts;
      pd = { surf: tmp.surf, els: layout(tmp, r, pp, pickStyle(r, 'plate', tmp.surf, pp), seed || 0) };
    }
    var surfW = LIB.surface(pd.surf || { fam: 'plate', size: 30 }).w || 200;
    // in the plate's own order, bottom layer first (a sauce pool before its steak, the napoli after its schnitzel)
    var parts = pd.els.filter(function (e) { return e.t === 'item' || (e.t === 'raw' && (e.made || e.dr)); }).map(function (e) {
      var it = e.t === 'item' ? LIB.get(e.a.split('@')[0]) : e.dr ? LIB.get(e.dr) : cardPart({ name: e.ing || '', link: e.made }, null, null); if (!it) return null;
      var b = R.bbox(e);
      return { it: it, ing: e.ing || it.name, x: e.x / surfW * 200, y: e.y / surfW * 200, w: (b[2] - b[0]) / surfW * 200, h: (b[3] - b[1]) / surfW * 200 };
    }).filter(Boolean);
    // pieces of the same part (three honeycomb shards): one from the side
    var seen = {}; parts = parts.filter(function (p) { var k2 = p.ing + '|' + p.it.id; if (seen[k2]) return false; seen[k2] = 1; return true; });
    return layoutSide(d, parts, seed, pd.surf || ware(r, 'plate'));
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
    d.els = els; d.layout = { style: 'side', seed: seed || 0, auto: true };
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
    d.els = els; d.layout = { style: 'build', seed: 0, auto: true };
    return { style: 'build', parts: pcs.length };
  }

  /* ---------- the buttons and the panel on the drawing page (js/draw.js asks for them) ---------- */
  function esc(t) { return window.LK_APP.esc(t); }
  function run(W, seed) {
    loadLearned();   // read again only if the read when the editor opened failed, for the next tap
    DR.before();
    var res = drawIt(seed);
    var done = function (r) { W.smart = r || null; W.sel = []; if (W.msg === NO_PLATE_SAY) W.msg = ''; DR.redraw(); if (r) DR.say((r.parts ? 'Drawn: ' + r.parts + (r.parts === 1 ? ' part' : ' parts') : 'Drawn') + (r.unsure && r.unsure.length ? ', ' + r.unsure.length + ' to pick' : '') + '.'); };
    if (res && typeof res.then === 'function') res.then(done, function (e) { if (e === NO_PLATE) W.msg = NO_PLATE_SAY; DR.redraw(); }); else done(res);
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
      return out;
    },
    // what Draw it for me says about the drawing it made: shown once, at the top of the canvas (4 Nov 2026, the quiet
    // canvas), not at the top of every panel
    note: function (W) {
      var out = '', r = W.smart;
      if (r && r.style && STYLES[r.style]) out = '<p class="hint dw-smart-note">Drawn by the book: ' + esc(STYLES[r.style].name.toLowerCase()) + (r.style === 'side' || r.style === 'build' ? '' : ' plating') + '.</p>';
      if (r && r.made && r.made.length) out += '<p class="hint dw-made">Drawn from ' + (r.made.length === 1 ? (r.made[0].note ? 'its note' : 'its recipe') : 'their recipes') + ': ' + r.made.map(function (m) { return '<b>' + esc(m.ing) + '</b> (' + (m.note && r.made.length > 1 ? 'its note: ' : '') + esc(m.from.join(', ').toLowerCase()) + ')'; }).join('; ') + '.</p>';
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
        (DR.addItem(id, { ing: ing, scale: DR.scaleFor(it, i.q) }) || []).forEach(function (n) { W.d.els[n].pick = true; });
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
    // a piece drawn from the ingredient's own recipe card (js/draw.js adds it when nothing in the library is sure)
    made: function (i, d) { var r = d && R.recipeOf(d.rid), m = matchIng(i, r); return cardPart(i, r, m) || (C() ? C().dress(i, r, m) : null); },
    matchIng: matchIng, rank: rank, key: key, hidden: hidden, cookedIn: cookedIn, wrapped: wrapped, shown: shown, split: split, ware: ware, pickStyle: pickStyle, STYLES: STYLES, LV: LV,
    partsOf: partsOf, drawIt: drawIt, tidy: tidy, drawFresh: drawFresh, autoDraw: autoDraw, slotsToDraw: slotsToDraw, loadLearned: loadLearned, teach: teach, pendingOps: pendingOps, saved: saved,
    learned: function () { return learned || {}; }
  };
})();
