/*
  Leichhardt Kitchen Book
  Plain JavaScript, no build step. Recipes live in js/data.js, drawings in js/art.js.

  Pages (hash links, so the phone's back button works):
    #/settings         settings
    #/prep             the daily prep list (js/prep.js), #/admin is its admin panel
    #/                 landing page: pick Recipes, Prep or Orders
    #/recipes          the recipes, in the chosen view (Tiles, List or The Pass)
    #/orders           the order list (js/prep.js)
    #/r/barra/laksa    a recipe; the path is the trail you took to get there
*/
(function () {
  'use strict';

  var D = window.LK_DATA;
  var ART = window.LK_ART;
  var app = document.getElementById('app');

  var KIND = { main: 'Main', snack: 'Snack', side: 'Side', dessert: 'Dessert', batch: 'Batch recipe', component: 'Component' };
  var VIEWS = [
    { id: 'pass', name: 'The Pass', desc: 'Dishes as plates, batch recipes as pans. Tap the food to go deeper.' },
    { id: 'tiles', name: 'Tiles', desc: 'Every recipe as a card with its drawing, search and filters on top.' }
  ];
  var TEXT = [['normal', 'Normal'], ['large', 'Large'], ['xlarge', 'Extra large']];

  /* ---------- index: worked out once when the page loads ---------- */
  var byId = {}, usedIn = {}, rolled = {}, rows = {}, tags = {}, hay = {}, missing = {};
  // A recipe with no contains or check list gets them worked out from its ingredient tags.
  function fromTags(r) {
    r.contains = []; r.check = [];
    r.ingredients.forEach(function (i) {
      (i.tags || []).forEach(function (t) {
        var maybe = t.slice(-1) === '?', a = maybe ? t.slice(0, -1) : t, list = maybe ? r.check : r.contains, from = i.name.toLowerCase();
        var have = list.filter(function (x) { return x.allergen === a; })[0];
        if (!have) list.push({ allergen: a, from: from });
        else if (have.from.split(', ').indexOf(from) < 0) have.from += ', ' + from;
      });
    });
  }
  D.recipes.forEach(function (r) {
    r.ingredients = r.ingredients || []; r.sections = r.sections || []; r.pins = r.pins || [];
    if (!r.contains && !r.check) fromTags(r);
    r.contains = r.contains || []; r.check = r.check || [];
    byId[r.id] = r;
  });
  D.recipes.forEach(function (r) {
    r.ingredients.forEach(function (i) { if (i.link && byId[i.link]) { (usedIn[i.link] = usedIn[i.link] || []).push(r.id); } });
  });

  /* ---------- menu sections: the guest menu in its printed order, then the prep recipes ---------- */
  // Each group is { key, title, list }. All three views (Tiles, List, The Pass) use these.
  var MENU = [], PREP = [], placed = {}, memb = {};
  (D.menuOrder || []).forEach(function (s, i) {
    var list = (s.ids || []).filter(function (id) { return byId[id] && !placed[id]; });
    list.forEach(function (id) { placed[id] = true; byId[id].sec = s.title; });
    if (list.length) MENU.push({ key: 'm' + i, title: s.title, list: list.map(function (id) { return byId[id]; }) });
  });
  // A dish that is in no menu section still shows, so nothing goes missing.
  var other = D.recipes.filter(function (r) { return !placed[r.id] && (r.kind === 'main' || r.kind === 'snack' || r.kind === 'side' || r.kind === 'dessert'); });
  other.forEach(function (r) { r.sec = 'Other dishes'; });
  if (other.length) MENU.push({ key: 'mx', title: 'Other dishes', list: other });
  [['batch', 'Batch recipes'], ['component', 'Components']].forEach(function (k) {
    var list = D.recipes.filter(function (r) { return r.kind === k[0]; });
    if (list.length) PREP.push({ key: k[0], title: k[1], list: list });
  });
  var GROUPS = MENU.concat(PREP);
  GROUPS.forEach(function (g) { memb[g.key] = {}; g.list.forEach(function (r) { memb[g.key][r.id] = true; }); });
  var SHELVES = MENU.concat([{ key: 'prep', title: 'Bains and prep', list: PREP.reduce(function (all, g) { return all.concat(g.list); }, []) }]);

  function addTo(bucket, a, src) { if (!bucket[a]) bucket[a] = []; if (bucket[a].indexOf(src) < 0) bucket[a].push(src); }
  function roll(id, seen) {
    if (rolled[id]) return rolled[id];
    var r = byId[id], out = { contains: {}, check: {}, missing: [] };
    if (!r || seen[id]) return out;
    seen[id] = true;
    function miss(name) { if (out.missing.indexOf(name) < 0) out.missing.push(name); }
    r.contains.forEach(function (c) { addTo(out.contains, c.allergen, c.from); });
    r.check.forEach(function (c) { addTo(out.check, c.allergen, c.from); });
    r.ingredients.forEach(function (i) {
      if (!i.link) return;
      // Linked to a recipe that is not in the book yet: its allergens are unknown.
      if (!byId[i.link]) { miss(i.name); return; }
      var sub = roll(i.link, seen);
      Object.keys(sub.contains).forEach(function (a) { addTo(out.contains, a, byId[i.link].name); });
      Object.keys(sub.check).forEach(function (a) { addTo(out.check, a, byId[i.link].name); });
      sub.missing.forEach(miss);
    });
    rolled[id] = out;
    return out;
  }
  D.recipes.forEach(function (r) {
    var ro = roll(r.id, {}), list = [], t = [];
    Object.keys(ro.contains).forEach(function (a) { list.push({ label: a, from: ro.contains[a].join(', '), maybe: false }); t.push(a); });
    Object.keys(ro.check).forEach(function (a) {
      if (ro.contains[a]) return;
      list.push({ label: a + '?', from: 'check: ' + ro.check[a].join(', '), maybe: true });
      t.push(a + '?');
    });
    rows[r.id] = list;
    tags[r.id] = t;
    missing[r.id] = ro.missing;
    hay[r.id] = [r.name, r.avc || '', r.menu || '', r.yield, KIND[r.kind], r.sec || '', r.forLine].concat(r.ingredients.map(function (i) { return i.name; }), t).join(' ').toLowerCase();
  });

  /* ---------- settings (saved on this device) and ticked steps (this visit) ---------- */
  var SKEY = 'lk.settings.v1', TKEY = 'lk.ticks.v1';
  function store(kind) { try { var s = window[kind]; s.getItem('x'); return s; } catch (e) { return null; } }
  var LS = store('localStorage'), SS = store('sessionStorage');
  function readJSON(s, key) { if (!s) return null; try { return JSON.parse(s.getItem(key) || 'null'); } catch (e) { return null; } }
  function writeJSON(s, key, val) { if (!s) return; try { s.setItem(key, JSON.stringify(val)); } catch (e) {} }
  var settings = Object.assign({ view: null, text: 'normal' }, readJSON(LS, SKEY) || {});
  if (settings.view !== 'tiles') settings.view = 'pass'; // the list view is gone: everyone starts on the pass
  var ticks = readJSON(SS, TKEY) || {};
  function saveSettings() { writeJSON(LS, SKEY, settings); }
  function saveTicks() { writeJSON(SS, TKEY, ticks); }
  document.documentElement.setAttribute('data-text', settings.text);

  /* ---------- what the person is doing right now ---------- */
  var ui = { query: '', kind: 'all', free: [], lens: null, pick: null };

  /* ---------- small helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function isDish(r) { return r.kind === 'main' || r.kind === 'snack' || r.kind === 'side' || r.kind === 'dessert'; }
  function inKind(r) { return ui.kind === 'all' || !!(memb[ui.kind] && memb[ui.kind][r.id]); }
  function q() { return ui.query.trim().toLowerCase(); }
  function matches(id) {
    var s = search();
    if (s.free && !freeFrom(id, s.free)) return false;
    return !s.words.length || s.words.every(function (w) { return hay[id].indexOf(w) >= 0; });
  }
  /* What the search box means, worked out once per change of the box:
     - "gluten free", "gf", "no dairy", "nut free" and so on: the recipes free from those allergens (same rule as Free from)
     - otherwise every word must be in the recipe, in any order ("parmy chicken" finds Chicken Parmy)
     - and when nothing matches, a word one slip away from a word in the book is put right ("chiken" finds Chicken) */
  var ALG = { gluten: ['Gluten'], wheat: ['Gluten'], coeliac: ['Gluten'], celiac: ['Gluten'], dairy: ['Milk'], milk: ['Milk'], lactose: ['Milk'], egg: ['Egg'], eggs: ['Egg'],
    soy: ['Soy'], soya: ['Soy'], peanut: ['Peanut'], peanuts: ['Peanut'], nut: ['Peanut', 'Tree nut'], nuts: ['Peanut', 'Tree nut'], fish: ['Fish'],
    shellfish: ['Crustacean', 'Mollusc'], seafood: ['Fish', 'Crustacean', 'Mollusc'], crustacean: ['Crustacean'], prawn: ['Crustacean'], prawns: ['Crustacean'], mollusc: ['Mollusc'], sesame: ['Sesame'] };
  // Pulls the free-from part out of a search ("gf burger" is burgers free from gluten). Returns { list, rest }.
  function freeQuery(s) {
    var out = [], rest = (' ' + s + ' ').replace(/-/g, ' ').replace(/\b(gf)\b/g, ' gluten free ').replace(/\b(df)\b/g, ' dairy free ')
      .replace(/\b(?:no|without)\s+([a-z]+)|\b([a-z]+)\s+free\b/g, function (m, a, b) { var w = ALG[a || b]; if (!w) return m; w.forEach(function (x) { if (out.indexOf(x) < 0) out.push(x); }); return ' '; });
    if (!out.length) return { list: null, rest: s };
    return { list: out, rest: rest.replace(/\b(and|or)\b|[,+&]/g, ' ').replace(/\s+/g, ' ').trim() };
  }
  function freeFrom(id, list) {
    if (missing[id].length) return false;
    var ro = rolled[id];
    return list.every(function (a) { return !ro.contains[a] && !ro.check[a]; });
  }
  var sq = { key: null }, vocab = null;
  function search() {
    var s = q();
    if (sq.key === s) return sq;
    var fq = freeQuery(s);
    sq = { key: s, words: fq.rest ? fq.rest.split(/\s+/) : [], free: fq.list, fixed: '' };
    if (!sq.words.length) return sq;
    var hits = function (ws) { return D.recipes.some(function (r) { return (!sq.free || freeFrom(r.id, sq.free)) && ws.every(function (w) { return hay[r.id].indexOf(w) >= 0; }); }); };
    if (hits(sq.words)) return sq;
    if (!vocab) { vocab = {}; D.recipes.forEach(function (r) { hay[r.id].split(/[^a-z]+/).forEach(function (w) { if (w.length >= 3) vocab[w] = (vocab[w] || 0) + 1; }); }); }
    var changed = false, fixed = sq.words.map(function (w) {
      if (w.length < 4 || vocab[w] || D.recipes.some(function (r) { return hay[r.id].indexOf(w) >= 0; })) return w;
      var maxd = w.length >= 8 ? 2 : 1, best = null, bn = 0, tie = false;
      Object.keys(vocab).forEach(function (c) {
        if (Math.abs(c.length - w.length) > maxd || osa(w, c) > maxd) return;
        if (!best || vocab[c] > bn) { best = c; bn = vocab[c]; tie = false; } else if (vocab[c] === bn) tie = true;
      });
      if (best && !tie) { changed = true; return best; }
      return w;
    });
    if (changed && hits(fixed)) { sq.words = fixed; sq.fixed = fixed.join(' '); }
    return sq;
  }
  function osa(a, b) {
    var d = [], i, j;
    for (i = 0; i <= a.length; i++) d[i] = [i];
    for (j = 1; j <= b.length; j++) d[0][j] = j;
    for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[a.length][b.length];
  }
  /* One line above the results when the search was read as something else. */
  function searchNote() {
    var s = search();
    var out = '';
    if (s.fixed) out += '<p class="s-note" role="status">Nothing for "' + esc(q()) + '". Showing <b>' + esc(s.fixed) + '</b> instead.</p>';
    if (s.free) out += '<p class="s-note" role="status"><b>Free from ' + esc(s.free.join(', ').toLowerCase()) + ':</b> recipes with none of it and no "may have". Recipes with a card still to come are left out. Always check the supplier labels before answering a guest.</p>';
    return out;
  }
  function freeOk(id) {
    if (!ui.free.length) return true;
    if (missing[id].length) return false; // can't promise free-from until every part has a card
    var ro = rolled[id];
    for (var k = 0; k < ui.free.length; k++) { if (ro.contains[ui.free[k]] || ro.check[ui.free[k]]) return false; }
    return true;
  }
  function hit(t) {
    if (!ui.lens || !t) return null;
    if (t.indexOf(ui.lens) >= 0) return 'has';
    if (t.indexOf(ui.lens + '?') >= 0) return 'may';
    return null;
  }
  // A recipe with parts still to come counts as "may have" for every allergen.
  function hitId(id) { return hit(tags[id]) || (ui.lens && missing[id].length ? 'may' : null); }
  function lensWord(h) { return h === 'may' ? ui.lens + '?' : ui.lens; }
  function href(stack) { return stack.length ? '#/r/' + stack.join('/') : '#/recipes'; }
  function stackTo(stack, id) { var i = stack.indexOf(id); return i >= 0 ? stack.slice(0, i + 1) : stack.concat([id]); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  var ICON = {
    key: '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M12 12h9M18 12v3M21 12v2" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
    gear: '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M19.4 13.5l1.6 1.2-1.8 3.1-1.9-.7a7.6 7.6 0 0 1-1.7 1l-.3 2h-3.6l-.3-2a7.6 7.6 0 0 1-1.7-1l-1.9.7L5 14.7l1.6-1.2a7.4 7.4 0 0 1 0-2L5 10.3l1.8-3.1 1.9.7a7.6 7.6 0 0 1 1.7-1l.3-2h3.6l.3 2a7.6 7.6 0 0 1 1.7 1l1.9-.7 1.8 3.1-1.6 1.2a7.4 7.4 0 0 1 0 2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    left: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 L5 8 L10 13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    right: '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" style="flex:0 0 14px"><path d="M6 3 L11 8 L6 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5 L6.5 12 L13 4.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    out: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M5 13 L13 5 M7 5 H13 V11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    zoom: '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5.5 8.5 H11.5 M13 13 L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    plate: '<svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="9" cy="9" r="3.5" fill="#E2602A"/></svg>'
  };

  // A card flagged done: true in data.js is 100% finished: green frame on the card and its drawings, plus a Finished chip.
  var DONE_TAG = '<span class="tag done-tag">Finished</span>';

  function art(r, cls) {
    if (r.art && ART.plates[r.art]) return '<svg class="' + cls + '" viewBox="2 16 212 212" aria-hidden="true" focusable="false">' + ART.plates[r.art] + '</svg>';
    if (r.art && ART.pans[r.art]) return '<svg class="' + cls + '" viewBox="0 0 200 140" aria-hidden="true" focusable="false">' + ART.pans[r.art] + '</svg>';
    if (isDish(r)) return '<svg class="' + cls + '" viewBox="2 16 212 212" aria-hidden="true" focusable="false"><circle cx="106" cy="120" r="100" fill="#FFFFFF" stroke="#D3CEC4" stroke-width="2"/><circle cx="106" cy="120" r="60" fill="none" stroke="#C9C3B6" stroke-width="2" stroke-dasharray="6 6"/></svg>';
    return '<svg class="' + cls + '" viewBox="0 0 200 140" aria-hidden="true" focusable="false"><rect x="4" y="6" width="192" height="128" rx="14" fill="#DADDE1" stroke="#A9AFB6" stroke-width="2"/><rect x="20" y="22" width="160" height="96" rx="6" fill="none" stroke="#A9AFB6" stroke-width="2" stroke-dasharray="6 6"/></svg>';
  }

  /* ---------- shared page parts ---------- */
  var NAV_ICON = {
    home: '<svg width="26" height="26" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 30L32 10l24 20"/><path d="M14 26v28h36V26"/><path d="M27 54V38h10v16"/></svg>',
    recipes: '<svg width="26" height="26" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="32" cy="32" r="22"/><circle cx="32" cy="32" r="13" stroke-dasharray="4 5"/><path d="M6 14v14M10 14v14M14 14v14M6 28h8M10 28v22"/><path d="M58 14c-3 2-5 6-5 11v3h5v22"/></svg>',
    prep: '<svg width="26" height="26" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="12" y="10" width="40" height="48" rx="5"/><path d="M24 10V7h16v3"/><path d="M20 24l3 3 5-6M20 38l3 3 5-6"/><path d="M34 25h12M34 39h12"/></svg>',
    orders: '<svg width="26" height="26" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 20l24-12 24 12v26L32 58 8 46z"/><path d="M8 20l24 12 24-12M32 32v26"/><path d="M20 14l24 12"/></svg>',
    waste: '<svg width="26" height="26" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 18h44"/><path d="M25 18v-6h14v6"/><path d="M15 18l3 38h28l3-38"/><path d="M27 28v18M37 28v18"/></svg>'
  };
  var NAV = [['recipes', 'Recipes', '#/recipes'], ['prep', 'Prep', '#/prep'], ['orders', 'Orders', '#/orders'], ['waste', 'Waste', '#/waste']];
  function navActive() {
    var n = parseRoute().name;
    return n === 'landing' ? 'home' : (n === 'home' || n === 'recipe') ? 'recipes' : n === 'prep' ? 'prep' : n === 'orders' ? 'orders' : n === 'waste' ? 'waste' : '';
  }
  function pillNav() {
    var a = navActive();
    return '<nav class="pnav" aria-label="Main">' + NAV.map(function (t) { return '<a href="' + t[2] + '"' + (a === t[0] ? ' aria-current="page"' : '') + '>' + t[1] + '</a>'; }).join('') + '</nav>';
  }
  function tabBar() {
    var a = navActive();
    return '<nav class="tabbar" aria-label="Main">' + NAV.map(function (t) { return '<a href="' + t[2] + '"' + (a === t[0] ? ' aria-current="page"' : '') + '>' + NAV_ICON[t[0]] + '<span>' + t[1] + '</span></a>'; }).join('') + '</nav>';
  }
  var SW_ICON = {
    pass: '<svg width="20" height="20" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" aria-hidden="true"><circle cx="32" cy="32" r="22"/><circle cx="32" cy="32" r="12" stroke-dasharray="4 5"/></svg>',
    tiles: '<svg width="20" height="20" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="20" height="20" rx="3"/><rect x="36" y="8" width="20" height="20" rx="3"/><rect x="8" y="36" width="20" height="20" rx="3"/><rect x="36" y="36" width="20" height="20" rx="3"/></svg>'
  };
  function viewSwitch() {
    var n = parseRoute().name;
    if (n !== 'home' && n !== 'recipe') return '';
    return '<div class="vsw" role="group" aria-label="How the recipes are shown">' + VIEWS.map(function (v) {
      return '<button type="button" data-act="topview" data-val="' + v.id + '" data-k="topview:' + v.id + '" aria-pressed="' + (settings.view === v.id) + '" aria-label="' + esc(v.name) + '">' + SW_ICON[v.id] + '<span>' + (v.id === 'pass' ? 'Pass' : 'Tiles') + '</span></button>';
    }).join('') + '</div>';
  }
  /* Admin always lives in the same place: the key button top right, next to Settings, on every page.
     It is filled in on a phone or computer where the head chef is signed in with Google. */
  function isAdminDevice() { try { return localStorage.getItem('lk.admin') === '1'; } catch (e) { return false; } }
  function adminLink(cls) {
    var on = parseRoute().name === 'admin', signed = isAdminDevice();
    return '<a class="' + cls + ' adm' + (signed ? ' is-signed' : '') + '" href="#/admin" title="' + (signed ? 'Admin panel' : 'Admin panel: head chef sign in') + '" aria-label="' + (signed ? 'Admin panel (signed in)' : 'Admin panel (head chef sign in)') + '"' + (on ? ' aria-current="page"' : '') + '>' + ICON.key + (cls === 'icon-btn' ? '<span class="icon-lbl">Admin</span>' : '<span class="rail-lbl">Admin</span>') + '</a>';
  }
  /* The chalk KB logo (letters drawn as paths, so it needs no font). The same mark is the app icon and the browser tab icon. */
  var LOGO_MARK = '<svg class="rb-mark" viewBox="40 60 432 380" width="56" height="49" aria-hidden="true" focusable="false"><path d="M113.44999999999999 365.98Q109.03 363.26 105.28999999999999 359.35Q101.54999999999998 355.44 103.58999999999999 348.3Q103.25 344.22 104.1 340.48Q104.94999999999999 336.74 105.28999999999999 335.38Q106.99 335.38 107.32999999999998 333.51Q107.66999999999999 331.64 107.66999999999999 330.28Q107.66999999999999 327.56 109.71 321.1Q111.75 314.64 113.78999999999999 307.5Q116.50999999999999 301.72 119.05999999999999 295.26Q121.60999999999999 288.8 121.60999999999999 287.44Q121.60999999999999 284.72 122.96999999999998 281.83000000000004Q124.32999999999998 278.94 126.03 276.22Q127.72999999999999 272.14 128.57999999999998 267.21Q129.43 262.28 129.43 259.56Q131.47 255.14 133.85 250.04Q136.23 244.94 137.59 239.5Q139.63 233.71999999999997 143.70999999999998 222.32999999999998Q147.79 210.94 152.20999999999998 199.38Q155.26999999999998 192.92 158.16 185.95Q161.05 178.98 163.43 174.04999999999998Q165.81 169.11999999999998 166.82999999999998 169.11999999999998Q166.82999999999998 169.11999999999998 166.82999999999998 167.92999999999998Q166.82999999999998 166.73999999999998 166.82999999999998 165.38Q166.82999999999998 163.67999999999998 169.54999999999998 158.75Q172.26999999999998 153.82 174.64999999999998 148.38Q178.05 143.27999999999997 179.41 138.69Q180.76999999999998 134.1 180.76999999999998 134.1Q180.76999999999998 134.1 182.13 131.89Q183.49 129.67999999999998 184.85 128.32Q193.69 123.55999999999997 199.98000000000002 123.55999999999997Q206.27 123.55999999999997 208.65 131.71999999999997Q211.37 139.2 211.03 142.08999999999997Q210.69 144.98 208.65 149.05999999999997Q205.93 155.17999999999998 201.51 164.52999999999997Q197.09 173.88 192.32999999999998 184.42Q187.57 194.95999999999998 183.32 204.64999999999998Q179.07 214.34 176.51999999999998 221.14Q173.97 227.94 173.97 229.64L159.69 264.65999999999997Q158.32999999999998 267.03999999999996 155.26999999999998 276.73Q152.20999999999998 286.42 148.13 299.85Q144.05 313.28 139.8 327.04999999999995Q135.55 340.82 131.47 352.04Q129.43 357.82 127.73 361.73Q126.03 365.64 124.33 367.68Q122.63 369.72 120.25 369.72Q118.88999999999999 369.72 117.19 368.70000000000005Q115.49 367.68 113.44999999999999 365.98ZM233.81 365.3Q230.75 365.64 225.48000000000002 362.40999999999997Q220.21 359.18 214.26 354.42Q208.31 349.66 203.04 344.56Q197.76999999999998 339.46 194.70999999999998 335.72Q189.26999999999998 327.9 180.94 314.64Q172.61 301.38 168.53 286.76Q166.14999999999998 275.88 163.6 269.25Q161.05 262.62 161.05 257.52L161.39 236.44L186.20999999999998 234.74Q187.91 253.1 191.64999999999998 265.17Q195.39 277.24 200.49 286.76Q204.57 295.6 209.5 304.1Q214.43 312.6 220.55 318.38Q228.37 326.88 234.49 330.96000000000004Q240.61 335.04 243.67000000000002 335.04Q250.13 338.1 253.19 340.82000000000005Q256.25 343.54 257.27 345.58000000000004Q258.28999999999996 347.62 257.95 349.32Q258.28999999999996 350.34 257.61 353.90999999999997Q256.93 357.48 255.57 361.05Q254.21 364.62 251.83 365.64Q249.45 368.02 245.70999999999998 368.53Q241.97 369.04 233.81 365.3ZM154.93 235.42 179.75 217.06Q180.76999999999998 216.04 185.7 211.45Q190.63 206.85999999999999 204.91 195.98L249.79 159.6Q258.28999999999996 155.17999999999998 265.42999999999995 149.73999999999998Q272.57 144.29999999999998 277.33000000000004 141.23999999999998Q283.11 137.16 289.23 132.74Q295.35 128.32 296.71000000000004 128.66Q299.43 127.29999999999998 303.16999999999996 131.20999999999998Q306.90999999999997 135.11999999999998 309.46 140.39Q312.01 145.66 311.67 148.38Q312.35 151.77999999999997 310.65000000000003 154.15999999999997Q308.95000000000005 156.54 301.81 160.61999999999998Q293.31 164.35999999999999 288.38 167.76Q283.45000000000005 171.16 282.77 172.85999999999999Q282.77 172.85999999999999 275.63 178.29999999999998Q268.49 183.73999999999998 258.63 190.54Q245.03 199.72 236.36 206.69Q227.69 213.66 224.97 217.73999999999998Q223.61 217.73999999999998 222.42000000000002 218.76Q221.23 219.78 219.87 219.44Q219.87 219.44 217.15 221.31Q214.43 223.18 213.07 225.21999999999997Q212.39 226.92 210.18 229.64Q207.97 232.35999999999999 204.91 232.01999999999998Q202.53 233.38 196.41 237.63Q190.29 241.88 183.66 246.98Q177.03 252.07999999999998 172.26999999999998 256.15999999999997Q167.51 260.24 167.17000000000002 260.91999999999996ZM318.47 374.48Q303.85 364.96 301.3 355.44Q298.75 345.92 307.93 340.14Q309.96999999999997 338.78 315.91999999999996 339.79999999999995Q321.87 340.82 324.93 343.88Q331.73 350.0 340.4 351.53Q349.07 353.06 361.65 349.66Q375.93 345.24 383.58000000000004 338.61Q391.23 331.98 400.75 320.42Q407.89 311.24 410.78 302.4Q413.66999999999996 293.56 413.5 286.25Q413.33000000000004 278.94 409.93 275.2Q401.43 263.3 388.85 258.71000000000004Q376.27 254.12 355.87 259.56Q353.49 259.9 348.73 260.91999999999996Q343.97 261.94 340.23 262.78999999999996Q336.49 263.64 336.15 263.64Q333.77 264.32 332.40999999999997 264.32Q331.05 264.32 329.18 267.54999999999995Q327.31 270.78 323.57 280.80999999999995Q319.83 290.84 312.35 311.58Q305.21 332.32 300.28 340.99Q295.35 349.66 291.61 348.81Q287.87 347.96 283.11 341.5Q280.39 336.74 277.15999999999997 330.96000000000004Q273.93 325.18 277.33 319.06Q279.03 316.0 280.04999999999995 313.45Q281.07 310.9 282.77 304.44Q284.46999999999997 299.34 289.4 286.59Q294.33 273.84 301.13 256.66999999999996Q307.93 239.5 315.40999999999997 221.14Q322.89 202.78 329.86 186.45999999999998Q336.83 170.14 341.59 158.92Q346.35 148.38 347.37 143.62Q348.39 138.85999999999999 346.69 138.51999999999998Q346.69 136.82 345.66999999999996 135.29Q344.65 133.76 344.99 132.39999999999998Q344.99 131.04 350.94 128.65999999999997Q356.89 126.27999999999997 363.69 124.23999999999998Q370.49 122.19999999999999 373.55 122.88Q375.25 122.88 377.63 122.71Q380.01 122.53999999999999 380.01 121.17999999999998Q381.03 121.17999999999998 386.46999999999997 120.49999999999999Q391.90999999999997 119.82 398.37 120.49999999999997Q421.15 122.53999999999999 435.77 133.58999999999997Q450.39 144.64 450.05 168.78Q449.71000000000004 174.55999999999997 445.29 183.73999999999998Q440.87 192.92 434.24 202.1Q427.61 211.28 420.13 218.07999999999998Q415.71000000000004 221.82 410.78000000000003 225.73Q405.85 229.64 402.28000000000003 232.19Q398.71000000000004 234.74 398.71000000000004 234.74Q398.71000000000004 234.74 401.43 235.76Q404.15 236.77999999999997 407.21000000000004 237.8Q422.85 243.57999999999998 431.86 252.42Q440.87 261.26 444.61 276.9Q445.97 282.0 444.78000000000003 289.48Q443.59000000000003 296.96 441.55 304.27Q439.51 311.58 437.13 316.68Q434.75 319.06 433.39 321.61Q432.03 324.15999999999997 432.03 324.15999999999997Q432.03 324.84 429.31 329.42999999999995Q426.59000000000003 334.02 422.85 339.46Q419.11 344.9 415.71000000000004 348.98Q412.31 351.7 406.02 356.63Q399.73 361.56 392.42 366.32Q385.11 371.08 378.65 373.46Q369.13 377.54 357.4 379.07000000000005Q345.67 380.6 335.13 379.41Q324.59 378.22 318.47 374.48ZM342.95 233.38Q342.95 233.38 348.56 232.19Q354.17 231.0 360.97 229.47Q367.77 227.94 371.17 226.57999999999998Q372.87 225.56 376.1 223.86Q379.33 222.16 382.73 218.76Q387.49 214.34 392.93 208.73Q398.37 203.11999999999998 403.64 196.65999999999997Q408.90999999999997 190.2 412.65 182.72Q420.47 170.48 421.15000000000003 165.04Q421.83000000000004 159.6 417.40999999999997 155.17999999999998Q414.35 151.44 408.91 149.57Q403.47 147.7 397.18 147.52999999999997Q390.89 147.35999999999999 385.11 149.05999999999997Q380.69 150.42 378.31 152.29Q375.93 154.16 375.93 157.89999999999998Q375.93 160.95999999999998 374.06 164.19Q372.19 167.42 370.49 169.11999999999998Q370.15 171.5 368.28 173.70999999999998Q366.40999999999997 175.92 366.40999999999997 175.92Q366.40999999999997 177.28 362.15999999999997 184.25Q357.90999999999997 191.22 353.15 204.14Q347.03 218.76 344.99 225.22Q342.95 231.68 342.95 233.38Z" fill="#FBF8F1" transform="rotate(-6 256 256)"/><path d="M90 400 C190 378 300 374 430 388" fill="none" stroke="#E2602A" stroke-width="28" stroke-linecap="round"/></svg>';
  /* The bell opens today's notes (written by the head chef or a sous chef). It stays hidden until there is a note for today, and shows a dot while the notes are unread on this phone. The prep book fills it in once it has read the notes. */
  var BELL = '<svg width="22" height="22" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M32 8c-9 0-16 7-16 16v10c0 5-3 8-6 12h44c-3-4-6-7-6-12V24c0-9-7-16-16-16z"/><path d="M26 52c1 4 3 6 6 6s5-2 6-6"/></svg>';
  function noteBellHTML() {
    var i = window.LK_PREP && window.LK_PREP.noteInfo ? window.LK_PREP.noteInfo() : { n: 0, unread: false };
    return '<button type="button" class="rail-set nbell' + (i.unread ? ' has-new' : '') + '" data-note="open"' + (i.n ? '' : ' hidden') + ' aria-label="Today\'s notes' + (i.unread ? ', new' : '') + '">' + BELL + '<span class="rail-lbl">Notes</span></button>';
  }
  /* The minutes bell: shown only while the person on this phone has meeting minutes to sign (the prep book fills it in once it has read them). */
  function minBellHTML() {
    var i = window.LK_PREP && window.LK_PREP.minInfo ? window.LK_PREP.minInfo() : { n: 0 };
    return '<a class="rail-set mbell' + (i.n ? ' has-new' : '') + '" href="#/minutes"' + (i.n ? '' : ' hidden') + ' aria-label="Meeting minutes to sign' + (i.n ? ', ' + i.n : '') + '"' + (parseRoute().name === 'minutes' ? ' aria-current="page"' : '') + '>' + BELL + '<span class="rail-lbl">Minutes</span></a>';
  }
  /* The same top bar on every page as on the landing page: brand (goes home), the menu, Notes, Admin and Settings. */
  function topBar() {
    return '<header class="wtop"><a class="rail-brand" href="#/" aria-label="Kitchen Book, home">' + LOGO_MARK + '<span class="rb-text"><span class="rb-eb">Leichhardt Hotel Kitchen</span><b>Kitchen Book</b></span></a>' + pillNav() +
      '<span class="rail-icons">' + noteBellHTML() + minBellHTML() + adminLink('rail-set') + '<a class="rail-set" href="#/settings" aria-label="Settings"' + (parseRoute().name === 'settings' ? ' aria-current="page"' : '') + '>' + ICON.gear + '<span class="rail-lbl">Settings</span></a></span></header>';
  }
  /* Under the top bar, the recipe pages get their own tools row: how many recipes, and the Pass / Tiles switch. */
  function header() { return ''; }
  var DOCKETS = [['01', 'Recipes', '#/recipes', 'recipes'], ['02', 'Prep list', '#/prep', 'prep'], ['03', 'Orders', '#/orders', 'orders'], ['04', 'Wastage', '#/waste', 'waste']];
  function viewLanding() {
    var today = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
    return '<div class="wall">' + topBar() +
      '<main id="main" class="wall-main"><h2 class="wall-h" id="rtitle" tabindex="-1">Pick a docket</h2><p class="wall-date">' + esc(today) + '</p>' + installCard() +
      '<div class="dockets">' + DOCKETS.map(function (d) {
        return '<a class="docket" href="' + d[2] + '"><span class="dk-pin" aria-hidden="true"></span><span class="dk-top"><span class="dk-name">' + d[1] + '</span><span class="dk-no">No. ' + d[0] + '</span></span>' +
          '<span class="dk-icon">' + NAV_ICON[d[3]].replace(/width="26" height="26"/, 'width="72" height="72"') + '</span><span class="dk-go">Open</span></a>';
      }).join('') + '</div>' +
      '<p class="wall-foot">Cook as written. Check with the head chef or sous chef before changing anything.</p></main>' + tabBar() + '</div>';
  }
  function footer() {
    return '<footer class="foot"><div>Cook as written. Check with the head chef or sous chef before changing anything.</div>' +
      '<div>Allergens are worked out from the ingredients. Always check the supplier labels before answering a guest.</div></footer>';
  }
  function countText() {
    var shown = D.recipes.filter(function (r) { return matches(r.id) && freeOk(r.id) && (inKind(r) || settings.view !== 'tiles'); }).length;
    return shown === D.recipes.length ? plural(D.recipes.length, 'recipe', 'recipes') : shown + ' of ' + D.recipes.length + ' recipes';
  }
  /* Search, with the recipe count above it and the Pass / Tiles switch right next to it. */
  function searchField(placeholder, count) {
    return '<div class="field find-bar"><div class="field-head"><label class="label" for="find">Search</label>' + (count != null ? '<span class="count' + (/ of /.test(count) ? ' is-on' : '') + '" id="count">' + esc(count) + '</span>' : '') + '</div>' +
      '<div class="search-row"><input id="find" class="search" type="search" autocomplete="off" data-k="find" placeholder="' + esc(placeholder) + '" value="' + esc(ui.query) + '">' + viewSwitch() + '</div></div>';
  }
  function freeChips(scroll) {
    return '<div class="field"><span class="label" id="free-label">Free from</span><div class="chips' + (scroll ? ' scroll' : '') + '" role="group" aria-labelledby="free-label">' +
      D.allergens.map(function (a) {
        var on = ui.free.indexOf(a) >= 0;
        return '<button type="button" class="chip sq" data-act="free" data-val="' + esc(a) + '" data-k="free:' + esc(a) + '" aria-pressed="' + on + '">' + esc(a) + '</button>';
      }).join('') + '</div></div>';
  }
  function lensChips() {
    var hint = ui.lens ? 'Marked = has ' + ui.lens + '. ? = may have it.' : 'Pick one to see where it is, at every level.';
    return '<div class="field"><div class="row-label"><span class="label" id="lens-label">Allergen lens</span><span class="hint">' + esc(hint) + '</span></div>' +
      '<div class="chips scroll" role="group" aria-labelledby="lens-label">' + D.allergens.map(function (a) {
        return '<button type="button" class="chip" data-act="lens" data-val="' + esc(a) + '" data-k="lens:' + esc(a) + '" aria-pressed="' + (ui.lens === a) + '">' + esc(a) + '</button>';
      }).join('') + '</div></div>';
  }

  /* ---------- recipe parts ---------- */
  function cardHead(r) {
    return '<div class="card-head"><div><span class="eyebrow">' + esc(KIND[r.kind] + ' · ' + r.forLine) + '</span>' + (r.done ? DONE_TAG : '') +
      '<h2 id="rtitle" tabindex="-1">' + esc(r.name) + '</h2><span class="yield">' + esc(r.yield) + '</span>' +
      (r.menu ? '<span class="menu-line"><b>On the menu:</b> ' + esc(r.menu) + '</span>' : '') + '</div>' +
      '<span class="num"><span class="visually-hidden">Card </span>' + esc(r.no) + '</span></div>';
  }
  function allergenBox(r) {
    var list = rows[r.id], miss = missing[r.id];
    var h = '<section class="box outline" id="r-allergens" aria-label="Allergens"><div class="row-label" style="justify-content: space-between"><span class="label">Allergens</span>' +
      (list.some(function (a) { return a.maybe; }) ? '<span class="hint">? = may be in it, check the supplier label</span>' : '') + '</div>';
    if (list.length) {
      h += '<div class="allergen-grid">' + list.map(function (a) {
        return '<div class="allergen-row"><span class="tag' + (a.maybe ? ' maybe' : '') + '">' + esc(a.label) + '</span><span class="from">' + esc(a.from) + '</span></div>';
      }).join('') + '</div>';
    } else {
      h += '<div>' + (miss.length ? 'None in the listed ingredients so far.' : 'None in the ingredients.') + '</div>';
    }
    if (miss.length) {
      h += '<div class="warn" role="note"><span class="label">Not complete yet</span><span>These parts have no recipe card in the book yet, so their allergens are not listed. Treat the dish as possibly containing any allergen and check with the head chef or sous chef before answering a guest.</span>' +
        '<span class="chips">' + miss.map(function (m) { return '<span class="tag">' + esc(m) + '</span>'; }).join('') + '</span></div>';
    }
    if (r.labelNote) h += '<div style="font-size: 0.875rem">' + esc(r.labelNote) + '</div>';
    if (list.length > r.contains.length + r.check.length) h += '<div class="hint">Includes allergens from the recipes it uses.</div>';
    return h + '</section>';
  }
  function ingTable(r, stack, useLens) {
    return '<div class="ing">' + r.ingredients.map(function (i) {
      var linked = i.link && byId[i.link], soon = i.link && !linked;
      var h = useLens ? (linked ? hitId(i.link) : (hit(i.tags || []) || (soon && ui.lens ? 'may' : null))) : null;
      var name = linked
        ? '<a class="ilink" href="' + href(stackTo(stack, i.link)) + '"><span>' + esc(i.name) + '</span><span class="rtag">Recipe ' + esc(linked.no) + '</span></a>'
        : '<span>' + esc(i.name) + '</span>' + (soon ? '<span class="rtag soon">Card to come</span>' : '');
      var qty = i.q === '[Qty]' ? '<span class="soonq">To come</span>' : esc(i.q);
      return '<div class="ing-row' + (h ? ' hit' : '') + '"><div class="q">' + qty + '</div><div class="n">' + name +
        (i.note ? '<span class="note">' + esc(i.note) + '</span>' : '') +
        (h ? '<span class="tag dark">' + esc(lensWord(h)) + '</span>' : '') + '</div></div>';
    }).join('') + '</div>' +
      (r.ingredients.some(function (i) { return i.link && byId[i.link]; }) ? '<div class="hint">Tap an underlined ingredient to open its recipe.</div>' : '');
  }
  function usedBox(r, stack, title) {
    var u = usedIn[r.id] || [];
    if (!u.length) return '';
    return '<div class="box beige"><span class="label">' + esc(title || 'Used in') + '</span><div class="used">' + u.map(function (id) {
      return '<a class="ilink" href="' + href(stackTo(stack, id)) + '"><span>' + esc(byId[id].name) + '</span><span class="rtag">Recipe ' + esc(byId[id].no) + '</span></a>';
    }).join('') + '</div></div>';
  }
  function tipBox(r) {
    return r.tip ? '<div class="box beige"><span class="label">' + esc(r.tip.title) + '</span><div>' + esc(r.tip.text) + '</div></div>' : '';
  }
  function safetyBox(r) {
    return r.safety ? '<div class="box safety" role="note"><span class="label">' + esc(r.safety.title) + '</span><div>' + esc(r.safety.text) + '</div></div>' : '';
  }
  function diagram(r) {
    var d = r.diagram && ART.diagrams[r.diagram];
    if (!d) return '';
    return '<div class="sec"><h3 class="h3">' + esc(d.title || 'How to cut') + '</h3><svg class="diagram" viewBox="' + esc(d.viewBox) + '"' + (d.maxWidth ? ' style="max-width: ' + esc(d.maxWidth) + '"' : '') + ' role="img" aria-label="' + esc(d.label) + '">' + d.body + '</svg></div>';
  }
  function sideView(r) {
    var v = ART.sides && ART.sides[r.id];
    if (!v) return '';
    return '<div class="sec"><h3 class="h3">From the side</h3><div class="side-art"><svg viewBox="' + esc(v.viewBox) + '" role="img" aria-label="Side view of ' + esc(r.name) + ' with each part labelled">' + v.body + '</svg></div></div>';
  }
  function steps(r) {
    if (!r.sections.length) return '<div class="box beige"><span class="label">Method</span><div>Not written up yet. Ask the head chef or sous chef.</div></div>';
    return '<div class="hint">Tap a step to tick it off.</div><div class="sections">' + r.sections.map(function (sec, si) {
      return '<div class="sec"><h3 class="h3">' + esc(sec.title) + '</h3><ol class="steps">' + sec.steps.map(function (t, n) {
        var key = r.id + ':' + si + ':' + n, done = !!ticks[key];
        return '<li><button type="button" class="step" data-act="tick" data-val="' + esc(key) + '" data-n="' + (n + 1) + '" aria-pressed="' + done + '">' +
          '<span class="dot" aria-hidden="true">' + (done ? ICON.check : (n + 1)) + '</span><span class="txt">' + esc(t) + '</span></button></li>';
      }).join('') + '</ol></div>';
    }).join('') + '</div>';
  }
  function crumbs(stack, withHome) {
    if (!withHome && stack.length < 2) return '';
    var parts = [];
    if (withHome) parts.push('<a href="#/recipes">All recipes</a>');
    stack.forEach(function (id, i) {
      var last = i === stack.length - 1;
      parts.push(last ? '<span aria-current="page">' + esc(byId[id].name) + '</span>' : '<a href="' + href(stack.slice(0, i + 1)) + '">' + esc(byId[id].name) + '</a>');
    });
    return '<nav class="crumbs" aria-label="Breadcrumb">' + parts.join('<span class="sep" aria-hidden="true">/</span>') + '</nav>';
  }
  /* Phones and tablets (the columns stack): jump straight to the allergens, the ingredients or the method. */
  function jumps() {
    return '<nav class="jumps" aria-label="Jump to"><button type="button" class="chip" data-act="jump" data-val="r-allergens">Allergens</button>' +
      '<button type="button" class="chip" data-act="jump" data-val="r-ing">Ingredients</button><button type="button" class="chip" data-act="jump" data-val="r-steps">Method</button></nav>';
  }
  function recipeCard(r, stack, withHome) {
    return '<article class="card' + (r.done ? ' done' : '') + '">' + crumbs(stack, withHome) + cardHead(r) + jumps() + allergenBox(r) +
      '<div class="cols"><div class="col"><h3 class="h3" id="r-ing">Ingredients</h3>' + ingTable(r, stack, false) + tipBox(r) + usedBox(r, stack) +
      (isDish(r) && r.art && ART.plates[r.art] ? '<div class="sec"><h3 class="h3">On the plate</h3>' + art(r, 'card-art') + '</div>' : '') + sideView(r) +
      (!isDish(r) && r.art && ART.pans[r.art] ? '<div class="sec"><h3 class="h3">In the pan</h3>' + art(r, 'card-art') + '</div>' : '') + '</div>' +
      '<div class="col wide"><div id="r-steps" class="jump-at"></div>' + safetyBox(r) + diagram(r) + steps(r) + '</div></div></article>';
  }

  /* ---------- view A: tiles ---------- */
  function tilesHTML() {
    var any = 0;
    var html = GROUPS.filter(function (g) { return ui.kind === 'all' || g.key === ui.kind; }).map(function (g) {
      var list = g.list.filter(function (r) { return freeOk(r.id) && matches(r.id); });
      if (!list.length) return '';
      any += list.length;
      return '<section class="tile-group" aria-label="' + esc(g.title) + '"><div class="group-head"><span>' + esc(g.title) + '</span><span>' + list.length + '</span></div><div class="tiles">' + list.map(function (r) {
        return '<a class="tile' + (r.done ? ' done' : '') + '" href="#/r/' + esc(r.id) + '"><span class="t-top"><span class="t-kind">' + esc((r.sec || KIND[r.kind]) + (r.forLine === 'Template' ? ' · Template' : '')) + '</span>' +
          '<span class="t-no">' + esc(r.no) + '</span></span><span class="t-mid"><span class="t-txt"><span class="t-name">' + esc(r.name) + '</span><span class="t-yield">' + esc(r.yield) + '</span></span>' + art(r, 't-art') + '</span>' +
          '<span class="chips">' + (r.done ? DONE_TAG : '') + rows[r.id].map(function (a) { return '<span class="tag' + (a.maybe ? ' maybe' : '') + '">' + esc(a.label) + '</span>'; }).join('') +
          (missing[r.id].length ? '<span class="tag maybe">Allergens incomplete</span>' : '') + '</span></a>';
      }).join('') + '</div></section>';
    }).join('');
    return searchNote() + (any ? '<div class="tile-groups">' + html + '</div>' : '<div class="empty">No recipes match. Clear the search or the filters.</div>');
  }
  // The Functions chip sits first after All so it is always on view; every other chip follows the menu order.
  function kindChips() {
    var all = [{ key: 'all', title: 'All', list: D.recipes }].concat(GROUPS.filter(function (g) { return g.title === 'Functions'; }), GROUPS.filter(function (g) { return g.title !== 'Functions'; }));
    return '<div class="chips scroll" role="group" aria-label="Recipe type">' + all.map(function (g) {
      return '<button type="button" class="chip' + (g.title === 'Functions' ? ' sq' : '') + '" data-act="kind" data-val="' + g.key + '" data-k="kind:' + g.key + '" aria-pressed="' + (ui.kind === g.key) + '">' + esc(g.title) + ' (' + g.list.length + ')</button>';
    }).join('') + '</div>';
  }
  function viewTiles(route) {
    if (route.stack.length) {
      var r = byId[route.stack[route.stack.length - 1]];
      return '<div class="page">' + header() + '<main id="main">' + recipeCard(r, route.stack, true) + '</main>' + footer() + '</div>';
    }
    return '<div class="page">' + header() + '<main id="main" style="display: flex; flex-direction: column; gap: 1.1rem">' +
      searchField('Dish, ingredient or allergen', countText()) +
      kindChips() + freeChips(true) +
      '<div id="results">' + tilesHTML() + '</div><div class="hint">Allergen tags with a ? may be in it: check the supplier label.</div></main>' + footer() + '</div>';
  }

  /* ---------- view C: the pass ---------- */
  function shelvesHTML() {
    var s = q(), n = 0;
    var html = SHELVES.filter(function (sh) { return ui.kind === 'all' || sh.key === ui.kind || (sh.key === 'prep' && (ui.kind === 'batch' || ui.kind === 'component')); }).map(function (sh) {
      var shown = s ? sh.list.filter(function (r) { return matches(r.id); }) : sh.list;
      if (!shown.length) return '';
      var items = shown.map(function (r) {
        var h = hitId(r.id), m = matches(r.id), dish = isDish(r);
        if (s && m) n++;
        var links = r.ingredients.filter(function (i) { return i.link && byId[i.link]; }).map(function (i) { return byId[i.link].short || byId[i.link].name; });
        var used = (usedIn[r.id] || []).map(function (id) { return byId[id].name; });
        var sub = dish ? (r.forLine === 'Template' ? 'Template' : (links.length ? 'With ' + links.join(', ') : 'Card ' + r.no)) : (used.length ? 'Goes on ' + used.join(', ') : KIND[r.kind]);
        var faded = (ui.lens && !h) || (s && !m);
        return '<a class="dish' + (r.done ? ' done' : '') + (dish ? '' : ' pan') + (h ? ' lit' : '') + (faded ? ' faded' : '') + '" href="#/r/' + esc(r.id) + '" aria-label="' +
          esc(r.name + (h ? (h === 'may' ? ', may have ' : ', has ') + ui.lens : '')) + '">' + art(r, 'art') +
          '<span class="d-name">' + esc(r.name) + '</span><span class="d-sub">' + esc(sub) + '</span>' +
          (h ? '<span class="tag dark">' + esc((h === 'may' ? 'May have ' : 'Has ') + ui.lens) + '</span>' : '') + '</a>';
      }).join('');
      return '<section class="shelf" aria-label="' + esc(sh.title) + '"><div class="group-head"><span>' + esc(sh.title) + '</span></div><div class="shelf-items">' + items + '</div><div class="rail" aria-hidden="true"></div></section>';
    }).join('');
    return searchNote() + html + (s && !n ? '<div class="empty">Nothing on the pass matches. Clear the search.</div>' : '');
  }
  function passCount() {
    var s = q();
    if (!s) return plural(D.recipes.length, 'recipe', 'recipes') + ' on the pass';
    var n = D.recipes.filter(function (r) { return matches(r.id); }).length;
    return n + ' of ' + D.recipes.length + ' match';
  }
  function pinHTML(p, k, stack) {
    var h = p.link ? (byId[p.link] ? hitId(p.link) : (ui.lens ? 'may' : null)) : hit(p.tags || []);
    var left = p.side ? p.side === 'left' : p.x > 65;
    var cls = 'pin' + (left ? ' left' : '') + (h ? ' lit' : '') + (ui.pick === k ? ' on' : '');
    var label = esc(p.label) + (h ? ' · ' + esc(lensWord(h)) : '');
    var pos = 'left: ' + p.x + '%; top: ' + p.y + '%';
    var inner = '<span class="ring">' + (p.link ? ICON.out : '<i></i>') + '</span><span class="plabel">' + label + '</span>';
    if (p.link && byId[p.link]) return '<a class="' + cls + '" style="' + pos + '" href="' + href(stackTo(stack, p.link)) + '" aria-label="Open recipe: ' + esc(p.label) + '">' + inner + '</a>';
    return '<button type="button" class="' + cls + '" style="' + pos + '" data-act="pick" data-val="' + k + '" data-k="pick:' + k + '" aria-pressed="' + (ui.pick === k) + '">' + inner + '</button>';
  }
  function viewPass(route) {
    var stack = route.stack;
    if (!stack.length) {
      return '<div class="page">' + header() + '<main id="main" style="display: flex; flex-direction: column; gap: 1.1rem">' +
        searchField('Dish, ingredient or allergen', passCount()) + kindChips() + lensChips() + '<div id="shelves" class="shelves">' + shelvesHTML() + '</div></main>' + footer() + '</div>';
    }
    var r = byId[stack[stack.length - 1]], dish = isDish(r);
    var trail = '<nav class="trail" aria-label="Zoom level"><a class="pill-link" href="#/recipes">' + ICON.left + 'The pass</a>' + stack.map(function (id, i) {
      var last = i === stack.length - 1;
      return '<span class="sep" aria-hidden="true">/</span>' + (last ? '<span class="here" aria-current="page">' + esc(byId[id].name) + '</span>' : '<a class="pill-link" href="' + href(stack.slice(0, i + 1)) + '">' + esc(byId[id].name) + '</a>');
    }).join('') + '</nav>';
    var left;
    if (dish) {
      var pk = ui.pick !== null && r.pins[ui.pick] && !r.pins[ui.pick].link ? r.pins[ui.pick] : null;
      left = '<div class="stage' + (ui.lens ? ' lensed' : '') + (r.done ? ' done' : '') + '" data-rid="' + esc(r.id) + '">' + art(r, 'art') + r.pins.map(function (p, k) { return pinHTML(p, k, stack); }).join('') + '</div>' +
        (pk ? '<div class="box outline" style="background: #fff"><span class="h3">' + esc(pk.label) + '</span>' + (pk.note ? '<div>' + esc(pk.note) + '</div>' : '') + '<div class="chips">' +
          ((pk.tags && pk.tags.length) ? pk.tags.map(function (t) { return '<span class="tag' + (t.slice(-1) === '?' ? ' maybe' : '') + '">' + esc(t) + '</span>'; }).join('') : '<span class="hint">No listed allergens</span>') + '</div></div>'
          : '<div class="hint" style="text-align: center">' + (r.pins.length ? 'Tap anything on the plate. A pin with an arrow opens its own recipe.' : 'No pins on this plate yet.') + '</div>') + sideView(r);
    } else {
      left = '<div class="pan-art' + (r.done ? ' done' : '') + '">' + art(r, 'art') + '</div>' + usedBox(r, stack, 'Goes on') + tipBox(r);
    }
    var parent = stack.length > 1 ? byId[stack[stack.length - 2]].name : 'the pass';
    return '<div class="page">' + header() + trail + jumps() + lensChips() +
      '<main id="main" class="cols"><div class="col">' + left + '</div><div class="col wide">' + cardHead(r) + allergenBox(r) +
      (dish ? '' : '<div class="sec"><h3 class="h3" id="r-ing">Into the pan</h3>' + ingTable(r, stack, true) + '</div>') +
      '<div id="r-steps" class="jump-at"></div>' + safetyBox(r) + diagram(r) + steps(r) +
      (dish ? '<div class="sec"><h3 class="h3" id="r-ing">Everything on it</h3>' + ingTable(r, stack, true) + '</div>' : '') +
      '</div></main>' + footer() +
      '<div class="zoombar"><a href="' + href(stack.slice(0, -1)) + '">' + ICON.zoom + 'Zoom out to ' + esc(parent) + '</a></div></div>';
  }

  /* ---------- welcome and settings ---------- */
  var MINI = {
    tiles: '<svg viewBox="0 0 240 130" aria-hidden="true"><rect width="240" height="130" fill="#FBFAF7"/><g fill="#FFFFFF" stroke="#D9D4C8" stroke-width="2"><rect x="12" y="14" width="66" height="48" rx="6"/><rect x="87" y="14" width="66" height="48" rx="6"/><rect x="162" y="14" width="66" height="48" rx="6"/><rect x="12" y="70" width="66" height="48" rx="6"/><rect x="87" y="70" width="66" height="48" rx="6"/><rect x="162" y="70" width="66" height="48" rx="6"/></g><g fill="#E2602A"><rect x="62" y="20" width="10" height="8" rx="1"/><rect x="137" y="20" width="10" height="8" rx="1"/><rect x="212" y="20" width="10" height="8" rx="1"/><rect x="62" y="76" width="10" height="8" rx="1"/><rect x="137" y="76" width="10" height="8" rx="1"/><rect x="212" y="76" width="10" height="8" rx="1"/></g><g fill="#1C1D1F"><rect x="20" y="38" width="38" height="6" rx="2"/><rect x="95" y="38" width="38" height="6" rx="2"/><rect x="170" y="38" width="38" height="6" rx="2"/><rect x="20" y="94" width="38" height="6" rx="2"/><rect x="95" y="94" width="38" height="6" rx="2"/><rect x="170" y="94" width="38" height="6" rx="2"/></g></svg>',
    list: '<svg viewBox="0 0 240 130" aria-hidden="true"><rect width="240" height="130" fill="#FBFAF7"/><rect x="12" y="14" width="72" height="3" fill="#1C1D1F"/><g fill="#FFFFFF" stroke="#E0DBCF" stroke-width="1.5"><rect x="12" y="20" width="72" height="22"/><rect x="12" y="44" width="72" height="22"/><rect x="12" y="68" width="72" height="22"/><rect x="12" y="92" width="72" height="22"/></g><rect x="12" y="44" width="72" height="22" fill="#F2EFE8"/><g fill="#E2602A"><rect x="17" y="27" width="8" height="8" rx="1"/><rect x="17" y="51" width="8" height="8" rx="1"/><rect x="17" y="75" width="8" height="8" rx="1"/><rect x="17" y="99" width="8" height="8" rx="1"/></g><rect x="96" y="14" width="132" height="104" rx="8" fill="#FFFFFF" stroke="#D9D4C8" stroke-width="2"/><rect x="106" y="24" width="70" height="9" rx="2" fill="#1C1D1F"/><rect x="106" y="38" width="112" height="2.5" fill="#1C1D1F"/><rect x="106" y="46" width="112" height="18" rx="4" fill="none" stroke="#1C1D1F" stroke-width="1.5"/><g fill="#1C1D1F"><circle cx="160" cy="76" r="4"/><circle cx="160" cy="90" r="4"/><circle cx="160" cy="104" r="4"/></g><g fill="#B9B4AA"><rect x="106" y="72" width="44" height="5" rx="2"/><rect x="106" y="84" width="44" height="5" rx="2"/><rect x="106" y="96" width="44" height="5" rx="2"/><rect x="168" y="74" width="50" height="4" rx="2"/><rect x="168" y="88" width="50" height="4" rx="2"/><rect x="168" y="102" width="50" height="4" rx="2"/></g></svg>',
    pass: '<svg viewBox="0 0 240 130" aria-hidden="true"><rect width="240" height="130" fill="#FBFAF7"/><g fill="#FFFFFF" stroke="#D3CEC4" stroke-width="2"><circle cx="36" cy="34" r="20"/><circle cx="92" cy="34" r="20"/><circle cx="148" cy="34" r="20"/><circle cx="204" cy="34" r="20"/></g><g><circle cx="36" cy="34" r="11" fill="#C98A45"/><circle cx="92" cy="34" r="12" fill="#B97A36"/><circle cx="148" cy="34" r="14" fill="#EFA444"/><rect x="194" y="26" width="20" height="14" rx="4" fill="#7A391D"/></g><rect x="10" y="60" width="220" height="5" rx="2.5" fill="#CFD3D8"/><g fill="#DADDE1" stroke="#A9AFB6" stroke-width="2"><rect x="16" y="76" width="46" height="32" rx="6"/><rect x="72" y="76" width="46" height="32" rx="6"/><rect x="128" y="76" width="46" height="32" rx="6"/><rect x="184" y="76" width="46" height="32" rx="6"/></g><rect x="21" y="81" width="36" height="22" rx="3" fill="#FBF7EE"/><rect x="77" y="81" width="36" height="22" rx="3" fill="#EFA444"/><rect x="133" y="81" width="36" height="22" rx="3" fill="#8E3A66"/><rect x="189" y="81" width="36" height="22" rx="3" fill="#B8742F"/><rect x="10" y="114" width="220" height="5" rx="2.5" fill="#CFD3D8"/></svg>'
  };
  function viewOptions(act, role) {
    return '<div class="views"' + (role ? ' role="radiogroup" aria-label="How the recipe book opens"' : '') + '>' + VIEWS.map(function (v) {
      var on = settings.view === v.id;
      return '<button type="button" class="view-opt" data-act="' + act + '" data-val="' + v.id + '" data-k="' + act + ':' + v.id + '"' +
        (role ? ' role="radio" aria-checked="' + on + '"' : '') + '>' + MINI[v.id] + '<span class="vo-name">' + esc(v.name) + '</span><span class="vo-desc">' + esc(v.desc) + '</span></button>';
    }).join('') + '</div>';
  }
  function viewPrep() {
    return '<div class="page">' + header() + '<main id="main" class="prep"><div id="prep-root"></div></main>' + footer() + '</div>';
  }
  /* Installing the book as an app. Chrome, Edge and Samsung Internet offer a real Install button;
     iPhone and iPad use Share, then Add to Home Screen. */
  var installEvt = window.lkInstall || null, installedNow = false, installFailed = false;
  function redrawInstall() { var n = parseRoute().name; if (n === 'settings' || n === 'landing') render(); }
  // index.html catches the browser's install offer early (and calls preventDefault, which Chrome needs before prompt()).
  window.addEventListener('lk-install', function () { installEvt = window.lkInstall; redrawInstall(); });
  window.addEventListener('appinstalled', function () { installEvt = null; installedNow = true; redrawInstall(); });
  function isStandalone() { return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; }
  function deviceKind() {
    var ua = navigator.userAgent || '', ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    return { ios: ios, mac: /Macintosh/.test(ua) && !ios, safari: /Safari/.test(ua) && !/Chrome|CriOS|Edg|FxiOS|Firefox/.test(ua), touch: ios || !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches) };
  }
  /* A card on the landing page for phones and tablets that have not installed the book yet. "Not now" is remembered on that device. */
  function installCard() {
    if (isStandalone() || installedNow || settings.installNo) return '';
    var k = deviceKind();
    if (!k.touch) return '';
    var msg, btn = '';
    if (installEvt && !installFailed) { msg = 'Put Kitchen Book on your home screen. It opens full screen, like any other app.'; btn = '<button type="button" class="btn dark" data-act="install">Install the app</button>'; }
    else if (k.ios) msg = 'Tap the Share button' + (k.safari ? '' : ' in Safari') + ', then <strong>Add to Home Screen</strong>. Kitchen Book then opens full screen from its own icon.';
    else msg = 'Open the browser menu (the three dots), then choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.';
    return '<section class="wall-install" aria-label="Install the app"><p class="wi-t">Install the app</p><p class="wi-m">' + msg + '</p><div class="btn-row">' + btn + '<button type="button" class="btn" data-act="installno">Not now</button></div></section>';
  }
  function installHTML() {
    var k = deviceKind(), ios = k.ios, mac = k.mac, safari = k.safari;
    var body;
    if (isStandalone() || installedNow) body = '<span class="saved">' + (installedNow ? 'Installed. Open it from your home screen or apps.' : 'You are using the installed app.') + '</span>';
    else if (installEvt && !installFailed) body = '<span class="hint">Puts Kitchen Book on the home screen or desktop like any other app, full screen, without the browser bar. It still updates by itself.</span><div class="btn-row"><button type="button" class="btn dark" data-act="install">Install the app</button></div>';
    else if (ios) body = '<span class="hint">On iPhone and iPad: tap the Share button' + (safari ? '' : ' in Safari') + ', then <strong>Add to Home Screen</strong>. Kitchen Book then opens full screen from its own icon.</span>';
    else if (mac && safari) body = '<span class="hint">In Safari on a Mac: <strong>File, Add to Dock</strong>.</span>';
    else body = '<span class="hint">Open the browser menu and choose <strong>Install</strong> or <strong>Add to Home screen</strong>. In Chrome or Edge it is also the install icon at the right of the address bar.</span>';
    return '<section class="set-block" aria-label="Install the app"><span class="label">Install the app</span>' + body + '</section>';
  }
  function viewSettings() {
    var nTicks = Object.keys(ticks).filter(function (k) { return ticks[k]; }).length;
    return '<div class="page">' + header() + '<main id="main" class="settings"><div class="row-label" style="justify-content: space-between; align-items: center">' +
      '<h2 tabindex="-1" id="rtitle">Settings</h2><a class="btn dark" href="#/">Done</a></div>' +
      installHTML() +
      '<section class="set-block" aria-label="Opens with"><span class="label">Opens with</span><span class="hint">How the recipe book looks when you arrive.</span>' + viewOptions('setview', true) + '</section>' +
      '<section class="set-block" aria-label="Text size"><span class="label">Text size</span><div class="chips">' + TEXT.map(function (t) {
        return '<button type="button" class="chip" data-act="settext" data-val="' + t[0] + '" data-k="settext:' + t[0] + '" aria-pressed="' + (settings.text === t[0]) + '">' + esc(t[1]) + '</button>';
      }).join('') + '</div></section>' +
      '<section class="set-block" aria-label="Ticked steps"><span class="label">Ticked steps</span><span class="hint">' + esc(plural(nTicks, 'step is', 'steps are')) + ' ticked. Ticks clear when you close the page.</span>' +
      '<div class="btn-row"><button type="button" class="btn" data-act="clearticks" data-k="clearticks">Clear all ticks</button></div></section>' +
      '<section class="set-block set-qr" aria-label="Open on a phone"><span class="label">Open on a phone</span><div class="qr-row"><img class="qr-img" src="qr.svg" width="180" height="180" alt="QR code that opens the Kitchen Book">' +
      '<div><p class="hint">Scan with a phone camera to open the Kitchen Book on that phone, then add it to the home screen so it is one tap away.</p><p class="qr-url">kuschikuschbert.github.io/leichhardt-kitchen</p>' +
      '<div class="btn-row"><a class="btn" href="qr-sign.pdf" target="_blank" rel="noopener">Print the A4 sign</a><a class="btn" href="qr.png" download="Leichhardt Kitchen Book QR.png">Download the QR code</a></div></div></div></section>' +
      '<section class="set-block" aria-label="Admin panel"><span class="label">Admin panel</span><span class="hint">For the head chef. It is always the key button at the top right of every page, next to Settings. The key is filled in when this phone or computer is signed in.</span></section>' +
      '<section class="set-block" aria-label="About"><span class="label">About</span><span class="saved">' + esc(plural(D.recipes.length, 'recipe', 'recipes')) + ', updated ' + esc(D.updated) +
      '. Settings are saved on this phone or tablet only.</span></section></main>' + footer() + '</div>';
  }

  /* ---------- routing and drawing ---------- */
  function parseRoute() {
    var parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    if (parts[0] === 'settings') return { name: 'settings', stack: [] };
    if (parts[0] === 'prep' || parts[0] === 'admin' || parts[0] === 'orders' || parts[0] === 'waste' || parts[0] === 'minutes') return { name: parts[0], stack: [] };
    if (parts[0] === 'r') {
      var stack = parts.slice(1).filter(function (id) { return byId[id]; });
      if (stack.length) return { name: 'recipe', stack: stack };
    }
    if (parts[0] === 'recipes') return { name: 'home', stack: [] };
    return { name: 'landing', stack: [] };
  }
  /* Recipe cards opened, counted on this phone (no names). The prep book sends the counts once someone is signed in. */
  function noteView(id) {
    if (!id) return;
    var v; try { v = JSON.parse(localStorage.getItem('lk.views') || '{}'); } catch (e) { v = {}; }
    v[id] = (v[id] || 0) + 1;
    try { localStorage.setItem('lk.views', JSON.stringify(v)); } catch (e) {}
  }
  var warmed = false;
  var lastHash = null, lastRoute = '', homeY = 0;
  window.addEventListener('scroll', function () { if (lastRoute === 'home') homeY = window.scrollY; }, { passive: true });
  function render() {
    var route = parseRoute();
    var changed = location.hash !== lastHash;
    if (changed) { ui.pick = null; }
    var keep = document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-k');
    var view = settings.view || 'pass';
    var html;
    if (route.name === 'landing') html = viewLanding();
    else if (route.name === 'settings') html = viewSettings();
    else if (route.name === 'prep' || route.name === 'admin' || route.name === 'orders' || route.name === 'waste' || route.name === 'minutes') html = viewPrep();
    else if (view === 'pass') html = viewPass(route);
    else html = viewTiles(route);
    // Swipeable chip rows keep their place when the page redraws (for example after tapping a chip at the far end).
    var rowsAt = Array.prototype.map.call(app.querySelectorAll('.chips.scroll'), function (el) { return el.scrollLeft; });
    if (route.name !== 'landing') html = topBar() + html + tabBar();
    app.innerHTML = html;
    if (!changed) Array.prototype.forEach.call(app.querySelectorAll('.chips.scroll'), function (el, i) { if (rowsAt[i]) el.scrollLeft = rowsAt[i]; });
    fitPins();
    if ((route.name === 'prep' || route.name === 'admin' || route.name === 'orders' || route.name === 'waste' || route.name === 'minutes') && window.LK_PREP) window.LK_PREP.mount(route.name, document.getElementById('prep-root'));
    // On any other page, connect to the prep book in the background so Prep, Orders and Wastage open straight away.
    else if (window.LK_PREP && window.LK_PREP.warm && !warmed) { warmed = true; setTimeout(function () { window.LK_PREP.warm(); }, 900); }
    var r = route.stack.length ? byId[route.stack[route.stack.length - 1]] : null;
    document.title = (r ? r.name + ' · ' : (route.name === 'settings' ? 'Settings · ' : route.name === 'prep' ? 'Prep list · ' : route.name === 'orders' ? 'Order list · ' : route.name === 'waste' ? 'Wastage · ' : route.name === 'minutes' ? 'Meeting minutes · ' : route.name === 'landing' ? '' : route.name === 'admin' ? 'Admin panel · ' : '')) + 'Leichhardt Kitchen Book';
    var prevRoute = lastRoute; lastRoute = route.name;
    if (changed && route.name === 'recipe') noteView(route.stack[route.stack.length - 1]);
    if (changed) {
      lastHash = location.hash;
      // Coming back to the recipe list from a recipe puts you where you were.
      window.scrollTo(0, route.name === 'home' && prevRoute === 'recipe' ? homeY : 0);
      var title = document.getElementById('rtitle');
      if (title && route.name !== 'home') title.focus({ preventScroll: true });
    } else if (keep) {
      var el = app.querySelector('[data-k="' + keep + '"]');
      if (el) {
        el.focus({ preventScroll: true });
        if (keep === 'find') { var v = el.value; el.setSelectionRange(v.length, v.length); }
      }
    }
  }

  // Pin labels stay off the food. Each plate drawing is painted to a small canvas to find where the food is,
  // then every label goes to the nearest free spot (not over food, other labels or other pins) with a thin
  // leader line back to its pin. Until the drawing has been read, the middle of the plate counts as food.
  var maskCache = {};
  function foodMask(stage, cb) {
    var svg = stage.querySelector('svg.art');
    if (!svg) return cb(null);
    var box = svg.getBoundingClientRect(), w = Math.round(box.width), h = Math.round(box.height);
    var key = (stage.getAttribute('data-rid') || '') + ':' + w;
    if (maskCache[key]) return cb(maskCache[key]);
    try {
      var c = svg.cloneNode(true);
      c.setAttribute('width', w); c.setAttribute('height', h); c.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      var img = new Image();
      img.onload = function () {
        try {
          var sc = 3, cw = Math.max(1, Math.round(w / sc)), ch = Math.max(1, Math.round(h / sc));
          var cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
          var cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, cw, ch);
          var d = cx.getImageData(0, 0, cw, ch).data, W1 = cw + 1, integ = new Int32Array(W1 * (ch + 1));
          for (var y = 0; y < ch; y++) {
            var row = 0;
            for (var x = 0; x < cw; x++) {
              var i = (y * cw + x) * 4, f = 0;
              if (d[i + 3] > 128) {
                var r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
                var sat = mx ? (mx - mn) / mx : 0, lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                f = (sat >= 0.14 || lum < 0.7) ? 1 : 0;   // plate, rim and shadow are pale greys; food is not
              }
              row += f;
              integ[(y + 1) * W1 + x + 1] = integ[y * W1 + x + 1] + row;
            }
          }
          var m = { s: sc, cw: cw, ch: ch, integ: integ };
          maskCache[key] = m; cb(m);
        } catch (e) { cb(null); }
      };
      img.onerror = function () { cb(null); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(c));
    } catch (e) { cb(null); }
  }
  function maskFrac(m, x0, y0, x1, y1) {
    var s = m.s, a = Math.max(0, Math.floor(x0 / s)), b = Math.max(0, Math.floor(y0 / s)), c = Math.min(m.cw, Math.ceil(x1 / s)), d = Math.min(m.ch, Math.ceil(y1 / s));
    if (c <= a || d <= b) return 0;
    var W1 = m.cw + 1, n = m.integ[d * W1 + c] - m.integ[b * W1 + c] - m.integ[d * W1 + a] + m.integ[b * W1 + a];
    return n / ((c - a) * (d - b));
  }
  function overlapArea(a, b) {
    var w = Math.min(a[2], b[2]) - Math.max(a[0], b[0]), h = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
    return w > 0 && h > 0 ? w * h : 0;
  }
  function layoutStage(stage, m) {
    var pins = Array.prototype.slice.call(stage.querySelectorAll('.pin'));
    if (!pins.length) return;
    var hints = pins.map(function (p) { return p.classList.contains('left'); });
    stage.classList.add('laid');
    stage.classList.toggle('dense', pins.length > 8);   // boards and platters: smaller labels
    var sr = stage.getBoundingClientRect(), svg = stage.querySelector('svg.art'), ar = svg ? svg.getBoundingClientRect() : sr;
    var ox = ar.left - sr.left, oy = ar.top - sr.top, W = sr.width, H = sr.height;
    var items = pins.map(function (p, k) {
      p.classList.remove('left', 'wrap');
      var rr = p.querySelector('.ring').getBoundingClientRect();
      return { p: p, lab: p.querySelector('.plabel'), wasLeft: hints[k], cx: rr.left + rr.width / 2 - sr.left, cy: rr.top + rr.height / 2 - sr.top, w: 0, h: 0 };
    });
    function food(x0, y0, x1, y1) {
      if (m) return maskFrac(m, x0 - ox, y0 - oy, x1 - ox, y1 - oy);
      return overlapArea([x0, y0, x1, y1], [W * 0.25, H * 0.25, W * 0.75, H * 0.75]) / ((x1 - x0) * (y1 - y0));
    }
    function arrange(wrapped) {
      items.forEach(function (it) { it.lab.classList.toggle('wrapl', wrapped); it.w = it.lab.offsetWidth; it.h = it.lab.offsetHeight; it.box = null; });
      var order = items.slice().sort(function (a, b) { return b.w * b.h - a.w * a.h; }), total = 0, step = 6;
      order.forEach(function (it) {
        var cands = [];
        for (var y = 2; y <= H - it.h - 2; y += step) {
          for (var x = 2; x <= W - it.w - 2; x += step) {
            var box = [x, y, x + it.w, y + it.h], pen = 0;
            items.forEach(function (o) {
              var rad = o === it ? 25 : 22, ring = [o.cx - rad, o.cy - rad, o.cx + rad, o.cy + rad];
              if (overlapArea(box, ring) > 0) pen += 40;
              if (o !== it && o.box && overlapArea([box[0] - 3, box[1] - 3, box[2] + 3, box[3] + 3], o.box) > 0) pen += 30;
            });
            var dx = Math.max(box[0] - it.cx, 0, it.cx - box[2]), dy = Math.max(box[1] - it.cy, 0, it.cy - box[3]);
            var sc = pen + food(box[0], box[1], box[2], box[3]) * 6 + Math.sqrt(dx * dx + dy * dy) / W * 4 + (((x + it.w / 2 < it.cx) !== it.wasLeft) ? 0.3 : 0);
            cands.push({ box: box, sc: sc, pen: pen });
          }
        }
        cands.sort(function (a, b) { return a.sc - b.sc; });
        // among the best spots, prefer one whose leader line does not cross another label or pin
        var best = null, bs = 1e9, bp = 0;
        cands.slice(0, 30).forEach(function (cd) {
          var bx = cd.box, px = Math.min(Math.max(it.cx, bx[0]), bx[2]), py = Math.min(Math.max(it.cy, bx[1]), bx[3]), cross = 0;
          for (var t = 0.2; t < 1; t += 0.2) {
            var qx = it.cx + (px - it.cx) * t, qy = it.cy + (py - it.cy) * t;
            items.forEach(function (o) {
              if (o === it) return;
              if (o.box && qx > o.box[0] - 2 && qx < o.box[2] + 2 && qy > o.box[1] - 2 && qy < o.box[3] + 2) cross += 1;
              if (Math.abs(qx - o.cx) < 22 && Math.abs(qy - o.cy) < 22) cross += 0.5;
            });
          }
          var tot = cd.sc + cross * 0.6;
          if (tot < bs) { bs = tot; best = cd.box; bp = cd.pen; }
        });
        if (!best) best = [2, 2, 2 + it.w, 2 + it.h];
        it.box = best; total += bp;
      });
      return total;
    }
    var t1 = arrange(false);
    if (t1 > 0) {
      var keep = items.map(function (it) { return it.box; });
      var t2 = arrange(true);
      if (t2 >= t1) { items.forEach(function (it, i) { it.lab.classList.remove('wrapl'); it.box = keep[i]; }); }
    }
    items.forEach(function (it) {
      var bx = it.box[0], by = it.box[1];
      it.lab.style.left = (bx - (it.cx - 22)) + 'px';
      it.lab.style.top = (by - (it.cy - 22)) + 'px';
      var lead = it.p.querySelector('.lead');
      if (!lead) { lead = document.createElement('span'); lead.className = 'lead'; lead.setAttribute('aria-hidden', 'true'); it.p.insertBefore(lead, it.p.firstChild); }
      var px = Math.min(Math.max(it.cx, bx), it.box[2]), py = Math.min(Math.max(it.cy, by), it.box[3]);
      var dist = Math.sqrt((px - it.cx) * (px - it.cx) + (py - it.cy) * (py - it.cy));
      if (dist > 26) {
        lead.style.display = 'block'; lead.style.width = dist + 'px';
        lead.style.transform = 'rotate(' + Math.atan2(py - it.cy, px - it.cx) + 'rad)';
      } else lead.style.display = 'none';
    });
  }
  function fitPins() {
    Array.prototype.forEach.call(app.querySelectorAll('.stage'), function (stage) {
      layoutStage(stage, null);
      foodMask(stage, function (m) { if (m && document.body.contains(stage)) layoutStage(stage, m); });
    });
  }
  window.addEventListener('resize', function () { fitPins(); });

  // Search redraws only the results, so typing stays fast and the keyboard stays open.
  var timer = null;
  function updateResults() {
    var route = parseRoute(), view = settings.view || 'pass';
    var box, count = document.getElementById('count');
    if (view === 'tiles' && (box = document.getElementById('results'))) { box.innerHTML = tilesHTML(); if (count) count.textContent = countText(); }
    else if (view === 'pass' && (box = document.getElementById('shelves'))) { box.innerHTML = shelvesHTML(); if (count) count.textContent = passCount(); }
    if (count) count.classList.toggle('is-on', / of /.test(count.textContent));
  }

  /* A search that finds no recipe at all is queued on this phone (prefixes typed on the way are dropped).
     The prep book sends the queue once someone is signed in, so the admin panel can show which cards people look for. */
  var missTimer = null;
  function noteMiss() {
    var s = q();
    if (s.length < 3 || D.recipes.some(function (r) { return matches(r.id); })) return;
    var l; try { l = JSON.parse(localStorage.getItem('lk.miss') || '[]'); } catch (x) { l = []; }
    var now = Date.now();
    l = l.filter(function (m) { return !(now - m.at < 120000 && (s.indexOf(m.q) === 0 || m.q.indexOf(s) === 0)); });
    l.push({ q: s.slice(0, 60), at: now });
    try { localStorage.setItem('lk.miss', JSON.stringify(l.slice(-40))); } catch (x) {}
  }
  app.addEventListener('input', function (e) {
    if (e.target.id !== 'find') return;
    ui.query = e.target.value;
    clearTimeout(timer);
    timer = setTimeout(updateResults, 60);
    clearTimeout(missTimer);
    missTimer = setTimeout(noteMiss, 2500);
  });

  app.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var act = el.getAttribute('data-act'), val = el.getAttribute('data-val');
    if (act === 'tick') {
      // Tick in place: no redraw needed.
      ticks[val] = !ticks[val];
      if (!ticks[val]) delete ticks[val];
      saveTicks();
      var on = !!ticks[val];
      el.setAttribute('aria-pressed', String(on));
      el.querySelector('.dot').innerHTML = on ? ICON.check : el.getAttribute('data-n');
      return;
    }
    if (act === 'jump') { var jt = document.getElementById(val); if (jt) jt.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (act === 'kind') { ui.kind = val; }
    else if (act === 'free') { ui.free = ui.free.indexOf(val) >= 0 ? ui.free.filter(function (x) { return x !== val; }) : ui.free.concat([val]); }
    else if (act === 'lens') { ui.lens = ui.lens === val ? null : val; }
    else if (act === 'pick') { var k = Number(val); ui.pick = ui.pick === k ? null : k; }
    else if (act === 'setview' || act === 'topview') { var was = settings.view; settings.view = val; saveSettings(); if (act === 'topview' && was !== val) { render(); window.scrollTo(0, 0); return; } }
    else if (act === 'settext') { settings.text = val; saveSettings(); document.documentElement.setAttribute('data-text', val); }
    else if (act === 'clearticks') { ticks = {}; saveTicks(); }
    else if (act === 'installno') { settings.installNo = true; saveSettings(); }
    else if (act === 'install') {
      if (installEvt) {
        var ev = installEvt; installEvt = null; window.lkInstall = null;
        var failed = function () { installFailed = true; render(); };
        try {
          var shown = ev.prompt();
          if (shown && shown.catch) shown.catch(failed);
          (ev.userChoice || Promise.resolve({})).then(function (c) { if (c && c.outcome === 'accepted') installedNow = true; render(); }, failed);
        } catch (err) { failed(); }
      }
      return;
    }
    render();
  });

  window.addEventListener('hashchange', render);
  render();
})();
