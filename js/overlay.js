/*
  Leichhardt Kitchen Book: the head chef's recipe changes, laid over js/data.js (21 Oct 2026)
  ==========================================================================================
  The head chef can change and add recipes in the book itself (#/manage). Those changes live in Firestore:
    book/index        { r: { recipeId: version }, menu: [...] }  one small record that says what changed
    recipes/<id>      { r: the recipe, shaped like js/data.js, v, upd, by, src, base, removed, off }
  js/prep.js reads them (rxSync, one read of book/index, then only the recipes that changed) and hands them to
  LK_RX.take, which keeps a copy on this phone (localStorage lk.rx, tied to the kitchen PIN).

  This file runs after js/data.js and before js/prep.js and js/app.js (index.html), so the book's first draw already
  shows the changed recipes. It keeps a clean copy of js/data.js first, because js/app.js adds worked-out fields to
  the recipe objects (contains, check, sec). Every apply() builds fresh recipe objects from that clean copy, so a
  changed recipe never carries a field js/app.js worked out from the old one.

  Safety: a changed recipe that does not look like a recipe is left out (the book's own copy stays). If the book
  fails to draw after the changes were laid over it, the next start shows js/data.js alone (lk.rx.bad) until the
  next set of changes comes in.
  Phones without the kitchen PIN never read the changes: they show js/data.js, as before.
*/
(function () {
  'use strict';

  var D = window.LK_DATA;
  if (!D || !D.recipes) return;
  var LS = (function () { try { localStorage.getItem('x'); return localStorage; } catch (e) { return null; } })();
  function lsGet(k) { try { return LS ? LS.getItem(k) : null; } catch (e) { return null; } }
  function lsSet(k, v) { try { if (LS) { if (v == null || v === '') LS.removeItem(k); else LS.setItem(k, v); } } catch (e) {} }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  // the clean copy of js/data.js, taken before js/app.js adds anything; parsed only when it is needed
  var BASE_JSON = JSON.stringify({ recipes: D.recipes, menu: D.menuOrder || [] });
  var base = null;
  function baseData() {
    if (!base) {
      base = JSON.parse(BASE_JSON);
      base.byId = {};
      base.recipes.forEach(function (r) { base.byId[r.id] = r; });
    }
    return base;
  }
  // a short fingerprint of a recipe as js/data.js has it, so the manage page can tell when the file changed later
  function fingerprint(x) {
    var s = JSON.stringify(x), h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }

  /* ---------- the shape of a recipe (the field guide at the top of js/data.js) ---------- */
  var KINDS = ['main', 'snack', 'side', 'dessert', 'batch', 'component'];
  var TEXT = { no: 8, forLine: 80, name: 80, short: 40, avc: 120, menu: 400, yield: 300, art: 60, side: 60, diagram: 60, labelNote: 300, aka: 200 };
  function s(v, max) { return typeof v === 'string' ? v.slice(0, max) : ''; }
  function tagList(v) { return Array.isArray(v) ? v.filter(function (t) { return typeof t === 'string' && t.length <= 20; }).slice(0, 12) : []; }
  function box(v) { return v && typeof v === 'object' && typeof v.text === 'string' ? { title: s(v.title, 80), text: s(v.text, 1000) } : null; }
  function allergenList(v) {
    return v.filter(function (a) { return a && typeof a.allergen === 'string'; }).slice(0, 20).map(function (a) { return { allergen: s(a.allergen, 20), from: s(a.from, 200) }; });
  }
  function num(v) { var n = Number(v); return isFinite(n) ? Math.max(0, Math.min(100, n)) : 50; }
  /* A recipe from Firestore, tidied to the shape the book draws. Anything that is not a recipe comes back as null. */
  function tidy(r, id) {
    if (!r || typeof r !== 'object' || r.id !== id || typeof r.name !== 'string' || !r.name.trim() || KINDS.indexOf(r.kind) < 0) return null;
    var out = { id: id, kind: r.kind };
    Object.keys(TEXT).forEach(function (k) { if (typeof r[k] === 'string' && r[k] !== '') out[k] = s(r[k], TEXT[k]); });
    out.no = out.no || '';
    out.forLine = out.forLine || '';
    out.yield = out.yield || '';
    out.ingredients = (Array.isArray(r.ingredients) ? r.ingredients : []).filter(function (i) { return i && typeof i.name === 'string' && i.name.trim(); }).slice(0, 100).map(function (i) {
      var o = { q: s(i.q, 40), name: s(i.name, 120) };
      if (i.link) o.link = s(i.link, 48);
      if (i.note) o.note = s(i.note, 200);
      var t = tagList(i.tags); if (t.length) o.tags = t;
      return o;
    });
    out.pins = (Array.isArray(r.pins) ? r.pins : []).filter(function (p) { return p && typeof p.label === 'string'; }).slice(0, 60).map(function (p) {
      var o = { label: s(p.label, 60), x: num(p.x), y: num(p.y) };
      if (p.side === 'left' || p.side === 'right') o.side = p.side;
      if (p.link) o.link = s(p.link, 48);
      var t = tagList(p.tags); if (t.length || Array.isArray(p.tags)) o.tags = t;
      if (p.note) o.note = s(p.note, 400);
      return o;
    });
    var secs = (Array.isArray(r.sections) ? r.sections : []).filter(function (x) { return x && typeof x.title === 'string' && Array.isArray(x.steps); }).slice(0, 30).map(function (x) {
      return { title: s(x.title, 80), steps: x.steps.filter(function (t) { return typeof t === 'string'; }).slice(0, 60).map(function (t) { return t.slice(0, 600); }) };
    });
    if (secs.length) out.sections = secs;
    // contains and check stay out unless the recipe sets them by hand: then the book works them out from the tags
    if (Array.isArray(r.contains)) out.contains = allergenList(r.contains);
    if (Array.isArray(r.check)) out.check = allergenList(r.check);
    var tip = box(r.tip), safety = box(r.safety);
    if (tip) out.tip = tip;
    if (safety) out.safety = safety;
    if (r.done === true) out.done = true;
    return out;
  }
  // the guest menu order the head chef set in the book; none (or an empty list) means the order in js/data.js
  function tidyMenu(m) {
    if (!Array.isArray(m)) return null;
    var out = m.filter(function (sec) { return sec && typeof sec.title === 'string' && Array.isArray(sec.ids); }).slice(0, 40).map(function (sec) {
      return { title: s(sec.title, 60), ids: sec.ids.filter(function (id) { return typeof id === 'string'; }).slice(0, 200) };
    });
    return out.length ? out : null;
  }

  /* ---------- the copy kept on this phone ---------- */
  var KEY = 'lk.rx', BAD = 'lk.rx.bad';
  function emptyCache(pin) { return { pin: pin || '', at: 0, idx: { r: {}, menu: null }, recipes: {} }; }
  function readCache() {
    var pin = lsGet('lk.prep.pin') || '';
    try {
      var c = JSON.parse(lsGet(KEY) || 'null');
      if (c && c.pin === pin && c.idx && c.recipes) return c;
    } catch (e) {}
    return emptyCache(pin);
  }
  var cache = readCache();
  function keep() {
    var t = JSON.stringify(cache);
    lsSet(KEY, t);
  }

  /* ---------- laying the changes over js/data.js ---------- */
  var skipped = false;
  // Builds LK_DATA.recipes and menuOrder again from the clean copy and the changes kept on this phone.
  // Both lists are changed in place: js/prep.js and js/app.js hold on to them.
  function apply(plain) {
    var b = baseData(), over = plain ? {} : cache.recipes, list = [], dropped = [];
    var fresh = JSON.parse(BASE_JSON).recipes;
    fresh.forEach(function (r) {
      var o = over[r.id];
      // off: the head chef went back to the js/data.js copy of this recipe
      if (!o || o.off) { list.push(r); return; }
      if (o.removed) return;
      var t = tidy(o.r, r.id);
      if (t) list.push(t); else { list.push(r); dropped.push(r.id); }
    });
    Object.keys(over).sort().forEach(function (id) {
      if (b.byId[id]) return;
      var o = over[id];
      if (o.removed) return;
      var t = tidy(o.r, id);
      if (t) list.push(t); else dropped.push(id);
    });
    if (dropped.length && window.console) console.warn('Kitchen Book: left out recipe changes that do not look like a recipe: ' + dropped.join(', '));
    D.recipes.length = 0;
    Array.prototype.push.apply(D.recipes, list);
    var menu = (!plain && tidyMenu(cache.idx.menu)) || clone(b.menu);
    // a dish js/data.js puts on the menu that the changed menu does not have yet still shows, in its own section
    if (!plain && cache.idx.menu) {
      var placed = {};
      menu.forEach(function (sec) { sec.ids.forEach(function (id) { placed[id] = 1; }); });
      b.menu.forEach(function (bs) {
        bs.ids.forEach(function (id) {
          if (placed[id]) return;
          var to = menu.filter(function (sec) { return sec.title === bs.title; })[0];
          if (!to) { to = { title: bs.title, ids: [] }; menu.push(to); }
          to.ids.push(id); placed[id] = 1;
        });
      });
    }
    if (!D.menuOrder) D.menuOrder = [];
    D.menuOrder.length = 0;
    Array.prototype.push.apply(D.menuOrder, menu);
    return dropped;
  }
  function hasChanges() { return Object.keys(cache.recipes).length > 0 || !!cache.idx.menu; }

  // At start: lay the changes over, unless the last start with them failed to draw.
  if (hasChanges()) {
    if (lsGet(BAD) === String(cache.at)) { skipped = true; if (window.console) console.warn('Kitchen Book: showing js/data.js only; the recipe changes on this phone failed to draw last time.'); }
    else { lsSet(BAD, String(cache.at)); apply(false); }
  }

  /* ---------- the changes js/prep.js read from Firestore ---------- */
  function keepRec(d) { return { r: d.r, v: d.v, removed: !!d.removed, off: !!d.off, src: d.src || '', base: d.base || '', upd: d.upd || 0, by: d.by || '' }; }
  // idx: book/index; got: [[id, record or null], ...] for the recipes whose version changed. Returns true when the book changed.
  function take(pin, idx, got) {
    if (cache.pin !== pin) cache = emptyCache(pin);
    var before = JSON.stringify({ r: cache.recipes, m: cache.idx.menu });
    var ir = idx && idx.r && typeof idx.r === 'object' ? idx.r : {};
    (got || []).forEach(function (g) {
      var id = g[0], d = g[1];
      if (d && d.r) cache.recipes[id] = keepRec(d);
    });
    // a recipe the index no longer lists is not a change any more
    Object.keys(cache.recipes).forEach(function (id) { if (!(id in ir)) delete cache.recipes[id]; });
    cache.idx = { r: ir, menu: tidyMenu(idx && idx.menu) };
    cache.at = Date.now();
    var changed = JSON.stringify({ r: cache.recipes, m: cache.idx.menu }) !== before;
    keep();
    if (changed) { skipped = false; lsSet(BAD, ''); }
    return changed;
  }
  // the versions this phone has, so js/prep.js reads only what changed
  function versions() {
    var v = {};
    Object.keys(cache.recipes).forEach(function (id) { v[id] = cache.recipes[id].v; });
    return v;
  }
  // a save on the head chef's own phone: the change shows at once, without waiting for the next read
  function put(pin, id, rec, idx) {
    if (cache.pin !== pin) cache = emptyCache(pin);
    cache.recipes[id] = keepRec(rec);
    if (idx) cache.idx = { r: Object.assign({}, cache.idx.r, idx.r || {}), menu: idx.menu !== undefined ? tidyMenu(idx.menu) : cache.idx.menu };
    else cache.idx.r[id] = rec.v;
    keep();
    skipped = false; lsSet(BAD, '');
  }
  function forget() { cache = emptyCache(lsGet('lk.prep.pin') || ''); lsSet(KEY, ''); lsSet(BAD, ''); }

  window.LK_RX = {
    // lays the changes over js/data.js again (after take or put); plain: js/data.js alone
    apply: function (plain) { return apply(!!plain || skipped); },
    // js/app.js drew the book with the changes: they are safe to use at the next start too
    drawn: function () { if (lsGet(BAD) === String(cache.at)) lsSet(BAD, ''); },
    take: take,
    put: put,
    forget: forget,
    versions: versions,
    syncedAt: function () { return cache.at || 0; },
    pin: function () { return cache.pin; },
    // the recipe as js/data.js has it (a copy), or null for a recipe made in the book
    pristine: function (id) { var r = baseData().byId[id]; return r ? clone(r) : null; },
    baseMenu: function () { return clone(baseData().menu); },
    // the change kept on this phone for a recipe ({ r, v, removed, off, src, base, upd, by }), or null
    change: function (id) { var o = cache.recipes[id]; return o ? clone(o) : null; },
    changes: function () { return clone(cache.recipes); },
    menu: function () { return cache.idx.menu ? clone(cache.idx.menu) : null; },
    fingerprint: function (id) { var r = baseData().byId[id]; return r ? fingerprint(r) : ''; },
    tidy: tidy,
    skipped: function () { return skipped; }
  };
})();
