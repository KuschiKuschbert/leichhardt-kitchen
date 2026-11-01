/*
  Leichhardt Kitchen Book
  Plain JavaScript, no build step. Recipes live in js/data.js, drawings in js/art.js.

  Pages (hash links, so the phone's back button works):
    #/                 landing page: six dockets (Recipes, Prep, Orders, Wastage, Transfers, Guides)
    #/recipes          the recipes, as The Pass or Tiles
    #/r/barra/laksa    a recipe; the path is the trail you took to get there
    #/prep, #/orders, #/waste, #/transfers, #/minutes, #/mail, #/drinks, #/todo, #/admin   the prep book (js/prep.js)
    #/settings         settings
*/
(function () {
  'use strict';

  // Touch browsers can defer :active until release; keep navigation feedback visible during the actual press.
  var navPress = null;
  function navRelease() { if (navPress) navPress.classList.remove('is-pressed'); navPress = null; }
  document.addEventListener('pointerdown', function (e) {
    if (!e.isPrimary || e.button !== 0) return;
    navRelease();
    var el = e.target.closest && e.target.closest('.wtop-btn, .pnav a, .tabbar a, .wm-a');
    if (el && !el.matches(':disabled, [aria-disabled="true"]')) { navPress = el; el.classList.add('is-pressed'); }
  }, { passive: true });
  document.addEventListener('pointermove', function (e) {
    if (!navPress || !e.isPrimary) return;
    var r = navPress.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) navRelease();
  }, { passive: true });
  document.addEventListener('pointerup', navRelease, { passive: true });
  document.addEventListener('pointercancel', navRelease, { passive: true });
  window.addEventListener('blur', navRelease);
  document.addEventListener('visibilitychange', navRelease);

  var D = window.LK_DATA;
  var ART = window.LK_ART;
  var app = document.getElementById('app');

  var KIND = { main: 'Main', snack: 'Snack', side: 'Side', dessert: 'Dessert', batch: 'Batch recipe', component: 'Component' };
  var VIEWS = [
    { id: 'pass', name: 'The Pass', desc: 'Dishes as plates, batch recipes as pans. Tap the food to go deeper.' },
    { id: 'tiles', name: 'Tiles', desc: 'Every recipe as a card with its drawing, search and filters on top.' }
  ];
  var TEXT = [['normal', 'Normal'], ['large', 'Large'], ['xlarge', 'Extra large']];

  /* ---------- index: worked out when the page loads, and again when the head chef's recipe changes come in ----------
     (js/overlay.js lays them over js/data.js; js/prep.js says when new ones arrived: lk-rx) */
  var byId, usedIn, rolled, rows, tags, hay, missing;
  var MENU, PREP, placed, memb, GROUPS, SHELVES;
  var SPECIALS = 'Specials';   // the menu section the recipe form's Special switch uses (27 Oct 2026)
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
  function index() {
    byId = {}; usedIn = {}; rolled = {}; rows = {}; tags = {}; hay = {}; missing = {};
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
    MENU = []; PREP = []; placed = {}; memb = {};
    // Specials (27 Oct 2026): the head chef's Special switch puts a dish in this section; it always comes first
    var menu = (D.menuOrder || []).filter(function (s) { return s.title === SPECIALS; }).concat((D.menuOrder || []).filter(function (s) { return s.title !== SPECIALS; }));
    menu.forEach(function (s, i) {
      var list = (s.ids || []).filter(function (id) { return byId[id] && !placed[id]; });
      list.forEach(function (id) { placed[id] = true; byId[id].sec = s.title; });
      if (list.length) MENU.push({ key: s.title === SPECIALS ? 'sp' : 'm' + i, title: s.title, list: list.map(function (id) { return byId[id]; }) });
    });
    // A dish that is in no menu section still shows, so nothing goes missing.
    var other = D.recipes.filter(function (r) { return !placed[r.id] && (r.kind === 'main' || r.kind === 'snack' || r.kind === 'side' || r.kind === 'dessert'); });
    other.forEach(function (r) { r.sec = 'Other dishes'; });
    if (other.length) MENU.push({ key: 'mx', title: 'Other dishes', list: other });
    [['batch', 'Batch recipes'], ['component', 'Components']].forEach(function (k) {
      var list = D.recipes.filter(function (r) { return r.kind === k[0]; });
      if (list.length) PREP.push({ key: k[0], title: k[1], list: list });
    });
    GROUPS = MENU.concat(PREP);
    GROUPS.forEach(function (g) { memb[g.key] = {}; g.list.forEach(function (r) { memb[g.key][r.id] = true; }); });
    SHELVES = MENU.concat([{ key: 'prep', title: 'Bains and prep', list: PREP.reduce(function (all, g) { return all.concat(g.list); }, []) }]);

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
      hay[r.id] = [r.name, r.avc || '', r.menu || '', r.yield, KIND[r.kind], r.sec || '', r.forLine, r.aka || ''].concat(r.ingredients.map(function (i) { return i.name; }), t).join(' ').toLowerCase();
    });
  }
  // A recipe change that breaks the book's own index is dropped: the book falls back to js/data.js alone
  // (js/overlay.js then skips the changes at the next start too, until new ones come in).
  function indexSafe() {
    try { index(); } catch (e) {
      if (!window.LK_RX) throw e;
      if (window.console) console.warn('Kitchen Book: the recipe changes could not be drawn, showing js/data.js only.', e);
      window.LK_RX.apply(true); index();
    }
  }
  indexSafe();
  /* New recipe changes came in (js/prep.js, lk-rx): lay them over js/data.js again and work the index out again.
     Ticks on a recipe whose steps changed are cleared, a kind chip that no longer exists goes back to All. */
  function reindex() {
    var was = {};
    D.recipes.forEach(function (r) { was[r.id] = JSON.stringify(r.sections); });
    if (window.LK_RX) window.LK_RX.apply();
    indexSafe();
    sq = { key: null }; vocab = null; maskCache = {};
    if (ui.kind !== 'all' && !memb[ui.kind]) ui.kind = 'all';
    var cut = false;
    Object.keys(ticks).forEach(function (k) {
      var id = k.split(':')[0];
      if (!byId[id] || JSON.stringify(byId[id].sections) !== was[id]) { delete ticks[k]; cut = true; }
    });
    if (cut) saveTicks();
  }

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
    var gl = guideHits();
    if (gl.length) out += '<p class="s-note g-hits"><b>' + (gl.length === 1 ? 'Guide' : 'Guides') + ':</b> ' + gl.map(function (g) { return '<a href="#/guides/' + encodeURIComponent(g.id) + '">' + esc(g.title) + '</a>'; }).join(', ') + '</p>';
    return out;
  }
  /* How-to guides that match the search ("icombi", "fryer"), from the list kept on this phone */
  function guideHits() { return q().length >= 3 && window.LK_PREP && window.LK_PREP.guideSearch ? window.LK_PREP.guideSearch(q()) : []; }
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
    todo: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4.5H7a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V6A1.5 1.5 0 0 0 17 4.5h-2" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><rect x="9" y="3" width="6" height="3" rx="1" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M9 13l2 2 4-4.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    chef: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 14.2A3.6 3.6 0 1 1 8.6 7.4a4.6 4.6 0 0 1 6.8 0A3.6 3.6 0 1 1 17 14.2V20H7Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M7 16.8h10" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
    cup: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9h11v5.5A4.5 4.5 0 0 1 11.5 19h-2A4.5 4.5 0 0 1 5 14.5Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M8.5 3.5c-.8 1 .8 2 0 3M12 3.5c-.8 1 .8 2 0 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    exit: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M14 8l4 4-4 4M18 12H9" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    bell: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4a5 5 0 0 0-5 5v3.5c0 1.6-1 2.7-2 4h14c-1-1.3-2-2.4-2-4V9a5 5 0 0 0-5-5z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M10 19.5c.4 1 1 1.5 2 1.5s1.6-.5 2-1.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
    doc: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10.5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M9.5 11h5M9.5 14.5h5M9.5 18h3" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
    team: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8.5" r="3" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M3.5 19c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><circle cx="16.5" cy="9" r="2.4" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M16.5 14.2c2.2 0 3.7 1.6 4.1 4.3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    mail: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M3.5 7l8.5 6.5L20.5 7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></svg>',
    key: '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M12 12h9M18 12v3M21 12v2" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
    gear: '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M19.4 13.5l1.6 1.2-1.8 3.1-1.9-.7a7.6 7.6 0 0 1-1.7 1l-.3 2h-3.6l-.3-2a7.6 7.6 0 0 1-1.7-1l-1.9.7L5 14.7l1.6-1.2a7.4 7.4 0 0 1 0-2L5 10.3l1.8-3.1 1.9.7a7.6 7.6 0 0 1 1.7-1l.3-2h3.6l.3 2a7.6 7.6 0 0 1 1.7 1l1.9-.7 1.8 3.1-1.6 1.2a7.4 7.4 0 0 1 0 2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    left: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 L5 8 L10 13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    right: '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" style="flex:0 0 14px"><path d="M6 3 L11 8 L6 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5 L6.5 12 L13 4.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    out: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M5 13 L13 5 M7 5 H13 V11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    zoom: '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5.5 8.5 H11.5 M13 13 L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    plate: '<svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="9" cy="9" r="3.5" fill="#E2602A"/></svg>',
    cal: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M3.5 10h17M8 3v4M16 3v4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><circle cx="12" cy="15" r="1.6" fill="currentColor"/></svg>',
    pen: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="14" r="6.5" fill="none" stroke="currentColor" stroke-width="1.9"/><circle cx="9" cy="14" r="2.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M14.5 9.5 L20 4 L21.5 5.5 L16 11" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round"/></svg>'
  };

  // A card flagged done: true in data.js is 100% finished: green frame on the card and its drawings, plus a Finished chip.
  var DONE_TAG = '<span class="tag done-tag">Finished</span>';

  // a drawing made in the book ('@<id>', js/overlay.js) has its own frame (LK_ART.vb); the book's own use the plate and pan frames
  function art(r, cls) {
    var vb = ART.vb && r.art ? ART.vb[r.art] : '';
    if (r.art && ART.plates[r.art]) return '<svg class="' + cls + '" viewBox="' + (vb || '2 16 212 212') + '" aria-hidden="true" focusable="false">' + ART.plates[r.art] + '</svg>';
    if (r.art && ART.pans[r.art]) return '<svg class="' + cls + '" viewBox="' + (vb || '0 0 200 140') + '" aria-hidden="true" focusable="false">' + ART.pans[r.art] + '</svg>';
    if (isDish(r)) return '<svg class="' + cls + '" viewBox="2 16 212 212" aria-hidden="true" focusable="false"><circle cx="106" cy="120" r="100" fill="#FFFFFF" stroke="#D3CEC4" stroke-width="2"/><circle cx="106" cy="120" r="60" fill="none" stroke="#C9C3B6" stroke-width="2" stroke-dasharray="6 6"/></svg>';
    return '<svg class="' + cls + '" viewBox="0 0 200 140" aria-hidden="true" focusable="false"><rect x="4" y="6" width="192" height="128" rx="14" fill="#DADDE1" stroke="#A9AFB6" stroke-width="2"/><rect x="20" y="22" width="160" height="96" rx="6" fill="none" stroke="#A9AFB6" stroke-width="2" stroke-dasharray="6 6"/></svg>';
  }

  /* ---------- shared page parts ---------- */
  var NAV_ICON = {
    home: '<svg width="26" height="26" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 30L32 10l24 20"/><path d="M14 26v28h36V26"/><path d="M27 54V38h10v16"/></svg>',
    recipes: '<svg width="26" height="26" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="32" cy="32" r="22"/><circle cx="32" cy="32" r="13" stroke-dasharray="4 5"/><path d="M6 14v14M10 14v14M14 14v14M6 28h8M10 28v22"/><path d="M58 14c-3 2-5 6-5 11v3h5v22"/></svg>',
    prep: '<svg width="26" height="26" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="12" y="10" width="40" height="48" rx="5"/><path d="M24 10V7h16v3"/><path d="M20 24l3 3 5-6M20 38l3 3 5-6"/><path d="M34 25h12M34 39h12"/></svg>',
    orders: '<svg width="26" height="26" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 20l24-12 24 12v26L32 58 8 46z"/><path d="M8 20l24 12 24-12M32 32v26"/><path d="M20 14l24 12"/></svg>',
    waste: '<svg width="26" height="26" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 18h44"/><path d="M25 18v-6h14v6"/><path d="M15 18l3 38h28l3-38"/><path d="M27 28v18M37 28v18"/></svg>',
    // two arrows, one each way: stock that goes out to the other venues and comes in from them
    transfers: '<svg width="26" height="26" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 22h40"/><path d="M42 14l8 8-8 8"/><path d="M54 42H14"/><path d="M22 34l-8 8 8 8"/></svg>',
    guides: '<svg width="26" height="26" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M32 16c-6-4-14-6-24-6v38c10 0 18 2 24 6 6-4 14-6 24-6V10c-10 0-18 2-24 6z"/><path d="M32 16v38"/><path d="M14 21c4 0 8 1 12 3M14 31c4 0 8 1 12 3M38 24c4-2 8-3 12-3M38 34c4-2 8-3 12-3"/></svg>'
  };
  var NAV = [['recipes', 'Recipes', '#/recipes'], ['prep', 'Prep', '#/prep'], ['orders', 'Orders', '#/orders'], ['waste', 'Wastage', '#/waste'], ['transfers', 'Transfers', '#/transfers'], ['guides', 'Guides', '#/guides']];
  /* The head chef can hold Guides back from staff for now (People tab in the admin panel); js/prep.js knows who is on this phone */
  function featOn(k) { return !window.LK_PREP || !window.LK_PREP.featOn || window.LK_PREP.featOn(k); }
  function navList() { return NAV.filter(function (t) { if (window.LK_PREP && (!window.LK_PREP.privateAccess() || window.LK_PREP.functionOnly())) return t[0] === 'recipes'; return t[0] !== 'guides' || featOn('guides'); }); }
  function navActive() {
    var n = parseRoute().name;
    return n === 'landing' ? 'home' : (n === 'home' || n === 'recipe') ? 'recipes' : n === 'prep' ? 'prep' : n === 'orders' ? 'orders' : n === 'waste' ? 'waste' : n === 'transfers' ? 'transfers' : n === 'guides' ? 'guides' : '';
  }
  function pillNav() {
    var a = navActive();
    return '<nav class="pnav" aria-label="Main">' + navList().map(function (t) { return '<a href="' + t[2] + '"' + (a === t[0] ? ' aria-current="page"' : '') + '>' + t[1] + '</a>'; }).join('') + '</nav>';
  }
  function tabBar() {
    var a = navActive();
    return '<nav class="tabbar" aria-label="Main">' + navList().map(function (t) { return '<a href="' + t[2] + '"' + (a === t[0] ? ' aria-current="page"' : '') + '>' + NAV_ICON[t[0]] + '<span>' + t[1] + '</span></a>'; }).join('') + '</nav>';
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
  /* Admin lives in the chef hat's menu (21 Oct 2026, moved from its own key button in the top bar), on every page.
     It only shows on a phone or computer where the head chef is signed in with Google and has passed the owner check
     (lk.admin, set by js/prep.js), or, as "Sign in with Google", while the Head chef is signed in with their PIN on a
     phone that has not signed in with Google yet: a tap opens the admin page, one tap from the Google sign-in. */
  // the head chef's Google sign-in on this device, and the head chef is the one using it (not staff on a shared tablet)
  function isAdminDevice() { try { return !!LS && LS.getItem('lk.admin') === '1' && !(window.LK_PREP && window.LK_PREP.ownerHere && !window.LK_PREP.ownerHere()); } catch (e) { return false; } }
  // the number of open kitchen mail (js/prep.js reads it on the head chef's device and says when it changes: lk-mail)
  function mailOpen() { return isAdminDevice() && window.LK_PREP && window.LK_PREP.mailInfo ? window.LK_PREP.mailInfo().n || 0 : 0; }
  function mailBadge(n) { return n ? '<span class="adm-n" aria-hidden="true">' + (n > 99 ? '99+' : n) + '</span>' : ''; }
  function adminItem() {
    var on = parseRoute().name === 'admin' ? ' aria-current="page"' : '';
    if (!isAdminDevice()) {
      if (!(window.LK_PREP && window.LK_PREP.headPin && window.LK_PREP.headPin())) return '';
      return '<a class="wm-a wm-adm" href="#/admin" data-who="go"' + on + '>' + ICON.key + '<span><b>Admin panel</b><small>Sign in with Google</small></span></a>';
    }
    var n = mailOpen(), P = window.LK_PREP;
    // the open mail shows once in the menu, as the same orange count as on the hat (22 Oct 2026). While some of it is new
    // and the head chef is the one here (their PIN, or nobody signed in), the item opens the Mail tab (23 Oct 2026). A sous
    // chef on that tablet still lands on the last page, so the mail is not marked seen for Chef by someone else.
    var toMail = n && P.mailInfo().fresh && (!P.whoName() || (P.headPin && P.headPin()));
    return '<a class="wm-a wm-adm is-signed" href="#/admin" data-who="' + (toMail ? 'admmail' : 'go') + '"' + on + (n ? ' aria-label="Admin panel, ' + n + ' open kitchen mail"' : '') + '>' + ICON.key + '<span><b>Admin panel</b></span>' + mailBadge(n) + '</a>';
  }
  /* The chalk KB logo (letters drawn as paths, so it needs no font). The same mark is the app icon and the browser tab icon. */
  var LOGO_MARK = '<svg class="rb-mark" viewBox="40 60 432 380" width="56" height="49" aria-hidden="true" focusable="false"><path d="M113.44999999999999 365.98Q109.03 363.26 105.28999999999999 359.35Q101.54999999999998 355.44 103.58999999999999 348.3Q103.25 344.22 104.1 340.48Q104.94999999999999 336.74 105.28999999999999 335.38Q106.99 335.38 107.32999999999998 333.51Q107.66999999999999 331.64 107.66999999999999 330.28Q107.66999999999999 327.56 109.71 321.1Q111.75 314.64 113.78999999999999 307.5Q116.50999999999999 301.72 119.05999999999999 295.26Q121.60999999999999 288.8 121.60999999999999 287.44Q121.60999999999999 284.72 122.96999999999998 281.83000000000004Q124.32999999999998 278.94 126.03 276.22Q127.72999999999999 272.14 128.57999999999998 267.21Q129.43 262.28 129.43 259.56Q131.47 255.14 133.85 250.04Q136.23 244.94 137.59 239.5Q139.63 233.71999999999997 143.70999999999998 222.32999999999998Q147.79 210.94 152.20999999999998 199.38Q155.26999999999998 192.92 158.16 185.95Q161.05 178.98 163.43 174.04999999999998Q165.81 169.11999999999998 166.82999999999998 169.11999999999998Q166.82999999999998 169.11999999999998 166.82999999999998 167.92999999999998Q166.82999999999998 166.73999999999998 166.82999999999998 165.38Q166.82999999999998 163.67999999999998 169.54999999999998 158.75Q172.26999999999998 153.82 174.64999999999998 148.38Q178.05 143.27999999999997 179.41 138.69Q180.76999999999998 134.1 180.76999999999998 134.1Q180.76999999999998 134.1 182.13 131.89Q183.49 129.67999999999998 184.85 128.32Q193.69 123.55999999999997 199.98000000000002 123.55999999999997Q206.27 123.55999999999997 208.65 131.71999999999997Q211.37 139.2 211.03 142.08999999999997Q210.69 144.98 208.65 149.05999999999997Q205.93 155.17999999999998 201.51 164.52999999999997Q197.09 173.88 192.32999999999998 184.42Q187.57 194.95999999999998 183.32 204.64999999999998Q179.07 214.34 176.51999999999998 221.14Q173.97 227.94 173.97 229.64L159.69 264.65999999999997Q158.32999999999998 267.03999999999996 155.26999999999998 276.73Q152.20999999999998 286.42 148.13 299.85Q144.05 313.28 139.8 327.04999999999995Q135.55 340.82 131.47 352.04Q129.43 357.82 127.73 361.73Q126.03 365.64 124.33 367.68Q122.63 369.72 120.25 369.72Q118.88999999999999 369.72 117.19 368.70000000000005Q115.49 367.68 113.44999999999999 365.98ZM233.81 365.3Q230.75 365.64 225.48000000000002 362.40999999999997Q220.21 359.18 214.26 354.42Q208.31 349.66 203.04 344.56Q197.76999999999998 339.46 194.70999999999998 335.72Q189.26999999999998 327.9 180.94 314.64Q172.61 301.38 168.53 286.76Q166.14999999999998 275.88 163.6 269.25Q161.05 262.62 161.05 257.52L161.39 236.44L186.20999999999998 234.74Q187.91 253.1 191.64999999999998 265.17Q195.39 277.24 200.49 286.76Q204.57 295.6 209.5 304.1Q214.43 312.6 220.55 318.38Q228.37 326.88 234.49 330.96000000000004Q240.61 335.04 243.67000000000002 335.04Q250.13 338.1 253.19 340.82000000000005Q256.25 343.54 257.27 345.58000000000004Q258.28999999999996 347.62 257.95 349.32Q258.28999999999996 350.34 257.61 353.90999999999997Q256.93 357.48 255.57 361.05Q254.21 364.62 251.83 365.64Q249.45 368.02 245.70999999999998 368.53Q241.97 369.04 233.81 365.3ZM154.93 235.42 179.75 217.06Q180.76999999999998 216.04 185.7 211.45Q190.63 206.85999999999999 204.91 195.98L249.79 159.6Q258.28999999999996 155.17999999999998 265.42999999999995 149.73999999999998Q272.57 144.29999999999998 277.33000000000004 141.23999999999998Q283.11 137.16 289.23 132.74Q295.35 128.32 296.71000000000004 128.66Q299.43 127.29999999999998 303.16999999999996 131.20999999999998Q306.90999999999997 135.11999999999998 309.46 140.39Q312.01 145.66 311.67 148.38Q312.35 151.77999999999997 310.65000000000003 154.15999999999997Q308.95000000000005 156.54 301.81 160.61999999999998Q293.31 164.35999999999999 288.38 167.76Q283.45000000000005 171.16 282.77 172.85999999999999Q282.77 172.85999999999999 275.63 178.29999999999998Q268.49 183.73999999999998 258.63 190.54Q245.03 199.72 236.36 206.69Q227.69 213.66 224.97 217.73999999999998Q223.61 217.73999999999998 222.42000000000002 218.76Q221.23 219.78 219.87 219.44Q219.87 219.44 217.15 221.31Q214.43 223.18 213.07 225.21999999999997Q212.39 226.92 210.18 229.64Q207.97 232.35999999999999 204.91 232.01999999999998Q202.53 233.38 196.41 237.63Q190.29 241.88 183.66 246.98Q177.03 252.07999999999998 172.26999999999998 256.15999999999997Q167.51 260.24 167.17000000000002 260.91999999999996ZM318.47 374.48Q303.85 364.96 301.3 355.44Q298.75 345.92 307.93 340.14Q309.96999999999997 338.78 315.91999999999996 339.79999999999995Q321.87 340.82 324.93 343.88Q331.73 350.0 340.4 351.53Q349.07 353.06 361.65 349.66Q375.93 345.24 383.58000000000004 338.61Q391.23 331.98 400.75 320.42Q407.89 311.24 410.78 302.4Q413.66999999999996 293.56 413.5 286.25Q413.33000000000004 278.94 409.93 275.2Q401.43 263.3 388.85 258.71000000000004Q376.27 254.12 355.87 259.56Q353.49 259.9 348.73 260.91999999999996Q343.97 261.94 340.23 262.78999999999996Q336.49 263.64 336.15 263.64Q333.77 264.32 332.40999999999997 264.32Q331.05 264.32 329.18 267.54999999999995Q327.31 270.78 323.57 280.80999999999995Q319.83 290.84 312.35 311.58Q305.21 332.32 300.28 340.99Q295.35 349.66 291.61 348.81Q287.87 347.96 283.11 341.5Q280.39 336.74 277.15999999999997 330.96000000000004Q273.93 325.18 277.33 319.06Q279.03 316.0 280.04999999999995 313.45Q281.07 310.9 282.77 304.44Q284.46999999999997 299.34 289.4 286.59Q294.33 273.84 301.13 256.66999999999996Q307.93 239.5 315.40999999999997 221.14Q322.89 202.78 329.86 186.45999999999998Q336.83 170.14 341.59 158.92Q346.35 148.38 347.37 143.62Q348.39 138.85999999999999 346.69 138.51999999999998Q346.69 136.82 345.66999999999996 135.29Q344.65 133.76 344.99 132.39999999999998Q344.99 131.04 350.94 128.65999999999997Q356.89 126.27999999999997 363.69 124.23999999999998Q370.49 122.19999999999999 373.55 122.88Q375.25 122.88 377.63 122.71Q380.01 122.53999999999999 380.01 121.17999999999998Q381.03 121.17999999999998 386.46999999999997 120.49999999999999Q391.90999999999997 119.82 398.37 120.49999999999997Q421.15 122.53999999999999 435.77 133.58999999999997Q450.39 144.64 450.05 168.78Q449.71000000000004 174.55999999999997 445.29 183.73999999999998Q440.87 192.92 434.24 202.1Q427.61 211.28 420.13 218.07999999999998Q415.71000000000004 221.82 410.78000000000003 225.73Q405.85 229.64 402.28000000000003 232.19Q398.71000000000004 234.74 398.71000000000004 234.74Q398.71000000000004 234.74 401.43 235.76Q404.15 236.77999999999997 407.21000000000004 237.8Q422.85 243.57999999999998 431.86 252.42Q440.87 261.26 444.61 276.9Q445.97 282.0 444.78000000000003 289.48Q443.59000000000003 296.96 441.55 304.27Q439.51 311.58 437.13 316.68Q434.75 319.06 433.39 321.61Q432.03 324.15999999999997 432.03 324.15999999999997Q432.03 324.84 429.31 329.42999999999995Q426.59000000000003 334.02 422.85 339.46Q419.11 344.9 415.71000000000004 348.98Q412.31 351.7 406.02 356.63Q399.73 361.56 392.42 366.32Q385.11 371.08 378.65 373.46Q369.13 377.54 357.4 379.07000000000005Q345.67 380.6 335.13 379.41Q324.59 378.22 318.47 374.48ZM342.95 233.38Q342.95 233.38 348.56 232.19Q354.17 231.0 360.97 229.47Q367.77 227.94 371.17 226.57999999999998Q372.87 225.56 376.1 223.86Q379.33 222.16 382.73 218.76Q387.49 214.34 392.93 208.73Q398.37 203.11999999999998 403.64 196.65999999999997Q408.90999999999997 190.2 412.65 182.72Q420.47 170.48 421.15000000000003 165.04Q421.83000000000004 159.6 417.40999999999997 155.17999999999998Q414.35 151.44 408.91 149.57Q403.47 147.7 397.18 147.52999999999997Q390.89 147.35999999999999 385.11 149.05999999999997Q380.69 150.42 378.31 152.29Q375.93 154.16 375.93 157.89999999999998Q375.93 160.95999999999998 374.06 164.19Q372.19 167.42 370.49 169.11999999999998Q370.15 171.5 368.28 173.70999999999998Q366.40999999999997 175.92 366.40999999999997 175.92Q366.40999999999997 177.28 362.15999999999997 184.25Q357.90999999999997 191.22 353.15 204.14Q347.03 218.76 344.99 225.22Q342.95 231.68 342.95 233.38Z" fill="#FBF8F1" transform="rotate(-6 256 256)"/><path d="M90 400 C190 378 300 374 430 388" fill="none" stroke="#E2602A" stroke-width="28" stroke-linecap="round"/></svg>';
  /* The bell opens today's shift pings (written by the head chef or a sous chef). It stays hidden until there is a ping for today, and shows a dot while the pings are unread on this phone. The prep book fills it in once it has read them. */
  var BELL = '<svg width="22" height="22" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M32 8c-9 0-16 7-16 16v10c0 5-3 8-6 12h44c-3-4-6-7-6-12V24c0-9-7-16-16-16z"/><path d="M26 52c1 4 3 6 6 6s5-2 6-6"/></svg>';
  /* A chef hat in a ring at the right of the top bar, on every phone, framed like Admin: it holds Settings for everyone.
     While a person is signed in the ring is solid, their name is in the title everywhere and next to the hat from 1400
     px, where there is room (at 1280 px it pushed "Kitchen Book" onto two lines). On the head chef's device it carries the
     count of open kitchen mail. A tap opens a small menu: Kitchen mail
     (write to the head chef; not for the head chef, who reads it in the admin panel), the drinks run, Meeting minutes
     (chefs open the register from its top bar), Functions in one place for everyone (22 Oct 2026: function managers
     book them, everyone else reads today's and the next days'), My section (staff and leads,
     once the head chef has set up kitchen sections: today's section, a tap changes it), a Chef group (Admin panel where
     adminItem() allows, Manage Recipes & Drawings, then for the head chef and sous chefs Shift pings, Chef to-do and
     Manage staff; not Manage staff on the head chef's own Google device, where it is People in the admin panel), Settings
     and Sign out,
     which hands the phone to the next person. With nobody signed in the ring is dashed and the menu has Sign in ("Who
     are you?", then back to the same page), Admin panel on the head chef's personal device, and Settings. Not with no
     signal before what this phone may open is known (LK_PREP.offline(): the settings not in, or the head chef's owner
     check waiting): then the no-signal sentence in place of Sign in, which would forget the person or the head chef mark.
     Each item is one line (shortened 22 Oct 2026); a second line shows only when it changes: today's section, Sign in
     with Google, and Sign out's "Not saved yet" (or "Not sent yet"). js/prep.js says when the person changes (lk-who). */
  function whoMark(flip) {
    var n = window.LK_PREP && window.LK_PREP.whoName ? window.LK_PREP.whoName() : '';
    var rn = parseRoute().name, here = rn === 'settings' || rn === 'admin' ? ' aria-current="page"' : '';
    // open kitchen mail shows as a count on the hat, as it did on the Admin key
    var ml = mailOpen(), mt = ml ? ', ' + ml + ' open kitchen mail' : '';
    return '<button type="button" class="wtop-btn wtop-who' + (n ? ' on' : '') + (n && flip ? ' flip' : '') + '" data-who="menu" aria-haspopup="true" aria-expanded="' + !!wmenu + '"' + here + (n ? ' title="Signed in as ' + esc(n) + mt + '" aria-label="Signed in as ' + esc(n) + ', menu and Settings' + mt + '"' : ' title="Menu and Settings' + mt + '" aria-label="Menu and Settings' + mt + '"') + '>' + ICON.chef + '<span class="wtop-lbl wtop-who-n">' + esc(n.split(' ')[0]) + '</span>' + mailBadge(ml) + '</button>';
  }
  /* Manage Recipes & Drawings (21 Oct 2026): the head chef only (js/prep.js bookEdit: their PIN as Head chef, or their
     Google device with nobody else signed in). Everyone else reads the recipes as before. */
  function bookEdit() { return !!(window.LK_PREP && window.LK_PREP.bookEdit && window.LK_PREP.bookEdit()); }
  // Functions in the chef hat's menu: only for someone the head chef ticked for Functions (or the head chef's Google device)
  function fnOK() { return !!(window.LK_PREP && window.LK_PREP.fnOK && window.LK_PREP.fnOK()); }
  function fnItem() {
    var on = parseRoute().name === 'functions' ? ' aria-current="page"' : '';
    return '<a class="wm-a wm-fn" href="#/functions" data-who="go"' + on + '>' + ICON.cal + '<span><b>Functions</b></span></a>';
  }
  // Everyone else signed in reads the confirmed functions, today and the next days (#/fn); booking stays with the managers
  function fnViewItem() {
    var on = parseRoute().name === 'fn' ? ' aria-current="page"' : '';
    return '<a class="wm-a wm-fv" href="#/fn" data-who="go"' + on + '>' + ICON.cal + '<span><b>Functions</b></span></a>';
  }
  /* Chef to-do (#/todo, 23 Oct 2026): the head chef and the sous chefs with their PIN, or the head chef's Google device
     with nobody signed in (js/prep.js todoOK). Staff never get the row, and the rules keep the list from them. */
  function todoOK() { return !!(window.LK_PREP && window.LK_PREP.todoOK && window.LK_PREP.todoOK()); }
  function todoItem() {
    var on = parseRoute().name === 'todo' ? ' aria-current="page"' : '';
    return '<a class="wm-a wm-todo" href="#/todo" data-who="go"' + on + '>' + ICON.todo + '<span><b>Chef to-do</b></span></a>';
  }
  function deliveryItem() {
    if (!window.LK_PREP || !window.LK_PREP.privateAccess()) return '';
    return '<a class="wm-a wm-delivery" href="#/deliveries" data-who="go"' + (parseRoute().name === 'deliveries' ? ' aria-current="page"' : '') + '>' + ICON.doc + '<span><b>Delivery received</b></span></a>';
  }
  function supplierOK() { return !!(window.LK_PREP && window.LK_PREP.supplier && window.LK_PREP.supplier().read()); }
  // the no-signal sentence while the kitchen's settings are not loaded and there is no signal (js/prep.js), otherwise ''
  function offline() { return window.LK_PREP && window.LK_PREP.offline ? window.LK_PREP.offline() : ''; }
  function supplierItem() {
    return '<a class="wm-a wm-supplier" href="#/suppliers" data-who="go"' + (parseRoute().name === 'suppliers' ? ' aria-current="page"' : '') + '>' + ICON.todo + '<span><b>Supplier order</b></span></a>';
  }
  function manageItem() {
    var on = parseRoute().name === 'manage' ? ' aria-current="page"' : '';
    return '<a class="wm-a wm-mg" href="#/manage" data-who="go"' + on + '>' + ICON.pen + '<span><b>Recipes &amp; drawings</b></span></a>';
  }
  /* The chef mark's menu, appended to document.body (a top bar redraw does not remove it). Clicks use data-who. */
  var wmenu = null;
  function whoMenuClose(back) {
    if (!wmenu) return;
    wmenu.parentNode.removeChild(wmenu); wmenu = null;
    var b = app.querySelector('.wtop-who');
    if (b) { b.setAttribute('aria-expanded', 'false'); if (back) b.focus({ preventScroll: true }); }
  }
  function whoMenuOpen(btn) {
    var n = window.LK_PREP && window.LK_PREP.whoName ? window.LK_PREP.whoName() : '';
    if (wmenu) return;
    var m = n && window.LK_PREP.chefMenu ? window.LK_PREP.chefMenu() : {}, adm = adminItem(), fnOnly = window.LK_PREP && window.LK_PREP.functionOnly();
    var r = btn.getBoundingClientRect(), el = document.createElement('div');
    el.className = 'wm-wrap';
    var set = '<a class="wm-a wm-set" href="#/settings" data-who="go"' + (parseRoute().name === 'settings' ? ' aria-current="page"' : '') + '>' + ICON.gear + '<span><b>Settings</b></span></a>';
    el.innerHTML = '<div class="wm-bg" data-who="close"></div><nav class="wm" aria-label="' + (n ? esc(n) : 'Menu') + '" style="top:' + Math.round(r.bottom + 8) + 'px;right:' + Math.max(8, Math.round(window.innerWidth - r.right)) + 'px">' +
      (n ? '<p class="wm-h">Signed in as <b>' + esc(n) + '</b></p>' +
        (m.head || fnOnly ? '' : '<a class="wm-a" href="#/mail" data-who="go">' + ICON.mail + '<span><b>Kitchen mail</b></span></a>') +
        (fnOnly ? '' : '<a class="wm-a" href="#/drinks" data-who="go">' + ICON.cup + '<span><b>Drinks run</b></span></a>') +
        // a second line only while minutes wait to be signed (23 Oct 2026)
        (m.minutes ? '<a class="wm-a" href="#/minutes" data-who="go">' + ICON.doc + '<span><b>Meeting minutes</b>' + (m.toSign ? '<small class="wm-due">' + m.toSign + ' to sign</small>' : '') + '</span></a>' : '') +
        (m.fn ? fnItem() : fnViewItem()) + deliveryItem() +
        (m.sec ? '<button type="button" class="wm-a" data-who="sec" data-v="section">' + ICON.chef + '<span><b>My section</b><small>' + esc(m.sec) + '</small></span></button>' : '') +
        (m.chef || adm || m.book ? '<p class="wm-h wm-sh">Chef</p>' + adm : '') + (m.book ? manageItem() : '') +
        (m.chef ? '<button type="button" class="wm-a" data-who="open" data-v="pings">' + ICON.bell + '<span><b>Shift pings</b></span></button>' : '') +
        (m.todo ? todoItem() : '') + (supplierOK() ? supplierItem() : '') +
        (m.chef && !m.tab ? '<button type="button" class="wm-a" data-who="open" data-v="staff">' + ICON.team + '<span><b>Manage staff</b></span></button>' : '') +
        set +
        // the empty line is where the first tap says "Not saved yet", or "Not sent yet" when only a change waits to send
        // (the click handler below)
        '<button type="button" class="wm-a wm-out" data-who="out">' + ICON.exit + '<span><b>Sign out</b><small aria-live="polite"></small></span></button>'
      // with no signal before the kitchen's settings are in, who is on this phone is not known yet, not "nobody": no
      // Sign in, which would forget them (28 Oct 2026)
      : (offline() ? '<p class="wm-h">' + esc(offline()) + '</p>' : '<p class="wm-h">Nobody signed in on this phone</p>' +
        '<a class="wm-a wm-in" href="#/prep" data-who="signin">' + ICON.chef + '<span><b>Sign in</b></span></a>') + adm + deliveryItem() + (bookEdit() ? manageItem() : '') + (todoOK() ? todoItem() : '') + (supplierOK() ? supplierItem() : '') + (fnOK() ? fnItem() : '') + set) + '</nav>';
    document.body.appendChild(el); wmenu = el;
    btn.setAttribute('aria-expanded', 'true');
    var first = el.querySelector('.wm-a'); if (first) first.focus({ preventScroll: true });
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-who]');
    if (!el) return;
    var a = el.getAttribute('data-who');
    if (a === 'menu') { if (wmenu) whoMenuClose(); else whoMenuOpen(el); return; }
    if (a === 'close') { whoMenuClose(true); return; }
    if (a === 'go') { whoMenuClose(); return; }
    if (a === 'admmail') { e.preventDefault(); whoMenuClose(); window.LK_PREP.mailTab(); return; }
    if (a === 'signin') { e.preventDefault(); whoMenuClose(); if (window.LK_PREP && window.LK_PREP.signIn) window.LK_PREP.signIn(location.hash || '#/'); else location.hash = '#/prep'; return; }
    if (a === 'open') { whoMenuClose(); window.LK_PREP.chefOpen(el.getAttribute('data-v')); return; }
    if (a === 'sec') { whoMenuClose(); window.LK_PREP.secOpen(); return; }
    if (a === 'out') {
      // something not saved yet: the first tap says so, the second signs out anyway. "Not sent yet." when the only thing
      // waiting is a change on its way to the server (28 Oct 2026: it said Not saved yet for that too). On the head chef's
      // own Google device that change holds Sign out: "Not sent yet." and no second tap gets past it (29 Oct 2026,
      // sendFirst() in js/prep.js, whose toast says Sign out once it is sent); once it is sent, the line goes (lk-sent
      // below) and the next tap signs out as usual
      var wait = !!(window.LK_PREP.sendFirst && window.LK_PREP.sendFirst());
      if (!window.LK_PREP.signOut(!wait && el.classList.contains('is-armed'))) {
        el.classList.toggle('is-wait', wait); el.classList.toggle('is-armed', !wait);
        el.querySelector('small').textContent = wait ? 'Not sent yet.' : (window.LK_PREP.unsavedHere && !window.LK_PREP.unsavedHere() ? 'Not sent yet.' : 'Not saved yet.') + ' Tap again to sign out'; return;
      }
      // "Signed out" is the prep toast, which shows by itself off the prep pages too (toast() in js/prep.js)
      whoMenuClose();
    }
  });
  // the change Sign out waited for is sent (js/prep.js, 29 Oct 2026): "Not sent yet." goes from an open menu, so it never
  // says so after it is sent. The next tap signs out, or asks "Not saved yet" for something half typed.
  window.addEventListener('lk-sent', function () {
    var o = wmenu && wmenu.querySelector('.wm-out.is-wait');
    if (o) { o.classList.remove('is-wait'); o.querySelector('small').textContent = ''; }
  });
  document.addEventListener('keydown', function (e) {
    if (!wmenu) return;
    if (e.key === 'Escape') { e.preventDefault(); whoMenuClose(true); return; }
    if (e.key === 'Tab') {
      var f = wmenu.querySelectorAll('.wm-a'), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  window.addEventListener('hashchange', function () { whoMenuClose(); });
  /* the Pings bell: there every day while pings or minutes are on for this phone, with a dot for an unread ping or minutes
     to sign (js/prep.js noteBell() keeps it right after the page is drawn) */
  function noteBellHTML() {
    var P = window.LK_PREP, i = P && P.noteInfo ? P.noteInfo() : { on: false, n: 0, unread: false, sign: 0 };
    return '<button type="button" class="wtop-btn nbell' + (i.error || i.unread || i.sign ? ' has-new' : '') + '" data-note="open"' + (i.on ? '' : ' hidden') + ' aria-label="' + esc(P && P.noteBellLabel ? P.noteBellLabel(i) : '') + '">' + BELL + '<span class="wtop-lbl">Pings</span></button>';
  }
  /* The same top bar on every page as on the landing page: brand (goes home), the menu, Pings and the chef hat
     (its menu holds Admin and Settings). */
  function topIcons() {
    return '<span class="wtop-icons">' + noteBellHTML() + whoMark() + '</span>';
  }
  function topBar() {
    var returning = parseRoute().name !== 'landing';
    return '<header class="wtop' + (returning ? ' has-back' : '') + '"><div class="wtop-start">' + (returning ? pageBack() : '') + '<a class="wtop-brand" href="#/" aria-label="Kitchen Book, home">' + (returning ? '' : LOGO_MARK) + '<span class="rb-text"><span class="rb-eb">Leichhardt Hotel Kitchen</span><b>Kitchen Book</b></span></a></div>' + pillNav() + topIcons() + '</header>';
  }
  /* Functions (js/functions.js): the band of today's functions right under the top bar, on every page. This is the empty
     slot; js/functions.js fills it and keeps it right as times pass and bookings change, without redrawing the page. */
  function fnBand() { if (!window.LK_PREP || !window.LK_PREP.privateAccess()) return ''; return (window.LK_FN ? window.LK_FN.bandSlot() : '') + cutBand(); }
  /* Order cut-offs (js/prep.js): a bar for the head chef and sous chefs when a supplier's order closes within 3 hours.
     The empty slot; js/prep.js fills it from the kitchen settings and keeps it right as time passes. */
  function cutBand() { return window.LK_PREP && window.LK_PREP.cutSlot ? window.LK_PREP.cutSlot() : ''; }
  /* Meeting minutes to sign show as a card on the landing page, above the dockets, not in the top bar.
     The prep book fills it in once it has read the minutes, and empties it once the person has signed. */
  function minCard() {
    return '<div class="wall-mn">' + (window.LK_PREP && window.LK_PREP.minNudge ? window.LK_PREP.minNudge() : '') + '</div>';
  }
  /* Under the top bar, the recipe pages get their own tools row: how many recipes, and the Pass / Tiles switch. */
  var DOCKETS = [['01', 'Recipes', '#/recipes', 'recipes'], ['02', 'Prep list', '#/prep', 'prep'], ['03', 'Orders', '#/orders', 'orders'], ['04', 'Wastage', '#/waste', 'waste'], ['05', 'Transfers', '#/transfers', 'transfers', 'What other venues took from us, and what we took from them'], ['06', 'Guides', '#/guides', 'guides', 'How to work the equipment, clean it and find things']];
  function viewLanding() {
    var d = window.LK_TIME.day().split('-'), today = new Date(+d[0], d[1] - 1, +d[2], 12).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
    return '<div class="wall">' + topBar() + fnBand() +
      '<main id="main" class="wall-main"><h2 class="wall-h" id="rtitle" tabindex="-1">Pick a docket</h2><p class="wall-date">' + esc(today) + '</p>' + minCard() + (window.LK_FN && window.LK_FN.checkSlot ? window.LK_FN.checkSlot() : '') + (window.LK_FN ? window.LK_FN.landSlot() : '') + installCard() +
      // with no signal before the kitchen's settings are in: the no-signal sentence, not Kitchen sign in (28 Oct 2026)
      (window.LK_PREP && window.LK_PREP.functionOnly() ? '<p><a class="btn dark" href="#/functions">Manage functions</a></p>' : offline() ? '<p class="hint" role="status">' + esc(offline()) + '</p>' : window.LK_PREP && !window.LK_PREP.privateAccess() ? '<p><a class="btn" href="#/prep">Kitchen sign in</a></p>' : '') + '<div class="dockets">' + DOCKETS.filter(function (d) { if (window.LK_PREP && (!window.LK_PREP.privateAccess() || window.LK_PREP.functionOnly())) return d[3] === 'recipes'; return d[3] !== 'guides' || featOn('guides'); }).map(function (d) {
        // Transfers and Guides are the long ones under the other four (a docket with a line under its name)
        return '<a class="docket' + (d[4] ? ' dk-wide' : '') + '" href="' + d[2] + '"><span class="dk-pin" aria-hidden="true"></span><span class="dk-top"><span class="dk-name">' + d[1] + '</span><span class="dk-no">No. ' + d[0] + '</span></span>' +
          (d[4] ? '<span class="dk-sub">' + esc(d[4]) + '</span>' : '') +
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
      // autocorrect off: iOS would turn "parmy" into "party" before the book's own typo fix sees it
      '<div class="search-row"><span class="find-wrap' + (ui.query ? ' has-q' : '') + '"><input id="find" class="search" type="search" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" data-k="find" placeholder="' + esc(placeholder) + '" value="' + esc(ui.query) + '">' +
      '<button type="button" class="find-x" data-act="clearfind" aria-label="Clear the search">&times;</button></span>' + viewSwitch() + '</div></div>';
  }
  function freeChips(scroll) {
    return '<div class="field"><span class="label" id="free-label">Free from</span><div class="chips' + (scroll ? ' scroll' : '') + '" role="group" aria-labelledby="free-label">' +
      D.allergens.map(function (a) {
        var on = ui.free.indexOf(a) >= 0;
        // round like every filter (22 Oct 2026 look rule) and like the same Free from row on the Pass
        return '<button type="button" class="chip" data-act="free" data-val="' + esc(a) + '" data-k="free:' + esc(a) + '" aria-pressed="' + on + '">' + esc(a) + '</button>';
      }).join('') + '</div></div>';
  }
  /* On a recipe the lens folds into one line (open while a lens is on), so the name and allergens come sooner on a phone */
  function lensFold() {
    return '<details class="lens-fold"' + (ui.lens ? ' open' : '') + '><summary><span class="label">Allergen lens</span>' + (ui.lens ? '<span class="lens-on">' + esc(ui.lens) + '</span>' : '<span class="hint">Show where an allergen is</span>') + '</summary>' + lensChips() + '</details>';
  }
  /* The Pass list: one row of allergen chips with a switch, Show where (the lens, as before) or Free from */
  function allergenRow() {
    var free = ui.amode === 'free' || (!ui.amode && ui.free.length && !ui.lens);
    if (!free) return lensChips(true);
    return '<div class="field"><div class="row-label"><span class="label" id="free-label">Allergens</span>' + amodeSwitch(true) + '</div><div class="chips scroll" role="group" aria-labelledby="free-label">' +
      D.allergens.map(function (a) { var on = ui.free.indexOf(a) >= 0; return '<button type="button" class="chip" data-act="free" data-val="' + esc(a) + '" data-k="free:' + esc(a) + '" aria-pressed="' + on + '">' + esc(a) + '</button>'; }).join('') + '</div></div>';
  }
  function amodeSwitch(free) {
    return '<span class="amode" role="group" aria-label="What the allergen chips do"><button type="button" class="chip sq" data-act="amode" data-val="lens" aria-pressed="' + !free + '">Show where</button><button type="button" class="chip sq" data-act="amode" data-val="free" aria-pressed="' + free + '">Free from</button></span>';
  }
  function lensChips(withSwitch) {
    var hint = ui.lens ? 'Marked = has ' + ui.lens + '. ? = may have it.' : 'Pick one to see where it is, at every level.';
    return '<div class="field"><div class="row-label"><span class="label" id="lens-label">' + (withSwitch ? 'Allergens' : 'Allergen lens') + '</span>' + (withSwitch ? amodeSwitch(false) : '') + '<span class="hint">' + esc(hint) + '</span></div>' +
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
  /* How-to guides that belong on this card: they name it, or it mentions one of their search words ("iCombi").
     The list is the one js/prep.js keeps on this phone, so this needs no reads. The wrapper is always there so it can be refreshed. */
  function guideBox(r) {
    var l = window.LK_PREP && window.LK_PREP.guidesFor ? window.LK_PREP.guidesFor(r.id) : [];
    return '<div id="r-guides" class="r-guides">' + (l.length ? '<div class="box beige"><span class="label">How-to ' + (l.length === 1 ? 'guide' : 'guides') + '</span><div class="used">' + l.map(function (g) {
      return '<a class="ilink" href="#/guides/' + encodeURIComponent(g.id) + '"><span>' + esc(g.title) + '</span><span class="rtag">' + esc(g.cat) + '</span></a>';
    }).join('') + '</div></div>' : '') + '</div>';
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
    var v = ART.sides && (r.side && r.side.charAt(0) === '@' ? ART.sides[r.side] : ART.sides[r.id]);
    if (!v) return '';
    return '<div class="sec"><h3 class="h3">From the side</h3><div class="side-art"><svg viewBox="' + esc(v.viewBox) + '" role="img" aria-label="' + esc(v.label || 'Side view of ' + r.name + ' with each part labelled') + '">' + v.body + '</svg></div></div>';
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
  /* "Change this recipe" for the head chef, in its own slot so a sign-in or sign-out can redraw it (lk-who, lk-admin, lk-cfg) */
  function editSlot(r) {
    return '<div class="mg-slot" id="r-edit">' + (bookEdit() ? '<a class="p-x mg-slot-a" href="#/manage/r/' + encodeURIComponent(r.id) + '">' + ICON.pen + '<span>Change this recipe</span></a>' : '') + '</div>';
  }
  function editSlotRedraw() {
    var el = document.getElementById('r-edit'), route = parseRoute();
    if (el && route.name === 'recipe') el.outerHTML = editSlot(byId[route.stack[route.stack.length - 1]]);
  }
  function recipeCard(r, stack, withHome) {
    return '<article class="card' + (r.done ? ' done' : '') + '">' + crumbs(stack, withHome) + cardHead(r) + editSlot(r) + jumps() + allergenBox(r) +
      '<div class="cols"><div class="col"><h3 class="h3" id="r-ing">Ingredients</h3>' + ingTable(r, stack, false) + tipBox(r) + guideBox(r) + usedBox(r, stack) +
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
    return searchNote() + (any ? '<div class="tile-groups">' + html + '</div>' : '<div class="empty">No recipes match. <button type="button" class="btn" data-act="clearall">Clear search and filters</button></div>');
  }
  // Specials, then Functions, sit first after All so they are always on view; every other chip follows the menu order.
  // The Specials chip shows only the specials (the Specials shelf is already first on the page).
  function kindChips() {
    var first = function (g) { return g.key === 'sp' || g.title === 'Functions'; };
    var all = [{ key: 'all', title: 'All', list: D.recipes }].concat(GROUPS.filter(function (g) { return g.key === 'sp'; }), GROUPS.filter(function (g) { return g.key !== 'sp' && g.title === 'Functions'; }), GROUPS.filter(function (g) { return !first(g); }));
    return '<div class="chips scroll" role="group" aria-label="Recipe type">' + all.map(function (g) {
      return '<button type="button" class="chip' + (g.key === 'sp' ? ' sq sp' : g.title === 'Functions' ? ' sq' : '') + '" data-act="kind" data-val="' + g.key + '" data-k="kind:' + g.key + '" aria-pressed="' + (ui.kind === g.key) + '">' + esc(g.title) + ' (' + g.list.length + ')</button>';
    }).join('') + '</div>';
  }
  function viewTiles(route) {
    if (route.stack.length) {
      var r = byId[route.stack[route.stack.length - 1]];
      return '<div class="page">' + '<main id="main">' + recipeCard(r, route.stack, true) + '</main>' + footer() + '</div>';
    }
    return '<div class="page">' + '<main id="main" style="display: flex; flex-direction: column; gap: 1.1rem">' +
      searchField('Dish, ingredient or allergen', countText()) +
      kindChips() + freeChips(true) +
      '<div id="results">' + tilesHTML() + '</div><div class="hint">Allergen tags with a ? may be in it: check the supplier label.</div></main>' + footer() + '</div>';
  }

  /* ---------- view C: the pass ---------- */
  // Batch recipes and Components share the Bains and prep shelf: either chip shows only its own kind on it
  function passShelves() {
    var prepKind = ui.kind === 'batch' || ui.kind === 'component';
    return SHELVES.filter(function (sh) { return ui.kind === 'all' || sh.key === ui.kind || (sh.key === 'prep' && prepKind); })
      .map(function (sh) { return sh.key === 'prep' && prepKind ? { key: sh.key, title: sh.title, list: sh.list.filter(inKind) } : sh; });
  }
  function passOk(r) { return matches(r.id) && freeOk(r.id); }
  function shelvesHTML() {
    var s = q() || ui.free.length, n = 0;
    var html = passShelves().map(function (sh) {
      var shown = s ? sh.list.filter(passOk) : sh.list;
      if (!shown.length) return '';
      var items = shown.map(function (r) {
        var h = hitId(r.id), m = passOk(r), dish = isDish(r);
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
    return searchNote() + html + (s && !n ? '<div class="empty">Nothing on the pass matches. <button type="button" class="btn" data-act="clearall">Clear search and filters</button></div>' : '');
  }
  function passCount() {
    var all = [], seen = {};
    passShelves().forEach(function (sh) { sh.list.forEach(function (r) { if (!seen[r.id]) { seen[r.id] = 1; all.push(r); } }); });
    if (!q() && !ui.free.length) return plural(all.length, 'recipe', 'recipes') + ' on the pass';
    return all.filter(passOk).length + ' of ' + all.length + ' match';
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
      return '<div class="page">' + '<main id="main" style="display: flex; flex-direction: column; gap: 1.1rem">' +
        searchField('Dish, ingredient or allergen', passCount()) + kindChips() + allergenRow() + '<div id="shelves" class="shelves">' + shelvesHTML() + '</div></main>' + footer() + '</div>';
    }
    var r = byId[stack[stack.length - 1]], dish = isDish(r);
    var trail = '<nav class="trail crumbs" aria-label="Breadcrumb"><a href="#/recipes">The pass</a>' + stack.map(function (id, i) {
      var last = i === stack.length - 1;
      return '<span class="sep" aria-hidden="true">/</span>' + (last ? '<span aria-current="page">' + esc(byId[id].name) + '</span>' : '<a href="' + href(stack.slice(0, i + 1)) + '">' + esc(byId[id].name) + '</a>');
    }).join('') + '</nav>';
    var left;
    if (dish) {
      var pk = ui.pick !== null && r.pins[ui.pick] && !r.pins[ui.pick].link ? r.pins[ui.pick] : null;
      left = '<div class="stage' + (ui.lens ? ' lensed' : '') + (r.done ? ' done' : '') + '" data-rid="' + esc(r.id) + '">' + art(r, 'art') + r.pins.map(function (p, k) { return pinHTML(p, k, stack); }).join('') + '</div>' +
        (pk ? '<div class="box outline" style="background: #fff"><span class="h3">' + esc(pk.label) + '</span>' + (pk.note ? '<div>' + esc(pk.note) + '</div>' : '') + '<div class="chips">' +
          ((pk.tags && pk.tags.length) ? pk.tags.map(function (t) { return '<span class="tag' + (t.slice(-1) === '?' ? ' maybe' : '') + '">' + esc(t) + '</span>'; }).join('') : '<span class="hint">No listed allergens</span>') + '</div></div>'
          : '<div class="hint" style="text-align: center">' + (r.pins.length ? 'Tap anything on the plate. A pin with an arrow opens its own recipe.' : 'No pins on this plate yet.') + '</div>') + sideView(r) +
        // a dish used on another (Side Salad on the Grill Maiden's Board) and a dish's tip box, as on Tiles
        usedBox(r, stack, 'Goes on') + tipBox(r);
    } else {
      left = '<div class="pan-art' + (r.done ? ' done' : '') + '">' + art(r, 'art') + '</div>' + usedBox(r, stack, 'Goes on') + tipBox(r) + guideBox(r);
    }
    // phones: the name, yield and allergens come first, then the drawing, then the rest (order in app.css, .cols under 900px)
    return '<div class="page">' + trail + jumps() + lensFold() +
      '<main id="main" class="cols"><div class="col">' + left + '</div><div class="col wide">' + cardHead(r) + editSlot(r) + allergenBox(r) +
      '<div class="sec"><h3 class="h3" id="r-ing">' + (dish ? 'Everything on it' : 'Into the pan') + '</h3>' + ingTable(r, stack, true) + '</div>' +
      '<div id="r-steps" class="jump-at"></div>' + safetyBox(r) + diagram(r) + (dish ? guideBox(r) : '') + steps(r) +
      '</div></main>' + footer() + '</div>';
  }

  /* ---------- welcome and settings ---------- */
  /* Opens with: each view drawn small on a computer and on a phone, so staff see what they pick (20 Oct 2026).
     Drawn from the real pages: dark top bar, search and the Pass / Tiles switch, then plates or cards, the tab bar on a phone. */
  var MINI_FOOD = ['#7A391D', '#8E3A66', '#C98A45', '#B8742F', '#EFA444', '#6E8B3D', '#B97A36'];
  function miniPlate(cx, cy, r, i) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#fff" stroke="#D3CEC4" stroke-width="1"/><circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.55).toFixed(1) + '" fill="' + MINI_FOOD[i % MINI_FOOD.length] + '"/>' +
      '<rect x="' + (cx - r * 0.75).toFixed(1) + '" y="' + (cy + r + 2.5).toFixed(1) + '" width="' + (r * 1.5).toFixed(1) + '" height="2.4" rx="1" fill="#1C1D1F"/>';
  }
  function miniCard(x, y, w, h, i) {
    var r = Math.min(h * 0.2, w * 0.13);
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="2.5" fill="#fff" stroke="#D9D4C8" stroke-width="0.8"/>' +
      '<rect x="' + (x + 3) + '" y="' + (y + 3.5) + '" width="' + (w * 0.3).toFixed(1) + '" height="1.6" rx="0.8" fill="#E2602A"/><rect x="' + (x + w - 8) + '" y="' + (y + 3) + '" width="5" height="4" rx="1" fill="#E2602A"/>' +
      '<rect x="' + (x + 3) + '" y="' + (y + 9.5) + '" width="' + (w * 0.5).toFixed(1) + '" height="3.2" rx="1" fill="#1C1D1F"/>' +
      [0, 1, 2].map(function (k) { return '<rect x="' + (x + 3) + '" y="' + (y + 15.5 + k * 3.2) + '" width="' + (w * 0.52).toFixed(1) + '" height="1.5" rx="0.7" fill="#B9B4AA"/>'; }).join('') +
      '<rect x="' + (x + 3) + '" y="' + (y + h - 6) + '" width="8" height="3.4" rx="1" fill="none" stroke="#1C1D1F" stroke-width="0.6"/>' +
      miniPlateOnly(x + w - r - 4, y + h * 0.58, r, i);
  }
  function miniPlateOnly(cx, cy, r, i) {
    return '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="#fff" stroke="#D3CEC4" stroke-width="0.8"/><circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + (r * 0.55).toFixed(1) + '" fill="' + MINI_FOOD[i % MINI_FOOD.length] + '"/>';
  }
  function miniShot(view, phone) {
    var W = phone ? 64 : 200, H = 128, id = 'mc-' + view + (phone ? 'p' : 'd'), g = '', i;
    var top = phone ? 15 : 13, pad = phone ? 4 : 8;
    // top bar: the name on the left, the menu pills in the middle on a computer, the round buttons on the right
    g += '<rect width="' + W + '" height="' + top + '" fill="#2b2a27"/><rect x="' + pad + '" y="' + (top / 2 - 2.5) + '" width="' + (phone ? 22 : 34) + '" height="5" rx="1.5" fill="#FBFAF7"/>';
    if (!phone) for (i = 0; i < 5; i++) g += '<rect x="' + (78 + i * 12) + '" y="4.5" width="10" height="4" rx="2" fill="' + (i ? 'none' : '#FBFAF7') + '" stroke="#FBFAF7" stroke-width="0.6"/>';
    for (i = 0; i < 2; i++) g += '<circle cx="' + (W - pad - 2.5 - i * 7) + '" cy="' + (top / 2) + '" r="2.5" fill="none" stroke="#FBFAF7" stroke-width="0.6"/>';
    // search box and the Pass / Tiles switch, with the side that is on filled in
    var sy = top + 5, sw = phone ? 16 : 30;
    g += '<rect x="' + pad + '" y="' + sy + '" width="' + (W - pad * 2 - sw - 2) + '" height="7" rx="2" fill="#fff" stroke="#1C1D1F" stroke-width="0.6"/>' +
      '<rect x="' + (W - pad - sw) + '" y="' + sy + '" width="' + sw + '" height="7" rx="3.5" fill="#fff" stroke="#1C1D1F" stroke-width="0.6"/>' +
      '<rect x="' + (W - pad - sw + (view === 'pass' ? 0 : sw / 2)) + '" y="' + sy + '" width="' + (sw / 2) + '" height="7" rx="3.5" fill="#1C1D1F"/>';
    // filter chips and the orange section heading
    var cy = sy + 11;
    for (i = 0; i < (phone ? 3 : 8); i++) g += '<rect x="' + (pad + i * (phone ? 19 : 23)) + '" y="' + cy + '" width="' + (phone ? 16 : 20) + '" height="5" rx="2.5" fill="' + (i ? 'none' : '#1C1D1F') + '" stroke="#1C1D1F" stroke-width="0.5"/>';
    var hy = cy + 10;
    g += '<rect x="' + pad + '" y="' + hy + '" width="' + (phone ? 20 : 26) + '" height="2.2" rx="1" fill="#E2602A"/>';
    var y0 = hy + 6, n = 0;
    if (view === 'pass') {
      var cols = phone ? 2 : 7, r = phone ? 12 : 10.5, step = (W - pad * 2) / cols;
      for (var row = 0; row < 3; row++) for (i = 0; i < cols; i++) g += miniPlate(+(pad + step * (i + 0.5)).toFixed(1), +(y0 + r + 1 + row * (r * 2 + 10)).toFixed(1), r, n++);
    } else {
      var cc = phone ? 1 : 4, gap = 3, cw = (W - pad * 2 - gap * (cc - 1)) / cc, ch = phone ? 32 : 36;
      for (var rw = 0; rw < 3; rw++) for (i = 0; i < cc; i++) g += miniCard(+(pad + i * (cw + gap)).toFixed(1), y0 + rw * (ch + gap), +cw.toFixed(1), ch, n++);
    }
    // the phone's dark tab bar with Recipes lit in orange
    if (phone) {
      g += '<rect y="' + (H - 11) + '" width="' + W + '" height="11" fill="#2b2a27"/><rect y="' + (H - 11) + '" width="' + W + '" height="0.8" fill="#E2602A"/>';
      for (i = 0; i < 5; i++) g += '<rect x="' + (5 + i * 12) + '" y="' + (H - 7.5) + '" width="6" height="4.5" rx="1" fill="' + (i ? '#8B8780' : '#E2602A') + '"/>';
    }
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true" focusable="false"><defs><clipPath id="' + id + '"><rect width="' + W + '" height="' + H + '" rx="' + (phone ? 7 : 3) + '"/></clipPath></defs>' +
      '<g clip-path="url(#' + id + ')"><rect width="' + W + '" height="' + H + '" fill="#FBFAF7"/>' + g + '</g>' +
      '<rect x="0.5" y="0.5" width="' + (W - 1) + '" height="' + (H - 1) + '" rx="' + (phone ? 7 : 3) + '" fill="none" stroke="#1C1D1F" stroke-width="1"/></svg>';
  }
  function viewOptions(act) {
    return '<div class="views" role="radiogroup" aria-label="How the recipe book opens">' + VIEWS.map(function (v) {
      var on = settings.view === v.id;
      return '<button type="button" class="view-opt" role="radio" data-act="' + act + '" data-val="' + v.id + '" data-k="' + act + ':' + v.id + '" aria-checked="' + on + '">' +
        '<span class="vo-shots"><span class="vo-shot vo-desk">' + miniShot(v.id, false) + '<span class="vo-cap">Computer</span></span>' +
        '<span class="vo-shot vo-phone">' + miniShot(v.id, true) + '<span class="vo-cap">Phone</span></span></span>' +
        '<span class="vo-name">' + esc(v.name) + (on ? '<span class="vo-on">Opens with this</span>' : '') + '</span><span class="vo-desc">' + esc(v.desc) + '</span></button>';
    }).join('') + '</div>';
  }
  /* ---------- Manage Recipes & Drawings (#/manage, the head chef only) ----------
     The page is drawn by js/manage.js, loaded the first time it opens (staff phones never download it): fetched with
     X-LK-Fresh, so the service worker goes to the network first and keeps a copy for no signal under its plain address
     (sw.js, 28 Oct 2026), then run.
     Without the head chef signed in, the page says so and nothing is loaded. The rules are the real lock. */
  /* Functions: #/fn (everyone: today, the next days, a function's sheet) is drawn by js/functions.js; #/functions (the
     function managers' list and form) by js/fnedit.js, loaded only when it opens, like js/manage.js.
     The page versions (FE_API, MG_API, SUP_API here, LK_DRAW.api in js/manage.js, the delivery page's api) go up with
     the file's own API only when an older copy of one side cannot run with the other. A phone keeps each page's file
     for no signal (sw.js, 28 Oct 2026), so a new number shuts that page with no signal until it has opened once with
     signal, and Reload cannot help. A change that only adds keeps the numbers: the file checks for what is new (say
     B.arm in js/draw.js) and the book checks for what the file added (LK_MG.drop in js/prep.js). The ?v= address may go
     up with a change: a browser with no worker in charge then fetches the file fresh instead of running its own copy
     for up to 10 minutes, and it never shuts a page (29 Oct 2026). */
  function viewFn(route) { return '<div class="page fn-pg"><main id="main" class="fn-main">' + (window.LK_FN ? window.LK_FN.page(route.fid) : '') + '</main>' + footer() + '</div>'; }
  function viewFunctions() { return '<div class="page fe-page"><main id="main" class="fe"><div id="fe-root"></div></main></div>'; }
  var FE_API = 8, feLoad = null;
  function mountFunctions(route) {
    var root = document.getElementById('fe-root');
    if (!root) return;
    var st = window.LK_PREP && window.LK_PREP.fnState ? window.LK_PREP.fnState() : 'no';
    function note(t, x, link) { root.innerHTML = mgNote(t, x, link || '<div class="btn-row"><a class="btn" href="#/fn">See the functions</a></div>'); }
    // the kitchen's settings started again with no signal (28 Oct 2026): what a draft holds stays on the device
    if (st === 'offline') { root.innerHTML = mgNote('Manage functions', offline()); return; }
    if (st === 'wait') { note('Functions', 'Checking who is signed in on this device...', ' '); return; }
    if (st === 'nopin') { note('Functions', 'This device has no kitchen PIN yet. Open the Prep list and enter it, then sign in with your own PIN.', '<div class="btn-row"><a class="btn dark" href="#/prep">Open the Prep list</a></div>'); return; }
    if (st !== 'yes') {
      var keep = window.LK_FE && window.LK_FE.hasDraft();
      if (window.LK_FE) window.LK_FE.unmount();
      var signed = window.LK_PREP && window.LK_PREP.whoName && window.LK_PREP.whoName();
      note('Only function managers change functions', 'Everyone can read the confirmed functions under Functions. To book or change one, the head chef ticks you for Functions in the admin panel, then you sign in with your own PIN.' +
        (signed ? ' You are signed in as ' + signed + ', who is not ticked for Functions.' : '') + (keep ? ' Changes not saved yet are kept on this device.' : ''));
      return;
    }
    if (window.LK_FE) { if (window.LK_FE.api === FE_API) window.LK_FE.mount(root, route); else root.innerHTML = mgNote('Reload the book', 'The functions page on this device is a different version from the book. Reload the page to update it.', '<div class="btn-row"><button type="button" class="btn dark" data-act="reload">Reload</button></div>'); return; }
    root.innerHTML = mgNote('Functions', 'Opening functions...', ' ');
    if (!feLoad) feLoad = mgScript('js/fnedit.js?v=4').catch(function (e) { feLoad = null; throw e; });
    feLoad.then(function () { if (parseRoute().name === 'functions') mountFunctions(parseRoute()); }, function () {
      var el = document.getElementById('fe-root');
      if (el) el.innerHTML = mgNote('Could not open functions', 'It needs the signal the first time it opens on a device. Check the signal and try again.', '<div class="btn-row"><button type="button" class="btn dark" data-act="feretry">Try again</button></div>');
    });
  }
  var MG_API = 4, mgLoad = null;
  function viewManage() { return '<div class="page mg-page"><main id="main" class="mg"><div id="mg-root"></div></main>' + footer() + '</div>'; }
  function mgScript(f) {
    return fetch(f, { headers: { 'X-LK-Fresh': '1' } }).catch(function () {}).then(function () {
      return new Promise(function (ok, no) { var el = document.createElement('script'); el.src = f; el.onload = ok; el.onerror = no; document.head.appendChild(el); });
    });
  }
  function loadManage() {
    if (!mgLoad) mgLoad = mgScript('js/manage.js?v=5').catch(function (e) { mgLoad = null; throw e; });
    return mgLoad;
  }
  function mgNote(title, text, link) {
    return '<section class="set-block mg-note"><h2 id="rtitle" tabindex="-1">' + esc(title) + '</h2><p>' + esc(text) + '</p>' + (link || '<div class="btn-row"><a class="btn" href="#/recipes">Back to the recipes</a></div>') + '</section>';
  }
  function mountManage(route) {
    var root = document.getElementById('mg-root');
    if (!root) return;
    var st = window.LK_PREP && window.LK_PREP.bookState ? window.LK_PREP.bookState() : 'no';
    if (st === 'offline') { root.innerHTML = mgNote('Manage Recipes & Drawings', offline()); return; }
    if (st === 'wait') { root.innerHTML = mgNote('Manage Recipes & Drawings', 'Checking who is signed in on this device...', ' '); return; }
    if (st === 'nopin') { root.innerHTML = mgNote('Manage Recipes & Drawings', 'This device has no kitchen PIN yet. Open the Prep list and enter it, then sign in as the head chef.', '<div class="btn-row"><a class="btn dark" href="#/prep">Open the Prep list</a></div>'); return; }
    if (st !== 'yes') {
      if (window.LK_MG) window.LK_MG.unmount();
      root.innerHTML = mgNote('Only the head chef can change recipes', 'Everyone can read the recipes and their drawings on the recipe cards. To change one, the head chef signs in with their own PIN, or uses their own device with the Google sign-in.' +
        (window.LK_MG && window.LK_MG.hasDraft() ? ' Changes not saved yet are kept on this device.' : ''));
      return;
    }
    if (window.LK_MG) { if (window.LK_MG.api === MG_API) window.LK_MG.mount(root, route); else root.innerHTML = mgNote('Reload the book', 'The recipe editor on this device is a different version from the book. Reload the page to update it.', '<div class="btn-row"><button type="button" class="btn dark" data-act="reload">Reload</button></div>'); return; }
    root.innerHTML = mgNote('Manage Recipes & Drawings', 'Opening the recipe editor...', ' ');
    loadManage().then(function () {
      if (parseRoute().name === 'manage') mountManage(parseRoute());
    }, function () {
      var el = document.getElementById('mg-root');
      if (el) el.innerHTML = mgNote('Could not open the recipe editor', 'It needs the signal the first time it opens on a device. Check the signal and try again.', '<div class="btn-row"><button type="button" class="btn dark" data-act="mgretry">Try again</button></div>');
    });
  }
  function redrawManage() { if (parseRoute().name === 'manage') mountManage(parseRoute()); }
  /* Private tools load only on their page. A failed download leaves a Retry action.
     Protected data is fetched only after the current sign-in has been checked. */
  var deliveryLoad = null;
  function viewDeliveries() { return '<div class="page"><main id="main"><div id="delivery-root"></div></main>' + footer() + '</div>'; }
  function mountDeliveries() {
    var root = document.getElementById('delivery-root'); if (!root || !window.LK_PREP.privateAccess()) return;
    if (window.LK_DELIVERY) {
      if (window.LK_DELIVERY.api === 1) window.LK_DELIVERY.mount(root);
      else root.innerHTML = mgNote('Reload the book', 'Delivery records need the current book.', '<button type="button" class="btn dark" data-act="reload">Reload</button>');
      return;
    }
    root.innerHTML = mgNote('Delivery received', 'Opening delivery records...', ' ');
    if (!deliveryLoad) deliveryLoad = mgScript('js/deliveries.js?v=2').catch(function (e) { deliveryLoad = null; throw e; });
    deliveryLoad.then(function () { if (parseRoute().name === 'deliveries') mountDeliveries(); }, function () {
      if (parseRoute().name === 'deliveries' && root.isConnected) root.innerHTML = mgNote('Could not open delivery records', 'Check the connection and try again.', '<button type="button" class="btn dark" data-delivery-retry>Try again</button>');
    });
  }
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-delivery-retry]')) mountDeliveries(); });
  var SUP_API = 8, supLoad = null;
  function viewSuppliers() { return '<div class="page sup-page"><main id="main"><div id="supplier-root"></div></main>' + footer() + '</div>'; }
  function mountSuppliers(route) {
    var root = document.getElementById('supplier-root'), P = window.LK_PREP, B = P && P.supplier ? P.supplier() : null;
    if (!root) return;
    var st = B ? B.state() : 'no';
    // module memory (a draft) is kept; the sheet comes back once the settings are in again
    if (st === 'offline') { root.innerHTML = mgNote('Supplier order', offline()); return; }
    if (st === 'wait') { root.innerHTML = mgNote('Supplier order', 'Checking your kitchen sign-in...', ' '); if (P && P.warm) P.warm(); return; }
    if (st !== 'yes' || (route.mode === 'manage' && !B.edit())) {
      if (window.LK_SUP) window.LK_SUP.reset();
      root.innerHTML = mgNote(st === 'nopin' ? 'Sign in to the kitchen' : 'Chef access needed', st === 'nopin' ? 'Open the Prep list, enter the kitchen PIN and sign in.' : route.mode === 'manage' ? 'Only the head chef or admin can change suppliers and pars.' : 'The head chef and sous chefs can open supplier orders with their own PIN.', '<div class="btn-row"><a class="btn dark" href="#/prep">Open the Prep list</a></div>'); return;
    }
    if (window.LK_SUP) {
      if (window.LK_SUP.api === SUP_API) window.LK_SUP.mount(root, route);
      else root.innerHTML = mgNote('Reload the book', 'The supplier tools on this device need the current book.', '<button type="button" class="btn dark" data-act="reload">Reload</button>');
      return;
    }
    root.innerHTML = mgNote('Supplier order', 'Opening supplier tools...', ' ');
    if (!supLoad) supLoad = mgScript('js/suppliers.js?v=8').catch(function (e) { supLoad = null; throw e; });
    supLoad.then(function () { if (parseRoute().name === 'suppliers') mountSuppliers(parseRoute()); }, function () {
      if (parseRoute().name === 'suppliers') root.innerHTML = mgNote('Could not open supplier tools', 'Check the connection and try again. The other kitchen pages still work.', '<div class="btn-row"><button type="button" class="btn dark" data-sup-retry>Try again</button><a class="btn" href="#/orders">Order list</a></div>');
    });
  }
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-sup-retry]')) { supLoad = null; mountSuppliers(parseRoute()); } });
  function redrawSuppliers() { if (parseRoute().name === 'suppliers') mountSuppliers(parseRoute()); }
  ['lk-who', 'lk-admin', 'lk-cfg'].forEach(function (name) { window.addEventListener(name, redrawSuppliers); });
  /* What js/manage.js reads from the recipe book: the same index and drawings, so its previews match the cards. */
  function rollFor(draft) {
    var r = JSON.parse(JSON.stringify(draft));
    r.ingredients = r.ingredients || [];
    if (!r.contains && !r.check) fromTags(r);
    r.contains = r.contains || []; r.check = r.check || [];
    var keepR = rolled, had = byId[r.id], ro;
    rolled = {}; byId[r.id] = r;
    try { ro = roll(r.id, {}); } finally { if (had) byId[r.id] = had; else delete byId[r.id]; rolled = keepR; }
    return { contains: Object.keys(ro.contains), check: Object.keys(ro.check).filter(function (a) { return !ro.contains[a]; }), missing: ro.missing };
  }
  window.LK_APP = {
    mgApi: MG_API, KIND: KIND, isDish: isDish, esc: esc, art: art, rollFor: rollFor, load: mgScript,
    returnTo: function (hash) { parentReturn(hash); },
    noteRoute: function (replaced) {
      if (replaced && navPages[navHere]) navPages[navHere].hash = location.hash || '#/';
      else navVisit();
    },
    icon: function (k) { return ICON[k] || ''; },   // the book's icons, for the pings sheet's rows and Change this guide
    byId: function (id) { return byId[id] || null; },
    recipes: function () { return D.recipes; },
    tags: function (id) { return tags[id] || []; },
    missing: function (id) { return (missing[id] || []).slice(); },   // allergens incomplete: the ingredients with no allergen info yet
    usedIn: function (id) { return (usedIn[id] || []).slice(); },
    // Specials is always offered first, even before any dish is in it
    menuTitles: function () { return [SPECIALS].concat((D.menuOrder || []).map(function (s) { return s.title; }).filter(function (t) { return t !== SPECIALS; })); },
    specials: SPECIALS,
    sectionOf: function (id) { var s = (D.menuOrder || []).filter(function (x) { return x.ids.indexOf(id) >= 0; })[0]; return s ? s.title : ''; },
    // links to cards not in the book yet: { id, by: [recipe names] }
    toCome: function () {
      var out = {};
      D.recipes.forEach(function (r) { r.ingredients.forEach(function (i) { if (i.link && !byId[i.link]) (out[i.link] = out[i.link] || []).push(r.name); }); });
      return Object.keys(out).sort().map(function (id) { return { id: id, by: out[id] }; });
    },
    artKeys: function () { return { plates: Object.keys(ART.plates).filter(function (k) { return k.charAt(0) !== '@'; }), pans: Object.keys(ART.pans).filter(function (k) { return k.charAt(0) !== '@'; }), diagrams: Object.keys(ART.diagrams).filter(function (k) { return k.charAt(0) !== '@'; }) }; }
  };
  function viewPrep() {
    return '<div class="page">' + '<main id="main" class="prep"><div id="prep-root"></div></main></div>';
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
    return { ios: ios, mac: /Macintosh/.test(ua) && !ios, win: /Windows/.test(ua), firefox: /Firefox|FxiOS/.test(ua), safari: /Safari/.test(ua) && !/Chrome|CriOS|Edg|FxiOS|Firefox/.test(ua), touch: ios || !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches) };
  }
  /* What to do by hand on a Windows or Mac computer when the browser has not offered its own Install button (20 Oct 2026). */
  function computerSteps(k) {
    if (k.mac && k.safari) return 'In Safari, choose <strong>File, Add to Dock</strong>. Kitchen Book then opens in its own window from the Dock.';
    if (k.firefox) return 'Firefox on a computer cannot install apps. Open Kitchen Book in <strong>Edge</strong> or <strong>Chrome</strong> to install it.';
    return 'Click the install icon at the right of the address bar, or open the browser menu (the three dots) and choose <strong>Install</strong>. In Edge it is under <strong>Apps, Install this site as an app</strong>. Kitchen Book then opens in its own window with its own icon.';
  }
  /* A card on the landing page for every phone, tablet and computer that has not installed the book yet. "Not now" is remembered on that device. */
  function installCard() {
    if (isStandalone() || installedNow || settings.installNo) return '';
    var k = deviceKind();
    var msg, btn = '';
    if (installEvt && !installFailed) {
      msg = k.touch ? 'Put Kitchen Book on your home screen. It opens full screen, like any other app.' : 'Install Kitchen Book on this computer. It opens in its own window with an icon on the taskbar or Dock, and it still updates by itself.';
      btn = '<button type="button" class="btn dark" data-act="install">Install the app</button>';
    }
    else if (!k.touch) msg = computerSteps(k);
    else if (k.ios) msg = 'Tap the Share button' + (k.safari ? '' : ' in Safari') + ', then <strong>Add to Home Screen</strong>. Kitchen Book then opens full screen from its own icon.';
    else msg = 'Open the browser menu (the three dots), then choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.';
    return '<section class="wall-install" aria-label="Install the app"><p class="wi-t">Install the app</p><p class="wi-m">' + msg + '</p><div class="btn-row">' + btn + '<button type="button" class="btn" data-act="installno">Not now</button></div></section>';
  }
  function installHTML() {
    var k = deviceKind(), ios = k.ios, mac = k.mac, safari = k.safari;
    var body;
    if (isStandalone() || installedNow) body = '<span class="saved">' + (installedNow ? 'Installed. Open it from your home screen or apps.' : 'You are using the installed app.') + '</span>';
    else if (installEvt && !installFailed) body = '<span class="hint">' + (k.touch ? 'Puts Kitchen Book on the home screen like any other app, full screen, without the browser bar.' : 'Installs Kitchen Book on this computer. It opens in its own window with an icon on the taskbar or Dock, without the browser bar.') + ' It still updates by itself.</span><div class="btn-row"><button type="button" class="btn dark" data-act="install">Install the app</button></div>';
    else if (ios) body = '<span class="hint">On iPhone and iPad: tap the Share button' + (safari ? '' : ' in Safari') + ', then <strong>Add to Home Screen</strong>. Kitchen Book then opens full screen from its own icon.</span>';
    else if (!k.touch) body = '<span class="hint">' + computerSteps(k) + '</span>';
    else body = '<span class="hint">Open the browser menu and choose <strong>Install</strong> or <strong>Add to Home screen</strong>. In Chrome or Edge it is also the install icon at the right of the address bar.</span>';
    return '<section class="set-block" aria-label="Install the app"><span class="label">Install the app</span>' + body + '</section>';
  }
  function viewSettings() {
    var nTicks = Object.keys(ticks).filter(function (k) { return ticks[k]; }).length;
    // Clear all ticks and the device type are for the head chef setting up a device: only on the head chef's signed-in device
    var adm = isAdminDevice();
    return '<div class="page">' + '<main id="main" class="settings"><div class="row-label" style="justify-content: space-between; align-items: center">' +
      '<h2 tabindex="-1" id="rtitle">Settings</h2><a class="btn dark" href="#/" data-act="done">Done</a></div>' +
      '<section class="set-block" aria-label="Text size"><span class="label">Text size</span><div class="chips">' + TEXT.map(function (t) {
        return '<button type="button" class="chip" data-act="settext" data-val="' + t[0] + '" data-k="settext:' + t[0] + '" aria-pressed="' + (settings.text === t[0]) + '">' + esc(t[1]) + '</button>';
      }).join('') + '</div></section>' +
      installHTML() +
      '<section class="set-block" aria-label="Opens with"><span class="label">Opens with</span><span class="hint">Tap one. This is how the recipes look when you arrive, on a computer and on a phone.</span>' + viewOptions('setview') + '</section>' +
      '<section class="set-block set-qr" aria-label="Open on a phone"><span class="label">Open on a phone</span><div class="qr-row"><img class="qr-img" src="qr.svg" width="180" height="180" alt="QR code that opens the Kitchen Book">' +
      '<div><p class="hint">Scan with a phone camera to open the Kitchen Book on that phone, then add it to the home screen so it is one tap away.</p><p class="qr-url">kuschikuschbert.github.io/leichhardt-kitchen</p>' +
      '<div class="btn-row"><a class="btn" href="qr-sign.pdf" target="_blank" rel="noopener">Print the A4 sign</a><a class="btn" href="qr.png" download="Leichhardt Kitchen Book QR.png">Download the QR code</a></div></div></div></section>' +
      (adm ?
        '<section class="set-block" aria-label="Ticked steps"><span class="label">Ticked steps</span><span class="hint">' + esc(plural(nTicks, 'step is', 'steps are')) + ' ticked. Ticks clear when you close the page.</span>' +
        '<div class="btn-row"><button type="button" class="btn" data-act="clearticks" data-k="clearticks">Clear all ticks</button></div></section>' +
        '<section class="set-block" aria-label="Shared kitchen device"><span class="label">Shared kitchen device</span><span class="hint">For a tablet or phone everyone picks up. After 10 minutes with no touch, and each new day, the prep pages ask who you are again, so nobody writes under the last person\'s name. Recipes and guides stay open and the kitchen PIN stays. A personal phone keeps you signed in.</span>' +
        '<div class="chips"><button type="button" class="chip" data-act="setshared" data-val="0" data-k="setshared:0" aria-pressed="' + !settings.shared + '">Personal phone</button><button type="button" class="chip" data-act="setshared" data-val="1" data-k="setshared:1" aria-pressed="' + !!settings.shared + '">Shared device</button></div></section>' +
        '<section class="set-block" aria-label="Practice on this device"><span class="label">Practice on this device</span><span class="hint">For trying the book out or showing someone how it works. Lines written here while it is on are marked as practice: the book does not learn from them and the wastage summary leaves them out. A strip on the prep pages says it is on.</span>' +
        '<div class="chips"><button type="button" class="chip" data-act="setpractice" data-val="0" data-k="setpractice:0" aria-pressed="' + !settings.practice + '">Off</button><button type="button" class="chip" data-act="setpractice" data-val="1" data-k="setpractice:1" aria-pressed="' + !!settings.practice + '">On</button></div></section>' : '') +
      '<section class="set-block" aria-label="About"><span class="label">About</span><span class="saved">' + esc(plural(D.recipes.length, 'recipe', 'recipes')) + ', updated ' + esc(D.updated) +
      '. Settings are saved on this phone or tablet only.</span></section></main>' + footer() + '</div>';
  }

  /* ---------- routing and drawing ---------- */
  function parseRoute(hash) {
    var parts = (hash == null ? location.hash : hash).replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    if (parts[0] === 'suppliers') {
      var valid = function (v) { return /^[a-zA-Z0-9_-]{1,80}$/.test(v || '') ? v : ''; };
      if (parts[1] === 'cutoff') return { name: 'suppliers', stack: [], sid: '', mode: 'order', cutoffId: valid(parts[2]), cutoffDay: /^\d{4}-\d{2}-\d{2}$/.test(parts[3] || '') ? parts[3] : '' };
      return { name: 'suppliers', stack: [], sid: parts[1] === 'manage' ? '' : valid(parts[1]), mode: parts[1] === 'manage' || parts[2] === 'manage' ? 'manage' : 'order', cutoffId: '', cutoffDay: '' };
    }
    if (parts[0] === 'deliveries') return { name: 'deliveries', stack: [] };
    if (parts[0] === 'settings') return { name: 'settings', stack: [] };
    if (parts[0] === 'prep' || parts[0] === 'admin' || parts[0] === 'orders' || parts[0] === 'waste' || parts[0] === 'transfers' || parts[0] === 'minutes' || parts[0] === 'mail' || parts[0] === 'drinks' || parts[0] === 'todo') return { name: parts[0], stack: [] };
    if (parts[0] === 'guides') return { name: 'guides', stack: [], gid: parts[1] || '' };
    if (parts[0] === 'manage') return { name: 'manage', stack: [], sub: parts.slice(1) };
    if (parts[0] === 'fn') return { name: 'fn', stack: [], fid: parts[1] || '' };
    if (parts[0] === 'functions') return { name: 'functions', stack: [], sub: parts.slice(1) };
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
    var v = readJSON(LS, 'lk.views') || {};
    v[id] = (v[id] || 0) + 1;
    writeJSON(LS, 'lk.views', v);
  }
  // the pages drawn by js/prep.js (Firebase): prep book, orders, wastage, minutes, guides, kitchen mail and the admin panel
  var PREP_PAGES = { prep: 1, admin: 1, orders: 1, waste: 1, transfers: 1, minutes: 1, guides: 1, mail: 1, drinks: 1, todo: 1 };
  /* Return only through pages opened in this run of the book. The browser keeps an opaque entry key; destinations
     and scroll positions stay in memory. A direct link or a reload starts a new trail with a fixed local fallback.
     Sheets own their same-address history entries (lkOv), so this never stamps or consumes one of those. */
  var navPages = {}, navHere = '', navSeq = 0, navRun = Math.random().toString(36).slice(2), navBack = '', navBackTimer = null, navBackTarget = '', navBackPath = null;
  function navVisit() {
    var hash = location.hash || '#/', state = history.state || {}, known = navPages[state.lkPage];
    if (known && known.hash === hash) {
      var returning = navHere !== state.lkPage;
      if (returning && navPages[navHere]) navPages[navHere].y = window.scrollY;
      navHere = state.lkPage; return returning ? known : null;
    }
    if (navHere && navPages[navHere].hash === hash) return null;
    if (navHere) navPages[navHere].y = window.scrollY;
    var key = navRun + ':' + (++navSeq), next = {};
    Object.keys(state).forEach(function (k) { next[k] = state[k]; }); next.lkPage = key;
    navPages[key] = { hash: hash, prev: navHere, y: 0 }; navHere = key;
    try { history.replaceState(next, '', location.href); } catch (e) {}
    return null;
  }
  function backFallback(route) {
    if (route.name === 'recipe') return route.stack.length > 1 ? '#/r/' + route.stack.slice(0, -1).map(encodeURIComponent).join('/') : '#/recipes';
    if (route.name === 'manage' && route.sub.length) return '#/manage';
    if (route.name === 'functions' && route.sub.length) return '#/functions';
    if (route.name === 'guides' && route.gid) return '#/guides';
    if (route.name === 'fn' && route.fid) return '#/fn';
    if (route.name === 'suppliers') {
      if (route.cutoffId) return '#/orders';
      if (route.mode === 'manage') return '#/suppliers' + (route.sid ? '/' + encodeURIComponent(route.sid) : '');
      if (route.sid) return '#/suppliers';
    }
    return '#/';
  }
  function backTitle(hash) {
    var r = parseRoute(hash), names = { landing: 'Kitchen Book', home: 'recipes', prep: 'prep list', orders: 'order list', waste: 'wastage', transfers: 'transfers', minutes: 'meeting minutes', mail: 'kitchen mail', drinks: 'drinks run', todo: 'Chef to-do', admin: 'admin panel', settings: 'Settings', guides: 'guides', fn: 'functions', functions: 'Manage functions', manage: 'Manage recipes', suppliers: 'Supplier order', deliveries: 'Delivery received' };
    if (r.name === 'recipe') return 'recipe';
    return names[r.name] || 'Kitchen Book';
  }
  function localBack() {
    var r = parseRoute();
    return r.name === 'suppliers' ? window.LK_SUP : r.name === 'manage' ? window.LK_MG : r.name === 'functions' ? window.LK_FE : PREP_PAGES[r.name] ? window.LK_PREP : null;
  }
  function backInfo() {
    var local = localBack(), label = local && local.backLabel && local.backLabel(), here = navPages[navHere], prev = here && navPages[here.prev], to = prev ? prev.hash : backFallback(parseRoute());
    return { label: label || 'Back to ' + backTitle(to), disabled: !!navBack || !!(local && local.backDisabled && local.backDisabled()), to: to, prev: !!prev };
  }
  function pageBack() {
    var info = backInfo();
    return '<button type="button" class="wtop-back" data-act="back" aria-label="' + esc(info.label) + '" title="' + esc(info.label) + '"' + (info.disabled ? ' disabled' : '') + '>' + ICON.left + '</button>';
  }
  function backSync() {
    var el = app.querySelector('.wtop-back'); if (!el) return;
    var info = backInfo(), local = localBack(), desc = local && local.backDescription && local.backDescription();
    el.setAttribute('aria-label', info.label); el.title = info.label;
    el.disabled = info.disabled;
    if (desc && document.getElementById(desc)) el.setAttribute('aria-describedby', desc); else el.removeAttribute('aria-describedby');
  }
  function goBack() {
    if (navBack) return;
    var local = localBack();
    if (local && local.back && local.back()) { backSync(); return; }
    var info = backInfo();
    if (info.disabled) return;
    if (info.prev) historyReturn(); else replaceReturn(info.to);
  }
  function historyReturn(target, path) {
    navBackTarget = target || ''; navBackPath = path || null;
    navBack = navHere; backSync(); history.back();
    clearTimeout(navBackTimer); navBackTimer = setTimeout(function () { navBack = ''; navBackTarget = ''; navBackPath = null; render(); }, 1200);
  }
  // Reuse the nearest parent entry, including before a duplicated editor. Only known keys on that path may be
  // skipped. A parent not yet visited replaces the child entry, so the next Back cannot reopen that child.
  function parentReturn(hash) {
    if (navBack || typeof hash !== 'string' || hash.indexOf('#/') !== 0) return;
    var key = navHere, path = {};
    while (key && navPages[key] && !path[key]) {
      path[key] = true;
      var prev = navPages[key].prev;
      if (prev && navPages[prev] && navPages[prev].hash === hash) { path[prev] = true; historyReturn(prev, path); return; }
      key = prev;
    }
    replaceReturn(hash);
  }
  function replaceReturn(hash) {
    var here = navPages[navHere];
    if (here) { here.hash = hash; here.y = 0; }
    try { history.replaceState(history.state || {}, '', hash); }
    catch (e) { location.replace(hash); return; }
    render();
  }
  window.addEventListener('popstate', function () {
    if (!navBack) return;
    if (navBackTarget) {
      var entry = history.state && history.state.lkPage, target = navBackTarget;
      if (entry !== target && navBackPath && navBackPath[entry] && navPages[entry] && navPages[entry].hash === location.hash) {
        setTimeout(function () { if (navBackTarget === target && history.state && history.state.lkPage === entry) history.back(); }, 0);
      } else { navBack = ''; navBackTarget = ''; navBackPath = null; clearTimeout(navBackTimer); backSync(); }
      return;
    }
    // A link from a sheet can leave its duplicate same-address entry behind. It is the same page, so keep going
    // to the named destination. Only this explicit page Back does that; the phone's Back still closes one sheet.
    var key = navBack;
    if (history.state && history.state.lkPage === key && navPages[key] && location.hash === navPages[key].hash) {
      setTimeout(function () { if (navBack === key && history.state && history.state.lkPage === key) history.back(); }, 0);
    } else { navBack = ''; clearTimeout(navBackTimer); backSync(); }
  });
  window.addEventListener('lk-nav', backSync);
  window.addEventListener('lk-back', backSync);
  var warmed = false;
  var lastHash = null, lastRoute = '', homeY = 0;
  window.addEventListener('scroll', function () { if (lastRoute === 'home') homeY = window.scrollY; }, { passive: true });
  // The shelves and tile groups off screen are not drawn until they scroll near (content-visibility in app.css), so
  // their height is a guess and an old scroll position can land on the wrong shelf. Coming back, the recipe that was
  // opened is put back at the same height on the screen instead (homeAt), and homeY is only the fallback.
  var homeAt = null;
  document.addEventListener('click', function (e) {
    var a = lastRoute === 'home' && e.target.closest && e.target.closest('a[href^="#/r/"]');
    // a recipe can sit on more than one shelf: keep which one was tapped
    if (a) homeAt = { href: a.getAttribute('href'), n: Array.prototype.indexOf.call(app.querySelectorAll('a[href="' + a.getAttribute('href') + '"]'), a), top: a.getBoundingClientRect().top };
  }, true);
  function backHome() {
    var a = homeAt && app.querySelectorAll('a[href="' + homeAt.href + '"]')[homeAt.n];
    if (!a) { window.scrollTo(0, homeY); return; }
    // a plate in a group not drawn yet has no true position: draw every group once (as before this change), place the
    // plate, then go back to drawing only what is near; each group keeps the height it was drawn at, so nothing jumps
    app.classList.add('cv-all');
    window.scrollTo(0, a.getBoundingClientRect().top + window.scrollY - homeAt.top);
    requestAnimationFrame(function () { requestAnimationFrame(function () { app.classList.remove('cv-all'); }); });
  }
  window.addEventListener('lk-access', function () { whoMenuClose(); render(); });
  function render() {
    if (navBackTarget && (!history.state || history.state.lkPage !== navBackTarget)) return;
    var returning = navVisit();
    var route = parseRoute();
    var changed = location.hash !== lastHash;
    if (changed) { ui.pick = null; }
    var keepHeading = document.activeElement && document.activeElement.id === 'rtitle';
    var keep = document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-k');
    var view = settings.view || 'pass';
    var locked = route.name !== 'landing' && route.name !== 'home' && route.name !== 'recipe' && route.name !== 'settings' && route.name !== 'admin' && window.LK_PREP && !window.LK_PREP.routeAccess(route.name);
    var html;
    if (locked) html = viewPrep();
    else if (route.name === 'landing') html = viewLanding();
    else if (route.name === 'settings') html = viewSettings();
    else if (PREP_PAGES[route.name]) html = viewPrep();
    else if (route.name === 'manage') html = viewManage();
    else if (route.name === 'suppliers') html = viewSuppliers();
    else if (route.name === 'deliveries') html = viewDeliveries();
    else if (route.name === 'fn') html = viewFn(route);
    else if (route.name === 'functions') html = viewFunctions();
    else if (view === 'pass') html = viewPass(route);
    else html = viewTiles(route);
    // Swipeable chip rows keep their place when the page redraws (for example after tapping a chip at the far end).
    var rowsAt = Array.prototype.map.call(app.querySelectorAll('.chips.scroll'), function (el) { return el.scrollLeft; });
    if (route.name !== 'landing') {
      html = topBar() + fnBand() + html + tabBar();
    }
    app.innerHTML = html;
    if (!changed) Array.prototype.forEach.call(app.querySelectorAll('.chips.scroll'), function (el, i) { if (rowsAt[i]) el.scrollLeft = rowsAt[i]; });
    fitPins();
    if (!locked && route.name === 'manage') mountManage(route); else if (window.LK_MG) window.LK_MG.unmount();
    if (!locked && route.name === 'deliveries') mountDeliveries(); else if (window.LK_DELIVERY) window.LK_DELIVERY.unmount();
    if (!locked && route.name === 'suppliers') mountSuppliers(route); else if (window.LK_SUP) window.LK_SUP.unmount();
    if (!locked && route.name === 'functions') mountFunctions(route); else if (window.LK_FE) window.LK_FE.unmount();
    if ((locked || PREP_PAGES[route.name]) && window.LK_PREP) window.LK_PREP.mount(route.name, document.getElementById('prep-root'), route.gid);
    // On any other page, connect to the prep book in the background so Prep, Orders and Wastage open straight away.
    else if (window.LK_PREP && window.LK_PREP.warm && !warmed) { warmed = true; setTimeout(function () { window.LK_PREP.warm(); }, 900); }
    backSync();
    var r = route.stack.length ? byId[route.stack[route.stack.length - 1]] : null;
    document.title = (r ? r.name + ' · ' : (route.name === 'settings' ? 'Settings · ' : route.name === 'prep' ? 'Prep list · ' : route.name === 'orders' ? 'Order list · ' : route.name === 'waste' ? 'Wastage · ' : route.name === 'transfers' ? 'Transfers · ' : route.name === 'minutes' ? 'Meeting minutes · ' : route.name === 'mail' ? 'Kitchen mail · ' : route.name === 'drinks' ? 'Drinks run · ' : route.name === 'todo' ? 'Chef to-do · ' : route.name === 'suppliers' ? 'Supplier order · ' : route.name === 'manage' ? 'Manage Recipes & Drawings · ' : route.name === 'fn' ? 'Functions · ' : route.name === 'functions' ? 'Manage functions · ' : route.name === 'guides' ? 'Guides · ' : route.name === 'landing' ? '' : route.name === 'home' ? 'Recipes · ' : route.name === 'admin' ? 'Admin panel · ' : '')) + 'Leichhardt Kitchen Book';
    var prevRoute = lastRoute; lastRoute = route.name;
    if (changed && route.name === 'recipe') noteView(route.stack[route.stack.length - 1]);
    // opening the recipes checks for the head chef's recipe changes when the last check is 30 minutes old (one read)
    if (changed && (route.name === 'home' || route.name === 'recipe') && window.LK_PREP && window.LK_PREP.rxCheck) window.LK_PREP.rxCheck();
    if (changed) {
      lastHash = location.hash;
      // Coming back to the recipe list from a recipe puts you where you were.
      if (route.name === 'home' && prevRoute === 'recipe') backHome(); else { if (route.name !== 'recipe') homeAt = null; window.scrollTo(0, 0); }
      // the heading takes focus on a new page, unless a PIN box took it (the PIN screens open the keyboard by themselves)
      var title = document.getElementById('rtitle'), ae = document.activeElement;
      if (title && route.name !== 'home' && !(ae && ae.classList && ae.classList.contains('pin-auto'))) title.focus({ preventScroll: true });
      if (returning && route.name !== 'home') window.scrollTo(0, returning.y);
    } else if (keep) {
      var el = app.querySelector('[data-k="' + keep + '"]');
      if (el) {
        el.focus({ preventScroll: true });
        if (keep === 'find') { var v = el.value; el.setSelectionRange(v.length, v.length); }
      }
    } else if (keepHeading) { var nextTitle = document.getElementById('rtitle'); if (nextTitle) nextTitle.focus({ preventScroll: true }); }
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
      // a drawing made in the book marks its servingware (data-surf): that part is left out and every drawn pixel left is food
      var surf = c.querySelector('[data-surf]'), any = !!surf;
      if (surf) surf.parentNode.removeChild(surf);
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
                f = any || sat >= 0.14 || lum < 0.7 ? 1 : 0;   // plate, rim and shadow are pale greys; food is not
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
  // once per frame at most: a tablet turned on a recipe fires many resizes, and each fit redraws the food masks (22 Oct 2026)
  var pinFrame = 0;
  window.addEventListener('resize', function () { if (pinFrame) return; pinFrame = requestAnimationFrame(function () { pinFrame = 0; fitPins(); }); });

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
    if (s.length < 3 || D.recipes.some(function (r) { return matches(r.id); }) || guideHits().length) return;
    var l = readJSON(LS, 'lk.miss') || [];
    var t = window.LK_TIME.now();
    l = l.filter(function (m) { return !(t - m.at < 120000 && (s.indexOf(m.q) === 0 || m.q.indexOf(s) === 0)); });
    l.push({ q: s.slice(0, 60), at: t });
    writeJSON(LS, 'lk.miss', l.slice(-40));
  }
  // Enter (the Search key) drops the phone keyboard so the results can be seen
  app.addEventListener('keydown', function (e) { if (e.target.id === 'find' && e.key === 'Enter') { e.preventDefault(); e.target.blur(); } });
  app.addEventListener('input', function (e) {
    if (e.target.id !== 'find') return;
    ui.query = e.target.value;
    var fw = e.target.closest('.find-wrap'); if (fw && fw.classList) fw.classList.toggle('has-q', !!ui.query);
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
    // Settings and the visible Back use the same bounded trail, including safe direct-link fallbacks.
    if (act === 'done' || act === 'back') { e.preventDefault(); goBack(); return; }
    if (act === 'amode') { ui.amode = val; if (val === 'free') ui.lens = null; else ui.free = []; render(); return; }
    if (act === 'clearfind' || act === 'clearall') {
      ui.query = ''; if (act === 'clearall') { ui.free = []; ui.kind = 'all'; ui.lens = null; }
      render(); var fi = document.getElementById('find'); if (fi) fi.focus(); return;
    }
    if (act === 'jump') { var jt = document.getElementById(val); if (jt) jt.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    // a page loaded on its own that is a different version from the book (Reload the book): Update now's own path in
    // js/upkeep.js, so it waits for a change to send, asks before half a line goes and never reloads with no signal
    if (act === 'reload') { if (window.LK_UPDATE) window.LK_UPDATE.now(); else location.reload(); return; }
    if (act === 'mgretry') { redrawManage(); return; }
    if (act === 'feretry') { feRedraw(); return; }
    if (act === 'kind') { ui.kind = val; }
    else if (act === 'free') { ui.free = ui.free.indexOf(val) >= 0 ? ui.free.filter(function (x) { return x !== val; }) : ui.free.concat([val]); }
    else if (act === 'lens') { ui.lens = ui.lens === val ? null : val; }
    else if (act === 'pick') { var k = Number(val); ui.pick = ui.pick === k ? null : k; }
    else if (act === 'setview' || act === 'topview') { var was = settings.view; settings.view = val; saveSettings(); if (act === 'topview' && was !== val) { render(); window.scrollTo(0, 0); return; } }
    else if (act === 'settext') { settings.text = val; saveSettings(); document.documentElement.setAttribute('data-text', val); }
    else if (act === 'clearticks') { ticks = {}; saveTicks(); }
    else if (act === 'setshared') { settings.shared = val === '1'; saveSettings(); }
    else if (act === 'setpractice') { settings.practice = val === '1'; saveSettings(); }
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

  // js/prep.js read a changed guides list: refresh the guides box on a recipe card and any search
  window.addEventListener('lk-guides', function () {
    var route = parseRoute(), box = document.getElementById('r-guides');
    if (route.name === 'recipe' && box) box.outerHTML = guideBox(byId[route.stack[route.stack.length - 1]]);
    else if (route.name === 'home' && q()) updateResults();
  });
  // js/prep.js worked out that a page was switched on or off for this phone: redraw the menus, the dockets and the guides box
  window.addEventListener('lk-feat', function () {
    if (parseRoute().name === 'landing') { render(); return; }
    var pn = app.querySelector('.pnav'), tb = app.querySelector('.tabbar');
    if (pn) pn.outerHTML = pillNav();
    if (tb) tb.outerHTML = tabBar();
    try { window.dispatchEvent(new Event('lk-guides')); } catch (e) {}
  });
  // js/prep.js signed the head chef in or out on this phone (lk.admin changed): show or drop Admin in the chef hat's menu, and the head chef's Settings blocks
  window.addEventListener('lk-admin', function () {
    whoMenuClose(); editSlotRedraw(); redrawManage();
    if (parseRoute().name === 'settings') { render(); return; }
    var ic = app.querySelector('.wtop-icons');
    if (ic) ic.outerHTML = topIcons();
  });
  // js/prep.js signed a person in or out: redraw the chef mark in the top bar. On a sign-in just made (not a phone that
  // was already signed in) the mark flips in like a coin and settles, so the person sees it is now them.
  // js/prep.js read the head chef's open kitchen mail: redraw the count on the chef hat
  window.addEventListener('lk-mail', function () { var ic = app.querySelector('.wtop-icons'); if (ic) ic.outerHTML = topIcons(); });
  // The Head chef's PIN also shows or drops Admin in the menu, so the whole icon group is redrawn.
  window.addEventListener('lk-who', function (e) {
    whoMenuClose(); editSlotRedraw(); redrawManage();
    var ic = app.querySelector('.wtop-icons'); if (ic) ic.outerHTML = topIcons();
    var el = app.querySelector('.wtop-who'); if (el) el.outerHTML = whoMark(!!(e.detail && e.detail.signedIn));
  });
  // "Skip to content" must not change the address: #main is not a page, so the router would open the landing page
  document.addEventListener('click', function (e) {
    var sk = e.target.closest && e.target.closest('a.skip');
    if (!sk) return;
    e.preventDefault();
    var m = document.getElementById('main');
    if (m) { if (!m.hasAttribute('tabindex')) m.setAttribute('tabindex', '-1'); m.focus(); }
  });
  // the kitchen settings were read (who is Head chef): the head chef's link on a card and the manage page follow
  window.addEventListener('lk-cfg', function () { editSlotRedraw(); if (parseRoute().name === 'manage' && !(window.LK_MG && window.LK_MG.open())) redrawManage(); feRedraw(); });
  /* Functions: who may change them follows the kitchen settings and who is signed in, straight away (a tick taken away
     closes the form on an open page; what was typed stays on the device). #/fn redraws when the functions change. */
  function feRedraw() { if (parseRoute().name === 'functions') mountFunctions(parseRoute()); }
  window.addEventListener('lk-who', feRedraw);
  window.addEventListener('lk-admin', feRedraw);
  window.addEventListener('lk-fn', function () {
    var r = parseRoute();
    if (r.name === 'fn' && window.LK_PREP && window.LK_PREP.privateAccess()) {
      // drawn again only when something shows differently, and the button in use keeps the focus
      var m = document.getElementById('main'), y = window.scrollY, h = window.LK_FN.page(r.fid), a = document.activeElement, k = a && a.getAttribute && a.getAttribute('data-fn');
      if (!m || m.lkFn === h) return;
      k = k ? '[data-fn="' + k + '"][data-id="' + a.getAttribute('data-id') + '"]' + (a.hasAttribute('data-r') ? '[data-r="' + a.getAttribute('data-r') + '"]' : '') : '';
      var had = k && m.contains(a);
      m.innerHTML = h; m.lkFn = h; window.scrollTo(0, y);
      var b = had && m.querySelector(k); if (b) b.focus({ preventScroll: true });
    }
    else if (r.name === 'functions' && window.LK_FE) window.LK_FE.changed();
  });
  /* The head chef's recipe changes came in (js/prep.js read them, lk-rx): work the index out again and redraw.
     On the recipe list only the results are redrawn, so the page does not jump while someone is scrolling. */
  window.addEventListener('lk-rx', function () {
    reindex();
    var n = parseRoute().name;
    if (n === 'home' && document.getElementById(settings.view === 'tiles' ? 'results' : 'shelves')) updateResults();
    else if (n === 'manage') { if (window.LK_MG) window.LK_MG.changed(); }
    else if (!PREP_PAGES[n]) render();
  });
  /* The head chef's drawings came in or were saved (js/overlay.js, lk-art): the pages that show them draw again. */
  window.addEventListener('lk-art', function () {
    maskCache = {};
    var n = parseRoute().name;
    if (n === 'home' && document.getElementById(settings.view === 'tiles' ? 'results' : 'shelves')) updateResults();
    else if (n === 'manage') { if (window.LK_MG) window.LK_MG.changed(); }
    else if (!PREP_PAGES[n]) render();
  });
  // Open native calendars and clocks from the whole field. Older browsers keep their normal input behaviour.
  document.addEventListener('click', function (ev) {
    var el = ev.target;
    if (!el.matches || !el.matches('input[type="date"], input[type="time"]') || el.disabled || el.readOnly || !el.showPicker) return;
    try { el.showPicker(); } catch (e) { /* The browser's own input remains usable if a picker is unavailable. */ }
  });
  // These pages use buttons rather than form submission. Check native date/time validity before their save handlers.
  function checkPickers(ev) {
    var action = ev.target.closest && ev.target.closest('[data-p], [data-fe], [data-su]');
    var key = action && (action.getAttribute('data-p') || action.getAttribute('data-fe') || action.getAttribute('data-su'));
    if (ev.type !== 'submit' && !/^(n-save|mn-pub|mn-draft|todo-save|cut-save|wh-apply|save|review|confirm|record)$/.test(key || '')) return;
    var root = ev.type === 'submit' ? ev.target : action.closest('main') || action.closest('section');
    if (!root) return;
    var fields = root.querySelectorAll('input[type="date"], input[type="time"]');
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      if (!field.willValidate || field.validity.valid) continue;
      ev.preventDefault(); ev.stopImmediatePropagation();
      var details = field.closest('details'); if (details) details.open = true;
      field.reportValidity(); field.focus(); return;
    }
  }
  document.addEventListener('click', checkPickers, true);
  document.addEventListener('submit', checkPickers, true);
  window.addEventListener('hashchange', render);
  render();
  // the book drew with the recipe changes laid over it, so they are safe to use at the next start too
  if (window.LK_RX) window.LK_RX.drawn();
})();
