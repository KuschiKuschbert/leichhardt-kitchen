/*
  Leichhardt Kitchen Book: drawn from the recipe (asked for by the head chef, 21 Oct 2026)
  ======================================================================================
  "If we create a recipe, we draw that recipe from the recipe, with the ingredients based on the prep, no matter if it
  is a complete dish or just a component of that dish." The book reads a recipe card (its ingredients, their notes and
  the method, step by step) into what the card makes and how each ingredient is cut and cooked, through the cards it
  links to, and draws that in the look of the book's own drawings (js/art.js). Plain rules on the device, the same
  drawing every time for the same card.

    read(card)           what the card makes: { form, cook, wet, lines: [{ ing, part, cut, cook, coat, raw, col, g }] }
    compose(model, ctx)  its drawing as a part of a dish: a piece of its own (body, box, role, form, side), or null when
                         the library piece the dish already has says it all
    partFor(i, dish, m)  the part for an ingredient of a dish that has a card of its own (js/smart.js asks it first)
    ST                   the book's look in numbers: outlines, shadows, highlights, gloss (measured from js/art.js)

  Loaded with the drawing editor, after js/smart.js, on the head chef's device only.
*/
(function () {
  'use strict';
  var LIB = window.LK_LIB, DR = window.LK_DRAW, R = DR.render, X = window.LK_RX, P = LIB.P;
  function S() { return window.LK_SMART; }
  function n1(x) { return Math.round(x * 10) / 10; }
  function low(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' '); }
  function first(list, t) { for (var k = 0; k < list.length; k++) if (list[k][1].test(t)) return list[k][0]; return ''; }

  /* ---------- the book's look (measured over the 184 drawings in js/art.js, 21 Oct 2026) ----------
     An outline is the fill's own hue at 0.74 of its lightness (0.63 to 0.83 in the book), about 1 unit wide. Shadows
     are black at 0.10 to 0.16. Highlights are a lighter tint of the same hue at 0.7 to 0.85. Liquids get wide soft gloss
     strokes. Shapes are plain circles, ellipses, rounded rects and smooth outlines, layered: base, lighter top,
     highlight, seeds. Colours are snapped to the book's own palette when one is close. */
  function rgb(h) { h = String(h).replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function hexOf(c) { return '#' + c.map(function (x) { x = Math.max(0, Math.min(255, Math.round(x))); return ('0' + x.toString(16)).slice(-2); }).join('').toUpperCase(); }
  function toHsl(h) {
    var c = rgb(h).map(function (x) { return x / 255; }), mx = Math.max(c[0], c[1], c[2]), mn = Math.min(c[0], c[1], c[2]), l = (mx + mn) / 2, s = 0, hh = 0, d = mx - mn;
    if (d) { s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === c[0] ? (c[1] - c[2]) / d + (c[1] < c[2] ? 6 : 0) : mx === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4; hh *= 60; }
    return [hh, s, l];
  }
  function fromHsl(x) {
    var h = x[0] / 360, s = Math.max(0, Math.min(1, x[1])), l = Math.max(0, Math.min(1, x[2]));
    if (!s) return hexOf([l * 255, l * 255, l * 255]);
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    var f = function (t) { t = t < 0 ? t + 1 : t > 1 ? t - 1 : t; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    return hexOf([f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]);
  }
  var ST = {
    // the outline: same hue, 0.74 of the lightness
    edge: function (c) { var x = toHsl(c); return fromHsl([x[0], x[1], x[2] * 0.74]); },
    // a highlight or a lighter top: same hue, towards white by f
    lift: function (c, f) { var x = toHsl(c); return fromHsl([x[0], x[1], x[2] + (1 - x[2]) * (f == null ? 0.3 : f)]); },
    sink: function (c, f) { var x = toHsl(c); return fromHsl([x[0], x[1], x[2] * (1 - (f == null ? 0.25 : f))]); },
    sw: 1, shadow: '0.12', hi: '0.8', gloss: '0.7'
  };
  var pal = null;
  function palette() {
    if (pal) return pal;
    var A = window.LK_ART || {}, seen = {};
    ['plates', 'pans', 'sides', 'diagrams'].forEach(function (g) {
      Object.keys(A[g] || {}).forEach(function (k) { String(A[g][k]).replace(/fill="#([0-9A-Fa-f]{6})"/g, function (m, h) { h = h.toUpperCase(); seen[h] = (seen[h] || 0) + 1; return m; }); });
    });
    pal = Object.keys(seen).filter(function (h) { return seen[h] >= 2 && h !== '000000' && h !== 'FFFFFF'; }).map(function (h) { return { h: '#' + h, c: rgb(h) }; });
    return pal;
  }
  // how far apart two colours look (the "redmean" weighting of red, green and blue)
  function dist(a, b) { var r = (a[0] + b[0]) / 2; return Math.sqrt((2 + r / 256) * Math.pow(a[0] - b[0], 2) + 4 * Math.pow(a[1] - b[1], 2) + (2 + (255 - r) / 256) * Math.pow(a[2] - b[2], 2)); }
  // the nearest colour the book itself uses, when one is close enough that nobody would see the change
  function snap(c) {
    if (!c) return c;
    var a = rgb(c), best = c, bd = 42;
    palette().forEach(function (p) { var d = dist(a, p.c); if (d < bd) { bd = d; best = p.h; } });
    return best;
  }
  function mix(a, b, t) { return P.mix(a, b, t); }
  // the last step on every drawing made here: each fill moved to the book's own colour when one is close, its outline
  // made again from the new fill, and a stroke-only shape (a jalapeño ring, a carrot strip) snapped the same way
  function finish(body) {
    return body.replace(/<(\w+)([^>]*)>/g, function (m, t, a) {
      var f = (a.match(/fill="(#[0-9A-Fa-f]{6})"/) || [])[1], st = (a.match(/stroke="(#[0-9A-Fa-f]{6})"/) || [])[1];
      if (f && !/^#0{6}$/.test(f)) {
        var nf = snap(f);
        a = a.replace('fill="' + f + '"', 'fill="' + nf + '"');
        if (st && st.toUpperCase() === ST.edge(f)) a = a.replace('stroke="' + st + '"', 'stroke="' + ST.edge(nf) + '"');
      } else if (st && /fill="none"/.test(a)) a = a.replace('stroke="' + st + '"', 'stroke="' + snap(st) + '"');
      return '<' + t + a + '>';
    });
  }
  // how strong a colour is: red cabbage over white cabbage
  function chroma(c) { var a = rgb(c); return Math.max(a[0], a[1], a[2]) - Math.min(a[0], a[1], a[2]); }
  // a filled shape with its outline, the book's way
  function fill(d, c, sw, x) { return P.path(d, c, ST.edge(c), sw == null ? ST.sw : sw, x); }
  function shadowD(d, dx, dy, op) { return P.path(d, '#000000', null, 0, { opacity: op || ST.shadow, transform: 'translate(' + n1(dx) + ' ' + n1(dy) + ')' }); }
  // the soft wide strokes the book draws on syrup, sauce and dressing
  function gloss(rnd, rx, ry, c, w) {
    var out = '';
    for (var k = 0; k < 2; k++) {
      var y = (k ? 0.35 : -0.35) * ry + (rnd() - 0.5) * ry * 0.2, x0 = -rx * 0.62, x1 = rx * 0.62;
      out += P.path('M' + n1(x0) + ' ' + n1(y) + ' C' + n1(x0 + rx * 0.4) + ' ' + n1(y - ry * 0.18) + ' ' + n1(x1 - rx * 0.5) + ' ' + n1(y + ry * 0.18) + ' ' + n1(x1) + ' ' + n1(y - ry * 0.05), 'none', ST.lift(c, 0.42), w || 2.4, { 'stroke-linecap': 'round', opacity: ST.gloss });
    }
    return out;
  }

  /* ---------- the words a card uses ---------- */
  // how it is cut (the most particular word first)
  var CUT = [
    ['kernels', /\bkernels?\b/], ['florets', /\bflorets?\b/], ['rings', /\brings?\b/],
    ['julienne', /julienn|matchstick|\bbatons?\b/], ['shreds', /shredd|\bshred\b|slicing blade|\bpull(ed)?\b/],
    ['grated', /\bgrat(e|ed|ing)\b/], ['minced', /\bminc(e|ed)\b|\bcrush(ed)?\b|\bpaste\b|\bblitz(ed)?\b|\bblend(ed)?\b|\bpur[e]e(d)?\b/],
    ['dice', /\bdic(e|ed)\b|\bcub(e|ed|es)\b|\bchop(ped)?\b|brunoise/], ['wedges', /\bwedges?\b|\bquarter(s|ed)?\b|on an angle/],
    ['halves', /\bhalv(e|ed|es)\b|\bin half\b|\bsplit\b/], ['slices', /\bslic(e|ed|es|ing)\b|\bshav(ed|ings?)\b|\bcoins?\b|\brounds\b/],
    ['torn', /\btorn\b|\btear\b/], ['whole', /\bwhole\b/]
  ];
  // how it is cooked; the higher the number, the more it shows (charred over steamed when a cob is steamed, then charred)
  var COOK = [
    ['charred', /\bchar(red|ring)?\b|chargrill|blacken/, 9], ['fried', /deep[- ]?fr(y|ied)|\bfryer\b|\bfr(y|ied)\b|golden brown|\bcrisp(y)?\b/, 8],
    ['grilled', /\bgrill(ed)?\b|griddle|plancha/, 8], ['smoked', /\bsmok(e|ed|er|ing)\b/, 7],
    ['roasted', /\broast(ed|ing)?\b/, 6], ['caramelised', /carameli[sz]|brown(ed)? butter|noisette/, 6], ['seared', /\bsear(ed)?\b|pan[- ]?fr|\bsaute(ed)?\b/, 6],
    ['baked', /\bbak(e|ed|ing)\b|steam bake|\boven\b|\bcombi\b/, 5], ['toasted', /\btoast(ed)?\b/, 5], ['braised', /\bbrais(e|ed)\b|slow cook|\bstew(ed)?\b/, 4],
    ['melted', /\bmelt(ed)?\b|\bsoften(ed)?\b/, 3], ['pickled', /\bpickl(e|ed)\b|\bcur(e|ed)\b|\bcandied\b/, 3],
    ['poached', /\bpoach(ed)?\b|\bboil(ed)?\b|\bblanch(ed)?\b|\bsimmer(ed)?\b/, 2], ['steamed', /\bsteam(ed)?\b/, 2]
  ];
  var COOK_N = {}; COOK.forEach(function (c) { COOK_N[c[0]] = c[2]; });
  function cookIn(t) { var b = '', bn = -1; COOK.forEach(function (c) { if (c[1].test(t) && c[2] > bn) { b = c[0]; bn = c[2]; } }); return b; }
  var COAT = [['crumbed', /\bcrumb(ed|s)?\b|\bpanko\b|breadcrumb/], ['battered', /\bbatter(ed)?\b|tempura/], ['dusted', /\bdust(ed)?\b|\bdredg/], ['glazed', /\bglaz(e|ed)\b/]];
  // colours a whole card takes from a little of something strong (the turmeric in the syrup, the rub in the butter)
  var TINT = [[/turmeric|saffron/, '#E3A21A'], [/curry powder|garam masala|curry paste|laksa paste/, '#D49A2A'], [/smoked paprika/, '#9E3418'], [/paprika|cayenne|chilli powder|chili powder|gochugaru/, '#C0391E'],
    [/gochujang|sriracha|harissa|hot pepper paste/, '#A3261C'], [/\brub\b|bbq spice|cajun|jerk|five spice|ras el hanout|baharat|krio krush/, '#7A3A1C'], [/cinnamon|nutmeg|mixed spice|allspice/, '#8B4A22'],
    [/cocoa|cacao/, '#4E2A17'], [/coffee|espresso/, '#4A2C1A'], [/matcha|spirulina/, '#6E9A3E'], [/squid ink|charcoal/, '#1E1E22'], [/\bsoy\b|kecap|tamari|worcestershire|fish sauce|oyster sauce/, '#5A3416'], [/beetroot (powder|juice)/, '#8E2A52']];
  function tintOf(t) { for (var k = 0; k < TINT.length; k++) if (TINT[k][0].test(t)) return TINT[k][1]; return ''; }
  // what goes in as a liquid: [words, colour ('' for clear), how strongly it colours]
  var LIQ = [
    [/gravy (powder|mix)|gravy granules|\bjus\b|demi/, '#7E4726', 1], [/coconut (milk|cream)/, '#F6F1E4', 0.7], [/tomato (paste|puree|passata)|\bpassata\b|tinned tomato|crushed tomato|pizza sauce|napoli/, '#B5341F', 0.8],
    [/\bcream\b(?! (bun|bread|cracker))|\bmilk\b(?! (bun|bread|loaf|chocolate))|creme|yoghurt|yogurt|sour cream|cream cheese|mayo/, '#F4EBCB', 0.7], [/red (cooking )?wine|\bport\b|shiraz|cabernet/, '#7A2A2A', 0.25],
    [/brown sugar|palm sugar|treacle|molasses|maple|golden syrup|\bhoney\b/, '#A8621E', 0.6], [/\bsugar\b|\bsyrup\b/, '#E9B44C', 0.5],
    [/bbq sauce|barbecue sauce/, '#5C2615', 1], [/tomato sauce|ketchup/, '#B5341F', 0.9], [/\bstock\b|\bbroth\b/, '#C9A46A', 0.2],
    [/\bbeer\b|\bstout\b|\bbourbon\b|whisk(e)?y|\brum\b/, '#8A5A22', 0.2], [/vinegar|white wine|cooking wine|\bwine\b|sherry|\bwater\b|\bice\b|juice|\bsake\b|mirin/, '', 0],
    [/\boil\b/, '#E8C25A', 0.1]
  ];
  function liqOf(t) { for (var k = 0; k < LIQ.length; k++) if (LIQ[k][0].test(t)) return LIQ[k]; return null; }
  var PEPPER = /\b(black|white|cracked|ground|szechuan|sichuan)\b[a-z ]*\bpepper\b|\bpeppercorns?\b/;
  // what melts into a sauce or a purée (the butter in the butterscotch)
  var MELT = /\b(butter|cheese|cheddar|mozzarella|parmesan|chocolate|cream cheese)\b/;
  // what cooks down into a sauce and no longer shows
  var GONE = /\b(onions?|shallots?|garlic|ginger|celery|lemongrass|gravy|flour|cornflour|sugar|salt|stock|paste)\b/;

  /* What a raw ingredient looks like, from the book's own drawings: its colour (c), its inside (f), how it is drawn when
     it is cut small (k), and whether it is the bed a mix sits on. The colours are the ones js/art.js uses for them. */
  var RAW = [
    [/red cabbage/, { c: '#8E3A66', k: 'shred', bed: 1 }], [/cabbage|wombok/, { c: '#F1ECD8', k: 'shred', bed: 1 }],
    [/jalapeno|green chilli/, { c: '#6E8F2B', alt: '#C0451F', k: 'ring', seed: '#F3EBD0' }], [/chilli|chili/, { c: '#C0392B', k: 'ring', seed: '#F3EBD0' }],
    [/red (capsicum|pepper)|roasted (red )?peppers?|\bcapsicum\b/, { c: '#C0392B', k: 'strip' }], [/green (capsicum|pepper)/, { c: '#4F7A2F', k: 'strip' }],
    [/carrot/, { c: '#EE8A2E', k: 'strip' }], [/corn/, { c: '#F2C94C', k: 'kernel' }], [/mushroom/, { c: '#D8C3A0', k: 'mslice' }],
    [/spring onion|scallion|chive/, { c: '#6FAE3E', k: 'ring', small: 1 }], [/red onion/, { c: '#9B4A86', k: 'dice' }], [/onion|shallot/, { c: '#F1E6D2', k: 'dice' }],
    [/cucumber/, { c: '#5E8C3A', f: '#DCEBB8', k: 'slice' }], [/cherry tomato/, { c: '#D9473B', f: '#EC6A5C', k: 'half' }], [/tomato/, { c: '#D9473B', f: '#EC6A5C', k: 'dice' }],
    [/broccolini|broccoli/, { c: '#4F7F2F', k: 'floret' }], [/cauliflower/, { c: '#F3EBD0', k: 'floret' }],
    [/pak choy|bok choy|gai lan|choy sum|silverbeet|chard|kale/, { c: '#5E8C3A', f: '#DCEBB8', k: 'green' }],
    [/spinach|rocket|mesclun|lettuce|leaves|\bcos\b|\bgem\b|watercress/, { c: '#6E9A3E', k: 'leaf', bed: 1 }],
    [/brown rice|wild rice/, { c: '#C9A46A', k: 'grain', bed: 1 }], [/\brice\b|quinoa|couscous/, { c: '#F4F1EA', k: 'grain', bed: 1 }],
    [/mustard seed/, { c: '#C9962E', k: 'seed' }], [/black sesame/, { c: '#2E2A26', k: 'seed' }], [/sesame/, { c: '#F3E3B8', k: 'seed' }],
    [/linseed|flaxseed|chia/, { c: '#8C5A2E', k: 'seed' }], [/pumpkin seed|pepita/, { c: '#6E9A3E', k: 'nut' }], [/pine nut|cashew|almond|peanut|macadamia/, { c: '#EBD9A8', k: 'nut' }],
    [/thyme|rosemary|oregano|mixed herb|italian herb/, { c: '#5E7A3A', k: 'herb' }], [/parsley|coriander|basil|mint|dill|herb/, { c: '#4F7F2F', k: 'herb' }],
    [/\bmince\b/, { c: '#8A4B2D', k: 'crumble' }], [/bacon|pancetta|speck|ham\b/, { c: '#B5503F', k: 'strip' }],
    [/\bpeas?\b|edamame/, { c: '#7EA453', k: 'kernel' }], [/pineapple/, { c: '#F2CB55', k: 'dice' }], [/beetroot/, { c: '#A8476B', k: 'dice' }],
    [/pumpkin|sweet potato|butternut/, { c: '#E2A93A', k: 'dice' }], [/potato/, { c: '#E8D9B5', k: 'dice' }], [/olive/, { c: '#3F3A2A', k: 'ring' }],
    [/chocolate|choc nib/, { c: '#5E2F1A', k: 'dice' }], [/butter/, { c: '#F3D675', k: 'dice' }], [/mozzarella|cheddar|parmesan|\bcheese\b/, { c: '#F6D27A', k: 'shred' }],
    [/radish/, { c: '#D9473B', f: '#F4F1EA', k: 'slice' }], [/avocado/, { c: '#A6C45E', k: 'dice' }], [/apple|pear/, { c: '#F3EBD0', k: 'dice' }],
    // more single ingredients, from the recipe library the head chef keeps (21 Oct 2026): the ones that come up most
    [/celeriac|celery root/, { c: '#EDE6D2', k: 'dice' }], [/celery/, { c: '#9CC067', f: '#DCEBB8', k: 'slice' }], [/fennel/, { c: '#DCEBB8', k: 'shred' }],
    [/leek/, { c: '#9CC46E', f: '#DCEBB8', k: 'ring', small: 1 }], [/zucchini|courgette|summer squash|yellow squash/, { c: '#5E8C3A', f: '#E8EFC8', k: 'slice' }],
    [/eggplant|aubergine/, { c: '#4A2A4A', f: '#EFE3C4', k: 'dice' }], [/asparagus/, { c: '#6FA040', k: 'strip' }], [/green beans?|snow peas?|sugar snap/, { c: '#6FA83A', k: 'strip' }],
    [/bean sprouts?|sprouts/, { c: '#F1ECD8', k: 'shred' }], [/brussels/, { c: '#6E9A3E', k: 'half' }], [/okra/, { c: '#6FA040', f: '#DCEBB8', k: 'slice' }],
    [/tomatillo/, { c: '#9CC067', f: '#DCEBB8', k: 'half' }], [/ginger|galangal/, { c: '#E3C690', k: 'shred' }], [/rhubarb/, { c: '#C0392B', f: '#DCEBB8', k: 'chunk' }],
    [/radicchio/, { c: '#8E3A66', k: 'leaf', bed: 1 }], [/endive|escarole|witlof/, { c: '#E8EFC8', k: 'leaf', bed: 1 }],
    [/turnip|swede|parsnip|kohlrabi|jicama|daikon|hearts? of palm/, { c: '#F1EAD6', k: 'dice' }], [/artichoke/, { c: '#7EA453', f: '#E8EFC8', k: 'half' }],
    [/cranberr|pomegranate|redcurrant/, { c: '#A8281E', k: 'kernel' }], [/raisin|sultana|currant/, { c: '#5E2F1A', k: 'kernel' }],
    [/blueberr/, { c: '#3F3A6E', k: 'kernel' }], [/raspberr|strawberr/, { c: '#C0392B', k: 'kernel' }],
    [/grapefruit|blood orange/, { c: '#E8806A', k: 'half' }], [/mandarin|clementine|tangerine|orange|kumquat/, { c: '#E8923A', k: 'half' }],
    [/lemon/, { c: '#F2CB55', k: 'half' }], [/lime/, { c: '#8DB255', k: 'half' }],
    [/nectarine|peach|apricot/, { c: '#E8923A', f: '#F3DDA0', k: 'chunk' }], [/prune|dates?|figs?/, { c: '#4E2A2A', k: 'chunk' }],
    [/rockmelon|cantaloupe/, { c: '#F2A65E', k: 'chunk' }], [/honeydew|melon/, { c: '#DCEBB8', k: 'chunk' }], [/watermelon/, { c: '#EC6A5C', k: 'chunk' }],
    [/mango/, { c: '#F2B13C', k: 'dice' }], [/banana/, { c: '#F3E3B8', k: 'slice' }], [/grapes?/, { c: '#9CB45A', k: 'kernel' }], [/coconut/, { c: '#F6F1E4', k: 'shred' }],
    [/red lentil/, { c: '#E8923A', k: 'grain', bed: 1 }], [/lentil/, { c: '#8C6239', k: 'grain', bed: 1 }],
    [/oats?|porridge/, { c: '#E3C690', k: 'grain', bed: 1 }], [/barley|farro|spelt|buckwheat|bulgur|freekeh/, { c: '#C9A46A', k: 'grain', bed: 1 }], [/millet|polenta|semolina|cornmeal|grits/, { c: '#F2D27A', k: 'grain', bed: 1 }],
    [/chickpea/, { c: '#E3C690', k: 'kernel' }], [/black beans?/, { c: '#2E2A26', k: 'kernel' }], [/kidney beans?/, { c: '#8E2616', k: 'kernel' }], [/cannellini|butter beans?|lima|white beans?/, { c: '#F1E6D2', k: 'kernel' }],
    [/tofu|paneer|haloumi|halloumi|feta/, { c: '#F6F1E4', k: 'dice' }], [/tempeh/, { c: '#D9B98A', k: 'dice' }],
    [/turkey|chicken/, { c: '#EBC27A', k: 'dice' }], [/pork/, { c: '#E8D9B5', k: 'dice' }], [/beef|lamb|steak/, { c: '#8E5A22', k: 'dice' }],
    [/prawn|shrimp/, { c: '#EE8A2E', k: 'half' }], [/salmon|trout/, { c: '#EE8A2E', k: 'chunk' }], [/anchov|sardine/, { c: '#8C9AA8', k: 'strip' }], [/fish|cod|barramundi/, { c: '#F3EBD0', k: 'chunk' }],
    [/egg|eggs/, { c: '#FFFFFF', f: '#F2C94C', k: 'half' }], [/walnut|pecan|hazelnut|pistachio|chestnut/, { c: '#B9772E', k: 'nut' }],
    [/star anise|cardamom|clove|allspice|peppercorn/, { c: '#5E2F1A', k: 'seed' }], [/cacao nib|cocoa nib/, { c: '#4E2A17', k: 'dice' }], [/nori|seaweed|wakame/, { c: '#2F4A2A', k: 'shred' }]
  ];
  function rawOf(t) { for (var k = 0; k < RAW.length; k++) if (RAW[k][0].test(t)) return RAW[k][1]; return null; }
  // the weight of one when the card counts them (2 red cabbages, 12 corn cobs, 1 large onion)
  var EACH = [[/cabbage/, 1000], [/cob/, 250], [/cauliflower|broccoli/, 500], [/lettuce/, 400], [/onion/, 150], [/capsicum|pepper/, 150], [/cucumber/, 300], [/carrot/, 100], [/tomato/, 100], [/egg/, 55], [/bunch/, 100], [/tin/, 400], [/sprig/, 2], [/chilli|jalapeno/, 15]];
  function weightOf(i, t) {
    var a = DR.amount(i.q);
    if (!a) return 0;
    if (a.g) return a.g;
    var each = 50; for (var k = 0; k < EACH.length; k++) if (EACH[k][0].test(t + ' ' + low(i.q))) { each = EACH[k][1]; break; }
    return (a.n || 1) * each;
  }

  /* ---------- reading a card ---------- */
  // the card an ingredient stands for: its link, or a component card with the same name (never the dish itself)
  function cardOf(i, dish) {
    var A = window.LK_APP, id = i.link || '', c = id ? ((A && A.byId && A.byId(id)) || (X && X.pristine && X.pristine(id))) : null, k;
    if (!c && !id) {
      k = S().key(i.name);
      if (k) c = ((window.LK_DATA && window.LK_DATA.recipes) || []).filter(function (x) { return (x.kind === 'batch' || x.kind === 'component') && S().key(x.name) === k; })[0] || null;
    }
    if (!c || (dish && c.id === dish.id)) return null;
    // a whole dish is drawn as a dish, not as a part of another
    if (/^(main|snack|dessert)$/.test(c.kind || '')) return null;
    return c;
  }
  // "strips, not rings": what a card says it is not
  var NOT = /\b(not|no|never|without)\s+[a-z]+/g;
  // the words of an amount that are units, not things ("1 cob" names the cob)
  var UNITS = /\b(\d+|g|kg|ml|l|litres?|grams?|about|to|or|and|of|a|an|portions?|serves?|pieces?|slices?|each|large|small|medium|tsp|tbsp|cups?|full|half|qty)\b|[\[\]0-9.,]/gi;
  // a step that says "the greens" or "the vegetables" names every one of them
  var GROUPS = [[/\bgreens\b/, function (L) { return L.raw && /green|leaf|floret/.test(L.raw.k); }], [/\b(vegetables|veg|veggies)\b/, function (L) { return L.part === 'solid'; }]];
  // the words of a name that say what it is: "Red cabbages" says cabbage (and red)
  function heads(name) { var k = S().key(name).split(' ').filter(Boolean); return k; }
  function names(step, L) {
    if (!L.hw.length) return false;
    var sw = ' ' + S().key(step) + ' ', head = L.hw[L.hw.length - 1];
    if (sw.indexOf(' ' + head + ' ') >= 0) return true;
    if (L.alt.some(function (w) { return w.length > 2 && sw.indexOf(' ' + w + ' ') >= 0; })) return true;
    return GROUPS.some(function (g) { return g[0].test(step) && g[1](L); });
  }
  // one ingredient line: what it is and how it comes into the card
  function lineOf(i, depth, seen) {
    var name = R.ingName(i), t = low(name + ' ' + (i.note || '')).replace(NOT, ' '), L = { ing: name, i: i, t: t, hw: heads(name), alt: heads(String(i.q || '').replace(UNITS, ' ')), g: 0 };
    L.cut = first(CUT, t); L.cook = cookIn(t); L.coat = first(COAT, t);
    L.raw = rawOf(low(name));
    // "Corn ribs per serve": a note on how many, not an ingredient
    if (/\bper (serve|plate|portion)\b/.test(low(name))) { L.part = 'hidden'; return L; }
    L.g = weightOf(i, t);
    var tint = tintOf(t);
    if (tint) { L.part = 'tint'; L.col = tint; L.rub = /\brub\b|spice|seasoning|cajun|jerk|krush|powder/.test(t); return L; }
    var sub = cardOf(i, null);
    if (sub && depth < 3 && !seen[sub.id]) {
      var sm = read(sub, depth + 1, seen);
      if (sm && sm.form !== 'unknown') {
        L.sub = sm; L.col = sm.col;
        if (sm.form === 'liquid' || sm.form === 'smooth') { L.part = 'liquid'; L.lq = [sm.col, 0.7]; return L; }
        L.part = 'solid'; L.raw = L.raw || (sm.base && sm.base.raw) || null; return L;
      }
    }
    if (PEPPER.test(t) && !/capsicum|bell|roasted/.test(t)) { L.part = 'bits'; L.kind = 'speck'; L.col = '#3C2A1C'; return L; }
    if (/\bflour\b|cornflour|corn flour|\bcrumbs?\b|\bpanko\b|batter mix|tempura/.test(t)) { L.part = 'coat'; L.coat = L.coat || (/crumb|panko/.test(t) ? 'crumbed' : /batter|tempura/.test(t) ? 'battered' : 'dusted'); return L; }
    var lq = liqOf(t);
    // butter, cream and cheese are liquid in a sauce and solid in a mix; the card's form decides (decide below)
    if (lq && (!L.raw || lq[2] >= 0.6)) { L.part = 'liquid'; L.lq = [lq[1], lq[2]]; L.col = lq[1]; return L; }
    if (lq) L.lq = [lq[1], lq[2]];
    if (S().hidden(i)) { L.part = 'hidden'; return L; }
    if (L.raw) { L.part = 'solid'; L.col = L.raw.c; return L; }
    // something the book has no colour for yet: the library piece it matches gives one
    var m = S().rank(name, { notCat: 'build' })[0], it = m && m.s >= 0.6 ? LIB.get(m.id) : null;
    if (it && it.side) { L.part = 'solid'; L.col = it.side.c; L.raw = { c: it.side.c, k: /scatter|pile/.test(it.form) ? 'dice' : 'dice', lib: it.id }; return L; }
    L.part = 'unknown';
    return L;
  }
  // the method, step by step: what each step names gets its cut and cook; a step that names nothing ("Simmer", "Bake")
  // goes on with what the step before named
  function readSteps(r, mo) {
    var cur = [], lines = mo.lines.filter(function (L) { return L.part !== 'hidden'; });
    (r.sections || []).forEach(function (sec) {
      var title = low(sec.title);
      (sec.steps || []).forEach(function (st) {
        var t = low(st).replace(/\[[^\]]*\]/g, ' ').replace(NOT, ' ');
        if (!t.trim()) return;
        if (/plat|serv|portion|on the day|for the bread/.test(title)) { mo.plating.push(t); return; }
        var parts = t.split(/\b(?:except|apart from|other than|but not|without)\b/), main = parts[0], not = parts.slice(1).join(' ');
        var named = lines.filter(function (L) { return names(main, L); });
        if (/\ball (the )?(ingredients|of it)\b|\beverything\b|\ball together\b|\bcombine all\b/.test(main)) named = lines.filter(function (L) { return !names(not, L); });
        var cut = first(CUT, t), cook = cookIn(t), coat = first(COAT, t), on = named.length ? named : cur;
        on.forEach(function (L) {
          if (cut && named.length && !(cut === 'whole')) L.cut = cut;
          if (cook && (!L.cook || COOK_N[cook] >= COOK_N[L.cook])) L.cook = cook;
          if (cook && named.length && (!L.ncook || COOK_N[cook] >= COOK_N[L.ncook])) L.ncook = cook;
          if (coat && L.part === 'solid') L.coat = coat;
        });
        if (!named.length) {
          if (cook && (!mo.cook || COOK_N[cook] >= COOK_N[mo.cook])) mo.cook = cook;
          if (cut === 'slices' || cut === 'shreds') mo.cut = cut;
        }
        if (/portion into balls|into balls|ball the|roll into balls|\bballs? of\b/.test(t)) mo.shape = 'balls';
        else if (/(shape|form|press) (it |them )?into patt|\bpatties\b/.test(t)) mo.shape = 'patty';
        else if (/\bpull(ed)?\b/.test(t)) mo.shape = 'pulled';
        if (/\b(mix|combine|toss|stir through|fold)\b/.test(t)) mo.mixed = true;
        if (/\bsyrup\b|\bdressing\b|\bdress(ed)?\b|\bglaze\b|\bliquid\b/.test(t)) mo.wet = true;
        if (named.length) cur = named;
      });
    });
  }
  var cache = {};
  function sig(r) { return (r.id || '') + '|' + P.hash(JSON.stringify([r.name, r.kind, r.ingredients, r.sections])); }
  // what a card makes: { id, name, form, cook, wet, base, lines, col, liq, from, drawn, raw, bought }
  function read(r, depth, seen) {
    if (!r) return null;
    var k = sig(r);
    if (cache[k]) return cache[k];
    depth = depth || 0;
    seen = Object.assign({}, seen || {}); seen[r.id] = 1;
    var mo = { id: r.id, sig: P.hash(k).toString(36), name: r.name || '', kind: r.kind || '', lines: [], plating: [], cook: '', cut: '', shape: '', mixed: false, wet: false };
    (r.ingredients || []).forEach(function (i0) { S().split(i0).forEach(function (i) { mo.lines.push(lineOf(i, depth, seen)); }); });
    readSteps(r, mo);
    decide(mo, r);
    return (cache[k] = mo);
  }
  function isSolid(L) { return L.part === 'solid'; }
  function sumG(list) { return list.reduce(function (s, L) { return s + (L.g || 0); }, 0); }
  function decide(mo, r) {
    var nm = low(r.name), visible = mo.lines.filter(function (L) { return L.part !== 'hidden'; });
    var steps = JSON.stringify(r.sections || '');
    mo.bought = visible.length <= 1 && /bought in/i.test(steps + ' ' + (r.yield || '') + ' ' + visible.map(function (L) { return L.i.note || ''; }).join(' '));
    mo.form = formOf(mo, nm);
    // in a sauce or a purée, butter, cream and cheese melt into it; in a mix they are pieces
    if (/liquid|smooth/.test(mo.form)) mo.lines.forEach(function (L) {
      if (L.part !== 'solid') return;
      if (L.lq && (!L.raw || MELT.test(L.t))) { L.part = 'liquid'; L.col = L.lq[0]; }
      else if (MELT.test(L.t)) { L.part = 'liquid'; L.lq = [L.col, 0.5]; }
    });
    var solids = mo.lines.filter(isSolid);
    mo.base = solids.reduce(function (b, x) { return !b || (x.g || 0) > (b.g || 0) ? x : b; }, null);
    // a mix or a dough is not served raw: the dish draws it cooked
    mo.raw = /\b(mix|dough|batter)\b/.test(nm) || mo.shape === 'balls';
    mo.liq = liqColour(mo);
    if (mo.form === 'mixture' && mo.liq && mo.lines.some(function (L) { return L.part === 'liquid' && L.lq && L.lq[0] && (L.lq[1] >= 0.4 || L.sub); })) mo.wet = true;
    // a dough is the colour of its flour, butter and sugar, with what is in it (chocolate) as pieces
    if (/\bdough\b|\bbatter\b/.test(nm) && mo.lines.some(function (L) { return L.part === 'coat' && L.g >= (mo.base ? mo.base.g : 0) * 0.8; })) mo.dough = '#E8C9A0';
    mo.col = colourOf(mo);
    mo.from = fromNames(mo);
    mo.drawn = !/^(unknown|coat|plate)$/.test(mo.form);
  }
  function formOf(mo, nm) {
    var solids = mo.lines.filter(isSolid), liq = mo.lines.filter(function (L) { return L.part === 'liquid'; });
    if (/\b(batter|crumb mix|flour|dry rub|\brub\b|seasoning|brine|marinade|spice mix)\b/.test(nm) && !/butter/.test(nm)) return 'coat';
    // two things side by side ("Chips and Salad") are drawn as two parts by the dish
    if (/\b(chips|fries|wedges|mash)\b.* and |\band (salad|chips|slaw)\b/.test(nm)) return 'plate';
    if (/\b(sauce|gravy|jus|dressing|syrup|coulis|butterscotch|custard|glaze|broth|soup|laksa|curry|bolognese|ragu|gravy)\b/.test(nm)) return 'liquid';
    if (/\b(aioli|mayo|mayonnaise|hummus|puree|dip|whip|mousse|mash|jam|chutney|pesto|spread|relish)\b/.test(nm)) return 'smooth';
    if (/\bbutter\b/.test(nm)) return 'pat';
    if (mo.shape === 'balls') return 'balls';
    if (/\b(salad|slaw|salsa|pickles?|candy|kimchi|greens|vegetables|veg|cucumber|granola|mix)\b/.test(nm) && solids.length) return 'mixture';
    if (mo.mixed && solids.length >= 2) return 'mixture';
    if (sumG(liq) > sumG(solids) * 1.2 && liq.some(function (L) { return L.lq && L.lq[1] >= 0.4; })) return 'liquid';
    if (solids.length === 1) return 'piece';
    var base = solids.reduce(function (b, x) { return !b || (x.g || 0) > (b.g || 0) ? x : b; }, null);
    if (base && base.g && base.g >= sumG(solids) * 0.6 && !mo.mixed) return 'piece';
    if (solids.length >= 2) return 'mixture';
    return liq.length ? 'liquid' : 'unknown';
  }
  // the colour of the liquid the card's pieces sit in (the turmeric syrup, the dressing), '' when dry
  function liqColour(mo) {
    var liq = mo.lines.filter(function (L) { return L.part === 'liquid' && L.lq && L.lq[0]; }), tints = mo.lines.filter(function (L) { return L.part === 'tint' && !L.rub; });
    var col = '', w = 0;
    liq.forEach(function (L) { var s = (L.g || 100) * L.lq[1]; col = col ? mix(col, L.lq[0], s / (w + s)) : L.lq[0]; w += s; });
    // a pinch of turmeric turns a whole pot of syrup: strong colours count far more than their weight (the gochujang
    // over the soy, by how much of each)
    var tc = '', tw = 0;
    tints.forEach(function (L) { var s = L.g || 10; tc = tc ? mix(tc, L.col, s / (tw + s)) : L.col; tw += s; });
    // a paste that is a good part of the card (the gochujang in the Korean dressing) colours it more than a pinch does
    var all = mo.lines.reduce(function (t, L) { return t + (L.part === 'hidden' ? 0 : L.g || 0); }, 0) || 1;
    if (tc) col = col ? mix(col, tc, Math.min(0.85, 0.5 + tw / all)) : tc;
    if (!col && (mo.wet || mo.form === 'liquid') && tints.length) col = tints[0].col;
    return col ? snap(col) : '';
  }
  // what a cook does to a colour, measured from the book's raw and cooked drawings of the same food
  function cooked(c, cook) {
    if (!c) return c;
    switch (cook) {
      case 'charred': return mix(c, '#3F2812', 0.28);
      case 'grilled': return mix(c, '#6B4420', 0.2);
      case 'fried': return toHsl(c)[2] > 0.55 ? mix(c, '#E0AA58', 0.5) : mix(c, '#6B4420', 0.2);
      case 'roasted': return mix(c, '#B9772E', 0.25);
      case 'baked': return toHsl(c)[2] > 0.55 ? mix(c, '#C98A45', 0.3) : mix(c, '#8A4B2D', 0.45);
      case 'smoked': return mix(c, '#5E2F1A', 0.35);
      case 'caramelised': return mix(c, '#C99A22', 0.4);
      case 'seared': return mix(c, '#8A4B2D', 0.3);
      case 'toasted': return mix(c, '#D9A24E', 0.3);
      case 'braised': return mix(c, '#6B4420', 0.3);
      case 'steamed': case 'poached': return ST.lift(c, 0.06);
      default: return c;
    }
  }
  function colourOf(mo) {
    if (mo.form === 'liquid') {
      // only a library sauce that shares the card's own word (butterscotch, not just "dressing")
      var sm = S().rank(mo.name, { cat: 'sauce' })[0], sit = sm && sm.s >= 0.9 ? LIB.get(sm.id) : null, w0 = S().key(mo.name).split(' ')[0];
      if (sit && S().key(sit.name + ' ' + sit.kw).split(' ').indexOf(w0) < 0) sit = null;
      return snap((sit && sit.side && sit.side.c) || LIB.sauceColour(mo.name) || mo.liq || (mo.base ? cooked(mo.base.col, mo.base.cook || mo.cook) : '#8A5A34'));
    }
    // a purée, a jam, a mash: what is blended in colours it, by weight (the spinach and the cream)
    if (mo.form === 'smooth') {
      var col = '', w = 0;
      mo.lines.forEach(function (L) {
        // blended greens go deep green (the spinach purée), the way the book draws them
        var c = isSolid(L) && !/^(seed|speck|herb|fleck)$/.test(kindOf(L)) ? (L.raw && L.raw.k === 'leaf' ? ST.sink(L.col, 0.3) : cooked(L.col, L.cook)) : L.part === 'liquid' && L.lq && L.lq[0] ? L.lq[0] : L.part === 'tint' && !L.rub ? L.col : '';
        if (!c) return;
        var s = (L.g || 100) * (isSolid(L) ? 3 : L.part === 'tint' ? 3 : L.lq[1]);
        col = col ? mix(col, c, s / (w + s)) : c; w += s;
      });
      return snap(col || LIB.sauceColour(mo.name) || '#F3E6C2');
    }
    if (mo.dough) return snap(cooked(mo.dough, mo.cook));
    var bed = beds(mo)[0];
    if (bed) return snap(bed.col);
    if (mo.wet && mo.liq) return mo.liq;
    return mo.base ? snap(cooked(mo.base.col, mo.base.cook || mo.cook)) : '#C9A46A';
  }
  function beds(mo) {
    var rank = function (L) { return /leaf|shred/.test(L.raw.k) ? 1 : 0; };
    return mo.lines.filter(function (L) { return isSolid(L) && L.raw && L.raw.bed; }).sort(function (a, b) { return rank(b) - rank(a) || chroma(b.col) - chroma(a.col) || (b.g || 0) - (a.g || 0); });
  }
  function fromNames(mo) {
    var out = [];
    var sauce = /liquid|smooth/.test(mo.form);
    mo.lines.forEach(function (L) {
      if ((L.part === 'solid' && !(sauce && GONE.test(L.t))) || L.part === 'tint' || L.part === 'bits' || (L.part === 'liquid' && L.lq && L.lq[1] >= 0.6 && L.sub)) out.push(L.ing.replace(/,.*$/, ''));
    });
    // what it mostly is first ("Jalapeños, turmeric, mustard seed")
    if (mo.base && out.indexOf(mo.base.ing.replace(/,.*$/, '')) > 0) { out.splice(out.indexOf(mo.base.ing.replace(/,.*$/, '')), 1); out.unshift(mo.base.ing.replace(/,.*$/, '')); }
    return out;
  }

  /* ---------- the small things, drawn the way js/art.js draws them ----------
     Each takes the spot (x, y), a size s (1 is the size on a plate), the colour, the line it shows and the random. */
  var BIT = {
    ring: function (x, y, s, c, L, q) {
      var r = (L.raw && L.raw.small ? 2.4 : 4.6) * s, out = P.circle(x, y, r, 'none', c, r * 0.46);
      if (L.raw && L.raw.seed) out += P.circle(x - r * 0.2, y + r * 0.08, r * 0.1, L.raw.seed) + P.circle(x + r * 0.2, y - r * 0.12, r * 0.1, L.raw.seed);
      return out;
    },
    mslice: function (x, y, s, c, L, q) { var w = 5 * s; return P.g(P.at(x, y, q() * 360 - 180), P.path('M' + n1(-w) + ' 0 Q0 ' + n1(-w * 1.25) + ' ' + n1(w) + ' 0 L' + n1(w * 0.8) + ' ' + n1(w * 0.6) + ' L' + n1(-w * 0.8) + ' ' + n1(w * 0.6) + ' Z', c, ST.edge(c), 0.7)); },
    strip: function (x, y, s, c, L, q) { var a = q() * Math.PI, l = 5.5 * s; return P.line(x - Math.cos(a) * l, y - Math.sin(a) * l, x + Math.cos(a) * l, y + Math.sin(a) * l, c, 1.7 * s); },
    shred: function (x, y, s, c, L, q) { var a = q() * Math.PI, l = 6 * s, b = (q() - 0.5) * 4 * s; return P.path('M' + n1(x - Math.cos(a) * l) + ' ' + n1(y - Math.sin(a) * l) + ' Q' + n1(x - Math.sin(a) * b) + ' ' + n1(y + Math.cos(a) * b) + ' ' + n1(x + Math.cos(a) * l) + ' ' + n1(y + Math.sin(a) * l), 'none', c, 1.5 * s, { 'stroke-linecap': 'round' }); },
    kernel: function (x, y, s, c) { return P.circle(x, y, 1.5 * s, c, ST.edge(c), 0.4 * s); },
    dice: function (x, y, s, c, L, q) { var w = 3.2 * s; return P.rect(x - w / 2, y - w / 2, w, w, 0.8 * s, c, ST.edge(c), 0.6 * s, { transform: 'rotate(' + Math.round(q() * 90) + ' ' + n1(x) + ' ' + n1(y) + ')' }); },
    slice: function (x, y, s, c, L) { var r = 4 * s, f = (L.raw && L.raw.f) || ST.lift(c, 0.5); return P.circle(x, y, r, c, ST.edge(c), 0.6 * s) + P.circle(x, y, r * 0.74, f); },
    half: function (x, y, s, c, L) { var r = 3.6 * s, f = (L.raw && L.raw.f) || ST.lift(c, 0.3); return P.circle(x, y, r, c, ST.edge(c), 0.6 * s) + P.circle(x, y, r * 0.68, f) + P.circle(x - r * 0.25, y, r * 0.12, '#F3E3B8') + P.circle(x + r * 0.25, y + r * 0.1, r * 0.12, '#F3E3B8'); },
    floret: function (x, y, s, c, L, q) {
      var r = 2.6 * s, e = ST.edge(c), out = P.path('M' + n1(x) + ' ' + n1(y + r) + ' L' + n1(x + r * 0.2) + ' ' + n1(y + r * 2.4), 'none', ST.lift(c, 0.35), 1.6 * s, { 'stroke-linecap': 'round' });
      [[-0.8, 0], [0.8, 0], [0, -0.8], [0, 0.4]].forEach(function (o) { out += P.circle(x + o[0] * r, y + o[1] * r, r, c, e, 0.5 * s); });
      return out + P.circle(x - r * 0.4, y - r * 0.9, r * 0.35, ST.lift(c, 0.4), null, 0, { opacity: ST.hi });
    },
    green: function (x, y, s, c, L, q) {
      var a = q() * 360, l = 12 * s, w = 6.5 * s, f = (L.raw && L.raw.f) || ST.lift(c, 0.6);
      return P.g(P.at(x, y, a), P.path(P.leafD(l, w), c, ST.edge(c), 0.6 * s) + P.path('M' + n1(-l * 0.5) + ' 0 L' + n1(l * 0.1) + ' 0', 'none', f, 2.2 * s, { 'stroke-linecap': 'round' }));
    },
    leaf: function (x, y, s, c, L, q) { var col = q() < 0.4 ? ST.lift(c, 0.18) : c; return P.leaf(9 * s, 5 * s, col, x, y, q() * 360, { edge: ST.edge(col), ew: 0.5 * s, vw: 0.5 * s }); },
    herb: function (x, y, s, c, L, q) { return P.ellipse(x, y, 1.3 * s, 0.55 * s, c, null, 0, { transform: 'rotate(' + Math.round(q() * 180) + ' ' + n1(x) + ' ' + n1(y) + ')' }); },
    seed: function (x, y, s, c) { var r = 0.85 * s; return P.circle(x, y, r, c, ST.edge(c), 0.25 * s) + P.circle(x - r * 0.3, y - r * 0.3, r * 0.35, ST.lift(c, 0.55), null, 0, { opacity: '0.7' }); },
    nut: function (x, y, s, c, L, q) { return P.ellipse(x, y, 1.8 * s, 1.1 * s, c, ST.edge(c), 0.35 * s, { transform: 'rotate(' + Math.round(q() * 180) + ' ' + n1(x) + ' ' + n1(y) + ')' }); },
    speck: function (x, y, s, c) { return P.circle(x, y, 0.6 * s, c); },
    fleck: function (x, y, s, c, L, q) { var sh = [ST.sink(c, 0.25), c, ST.lift(c, 0.3)][Math.floor(q() * 3)]; return P.ellipse(x, y, (0.6 + q() * 0.5) * s, (0.45 + q() * 0.4) * s, sh, null, 0, { transform: 'rotate(' + Math.round(q() * 180) + ' ' + n1(x) + ' ' + n1(y) + ')' }); },
    chunk: function (x, y, s, c, L, q) { var w = 7 * s, h = 3.6 * s; return P.rect(x - w / 2, y - h / 2, w, h, h * 0.45, c, ST.edge(c), 0.6 * s, { transform: 'rotate(' + Math.round(q() * 180) + ' ' + n1(x) + ' ' + n1(y) + ')' }) + P.line(x - w * 0.3, y - h * 0.12, x + w * 0.25, y - h * 0.12, ST.lift(c, 0.35), 0.7 * s, { opacity: '0.8' }); },
    crumble: function (x, y, s, c, L, q) { return P.path(P.blob(q, 1.6 * s, 1.3 * s, 0.3, 6, x, y), c, ST.edge(c), 0.4 * s); },
    grain: function (x, y, s, c, L, q) { return P.ellipse(x, y, 1.1 * s, 0.5 * s, c, ST.edge(c), 0.25 * s, { transform: 'rotate(' + Math.round(q() * 180) + ' ' + n1(x) + ' ' + n1(y) + ')' }); }
  };
  // how a line is drawn small: the card's own cut first, then what the ingredient usually is
  function kindOf(L) {
    if (L.kind) return L.kind;
    if (L.part === 'tint') return 'fleck';
    var t = L.t, c = L.cut, k = L.raw ? L.raw.k : 'dice';
    if (/seeds?\b/.test(t) && !/seeded|deseed/.test(t) && k !== 'nut') return 'seed';
    if (k === 'herb' || k === 'seed' || k === 'nut' || k === 'mslice' || k === 'floret' || k === 'green' || k === 'grain' || k === 'crumble') return k;
    if (k === 'ring' && (!c || c === 'slices' || c === 'rings')) return 'ring';
    if (c === 'rings') return 'ring';
    if (c === 'julienne') return 'strip';
    if (c === 'shreds' || c === 'grated') return 'shred';
    if (c === 'kernels') return 'kernel';
    if (c === 'florets') return 'floret';
    if (c === 'dice' || c === 'minced') return 'dice';
    if (c === 'slices') return k === 'strip' || k === 'shred' || k === 'leaf' ? k : 'slice';
    if (c === 'halves' || c === 'wedges') return k === 'dice' ? 'half' : k === 'strip' ? 'chunk' : k;
    return k;
  }
  // a line's colour as it shows in the card: its own, cooked the way the card cooks it, a jalapeño now and then red
  function lineCol(L, mo, q) {
    var c = L.col || '#C9A46A';
    if (L.raw && L.raw.alt && q() < 0.3) c = L.raw.alt;
    c = cooked(c, L.cook || (L.part === 'solid' && mo.cook !== 'steamed' ? mo.cook : ''));
    // pieces sitting in a coloured syrup or dressing take a little of it
    if (mo.liq && mo.wet && L.part === 'solid' && !/seed|herb|speck|fleck/.test(kindOf(L))) c = mix(c, mo.liq, 0.1);
    return c;
  }

  /* ---------- drawing a card as a part of a dish ---------- */
  // a mix (a salad, the slaw, the Cowboy candy): the bed it sits on or the syrup it sits in, the pieces of each line by
  // their share, gloss on what is wet, and seeds and specks on top
  function drawMix(mo, rnd, rx, ry) {
    var bd = beds(mo), bed = bd[0], wet = mo.wet && mo.liq, out = '', pts = P.blobPts(rnd, rx, ry, 0.1, 12), d = P.smooth(pts);
    // a mix made from another card's mix (the slaw side is the slaw with chives): that one first, then what this card adds
    var sub = mo.lines.filter(function (L) { return isSolid(L) && L.sub && L.sub.form === 'mixture'; })[0];
    if (sub) {
      out = drawMix(sub.sub, rnd, rx, ry);
      mo.lines.forEach(function (L) {
        if (!isSolid(L) || L === sub || /^(seed|speck|herb|fleck)$/.test(kindOf(L))) return;
        P.spots(rnd, 6, rx * 0.66, ry * 0.6, 4).forEach(function (p) { out += BIT[kindOf(L)](p[0], p[1], 0.9, snap(lineCol(L, mo, rnd)), L, rnd); });
      });
      return out + bitsOn(mo, rnd, rx * 0.7, ry * 0.6);
    }
    out += shadowD(d, 1.5, 2);
    if (bed) {
      var bc = snap(lineCol(bed, mo, rnd));
      out += fill(d, bc);
      out += P.path(P.blob(rnd, rx * 0.6, ry * 0.5, 0.15, 9, -rx * 0.15, -ry * 0.2), ST.lift(bc, 0.12), null, 0, { opacity: '0.6' });
    } else if (wet) out += fill(d, mo.liq, 0.8) + gloss(rnd, rx, ry, mo.liq, 2.6);
    // the pieces, mixed through: each line gets spots by its share (at least two each), handed out in turn
    var lines = mo.lines.filter(function (L) { return isSolid(L) && L !== bed; }).concat(bd.slice(1)), tot = sumG(lines) || lines.length;
    var want = lines.map(function (L) { return Math.max(2, Math.min(12, Math.round(((L.g || tot / lines.length) / tot) * 22))); });
    var order = [], left = want.slice();
    while (left.some(function (n) { return n > 0; })) left.forEach(function (n, k) { if (n > 0) { order.push(k); left[k]--; } });
    var spots = P.spots(rnd, order.length, rx * 0.72, ry * 0.66, 3);
    order.forEach(function (k, j) {
      var L = lines[k], p = spots[j];
      if (!p) return;
      out += BIT[kindOf(L)](p[0], p[1], bed ? 0.9 : 1, snap(lineCol(L, mo, rnd)), L, rnd);
    });
    // the bed's own shreds or leaves over the top, so the pieces sit in it
    if (bed) {
      var bk = kindOf(bed), bc2 = snap(lineCol(bed, mo, rnd));
      P.spots(rnd, 7, rx * 0.75, ry * 0.68, 4).forEach(function (p) { out += BIT[bk](p[0], p[1], 0.9, ST.lift(bc2, 0.15), bed, rnd); });
    }
    if (wet && bed) out += gloss(rnd, rx * 0.8, ry * 0.8, mo.liq, 1.8);
    out += bitsOn(mo, rnd, rx * 0.7, ry * 0.6);
    return out;
  }
  // seeds, specks, herb flecks and a rub's flecks over a part
  function bitsOn(mo, rnd, rx, ry, only) {
    var out = '';
    mo.lines.forEach(function (L) {
      if (only && !only(L)) return;
      var k = kindOf(L), small = /^(seed|speck|herb|fleck)$/.test(k);
      if (!(L.part === 'bits' || (L.part === 'tint' && L.rub) || (isSolid(L) && small))) return;
      var c = L.part === 'tint' ? L.col : snap(lineCol(L, mo, rnd)), count = k === 'fleck' ? 16 : k === 'speck' ? 7 : 9;
      P.spots(rnd, count, rx, ry).forEach(function (p) { out += BIT[k](p[0], p[1], 1, c, L, rnd); });
    });
    return out;
  }
  // a sauce, a purée or a butter: the library's shape for it in its colour, what shows in it on top
  function drawOnShape(mo, shape, col, rnd) {
    var body = LIB.body(shape.id), from = shape.side && shape.side.c;
    if (col && from && col !== from) body = recolour(body, R.tintMap(body, from, col));
    var bx = LIB.box(shape), rx = (bx[2] - bx[0]) * 0.27, ry = (bx[3] - bx[1]) * 0.24, cx = (bx[0] + bx[2]) / 2, cy = (bx[1] + bx[3]) / 2 - (bx[3] - bx[1]) * 0.04;
    var bits = '';
    mo.lines.forEach(function (L) {
      var k = kindOf(L);
      if (!(isSolid(L) && !GONE.test(L.t) && !/^(seed|speck|herb|fleck)$/.test(k)) || mo.form === 'smooth') return;
      P.spots(rnd, 5, rx, ry, 4).forEach(function (p) { bits += BIT[k](cx + p[0], cy + p[1], 0.8, snap(lineCol(L, mo, rnd)), L, rnd); });
    });
    bits += bitsOn(mo, rnd, rx, ry);
    return bits ? { body: body + finish(bits), box: bx, w: shape.w, h: shape.h, lib: body.length } : null;
  }
  function recolour(body, cm) { return cm ? body.replace(/#([0-9A-Fa-f]{6})/g, function (m, h) { return cm[h.toUpperCase()] || m; }) : body; }
  // balls (a rissole mix, a cookie dough): each with its shadow, a highlight up to the left and flecks of what is in it
  function drawBalls(mo, rnd, count) {
    var col = snap(cooked(mo.dough || (mo.base ? mo.base.col : '#8A4B2D'), mo.cook || (mo.base && mo.base.cook))), r = 7, out = '', pts = [];
    for (var k = 0; k < count; k++) pts.push([(k - (count - 1) / 2) * r * 2.1, (k % 2 ? 1 : -1) * r * 0.35]);
    var inc = mo.lines.filter(function (L) { return isSolid(L) && (L !== mo.base || mo.dough) && !GONE.test(L.t); });
    pts.forEach(function (p) {
      out += P.circle(p[0] + 1.6, p[1] + 1, r, '#000000', null, 0, { opacity: '0.10' }) + P.circle(p[0], p[1], r, col, ST.edge(col), 0.8) + P.circle(p[0] - r * 0.3, p[1] - r * 0.3, r * 0.36, ST.lift(col, 0.22), null, 0, { opacity: ST.hi });
      inc.slice(0, 2).forEach(function (L) { var q = P.inEllipse(rnd, r * 0.6, r * 0.6); out += P.circle(p[0] + q[0], p[1] + q[1], 0.9, snap(lineCol(L, mo, rnd))); });
      out += P.circle(p[0] + r * 0.3, p[1] + r * 0.25, 0.9, ST.sink(col, 0.35));
    });
    return { body: out, box: [-count * r * 1.05 - 1, -r * 1.4, count * r * 1.05 + 2.6, r * 1.4 + 1], w: count * r * 2.1 + 4, h: r * 2.8 + 2 };
  }

  /* ---------- a whole dish from its parts ----------
     A burger or a sandwich from above, the way js/art.js draws them: the bun on top, and what is in it peeking out under
     it (a frilly ring of lettuce, a corner of cheese, the edge of a tomato slice, beetroot, bacon, an egg). The layers
     are the dish's own, so a smash burger looks like a smash burger and a works burger shows its beetroot and egg. */
  var PEEK = [
    [/oak|lettuce|cos|iceberg|leaf|leaves|rocket|mesclun|spinach|slaw|cabbage/, 'leaf'], [/cheese|cheddar|swiss|mozzarella|american|brie|haloumi/, 'cheese'],
    [/tomato(?! sauce| relish| ketchup)/, 'tomato'], [/beetroot/, 'beet'], [/bacon|ham\b/, 'bacon'], [/\begg\b/, 'egg'], [/pineapple/, 'pine'],
    [/onion/, 'onion'], [/pickle|gherkin|cornichon/, 'pickle'], [/avocado|guac/, 'avo'], [/jalape/, 'jal']
  ];
  function peekOf(name) { var t = low(name); for (var k = 0; k < PEEK.length; k++) if (PEEK[k][0].test(t)) return PEEK[k][1]; return ''; }
  function stack(dish, bun, fillings) {
    var rnd = P.rng('stack:' + (dish && dish.id)), bn = low(bun || ''), roll = /turkish|baguette|sub\b|hot dog|roll\b(?!.*bun)|ciabatta|panini/.test(bn), R0 = 46, out = '', seen = {};
    var kinds = (fillings || []).map(peekOf).filter(function (k) { if (!k || seen[k]) return false; seen[k] = 1; return true; });
    var green = (fillings || []).some(function (f) { return /^(oak leaf|red oak( lettuce)?)$/.test(low(f).trim()); });
    if (roll) {
      // a Turkish roll: a long rounded loaf, turned a little, with the lettuce and tomato showing at its ends
      var w = 132, h = 66, inner = '';
      inner += P.rect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, 26, '#000000', null, 0, { opacity: ST.shadow, transform: 'translate(3 4)' });
      if (seen.leaf) inner += P.rect(-w / 2, -h / 2, w, h, 28, '#7EA453');
      if (seen.tomato) inner += P.rect(w / 2 - 14, -5, 18, 10, 3, '#D9473B');
      if (seen.cheese) inner += P.rect(-w / 2 - 4, 6, 16, 12, 2, '#F2C14E');
      inner += P.rect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, 26, '#D9A869', '#B9803A', 1.2) + P.rect(-w / 2 + 11, -h / 2 + 11, w - 22, h - 22, 20, '#E3B67A');
      for (var k = 0; k < 28; k++) { var q = P.inEllipse(rnd, w * 0.4, h * 0.32); inner += P.circle(q[0], q[1], 0.7 + rnd() * 0.6, k % 2 ? '#C99A5E' : '#F6EBD3'); }
      out = P.g('rotate(-14)', inner);
      return { body: finish(out), box: [-74, -52, 74, 52], w: 148, h: 104 };
    }
    // a round bun: its shadow, then the layers under it peeking out, then the bun and its highlight
    out += P.circle(3, 4, R0 + 4, '#000000', null, 0, { opacity: ST.shadow });
    if (seen.leaf) out += green ? P.circle(0, 0, R0 + 6, '#7EA453') + P.circle(0, 0, R0 + 6, 'none', '#8C3B47', 5, { 'stroke-dasharray': '6 9' }) : P.circle(0, 0, R0 + 2, 'none', '#7EA453', 7, { 'stroke-dasharray': '7 5' });
    if (seen.egg) out += P.path(P.blob(rnd, R0 + 9, R0 + 5, 0.08, 10), '#FFFFFF', ST.edge('#F6F1E4'), 1);
    if (seen.cheese) out += P.rect(-R0 - 2, -R0 * 0.55, R0 * 0.65, R0 * 0.65, 0, '#F2C14E', null, 0, { transform: 'rotate(20 ' + n1(-R0 * 0.7) + ' ' + n1(-R0 * 0.22) + ')' });
    if (seen.bacon) out += P.rect(R0 * 0.55, -R0 * 0.95, R0 * 0.7, 9, 3, '#B5503F', ST.edge('#B5503F'), 0.8, { transform: 'rotate(-35 ' + n1(R0 * 0.9) + ' ' + n1(-R0 * 0.9) + ')' });
    if (seen.beet) out += P.rect(-R0 * 1.1, R0 * 0.1, 22, 16, 7, '#6E1F3A', null, 0, { transform: 'rotate(-25 ' + n1(-R0) + ' ' + n1(R0 * 0.35) + ')' });
    if (seen.pine) out += P.path('M' + n1(R0 * 0.2) + ' ' + n1(R0 * 0.98) + ' A' + R0 * 0.5 + ' ' + R0 * 0.5 + ' 0 0 0 ' + n1(R0 * 0.95) + ' ' + n1(R0 * 0.35), 'none', '#F2CB55', 8, { 'stroke-linecap': 'round' });
    if (seen.onion) out += P.path('M' + n1(-R0 * 0.85) + ' ' + n1(R0 * 0.6) + ' A' + R0 * 0.45 + ' ' + R0 * 0.45 + ' 0 0 0 ' + n1(-R0 * 0.2) + ' ' + n1(R0 * 1.02), 'none', '#9B4A86', 3, { 'stroke-linecap': 'round' });
    if (seen.pickle) out += P.circle(R0 * 0.98, -R0 * 0.2, 6, '#6E8F2B', ST.edge('#6E8F2B'), 0.8) + P.circle(R0 * 0.98, -R0 * 0.2, 4, '#9CB45A');
    if (seen.avo) out += P.path(P.blob(rnd, 12, 8, 0.12, 8, -R0 * 0.2, -R0 * 1.0), '#A6C45E', ST.edge('#A6C45E'), 0.8);
    if (seen.jal) out += P.circle(R0 * 0.5, R0 * 0.9, 5, 'none', '#6E8F2B', 2.4);
    if (seen.tomato) out += P.circle(R0 * 0.75, R0 * 0.6, 15, '#D9473B') + P.circle(R0 * 0.75, R0 * 0.6, 10, '#EC6A5C');
    var col = /brioche/.test(bn) ? '#B9772E' : '#C98A45', top = /brioche/.test(bn) ? '#C98A45' : '#D99A50';
    out += P.circle(0, 0, R0, col) + P.circle(-3, -3, R0 * 0.86, top) + P.ellipse(-11.5, -14.7, 19.3, 9.2, ST.lift(top, 0.35), null, 0, { opacity: '0.85' });
    if (/sesame/.test(bn)) for (var s2 = 0; s2 < 14; s2++) { var p2 = P.inEllipse(rnd, R0 * 0.7, R0 * 0.62); out += P.ellipse(p2[0], p2[1], 2.2, 1.2, '#F7E9CC', null, 0, { transform: 'rotate(' + Math.round(rnd() * 180) + ' ' + n1(p2[0]) + ' ' + n1(p2[1]) + ')' }); }
    return { body: finish(out), box: [-R0 - 12, -R0 - 12, R0 + 12, R0 + 12], w: R0 * 2 + 24, h: R0 * 2 + 24 };
  }
  // the burger or sandwich as a part: { raw, body, box, role main, form stack, dr the library piece it stands for }
  function stackPart(dish, bun, fillings, libId) {
    var got = stack(dish, bun, fillings), lib = LIB.get(libId) || {};
    return { id: 'stack-' + (dish ? dish.id : 'x'), v: 1, raw: true, key: 'raw:stack-' + (dish ? dish.id : 'x') + '-' + P.hash(got.body).toString(36), dr: libId, name: lib.name || 'Burger',
      cat: lib.cat || 'bread', role: 'main', form: 'stack', g: lib.g, n: lib.n || 1, w: n1(got.w), h: n1(got.h), side: lib.side || { s: 'mound', h: 30, c: '#C98A45' }, body: got.body, box: got.box.map(n1), from: [], cook: '', lib: 0 };
  }

  /* A batch recipe in its GN pan, the way js/art.js draws the book's pans: the pan filled to its edges with what the card
     makes. A sauce is its colour with wide soft gloss and what shows in it; a mix is its bed with the pieces through it;
     balls sit in rows on baking paper; a butter is rolled into logs. One piece (a brisket, the rice) stays the library's. */
  function panFill(mo, rx, ry) {
    var rnd = P.rng('pan:' + mo.id), out = '', w = rx * 2, h = ry * 2, k, bits = '';
    var rectD = function (c) { return P.rect(-rx, -ry, w, h, 6, c); };
    var waves = function (c, n) { var o = ''; for (var j = 0; j < n; j++) { var y = -ry + h * (j + 0.6) / (n + 0.2); o += P.path('M' + n1(-rx * 0.85) + ' ' + n1(y) + ' C' + n1(-rx * 0.5) + ' ' + n1(y - ry * 0.18) + ' ' + n1(-rx * 0.1) + ' ' + n1(y + ry * 0.2) + ' ' + n1(rx * 0.3) + ' ' + n1(y - ry * 0.05) + ' S' + n1(rx * 0.75) + ' ' + n1(y - ry * 0.12) + ' ' + n1(rx * 0.85) + ' ' + n1(y), 'none', ST.lift(c, 0.4), 5, { 'stroke-linecap': 'round', opacity: '0.65' }); } return o; };
    var scatterLines = function (lines, n, s) {
      var o = '', order = [], tot = sumG(lines) || lines.length;
      lines.forEach(function (L, j) { var m = Math.max(3, Math.round(n * ((L.g || tot / lines.length) / tot))); for (var c = 0; c < m; c++) order.push(j); });
      // each piece wholly inside the pan
      P.spots(rnd, order.length, Math.max(4, rx * 0.92 - 5 * s), Math.max(4, ry * 0.9 - 5 * s), 6).forEach(function (p, j) { var L = lines[order[j]]; o += BIT[kindOf(L)](p[0], p[1], s, snap(lineCol(L, mo, rnd)), L, rnd); });
      return o;
    };
    // pieces as big as the book draws them in a pan: about ten across, as many as fit
    var big = Math.max(1.4, Math.min(5, w / 40)), count = Math.max(6, Math.min(40, Math.round(w * h / (big * big * 120))));
    if (mo.form === 'liquid' || mo.form === 'smooth') {
      var c0 = mo.col;
      out = rectD(c0) + waves(c0, 2);
      var sol = mo.lines.filter(function (L) { return isSolid(L) && !GONE.test(L.t) && !/^(seed|speck|herb|fleck)$/.test(kindOf(L)); });
      if (mo.form === 'liquid' && sol.length) bits += scatterLines(sol, count, big * 0.4);
      bits += bitsOn(mo, rnd, rx * 0.9, ry * 0.85);
      return finish(out + bits);
    }
    if (mo.form === 'mixture') {
      var bd = beds(mo), bed = bd[0], wet = mo.wet && mo.liq, lines = mo.lines.filter(function (L) { return isSolid(L) && L !== bed && !/^(seed|speck|herb|fleck)$/.test(kindOf(L)); });
      var leafy = bed && /leaf/.test(kindOf(bed));
      out = rectD(leafy ? '#ECEFF2' : bed ? snap(lineCol(bed, mo, rnd)) : wet ? mo.liq : '#F7F3EC');
      if (wet) out += waves(mo.liq, 2);
      out += scatterLines(lines.concat(bd.slice(1)), bed ? count * 2 : count, bed ? big * 0.55 : big);
      if (bed) out += scatterLines([bed], leafy ? count * 3 : count * 2, big * 0.55);
      out += bitsOn(mo, rnd, rx * 0.9, ry * 0.85);
      return finish(out);
    }
    if (mo.form === 'balls') {
      var col = snap(cooked(mo.dough || (mo.base ? mo.base.col : '#8A4B2D'), mo.cook || (mo.base && mo.base.cook))), r = 11, cols = Math.max(2, Math.floor(w / 30)), rows = Math.max(1, Math.floor(h / 26));
      var inc = mo.lines.filter(function (L) { return isSolid(L) && (L !== mo.base || mo.dough) && !GONE.test(L.t); });
      out = rectD('#F1E9D6') + P.line(-rx, ry - 6, rx, ry - 6, '#E3D8BC', 2);
      for (var yy = 0; yy < rows; yy++) for (var xx = 0; xx < cols; xx++) {
        var cx = -rx + w * (xx + 0.5) / cols, cy = -ry + h * (yy + 0.5) / rows;
        out += P.circle(cx + 6, cy + 2, r, '#000000', null, 0, { opacity: '0.10' }) + P.circle(cx, cy, r, col) + P.circle(cx - 3, cy - 3, 4, ST.lift(col, 0.22), null, 0, { opacity: '0.8' });
        inc.slice(0, 2).forEach(function (L, j) { out += P.circle(cx + (j ? -4 : 4), cy + 3, 1.2, snap(lineCol(L, mo, rnd))); });
      }
      return finish(out);
    }
    if (mo.form === 'pat') {
      var bc = mo.base ? snap(mo.base.col) : '#F3D675', logs = Math.max(1, Math.floor(h / 42)), tint = mo.lines.filter(function (L) { return L.part === 'tint'; })[0];
      out = rectD('#ECEFF2');
      for (k = 0; k < logs; k++) {
        var ly = -ry + h * (k + 0.5) / logs, lw = w * 0.78, lx = -rx + w * 0.06;
        out += P.rect(lx, ly - 16, lw, 32, 15, bc, ST.edge(bc), 1.5) + P.ellipse(lx + lw, ly, 8, 15, ST.lift(bc, 0.35), ST.edge(bc), 1.5) + P.path('M' + n1(lx + 10) + ' ' + n1(ly - 8) + ' C' + n1(lx + lw * 0.35) + ' ' + n1(ly - 13) + ' ' + n1(lx + lw * 0.7) + ' ' + n1(ly - 13) + ' ' + n1(lx + lw * 0.9) + ' ' + n1(ly - 8), 'none', ST.lift(bc, 0.55), 3, { 'stroke-linecap': 'round', opacity: '0.7' });
        if (tint) for (var f = 0; f < 18; f++) out += BIT.fleck(lx + 8 + rnd() * (lw - 16), ly - 11 + rnd() * 22, 1.2, tint.col, tint, rnd);
      }
      return finish(out);
    }
    return '';
  }
  // the pan part for a batch recipe's own drawing, or null (one piece: the library's piece fills the pan as before)
  function panPart(r, area) {
    var mo = read(r);
    if (!mo || !mo.drawn || mo.bought || mo.form === 'piece' || !area) return null;
    var rx = area.rx, ry = area.ry, body = panFill(mo, rx, ry);
    if (!body) return null;
    var names = mo.from.length ? mo.from : [mo.name], ings = [];
    // the card's own ingredient names, what it mostly is first: each gets its Pass label on the pan
    if (mo.base) ings.push(mo.base.ing);
    mo.lines.forEach(function (L) { if (ings.indexOf(L.ing) < 0 && (isSolid(L) || L.part === 'tint' || L.part === 'bits' || (L.part === 'liquid' && L.lq && L.lq[1] >= 0.6))) ings.push(L.ing); });
    if (!ings.length) return null;
    return { ings: ings, id: 'pan-' + mo.id, v: 1, raw: true, made: mo.id, ms: mo.sig, key: 'raw:pan-' + mo.id + '-' + P.hash(body).toString(36), name: mo.name, cat: 'prepared', role: 'main', form: 'layer', g: 0, n: 1,
      w: n1(rx * 2), h: n1(ry * 2), side: { s: 'layer', h: 20, c: mo.col }, body: body, box: [-rx, -ry, rx, ry].map(n1), from: names, cook: mo.cook || '', lib: 0 };
  }

  var ROLE = { liquid: 'sauce', smooth: 'sauce', pat: 'topping', balls: 'main' };
  // the part for a card in a dish: a piece of its own, or null when the library piece the dish has already says it all
  function compose(mo, ctx) {
    ctx = ctx || {};
    if (!mo || !mo.drawn) return null;
    var rnd = P.rng('compose:' + mo.id + ':' + mo.form), shape = ctx.shape, dessert = ctx.dish && ctx.dish.kind === 'dessert', got = null, role, form = mo.form, sideS = 'pile';
    if (form === 'piece') return null;
    if (form === 'liquid' || form === 'smooth') {
      if (!shape || shape.cat !== 'sauce') {
        var m = S().rank(mo.name, { cat: 'sauce' })[0];
        shape = LIB.get(m && m.s >= 0.6 ? m.id : form === 'smooth' ? 'sauce-dollop' : 'sauce-pool');
      }
      if (!/^(pool|dollop|quenelle|bowlful|smear|mound)$/.test(shape.form)) return null;
      got = drawOnShape(mo, shape, snap((mo.form === 'liquid' && LIB.sauceColour(ctx.ing || '')) || mo.col), rnd);
      if (!got) return null;
      role = shape.role; form = shape.form; sideS = shape.side ? shape.side.s : 'sauce';
    } else if (form === 'pat') {
      var pat = LIB.get(shape && shape.cat === 'dairy' ? shape.id : 'butter-pat'), base = mo.base ? snap(mo.base.col) : '#F3D675';
      var tints = mo.lines.filter(function (L) { return L.part === 'tint'; });
      if (!tints.length && !mo.lines.some(function (L) { return L.part === 'bits'; })) return null;
      var tinted = tints.reduce(function (c, L) { return mix(c, L.col, 0.08); }, base);
      var pb = recolour(LIB.body(pat.id), R.tintMap(LIB.body(pat.id), pat.side.c, tinted)), bb = LIB.box(pat);
      got = { body: pb + finish(bitsOn(mo, rnd, (bb[2] - bb[0]) * 0.32, (bb[3] - bb[1]) * 0.3)), box: bb, w: pat.w, h: pat.h, lib: pb.length };
      role = 'topping'; form = 'piece'; sideS = 'slab';
    } else if (form === 'mixture') {
      var solids = mo.lines.filter(isSolid), rx = 24, ry = 18;
      got = { body: finish(drawMix(mo, rnd, rx, ry)), box: [-rx - 2, -ry - 2, rx + 4, ry + 4], w: rx * 2 + 6, h: ry * 2 + 6 };
      var one = solids.length === 1 && solids[0].raw && solids[0].raw.lib ? LIB.get(solids[0].raw.lib) : null;
      role = beds(mo).length ? 'salad' : solids.length === 1 ? 'topping' : 'veg';
      if (one && one.role) role = one.role;
      if (solids.length === 1 && /ring|slice|seed|strip/.test(kindOf(solids[0]))) role = 'topping';
      form = 'pile'; sideS = beds(mo).length ? 'leafy' : 'pile';
    } else if (form === 'balls') {
      got = drawBalls(mo, rnd, 3); got.body = finish(got.body); role = 'main'; form = 'piece'; sideS = 'mound';
    }
    if (!got) return null;
    if (dessert && /sauce/.test(role)) role = 'dsauce';
    var key = 'raw:made-' + mo.id + '-' + P.hash(got.body).toString(36);
    return {
      id: 'made-' + mo.id, v: 1, raw: true, made: mo.id, key: key, ms: mo.sig, lib: got.lib || 0, name: mo.name, cat: ctx.shape ? ctx.shape.cat : 'prepared', role: role || ROLE[mo.form] || 'veg', form: form,
      g: mo.form === 'mixture' ? 60 : shape && shape.g ? shape.g : 40, n: undefined, w: n1(got.w), h: n1(got.h),
      side: { s: sideS, h: mo.form === 'mixture' ? 8 : 4, c: mo.col }, body: got.body, box: got.box.map(n1), from: mo.from, cook: mo.cook || ''
    };
  }
  // the part for an ingredient of a dish that has a card of its own: { ...piece } or null (the library piece stays)
  function partFor(i, dish, m) {
    if (m && m.why === 'learned') return null;
    var card = cardOf(i, dish);
    if (!card) return null;
    var mo = read(card);
    if (!mo || !mo.drawn || mo.bought) return null;
    // the dish takes one thing from the card ("Pak choy", prepped as on the Asian greens card): that thing, as the library has it
    var hw = heads(R.ingName(i)), solids = mo.lines.filter(isSolid);
    if (solids.length > 1 && hw.length && solids.some(function (L) { return L.hw.join(' ') === hw.join(' '); })) return null;
    var sure = m && m.id && m.conf >= 0.6 ? LIB.get(m.id) : null;
    // a mix or a dough shows cooked, the way the dish has it ("Lamb rissoles" from the rissole mix)
    if (mo.raw && sure) return null;
    return compose(mo, { shape: sure, ing: R.ingName(i), dish: dish });
  }

  /* ---------- an ingredient with no card, cut and cooked the way the dish says ----------
     "Broccolini (charred)", "Charred corn", "Seared scallops": the library piece it matched, in that cook's colour, with
     grill marks for a grill or char. Null when the piece already shows it (a grilled steak for "Grilled steak"), or the
     dish does not say. Only what the name, the note or a step that names the ingredient says counts. */
  var SHOWS = /^(charred|grilled|fried|roasted|smoked|toasted|caramelised|seared)$/;
  function dress(i, dish, m) {
    if (!m || !m.id || m.conf < 0.6 || m.why === 'learned') return null;
    var it = LIB.get(m.id);
    // a card of its own says how it is cooked; herbs, sauces, cheese and butter are not charred on a plate
    if (!it || !it.side || !it.side.c || i.link || !/^(meat|seafood|veg|potato|bread|prepared|grains|sweet)$/.test(it.cat) || /^(garnish|sauce|dsauce)$/.test(it.role)) return null;
    var name = R.ingName(i), t = low(name + ' ' + (i.note || '')).replace(NOT, ' '), mo = dish ? read(dish) : null;
    var L = mo ? mo.lines.filter(function (x) { return x.i === i || x.ing === name; })[0] : null, cook = cookIn(t) || (L && L.ncook) || '';
    if (!SHOWS.test(cook) || (L && L.sub)) return null;
    // smoke shows on meat and fish, caramel on onions and fruit; a crumbed or battered piece is already fried golden
    if ((cook === 'smoked' && !/meat|seafood/.test(it.cat)) || (cook === 'caramelised' && !/veg|sweet/.test(it.cat)) || (cook === 'fried' && /crumb|batter|fried/.test(it.cook || ''))) return null;
    var has = low([it.name, it.kw, it.cook].join(' '));
    if (it.cook === cook || has.indexOf(cook.slice(0, 4)) >= 0 || (cook === 'charred' && /grill|char|bbq/.test(has)) || (cook === 'seared' && /grill|sear|pan/.test(has))) return null;
    var body = LIB.body(it.id), col = snap(cooked(it.side.c, cook)), out = recolour(body, R.tintMap(body, it.side.c, col)), bx = LIB.box(it);
    // the bars of the grill, the way the book draws them on a steak
    if (cook === 'charred' || cook === 'grilled') out += finish(P.grill((bx[2] - bx[0]) * 0.36, (bx[3] - bx[1]) * 0.3, -32, Math.max(4, (bx[2] - bx[0]) * 0.16), '#3F2812', Math.max(1, (bx[2] - bx[0]) * 0.035)));
    return { id: it.id + '-' + cook, v: 1, raw: true, key: 'raw:dress-' + it.id + '-' + P.hash(out).toString(36), dr: it.id, name: cook.charAt(0).toUpperCase() + cook.slice(1) + ' ' + it.name.toLowerCase(), cat: it.cat, role: it.role, form: it.form,
      g: it.g, n: it.n, w: it.w, h: it.h, side: { s: it.side.s, h: it.side.h, c: col }, body: out, box: bx.map(n1), from: [], cook: cook, lib: 0 };
  }

  window.LK_COMPOSE = { read: read, compose: compose, partFor: partFor, dress: dress, stack: stackPart, panPart: panPart, cardOf: cardOf, ST: ST, snap: snap, palette: palette, cooked: cooked, BIT: BIT, kindOf: kindOf, RAW: RAW, COOK: COOK, CUT: CUT };
})();
