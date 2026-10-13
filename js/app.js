/*
  Leichhardt Kitchen Recipe Book
  Plain JavaScript, no build step. Recipes live in js/data.js, drawings in js/art.js.

  Pages (hash links, so the phone's back button works):
    #/welcome          first visit: pick how the book opens
    #/settings         settings
    #/                 home, in the chosen view (Tiles, List or The Pass)
    #/r/barra/laksa    a recipe; the path is the trail you took to get there
*/
(function () {
  'use strict';

  var D = window.LK_DATA;
  var ART = window.LK_ART;
  var app = document.getElementById('app');

  var KIND = { main: 'Main', side: 'Side', dessert: 'Dessert', batch: 'Batch recipe', component: 'Component' };
  var VIEWS = [
    { id: 'tiles', name: 'Tiles', desc: 'Every recipe as a card, with search and filters on top.' },
    { id: 'list', name: 'List', desc: 'A short list on one side and the open recipe on the other.' },
    { id: 'pass', name: 'The Pass', desc: 'Dishes as plates, batch recipes as pans. Tap the food to go deeper.' }
  ];
  var KINDS = [['all', 'All'], ['main', 'Mains'], ['side', 'Sides'], ['dessert', 'Desserts'], ['batch', 'Batch recipes'], ['component', 'Components']];
  var GROUPS = [['Mains', ['main']], ['Sides', ['side']], ['Desserts', ['dessert']], ['Batch recipes', ['batch']], ['Components', ['component']]];
  var SHELVES = [['On the pass: mains', ['main']], ['Sides', ['side']], ['Desserts', ['dessert']], ['Bains and prep', ['batch', 'component']]];
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
    hay[r.id] = [r.name, r.avc || '', r.menu || '', r.yield, KIND[r.kind], r.forLine].concat(r.ingredients.map(function (i) { return i.name; }), t).join(' ').toLowerCase();
  });

  /* ---------- settings (saved on this device) and ticked steps (this visit) ---------- */
  var SKEY = 'lk.settings.v1', TKEY = 'lk.ticks.v1';
  function store(kind) { try { var s = window[kind]; s.getItem('x'); return s; } catch (e) { return null; } }
  var LS = store('localStorage'), SS = store('sessionStorage');
  function readJSON(s, key) { if (!s) return null; try { return JSON.parse(s.getItem(key) || 'null'); } catch (e) { return null; } }
  function writeJSON(s, key, val) { if (!s) return; try { s.setItem(key, JSON.stringify(val)); } catch (e) {} }
  var settings = Object.assign({ view: null, text: 'normal' }, readJSON(LS, SKEY) || {});
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
  function isDish(r) { return r.kind === 'main' || r.kind === 'side' || r.kind === 'dessert'; }
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
  function href(stack) { return stack.length ? '#/r/' + stack.join('/') : '#/'; }
  function stackTo(stack, id) { var i = stack.indexOf(id); return i >= 0 ? stack.slice(0, i + 1) : stack.concat([id]); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  var ICON = {
    gear: '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M19.4 13.5l1.6 1.2-1.8 3.1-1.9-.7a7.6 7.6 0 0 1-1.7 1l-.3 2h-3.6l-.3-2a7.6 7.6 0 0 1-1.7-1l-1.9.7L5 14.7l1.6-1.2a7.4 7.4 0 0 1 0-2L5 10.3l1.8-3.1 1.9.7a7.6 7.6 0 0 1 1.7-1l.3-2h3.6l.3 2a7.6 7.6 0 0 1 1.7 1l1.9-.7 1.8 3.1-1.6 1.2a7.4 7.4 0 0 1 0 2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    left: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 L5 8 L10 13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    right: '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" style="flex:0 0 14px"><path d="M6 3 L11 8 L6 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5 L6.5 12 L13 4.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    out: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M5 13 L13 5 M7 5 H13 V11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    zoom: '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5.5 8.5 H11.5 M13 13 L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    plate: '<svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="9" cy="9" r="3.5" fill="#E2602A"/></svg>'
  };

  function art(r, cls) {
    if (r.art && ART.plates[r.art]) return '<svg class="' + cls + '" viewBox="2 16 212 212" aria-hidden="true" focusable="false">' + ART.plates[r.art] + '</svg>';
    if (r.art && ART.pans[r.art]) return '<svg class="' + cls + '" viewBox="0 0 200 140" aria-hidden="true" focusable="false">' + ART.pans[r.art] + '</svg>';
    if (isDish(r)) return '<svg class="' + cls + '" viewBox="2 16 212 212" aria-hidden="true" focusable="false"><circle cx="106" cy="120" r="100" fill="#FFFFFF" stroke="#D3CEC4" stroke-width="2"/><circle cx="106" cy="120" r="60" fill="none" stroke="#C9C3B6" stroke-width="2" stroke-dasharray="6 6"/></svg>';
    return '<svg class="' + cls + '" viewBox="0 0 200 140" aria-hidden="true" focusable="false"><rect x="4" y="6" width="192" height="128" rx="14" fill="#DADDE1" stroke="#A9AFB6" stroke-width="2"/><rect x="20" y="22" width="160" height="96" rx="6" fill="none" stroke="#A9AFB6" stroke-width="2" stroke-dasharray="6 6"/></svg>';
  }

  /* ---------- shared page parts ---------- */
  function header(count) {
    return '<header class="top"><a class="brand" href="#/"><span class="eyebrow">Leichhardt Hotel Kitchen</span><h1>Recipe Book</h1></a>' +
      '<div class="top-right">' + (count ? '<span class="count" id="count">' + esc(count) + '</span>' : '') +
      '<a class="icon-btn" href="#/settings">' + ICON.gear + '<span>Settings</span></a></div></header>';
  }
  function footer() {
    return '<footer class="foot"><div>Cook as written. Check with the head chef or sous chef before changing anything.</div>' +
      '<div>Allergens are worked out from the ingredients. Always check the supplier labels before answering a guest.</div></footer>';
  }
  function countText() {
    var shown = D.recipes.filter(function (r) { return matches(r.id) && freeOk(r.id) && (ui.kind === 'all' || r.kind === ui.kind || settings.view !== 'tiles'); }).length;
    return shown === D.recipes.length ? plural(D.recipes.length, 'recipe', 'recipes') : shown + ' of ' + D.recipes.length + ' recipes';
  }
  function searchField(placeholder) {
    return '<div class="field"><label class="label" for="find">Search</label>' +
      '<input id="find" class="search" type="search" autocomplete="off" data-k="find" placeholder="' + esc(placeholder) + '" value="' + esc(ui.query) + '"></div>';
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
    return '<div class="card-head"><div><span class="eyebrow">' + esc(KIND[r.kind] + ' · ' + r.forLine) + '</span>' +
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
      return '<div class="ing-row' + (h ? ' hit' : '') + '"><div class="q">' + esc(i.q) + '</div><div class="n">' + name +
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
    return '<div class="sec"><h3 class="h3">' + esc(d.title || 'How to cut') + '</h3><svg class="diagram" viewBox="' + esc(d.viewBox) + '" role="img" aria-label="' + esc(d.label) + '">' + d.body + '</svg></div>';
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
    if (withHome) parts.push('<a href="#/">All recipes</a>');
    stack.forEach(function (id, i) {
      var last = i === stack.length - 1;
      parts.push(last ? '<span aria-current="page">' + esc(byId[id].name) + '</span>' : '<a href="' + href(stack.slice(0, i + 1)) + '">' + esc(byId[id].name) + '</a>');
    });
    return '<nav class="crumbs" aria-label="Breadcrumb">' + parts.join('<span class="sep" aria-hidden="true">/</span>') + '</nav>';
  }
  function recipeCard(r, stack, withHome) {
    return '<article class="card">' + crumbs(stack, withHome) + cardHead(r) + allergenBox(r) +
      '<div class="cols"><div class="col"><h3 class="h3">Ingredients</h3>' + ingTable(r, stack, false) + tipBox(r) + usedBox(r, stack) +
      (isDish(r) && r.art && ART.plates[r.art] ? '<div class="sec"><h3 class="h3">On the plate</h3>' + art(r, 'card-art') + '</div>' : '') +
      (!isDish(r) && r.art && ART.pans[r.art] ? '<div class="sec"><h3 class="h3">In the pan</h3>' + art(r, 'card-art') + '</div>' : '') + '</div>' +
      '<div class="col wide">' + safetyBox(r) + diagram(r) + steps(r) + '</div></div></article>';
  }

  /* ---------- view A: tiles ---------- */
  function tilesHTML() {
    var list = D.recipes.filter(function (r) { return (ui.kind === 'all' || r.kind === ui.kind) && freeOk(r.id) && matches(r.id); });
    if (!list.length) return '<div class="empty">No recipes match. Clear the search or the filters.</div>';
    return '<div class="tiles">' + list.map(function (r) {
      return '<a class="tile" href="#/r/' + esc(r.id) + '"><span class="t-top"><span class="t-kind">' + esc(KIND[r.kind] + (r.forLine === 'Template' ? ' · Template' : '')) + '</span>' +
        '<span class="t-no">' + esc(r.no) + '</span></span><span class="t-name">' + esc(r.name) + '</span><span class="t-yield">' + esc(r.yield) + '</span>' +
        '<span class="chips">' + rows[r.id].map(function (a) { return '<span class="tag' + (a.maybe ? ' maybe' : '') + '">' + esc(a.label) + '</span>'; }).join('') +
        (missing[r.id].length ? '<span class="tag maybe">Allergens incomplete</span>' : '') + '</span></a>';
    }).join('') + '</div>';
  }
  function viewTiles(route) {
    if (route.stack.length) {
      var r = byId[route.stack[route.stack.length - 1]];
      return '<div class="page">' + header() + '<main id="main">' + recipeCard(r, route.stack, true) + '</main>' + footer() + '</div>';
    }
    var kinds = KINDS.map(function (k) {
      var n = k[0] === 'all' ? D.recipes.length : D.recipes.filter(function (r) { return r.kind === k[0]; }).length;
      return '<button type="button" class="chip" data-act="kind" data-val="' + k[0] + '" data-k="kind:' + k[0] + '" aria-pressed="' + (ui.kind === k[0]) + '">' + esc(k[1]) + ' (' + n + ')</button>';
    }).join('');
    return '<div class="page">' + header(countText()) + '<main id="main" style="display: flex; flex-direction: column; gap: 1.1rem">' +
      searchField('Dish, ingredient or allergen') +
      '<div class="chips" role="group" aria-label="Recipe type">' + kinds + '</div>' + freeChips(false) +
      '<div id="results">' + tilesHTML() + '</div><div class="hint">Allergen tags with a ? may be in it: check the supplier label.</div></main>' + footer() + '</div>';
  }

  /* ---------- view B: list and card ---------- */
  function groupsHTML(curId) {
    var s = q(), shown = 0;
    var html = GROUPS.map(function (g) {
      var items = D.recipes.filter(function (r) { return g[1].indexOf(r.kind) >= 0 && freeOk(r.id) && matches(r.id); }).map(function (r) {
        var sub = rows[r.id].length ? rows[r.id].map(function (a) { return a.label; }).join(' · ') : (r.forLine === 'Template' ? 'Template' : 'No listed allergens');
        if (missing[r.id].length) sub = 'Allergens incomplete' + (rows[r.id].length ? ' · ' + sub : '');
        if (s && r.name.toLowerCase().indexOf(s) < 0) {
          var hits = r.ingredients.filter(function (i) { return i.name.toLowerCase().indexOf(s) >= 0; }).map(function (i) { return i.name; });
          if (hits.length) sub = 'Uses ' + hits.join(', ');
        }
        return '<a class="lrow" href="#/r/' + esc(r.id) + '"' + (r.id === curId ? ' aria-current="page"' : '') + '><span class="l-no">' + esc(r.no) + '</span>' +
          '<span class="l-main"><span class="l-name">' + esc(r.name) + '</span><span class="l-sub">' + esc(sub) + '</span></span>' + ICON.right + '</a>';
      });
      shown += items.length;
      return items.length ? '<div class="group"><div class="group-head"><span>' + esc(g[0]) + '</span><span>' + items.length + '</span></div><div class="rows">' + items.join('') + '</div></div>' : '';
    }).join('');
    return shown ? html : '<div class="empty">No recipes match. Clear the search or the Free from filter.</div>';
  }
  function viewList(route) {
    var stack = route.stack, r = stack.length ? byId[stack[stack.length - 1]] : null;
    var back = '';
    if (r) {
      var parent = stack.length > 1 ? byId[stack[stack.length - 2]] : null;
      back = '<div class="backbar"><a class="pill-link" href="' + href(stack.slice(0, -1)) + '">' + ICON.left + esc(parent ? parent.name : 'All recipes') + '</a></div>';
    }
    return '<div class="page">' + back + header(countText()) +
      '<div class="split' + (r ? ' has-recipe' : '') + '"><aside class="split-list" aria-label="Recipe list">' +
      searchField('Dish, ingredient or allergen') + freeChips(true) + '<div id="groups" style="display: flex; flex-direction: column; gap: 0.9rem">' + groupsHTML(r && r.id) + '</div></aside>' +
      '<main id="main" class="split-main">' + (r ? recipeCard(r, stack, false)
        : '<div class="pick-panel"><span class="label" style="color: var(--ink)">Pick a recipe</span><span>Choose one from the list. Its allergens show first, then ingredients and method.</span></div>') +
      '</main></div>' + footer() + '</div>';
  }

  /* ---------- view C: the pass ---------- */
  function shelvesHTML() {
    var s = q(), n = 0;
    var html = SHELVES.map(function (sh) {
      var items = D.recipes.filter(function (r) { return sh[1].indexOf(r.kind) >= 0; }).map(function (r) {
        var h = hitId(r.id), m = matches(r.id), dish = isDish(r);
        if (s && m) n++;
        var links = r.ingredients.filter(function (i) { return i.link && byId[i.link]; }).map(function (i) { return byId[i.link].short || byId[i.link].name; });
        var used = (usedIn[r.id] || []).map(function (id) { return byId[id].name; });
        var sub = dish ? (r.forLine === 'Template' ? 'Template' : (links.length ? 'With ' + links.join(', ') : 'Card ' + r.no)) : (used.length ? 'Goes on ' + used.join(', ') : KIND[r.kind]);
        var faded = (ui.lens && !h) || (s && !m);
        return '<a class="dish' + (dish ? '' : ' pan') + (h ? ' lit' : '') + (faded ? ' faded' : '') + '" href="#/r/' + esc(r.id) + '" aria-label="' +
          esc(r.name + (h ? (h === 'may' ? ', may have ' : ', has ') + ui.lens : '')) + '">' + art(r, 'art') +
          '<span class="d-name">' + esc(r.name) + '</span><span class="d-sub">' + esc(sub) + '</span>' +
          (h ? '<span class="tag dark">' + esc((h === 'may' ? 'May have ' : 'Has ') + ui.lens) + '</span>' : '') + '</a>';
      }).join('');
      return '<section class="shelf" aria-label="' + esc(sh[0]) + '"><div class="group-head"><span>' + esc(sh[0]) + '</span></div><div class="shelf-items">' + items + '</div><div class="rail" aria-hidden="true"></div></section>';
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
      return '<div class="page">' + header(passCount()) + '<main id="main" style="display: flex; flex-direction: column; gap: 1.1rem">' +
        searchField('Dish, ingredient or allergen') + lensChips() + '<div id="shelves" class="shelves">' + shelvesHTML() + '</div></main>' + footer() + '</div>';
    }
    var r = byId[stack[stack.length - 1]], dish = isDish(r);
    var trail = '<nav class="trail" aria-label="Zoom level"><a class="pill-link" href="#/">' + ICON.left + 'The pass</a>' + stack.map(function (id, i) {
      var last = i === stack.length - 1;
      return '<span class="sep" aria-hidden="true">/</span>' + (last ? '<span class="here" aria-current="page">' + esc(byId[id].name) + '</span>' : '<a class="pill-link" href="' + href(stack.slice(0, i + 1)) + '">' + esc(byId[id].name) + '</a>');
    }).join('') + '</nav>';
    var left;
    if (dish) {
      var pk = ui.pick !== null && r.pins[ui.pick] && !r.pins[ui.pick].link ? r.pins[ui.pick] : null;
      left = '<div class="stage' + (ui.lens ? ' lensed' : '') + '">' + art(r, 'art') + r.pins.map(function (p, k) { return pinHTML(p, k, stack); }).join('') + '</div>' +
        (pk ? '<div class="box outline" style="background: #fff"><span class="h3">' + esc(pk.label) + '</span><div>' + esc(pk.note || '') + '</div><div class="chips">' +
          ((pk.tags && pk.tags.length) ? pk.tags.map(function (t) { return '<span class="tag' + (t.slice(-1) === '?' ? ' maybe' : '') + '">' + esc(t) + '</span>'; }).join('') : '<span class="hint">No listed allergens</span>') + '</div></div>'
          : '<div class="hint" style="text-align: center">' + (r.pins.length ? 'Tap anything on the plate. A pin with an arrow opens its own recipe.' : 'No pins on this plate yet.') + '</div>');
    } else {
      left = '<div class="pan-art">' + art(r, 'art') + '</div>' + usedBox(r, stack, 'Goes on') + tipBox(r);
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
  function viewWelcome() {
    return '<div class="page">' + header() + '<main id="main" class="welcome"><h2 tabindex="-1" id="rtitle">How do you want to see the recipes?</h2>' +
      '<div class="hint" style="font-size: 1rem">Pick one to start. You can change it any time in Settings.</div>' + viewOptions('choose', false) + '</main>' + footer() + '</div>';
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
      '<section class="set-block" aria-label="Welcome screen"><span class="label">Welcome screen</span><span class="hint">Show the "How do you want to see the recipes?" screen again.</span>' +
      '<div class="btn-row"><button type="button" class="btn" data-act="welcome" data-k="welcome">Show the welcome screen</button></div></section>' +
      '<section class="set-block" aria-label="About"><span class="label">About</span><span class="saved">' + esc(plural(D.recipes.length, 'recipe', 'recipes')) + ', updated ' + esc(D.updated) +
      '. Settings are saved on this phone or tablet only.</span></section></main>' + footer() + '</div>';
  }

  /* ---------- routing and drawing ---------- */
  function parseRoute() {
    var parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    if (parts[0] === 'welcome') return { name: 'welcome', stack: [] };
    if (parts[0] === 'settings') return { name: 'settings', stack: [] };
    if (parts[0] === 'r') {
      var stack = parts.slice(1).filter(function (id) { return byId[id]; });
      if (stack.length) return { name: 'recipe', stack: stack };
    }
    return { name: 'home', stack: [] };
  }
  var lastHash = null;
  function render() {
    var route = parseRoute();
    if (route.name === 'home' && !settings.view) { location.replace('#/welcome'); return; }
    var changed = location.hash !== lastHash;
    if (changed) { ui.pick = null; }
    var keep = document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-k');
    var view = settings.view || 'tiles';
    var html;
    if (route.name === 'welcome') html = viewWelcome();
    else if (route.name === 'settings') html = viewSettings();
    else if (view === 'list') html = viewList(route);
    else if (view === 'pass') html = viewPass(route);
    else html = viewTiles(route);
    app.innerHTML = html;
    var r = route.stack.length ? byId[route.stack[route.stack.length - 1]] : null;
    document.title = (r ? r.name + ' · ' : (route.name === 'settings' ? 'Settings · ' : '')) + 'Leichhardt Kitchen Recipe Book';
    if (changed) {
      lastHash = location.hash;
      window.scrollTo(0, 0);
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

  // Search redraws only the results, so typing stays fast and the keyboard stays open.
  var timer = null;
  function updateResults() {
    var route = parseRoute(), view = settings.view || 'tiles';
    var box, count = document.getElementById('count');
    if (view === 'tiles' && (box = document.getElementById('results'))) { box.innerHTML = tilesHTML(); if (count) count.textContent = countText(); }
    else if (view === 'list' && (box = document.getElementById('groups'))) {
      box.innerHTML = groupsHTML(route.stack.length ? route.stack[route.stack.length - 1] : null);
      if (count) count.textContent = countText();
    }
    else if (view === 'pass' && (box = document.getElementById('shelves'))) { box.innerHTML = shelvesHTML(); if (count) count.textContent = passCount(); }
  }

  app.addEventListener('input', function (e) {
    if (e.target.id !== 'find') return;
    ui.query = e.target.value;
    clearTimeout(timer);
    timer = setTimeout(updateResults, 60);
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
    else if (act === 'choose') { settings.view = val; saveSettings(); location.hash = '#/'; return; }
    else if (act === 'setview') { settings.view = val; saveSettings(); }
    else if (act === 'settext') { settings.text = val; saveSettings(); document.documentElement.setAttribute('data-text', val); }
    else if (act === 'clearticks') { ticks = {}; saveTicks(); }
    else if (act === 'welcome') { location.hash = '#/welcome'; return; }
    render();
  });

  window.addEventListener('hashchange', render);
  render();
})();
