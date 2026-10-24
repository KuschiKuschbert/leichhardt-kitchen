/*
  Leichhardt Kitchen Book: Manage Recipes & Drawings (#/manage), for the head chef only (21 Oct 2026)
  ===================================================================================================
  Loaded by js/app.js the first time the page opens on the head chef's device (staff phones never download it).
  The head chef changes any recipe in the book or adds a new one; the change is saved to Firestore (recipes/<id>,
  book/index) through the prep book's own write path (W in js/prep.js: the writer's id and PIN proof), and every
  phone lays it over js/data.js (js/overlay.js). The rules let only the head chef write (bookBy() in firestore.rules).

  Pages: #/manage (the recipe list), #/manage/r/<id> (change a recipe), #/manage/new and #/manage/new/<id> (a new
  recipe; with an id, a card still to come). Clicks use data-mg, typing data-f (the field it changes), classes mg-.

  Nothing is lost by accident: every change is kept on this device as it is typed (lk.mg.draft.<id>) until it is
  saved, and is offered back when the recipe is opened again. A save checks the version on the server first, so two
  devices never overwrite each other without the head chef saying so. Every earlier version is kept (hist).
*/
(function () {
  'use strict';

  var API = 2;
  var D = window.LK_DATA, X = window.LK_RX, A = window.LK_APP, P = window.LK_PREP;
  var esc = A.esc, KIND = A.KIND, ALLERGENS = D.allergens;
  var LS = (function () { try { localStorage.getItem('x'); return localStorage; } catch (e) { return null; } })();
  function lsGet(k) { try { return LS ? LS.getItem(k) : null; } catch (e) { return null; } }
  function lsSet(k, v) { try { if (LS) { if (v == null || v === '') LS.removeItem(k); else LS.setItem(k, v); } } catch (e) {} }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function B() { return P.book(); }

  var M = { root: null, sub: [], q: '', chip: 'all', more: false, ed: null, armed: '', armTimer: null };

  /* ---------- small helpers ---------- */
  var DISH = { main: 1, snack: 1, side: 1, dessert: 1 };
  var FOR_LINE = { main: 'Plate', snack: 'Snack', side: 'Side', dessert: 'Dessert', batch: 'Batch', component: 'Component' };
  function slug(t) { return String(t || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48); }
  function idOk(id) { return /^[a-z0-9][a-z0-9-]{0,47}$/.test(id); }
  function arm(k) {
    if (M.armed === k) { M.armed = ''; clearTimeout(M.armTimer); return true; }
    M.armed = k; clearTimeout(M.armTimer); M.armTimer = setTimeout(function () { M.armed = ''; draw(); }, 4000);
    draw(); return false;
  }
  function armed(k) { return M.armed === k; }
  var toastEl = null, toastTimer = null;
  function toast(msg) {
    B().say(msg);
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'p-toasts mg-toasts'; document.body.appendChild(toastEl); }
    toastEl.innerHTML = '<div class="p-toast p-toast-plain" role="presentation">' + esc(msg) + '</div>';
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { if (toastEl) toastEl.innerHTML = ''; }, 4000);
  }
  // every recipe the book knows: those on the cards now, the hidden ones and the ones js/data.js has
  function allIds() {
    var ids = {};
    D.recipes.forEach(function (r) { ids[r.id] = 1; });
    Object.keys(X.changes()).forEach(function (id) { ids[id] = 1; });
    return ids;
  }
  function nameOf(id) {
    var r = A.byId(id); if (r) return r.name;
    var c = X.change(id); if (c && c.r) return c.r.name;
    var p = X.pristine(id); return p ? p.name : id;
  }
  function draftKey(id) { return 'lk.mg.draft.' + (id || 'new'); }
  function hasDraft(id) { return !!lsGet(draftKey(id)); }

  /* ---------- the recipe list (#/manage) ---------- */
  var CHIPS = [['all', 'All'], ['dish', 'Dishes'], ['prep', 'Batch and components'], ['changed', 'Changed here'], ['new', 'New'], ['hidden', 'Hidden'], ['tocome', 'Cards to come'], ['filechanged', 'Book file changed'], ['drafts', 'Not saved yet'], ['drawings', 'Drawings'], ['templates', 'Templates'], ['mylib', 'Made in the book']];
  // what the book says about a recipe: from js/data.js, changed here, new, hidden, and whether the file changed since
  function status(id) {
    var c = X.change(id), base = X.pristine(id);
    return {
      changed: !!(c && base && !c.off), isNew: !!(c && !base), hidden: !!(c && c.removed), off: !!(c && c.off),
      fileChanged: !!(c && base && !c.off && c.base && c.base !== X.fingerprint(id)), draft: hasDraft(id), v: c ? c.v : 0
    };
  }
  function listRows() {
    var rows = D.recipes.map(function (r) { return { id: r.id, r: r }; });
    Object.keys(X.changes()).forEach(function (id) {
      var c = X.change(id);
      if (c.removed) rows.push({ id: id, r: c.r, hidden: true });
    });
    return rows;
  }
  function chipOk(row, st) {
    var c = M.chip, k = row.r.kind;
    if (c === 'all') return true;
    if (c === 'dish') return !!DISH[k];
    if (c === 'prep') return !DISH[k];
    if (c === 'changed') return st.changed;
    if (c === 'new') return st.isNew;
    if (c === 'hidden') return st.hidden;
    if (c === 'filechanged') return st.fileChanged;
    if (c === 'drafts') return st.draft;
    return false;
  }
  /* The head chef's templates (drawtpl) and own pieces and servingware (drawlib): one query each, the first time their
     list opens. Hide takes one out of the editor (a new version with removed); drawings made from it keep their copy. */
  var MINE = { tpl: null, lib: null, busy: false };
  function loadMine(force) {
    if (MINE.busy || (!force && MINE.tpl && MINE.lib)) return;
    MINE.busy = true;
    var api = B(), grab = function (sn) { return sn.docs.map(function (x) { var o = x.data(); o.id = x.id; return o; }); };
    api.ready().then(function () { var fs = api.fs(); return Promise.all([fs.getDocs(api.colRef('drawtpl')), fs.getDocs(api.colRef('drawlib'))]); }).then(function (r) {
      MINE.tpl = grab(r[0]); MINE.lib = grab(r[1]); MINE.busy = false; draw();
    }, function () { MINE.busy = false; MINE.tpl = MINE.tpl || []; MINE.lib = MINE.lib || []; draw(); });
  }
  function mineHTML(kind, words) {
    loadMine();
    var list = kind === 'templates' ? MINE.tpl : MINE.lib;
    if (!list) return '<p class="hint">Reading them from the book...</p>';
    list = list.filter(function (x) { return !words.length || words.every(function (w) { return (x.name + ' ' + (x.kw || '') + ' ' + (x.slot || '') + ' ' + (x.cat || '')).toLowerCase().indexOf(w) >= 0; }); });
    var pic = function (x) {
      if (kind === 'templates') return '<svg class="mg-thumb" viewBox="' + esc(/^-?[\d.]+ -?[\d.]+ [\d.]+ [\d.]+$/.test(x.vb || '') ? x.vb : '-110 -110 220 220') + '" aria-hidden="true" focusable="false"><g data-surf="1">' + X.clean(x.svgS) + '</g>' + X.clean(x.svgF) + '</svg>';
      if (x.type !== 'item' || !(x.w > 0 && x.h > 0)) return '';
      var top = x.cat === 'build' ? -x.h : -x.h / 2;
      return '<svg class="mg-thumb" viewBox="' + (-x.w / 2 - 4) + ' ' + (top - 4) + ' ' + (x.w + 8) + ' ' + (x.h + 8) + '" aria-hidden="true" focusable="false">' + X.clean(x.body) + '</svg>';
    };
    var what = function (x) { return kind === 'templates' ? { plate: 'Plate', pan: 'Pan', side: 'From the side', build: 'Build' }[x.slot] || x.slot : x.type === 'surf' ? 'Servingware' : 'Library piece'; };
    var none = kind === 'templates' ? 'No templates yet. In the drawing editor, Save as a template keeps a plating for any recipe to start from.' : 'Nothing made in the book yet. In the drawing editor, Save as a library piece, Import a drawing (SVG) and Save this servingware add to the library.';
    return list.length ? '<p class="hint" role="status">' + list.length + (kind === 'templates' ? (list.length === 1 ? ' template' : ' templates') : (list.length === 1 ? ' piece or servingware' : ' pieces and servingware')) + '. Drawings made from them keep their own copy.</p><ul class="mg-list">' + list.map(function (x) {
      var k = (kind === 'templates' ? 'tpl:' : 'lib:') + x.id;
      return '<li class="mg-row">' + pic(x) + '<span class="mg-rt"><b>' + esc(x.name || x.id) + '</b><span class="hint">' + esc(what(x)) + ' · version ' + esc(x.v || 1) + (x.removed ? ' · hidden' : '') + '</span></span>' +
        '<button type="button" class="p-x" data-mg="mine-hide" data-v="' + esc(k) + '">' + (armed('mine-hide:' + k) ? 'Tap again to ' + (x.removed ? 'show it' : 'hide it') : x.removed ? 'Show it again' : 'Hide') + '</button></li>';
    }).join('') + '</ul>' : '<p class="hint">' + none + '</p>';
  }
  function mineHide(k) {
    var api = B(), m = /^(tpl|lib):(.+)$/.exec(k || ''); if (!m) return;
    var list = m[1] === 'tpl' ? MINE.tpl : MINE.lib, x = (list || []).filter(function (o) { return o.id === m[2]; })[0];
    if (!x || !arm('mine-hide:' + k)) return;
    var out = {}; Object.keys(x).forEach(function (f) { if (f !== 'id' && f !== 'by') out[f] = x[f]; });
    out.removed = !x.removed; out.v = (x.v || 1) + 1; out.upd = api.now();
    api.ready().then(function () { return api.W([['set', api.docRef(m[1] === 'tpl' ? 'drawtpl' : 'drawlib', x.id), out]]); }).then(function () {
      x.removed = out.removed; x.v = out.v; toast(out.removed ? 'Hidden: the drawing editor no longer offers it.' : 'Shown again in the drawing editor.'); draw();
    }, function (e) { toast(e && e.code === 'permission-denied' ? 'Not changed: only the head chef can change these.' : 'Not changed. Check the signal and try again.'); });
  }
  function listHTML() {
    var q = M.q.trim().toLowerCase(), words = q ? q.split(/\s+/) : [];
    var toCome = A.toCome();
    var head = '<div class="mg-head"><h2 id="rtitle" tabindex="-1">Manage Recipes &amp; Drawings</h2>' +
      '<p class="hint">Change any recipe in the book or add a new one. Staff see the change on their phones within half an hour, or straight away when they open the book. Write anything not confirmed yet in [square brackets].</p>' +
      '<div class="btn-row"><a class="btn dark" href="#/manage/new">New recipe</a></div></div>';
    var chips = '<div class="chips scroll" role="group" aria-label="Show">' + CHIPS.map(function (c) {
      return '<button type="button" class="chip" data-mg="chip" data-v="' + c[0] + '" aria-pressed="' + (M.chip === c[0]) + '">' + esc(c[1]) + '</button>';
    }).join('') + '</div>';
    var find = '<div class="field"><label class="label" for="mg-q">Find a recipe</label><input id="mg-q" class="search" type="search" data-f="q" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Name, card number or ingredient" value="' + esc(M.q) + '"></div>';
    var body;
    if (M.chip === 'templates' || M.chip === 'mylib') body = mineHTML(M.chip, words);
    else if (M.chip === 'drawings') {
      var ART = window.LK_ART || {}, dl = X.arts().filter(function (x) { return !words.length || words.every(function (w) { return (x.name + ' ' + x.id + ' ' + nameOf(x.rid)).toLowerCase().indexOf(w) >= 0; }); });
      var thumbOf = function (x) {
        var k = '@' + x.id, v = x.slot === 'side' ? ART.sides[k] : x.slot === 'build' ? ART.diagrams[k] : null;
        if (v) return '<svg class="mg-thumb" viewBox="' + esc(v.viewBox) + '" aria-hidden="true" focusable="false">' + v.body + '</svg>';
        return A.art({ art: k, kind: x.slot === 'pan' ? 'batch' : 'main' }, 'mg-thumb');
      };
      body = dl.length ? '<p class="hint" role="status">' + dl.length + (dl.length === 1 ? ' drawing' : ' drawings') + ' drawn in the book</p><ul class="mg-list">' + dl.map(function (x) {
        return '<li class="mg-row"><a class="mg-rlink" href="#/manage/draw/' + encodeURIComponent(x.id) + '">' + thumbOf(x) + '<span class="mg-rt"><b>' + esc(x.name || x.id) + '</b><span class="hint">' + esc(nameOf(x.rid)) + ' · version ' + esc(x.v) + (x.removed ? ' · hidden' : '') + '</span></span></a></li>';
      }).join('') + '</ul>' : '<p class="hint">No drawings made in the book yet. Open a recipe and use Draw the plate in the book.</p>';
    } else if (M.chip === 'tocome') {
      var tc = toCome.filter(function (t) { return !words.length || words.every(function (w) { return (t.id + ' ' + t.by.join(' ')).toLowerCase().indexOf(w) >= 0; }); });
      body = tc.length ? '<ul class="mg-list">' + tc.map(function (t) {
        return '<li class="mg-row"><div class="mg-rt"><b>' + esc(t.id) + '</b><span class="hint">Linked from ' + esc(t.by.join(', ')) + '</span></div>' +
          '<a class="p-x" href="#/manage/new/' + encodeURIComponent(t.id) + '">Make this card</a></li>';
      }).join('') + '</ul>' : '<p class="hint">No cards to come. Every linked recipe has a card.</p>';
    } else {
      var rows = listRows().filter(function (row) {
        var st = status(row.id); row.st = st;
        if (!chipOk(row, st)) return false;
        if (!words.length) return true;
        var hay = [row.r.name, row.r.no, row.id, row.r.forLine].concat((row.r.ingredients || []).map(function (i) { return i.name; })).join(' ').toLowerCase();
        return words.every(function (w) { return hay.indexOf(w) >= 0; });
      });
      var shown = M.more ? rows : rows.slice(0, 40);
      body = rows.length ? '<p class="hint" role="status">' + rows.length + (rows.length === 1 ? ' recipe' : ' recipes') + '</p><ul class="mg-list">' + shown.map(function (row) {
        var r = row.r, st = row.st, tags = [];
        if (st.isNew) tags.push('New');
        else if (st.changed) tags.push('Changed here' + (st.v ? ', version ' + st.v : ''));
        if (st.hidden) tags.push('Hidden');
        if (st.fileChanged) tags.push('Book file changed');
        if (st.draft) tags.push('Not saved yet');
        return '<li class="mg-row"><a class="mg-rlink" href="#/manage/r/' + encodeURIComponent(row.id) + '">' + A.art(r, 'mg-thumb') +
          '<span class="mg-rt"><b>' + esc(r.name) + '</b><span class="hint">Card ' + esc(r.no || '-') + ' · ' + esc(KIND[r.kind] || '') + '</span>' +
          (tags.length ? '<span class="chips">' + tags.map(function (t) { return '<span class="tag' + (/Hidden|changed/.test(t) ? ' maybe' : '') + '">' + esc(t) + '</span>'; }).join('') + '</span>' : '') +
          '</span></a></li>';
      }).join('') + '</ul>' + (rows.length > shown.length ? '<div class="btn-row"><button type="button" class="btn" data-mg="more">Show all ' + rows.length + '</button></div>' : '') : '<p class="hint">No recipe matches.</p>';
    }
    return '<div class="mg-wrap">' + head + find + chips + '<div id="mg-results">' + body + '</div></div>';
  }

  /* ---------- the editor: a draft of one recipe ---------- */
  // the recipe as it is now (the change saved in the book, or js/data.js), never the object js/app.js worked on
  function startFor(id) {
    var c = X.change(id), base = X.pristine(id);
    if (c && c.r && !c.off) return { id: id, isNew: false, d: clone(c.r), meta: { v: c.v, src: c.src || (base ? 'book' : 'new'), base: c.base || '', removed: !!c.removed, off: false, by: c.by || '', upd: c.upd || 0 } };
    if (base) return { id: id, isNew: false, d: base, meta: { v: c ? c.v : 0, src: 'book', base: X.fingerprint(id), removed: false, off: !!(c && c.off), by: c ? c.by : '', upd: c ? c.upd : 0 } };
    return null;
  }
  function nextNo() {
    var max = 0;
    Object.keys(allIds()).forEach(function (id) { var n = parseInt((A.byId(id) || X.pristine(id) || (X.change(id) || {}).r || {}).no, 10); if (n > max) max = n; });
    return String(max + 1);
  }
  function startNew(id) {
    return { id: id || '', isNew: true, idTyped: !!id, d: { id: id || '', no: nextNo(), kind: id ? 'batch' : 'main', forLine: id ? 'Batch' : 'Plate', name: '', yield: '', ingredients: [], sections: [{ title: 'Method', steps: [] }], pins: [] }, meta: { v: 0, src: 'new', base: '', removed: false, off: false } };
  }
  function menuOf(id) { return { sec: A.sectionOf(id), after: afterOf(id) }; }
  function afterOf(id) {
    var s = (D.menuOrder || []).filter(function (x) { return x.ids.indexOf(id) >= 0; })[0];
    if (!s) return '';
    var i = s.ids.indexOf(id);
    return i > 0 ? s.ids[i - 1] : '^';
  }
  // what the save compares with: the recipe, the menu place, hidden and the go-back flag
  function snapOf(e) { return JSON.stringify([e.d, e.menu, e.meta.removed, e.meta.off]); }
  // which saved copy of a recipe the form was opened from (none yet when the book was still on its way)
  function stampOf(id) { var c = id && X.change(id); return c ? c.v + ':' + (c.upd || 0) + ':' + !!c.off + ':' + !!c.removed : ''; }
  function openEditor(sub) {
    var e;
    if (sub[0] === 'new') e = startNew(sub[1] ? slug(sub[1]) : '');
    else e = startFor(sub[1]);
    if (!e) { M.ed = { missing: sub[1] || '' }; return; }
    e.menu = e.isNew ? { sec: '', after: '' } : menuOf(e.id);
    e.handTags = !!(e.d.contains || e.d.check);
    e.key = e.isNew ? (sub[1] ? 'new-' + e.id : 'new') : e.id;
    e.snap = snapOf(e);
    e.open = -1; e.pinOpen = -1; e.errs = []; e.warns = []; e.msg = ''; e.hist = null; e.ing0 = ingMap(e.d); e.stamp = stampOf(e.id);
    // a draft kept on this device from before: offered back
    try {
      var kept = JSON.parse(lsGet(draftKey(e.key)) || 'null');
      if (kept && kept.e && JSON.stringify([kept.e.d, kept.e.menu, kept.e.meta.removed, kept.e.meta.off]) !== e.snap) e.kept = kept;
    } catch (x) {}
    M.ed = e;
  }
  var keepTimer = null;
  function keepNow() {
    clearTimeout(keepTimer);
    var e = M.ed; if (!e || !e.d || e.kept) return;
    if (snapOf(e) === e.snap) { lsSet(draftKey(e.key), ''); return; }
    lsSet(draftKey(e.key), JSON.stringify({ at: B().now(), e: { id: e.id, d: e.d, menu: e.menu, meta: e.meta, handTags: e.handTags, idTyped: e.idTyped } }));
    dirtyNote();
  }
  function keepDraft() { clearTimeout(keepTimer); keepTimer = setTimeout(keepNow, 400); }
  function dirty() { var e = M.ed; return !!(e && e.d && snapOf(e) !== e.snap); }
  function dirtyNote() {
    var el = M.root && M.root.querySelector('.mg-state');
    if (el) el.textContent = stateText();
  }
  function stateText() {
    var e = M.ed;
    if (e.saving) return e.saving;
    if (dirty()) return 'Not saved yet. Kept on this device.';
    if (e.isNew) return 'New recipe.';
    return e.meta.v ? 'Saved. Version ' + e.meta.v + '.' : 'As in the book file. Nothing changed yet.';
  }

  /* ---------- reading the form ---------- */
  function setField(path, val) {
    var e = M.ed, d = e && e.d, p = path.split('.');
    if (p[0] === 'q') { M.q = val; M.more = false; var box = M.root.querySelector('#mg-results'); if (box) { var tmp = document.createElement('div'); tmp.innerHTML = listHTML(); box.innerHTML = tmp.querySelector('#mg-results').innerHTML; } return; }
    if (!e || !d) return;
    if (p[0] === 'ing') { d.ingredients[+p[1]][p[2]] = val; if (p[2] === 'link' && !val) delete d.ingredients[+p[1]].link; }
    else if (p[0] === 'sec') {
      var sc = d.sections[+p[1]];
      if (p[2] === 'steps') sc.steps = val.split('\n').map(function (t) { return t.trim(); }).filter(Boolean);
      else sc.title = val;
    }
    else if (p[0] === 'pin') {
      var pn = d.pins[+p[1]];
      pn.own = true;   // written by hand: a drawing saved later keeps it as it is
      if (p[2] === 'x' || p[2] === 'y') pn[p[2]] = Math.max(0, Math.min(100, Number(val) || 0));
      else if (p[2] === 'side') { if (val) pn.side = val; else delete pn.side; }
      else if (p[2] === 'link') { if (val) pn.link = val; else delete pn.link; }
      else pn[p[2]] = val;
    }
    else if (p[0] === 'tip' || p[0] === 'safety') { d[p[0]] = d[p[0]] || { title: '', text: '' }; d[p[0]][p[1]] = val; }
    else if (p[0] === 'menu') { e.menu[p[1]] = val; if (p[1] === 'sec') e.menu.after = '$'; }
    else if (p[0] === 'hand') {
      var a = p[1], list = (val === 'contains' ? 'contains' : val === 'check' ? 'check' : '');
      d.contains = (d.contains || []).filter(function (x) { return x.allergen !== a; });
      d.check = (d.check || []).filter(function (x) { return x.allergen !== a; });
      if (list) d[list].push({ allergen: a, from: '' });
    }
    else if (p[0] === 'handfrom') { ['contains', 'check'].forEach(function (k) { (d[k] || []).forEach(function (x) { if (x.allergen === p[1]) x.from = val; }); }); }
    else if (p[0] === 'id') { e.id = slug(val); d.id = e.id; e.idTyped = true; }
    else if (p[0] === 'kind') { var was = d.kind; d.kind = val; if (!d.forLine || d.forLine === FOR_LINE[was]) d.forLine = FOR_LINE[val]; }
    else if (p[0] === 'done') d.done = !!val;
    else {
      d[p[0]] = val;
      if (p[0] === 'name' && e.isNew && !e.idTyped) { e.id = slug(val); d.id = e.id; var ib = M.root.querySelector('#mg-id'); if (ib) ib.value = e.id; }
    }
    keepDraft();
  }

  /* ---------- the editor page ---------- */
  /* The recipe a line or a label links to: 119 recipes are too many for a dropdown (coding rules, 22 Oct 2026), so it is
     a box that finds them as you type, from one list for the whole form (linkList()). Each choice reads "Name (number)";
     the box keeps the recipe's id in data-id, and a name that is not on the list goes back to what it was. */
  function linkChoices() {
    var prep = [], dish = [], seen = {};
    D.recipes.forEach(function (r) { if (M.ed && r.id === M.ed.id) return; seen[r.id] = 1; (DISH[r.kind] ? dish : prep).push(r); });
    var out = prep.concat(dish).map(function (r) { return { id: r.id, label: r.name + ' (' + r.no + ')' }; });
    A.toCome().filter(function (t) { return !seen[t.id]; }).forEach(function (t) { out.push({ id: t.id, label: t.id + ' (card to come)' }); });
    return out;
  }
  function linkLabel(id) {
    if (!id) return '';
    var c = linkChoices().filter(function (x) { return x.id === id; })[0];
    return c ? c.label : id + ' (card to come)';
  }
  function linkList() { return '<datalist id="mg-rx">' + linkChoices().map(function (c) { return '<option value="' + esc(c.label) + '"></option>'; }).join('') + '</datalist>'; }
  function linkBox(f, sel, id, label) {
    return '<input' + (id ? ' id="' + id + '"' : '') + ' class="search mg-link" type="search" list="mg-rx" data-fl="' + f + '" data-id="' + esc(sel || '') + '" value="' + esc(linkLabel(sel)) + '" placeholder="No link (type to find a recipe)" autocomplete="off" aria-label="' + esc(label) + '">';
  }
  function linkPicked(el) {
    var t = el.value.trim(), f = el.getAttribute('data-fl');
    if (!t) { el.setAttribute('data-id', ''); setField(f, ''); return true; }
    var c = linkChoices().filter(function (x) { return x.label === t; })[0] || linkChoices().filter(function (x) { return x.label.toLowerCase().indexOf(t.toLowerCase() + ' (') === 0; })[0];
    if (!c) return false;
    el.value = c.label; el.setAttribute('data-id', c.id); setField(f, c.id);
    return true;
  }
  function tagChips(list, where, i) {
    var tags = list || [];
    return '<div class="chips mg-tags" role="group" aria-label="Allergens in this">' + ALLERGENS.map(function (a) {
      var st = tags.indexOf(a) >= 0 ? 'has' : tags.indexOf(a + '?') >= 0 ? 'may' : '';
      return '<button type="button" class="chip mg-tag' + (st ? ' is-' + st : '') + '" data-mg="tag" data-w="' + where + '" data-i="' + i + '" data-v="' + esc(a) + '" aria-pressed="' + (!!st) + '">' + esc(a) + (st === 'may' ? '?' : '') + '</button>';
    }).join('') + '</div><p class="hint">Tap once: has it. Twice: may have it (check the label). Three times: not in it.</p>';
  }
  function tagSummary(list) { return list && list.length ? list.join(', ') : 'No allergens'; }
  function field(id, label, f, val, o) {
    o = o || {};
    var input = o.area
      ? '<textarea id="' + id + '" class="p-bulk" data-f="' + f + '" rows="' + (o.rows || 3) + '"' + (o.max ? ' maxlength="' + o.max + '"' : '') + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + '>' + esc(val) + '</textarea>'
      : '<input id="' + id + '" class="search" data-f="' + f + '" autocomplete="off"' + (o.max ? ' maxlength="' + o.max + '"' : '') + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + (o.mode ? ' inputmode="' + o.mode + '"' : '') + ' value="' + esc(val) + '">';
    return '<div class="field' + (o.cls ? ' ' + o.cls : '') + '"><label class="label" for="' + id + '">' + esc(label) + '</label>' + input + (o.hint ? '<span class="hint">' + o.hint + '</span>' : '') + '</div>';
  }
  function basicsHTML(e) {
    var d = e.d;
    return '<section class="set-block mg-sec" aria-labelledby="mg-h-basics"><h3 class="h3" id="mg-h-basics">The card</h3>' +
      field('mg-name', 'Name staff see', 'name', d.name, { max: 80, ph: 'For example: Beer Batter' }) +
      (e.isNew ? field('mg-id', 'Short id (used in links)', 'id', e.id, { max: 48, ph: 'beer-batter', hint: 'Lower case words joined by -. It cannot change once the recipe is saved.' }) : '<p class="hint">Id: <b>' + esc(e.id) + '</b> (links to this card use it)</p>') +
      '<div class="mg-two">' + field('mg-no', 'Card number', 'no', d.no || '', { max: 8, mode: 'numeric' }) +
      '<div class="field"><label class="label" for="mg-kind">Kind</label><select id="mg-kind" class="search" data-f="kind">' + Object.keys(KIND).map(function (k) { return '<option value="' + k + '"' + (d.kind === k ? ' selected' : '') + '>' + esc(KIND[k]) + '</option>'; }).join('') + '</select></div></div>' +
      field('mg-for', 'Where it belongs', 'forLine', d.forLine || '', { max: 80, ph: 'Plate, or For the barramundi' }) +
      field('mg-short', 'Short name (prep lines, optional)', 'short', d.short || '', { max: 40 }) +
      field('mg-yield', 'Portion or batch line', 'yield', d.yield || '', { max: 300, ph: 'Per plate, or 5 L batch' }) +
      field('mg-menu', 'How the guest menu describes it (optional)', 'menu', d.menu || '', { area: true, rows: 2, max: 400 }) +
      field('mg-avc', 'Name in AVC Live (optional)', 'avc', d.avc || '', { max: 120, hint: 'So a search for the AVC name finds the card. No prices or codes here.' }) +
      '<label class="mg-check"><input type="checkbox" data-f="done"' + (d.done ? ' checked' : '') + '> Finished: the card and its drawings are 100% done (green frame)</label></section>';
  }
  function ingHTML(e) {
    var d = e.d, n = d.ingredients.length;
    return '<section class="set-block mg-sec" aria-labelledby="mg-h-ing"><h3 class="h3" id="mg-h-ing">Ingredients</h3>' +
      '<p class="hint">Link an ingredient to its own recipe to make it tappable; its allergens then come from that recipe.</p>' +
      '<ol class="mg-ings">' + d.ingredients.map(function (i, k) {
        var open = e.open === k;
        return '<li class="mg-ing"><div class="mg-ing-top"><span class="mg-n" aria-hidden="true">' + (k + 1) + '</span>' +
          '<input class="search mg-q" data-f="ing.' + k + '.q" aria-label="Amount, ingredient ' + (k + 1) + '" placeholder="Amount" maxlength="40" value="' + esc(i.q || '') + '">' +
          '<input class="search" data-f="ing.' + k + '.name" aria-label="Ingredient ' + (k + 1) + '" placeholder="Ingredient" maxlength="120" value="' + esc(i.name || '') + '"></div>' +
          '<input class="search" data-f="ing.' + k + '.note" aria-label="Note, ingredient ' + (k + 1) + '" placeholder="Note (optional)" maxlength="200" value="' + esc(i.note || '') + '">' +
          '<div class="mg-ing-row"><label class="visually-hidden" for="mg-link-' + k + '">Recipe link, ingredient ' + (k + 1) + '</label>' + linkBox('ing.' + k + '.link', i.link || '', 'mg-link-' + k, 'Recipe link, ingredient ' + (k + 1)) + '</div>' +
          '<div class="btn-row mg-mini"><button type="button" class="p-x" data-mg="ing-tags" data-i="' + k + '" aria-expanded="' + open + '">' + esc(i.link ? 'Allergens from its recipe' : tagSummary(i.tags)) + '</button>' +
          (k ? '<button type="button" class="p-x" data-mg="ing-up" data-i="' + k + '" aria-label="Move ingredient ' + (k + 1) + ' up">Up</button>' : '') +
          (k < n - 1 ? '<button type="button" class="p-x" data-mg="ing-down" data-i="' + k + '" aria-label="Move ingredient ' + (k + 1) + ' down">Down</button>' : '') +
          '<button type="button" class="p-x" data-mg="ing-del" data-i="' + k + '" aria-label="Remove ingredient ' + (k + 1) + '">Remove</button></div>' +
          (open ? tagChips(i.tags, 'ing', k) : '') + '</li>';
      }).join('') + '</ol><div class="btn-row"><button type="button" class="btn" data-mg="ing-add">Add an ingredient</button></div></section>';
  }
  function methodHTML(e) {
    var d = e.d, secs = d.sections || [], n = secs.length;
    return '<section class="set-block mg-sec" aria-labelledby="mg-h-method"><h3 class="h3" id="mg-h-method">Method</h3>' +
      '<p class="hint">One step per line. Staff tick the steps off on the card.</p>' +
      secs.map(function (sc, k) {
        return '<div class="mg-step-sec">' + field('mg-st-' + k, 'Section title', 'sec.' + k + '.title', sc.title, { max: 80, ph: 'Method, Cooking, Plating' }) +
          field('mg-ss-' + k, 'Steps', 'sec.' + k + '.steps', sc.steps.join('\n'), { area: true, rows: Math.max(4, sc.steps.length + 1) }) +
          '<div class="btn-row mg-mini">' + (k ? '<button type="button" class="p-x" data-mg="sec-up" data-i="' + k + '">Up</button>' : '') +
          (k < n - 1 ? '<button type="button" class="p-x" data-mg="sec-down" data-i="' + k + '">Down</button>' : '') +
          '<button type="button" class="p-x" data-mg="sec-del" data-i="' + k + '">' + (armed('sec-del:' + k) ? 'Tap again to remove' : 'Remove this section') + '</button></div></div>';
      }).join('') + '<div class="btn-row"><button type="button" class="btn" data-mg="sec-add">Add a section</button></div></section>';
  }
  function rollTags(ro) { return ro.contains.concat(ro.check.map(function (a) { return a + '?'; })); }
  function allergenHTML(e) {
    var d = e.d, clean = cleanRecipe(e), ro = A.rollFor(clean), now = A.tags(e.id), next = rollTags(ro);
    var users = A.usedIn(e.id).map(function (id) { return id; });
    var body;
    if (e.handTags) {
      body = '<div class="mg-hand">' + ALLERGENS.map(function (a) {
        var has = (d.contains || []).filter(function (x) { return x.allergen === a; })[0], may = (d.check || []).filter(function (x) { return x.allergen === a; })[0], cur = has ? 'contains' : may ? 'check' : '', from = (has || may || {}).from || '';
        return '<div class="mg-hand-row"><span class="mg-hand-a">' + esc(a) + '</span><select class="search" data-f="hand.' + esc(a) + '" aria-label="' + esc(a) + '"><option value=""' + (!cur ? ' selected' : '') + '>Not in it</option><option value="contains"' + (cur === 'contains' ? ' selected' : '') + '>Has it</option><option value="check"' + (cur === 'check' ? ' selected' : '') + '>May have it</option></select>' +
          (cur ? '<input class="search" data-f="handfrom.' + esc(a) + '" aria-label="' + esc(a) + ' comes from" placeholder="From which part" maxlength="200" value="' + esc(from) + '">' : '') + '</div>';
      }).join('') + '</div>';
    } else body = '<p class="hint">Worked out from the allergens tagged on each ingredient, and from the recipes linked.</p>';
    var change = JSON.stringify(now) === JSON.stringify(next) ? '' : '<p class="mg-change" role="status"><b>After saving:</b> ' + esc(next.length ? next.join(', ') : 'none') + (now.length || !e.isNew ? ' (now: ' + esc(now.length ? now.join(', ') : 'none') + ')' : '') + '</p>';
    return '<section class="set-block mg-sec" aria-labelledby="mg-h-alg"><h3 class="h3" id="mg-h-alg">Allergens</h3>' +
      '<div class="chips" role="group" aria-label="How the allergens are set"><button type="button" class="chip" data-mg="hand" data-v="0" aria-pressed="' + !e.handTags + '">Worked out from the ingredients</button><button type="button" class="chip" data-mg="hand" data-v="1" aria-pressed="' + e.handTags + '">Set by hand</button></div>' +
      (e.handTags ? '<p class="hint">This recipe sets its allergens by hand, so the ingredient tags do not change them.</p>' : '') + body +
      '<div class="mg-alg-now"><span class="label">The card shows</span><span class="chips">' + (next.length ? next.map(function (t) { return '<span class="tag' + (/\?$/.test(t) ? ' maybe' : '') + '">' + esc(t) + '</span>'; }).join('') : '<span class="hint">No allergens</span>') + '</span>' +
      (ro.missing.length ? '<p class="hint">Not complete: ' + esc(ro.missing.join(', ')) + ' has no card yet.</p>' : '') + '</div>' + change +
      (users.length ? '<p class="hint">Used in ' + esc(users.map(nameOf).join(', ')) + ': their allergens follow this recipe.</p>' : '') +
      field('mg-lnote', 'Label note (optional)', 'labelNote', d.labelNote || '', { max: 300, ph: 'For example: check the bun label for sesame' }) + '</section>';
  }
  function boxesHTML(e) {
    var d = e.d, tip = d.tip || { title: '', text: '' }, sf = d.safety || { title: '', text: '' };
    return '<section class="set-block mg-sec" aria-labelledby="mg-h-box"><h3 class="h3" id="mg-h-box">Boxes on the card (optional)</h3>' +
      '<div class="mg-two">' + field('mg-tipt', 'Tip box title', 'tip.title', tip.title, { max: 80, ph: 'iCombi' }) + field('mg-sft', 'Safety box title', 'safety.title', sf.title, { max: 80, ph: 'Hot oil' }) + '</div>' +
      field('mg-tipx', 'Tip box words', 'tip.text', tip.text, { area: true, rows: 2, max: 1000 }) +
      field('mg-sfx', 'Safety box words (orange)', 'safety.text', sf.text, { area: true, rows: 2, max: 1000 }) +
      field('mg-aka', 'Other names staff search for (optional)', 'aka', d.aka || '', { max: 200 }) + '</section>';
  }
  function menuHTML(e) {
    if (!DISH[e.d.kind]) return '';
    var titles = A.menuTitles(), sec = e.menu.sec, ids = ((D.menuOrder || []).filter(function (s) { return s.title === sec; })[0] || { ids: [] }).ids.filter(function (id) { return id !== e.id; });
    return '<section class="set-block mg-sec" aria-labelledby="mg-h-menu"><h3 class="h3" id="mg-h-menu">On the guest menu</h3>' +
      '<div class="field"><label class="label" for="mg-msec">Menu section</label><select id="mg-msec" class="search" data-f="menu.sec"><option value=""' + (!sec ? ' selected' : '') + '>Not on the guest menu (Other dishes)</option>' +
      titles.map(function (t) { return '<option value="' + esc(t) + '"' + (t === sec ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></div>' +
      (sec ? '<div class="field"><label class="label" for="mg-mafter">Comes after</label><select id="mg-mafter" class="search" data-f="menu.after"><option value="^"' + (e.menu.after === '^' ? ' selected' : '') + '>First in the section</option>' +
        ids.map(function (id) { return '<option value="' + esc(id) + '"' + (e.menu.after === id ? ' selected' : '') + '>' + esc(nameOf(id)) + '</option>'; }).join('') +
        '<option value="$"' + (e.menu.after === '$' ? ' selected' : '') + '>Last in the section</option></select></div>' : '') + '</section>';
  }
  // the head chef's own drawings ('@<id>') for a slot, from this device's copy of the book
  function bookArts(slot) { return X.arts().filter(function (x) { return x.slot === slot && !x.removed; }).sort(function (a, b) { return (a.rid === M.ed.id ? 0 : 1) - (b.rid === M.ed.id ? 0 : 1) || a.name.localeCompare(b.name); }); }
  function drawBtns(e, slot, cur) {
    var mine = cur && cur.charAt(0) === '@';
    return '<div class="btn-row mg-mini">' + (mine ? '<button type="button" class="p-x" data-mg="draw" data-v="' + esc(cur.slice(1)) + '">Change this drawing</button>' : '') +
      '<button type="button" class="p-x" data-mg="draw" data-v="new:' + slot + '">Draw ' + (slot === 'plate' ? 'the plate' : slot === 'pan' ? 'the pan' : slot === 'side' ? 'the side view' : 'a build drawing') + ' in the book</button></div>';
  }
  function drawingHTML(e) {
    var d = e.d, dish = !!DISH[d.kind], keys = A.artKeys(), list = dish ? keys.plates : keys.pans, preview = cleanRecipe(e), slot = dish ? 'plate' : 'pan';
    var mineOpts = function (sl, cur) { var l = bookArts(sl); return l.length ? '<optgroup label="Drawn in the book">' + l.map(function (x) { return '<option value="@' + esc(x.id) + '"' + (cur === '@' + x.id ? ' selected' : '') + '>' + esc(x.name || x.id) + '</option>'; }).join('') + '</optgroup>' : ''; };
    var opts = '<option value=""' + (!d.art ? ' selected' : '') + '>No drawing yet (a blank ' + (dish ? 'plate' : 'pan') + ')</option>' + mineOpts(slot, d.art) + '<optgroup label="The book\'s own">' + list.map(function (k) { return '<option value="' + esc(k) + '"' + (d.art === k ? ' selected' : '') + '>' + esc(artName(k)) + '</option>'; }).join('') + '</optgroup>';
    var dopts = '<option value=""' + (!d.diagram ? ' selected' : '') + '>None</option>' + mineOpts('build', d.diagram) + '<optgroup label="The book\'s own">' + keys.diagrams.map(function (k) { return '<option value="' + esc(k) + '"' + (d.diagram === k ? ' selected' : '') + '>' + esc(artName(k)) + '</option>'; }).join('') + '</optgroup>';
    var bookSide = !!(window.LK_ART && window.LK_ART.sides && window.LK_ART.sides[e.id]);
    var sopts = '<option value=""' + (!d.side ? ' selected' : '') + '>' + (bookSide ? 'The book\'s own side view' : 'None') + '</option>' + mineOpts('side', d.side);
    var first = e.isNew ? '<p class="hint">Save the recipe first, then draw it in the book.</p>' : '';
    return '<section class="set-block mg-sec" aria-labelledby="mg-h-draw"><h3 class="h3" id="mg-h-draw">Drawings</h3>' + first +
      '<div class="field"><label class="label" for="mg-art">' + (dish ? 'On the plate' : 'In the pan') + '</label><select id="mg-art" class="search" data-f="art" data-redraw="1">' + opts + '</select><span class="hint">A drawing from the book, or one drawn here.</span></div>' +
      (e.isNew ? '' : drawBtns(e, slot, d.art)) +
      (dish ? pinsHTML(e, preview) : '<div class="mg-art-one">' + A.art(preview, 'mg-art') + '</div>') +
      '<div class="field"><label class="label" for="mg-side">From the side</label><select id="mg-side" class="search" data-f="side">' + sopts + '</select></div>' + (e.isNew ? '' : drawBtns(e, 'side', d.side)) +
      '<div class="field"><label class="label" for="mg-diag">Build or technique drawing</label><select id="mg-diag" class="search" data-f="diagram">' + dopts + '</select></div>' + (e.isNew ? '' : drawBtns(e, 'build', d.diagram)) + '</section>';
  }
  function artName(k) { var r = A.byId(k); return r ? r.name + ' (' + k + ')' : k; }
  /* Plate labels on the Pass: drag a pin on the drawing, or type its place. */
  function pinsHTML(e, preview) {
    var pins = e.d.pins || [];
    return '<div class="mg-stage" data-mg-stage="1">' + A.art(preview, 'mg-art') + pins.map(function (p, k) {
      return '<button type="button" class="mg-pin' + (e.pinOpen === k ? ' on' : '') + '" style="left: ' + p.x + '%; top: ' + p.y + '%" data-mg="pin-pick" data-i="' + k + '" aria-label="' + esc('Label ' + (k + 1) + ': ' + (p.label || 'no name') + '. Drag to move') + '">' + (k + 1) + '</button>';
    }).join('') + '</div><p class="hint">Plate labels on the Pass: drag a number to where its part sits. Tap one to change it.</p>' +
      '<ol class="mg-pins">' + pins.map(function (p, k) {
        var open = e.pinOpen === k;
        return '<li class="mg-pinrow' + (open ? ' on' : '') + '"><div class="mg-ing-top"><span class="mg-n" aria-hidden="true">' + (k + 1) + '</span>' +
          '<input class="search" data-f="pin.' + k + '.label" aria-label="Label ' + (k + 1) + '" placeholder="Label" maxlength="60" value="' + esc(p.label || '') + '">' +
          '<button type="button" class="p-x" data-mg="pin-pick" data-i="' + k + '" aria-expanded="' + open + '">' + (open ? 'Less' : 'More') + '</button></div>' +
          (open ? '<input class="search" data-f="pin.' + k + '.note" aria-label="Note, label ' + (k + 1) + '" placeholder="What staff read when they tap it" maxlength="400" value="' + esc(p.note || '') + '">' +
            linkBox('pin.' + k + '.link', p.link || '', '', 'Opens recipe, label ' + (k + 1)) +
            '<div class="mg-two"><label class="field"><span class="label">Across %</span><input class="search" inputmode="decimal" data-f="pin.' + k + '.x" value="' + esc(p.x) + '"></label>' +
            '<label class="field"><span class="label">Down %</span><input class="search" inputmode="decimal" data-f="pin.' + k + '.y" value="' + esc(p.y) + '"></label></div>' +
            '<div class="field"><label class="label" for="mg-pside-' + k + '">Label side</label><select id="mg-pside-' + k + '" class="search" data-f="pin.' + k + '.side"><option value=""' + (!p.side ? ' selected' : '') + '>Where it fits</option><option value="left"' + (p.side === 'left' ? ' selected' : '') + '>Left</option><option value="right"' + (p.side === 'right' ? ' selected' : '') + '>Right</option></select></div>' +
            (p.link ? '<p class="hint">Opens its recipe; its allergens come from there.</p>' : '<span class="label">Allergens in this part</span>' + tagChips(p.tags, 'pin', k) + '<p class="hint">These are the label\'s own tags, apart from the ingredient list.</p>') +
            '<div class="btn-row mg-mini"><button type="button" class="p-x" data-mg="pin-del" data-i="' + k + '">Remove this label</button></div>' : '') + '</li>';
      }).join('') + '</ol><div class="btn-row"><button type="button" class="btn" data-mg="pin-add">Add a label</button></div>';
  }
  function histHTML(e) {
    if (e.isNew) return '';
    var h = e.hist;
    var list = h === 'loading' ? '<p class="hint" role="status">Reading earlier versions...</p>' : h === 'error' ? '<p class="p-err" role="alert">Could not read the earlier versions. Check the signal.</p>' :
      h ? (h.length ? '<ol class="mg-hist">' + h.map(function (x, k) {
        return '<li><span><b>Version ' + esc(x.v) + '</b> · ' + esc(x.when) + (x.who ? ' · ' + esc(x.who) : '') + (x.name ? ' · ' + esc(x.name) : '') + '</span><button type="button" class="p-x" data-mg="hist-use" data-i="' + k + '">Open this version</button></li>';
      }).join('') + '</ol><p class="hint">Opening a version puts it in the form. Save to make it the card again.</p>' : '<p class="hint">No earlier versions yet.</p>') : '';
    return '<section class="set-block mg-sec" aria-labelledby="mg-h-hist"><h3 class="h3" id="mg-h-hist">Earlier versions</h3>' + list +
      (h ? '' : '<div class="btn-row"><button type="button" class="btn" data-mg="hist">Show earlier versions</button></div>') + '</section>';
  }
  function moreHTML(e) {
    if (e.isNew) return '';
    var st = status(e.id), base = X.pristine(e.id), out = '';
    if (base && !e.meta.off && (st.changed || e.meta.v)) out += '<div class="btn-row"><button type="button" class="btn" data-mg="off">' + (armed('off') ? 'Tap again: show the book file\'s copy' : 'Go back to the book file\'s copy') + '</button></div><p class="hint">Staff then see the recipe as js/data.js has it. This version stays in the earlier versions.</p>';
    out += e.meta.removed
      ? '<div class="btn-row"><button type="button" class="btn dark" data-mg="hide" data-v="0">Put it back in the book</button></div><p class="hint">Hidden: staff do not see this recipe.</p>'
      : '<div class="btn-row"><button type="button" class="btn" data-mg="hide" data-v="1">' + (armed('hide') ? 'Tap again to hide it' : 'Hide this recipe from the book') + '</button></div><p class="hint">Hidden recipes are kept and can be put back. Links to it show "Card to come".</p>';
    return '<section class="set-block mg-sec" aria-labelledby="mg-h-more"><h3 class="h3" id="mg-h-more">In the book</h3>' + out + '</section>';
  }
  function editorHTML() {
    var e = M.ed;
    if (e.missing !== undefined) return '<div class="mg-wrap"><h2 id="rtitle" tabindex="-1">Recipe not found</h2><p>There is no recipe "' + esc(e.missing) + '" in the book.</p><div class="btn-row"><a class="btn" href="#/manage">All recipes</a></div></div>';
    var d = e.d, st = e.isNew ? null : status(e.id);
    var crumbs = '<nav class="crumbs" aria-label="Breadcrumb"><a href="#/manage">Manage Recipes &amp; Drawings</a><span class="sep" aria-hidden="true">/</span><span aria-current="page">' + esc(d.name || 'New recipe') + '</span></nav>';
    var head = '<div class="mg-head"><h2 id="rtitle" tabindex="-1">' + esc(e.isNew ? (d.name ? 'New: ' + d.name : 'New recipe') : 'Change ' + d.name) + '</h2>' +
      (st && !e.isNew && A.byId(e.id) ? '<a class="p-x" href="#/r/' + encodeURIComponent(e.id) + '">Open the card</a>' : '') + '</div>';
    var kept = e.kept ? '<div class="box beige mg-kept" role="note"><span class="label">Changes not saved yet</span><div>This device kept changes to this recipe from ' + esc(B().dayShort(e.kept.at) + ' ' + B().clock(e.kept.at)) + '.</div>' +
      '<div class="btn-row"><button type="button" class="btn dark" data-mg="kept-use">Keep editing them</button><button type="button" class="btn" data-mg="kept-drop">' + (armed('kept-drop') ? 'Tap again to throw them away' : 'Throw them away') + '</button></div></div>' : '';
    var fileNote = st && st.fileChanged ? '<div class="box beige" role="note"><span class="label">The book file changed</span><div>js/data.js has a newer copy of this recipe than the one this change was made from. Check the steps and amounts, or go back to the book file\'s copy (In the book, below).</div></div>' : '';
    var conflict = e.conflict ? '<div class="warn" role="alert"><span class="label">Changed on another device</span><span>Version ' + esc(e.conflict.v) + ' was saved' + (e.conflict.who ? ' by ' + esc(e.conflict.who) : '') + (e.conflict.when ? ' at ' + esc(e.conflict.when) : '') + ' after you opened this recipe.</span>' +
      '<div class="btn-row"><button type="button" class="btn" data-mg="theirs">Open theirs</button><button type="button" class="btn dark" data-mg="mine">Save mine over it</button></div></div>' : '';
    var errs = e.errs.length ? '<div class="warn" role="alert"><span class="label">Not saved yet</span><ul class="mg-errs">' + e.errs.map(function (x) { return '<li><a href="#' + esc(x.at) + '" data-mg="goto" data-v="' + esc(x.at) + '">' + esc(x.msg) + '</a></li>'; }).join('') + '</ul></div>' : '';
    var warns = e.warns.length ? '<div class="box beige" role="note">' + e.warns.map(function (w) { return '<div>' + esc(w) + '</div>'; }).join('') + '</div>' : '';
    return '<div class="mg-wrap mg-ed">' + linkList() + '<div class="btn-row"><a class="btn" data-mg-back="1" href="#/manage">Back to all recipes</a></div>' + crumbs + head + kept + fileNote + conflict + errs + warns +
      basicsHTML(e) + ingHTML(e) + methodHTML(e) + allergenHTML(e) + drawingHTML(e) + menuHTML(e) + boxesHTML(e) + histHTML(e) + moreHTML(e) +
      '<div class="mg-bar"><span class="mg-state" role="status">' + esc(stateText()) + '</span>' + (e.msg ? '<span class="p-err" role="alert">' + esc(e.msg) + '</span>' : '') +
      '<div class="btn-row"><button type="button" class="btn dark" data-mg="save"' + (e.saving ? ' disabled' : '') + '>' + (e.saving ? 'Saving...' : 'Save') + '</button>' +
      (dirty() ? '<button type="button" class="btn" data-mg="undo-all">' + (armed('undo-all') ? 'Tap again to undo all' : 'Undo all changes') + '</button>' : '') + '<a class="btn" href="#/manage">Back to all recipes</a></div></div></div>';
  }

  /* ---------- checking and saving ---------- */
  function trimStr(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
  // the recipe as it is saved: tidy text, empty rows dropped, and only the fields js/data.js uses
  // the ingredients by the name they had when the form opened (the same objects stay in the list when moved or renamed)
  function bare(n) { return String(n || '').replace(/\s*\([^)]*\)/g, '').trim(); }
  function ingMap(d) { var m = {}; (d.ingredients || []).forEach(function (i) { m[bare(i.name)] = i; }); return m; }
  function cleanRecipe(e) {
    var d = e.d, out = { id: e.id, kind: d.kind, no: trimStr(d.no), forLine: trimStr(d.forLine), name: trimStr(d.name), yield: trimStr(d.yield) };
    ['short', 'avc', 'menu', 'labelNote', 'aka', 'art', 'diagram', 'side'].forEach(function (k) { var v = trimStr(d[k]); if (v) out[k] = v; });
    out.ingredients = (d.ingredients || []).filter(function (i) { return trimStr(i.name) || trimStr(i.q); }).map(function (i) {
      var o = { q: trimStr(i.q), name: trimStr(i.name) };
      if (i.link) o.link = i.link;
      if (trimStr(i.note)) o.note = trimStr(i.note);
      if (!i.link && i.tags && i.tags.length) o.tags = i.tags.slice();
      return o;
    });
    out.pins = (d.pins || []).filter(function (p) { return trimStr(p.label); }).map(function (p) {
      var o = { label: trimStr(p.label), x: Math.round(Number(p.x) * 10) / 10, y: Math.round(Number(p.y) * 10) / 10 };
      if (p.side) o.side = p.side;
      if (p.link) o.link = p.link; else o.tags = (p.tags || []).slice();
      if (trimStr(p.note)) o.note = trimStr(p.note);
      if (p.ing) o.ing = p.ing;
      // a label made from a drawing follows its ingredient's new name; one written by hand stays as it is
      var ig = !p.own && p.ing && e.ing0 && e.ing0[p.ing];
      if (ig && d.ingredients.indexOf(ig) >= 0 && bare(ig.name) && bare(ig.name) !== p.ing) { o.ing = bare(ig.name); o.label = o.ing.slice(0, 60); }
      if (p.own) o.own = true;
      return o;
    });
    var secs = (d.sections || []).map(function (s) { return { title: trimStr(s.title) || 'Method', steps: (s.steps || []).map(trimStr).filter(Boolean) }; }).filter(function (s) { return s.steps.length; });
    if (secs.length) out.sections = secs;
    if (e.handTags) {
      out.contains = (d.contains || []).map(function (x) { return { allergen: x.allergen, from: trimStr(x.from) }; });
      out.check = (d.check || []).map(function (x) { return { allergen: x.allergen, from: trimStr(x.from) }; });
    }
    ['tip', 'safety'].forEach(function (k) { if (d[k] && trimStr(d[k].text)) out[k] = { title: trimStr(d[k].title) || (k === 'tip' ? 'Tip' : 'Safety'), text: trimStr(d[k].text) }; });
    if (d.done) out.done = true;
    return out;
  }
  function check(e) {
    var d = e.d, errs = [], warns = [], ids = allIds();
    if (!trimStr(d.name)) errs.push({ at: 'mg-name', msg: 'Give the recipe a name.' });
    if (e.isNew) {
      if (!idOk(e.id)) errs.push({ at: 'mg-id', msg: 'The short id is needed: lower case letters, numbers and -, for example beer-batter.' });
      else if (ids[e.id] || X.pristine(e.id)) errs.push({ at: 'mg-id', msg: 'The id ' + e.id + ' is already used by ' + nameOf(e.id) + '. Pick another.' });
    }
    (d.ingredients || []).forEach(function (i, k) { if (trimStr(i.q) && !trimStr(i.name)) errs.push({ at: 'mg-h-ing', msg: 'Ingredient ' + (k + 1) + ' has an amount but no name.' }); });
    if ((d.ingredients || []).length > 100) errs.push({ at: 'mg-h-ing', msg: 'At most 100 ingredients.' });
    if ((d.sections || []).length > 30) errs.push({ at: 'mg-h-method', msg: 'At most 30 method sections.' });
    var no = trimStr(d.no);
    if (no) {
      var same = Object.keys(ids).filter(function (id) { if (id === e.id) return false; var r = A.byId(id) || (X.change(id) || {}).r || X.pristine(id); return r && String(r.no) === no; });
      if (same.length) warns.push('Card number ' + no + ' is also used by ' + same.map(nameOf).join(', ') + '.');
    }
    if (!X.tidy(cleanRecipe(e), e.id) && !errs.length) errs.push({ at: 'mg-name', msg: 'This does not look like a recipe yet. Check the name and the kind.' });
    e.errs = errs; e.warns = warns;
    return !errs.length;
  }
  // the guest menu with this dish in the place the form says (or none when nothing moved)
  function menuAfter(e) {
    if (!DISH[e.d.kind]) return null;
    var was = e.isNew ? { sec: '', after: '' } : menuOf(e.id);
    if (e.menu.sec === was.sec && (e.menu.after === was.after || (e.menu.after === '$' && was.after === lastOf(was.sec, e.id)))) return null;
    var menu = clone(D.menuOrder || []);
    menu.forEach(function (s) { s.ids = s.ids.filter(function (id) { return id !== e.id; }); });
    if (e.menu.sec) {
      var s = menu.filter(function (x) { return x.title === e.menu.sec; })[0];
      if (!s) { s = { title: e.menu.sec, ids: [] }; menu.push(s); }
      var at = e.menu.after === '^' ? 0 : e.menu.after === '$' || !e.menu.after ? s.ids.length : s.ids.indexOf(e.menu.after) + 1;
      if (at < 0) at = s.ids.length;
      s.ids.splice(at, 0, e.id);
    }
    return menu;
  }
  function lastOf(sec, id) { var s = (D.menuOrder || []).filter(function (x) { return x.title === sec; })[0]; return s && s.ids[s.ids.length - 1] === id ? (s.ids.length > 1 ? s.ids[s.ids.length - 2] : '^') : ''; }
  function when(t) { return t ? B().dayShort(t) + ' ' + B().clock(t) : ''; }
  function save(force) {
    var e = M.ed;
    if (!e || e.saving) return;
    e.msg = ''; e.conflict = force ? null : e.conflict;
    keepNow();   // kept on this device until the save is confirmed
    if (!e.meta.off && !e.meta.removed && !check(e)) { draw(); focusId(e.errs[0].at); return; }
    if (!P.bookEdit()) { e.msg = 'Not saved: only the head chef can change recipes. Sign in with your PIN as Head chef.'; draw(); return; }
    var api = B(), id = e.id, clean = cleanRecipe(e), menu = menuAfter(e);
    e.saving = 'Saving...'; draw();
    var slow = setTimeout(function () { if (M.ed === e && e.saving) { e.saving = 'Waiting for the signal. Your changes are kept on this device and go when the signal is back.'; dirtyNote(); } }, 4000);
    var fs, prev;
    api.ready().then(function () {
      fs = api.fs();
      return (api.fromServer ? api.fromServer(api.docRef('recipes', id)) : fs.getDocFromServer(api.docRef('recipes', id))).then(function (sn) { return sn.exists() ? sn.data() : null; }, function () { return 'offline'; });
    }).then(function (server) {
      var sv = server === 'offline' ? e.meta.v : (server ? server.v : 0);
      if (server !== 'offline' && sv !== e.meta.v && !force) {
        clearTimeout(slow); e.saving = '';
        e.conflict = { v: sv, who: server && server.by ? api.nameOf(server.by) : '', when: when(server && server.upd), rec: server };
        draw(); return null;
      }
      prev = server === 'offline' ? X.change(id) : server;
      var v = sv + 1, rec = { r: clean, v: v, upd: api.now(), src: e.meta.src, base: e.meta.src === 'book' ? X.fingerprint(id) : '', removed: !!e.meta.removed };
      if (e.meta.off) rec.off = true;
      var idx = { r: {}, upd: api.now() };
      idx.r[id] = v;
      if (menu) idx.menu = menu;
      var ops = [['set', api.docRef('recipes', id), rec], ['set', api.docRef('book', 'index'), idx, true]];
      if (prev && prev.v) {
        var was = {}; ['r', 'v', 'upd', 'by', 'src', 'base', 'removed', 'off'].forEach(function (k) { if (prev[k] !== undefined) was[k] = prev[k]; });
        ops.push(['set', fs.doc(api.db(), 'kitchens', api.pin(), 'recipes', id, 'hist', String(prev.v)), { was: was, at: api.now() }]);
      }
      // the change shows on this device at once; the save goes when the signal allows
      return api.W(ops).then(function () { return { v: v, rec: rec, idx: idx }; });
    }).then(function (done) {
      clearTimeout(slow);
      if (!done) return;
      X.put(api.pin(), id, done.rec, done.idx);
      api.changed();
      e.saving = ''; e.meta.v = done.v; e.meta.by = api.who(); e.meta.upd = done.rec.upd; e.conflict = null; e.hist = null;
      lsSet(draftKey(e.key), '');
      var wasNew = e.isNew;
      if (wasNew) { e.isNew = false; e.key = id; e.meta.src = 'new'; }
      e.menu = menuOf(id); e.snap = snapOf(e); e.d.pins = clean.pins; e.ing0 = ingMap(e.d); e.snap = snapOf(e);
      toast(e.meta.removed ? 'Hidden from the book. Version ' + done.v + '.' : e.meta.off ? 'Back to the book file\'s copy. Version ' + done.v + '.' : 'Saved. Version ' + done.v + '.');
      if (wasNew && M.ed === e) { history.replaceState(history.state, '', '#/manage/r/' + encodeURIComponent(id)); if (A.noteRoute) A.noteRoute(true); M.sub = ['r', id]; }
      if (M.ed === e) draw();
      if (!e.meta.removed && !e.meta.off) autoDraw(id, e);
    }).catch(function (err) {
      clearTimeout(slow);
      e.saving = '';
      var code = err && err.code;
      e.msg = code === 'permission-denied' ? 'Not saved: the book refused it. Only the head chef can change recipes, and the recipe may have changed on another device. Try again.' : 'Not saved. Check the signal and try again. Your changes are kept on this device.';
      if (M.ed === e) draw();
    });
  }
  /* Drawn on save (head chef, 21 Oct 2026): after the recipe is saved, its empty drawing slots are drawn and the
     book-made drawings of the dishes that use it are drawn again (js/smart.js autoDraw, with the drawing editor's files),
     and a second note says what was drawn. Those drawings link to the recipe and make its Pass labels, so the open form
     takes the new version and links (an edit made meanwhile stays). */
  var SLOT_WORD = { plate: 'plate', pan: 'GN pan', side: 'side view', build: 'build' };
  function autoDraw(id, e) {
    if (!P.bookEdit()) return;
    loadDraw().then(function () {
      var S = window.LK_SMART;
      return S && S.autoDraw ? S.autoDraw(id) : null;
    }).then(function (res) {
      if (!res) return;
      var cur = X.change(id);
      if (e && M.ed === e && cur && cur.v > e.meta.v) {
        var clean = snapOf(e) === e.snap;
        e.meta.v = cur.v;
        ['art', 'side', 'diagram', 'pins'].forEach(function (k) { if (cur.r && cur.r[k] !== undefined) e.d[k] = cur.r[k]; });
        if (clean) e.snap = snapOf(e);
        draw();
      }
      var say = [];
      if (res.drawn.length) say.push('Drawn: ' + res.drawn.map(function (s) { return SLOT_WORD[s] || s; }).join(' and ').replace(/ and (?=.* and )/g, ', ') + '.');
      if (res.redrawn.length) say.push('Redrawn: ' + res.redrawn.join(', ') + '.');
      if (say.length) toast(say.join(' '));
    }).catch(function () {});
  }
  function focusId(id) {
    var el = M.root && M.root.querySelector('#' + id);
    if (!el) return;
    el.scrollIntoView({ block: 'center' });
    if (el.focus) el.focus({ preventScroll: true });
  }
  function loadHist() {
    var e = M.ed, api = B();
    e.hist = 'loading'; draw();
    api.ready().then(function () {
      var fs = api.fs();
      return fs.getDocs(fs.collection(api.db(), 'kitchens', api.pin(), 'recipes', e.id, 'hist'));
    }).then(function (sn) {
      if (M.ed !== e) return;
      e.hist = sn.docs.map(function (dd) {
        var x = dd.data(), w = x.was || {};
        return { v: w.v || +dd.id, when: when(w.upd || x.at), who: w.by ? api.nameOf(w.by) : '', name: w.r ? w.r.name : '', rec: w };
      }).sort(function (a, b) { return b.v - a.v; });
      draw();
    }, function () { if (M.ed === e) { e.hist = 'error'; draw(); } });
  }

  /* A change to a recipe made from somewhere else (the drawing editor links its drawing and makes its Pass labels): the
     newest copy on the server (or this device's, with no signal), changed by mutate, as the batch ops for W(). Null when
     nothing changed. The recipe's own form, if open with changes, is not touched. */
  function patchRecipe(id, mutate) {
    var api = B(), fs;
    return api.ready().then(function () {
      fs = api.fs();
      return (api.fromServer ? api.fromServer(api.docRef('recipes', id)) : fs.getDocFromServer(api.docRef('recipes', id))).then(function (sn) { return sn.exists() ? sn.data() : null; }, function () { return 'offline'; });
    }).then(function (server) {
      var cur = server === 'offline' ? X.change(id) : server, base = X.pristine(id);
      var r = cur && cur.r && !cur.off ? clone(cur.r) : base;
      if (!r) return null;
      var was = JSON.stringify(r);
      mutate(r);
      if (JSON.stringify(r) === was && cur && !cur.off) return null;
      var t = X.tidy(r, id); if (!t) return null;
      var v = (cur ? cur.v : 0) + 1, rec = { r: t, v: v, upd: api.now(), src: cur && cur.src ? cur.src : (base ? 'book' : 'new'), base: base ? (cur && cur.base && !cur.off ? cur.base : X.fingerprint(id)) : '', removed: !!(cur && cur.removed) };
      var ops = [['set', api.docRef('recipes', id), rec]];
      if (cur && cur.v) {
        var old = {}; ['r', 'v', 'upd', 'by', 'src', 'base', 'removed', 'off'].forEach(function (k) { if (cur[k] !== undefined) old[k] = cur[k]; });
        ops.push(['set', fs.doc(api.db(), 'kitchens', api.pin(), 'recipes', id, 'hist', String(cur.v)), { was: old, at: api.now() }]);
      }
      return { ops: ops, rec: rec, v: v };
    });
  }

  /* ---------- drawing the page ---------- */
  var drawn = '';
  function draw() {
    if (window.LK_DRAW && window.LK_DRAW.open()) return;
    if (!M.root || !document.body.contains(M.root)) return;
    var keep = document.activeElement && M.root.contains(document.activeElement) ? (document.activeElement.getAttribute('data-f') || document.activeElement.getAttribute('data-mg') + ':' + (document.activeElement.getAttribute('data-i') || '')) : '';
    var y = window.scrollY;
    M.root.innerHTML = M.ed ? editorHTML() : listHTML();
    window.scrollTo(0, y);
    if (keep) {
      var el = M.root.querySelector('[data-f="' + keep + '"]') || (keep.indexOf(':') > 0 ? M.root.querySelector('[data-mg="' + keep.split(':')[0] + '"]' + (keep.split(':')[1] ? '[data-i="' + keep.split(':')[1] + '"]' : '')) : null);
      if (el && el.focus) el.focus({ preventScroll: true });
    }
  }
  /* The drawing editor (js/draw.js), the library (js/library.js, js/lib/) and the smart creator (js/smart.js) load the
     first time a drawing opens. */
  var drawLoad = null;
  function loadDraw() {
    if (window.LK_DRAW && window.LK_LIB && window.LK_LIB.items.length) return Promise.resolve();
    if (!drawLoad) {
      drawLoad = A.load('js/library.js').then(function () {
        // a category file that fails to load leaves its drawings out; the editor still opens
        return Promise.all(window.LK_LIB.files.map(function (f) { return A.load(f).catch(function () {}); }).concat([A.load('js/draw.js?v=2')]));
      }).then(function () {
        // without the smart creator the editor still works by hand; the recipe reader (js/compose.js) needs it first
        return A.load('js/smart.js').then(function () { return A.load('js/compose.js'); }).catch(function () {});
      }).catch(function (x) { drawLoad = null; throw x; });
    }
    return drawLoad;
  }
  function mountDraw(root, sub) {
    var key = sub.join('/');
    M.root = root; M.ed = null; drawn = 'draw:' + key;
    if (window.LK_DRAW) {
      if (window.LK_DRAW.api === 2) window.LK_DRAW.mount(root, sub);
      else root.innerHTML = '<div class="mg-wrap"><h2 id="rtitle" tabindex="-1">Reload the book</h2><p>The drawing editor on this device needs the current book. Your saved drawings stay.</p><div class="btn-row"><button type="button" class="btn dark" data-act="reload">Reload</button><a class="btn" href="#/manage">All recipes</a></div></div>';
      return;
    }
    root.innerHTML = '<div class="mg-wrap"><h2 id="rtitle" tabindex="-1">Opening the drawing editor</h2><p>Loading the library...</p></div>';
    loadDraw().then(function () {
      if (M.root === root && drawn === 'draw:' + key) mountDraw(root, sub);
    }, function () {
      if (M.root === root) root.innerHTML = '<div class="mg-wrap"><h2 id="rtitle" tabindex="-1">Could not open the drawing editor</h2><p>It needs the signal the first time it opens on a device. Check the signal and try again.</p><div class="btn-row"><button type="button" class="btn dark" data-act="mgretry">Try again</button></div></div>';
    });
  }
  function mount(root, route) {
    var sub = route.sub || [], key = sub.join('/');
    // Keep the last keystroke before a quick Back or another editor clears the current form.
    if (M.ed && M.ed.sub !== key && dirty()) keepNow();
    if (sub[0] === 'draw') { mountDraw(root, sub); return; }
    if (window.LK_DRAW && window.LK_DRAW.open()) window.LK_DRAW.unmount();
    if (drawn.indexOf('draw:') === 0) drawn = '';
    var fresh = M.root !== root;
    M.root = root;
    if (key !== drawn || !M.ed !== !sub.length) {
      drawn = key;
      if (!sub.length) M.ed = null;
      else if (!(M.ed && M.ed.sub === key)) { openEditor(sub); if (M.ed) M.ed.sub = key; }
      draw();
      var t = root.querySelector('#rtitle'); if (t) t.focus({ preventScroll: true });
      window.scrollTo(0, 0);
      return;
    }
    if (fresh) draw();
  }
  function unmount() {
    if (window.LK_DRAW && window.LK_DRAW.open()) window.LK_DRAW.unmount();
    if (M.ed && dirty() && M.root) { keepNow(); toast('Your changes are kept as a draft on this device.'); }
    M.root = null; drawn = ''; M.ed = null;
  }

  /* ---------- clicks, typing and dragging ---------- */
  function cycleTag(list, a) {
    list = (list || []).slice();
    var has = list.indexOf(a), may = list.indexOf(a + '?');
    if (has >= 0) { list[has] = a + '?'; }
    else if (may >= 0) { list.splice(may, 1); }
    else list.push(a);
    return list;
  }
  function move(arr, i, to) { var x = arr.splice(i, 1)[0]; arr.splice(to, 0, x); }
  document.addEventListener('click', function (ev) {
    if (!M.root || !M.root.contains(ev.target)) return;
    var el = ev.target.closest('[data-mg]');
    if (!el) return;
    var a = el.getAttribute('data-mg'), i = +el.getAttribute('data-i'), v = el.getAttribute('data-v'), e = M.ed, d = e && e.d;
    if (a === 'chip') { M.chip = v; M.more = false; draw(); return; }
    if (a === 'mine-hide') { mineHide(v); return; }
    if (a === 'more') { M.more = true; draw(); return; }
    if (!e || !d) return;
    if (a === 'goto') { ev.preventDefault(); focusId(v); return; }
    if (a === 'draw') {
      if (e.isNew || dirty()) { e.msg = 'Save the recipe first, then draw it.'; draw(); return; }
      location.hash = v.indexOf('new:') === 0 ? '#/manage/draw/new/' + encodeURIComponent(e.id) + '/' + v.slice(4) : '#/manage/draw/' + encodeURIComponent(v);
      return;
    }
    if (a === 'save') { save(false); return; }
    if (a === 'mine') { save(true); return; }
    if (a === 'theirs') {
      var c = e.conflict && e.conflict.rec;
      if (c && c.r) { e.d = clone(c.r); e.meta.v = c.v; e.meta.removed = !!c.removed; e.meta.off = !!c.off; e.handTags = !!(c.r.contains || c.r.check); }
      e.conflict = null; e.snap = snapOf(e); lsSet(draftKey(e.key), ''); draw(); return;
    }
    if (a === 'kept-use') { var k = e.kept.e; e.d = k.d; e.menu = k.menu || e.menu; e.meta = Object.assign(e.meta, { removed: !!k.meta.removed, off: !!k.meta.off }); e.handTags = !!k.handTags; if (e.isNew) { e.id = k.id || e.id; e.idTyped = !!k.idTyped; } e.kept = null; draw(); return; }
    if (a === 'kept-drop') { if (!arm('kept-drop')) return; e.kept = null; lsSet(draftKey(e.key), ''); draw(); return; }
    if (a === 'undo-all') { if (!arm('undo-all')) return; var fr = JSON.parse(e.snap); e.d = fr[0]; e.menu = fr[1]; e.meta.removed = fr[2]; e.meta.off = fr[3]; e.handTags = !!(e.d.contains || e.d.check); lsSet(draftKey(e.key), ''); draw(); return; }
    if (a === 'ing-add') { d.ingredients.push({ q: '', name: '' }); keepDraft(); draw(); var ins = M.root.querySelectorAll('[data-f$=".q"][data-f^="ing."]'); if (ins.length) ins[ins.length - 1].focus(); return; }
    if (a === 'ing-del') { d.ingredients.splice(i, 1); e.open = -1; keepDraft(); draw(); return; }
    if (a === 'ing-up') { move(d.ingredients, i, i - 1); e.open = -1; keepDraft(); draw(); return; }
    if (a === 'ing-down') { move(d.ingredients, i, i + 1); e.open = -1; keepDraft(); draw(); return; }
    if (a === 'ing-tags') { e.open = e.open === i ? -1 : i; draw(); return; }
    if (a === 'tag') {
      var w = el.getAttribute('data-w'), obj = w === 'pin' ? d.pins[i] : d.ingredients[i];
      obj.tags = cycleTag(obj.tags, v); keepDraft(); draw(); return;
    }
    if (a === 'sec-add') { d.sections = d.sections || []; d.sections.push({ title: '', steps: [] }); keepDraft(); draw(); return; }
    if (a === 'sec-del') { if (!arm('sec-del:' + i)) return; d.sections.splice(i, 1); keepDraft(); draw(); return; }
    if (a === 'sec-up') { move(d.sections, i, i - 1); keepDraft(); draw(); return; }
    if (a === 'sec-down') { move(d.sections, i, i + 1); keepDraft(); draw(); return; }
    if (a === 'hand') {
      e.handTags = v === '1';
      if (e.handTags) { var ro = A.rollFor(Object.assign(cleanRecipe(e), { contains: undefined, check: undefined })); d.contains = ro.contains.map(function (x) { return { allergen: x, from: '' }; }); d.check = ro.check.map(function (x) { return { allergen: x, from: '' }; }); }
      else { delete d.contains; delete d.check; }
      keepDraft(); draw(); return;
    }
    if (a === 'pin-add') { d.pins = d.pins || []; d.pins.push({ label: '', x: 50, y: 50, tags: [], own: true }); e.pinOpen = d.pins.length - 1; keepDraft(); draw(); return; }
    if (a === 'pin-del') { d.pins.splice(i, 1); e.pinOpen = -1; keepDraft(); draw(); return; }
    if (a === 'pin-pick') { if (dragMoved) { dragMoved = false; return; } e.pinOpen = e.pinOpen === i ? -1 : i; draw(); return; }
    if (a === 'hist') { loadHist(); return; }
    if (a === 'hist-use') { var hv = e.hist[i].rec; if (hv && hv.r) { e.d = clone(hv.r); e.handTags = !!(hv.r.contains || hv.r.check); e.meta.removed = false; e.meta.off = false; keepDraft(); draw(); toast('Version ' + hv.v + ' is in the form. Save to make it the card again.'); } return; }
    if (a === 'hide') {
      if (v === '1' && !arm('hide')) return;
      e.meta.removed = v === '1'; save(false); return;
    }
    if (a === 'off') { if (!arm('off')) return; e.meta.off = true; e.meta.removed = false; save(false); return; }
  });
  function onField(ev) {
    if (!M.root || !M.root.contains(ev.target)) return;
    var f = ev.target.getAttribute('data-f');
    if (!f) return;
    var val = ev.target.type === 'checkbox' ? ev.target.checked : ev.target.value;
    setField(f, val);
    if (f === 'q') return;
    if (M.ed) dirtyNote();
    // a change that alters what else the page shows (kind, drawing, section, links, allergens by hand): draw again
    if (ev.type === 'change' && /^(kind|art|menu\.sec|hand\.|ing\.\d+\.link|pin\.\d+\.link|pin\.\d+\.(x|y)|done)/.test(f)) draw();
  }
  document.addEventListener('input', onField);
  // the recipe link boxes: a pick from the list (or a whole name typed) links it; anything else goes back when the box is left
  document.addEventListener('change', function (ev) {
    var el = ev.target; if (!M.root || !M.root.contains(el) || !el.getAttribute('data-fl')) return;
    if (!linkPicked(el)) { el.value = linkLabel(el.getAttribute('data-id')); toast('Pick a recipe from the list, or leave it empty for no link.'); return; }
    if (M.ed) dirtyNote();
    setTimeout(draw, 0);   // the change comes as the box loses focus: redraw after that, not in the middle of it
  });
  document.addEventListener('change', function (ev) { if (ev.target.tagName === 'SELECT' || ev.target.type === 'checkbox' || /^pin\.\d+\.(x|y)$/.test(ev.target.getAttribute('data-f') || '')) onField(ev); });
  // ingredients and labels: Enter in the last box adds the next row
  document.addEventListener('keydown', function (ev) {
    if (!M.root || !M.root.contains(ev.target) || ev.key !== 'Enter') return;
    var f = ev.target.getAttribute('data-f') || '';
    if (/^ing\.\d+\.(q|name|note)$/.test(f)) { ev.preventDefault(); var nx = ev.target.parentNode.parentNode.querySelector('[data-f$=".note"]'); if (/\.note$/.test(f) || !nx) { var b = M.root.querySelector('[data-mg="ing-add"]'); if (b) b.click(); } else if (/\.q$/.test(f)) ev.target.nextElementSibling.focus(); else nx.focus(); }
  });
  /* Dragging a plate label (mouse, finger or pen): the number follows, and lets go where the part sits. */
  var drag = null, dragMoved = false;
  document.addEventListener('pointerdown', function (ev) {
    var pin = ev.target.closest && ev.target.closest('.mg-pin');
    if (!pin || !M.root || !M.root.contains(pin)) return;
    var stage = pin.parentNode, r = stage.getBoundingClientRect();
    drag = { pin: pin, i: +pin.getAttribute('data-i'), r: r, x0: ev.clientX, y0: ev.clientY, id: ev.pointerId };
    dragMoved = false;
    try { pin.setPointerCapture(ev.pointerId); } catch (x) {}
  });
  document.addEventListener('pointermove', function (ev) {
    if (!drag || ev.pointerId !== drag.id) return;
    if (Math.abs(ev.clientX - drag.x0) + Math.abs(ev.clientY - drag.y0) < 4 && !dragMoved) return;
    dragMoved = true; ev.preventDefault();
    var x = Math.max(0, Math.min(100, (ev.clientX - drag.r.left) / drag.r.width * 100)), y = Math.max(0, Math.min(100, (ev.clientY - drag.r.top) / drag.r.height * 100));
    drag.pin.style.left = x + '%'; drag.pin.style.top = y + '%';
    drag.x = Math.round(x * 10) / 10; drag.y = Math.round(y * 10) / 10;
  });
  function dragEnd(ev) {
    if (!drag || ev.pointerId !== drag.id) return;
    var dd = drag; drag = null;
    if (!dragMoved || !M.ed) return;
    var p = M.ed.d.pins[dd.i]; p.x = dd.x; p.y = dd.y; p.own = true; keepDraft();
    M.ed.pinOpen = dd.i; draw();
    setTimeout(function () { dragMoved = false; }, 0);
  }
  document.addEventListener('pointerup', dragEnd);
  document.addEventListener('pointercancel', dragEnd);
  window.addEventListener('beforeunload', function (ev) { if (dirty()) { ev.preventDefault(); ev.returnValue = ''; } });

  window.LK_MG = {
    api: API,
    mount: mount,
    unmount: unmount,
    open: function () { return !!(M.root && (M.ed || (window.LK_DRAW && window.LK_DRAW.open()))); },
    dirty: function () { return dirty() || !!(window.LK_DRAW && window.LK_DRAW.dirty()); },
    patchRecipe: patchRecipe,
    hasDraft: function () { return Object.keys(LS || {}).some(function (k) { return k.indexOf('lk.mg.draft.') === 0 || k.indexOf('lk.dw.draft.') === 0; }); },
    // new recipe changes came in from another device: the list shows them; an open form keeps what is typed. A form
    // nobody has typed in yet opens again from the new copy (the book often arrives just after the form opened)
    changed: function () {
      if (!M.root || (window.LK_DRAW && window.LK_DRAW.open())) return;
      var e = M.ed;
      if (!e) { draw(); return; }
      if (!e.d || e.isNew || e.kept || snapOf(e) !== e.snap || stampOf(e.id) === e.stamp) return;
      var key = e.sub; openEditor(['r', e.id]); if (M.ed) M.ed.sub = key; draw();
    }
  };
})();
