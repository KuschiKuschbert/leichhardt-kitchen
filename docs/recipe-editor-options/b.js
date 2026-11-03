/* B. Edit on the card (3 Nov 2026, example only).
   The editor is the card staff see. In Edit, every block is a button: the title, the plate and its labels, the
   allergens, each ingredient line, the build, each method section and the boxes. Its fields open in a sheet (a drawer on
   a computer) and the card changes as you type. Preview shows the card with no pencils. The plate opens in a
   full-screen studio: canvas first, one dock at the thumb, a small bar beside the picked part. Nothing is saved. */
(function () {
  'use strict';
  var R = window.RX, esc = R.esc, ART = R.ART;
  var S = { view: 'card', mode: 'edit', r: R.start(), o: null, armed: '', errs: [], ing: -1, d: R.drawing('Chicken Burger, on the plate'), panel: '', q: '', slot: 'plate' };
  S.o = R.clone(S.r);
  var root, studio = null;
  var LINKS = [['', 'No link'], ['ranch', 'Ranch (recipe 80)'], ['aioli', 'Aioli (recipe 41)'], ['slaw', 'New Slaw (card 12)'], ['gravy', 'Gravy (recipe 22)']];
  var PEN = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l4-1 11-11-3-3L5 16l-1 4z"/></svg>';
  var I = {
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/></svg>',
    add: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    plate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/></svg>',
    label: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l4 4 10-10"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>'
  };
  function ch() { return R.changed(S.r, S.o); }
  function pen(t) { return '<span class="b-pen" aria-hidden="true">' + PEN + (t || 'Change') + '</span>'; }

  /* ---------- the card ---------- */
  function cardHTML() {
    var r = S.r, c = ch(), al = R.allergens(r), ed = S.mode === 'edit';
    var title = '<button type="button" class="b-ed' + (c.card ? ' changed' : '') + '" data-b="title" aria-label="Change the name, card number, kind and portion line"' + (ed ? '' : ' tabindex="-1"') + '>' + pen() +
      '<div class="b-title"><p class="eyebrow">' + esc((ART.kinds[r.kind] || '') + ' · ' + r.forLine) + '</p><h1 id="b-title">' + esc(r.name || 'Unnamed recipe') + '</h1><p class="hint">' + esc(r.yield) + '</p><span class="no">' + esc(r.no) + '</span></div></button>';
    var plate = '<div class="b-plate-col"><button type="button" class="b-ed' + (c.draw ? ' changed' : '') + '" data-b="studio" aria-label="Change the plate drawing and its labels"' + (ed ? '' : ' tabindex="-1"') + '>' + pen('Open the plate studio') +
      '<div class="b-plate"><div class="pic">' + ART.card + '</div>' + r.pins.map(function (p) { return '<span class="b-pin" style="left:' + p.x + '%;top:' + p.y + '%">' + esc(p.label) + '</span>'; }).join('') + '</div></button>' +
      '<p class="hint" style="text-align:center;margin-top:.5rem">' + (ed ? 'Tap the plate to move parts, change the servingware or fix a label.' : 'Tap anything on the plate. A pin with an arrow opens its own recipe.') + '</p></div>';
    var alg = '<button type="button" class="b-ed' + (c.alg ? ' changed' : '') + '" data-b="alg" aria-label="Change the allergens"' + (ed ? '' : ' tabindex="-1"') + '>' + pen() + '<div class="b-alg"><div class="b-h"><span>Allergens</span><span class="hint" style="text-transform:none;font:400 .82rem var(--body)">? = may be in it, check the supplier label</span></div><div class="b-alg-list">' +
      (al.length ? al.map(function (x) { return '<div>' + R.tagsHTML([x]) + '<span>' + esc(x.from || '') + '</span></div>'; }).join('') : '<span class="hint">No allergens</span>') + '</div></div></button>';
    var ings = '<div><h2 class="b-h"><span>Everything on it</span>' + (ed ? '<button type="button" class="btn quiet small" data-b="scale">Scale amounts</button>' : '') + '</h2><table class="b-table"><tbody>' + r.ingredients.map(function (i, k) {
      var changed = JSON.stringify(i) !== JSON.stringify(S.o.ingredients[k]);
      return '<tr class="b-row"' + (changed && ed ? ' style="box-shadow:inset 4px 0 0 var(--accent)"' : '') + '><td colspan="2"><button type="button" class="b-rowbtn" data-b="ing" data-i="' + k + '"' + (ed ? '' : ' tabindex="-1"') + ' aria-label="' + esc('Change ingredient ' + (k + 1) + ': ' + (i.q ? i.q + ' ' : '') + (i.name || 'no name')) + '"><table style="width:100%;border-collapse:collapse"><tr><td style="padding:0;width:32%;font-weight:700">' + esc(i.q) + '</td><td style="padding:0">' +
        (i.link ? '<u style="text-decoration-color:var(--accent);text-underline-offset:4px">' + esc(i.name) + '</u> <span class="tag link">RECIPE</span>' : esc(i.name || 'No name yet')) + (i.note ? '<span class="note">' + esc(i.note) + '</span>' : '') + '</td></tr></table></button></td></tr>';
    }).join('') + '</tbody></table><button type="button" class="b-add" data-b="ing-add" style="margin-top:.5rem">+ Add an ingredient</button></div>';
    var build = '<button type="button" class="b-ed" data-b="studio-build" aria-label="Change the build drawing"' + (ed ? '' : ' tabindex="-1"') + '>' + pen('Open in the studio') + '<h2 class="b-h">Build, top to bottom</h2><svg viewBox="' + ART.build.vb + '" style="max-width:420px">' + ART.build.body + '</svg></button>';
    var method = r.sections.map(function (s, k) {
      var changed = JSON.stringify(s) !== JSON.stringify(S.o.sections[k]);
      return '<button type="button" class="b-ed' + (changed ? ' changed' : '') + '" data-b="sec" data-i="' + k + '" aria-label="Change the method section ' + esc(s.title || (k + 1)) + '"' + (ed ? '' : ' tabindex="-1"') + '>' + pen() + '<h2 class="b-h">' + esc(s.title || 'Method') + '</h2><ol class="b-steps">' + s.steps.filter(Boolean).map(function (t) { return '<li><span>' + esc(t) + '</span></li>'; }).join('') + '</ol></button>';
    }).join('') + '<button type="button" class="b-add" data-b="sec-add">+ Add a method section</button>';
    var boxes = ['tip', 'safety'].map(function (k) {
      var b = r[k];
      if (b.text) return '<button type="button" class="b-ed" data-b="box" data-v="' + k + '"' + (ed ? '' : ' tabindex="-1"') + '>' + pen() + '<div class="b-box' + (k === 'safety' ? ' safety' : '') + '"><span class="label">' + esc(b.title || (k === 'tip' ? 'Tip' : 'Safety')) + '</span><p>' + esc(b.text) + '</p></div></button>';
      return '<button type="button" class="b-add" data-b="box" data-v="' + k + '">+ Add a ' + (k === 'tip' ? 'tip' : 'safety') + ' box</button>';
    }).join('');
    var behind = '<section class="b-behind" aria-labelledby="b-behind-h"><div class="b-h"><span id="b-behind-h">Behind the card</span><button type="button" class="btn small" data-b="settings">Change</button></div><ul>' +
      '<li><span>Show in the book</span><span>' + (r.show ? 'Shown' : 'Hidden') + '</span></li><li><span>Special</span><span>' + (r.special ? 'Yes' : 'No') + '</span></li>' +
      '<li><span>Guest menu</span><span>' + esc(r.menuSec) + ', after ' + esc(r.after) + '</span></li><li><span>Name in AVC Live</span><span>' + esc(r.avc || 'None') + '</span></li>' +
      '<li><span>Short name, other names</span><span>' + esc([r.short, r.aka].filter(Boolean).join(', ') || 'None') + '</span></li><li><span>Earlier versions</span><span>Version 3, 28 Oct 21:40</span></li></ul></section>';
    var errs = S.errs.length ? '<div class="b-errs" role="alert"><span class="label">Not saved yet</span><ul>' + S.errs.map(function (e) { return '<li><button type="button" data-b="' + e.b + '"' + (e.i != null ? ' data-i="' + e.i + '"' : '') + '>' + esc(e.msg) + '</button></li>'; }).join('') + '</ul></div>' : '';
    return errs + '<div class="b-card"><div class="b-left">' + (window.innerWidth >= 900 ? plate : '') + '</div><div style="display:grid;gap:1.5rem;min-width:0">' + title + (window.innerWidth < 900 ? plate : '') + alg + ings + build + method + boxes + behind +
      '<p class="b-foot">Cook as written. Check with the head chef or sous chef before changing anything. Allergens are worked out from the ingredients. Always check the supplier labels before answering a guest.</p></div></div>';
  }
  function barHTML() {
    var n = R.changeCount(S.r, S.o);
    return '<div class="b-bar"><button type="button" class="b-crumb" data-b="to-list" aria-label="Back to Recipes and drawings">' + R.BACK + '</button><div class="b-what"><b>' + esc(S.r.name || 'Unnamed recipe') + '</b><small role="status">' + (n ? '<span class="dot"></span>' + n + (n === 1 ? ' change' : ' changes') + ', kept on this device' : 'Changed here, version 3') + '</small></div>' +
      '<div class="b-acts"><span class="seg" role="group" aria-label="Show"><button type="button" data-b="mode" data-v="edit" aria-pressed="' + (S.mode === 'edit') + '">Edit</button><button type="button" data-b="mode" data-v="preview" aria-pressed="' + (S.mode === 'preview') + '">Preview</button></span>' +
      '<button type="button" class="btn primary" data-b="save"' + (n ? '' : ' disabled') + '>Save</button></div></div>';
  }
  function listHTML() {
    return '<div class="b-wrap"><div class="b-bar"><div class="b-what"><b>Recipes and drawings</b><small>Tap a card to change it</small></div><button type="button" class="btn primary" data-b="new">New recipe</button></div>' +
      '<div class="b-dockets"><button type="button" class="b-docket"><b>1</b><span>Not saved yet</span></button><button type="button" class="b-docket"><b>3</b><span>Cards to come</span></button><button type="button" class="b-docket"><b>1</b><span>Book file changed</span></button><button type="button" class="b-docket"><b>14</b><span>Drawings and templates</span></button></div>' +
      '<label class="field"><span>Find a recipe</span><input class="in" type="search" data-bq="1" value="' + esc(S.q) + '" placeholder="Name, card number or ingredient"></label><div style="height:.8rem"></div>' +
      '<div class="b-tiles">' + ART.rows.filter(function (x) { return !S.q || x.name.toLowerCase().indexOf(S.q.toLowerCase()) >= 0; }).map(function (x) { return '<button type="button" class="b-tile" data-b="open" data-v="' + esc(x.id) + '"><span class="thumb">' + x.svg + '</span><b>' + esc(x.name) + '</b><small>Card ' + esc(x.no || '-') + ' · ' + esc(ART.kinds[x.kind] || '') + '</small>' + (x.id === 'burger' ? '<span><span class="tag maybe">Not saved yet</span></span>' : '') + '</button>'; }).join('') + '</div></div>';
  }
  function paint(focusSel) {
    document.body.classList.toggle('editing', S.mode === 'edit' && S.view === 'card');
    root.innerHTML = S.view === 'list' ? listHTML() : '<div class="b-wrap">' + barHTML() + cardHTML() + '</div>';
    if (focusSel) { var f = R.$(focusSel); if (f) f.focus(); }
  }

  /* ---------- the sheets ---------- */
  function head(t) { return '<div class="sheet-head"><h2 id="sheet-h">' + t + '</h2><button type="button" class="btn small" data-b="sheet-done">Done</button></div>'; }
  function fld(k, label, v, o) { o = o || {}; return '<label class="field"><span>' + label + '</span>' + (o.area ? '<textarea class="in" rows="' + (o.rows || 3) + '" data-bf="' + k + '"' + (o.af ? ' autofocus' : '') + '>' + esc(v) + '</textarea>' : '<input class="in" data-bf="' + k + '" value="' + esc(v) + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + (o.af ? ' autofocus' : '') + '>') + (o.hint ? '<span class="hint">' + o.hint + '</span>' : '') + '</label>'; }
  function titleSheet() {
    var r = S.r;
    R.sheet(head('The card') + fld('name', 'Name staff see', r.name, { af: true }) + '<div class="row2">' + fld('no', 'Card number', r.no) + '<label class="field"><span>Kind</span><select class="in" data-bf="kind">' + Object.keys(ART.kinds).map(function (k) { return '<option value="' + k + '"' + (r.kind === k ? ' selected' : '') + '>' + esc(ART.kinds[k]) + '</option>'; }).join('') + '</select></label></div>' +
      fld('forLine', 'Where it belongs', r.forLine) + fld('yield', 'Portion or batch line', r.yield), { side: true, onClose: function () { paint('[data-b="title"]'); } });
  }
  function ingSheet(k) {
    var r = S.r, i = r.ingredients[k], n = r.ingredients.length; S.ing = k;
    var tags = i.link ? '<p class="hint">Linked: its allergens come from its own recipe.</p>' : '<div class="field"><span>Allergens</span><div class="b-tags" role="group" aria-label="Allergens in this ingredient">' + ART.allergens.map(function (a) {
      var st = i.tags.indexOf(a) >= 0 ? 'has' : i.tags.indexOf(a + '?') >= 0 ? 'may' : '';
      return '<button type="button" class="chip' + (st === 'may' ? ' may' : '') + '" data-b="tag" data-v="' + esc(a) + '" aria-pressed="' + !!st + '">' + esc(a) + (st === 'may' ? '?' : '') + '</button>';
    }).join('') + '</div><span class="hint">Tap once: has it. Twice: may have it. Three times: not in it.</span></div>';
    var el = R.sheet(head('Ingredient ' + (k + 1) + ' of ' + n) +
      '<div class="row2" style="grid-template-columns:7rem minmax(0,1fr)">' + fld('ing.q', 'Amount', i.q, { af: true }) + fld('ing.name', 'Ingredient', i.name) + '</div>' + fld('ing.note', 'Note', i.note, { ph: 'For example: bought in, 170 g' }) +
      '<label class="field"><span>Recipe link</span><select class="in" data-bf="ing.link">' + LINKS.map(function (l) { return '<option value="' + l[0] + '"' + (l[0] === i.link ? ' selected' : '') + '>' + esc(l[1]) + '</option>'; }).join('') + '</select></label>' + tags +
      '<div class="a-tools" style="display:flex;flex-wrap:wrap;gap:.4rem">' + (k ? '<button type="button" class="btn small" data-b="ing-up">Move up</button>' : '') + (k < n - 1 ? '<button type="button" class="btn small" data-b="ing-down">Move down</button>' : '') +
      '<button type="button" class="btn danger small' + (S.armed === 'del' ? ' armed' : '') + '" data-b="ing-del">' + (S.armed === 'del' ? 'Tap again to remove' : 'Remove') + '</button></div>' +
      '<div class="sheet-foot"><button type="button" class="btn small" data-b="ing-prev"' + (k ? '' : ' disabled') + '>Previous</button><button type="button" class="btn small" data-b="ing-next"' + (k < n - 1 ? '' : ' disabled') + '>Next ingredient</button></div>', { side: true, onClose: function () { S.armed = ''; paint('[data-b="ing"][data-i="' + S.ing + '"]'); } });
    return el;
  }
  function algSheet() {
    var r = S.r;
    var body = r.hand ? '<div class="b-algs">' + ART.allergens.map(function (a) {
      var has = (r.contains || []).filter(function (x) { return x.allergen === a; })[0], may = (r.check || []).filter(function (x) { return x.allergen === a; })[0], cur = has ? 'has' : may ? 'may' : '';
      return '<div><b>' + esc(a) + '</b><span class="seg">' + [['', 'Not in it'], ['has', 'Has it'], ['may', 'May have it']].map(function (o) { return '<button type="button" data-b="hand-set" data-v="' + esc(a) + '|' + o[0] + '" aria-pressed="' + (cur === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</span>' +
        (cur ? '<input class="in" data-bf="hfrom.' + esc(a) + '" value="' + esc((has || may).from) + '" placeholder="From which part" aria-label="' + esc(a) + ' comes from">' : '') + '</div>';
    }).join('') + '</div>' : '<p class="hint">Worked out from the allergens on each ingredient. Tap an ingredient line on the card to change them.</p>';
    R.sheet(head('Allergens') + '<span class="seg" role="group" aria-label="How the allergens are set"><button type="button" data-b="hand" data-v="0" aria-pressed="' + !r.hand + '">Worked out</button><button type="button" data-b="hand" data-v="1" aria-pressed="' + r.hand + '">Set by hand</button></span>' + body +
      fld('labelNote', 'Label note (optional)', r.labelNote, { ph: 'For example: check the bun label for sesame' }), { side: true, onClose: function () { paint('[data-b="alg"]'); } });
  }
  function secSheet(k) {
    var s = S.r.sections[k], n = S.r.sections.length;
    R.sheet(head('Method section') + fld('sec.' + k + '.title', 'Section title', s.title) + fld('sec.' + k + '.steps', 'Steps, one per line', s.steps.join('\n'), { area: true, rows: Math.max(4, s.steps.length + 1), af: true }) +
      '<div style="display:flex;flex-wrap:wrap;gap:.4rem">' + (k ? '<button type="button" class="btn small" data-b="sec-up" data-i="' + k + '">Move up</button>' : '') + (k < n - 1 ? '<button type="button" class="btn small" data-b="sec-down" data-i="' + k + '">Move down</button>' : '') +
      '<button type="button" class="btn danger small' + (S.armed === 'sdel' ? ' armed' : '') + '" data-b="sec-del" data-i="' + k + '">' + (S.armed === 'sdel' ? 'Tap again to remove' : 'Remove this section') + '</button></div>', { side: true, onClose: function () { S.armed = ''; paint(); } });
  }
  function boxSheet(k) {
    var b = S.r[k];
    R.sheet(head(k === 'tip' ? 'Tip box' : 'Safety box (orange)') + fld(k + '.title', 'Title', b.title, { ph: k === 'tip' ? 'iCombi' : 'Hot oil', af: true }) + fld(k + '.text', 'Words', b.text, { area: true }), { side: true, onClose: function () { paint(); } });
  }
  function settingsSheet() {
    var r = S.r, sw = function (a, on, t, sub) { return '<button type="button" class="switch" role="switch" aria-checked="' + on + '" data-b="' + a + '"><span><b>' + t + '</b><small>' + sub + '</small></span><i aria-hidden="true"></i></button>'; };
    R.sheet(head('Behind the card') + sw('sw-show', r.show, 'Show in the book', r.show ? 'Staff see this recipe.' : 'Hidden. Kept, and can be shown again.') + sw('sw-special', r.special, 'Special', r.special ? 'First on the Pass and Tiles.' : 'Not a special.') +
      '<label class="switch" style="cursor:pointer"><span><b>Finished</b><small>The card and its drawings are 100% done (green frame).</small></span><input type="checkbox" data-bf="done"' + (r.done ? ' checked' : '') + ' style="width:22px;height:22px"></label>' +
      '<div class="row2"><label class="field"><span>Guest menu section</span><select class="in" data-bf="menuSec"><option>Not on the guest menu</option><option selected>Hand Held</option><option>Specials</option></select></label><label class="field"><span>Comes after</span><select class="in" data-bf="after"><option>First in the section</option><option selected>Chickpea Mushroom Burger</option><option>Last in the section</option></select></label></div>' +
      fld('menu', 'How the guest menu describes it', r.menu, { area: true, rows: 2 }) + fld('short', 'Short name on prep lines', r.short) + fld('avc', 'Name in AVC Live', r.avc, { hint: 'So a search for the AVC name finds the card. No prices or codes here.' }) + fld('aka', 'Other names staff search for', r.aka) +
      '<div class="field"><span>Earlier versions</span><div style="display:flex;flex-wrap:wrap;gap:.4rem"><button type="button" class="btn small" data-b="toast" data-v="Version 2 is on the card in Edit. Save to make it the card again.">Open version 2</button><button type="button" class="btn small" data-b="toast" data-v="The book file\'s copy is on the card in Edit (example only)">Go back to the book file\'s copy</button></div></div>',
      { side: true, onClose: function () { paint('[data-b="settings"]'); } });
  }
  function setPath(path, v) {
    var r = S.r, p = path.split('.');
    if (p[0] === 'ing') r.ingredients[S.ing][p[1]] = v;
    else if (p[0] === 'sec') { if (p[2] === 'steps') r.sections[+p[1]].steps = v.split('\n'); else r.sections[+p[1]].title = v; }
    else if (p[0] === 'hfrom') ['contains', 'check'].forEach(function (k) { (r[k] || []).forEach(function (x) { if (x.allergen === p[1]) x.from = v; }); });
    else if (p[0] === 'tip' || p[0] === 'safety') r[p[0]][p[1]] = v;
    else r[p[0]] = v;
  }

  /* ---------- the plate studio ---------- */
  function studioOpen(slot) {
    S.view = 'studio'; S.slot = slot || 'plate'; S.d.sel = -1;
    studio = document.createElement('div'); studio.className = 'st'; studio.setAttribute('role', 'dialog'); studio.setAttribute('aria-modal', 'true'); studio.setAttribute('aria-labelledby', 'st-h');
    document.body.appendChild(studio); document.body.classList.add('in-studio'); document.body.style.overflow = 'hidden';
    stPaint('#st-close');
    if (slot === 'build') R.toast('The build opens the same way (example shows the plate)');
  }
  function stClose() {
    R.closeSheet(true); if (studio) studio.remove(); studio = null; document.body.classList.remove('in-studio'); document.body.style.overflow = '';
    S.view = 'card'; paint('[data-b="studio"]'); if (S.d.dirty) R.toast('The drawing is kept on this device until you save it.');
  }
  function stPaint(focusSel) {
    var d = S.d, p = d.parts[d.sel], miss = R.missing(S.r, d);
    studio.classList.toggle('drawer', !!S.panel && window.innerWidth >= 900);
    var dock = [['sm-draw', d.parts.length ? 'Draw again' : 'Draw for me', I.spark, 1], ['add', 'Add', I.add], ['plate', 'Plate', I.plate], ['labels', 'Labels', I.label], ['check', 'Check' + (miss.length ? ' (' + miss.length + ')' : ''), I.check], ['more', 'More', I.more]];
    studio.innerHTML = '<div class="st-top"><button type="button" class="btn" id="st-close" data-b="st-close">Close</button><div class="st-title"><b id="st-h">' + ({ plate: 'On the plate', side: 'From the side', build: 'Build' })[S.slot] + '</b><button type="button" data-b="st-slot">Chicken Burger · other drawings</button></div>' +
      '<button type="button" class="btn" data-b="st-undo"' + (d.undo.length ? '' : ' disabled') + ' aria-label="Undo">Undo</button><button type="button" class="btn primary" data-b="st-save"' + (d.dirty ? '' : ' disabled') + '>Save</button></div>' +
      '<div class="st-stage"><div class="cv" id="st-cv">' + R.canvasSVG(d, { pins: S.panel === 'labels' }) + '</div>' +
      '<p class="st-hint" role="status">' + (p ? 'Drag to move. Arrow keys nudge it.' : d.parts.length + ' parts. Tap one to change it.') + '</p>' +
      (p ? '<div class="st-float" role="toolbar" aria-label="' + esc(R.nameOf(p)) + '"><button type="button" data-b="pt-swap">Swap</button><button type="button" data-b="pt-colour">Colour</button><button type="button" data-b="pt-label">' + (p.ing ? 'Label: ' + esc(p.ing) : 'Label') + '</button><button type="button" data-b="pt-more" aria-label="More for this part">More</button><button type="button" class="del" data-b="pt-del">Delete</button></div>' : '') +
      '<nav class="st-dock" aria-label="Studio">' + dock.map(function (b) { return '<button type="button" data-b="dock" data-v="' + b[0] + '"' + (b[3] ? ' class="hero"' : '') + (b[3] ? '' : ' aria-expanded="' + (S.panel === b[0]) + '"') + '>' + b[2] + '<span>' + b[1] + '</span></button>'; }).join('') + '</nav></div>';
    var host = R.$('#st-cv', studio);
    R.bindCanvas(host, d, function (k) { stPaint(k ? '#st-cv svg' : null); });
    placeFloat();
    if (focusSel) { var f = R.$(focusSel, studio); if (f) f.focus(); }
  }
  function placeFloat() {   // the part's own bar sits just above it, or below when there is no room
    var fl = R.$('.st-float', studio), d = S.d; if (!fl || d.sel < 0) return;
    var g = R.$('[data-part="' + d.sel + '"]', studio), st = R.$('.st-stage', studio); if (!g || !st) return;
    var b = g.getBoundingClientRect(), s = st.getBoundingClientRect(), h = fl.offsetHeight, w = fl.offsetWidth;
    var top = b.top - s.top - h - 10; if (top < 8) top = b.bottom - s.top + 10;
    var left = Math.max(w / 2 + 8, Math.min(s.width - w / 2 - 8, b.left - s.left + b.width / 2));
    fl.style.top = top + 'px'; fl.style.left = left + 'px';
  }
  function panel(k) {
    var d = S.d, miss = R.missing(S.r, d), close = function () { S.panel = ''; if (studio) stPaint('[data-b="dock"][data-v="' + k + '"]'); };
    S.panel = k; stPaint();
    if (k === 'add') R.sheet(head('Add from the library') + (miss.length ? '<div class="s-miss" style="display:grid;gap:.4rem;padding:.6rem .7rem;background:var(--hit);border-radius:8px"><span class="label">In this recipe, not on the plate yet</span><div style="display:flex;flex-wrap:wrap;gap:.4rem">' + miss.map(function (m) { return '<button type="button" class="chip" data-b="addmiss" data-v="' + esc(m) + '">+ ' + esc(m) + '</button>'; }).join('') + '</div></div>' : '') +
      '<label class="field"><span>Find a drawing</span><input class="in" type="search" data-bsq="1" placeholder="For example: chips, lemon wedge" autofocus></label><div id="st-lib">' + R.libTiles('') + '</div><button type="button" class="btn quiet small" data-b="toast" data-v="Choose an SVG file: plain shapes only, 100 kB at most">Import a drawing (SVG)</button>', { side: true, onClose: close });
    else if (k === 'plate') R.sheet(head('Plate, bowl or board') + '<p class="hint">Swap what the food sits on. The food stays where it is.</p><div class="lib">' + [['Dinner plate', '<circle r="40" fill="#fff" stroke="#c9c4ba" stroke-width="2"/><circle r="30" fill="none" stroke="#e8e4dc"/>'], ['Side plate', '<circle r="28" fill="#fff" stroke="#c9c4ba" stroke-width="2"/>'], ['Pasta bowl', '<circle r="38" fill="#fff" stroke="#c9c4ba" stroke-width="2"/><circle r="22" fill="#f1eee8"/>'], ['Board', '<rect x="-42" y="-28" width="84" height="56" rx="6" fill="#d9b48a" stroke="#a9835a" stroke-width="2"/>'], ['Skillet', '<circle r="34" fill="#3a3a3a"/><rect x="30" y="-5" width="16" height="10" rx="3" fill="#3a3a3a"/>']].map(function (w, n) { return '<button type="button" class="tile" data-b="toast" data-v="' + w[0] + ' (example only)"' + (n ? '' : ' style="border-color:var(--ink)" autofocus') + '><svg viewBox="-48 -48 96 96">' + w[1] + '</svg><span>' + w[0] + '</span></button>'; }).join('') + '</div>' +
      '<div class="row2"><label class="field"><span>Size (cm)</span><select class="in"><option>27</option><option selected>30</option></select></label><label class="field"><span>Rim</span><select class="in"><option selected>Wide</option><option>Narrow</option></select></label></div><label class="hint" style="display:flex;gap:.5rem;align-items:center"><input type="checkbox" checked style="width:20px;height:20px"> Fit the food to a new size</label><button type="button" class="btn small" data-b="toast" data-v="Servingware saved for other drawings (example only)">Save this servingware</button>', { side: true, onClose: close });
    else if (k === 'labels') R.sheet(head('Labels on the Pass') + '<p class="hint">The numbers on the plate match this list. Each label shows its ingredient\'s amount, note and allergens.</p>' + d.parts.map(function (q, n) {
      return '<label class="field"><span>Label ' + (n + 1) + '</span><select class="in" data-blab="' + n + '"' + (n ? '' : ' autofocus') + '><option value="">No label</option>' + S.r.ingredients.map(function (i) { return '<option' + (q.ing === i.name ? ' selected' : '') + '>' + esc(i.name) + '</option>'; }).join('') + '</select></label>';
    }).join('') + '<button type="button" class="btn small" data-b="toast" data-v="Every part labelled from the recipe (example only)">Label everything</button>', { side: true, onClose: close });
    else if (k === 'check') R.sheet(head('Check the drawing') + (miss.length ? '<ul>' + miss.map(function (m) { return '<li>' + esc(m) + ' is in the recipe, not on the plate. <button type="button" class="btn quiet small" data-b="addmiss" data-v="' + esc(m) + '">Add it</button></li>'; }).join('') + '</ul>' : '<p><b>All good.</b> Every ingredient is on it, every part has its label and sits on the plate.</p>'), { side: true, onClose: close });
    else if (k === 'more') R.sheet(head('More tools') + '<span class="label">Draw</span><div class="st-more">' + ['Text', 'Line', 'Arrow', 'Box', 'Oval'].map(function (t, n) { return '<button type="button" class="btn small" data-b="toast" data-v="' + t + ': tap the plate where it goes"' + (n ? '' : ' autofocus') + '>' + t + '</button>'; }).join('') + '</div>' +
      '<span class="label">Lay out</span><div class="st-more"><button type="button" class="btn small" data-b="layout">Another layout</button><button type="button" class="btn small" data-b="toast" data-v="Tidied up">Tidy up</button><button type="button" class="btn small" data-b="toast" data-v="Plating style: side by side, stacked, scattered (example only)">Plating style</button><button type="button" class="btn small" data-b="toast" data-v="Snap to centre off">Snap to centre</button><button type="button" class="btn small" data-b="toast" data-v="Pick several: tap each part">Pick several</button><button type="button" class="btn small" data-b="toast" data-v="Parts list, back to front (example only)">Parts list</button></div>' +
      '<span class="label">Keep and reuse</span><div class="st-more"><button type="button" class="btn small" data-b="toast" data-v="Saved as a template (example only)">Save as a template</button><button type="button" class="btn small" data-b="toast" data-v="Pick the recipe to copy this to (example only)">Use for another recipe</button><button type="button" class="btn small" data-b="st-redo"' + (d.redo.length ? '' : ' disabled') + '>Redo</button><button type="button" class="btn small" data-b="toast" data-v="Zoomed to fit">Zoom to fit</button></div>', { side: true, onClose: close });
  }

  function act(a, v, i, el) {
    var r = S.r, d = S.d;
    switch (a) {
      case 'nav-back': if (S.view === 'card') { S.view = 'list'; paint(); } return;
      case 'to-list': S.view = 'list'; paint(); scrollTo(0, 0); return;
      case 'open': case 'new': S.view = 'card'; paint('#b-title'); scrollTo(0, 0); if (a === 'new') R.toast('A new recipe opens as an empty card (example shows the burger)'); return;
      case 'mode': S.mode = v; paint('[data-b="mode"][data-v="' + v + '"]'); return;
      case 'title': if (S.mode === 'edit') titleSheet(); return;
      case 'alg': if (S.mode === 'edit') algSheet(); return;
      case 'ing': if (S.mode === 'edit') ingSheet(i); return;
      case 'ing-add': r.ingredients.push({ q: '', name: '', note: '', link: '', tags: [] }); paint(); ingSheet(r.ingredients.length - 1); return;
      case 'ing-prev': R.closeSheet(true); ingSheet(S.ing - 1); return;
      case 'ing-next': R.closeSheet(true); ingSheet(S.ing + 1); return;
      case 'ing-up': case 'ing-down': var j = a === 'ing-up' ? S.ing - 1 : S.ing + 1, l = r.ingredients, x = l[S.ing]; l[S.ing] = l[j]; l[j] = x; R.closeSheet(true); paint(); ingSheet(j); R.$('[data-b="' + a + '"]') && R.$('[data-b="' + a + '"]').focus(); return;
      case 'ing-del': if (S.armed !== 'del') { S.armed = 'del'; R.closeSheet(true); ingSheet(S.ing); R.$('[data-b="ing-del"]').focus(); return; } S.armed = ''; r.ingredients.splice(S.ing, 1); R.closeSheet(true); paint(); R.toast('Ingredient removed. Undo all brings it back until you save.'); return;
      case 'tag': var t = r.ingredients[S.ing].tags, has = t.indexOf(v), may = t.indexOf(v + '?');
        if (has >= 0) t.splice(has, 1, v + '?'); else if (may >= 0) t.splice(may, 1); else t.push(v);
        R.closeSheet(true); paint(); ingSheet(S.ing); R.$('[data-b="tag"][data-v="' + v + '"]').focus(); return;
      case 'hand': r.hand = v === '1'; if (r.hand && !r.contains) { r.contains = []; r.check = []; } R.closeSheet(true); paint(); algSheet(); R.$('[data-b="hand"][data-v="' + v + '"]').focus(); return;
      case 'hand-set': var pa = v.split('|'), al = pa[0], st = pa[1], from = ''; ['contains', 'check'].forEach(function (k) { r[k] = (r[k] || []).filter(function (y) { if (y.allergen === al) from = y.from; return y.allergen !== al; }); });
        if (st === 'has') r.contains.push({ allergen: al, from: from }); if (st === 'may') r.check.push({ allergen: al, from: from }); R.closeSheet(true); paint(); algSheet(); R.$('[data-b="hand-set"][data-v="' + v + '"]').focus(); return;
      case 'sec': if (S.mode === 'edit') secSheet(i); return;
      case 'sec-add': r.sections.push({ title: 'New section', steps: [] }); paint(); secSheet(r.sections.length - 1); return;
      case 'sec-up': case 'sec-down': var sj = a === 'sec-up' ? i - 1 : i + 1, sl = r.sections, sx = sl[i]; sl[i] = sl[sj]; sl[sj] = sx; R.closeSheet(true); paint(); secSheet(sj); return;
      case 'sec-del': if (S.armed !== 'sdel') { S.armed = 'sdel'; R.closeSheet(true); secSheet(i); R.$('[data-b="sec-del"]').focus(); return; } S.armed = ''; r.sections.splice(i, 1); R.closeSheet(true); paint(); return;
      case 'box': boxSheet(v); return;
      case 'scale': R.sheet(head('Scale amounts') + '<label class="field"><span>Multiply amounts by</span><input class="in" id="b-mul" inputmode="decimal" value="2" autofocus></label><p class="hint">For example: 2 doubles them, 0.5 halves them. Check the portion line and method yourself, then Save.</p><div class="sheet-foot"><span></span><button type="button" class="btn primary" data-b="scale-go">Multiply the amounts</button></div>'); return;
      case 'scale-go': var fct = Number((R.$('#b-mul') || {}).value), n2 = 0; if (!(fct > 0)) return; r.ingredients.forEach(function (g) { var m = /^(\d+(?:\.\d+)?)(.*)$/.exec(g.q); if (m) { g.q = (Math.round(+m[1] * fct * 100) / 100) + m[2]; n2++; } }); R.closeSheet(true); paint(); R.toast(n2 + ' amounts multiplied by ' + fct + '. Review them, then Save.'); return;
      case 'settings': settingsSheet(); return;
      case 'sw-show': r.show = !r.show; R.closeSheet(true); settingsSheet(); R.$('[data-b="sw-show"]').focus(); return;
      case 'sw-special': r.special = !r.special; R.closeSheet(true); settingsSheet(); R.$('[data-b="sw-special"]').focus(); return;
      case 'sheet-done': R.closeSheet(); return;
      case 'toast': R.toast(v); return;
      case 'save':
        S.errs = []; if (!r.name.trim()) S.errs.push({ b: 'title', msg: 'Give the recipe a name.' });
        r.ingredients.forEach(function (g, k) { if (g.q.trim() && !g.name.trim()) S.errs.push({ b: 'ing', i: k, msg: 'Ingredient ' + (k + 1) + ' has an amount but no name.' }); });
        if (S.errs.length) { paint('.b-errs button'); return; }
        S.o = R.clone(r); paint(); R.toast('Saved (example only, nothing was sent).'); return;
      case 'studio': studioOpen('plate'); return;
      case 'studio-build': if (S.mode === 'edit') studioOpen('build'); return;
      // the studio
      case 'st-close': stClose(); return;
      case 'st-slot': R.toast('On the plate, From the side or Build (example shows the plate)'); return;
      case 'st-undo': R.undo(d); stPaint(); return;
      case 'st-redo': R.redo(d); R.closeSheet(true); S.panel = ''; stPaint(); return;
      case 'st-save': d.dirty = false; stPaint(); R.toast('Drawing saved. The Pass labels follow its parts (example only).'); return;
      case 'dock': if (v === 'sm-draw') { R.snap(d); d.parts = R.drawing('').parts; d.sel = -1; d.dirty = true; R.closeSheet(true); S.panel = ''; stPaint(); R.toast('Drawn: 2 parts. Move anything; Tidy up leaves what you moved.'); return; }
        if (S.panel === v) { R.closeSheet(); return; } R.closeSheet(true); panel(v); return;
      case 'layout': R.snap(d); d.parts.forEach(function (q) { q.dx = -q.dx - (q.box[0] * 2 + q.box[2]); }); d.sel = -1; d.dirty = true; R.closeSheet(true); S.panel = ''; stPaint(); return;
      case 'lib-add': R.snap(d); var pc = R.pieceFor(v, d.n++); if (pc) { d.parts.push(pc); d.sel = d.parts.length - 1; d.dirty = true; } R.closeSheet(true); S.panel = ''; stPaint(); return;
      case 'addmiss': R.snap(d); var pc2 = R.pieceFor('chips', d.n++); pc2.ing = v; d.parts.push(pc2); d.sel = d.parts.length - 1; d.dirty = true; R.closeSheet(true); S.panel = ''; stPaint(); return;
      case 'pt-del': R.snap(d); var nm = R.nameOf(d.parts[d.sel]); d.parts.splice(d.sel, 1); d.sel = -1; d.dirty = true; stPaint('#st-cv svg'); R.toast(nm + ' deleted. Undo brings it back.'); return;
      case 'pt-swap': panel('add'); R.toast('Pick the drawing to swap in'); return;
      case 'pt-label': panel('labels'); var lab = R.$('[data-blab="' + d.sel + '"]'); if (lab) lab.focus(); return;
      case 'pt-colour': R.sheet(head('Colours') + '<label class="field"><span>Colour it like a sauce</span><input class="in" placeholder="For example: pepper, mushroom" autofocus></label><div style="display:flex;flex-wrap:wrap;gap:.4rem">' + ['#C0392B', '#E2A93A', '#F2C14E', '#7EA453', '#7E4726', '#F3E6C2'].map(function (c) { return '<button type="button" class="chip" style="background:' + c + ';width:44px" aria-label="Colour ' + c + '"></button>'; }).join('') + '</div><button type="button" class="btn small">Back to its own colours</button><label class="field"><span>See-through</span><input type="range" min="20" max="100" value="100"></label>', { side: true }); return;
      case 'pt-more': R.sheet(head(esc(R.nameOf(d.parts[d.sel]))) + '<div class="st-more">' + ['Duplicate', 'Flip', 'Stretch', 'To the front', 'Forward', 'Backward', 'To the back', 'Split into pieces', 'Change it', 'Save as a library piece'].map(function (t, n) { return '<button type="button" class="btn small" data-b="toast" data-v="' + t + ' (example only)"' + (n ? '' : ' autofocus') + '>' + t + '</button>'; }).join('') + '</div>', { side: true }); return;
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    R.frame('Example only. Design B: Edit on the card. Nothing is saved.');
    root = document.getElementById('app');
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-b], [data-rx]'); if (!b) return;
      var a = b.getAttribute('data-b') || (b.getAttribute('data-rx') === 'nav-back' ? 'nav-back' : b.getAttribute('data-rx'));
      act(a, b.getAttribute('data-v'), +b.getAttribute('data-i'), b);
    });
    document.addEventListener('input', function (e) {
      var t = e.target;
      if (t.hasAttribute('data-bq')) { S.q = t.value; paint('[data-bq]'); var n = R.$('[data-bq]'); n.setSelectionRange(n.value.length, n.value.length); return; }
      if (t.hasAttribute('data-bsq')) { var lib = R.$('#st-lib'); if (lib) lib.innerHTML = R.libTiles(t.value); return; }
      var f = t.getAttribute('data-bf'); if (!f) return;
      setPath(f, t.type === 'checkbox' ? t.checked : t.value);
      if (S.view === 'card') { var y = scrollY; paint(); scrollTo(0, y); }   // the card behind the sheet changes as you type
    });
    document.addEventListener('change', function (e) {
      var t = e.target, lab = t.getAttribute('data-blab');
      if (lab != null) { S.d.parts[+lab].ing = t.value; S.d.dirty = true; stPaint(); return; }
      if (t.tagName === 'SELECT' && t.getAttribute('data-bf')) { setPath(t.getAttribute('data-bf'), t.value); var y = scrollY; paint(); scrollTo(0, y); }
    });
    document.addEventListener('keydown', function (e) {   // Escape closes the studio once no sheet is open and no part is picked
      if (e.key === 'Escape' && studio && !R.$('.sheet-back') && S.d.sel < 0) stClose();
    });
    window.addEventListener('resize', function () { if (S.view === 'card') paint(); else if (studio) stPaint(); });
    paint();
  });
})();
