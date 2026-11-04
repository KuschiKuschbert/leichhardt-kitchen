/* A. Chapters and a studio (3 Nov 2026, example only).
   The recipe opens on its most changed chapter (Ingredients). Six short chapters replace one 7,600 px form; a rail on a
   computer, pills on a phone. The drawing studio keeps every tool but shows one row at a time: tools, or the picked
   part's actions, beside the canvas; Library, Servingware, Labels and Check share one panel. Nothing is saved. */
(function () {
  'use strict';
  var R = window.RX, esc = R.esc, ART = R.ART;
  var S = { view: 'recipe', ch: 'ing', open: -1, r: R.start(), o: null, armed: '', errs: [], d: null, tab: 'lib', q: '', slot: 'plate', listKind: 'recipes', snap: true, many: false };
  S.o = R.clone(S.r);
  S.d = R.drawing('Chicken Burger, on the plate');
  var root, saveEl;
  var CHEV = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  var LINKS = [['', 'No link'], ['ranch', 'Ranch (recipe 80)'], ['aioli', 'Aioli (recipe 41)'], ['slaw', 'New Slaw (card 12)'], ['gravy', 'Gravy (recipe 22)']];

  function chapters() {
    var r = S.r, steps = r.sections.reduce(function (m, s) { return m + s.steps.length; }, 0), al = R.allergens(r);
    return [
      { k: 'ing', name: 'Ingredients', sum: r.ingredients.length + ' lines' },
      { k: 'method', name: 'Method', sum: r.sections.length + ' sections, ' + steps + ' steps' },
      { k: 'alg', name: 'Allergens', sum: al.length ? al.map(function (x) { return x.a + (x.may ? '?' : ''); }).join(', ') : 'None' },
      { k: 'draw', name: 'Drawings', sum: 'Plate and build, ' + r.pins.length + ' labels' },
      { k: 'card', name: 'Card details', sum: 'Card ' + (r.no || '-') + ', ' + (r.show ? 'shown' : 'hidden') + (r.special ? ', special' : '') },
      { k: 'hist', name: 'Earlier versions', sum: 'Version 3, book file' }
    ];
  }
  function setPath(path, v) {
    var r = S.r, p = path.split('.');
    if (p[0] === 'ing') r.ingredients[+p[1]][p[2]] = v;
    else if (p[0] === 'sec') { if (p[2] === 'steps') r.sections[+p[1]].steps = v.split('\n'); else r.sections[+p[1]].title = v; }
    else if (p[0] === 'hfrom') { var a = p[1]; ['contains', 'check'].forEach(function (k) { (r[k] || []).forEach(function (x) { if (x.allergen === a) x.from = v; }); }); }
    else if (p[0] === 'tip' || p[0] === 'safety') r[p[0]][p[1]] = v;
    else r[p[0]] = v;
  }

  /* ---------- the recipe: chapters ---------- */
  function headHTML() {
    var n = R.changeCount(S.r, S.o);
    return '<button type="button" class="a-crumb" data-a="to-list">' + R.BACK.replace('width="22" height="22"', 'width="18" height="18"') + 'Recipes and drawings</button>' +
      '<div class="a-head"><div><p class="eyebrow">Change recipe</p><h1 id="a-title" tabindex="-1">' + esc(S.r.name || 'Unnamed recipe') + '</h1>' +
      '<div class="a-meta"><span>' + esc(ART.kinds[S.r.kind] || '') + ' · ' + esc(S.r.forLine) + '</span><span class="a-status">' + (n ? '<span class="dot"></span>' + n + (n === 1 ? ' change' : ' changes') + ' not saved' : 'Changed here, version 3') + '</span>' +
      '<a class="btn quiet small" href="#card" data-a="open-card">Open the card</a></div></div><div class="a-no" aria-label="Card number">' + esc(S.r.no || '') + '</div></div>';
  }
  function railHTML() {
    var ch = R.changed(S.r, S.o), err = {};
    S.errs.forEach(function (e) { err[e.ch] = 1; });
    return '<nav class="a-rail" aria-label="Chapters of this recipe">' + chapters().map(function (c) {
      return '<button type="button" class="a-ch" data-a="ch" data-v="' + c.k + '" aria-current="' + (S.ch === c.k) + '"><span>' + c.name + '</span><small>' + esc(c.sum) + '</small>' +
        (err[c.k] ? '<span class="err" aria-label="needs a fix">!</span>' : ch[c.k] ? '<span class="dot" aria-label="changed, not saved"></span>' : '') + '</button>';
    }).join('') + '</nav>';
  }
  function tagChips(tags, i) {
    return '<div class="a-tags" role="group" aria-label="Allergens in ' + esc(S.r.ingredients[i].name) + '">' + ART.allergens.map(function (a) {
      var st = tags.indexOf(a) >= 0 ? 'has' : tags.indexOf(a + '?') >= 0 ? 'may' : '';
      return '<button type="button" class="chip' + (st === 'may' ? ' may' : '') + '" data-a="tag" data-i="' + i + '" data-v="' + esc(a) + '" aria-pressed="' + !!st + '">' + esc(a) + (st === 'may' ? '?' : '') + '</button>';
    }).join('') + '</div><p class="hint">Tap once: has it. Twice: may have it. Three times: not in it.</p>';
  }
  function ingHTML() {
    var r = S.r, n = r.ingredients.length;
    return '<div class="a-sec-head"><h2>Ingredients</h2><div class="a-tools"><button type="button" class="btn small" data-a="scale">Scale amounts</button></div>' +
      '<p class="hint">Type the amount and the name in the row. The arrow opens the note, the recipe link, allergens and moving.</p></div>' +
      '<ol class="a-ings">' + r.ingredients.map(function (i, k) {
        var open = S.open === k, link = LINKS.filter(function (l) { return l[0] === i.link; })[0];
        return '<li class="a-ing"><div class="a-ing-row"><span class="n" aria-hidden="true">' + (k + 1) + '</span>' +
          '<input class="in" data-f="ing.' + k + '.q" value="' + esc(i.q) + '" aria-label="Amount, ingredient ' + (k + 1) + '" placeholder="Amount">' +
          '<input class="in" data-f="ing.' + k + '.name" value="' + esc(i.name) + '" aria-label="Ingredient ' + (k + 1) + '" placeholder="Ingredient">' +
          '<span class="a-ing-tags">' + (i.link ? '<span class="tag link">' + esc(link ? link[1].replace(/^.*\(/, '').replace(')', '').toUpperCase() : 'RECIPE') + '</span>' : '') +
          (i.tags.length ? i.tags.map(function (t) { return '<span class="tag' + (/\?$/.test(t) ? ' maybe' : '') + '">' + esc(t) + '</span>'; }).join('') : (i.link ? '' : '<span>No allergens</span>')) + (i.note ? '<span>' + esc(i.note) + '</span>' : '') + '</span>' +
          '<button type="button" class="a-more" data-a="ing-open" data-i="' + k + '" aria-expanded="' + open + '" aria-label="More for ' + esc(i.name || 'ingredient ' + (k + 1)) + '">' + CHEV + '</button></div>' +
          (open ? '<div class="a-ing-open">' +
            '<label class="field"><span>Note</span><input class="in" data-f="ing.' + k + '.note" value="' + esc(i.note) + '" placeholder="For example: bought in, 170 g"></label>' +
            '<label class="field"><span>Recipe link</span><select class="in" data-f="ing.' + k + '.link">' + LINKS.map(function (l) { return '<option value="' + l[0] + '"' + (l[0] === i.link ? ' selected' : '') + '>' + esc(l[1]) + '</option>'; }).join('') + '</select><span class="hint">A linked ingredient opens its recipe and takes its allergens from it.</span></label>' +
            (i.link ? '' : '<div class="field"><span>Allergens</span>' + tagChips(i.tags, k) + '</div>') +
            '<div class="a-tools">' + (k ? '<button type="button" class="btn small" data-a="ing-up" data-i="' + k + '">Move up</button>' : '') + (k < n - 1 ? '<button type="button" class="btn small" data-a="ing-down" data-i="' + k + '">Move down</button>' : '') +
            '<button type="button" class="btn danger small' + (S.armed === 'del' + k ? ' armed' : '') + '" data-a="ing-del" data-i="' + k + '">' + (S.armed === 'del' + k ? 'Tap again to remove' : 'Remove') + '</button></div></div>' : '') + '</li>';
      }).join('') + '</ol><div class="a-tools"><button type="button" class="btn" data-a="ing-add">Add an ingredient</button></div>';
  }
  function methodHTML() {
    var secs = S.r.sections, n = secs.length;
    return '<div class="a-sec-head"><h2>Method</h2><p class="hint">One step per line. Staff tick the steps off on the card.</p></div>' + secs.map(function (s, k) {
      return '<div class="a-step-sec"><label class="field"><span>Section title</span><input class="in" data-f="sec.' + k + '.title" value="' + esc(s.title) + '"></label>' +
        '<label class="field"><span>Steps</span><textarea class="in" rows="' + Math.max(3, s.steps.length + 1) + '" data-f="sec.' + k + '.steps">' + esc(s.steps.join('\n')) + '</textarea></label>' +
        '<div class="a-tools">' + (k ? '<button type="button" class="btn small" data-a="sec-up" data-i="' + k + '">Move up</button>' : '') + (k < n - 1 ? '<button type="button" class="btn small" data-a="sec-down" data-i="' + k + '">Move down</button>' : '') +
        '<button type="button" class="btn danger small' + (S.armed === 'sdel' + k ? ' armed' : '') + '" data-a="sec-del" data-i="' + k + '">' + (S.armed === 'sdel' + k ? 'Tap again to remove' : 'Remove this section') + '</button></div></div>';
    }).join('') + '<div class="a-tools"><button type="button" class="btn" data-a="sec-add">Add a section</button></div>';
  }
  function algHTML() {
    var r = S.r, al = R.allergens(r);
    var body = r.hand ? '<div class="a-alg" role="group" aria-label="Allergens set by hand">' + ART.allergens.map(function (a) {
      var has = (r.contains || []).filter(function (x) { return x.allergen === a; })[0], may = (r.check || []).filter(function (x) { return x.allergen === a; })[0], cur = has ? 'has' : may ? 'may' : '';
      return '<div class="a-alg-row"><b>' + esc(a) + '</b><span class="seg" role="group" aria-label="' + esc(a) + '">' + [['', 'Not in it'], ['has', 'Has it'], ['may', 'May have it']].map(function (o) {
        return '<button type="button" data-a="hand-set" data-v="' + esc(a) + '|' + o[0] + '" aria-pressed="' + (cur === o[0]) + '">' + o[1] + '</button>';
      }).join('') + '</span>' + (cur ? '<input class="in" data-f="hfrom.' + esc(a) + '" value="' + esc((has || may).from) + '" placeholder="From which part" aria-label="' + esc(a) + ' comes from">' : '') + '</div>';
    }).join('') + '</div>' : '<p class="hint">Worked out from the allergens on each ingredient and from the linked recipes. Change them in Ingredients.</p>';
    return '<div class="a-sec-head"><h2>Allergens</h2></div><div class="a-shows"><span class="label">The card shows</span>' + R.tagsHTML(al) + '</div>' +
      '<div class="seg" role="group" aria-label="How the allergens are set"><button type="button" data-a="hand" data-v="0" aria-pressed="' + !r.hand + '">Worked out from the ingredients</button><button type="button" data-a="hand" data-v="1" aria-pressed="' + r.hand + '">Set by hand</button></div>' +
      body + '<label class="field"><span>Label note (optional)</span><input class="in" data-f="labelNote" value="' + esc(r.labelNote) + '" placeholder="For example: check the bun label for sesame"></label>';
  }
  function drawHTML() {
    var r = S.r, slot = function (k, title, pic, name, has) {
      return '<div class="a-draw"><div class="pic">' + (pic || '<span class="hint">None yet</span>') + '</div><div><h3>' + title + '</h3><p class="hint">' + esc(name) + '</p></div>' +
        '<div class="a-tools"><button type="button" class="btn small" data-a="studio" data-v="' + k + '">' + (has ? 'Open in the studio' : 'Draw it in the studio') + '</button><button type="button" class="btn quiet small" data-a="pick-art" data-v="' + k + '">Use another drawing</button></div></div>';
    };
    return '<div class="a-sec-head"><h2>Drawings</h2><p class="hint">Plate labels on the Pass now live with the drawing. Open the plate in the studio to move or rename them.</p></div>' +
      '<div class="a-draws">' + slot('plate', 'On the plate', ART.card, 'The book\'s drawing of Chicken Burger · labels: ' + r.pins.map(function (p) { return p.label; }).join(', '), true) +
      slot('side', 'From the side', '', 'None', false) + slot('build', 'Build, top to bottom', '<svg viewBox="' + ART.build.vb + '">' + ART.build.body + '</svg>', 'Burger build, 8 layers', true) + '</div>';
  }
  function cardHTML() {
    var r = S.r, sw = function (a, on, t, sub) { return '<button type="button" class="switch" role="switch" aria-checked="' + on + '" data-a="' + a + '"><span><b>' + t + '</b><small>' + sub + '</small></span><i aria-hidden="true"></i></button>'; };
    var f = function (k, label, v, o) { o = o || {}; return '<label class="field"><span>' + label + '</span>' + (o.area ? '<textarea class="in" rows="2" data-f="' + k + '">' + esc(v) + '</textarea>' : '<input class="in" id="a-f-' + k + '" data-f="' + k + '" value="' + esc(v) + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + '>') + (o.hint ? '<span class="hint">' + o.hint + '</span>' : '') + '</label>'; };
    return '<div class="a-sec-head"><h2>Card details</h2></div>' +
      sw('sw-show', r.show, 'Show in the book', r.show ? 'Staff see this recipe.' : 'Hidden. Kept, and can be shown again.') + (/(main|snack|side|dessert)/.test(r.kind) ? sw('sw-special', r.special, 'Special', r.special ? 'First on the Pass and Tiles.' : 'Not a special.') : '') +
      f('name', 'Name staff see', r.name) +
      '<div class="row2">' + f('no', 'Card number', r.no) + '<label class="field"><span>Kind</span><select class="in" data-f="kind">' + Object.keys(ART.kinds).map(function (k) { return '<option value="' + k + '"' + (r.kind === k ? ' selected' : '') + '>' + esc(ART.kinds[k]) + '</option>'; }).join('') + '</select></label></div>' +
      f('forLine', 'Where it belongs', r.forLine, { ph: 'Plate, or For the barramundi' }) + f('yield', 'Portion or batch line', r.yield) +
      '<label class="switch" style="cursor:pointer"><span><b>Finished</b><small>The card and its drawings are 100% done (green frame).</small></span><input type="checkbox" data-f="done"' + (r.done ? ' checked' : '') + ' style="width:22px;height:22px"></label>' +
      '<details class="a-opt"><summary>More card details (optional)</summary><div>' +
      '<div class="row2"><label class="field"><span>Guest menu section</span><select class="in" data-f="menuSec"><option>Not on the guest menu</option><option selected>Hand Held</option><option>Specials</option><option>Mains</option></select></label><label class="field"><span>Comes after</span><select class="in" data-f="after"><option>First in the section</option><option selected>Chickpea Mushroom Burger</option><option>Last in the section</option></select></label></div>' +
      f('short', 'Short name on prep lines', r.short) + f('menu', 'How the guest menu describes it', r.menu, { area: true }) + f('avc', 'Name in AVC Live', r.avc, { hint: 'So a search for the AVC name finds the card. No prices or codes here.' }) +
      f('aka', 'Other names staff search for', r.aka) + '<div class="row2">' + f('tip.title', 'Tip box title', r.tip.title, { ph: 'iCombi' }) + f('safety.title', 'Safety box title', r.safety.title, { ph: 'Hot oil' }) + '</div>' +
      f('tip.text', 'Tip box words', r.tip.text, { area: true }) + f('safety.text', 'Safety box words (orange)', r.safety.text, { area: true }) + '</div></details>';
  }
  function histHTML() {
    var h = [['Version 3', '28 Oct 21:40', 'Head chef'], ['Version 2', '24 Oct 14:05', 'Sous chef'], ['Version 1', '21 Oct 09:12', 'Head chef']];
    return '<div class="a-sec-head"><h2>Earlier versions</h2><p class="hint">Opening a version puts it in the chapters. Save to make it the card again.</p></div><ul class="a-hist">' + h.map(function (x, k) {
      return '<li><span><b>' + x[0] + '</b> · ' + x[1] + ' · ' + x[2] + '</span><button type="button" class="btn small" data-a="hist" data-i="' + k + '">' + (S.armed === 'hist' + k ? 'Not saved. Tap again' : 'Open this version') + '</button></li>';
    }).join('') + '</ul><div class="a-step-sec"><b>The book file</b><p class="hint">Staff then see the recipe as js/data.js has it. This version stays in the earlier versions.</p><div class="a-tools"><button type="button" class="btn small" data-a="bookfile">' + (S.armed === 'bookfile' ? 'Tap again: show the book file\'s copy' : 'Go back to the book file\'s copy') + '</button></div></div>';
  }
  function asideHTML() {
    var ch = R.changed(S.r, S.o), names = { ing: 'Ingredients', method: 'Method', alg: 'Allergens', draw: 'Drawings', card: 'Card details' };
    var list = Object.keys(names).filter(function (k) { return ch[k]; });
    return '<aside class="a-aside" aria-label="About this recipe"><div class="a-ctx"><div class="thumb">' + ART.card + '</div><h3>After saving</h3><div><span class="label">The card shows</span><div>' + R.tagsHTML(R.allergens(S.r)) + '</div></div>' +
      (list.length ? '<div><span class="label">Not saved yet</span><ul>' + list.map(function (k) { return '<li><button type="button" data-a="ch" data-v="' + k + '">' + names[k] + '</button></li>'; }).join('') + '</ul></div>' : '<p class="hint">Nothing changed yet.</p>') +
      '<p class="hint">Not used in another recipe. Staff see a saved change within half an hour.</p></div></aside>';
  }
  function chapterHTML() {
    var errs = S.errs.length ? '<div class="a-errs" role="alert"><span class="label">Not saved yet</span><ul>' + S.errs.map(function (e) { return '<li><button type="button" data-a="goto-err" data-v="' + e.ch + '|' + e.at + '">' + esc(e.msg) + '</button></li>'; }).join('') + '</ul></div>' : '';
    return errs + ({ ing: ingHTML, method: methodHTML, alg: algHTML, draw: drawHTML, card: cardHTML, hist: histHTML }[S.ch])();
  }
  function saveBarHTML(studio) {
    var n = studio ? (S.d.dirty ? 1 : 0) : R.changeCount(S.r, S.o);
    var txt = studio ? (S.d.dirty ? 'Drawing not saved yet' : 'Drawing as saved') : n ? n + (n === 1 ? ' change' : ' changes') + ' not saved yet' : 'Nothing changed yet';
    return '<div class="a-save-in"><span class="a-state" role="status">' + txt + '<small>' + (n ? 'Kept on this device until you save.' : studio ? 'Saved on its own, apart from the recipe.' : 'Changed here, version 3.') + '</small></span>' +
      (n && !studio ? '<button type="button" class="btn quiet small" data-a="undo-all">' + (S.armed === 'undo-all' ? 'Tap again to undo all' : 'Undo all') + '</button>' : '') +
      '<button type="button" class="btn primary" data-a="' + (studio ? 's-save' : 'save') + '"' + (n ? '' : ' disabled') + '>Save</button></div>';
  }
  function recipeHTML() {
    return '<div class="a-wrap">' + headHTML() + '<div class="a-body">' + railHTML() + '<main class="a-main" id="a-main">' + chapterHTML() + '</main>' + asideHTML() + '</div></div>';
  }

  /* ---------- the list ---------- */
  function listHTML() {
    var kinds = [['recipes', 'Recipes', 128], ['drawings', 'Drawings', 14], ['templates', 'Templates', 3], ['pieces', 'Library pieces', 6], ['tocome', 'Cards to come', 3]];
    var rows = ART.rows.filter(function (x) { return !S.q || x.name.toLowerCase().indexOf(S.q.toLowerCase()) >= 0; });
    return '<div class="a-wrap"><div class="a-head"><div><p class="eyebrow">Head chef, sous chefs and admin</p><h1 id="a-title" tabindex="-1">Recipes and drawings</h1></div><button type="button" class="btn primary" data-a="new">New recipe</button></div>' +
      '<div class="a-body"><nav class="a-rail" aria-label="What to show">' + kinds.map(function (k) { return '<button type="button" class="a-ch" data-a="kind" data-v="' + k[0] + '" aria-current="' + (S.listKind === k[0]) + '"><span>' + k[1] + '</span><small>' + k[2] + '</small></button>'; }).join('') + '</nav>' +
      '<main class="a-main"><label class="field"><span>Find a recipe</span><input class="in" type="search" data-a-q="1" value="' + esc(S.q) + '" placeholder="Name, card number or ingredient"></label>' +
      '<div class="a-need" role="group" aria-label="Needs a look"><span class="label">Needs a look</span><button type="button" class="chip">Not saved yet · 1</button><button type="button" class="chip">Book file changed · 1</button><button type="button" class="chip">Hidden · 2</button></div>' +
      '<div class="a-kinds" role="group" aria-label="Kind"><button type="button" class="chip" aria-pressed="true">All</button><button type="button" class="chip" aria-pressed="false">Dishes</button><button type="button" class="chip" aria-pressed="false">Batch and components</button></div>' +
      '<p class="hint" role="status">' + rows.length + ' of 128 recipes (example)</p><ul class="a-rows">' + rows.map(function (x) {
        return '<li><button type="button" data-a="open-recipe" data-v="' + esc(x.id) + '"><span class="thumb">' + x.svg + '</span><span><b>' + esc(x.name) + '</b><small>Card ' + esc(x.no || '-') + ' · ' + esc(ART.kinds[x.kind] || '') + '</small></span>' + (x.id === 'burger' ? '<span class="tag maybe">Changed here</span>' : '<span></span>') + '</button></li>';
      }).join('') + '</ul></main></div></div>';
  }

  /* ---------- the studio ---------- */
  function studioHTML() {
    var d = S.d, p = d.parts[d.sel], miss = R.missing(S.r, d);
    var tools = '<div class="s-bar" role="toolbar" aria-label="Drawing tools"><button type="button" class="btn primary" data-a="s-auto">' + (d.parts.length ? 'Draw it again for me' : 'Draw it for me') + '</button><button type="button" class="btn" data-a="s-layout">Another layout</button><span class="sep"></span>' +
      '<button type="button" class="btn" data-a="s-text">Text</button><button type="button" class="btn" data-a="pop" data-v="shapes" aria-haspopup="menu">Shapes ▾</button><span class="sep"></span>' +
      '<button type="button" class="btn" data-a="s-undo"' + (d.undo.length ? '' : ' disabled') + '>Undo</button><button type="button" class="btn" data-a="s-redo"' + (d.redo.length ? '' : ' disabled') + '>Redo</button><span class="sep"></span><button type="button" class="btn" data-a="pop" data-v="more" aria-haspopup="menu">More ▾</button></div>';
    var pick = p ? '<div class="s-bar pick" role="toolbar" aria-label="The picked part"><span class="s-name">' + esc(R.nameOf(p)) + '</span><button type="button" class="btn" data-a="s-swap">Swap</button><button type="button" class="btn" data-a="s-colour">Colour</button>' +
      '<button type="button" class="btn" data-a="s-label">' + (p.ing ? 'Label: ' + esc(p.ing) : 'Which ingredient?') + '</button><button type="button" class="btn" data-a="pop" data-v="arrange" aria-haspopup="menu">Arrange ▾</button><button type="button" class="btn" data-a="pop" data-v="pmore" aria-haspopup="menu">More ▾</button>' +
      '<button type="button" class="btn danger" data-a="s-del">Delete</button><button type="button" class="btn" data-a="s-done">Done</button></div>' : tools;
    var tabs = [['lib', 'Library'], ['ware', 'Servingware'], ['labels', 'Labels'], ['check', 'Check' + (miss.length ? ' (' + miss.length + ')' : '')]];
    var panel = { lib: function () {
      return (miss.length ? '<div class="s-miss"><span class="label">In this recipe, not on the plate yet</span><div class="a-tools">' + miss.map(function (m) { return '<button type="button" class="chip" data-a="s-addmiss" data-v="' + esc(m) + '">+ ' + esc(m) + '</button>'; }).join('') + '</div></div>' : '') +
        '<label class="field"><span>Find a drawing</span><input class="in" type="search" data-s-q="1" value="' + esc(S.q) + '" placeholder="For example: chips, lemon wedge"></label><div class="a-kinds" role="group" aria-label="Category"><button type="button" class="chip" aria-pressed="true">All</button><button type="button" class="chip" aria-pressed="false">Meat</button><button type="button" class="chip" aria-pressed="false">Veg</button><button type="button" class="chip" aria-pressed="false">Sauce</button><button type="button" class="chip" aria-pressed="false">Garnish</button></div>' +
        '<p class="hint">Tap one to put it on the plate, or drag it there.</p>' + R.libTiles(S.q) + '<button type="button" class="btn quiet small" data-a="s-import">Import a drawing (SVG)</button>';
    }, ware: function () {
      var ware = [['Dinner plate', '<circle r="40" fill="#fff" stroke="#c9c4ba" stroke-width="2"/><circle r="30" fill="none" stroke="#e8e4dc"/>'], ['Side plate', '<circle r="28" fill="#fff" stroke="#c9c4ba" stroke-width="2"/>'], ['Pasta bowl', '<circle r="38" fill="#fff" stroke="#c9c4ba" stroke-width="2"/><circle r="22" fill="#f1eee8"/>'], ['Board', '<rect x="-42" y="-28" width="84" height="56" rx="6" fill="#d9b48a" stroke="#a9835a" stroke-width="2"/>'], ['Skillet', '<circle r="34" fill="#3a3a3a"/><rect x="30" y="-5" width="16" height="10" rx="3" fill="#3a3a3a"/>'], ['Basket', '<rect x="-40" y="-26" width="80" height="52" rx="10" fill="#c99b5d" stroke="#8d6a3a" stroke-width="2"/>']];
      return '<p class="hint">Swap the plate, bowl or board. The food stays where it is.</p><div class="s-ware">' + ware.map(function (w, k) { return '<button type="button" class="tile" aria-pressed="' + (k === 0) + '" data-a="s-ware"' + (k === 0 ? ' style="border-color:var(--ink)"' : '') + '><svg viewBox="-48 -48 96 96">' + w[1] + '</svg><span>' + w[0] + '</span></button>'; }).join('') + '</div>' +
        '<div class="row2"><label class="field"><span>Size (cm)</span><select class="in"><option>27</option><option selected>30</option><option>32</option></select></label><label class="field"><span>Rim</span><select class="in"><option selected>Wide</option><option>Narrow</option><option>None</option></select></label></div>' +
        '<label class="hint" style="display:flex;gap:.5rem;align-items:center"><input type="checkbox" checked style="width:20px;height:20px"> Fit the food to a new size</label><button type="button" class="btn small" data-a="s-toast" data-v="Servingware saved for other drawings (example only)">Save this servingware</button>';
    }, labels: function () {
      return '<p class="hint">The Pass labels come from the parts. A number on the canvas is the same number here.</p><ol class="s-labs">' + d.parts.map(function (q, k) {
        return '<li><span class="n">' + (k + 1) + '</span><label class="field"><span class="sr-only">Label ' + (k + 1) + '</span><select class="in" data-a-lab="' + k + '"><option value="">No label</option>' + S.r.ingredients.map(function (i) { return '<option' + (q.ing === i.name ? ' selected' : '') + '>' + esc(i.name) + '</option>'; }).join('') + '</select></label></li>';
      }).join('') + '</ol><p class="hint">What staff read when they tap a label comes from the ingredient: its amount, note and allergens.</p>';
    }, check: function () {
      return miss.length ? '<ul class="s-check">' + miss.map(function (m) { return '<li>' + esc(m) + ' is in the recipe, not on the plate. <button type="button" class="btn quiet small" data-a="s-addmiss" data-v="' + esc(m) + '">Add it</button></li>'; }).join('') + '</ul>' : '<p><b>All good.</b> Every ingredient is on it, every part has its label and sits on the plate.</p>';
    } }[S.tab]();
    var slots = [['plate', 'On the plate'], ['side', 'From the side'], ['build', 'Build']];
    return '<div class="a-wrap"><button type="button" class="a-crumb" data-a="s-back">' + R.BACK.replace('width="22" height="22"', 'width="18" height="18"') + 'Chicken Burger</button>' +
      '<div class="s-head"><h1 id="a-title" tabindex="-1">On the plate</h1><div class="s-slots" role="group" aria-label="Which drawing">' + slots.map(function (s) { return '<button type="button" class="chip" data-a="s-slot" data-v="' + s[0] + '" aria-pressed="' + (S.slot === s[0]) + '">' + s[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="s-grid"><div class="s-left">' + pick + '<div class="cv" id="s-cv">' + R.canvasSVG(d, { pins: S.tab === 'labels' }) + '</div><p class="s-hint" role="status">' + (p ? 'Drag to move. Arrow keys nudge it, Delete takes it off.' : 'Tap a part to change it. ' + d.parts.length + ' parts on the plate.') + '</p></div>' +
      '<section class="s-panel" aria-label="Drawing panel"><div class="s-tabs" role="tablist">' + tabs.map(function (t) { return '<button type="button" role="tab" data-a="s-tab" data-v="' + t[0] + '" aria-selected="' + (S.tab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>' + panel + '</section></div></div>';
  }

  /* ---------- drawing the page ---------- */
  function paint(focusSel) {
    var keep = document.activeElement, kf = keep && keep.getAttribute && (keep.getAttribute('data-f') || (keep.hasAttribute('data-s-q') && 's-q') || (keep.hasAttribute('data-a-q') && 'a-q'));
    var studio = S.view === 'studio';
    root.innerHTML = S.view === 'list' ? listHTML() : studio ? studioHTML() : recipeHTML();
    saveEl.hidden = S.view === 'list';
    saveEl.innerHTML = saveBarHTML(studio);
    if (studio) R.bindCanvas(R.$('#s-cv'), S.d, function (k) { paint(k ? '#s-cv svg' : null); });
    if (focusSel) { var f = R.$(focusSel); if (f) f.focus(); }
    else if (kf) { var n = kf === 's-q' ? R.$('[data-s-q]') : kf === 'a-q' ? R.$('[data-a-q]') : R.$('[data-f="' + kf + '"]'); if (n) { n.focus(); try { var v = n.value.length; n.setSelectionRange(v, v); } catch (e) {} } }
  }
  function chrome() {   // typing redraws only the counts, the rail and the save bar, so the box keeps its cursor
    var rail = R.$('.a-rail'); if (rail && S.view === 'recipe') { var t = document.createElement('div'); t.innerHTML = railHTML(); rail.replaceWith(t.firstChild); }
    var head = R.$('.a-status'); if (head) { var n = R.changeCount(S.r, S.o); head.innerHTML = n ? '<span class="dot"></span>' + n + (n === 1 ? ' change' : ' changes') + ' not saved' : 'Changed here, version 3'; }
    var aside = R.$('.a-aside'); if (aside) { var a = document.createElement('div'); a.innerHTML = asideHTML(); aside.replaceWith(a.firstChild); }
    saveEl.innerHTML = saveBarHTML(S.view === 'studio');
  }
  function arm(k) { if (S.armed === k) { S.armed = ''; return true; } S.armed = k; setTimeout(function () { if (S.armed === k) { S.armed = ''; paint(); } }, 4000); return false; }
  // on a phone the panel sits under the canvas: after adding a piece, bring the canvas back into view
  function seeCanvas() { var c = R.$('#s-cv'); if (c && window.innerWidth < 900) c.scrollIntoView({ block: 'center' }); }
  var pop = null;
  function closePop() { if (pop) { pop.remove(); pop = null; } }
  function openPop(btn, kind) {
    closePop();
    var items = { shapes: [['Line'], ['Arrow'], ['Box'], ['Oval']], more: [['Pick several'], [(S.snap ? 'Turn off' : 'Turn on') + ' snap to centre', 'snap'], ['Tidy up'], ['Plating style'], ['Parts list'], ['-'], ['Save as a template'], ['Use for another recipe'], ['-'], ['Zoom to fit']],
      arrange: [['To the front'], ['Forward'], ['Backward'], ['To the back']], pmore: [['Duplicate', 'dup'], ['Flip'], ['Stretch'], ['Split into pieces'], ['Change it'], ['-'], ['Save as a library piece']] }[kind];
    pop = document.createElement('div'); pop.className = 'menu-pop'; pop.setAttribute('role', 'menu');
    pop.innerHTML = items.map(function (i) { return i[0] === '-' ? '<hr>' : '<button type="button" role="menuitem" data-a="pop-do" data-v="' + esc(i[1] || i[0]) + '">' + esc(i[0]) + '</button>'; }).join('');
    document.body.appendChild(pop);
    var b = btn.getBoundingClientRect(), w = pop.offsetWidth;
    pop.style.top = (b.bottom + window.scrollY + 6) + 'px';
    pop.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, b.left + window.scrollX)) + 'px';
    pop.querySelector('button').focus();
  }

  function act(a, v, i, el) {
    var r = S.r, d = S.d;
    if (a !== 'pop' && a !== 'pop-do') closePop();
    switch (a) {
      case 'ch': S.ch = v; S.open = -1; S.armed = ''; paint('#a-title'); scrollTo(0, 0); return;
      case 'to-list': S.view = 'list'; paint('#a-title'); scrollTo(0, 0); return;
      case 'nav-back': if (S.view === 'studio') return act('s-back'); if (S.view === 'recipe') return act('to-list'); return;
      case 'open-recipe': case 'new': S.view = 'recipe'; S.ch = 'ing'; paint('#a-title'); scrollTo(0, 0); if (a === 'new') R.toast('A new recipe opens on Card details (example shows the burger)'); return;
      case 'kind': S.listKind = v; paint(); return;
      case 'open-card': R.toast('Opens the card as staff see it'); return;
      case 'ing-open': S.open = S.open === i ? -1 : i; S.armed = ''; paint('[data-a="ing-open"][data-i="' + i + '"]'); return;
      case 'tag': var t = r.ingredients[i].tags, has = t.indexOf(v), may = t.indexOf(v + '?');
        if (has >= 0) t.splice(has, 1, v + '?'); else if (may >= 0) t.splice(may, 1); else t.push(v);
        paint('[data-a="tag"][data-i="' + i + '"][data-v="' + v + '"]'); return;
      case 'ing-up': case 'ing-down': var j = a === 'ing-up' ? i - 1 : i + 1, l = r.ingredients, x = l[i]; l[i] = l[j]; l[j] = x; S.open = j; paint('[data-a="ing-open"][data-i="' + j + '"]'); return;
      case 'ing-del': if (!arm('del' + i)) return paint('[data-a="ing-del"][data-i="' + i + '"]'); r.ingredients.splice(i, 1); S.open = -1; paint(); R.toast('Ingredient removed. Undo all brings it back until you save.'); return;
      case 'ing-add': r.ingredients.push({ q: '', name: '', note: '', link: '', tags: [] }); S.open = -1; paint('[data-f="ing.' + (r.ingredients.length - 1) + '.q"]'); return;
      case 'scale': R.sheet('<div class="sheet-head"><h2 id="sheet-h">Scale amounts</h2><button type="button" class="btn quiet" data-a="sheet-close">Cancel</button></div><label class="field"><span>Multiply amounts by</span><input class="in" id="a-mul" inputmode="decimal" value="2" autofocus></label><p class="hint">For example: 2 doubles them, 0.5 halves them. Applies to the amounts in this recipe. Check the portion line and method yourself, then Save.</p><div class="sheet-foot"><span></span><button type="button" class="btn primary" data-a="scale-go">Multiply the amounts</button></div>'); return;
      case 'scale-go': var fct = Number((R.$('#a-mul') || {}).value), n2 = 0; if (!(fct > 0)) return; r.ingredients.forEach(function (g) { var m = /^(\d+(?:\.\d+)?)(.*)$/.exec(g.q); if (m) { g.q = (Math.round(+m[1] * fct * 100) / 100) + m[2]; n2++; } }); R.closeSheet(true); paint(); R.toast(n2 + ' amounts multiplied by ' + fct + '. Review them, then Save.'); return;
      case 'sheet-close': R.closeSheet(); return;
      case 'sec-up': case 'sec-down': var sj = a === 'sec-up' ? i - 1 : i + 1, sl = r.sections, sx = sl[i]; sl[i] = sl[sj]; sl[sj] = sx; paint(); return;
      case 'sec-del': if (!arm('sdel' + i)) return paint('[data-a="sec-del"][data-i="' + i + '"]'); r.sections.splice(i, 1); paint(); return;
      case 'sec-add': r.sections.push({ title: '', steps: [] }); paint('[data-f="sec.' + (r.sections.length - 1) + '.title"]'); return;
      case 'hand': r.hand = v === '1'; if (r.hand && !r.contains) { r.contains = []; r.check = []; } paint('[data-a="hand"][data-v="' + v + '"]'); return;
      case 'hand-set': var pa = v.split('|'), al = pa[0], st = pa[1], from = ''; ['contains', 'check'].forEach(function (k) { r[k] = (r[k] || []).filter(function (x) { if (x.allergen === al) from = x.from; return x.allergen !== al; }); });
        if (st === 'has') r.contains.push({ allergen: al, from: from }); if (st === 'may') r.check.push({ allergen: al, from: from }); paint('[data-a="hand-set"][data-v="' + v + '"]'); return;
      case 'sw-show': r.show = !r.show; paint('[data-a="sw-show"]'); return;
      case 'sw-special': r.special = !r.special; paint('[data-a="sw-special"]'); return;
      case 'hist': if (!arm('hist' + i)) return paint('[data-a="hist"][data-i="' + i + '"]'); R.toast('Version ' + (3 - i) + ' is in the chapters. Save to make it the card again.'); paint(); return;
      case 'bookfile': if (!arm('bookfile')) return paint('[data-a="bookfile"]'); R.toast('The book file\'s copy is shown to staff (example only)'); paint(); return;
      case 'pick-art': R.sheet('<div class="sheet-head"><h2 id="sheet-h">Use another drawing</h2><button type="button" class="btn quiet" data-a="sheet-close" autofocus>Cancel</button></div><p class="hint">Drawings from the book and the ones drawn here, with their pictures instead of their file names.</p><div class="lib">' + ART.rows.filter(function (x) { return x.kind === 'main'; }).map(function (x) { return '<button type="button" class="tile" data-a="sheet-close">' + x.svg + '<span>' + esc(x.name) + '</span></button>'; }).join('') + '</div>', { side: true }); return;
      case 'undo-all': if (!arm('undo-all')) return paint(); S.r = R.clone(S.o); S.errs = []; S.open = -1; paint(); R.toast('All changes undone'); return;
      case 'save':
        S.errs = []; if (!r.name.trim()) S.errs.push({ ch: 'card', at: 'a-f-name', msg: 'Give the recipe a name.' });
        r.ingredients.forEach(function (g, k) { if (g.q.trim() && !g.name.trim()) S.errs.push({ ch: 'ing', at: 'ing.' + k + '.name', msg: 'Ingredient ' + (k + 1) + ' has an amount but no name.' }); });
        if (S.errs.length) { S.ch = S.errs[0].ch; paint(); R.$('.a-errs button').focus(); return; }
        S.o = R.clone(r); paint(); R.toast('Saved (example only, nothing was sent).'); return;
      case 'goto-err': var g2 = v.split('|'); S.ch = g2[0]; paint(); var tgt = R.$('#' + g2[1]) || R.$('[data-f="' + g2[1] + '"]'); if (tgt) tgt.focus(); return;
      case 'studio': S.view = 'studio'; S.slot = v === 'side' ? 'plate' : v; S.tab = 'lib'; paint('#a-title'); scrollTo(0, 0); if (v === 'side') R.toast('No side view yet: the studio would open a blank one'); return;
      // studio
      case 's-back': S.view = 'recipe'; S.ch = 'draw'; paint('#a-title'); scrollTo(0, 0); if (d.dirty) R.toast('The drawing is kept on this device until you save it.'); return;
      case 's-slot': S.slot = v; paint(); if (v !== 'plate') R.toast('The ' + (v === 'side' ? 'side view' : 'build drawing') + ' opens the same way (example shows the plate)'); return;
      case 's-tab': S.tab = v; paint('[data-a="s-tab"][data-v="' + v + '"]'); return;
      case 's-auto': R.snap(d); d.parts = R.drawing('').parts; d.sel = -1; d.dirty = true; paint(); R.toast('Drawn: 2 parts. Move anything; Tidy up leaves what you moved.'); return;
      case 's-layout': R.snap(d); d.parts.forEach(function (q) { q.dx = -q.dx - (q.box[0] * 2 + q.box[2]); }); d.sel = -1; d.dirty = true; paint(); R.toast('Another layout'); return;
      case 's-undo': R.undo(d); paint(); return;
      case 's-redo': R.redo(d); paint(); return;
      case 's-done': d.sel = -1; paint('#s-cv svg'); return;
      case 's-del': R.snap(d); var nm = R.nameOf(d.parts[d.sel]); d.parts.splice(d.sel, 1); d.sel = -1; d.dirty = true; paint('#s-cv svg'); R.toast(nm + ' deleted. Undo brings it back.'); return;
      case 'lib-add': R.snap(d); var pc = R.pieceFor(v, d.n++); if (pc) { d.parts.push(pc); d.sel = d.parts.length - 1; d.dirty = true; } paint(); seeCanvas(); return;
      case 's-addmiss': R.snap(d); var pc2 = R.pieceFor('chips', d.n++); pc2.ing = v; d.parts.push(pc2); d.sel = d.parts.length - 1; d.dirty = true; paint(); seeCanvas(); return;
      case 's-swap': S.tab = 'lib'; S.q = ''; paint('[data-s-q]'); R.toast('Pick the drawing to swap in for ' + R.nameOf(d.parts[d.sel])); return;
      case 's-colour': R.sheet('<div class="sheet-head"><h2 id="sheet-h">Colours: ' + esc(R.nameOf(d.parts[d.sel])) + '</h2><button type="button" class="btn quiet" data-a="sheet-close" autofocus>Done</button></div><label class="field"><span>Colour it like a sauce</span><input class="in" placeholder="For example: pepper, mushroom, hollandaise"></label><div class="a-tools">' + ['#C0392B', '#E2A93A', '#F2C14E', '#7EA453', '#7E4726', '#F3E6C2'].map(function (c) { return '<button type="button" class="chip" style="background:' + c + ';width:44px" aria-label="Colour ' + c + '"></button>'; }).join('') + '</div><button type="button" class="btn small">Back to its own colours</button><label class="field"><span>See-through</span><input type="range" min="20" max="100" value="100"></label>', { side: true }); return;
      case 's-label': S.tab = 'labels'; paint('[data-a-lab="' + d.sel + '"]'); return;
      case 's-text': R.toast('Text: tap the plate where the words go'); return;
      case 's-import': R.toast('Choose an SVG file: plain shapes only, 100 kB at most'); return;
      case 's-toast': R.toast(v); return;
      case 's-ware': R.toast('Servingware changed (example only)'); return;
      case 's-save': d.dirty = false; paint(); R.toast('Drawing saved. The Pass labels follow its parts (example only).'); return;
      case 'pop': openPop(el, v); return;
      case 'pop-do': closePop(); if (v === 'dup' && d.parts[d.sel]) { R.snap(d); var cp = R.clone(d.parts[d.sel]); cp.dx += 10; cp.dy += 10; d.parts.push(cp); d.sel = d.parts.length - 1; d.dirty = true; paint(); return; } if (v === 'snap') { S.snap = !S.snap; } R.toast((v === 'snap' ? 'Snap to centre ' + (S.snap ? 'on' : 'off') : v) + ' (example only)'); paint(); return;
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    R.frame('Example only. Design A: Chapters and a studio. Nothing is saved.');
    root = document.getElementById('app');
    saveEl = document.createElement('div'); saveEl.className = 'a-save'; document.body.appendChild(saveEl);
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a], [data-rx]');
      if (!b) { if (pop && !e.target.closest('.menu-pop')) closePop(); return; }
      if (b.tagName === 'A') e.preventDefault();
      act(b.getAttribute('data-a') || b.getAttribute('data-rx'), b.getAttribute('data-v'), +b.getAttribute('data-i'), b);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pop) { closePop(); } });
    document.addEventListener('input', function (e) {
      var t = e.target;
      if (t.hasAttribute('data-a-q')) { S.q = t.value; paint(); return; }
      if (t.hasAttribute('data-s-q')) { S.q = t.value; paint(); return; }
      var f = t.getAttribute('data-f'); if (!f) return;
      setPath(f, t.type === 'checkbox' ? t.checked : t.value);
      if (f === 'name' || f === 'no') { var h = R.$('.a-head h1'); if (h && f === 'name') h.textContent = t.value || 'Unnamed recipe'; var no = R.$('.a-no'); if (no && f === 'no') no.textContent = t.value; }
      chrome();
    });
    document.addEventListener('change', function (e) {
      var t = e.target, lab = t.getAttribute('data-a-lab');
      if (lab != null) { S.d.parts[+lab].ing = t.value; S.d.dirty = true; paint('[data-a-lab="' + lab + '"]'); return; }
      if (t.tagName === 'SELECT' && t.getAttribute('data-f')) { setPath(t.getAttribute('data-f'), t.value); paint('[data-f="' + t.getAttribute('data-f') + '"]'); }
    });
    paint();
  });
})();
