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
  function matches(id) { var s = q(); return !s || hay[id].indexOf(s) >= 0; }
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
  /* The same top bar on every page as on the landing page: brand (goes home), the menu, Admin and Settings. */
  function topBar() {
    return '<header class="wtop"><a class="rail-brand" href="#/"><span>Leichhardt Hotel Kitchen</span><b>Kitchen Book</b></a>' + pillNav() +
      '<span class="rail-icons">' + adminLink('rail-set') + '<a class="rail-set" href="#/settings" aria-label="Settings"' + (parseRoute().name === 'settings' ? ' aria-current="page"' : '') + '>' + ICON.gear + '<span class="rail-lbl">Settings</span></a></span></header>';
  }
  /* Under the top bar, the recipe pages get their own tools row: how many recipes, and the Pass / Tiles switch. */
  function header() { return ''; }
  var DOCKETS = [['01', 'Recipes', '#/recipes', 'recipes'], ['02', 'Prep list', '#/prep', 'prep'], ['03', 'Orders', '#/orders', 'orders'], ['04', 'Wastage', '#/waste', 'waste']];
  function viewLanding() {
    var today = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
    return '<div class="wall">' + topBar() +
      '<main id="main" class="wall-main"><h2 class="wall-h" id="rtitle" tabindex="-1">Pick a docket</h2><p class="wall-date">' + esc(today) + '</p>' +
      '<div class="dockets">' + DOCKETS.map(function (d) {
        return '<a class="docket" href="' + d[2] + '"><span class="pin" aria-hidden="true"></span><span class="dk-top"><span class="dk-name">' + d[1] + '</span><span class="dk-no">No. ' + d[0] + '</span></span>' +
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
    return '<div class="field"><div class="field-head"><label class="label" for="find">Search</label>' + (count != null ? '<span class="count" id="count">' + esc(count) + '</span>' : '') + '</div>' +
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
    var h = '<section class="box outline" aria-label="Allergens"><div class="row-label" style="justify-content: space-between"><span class="label">Allergens</span>' +
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
  function recipeCard(r, stack, withHome) {
    return '<article class="card' + (r.done ? ' done' : '') + '">' + crumbs(stack, withHome) + cardHead(r) + allergenBox(r) +
      '<div class="cols"><div class="col"><h3 class="h3">Ingredients</h3>' + ingTable(r, stack, false) + tipBox(r) + usedBox(r, stack) +
      (isDish(r) && r.art && ART.plates[r.art] ? '<div class="sec"><h3 class="h3">On the plate</h3>' + art(r, 'card-art') + '</div>' : '') + sideView(r) +
      (!isDish(r) && r.art && ART.pans[r.art] ? '<div class="sec"><h3 class="h3">In the pan</h3>' + art(r, 'card-art') + '</div>' : '') + '</div>' +
      '<div class="col wide">' + safetyBox(r) + diagram(r) + steps(r) + '</div></div></article>';
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
    return any ? '<div class="tile-groups">' + html + '</div>' : '<div class="empty">No recipes match. Clear the search or the filters.</div>';
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
      var items = sh.list.map(function (r) {
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
    return html + (s && !n ? '<div class="empty">Nothing on the pass matches. Clear the search.</div>' : '');
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
      left = '<div class="stage' + (ui.lens ? ' lensed' : '') + (r.done ? ' done' : '') + '">' + art(r, 'art') + r.pins.map(function (p, k) { return pinHTML(p, k, stack); }).join('') + '</div>' +
        (pk ? '<div class="box outline" style="background: #fff"><span class="h3">' + esc(pk.label) + '</span>' + (pk.note ? '<div>' + esc(pk.note) + '</div>' : '') + '<div class="chips">' +
          ((pk.tags && pk.tags.length) ? pk.tags.map(function (t) { return '<span class="tag' + (t.slice(-1) === '?' ? ' maybe' : '') + '">' + esc(t) + '</span>'; }).join('') : '<span class="hint">No listed allergens</span>') + '</div></div>'
          : '<div class="hint" style="text-align: center">' + (r.pins.length ? 'Tap anything on the plate. A pin with an arrow opens its own recipe.' : 'No pins on this plate yet.') + '</div>') + sideView(r);
    } else {
      left = '<div class="pan-art' + (r.done ? ' done' : '') + '">' + art(r, 'art') + '</div>' + usedBox(r, stack, 'Goes on') + tipBox(r);
    }
    var parent = stack.length > 1 ? byId[stack[stack.length - 2]].name : 'the pass';
    return '<div class="page">' + header() + trail + lensChips() +
      '<main id="main" class="cols"><div class="col">' + left + '</div><div class="col wide">' + cardHead(r) + allergenBox(r) +
      (dish ? '' : '<div class="sec"><h3 class="h3">Into the pan</h3>' + ingTable(r, stack, true) + '</div>') +
      safetyBox(r) + diagram(r) + steps(r) +
      (dish ? '<div class="sec"><h3 class="h3">Everything on it</h3>' + ingTable(r, stack, true) + '</div>' : '') +
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
  function viewSettings() {
    var nTicks = Object.keys(ticks).filter(function (k) { return ticks[k]; }).length;
    return '<div class="page">' + header() + '<main id="main" class="settings"><div class="row-label" style="justify-content: space-between; align-items: center">' +
      '<h2 tabindex="-1" id="rtitle">Settings</h2><a class="btn dark" href="#/">Done</a></div>' +
      '<section class="set-block" aria-label="Opens with"><span class="label">Opens with</span><span class="hint">How the recipe book looks when you arrive.</span>' + viewOptions('setview', true) + '</section>' +
      '<section class="set-block" aria-label="Text size"><span class="label">Text size</span><div class="chips">' + TEXT.map(function (t) {
        return '<button type="button" class="chip" data-act="settext" data-val="' + t[0] + '" data-k="settext:' + t[0] + '" aria-pressed="' + (settings.text === t[0]) + '">' + esc(t[1]) + '</button>';
      }).join('') + '</div></section>' +
      '<section class="set-block" aria-label="Ticked steps"><span class="label">Ticked steps</span><span class="hint">' + esc(plural(nTicks, 'step is', 'steps are')) + ' ticked. Ticks clear when you close the page.</span>' +
      '<div class="btn-row"><button type="button" class="btn" data-act="clearticks" data-k="clearticks">Clear all ticks</button></div></section>' +
      '<section class="set-block" aria-label="Admin panel"><span class="label">Admin panel</span><span class="hint">For the head chef. It is always the key button at the top right of every page, next to Settings. The key is filled in when this phone or computer is signed in.</span></section>' +
      '<section class="set-block" aria-label="About"><span class="label">About</span><span class="saved">' + esc(plural(D.recipes.length, 'recipe', 'recipes')) + ', updated ' + esc(D.updated) +
      '. Settings are saved on this phone or tablet only.</span></section></main>' + footer() + '</div>';
  }

  /* ---------- routing and drawing ---------- */
  function parseRoute() {
    var parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    if (parts[0] === 'settings') return { name: 'settings', stack: [] };
    if (parts[0] === 'prep' || parts[0] === 'admin' || parts[0] === 'orders' || parts[0] === 'waste') return { name: parts[0], stack: [] };
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
    else if (route.name === 'prep' || route.name === 'admin' || route.name === 'orders' || route.name === 'waste') html = viewPrep();
    else if (view === 'pass') html = viewPass(route);
    else html = viewTiles(route);
    // Swipeable chip rows keep their place when the page redraws (for example after tapping a chip at the far end).
    var rowsAt = Array.prototype.map.call(app.querySelectorAll('.chips.scroll'), function (el) { return el.scrollLeft; });
    if (route.name !== 'landing') html = topBar() + html + tabBar();
    app.innerHTML = html;
    if (!changed) Array.prototype.forEach.call(app.querySelectorAll('.chips.scroll'), function (el, i) { if (rowsAt[i]) el.scrollLeft = rowsAt[i]; });
    fitPins();
    if ((route.name === 'prep' || route.name === 'admin' || route.name === 'orders' || route.name === 'waste') && window.LK_PREP) window.LK_PREP.mount(route.name, document.getElementById('prep-root'));
    // On any other page, connect to the prep book in the background so Prep, Orders and Wastage open straight away.
    else if (window.LK_PREP && window.LK_PREP.warm && !warmed) { warmed = true; setTimeout(function () { window.LK_PREP.warm(); }, 900); }
    var r = route.stack.length ? byId[route.stack[route.stack.length - 1]] : null;
    document.title = (r ? r.name + ' · ' : (route.name === 'settings' ? 'Settings · ' : route.name === 'prep' ? 'Prep list · ' : route.name === 'orders' ? 'Order list · ' : route.name === 'waste' ? 'Wastage · ' : route.name === 'landing' ? '' : route.name === 'admin' ? 'Admin panel · ' : '')) + 'Leichhardt Kitchen Book';
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

  // On narrow screens a pin label can run off the edge: flip it to the other side of its pin when it does.
  function fitPins() {
    var vw = document.documentElement.clientWidth;
    Array.prototype.forEach.call(app.querySelectorAll('.stage .pin'), function (pin) {
      pin.classList.remove('wrap');
      var box = pin.getBoundingClientRect();
      if (box.right > vw - 4 && !pin.classList.contains('left')) { pin.classList.add('left'); box = pin.getBoundingClientRect(); }
      else if (box.left < 4 && pin.classList.contains('left')) { pin.classList.remove('left'); box = pin.getBoundingClientRect(); }
      // a long label that fits on neither side wraps onto two lines instead of pushing the page sideways
      if (box.right > vw - 4 || box.left < 4) { pin.classList.add('wrap'); box = pin.getBoundingClientRect(); if (box.left < 4 && pin.classList.contains('left')) pin.classList.remove('left'); }
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
    if (act === 'kind') { ui.kind = val; }
    else if (act === 'free') { ui.free = ui.free.indexOf(val) >= 0 ? ui.free.filter(function (x) { return x !== val; }) : ui.free.concat([val]); }
    else if (act === 'lens') { ui.lens = ui.lens === val ? null : val; }
    else if (act === 'pick') { var k = Number(val); ui.pick = ui.pick === k ? null : k; }
    else if (act === 'setview' || act === 'topview') { settings.view = val; saveSettings(); }
    else if (act === 'settext') { settings.text = val; saveSettings(); document.documentElement.setAttribute('data-text', val); }
    else if (act === 'clearticks') { ticks = {}; saveTicks(); }
    render();
  });

  window.addEventListener('hashchange', render);
  render();
})();
