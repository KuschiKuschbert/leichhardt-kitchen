/* Drawing studio design options (4 Nov 2026): one example studio, drawn two ways.
   A, Three steps: Plate, Food, Check under the top bar, each step's tools in a small tray.
   B, Quiet canvas: no tabs; one bar at the thumb that shows only what you can do now.
   Example only: the Chicken Burger is the book's public card, the drawings are the book's own. Nothing is saved. */
(function () {
  'use strict';
  var ART = window.ST_ART, MODE = document.body.getAttribute('data-mode') === 'a' ? 'a' : 'b';
  var NS = 'http://www.w3.org/2000/svg';
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s, r) { return (r || document).querySelector(s); }
  var ICON = {
    close: '<path d="M6 6l12 12M18 6L6 18"/>', undo: '<path d="M9 7L4 12l5 5"/><path d="M4 12h10a6 6 0 010 12"/>', redo: '<path d="M15 7l5 5-5 5"/><path d="M20 12H10a6 6 0 000 12"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>', add: '<path d="M12 5v14M5 12h14"/>',
    plate: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/>', check: '<path d="M5 12l4 4 10-10"/>', more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    colour: '<path d="M12 3c-4 5-6 8-6 11a6 6 0 0012 0c0-3-2-6-6-11z"/>', label: '<path d="M4 12V5h7l9 9-7 7-9-9z"/><circle cx="8" cy="9" r="1.2"/>', del: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
    front: '<rect x="8" y="8" width="11" height="11" rx="1"/><path d="M5 15V5h10"/>', back: '<rect x="5" y="5" width="11" height="11" rx="1"/><path d="M19 9v10H9"/>', up: '<path d="M12 19V5M6 11l6-6 6 6"/>', down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    dup: '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M5 15V5h10"/>', flip: '<path d="M12 3v18M8 7L3 12l5 5M16 7l5 5-5 5"/>', stretch: '<path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/>', split: '<path d="M6 4l6 8-6 8M18 4l-6 8 6 8"/>',
    swap: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>', keep: '<path d="M6 3h12v18l-6-4-6 4z"/>', text: '<path d="M5 6h14M12 6v13"/>', line: '<path d="M5 19L19 5"/>', arrow: '<path d="M5 19L19 5M10 5h9v9"/>', box: '<rect x="4" y="6" width="16" height="12" rx="1"/>', oval: '<ellipse cx="12" cy="12" rx="9" ry="6"/>',
    tidy: '<path d="M4 6h16M4 12h10M4 18h16"/>', style: '<circle cx="12" cy="12" r="8"/><path d="M12 4v16"/>', list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>', many: '<rect x="3" y="3" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/>', snap: '<path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="3"/>',
    tpl: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16"/>', reuse: '<path d="M4 12a8 8 0 0114-5l2 2M20 12a8 8 0 01-14 5l-2-2"/><path d="M20 4v5h-5M4 20v-5h5"/>', svg: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', done: '<path d="M5 12l4 4 10-10"/>'
  };
  function ic(k) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[k] + '</svg>'; }

  /* ---------- the servingware, as pictures ---------- */
  var WARE = [
    ['dinner', 'Dinner plate', ART.surf],
    ['side', 'Side plate', '<circle r="82" fill="#E7E2D8" transform="translate(4 6)"/><circle r="82" fill="#fff" stroke="#D4D4D4" stroke-width="2"/><circle r="64" fill="none" stroke="#EDEDED" stroke-width="1.5"/>'],
    ['bowl', 'Pasta bowl', '<circle r="100" fill="#E7E2D8" transform="translate(4 6)"/><circle r="100" fill="#fff" stroke="#D4D4D4" stroke-width="2"/><circle r="72" fill="#F3F0EA" stroke="#E6E1D8" stroke-width="2"/>'],
    ['board', 'Wooden board', '<rect x="-104" y="-82" width="208" height="164" rx="12" fill="#BFA07C" transform="translate(4 6)" opacity=".5"/><rect x="-104" y="-82" width="208" height="164" rx="12" fill="#D9B48A" stroke="#A9835A" stroke-width="2"/><path d="M-90 -50 Q0 -60 90 -48M-92 0 Q0 -8 92 4M-90 46 Q0 40 90 52" fill="none" stroke="#C39A6B" stroke-width="2"/>'],
    ['slate', 'Slate', '<rect x="-104" y="-80" width="208" height="160" rx="6" fill="#2A2D31" transform="translate(4 6)" opacity=".4"/><rect x="-104" y="-80" width="208" height="160" rx="6" fill="#3B3F44" stroke="#2B2E32" stroke-width="2"/>']
  ];
  function wareOf(k) { return WARE.filter(function (w) { return w[0] === k; })[0] || WARE[0]; }

  /* ---------- the drawing ---------- */
  var LIBFOR = { 'Chips': 'chips', 'Burger bun': 'burger-bun', 'Oak leaf': 'lettuce', 'Tomato': 'tomato', 'Sliced cheese': 'cheese-slice', 'Crumbed chicken thigh': 'crumbed-chicken', 'Ranch': 'aioli' };
  var INSIDE = ['Crumbed chicken thigh', 'Sliced cheese', 'Ranch', 'Oak leaf', 'Tomato'];   // drawn as layers of the burger
  var S = { parts: [], sel: -1, undo: [], redo: [], step: 'food', sheet: '', note: false, ware: 'dinner', fine: false, q: '', dirty: false, saved: false, n: 0, layout: 0 };
  function libItem(id) { return ART.lib.filter(function (x) { return x.id === id; })[0]; }
  function drawn() { return ART.parts.map(function (p, k) { return { id: 'p' + k, ing: p.ing, name: p.ing, svg: p.svg, box: p.box.slice(), dx: 0, dy: 0, flip: false, hue: 0 }; }); }
  function pieceFor(id, ing) {
    var it = libItem(id); if (!it) return null;
    var spots = [[-70, 40], [20, -80], [-90, -40], [40, 52], [-30, -92], [60, -20]], s = spots[S.n++ % spots.length];
    return { id: 'n' + S.n, ing: ing || '', name: it.name, svg: it.svg.replace('<svg ', '<svg x="' + s[0] + '" y="' + s[1] + '" width="48" height="48" '), box: [s[0], s[1], 48, 48], dx: 0, dy: 0, flip: false, hue: 0 };
  }
  function nameOf(p) { return p ? (p.ing || p.name) : ''; }
  function snap() { S.undo.push(JSON.stringify(S.parts)); if (S.undo.length > 60) S.undo.shift(); S.redo = []; S.dirty = true; S.saved = false; }
  function missing() {
    var on = {}; S.parts.forEach(function (p) { if (p.ing) on[p.ing] = 1; });
    return ART.ings.filter(function (i) { return !on[i] && !(on['Burger bun'] && INSIDE.indexOf(i) >= 0); });
  }
  function issues() {
    var out = missing().map(function (i) { return { t: i + ' is in the recipe but not on the plate.', a: 'fix-add', v: i, b: 'Add it' }; });
    S.parts.forEach(function (p, k) { if (!p.ing) out.push({ t: p.name + ' has no label, so the Pass cannot name it.', a: 'fix-label', v: k, b: 'Label it' }); });
    return out;
  }
  function centre(p) { return [p.box[0] + p.box[2] / 2 + p.dx, p.box[1] + p.box[3] / 2 + p.dy]; }
  function canvasSVG() {
    var vb = ART.vb.split(' ').map(Number), pad = 6;
    var out = '<svg class="cv" viewBox="' + (vb[0] - pad) + ' ' + (vb[1] - pad) + ' ' + (vb[2] + pad * 2) + ' ' + (vb[3] + pad * 2) + '" preserveAspectRatio="xMidYMid meet" tabindex="0" role="application" aria-roledescription="drawing" aria-label="Chicken Burger on a ' + esc(wareOf(S.ware)[1].toLowerCase()) + ', ' + S.parts.length + ' parts' + (S.sel >= 0 ? ', ' + esc(nameOf(S.parts[S.sel])) + ' picked' : '') + '"><g>' + wareOf(S.ware)[2] + '</g>';
    S.parts.forEach(function (p, k) {
      var c = centre(p), t = 'translate(' + p.dx + ' ' + p.dy + ')' + (p.flip ? ' translate(' + c[0] * 2 + ' 0) scale(-1 1)' : '');
      out += '<g class="part' + (S.sel === k ? ' on' : '') + '" data-part="' + k + '" transform="' + t + '"' + (p.hue ? ' style="filter:hue-rotate(' + p.hue + 'deg)"' : '') + '>' + p.svg + '</g>';
    });
    if (S.sel >= 0 && S.parts[S.sel]) { var p = S.parts[S.sel]; out += '<rect class="selbox" x="' + (p.box[0] + p.dx - 3) + '" y="' + (p.box[1] + p.dy - 3) + '" width="' + (p.box[2] + 6) + '" height="' + (p.box[3] + 6) + '" rx="4"/>'; }
    return out + '</svg>';
  }

  /* ---------- pieces of the page ---------- */
  function topBar() {
    return '<header class="top"><button type="button" class="tb icon" data-a="close" aria-label="Close and go back to the recipe">' + ic('close') + '<span class="w">Close</span></button>' +
      '<div class="ttl"><small>On the plate</small><b>Chicken Burger</b></div>' +
      '<button type="button" class="tb icon" data-a="undo" aria-label="Undo"' + (S.undo.length ? '' : ' disabled') + '>' + ic('undo') + '<span class="w">Undo</span></button>' +
      '<button type="button" class="tb icon" data-a="redo" aria-label="Redo"' + (S.redo.length ? '' : ' disabled') + '>' + ic('redo') + '<span class="w">Redo</span></button>' +
      '<button type="button" class="tb save" data-a="save"' + (S.dirty ? '' : ' disabled') + '>' + (S.dirty || !S.saved ? 'Save' : 'Saved') + '</button></header>';
  }
  function stepsBar() {
    var n = issues().length, sel = S.sheet && S.sheet !== 'add' ? '' : S.step;
    function st(k, num, w) { return '<button type="button" class="step' + (k === 'plate' || (k === 'food' && S.parts.length) ? ' ok' : '') + '" data-a="step" data-v="' + k + '"' + (S.step === k ? ' aria-current="step"' : '') + '><i>' + num + '</i>' + w + (k === 'check' && S.parts.length && n ? ' <span class="n">' + n + '</span>' : '') + '</button>'; }
    return '<nav class="steps" aria-label="Steps">' + st('plate', 1, 'Plate') + st('food', 2, 'Food') + st('check', 3, 'Check') +
      '<button type="button" class="step xtra" data-a="sheet" data-v="extras" aria-label="More tools" aria-expanded="' + (S.sheet === 'extras') + '">' + ic('more') + '</button></nav>';
  }
  function heroHTML() {
    if (S.parts.length || MODE === 'a') return '';   // A: the Food tray leads with it
    return '<div class="hero"><button type="button" class="big" data-a="draw">' + ic('spark') + 'Draw it for me</button><span class="or">The book draws the Chicken Burger from its recipe. Or add the food yourself' + (MODE === 'a' ? ' below.' : ' with Add food.') + '</span></div>';
  }
  function noteHTML() {
    if (!S.note) return '';
    return '<div class="note" role="status">Drawn side by side: the burger and the chips. <button type="button" data-a="undo">Undo</button><button type="button" data-a="again">Try another</button><button type="button" data-a="note-x" aria-label="Close the note">' + '&#10005;' + '</button></div>';
  }
  function pbarA() {
    if (MODE !== 'a' || S.sel < 0) return '';
    function b(a, v, w, k, cls) { return '<button type="button" class="pb' + (cls ? ' ' + cls : '') + '" data-a="' + a + '"' + (v ? ' data-v="' + v + '" aria-expanded="' + (S.sheet === v) + '"' : '') + '>' + ic(k) + w + '</button>'; }
    return '<div class="pbar" role="toolbar" aria-label="' + esc(nameOf(S.parts[S.sel])) + '">' + b('sheet', 'colour', 'Colour', 'colour') + b('sheet', 'label', 'Label', 'label') + b('sheet', 'pmore', 'More', 'more') + b('del', '', 'Delete', 'del', 'del') + b('none', '', 'Done', 'done') + '</div>';
  }
  function ctxB() {
    if (MODE !== 'b') return '';
    function b(a, v, w, k, cls, extra) { return '<button type="button" class="cb' + (cls ? ' ' + cls : '') + '" data-a="' + a + '"' + (v ? ' data-v="' + v + '" aria-expanded="' + (S.sheet === v) + '"' : '') + '>' + ic(k) + w + (extra || '') + '</button>'; }
    if (S.sel >= 0) return '<div class="picked" role="status"><b>' + esc(nameOf(S.parts[S.sel])) + '</b> Drag to move. Pinch or drag the corner to size.</div><nav class="ctx" aria-label="' + esc(nameOf(S.parts[S.sel])) + '">' + b('sheet', 'colour', 'Colour', 'colour') + b('sheet', 'label', 'Label', 'label') + b('sheet', 'pmore', 'More', 'more') + b('del', '', 'Delete', 'del', 'del') + b('none', '', 'Done', 'done', 'done') + '</nav>';
    var n = S.parts.length ? issues().length : 0;
    return '<nav class="ctx" aria-label="Studio">' + b('sheet', 'add', 'Add food', 'add') + b('sheet', 'plate', 'Plate', 'plate') + b('sheet', 'check', 'Check', 'check', '', n ? '<span class="n">' + n + '</span>' : '') + b('sheet', 'extras', 'More', 'more') + '</nav>';
  }

  /* ---------- what each sheet or tray holds ---------- */
  function head(t, close) { return '<div class="ph"><h2 id="ph-h">' + t + '</h2>' + (close === false ? '' : '<button type="button" class="x" data-a="shut" aria-label="Close">' + ic('close') + '</button>') + '</div>'; }
  function plateTiles() { return WARE.map(function (w) { return '<button type="button" class="tile" data-a="ware" data-v="' + w[0] + '" aria-pressed="' + (S.ware === w[0]) + '"><svg viewBox="-112 -112 224 224" aria-hidden="true">' + w[2] + '</svg>' + w[1] + '</button>'; }).join(''); }
  function plateBody(inTray) {
    return (inTray ? '<div class="scroll-row">' + plateTiles().replace(/class="tile"/g, 'class="tile" style="flex:none;width:108px"') + '</div>' : '<p class="hint">The food stays where it is.</p><div class="tiles" style="margin-top:10px">' + plateTiles() + '</div>') +
      '<div class="grp"><button type="button" class="btn quiet" data-a="fine" aria-expanded="' + S.fine + '">' + (S.fine ? 'Hide the fine detail' : 'Size, rim, finish and colour') + '</button>' +
      (S.fine ? '<div class="fine"><label>Shape<select id="f-shape"><option>Round</option><option>Oval</option><option>Square</option><option>Rectangle</option><option>Organic</option></select></label><label>Size (cm)<select id="f-size"><option>30</option><option>27</option><option>24</option><option>32</option></select></label><label>Rim<select id="f-rim"><option>Wide</option><option>Narrow</option><option>Coupe</option><option>Raised</option></select></label><label>Finish<select id="f-fin"><option>Gloss</option><option>Glaze</option><option>Speckled</option><option>Rustic</option><option>Enamel</option></select></label><label>Colour<select id="f-col"><option>White</option><option>Cream</option><option>Charcoal</option><option>Sage</option></select></label></div><label class="row" style="align-items:center;gap:10px;font-weight:600"><input type="checkbox" id="f-fit" checked style="width:22px;height:22px"> Fit the food to a new size</label><button type="button" class="btn quiet" data-a="toast" data-v="Saved as one of your servingware pieces (example)">Save this servingware</button>' : '') + '</div>';
  }
  function chipsMissing() {
    var m = missing();
    return m.length ? m.map(function (i) { return '<button type="button" class="chip add" data-a="add-ing" data-v="' + esc(i) + '">' + esc(i) + '</button>'; }).join('') : '';
  }
  function libTiles() {
    var q = S.q.trim().toLowerCase();
    var list = ART.lib.filter(function (x) { return !q || x.name.toLowerCase().indexOf(q) >= 0; });
    return list.length ? '<div class="tiles">' + list.map(function (x) { return '<button type="button" class="tile" data-a="add-lib" data-v="' + esc(x.id) + '">' + x.svg.replace('<svg ', '<svg aria-hidden="true" ') + esc(x.name) + '</button>'; }).join('') + '</div>' : '<p class="hint">No drawing called that. Try a shorter word.</p>';
  }
  function addBody() {
    var m = chipsMissing();
    return (m ? '<div class="grp"><span class="label">In this recipe, not on the plate yet</span><div class="row">' + m + '</div></div>' : '<div class="allok" style="margin-top:8px">' + ic('check') + 'Every ingredient is on the plate.</div>') +
      '<div class="grp"><label class="label" for="q">Find a drawing</label><input id="q" class="search" type="search" placeholder="For example: lemon wedge, aioli" value="' + esc(S.q) + '" data-a-input="q">' + libTiles() + '</div>' +
      '<div class="grp"><span class="label">Other ways to start</span><div class="row"><button type="button" class="btn quiet" data-a="toast" data-v="Starts from a copy of the book\'s own drawing (example)">Copy the book\'s drawing</button><button type="button" class="btn quiet" data-a="toast" data-v="Choose an SVG file: plain shapes, 100 kB at most (example)">Import a drawing (SVG)</button></div></div>';
  }
  function foodTray() {
    if (!S.parts.length) return '<div class="lead"><button type="button" class="btn go" data-a="draw">' + ic('spark') + 'Draw it for me</button><span class="hint">or add one at a time</span></div><div class="grp"><div class="scroll-row">' + chipsMissing() + '</div></div><div class="grp"><button type="button" class="btn quiet" data-a="sheet" data-v="add">Find a drawing in the library</button></div>';
    var m = chipsMissing();
    return (m ? '<div class="grp"><span class="label">Not on the plate yet</span><div class="scroll-row">' + m + '</div></div>' : '<div class="allok">' + ic('check') + 'Every ingredient is on the plate. Tap a part to change it.</div>') +
      '<div class="grp"><button type="button" class="btn quiet" data-a="sheet" data-v="add">' + ic('add') + 'Add something else</button></div>';
  }
  function checkBody() {
    if (!S.parts.length) return '<p class="hint">Nothing drawn yet. ' + (MODE === 'a' ? 'Start at Food.' : 'Start with Draw it for me.') + '</p>';
    var is = issues();
    return (is.length ? is.map(function (x) { return '<div class="issue"><span>' + esc(x.t) + '</span><button type="button" class="btn" data-a="' + x.a + '" data-v="' + esc(x.v) + '">' + x.b + '</button></div>'; }).join('') : '<div class="allok">' + ic('check') + 'Every ingredient is on the plate and every part has its label.</div>') +
      '<div class="grp"><button type="button" class="btn dark" data-a="save"' + (S.dirty ? '' : ' disabled') + '>' + (S.dirty ? 'Save the drawing' : 'Saved') + '</button><p class="hint">Saving makes the Pass labels from the parts: one per ingredient, with its allergens.</p></div>';
  }
  function tool(a, v, k, w, cls) { return '<button type="button" class="tool' + (cls ? ' ' + cls : '') + '" data-a="' + a + '"' + (v !== '' && v != null ? ' data-v="' + esc(v) + '"' : '') + '>' + ic(k) + w + '</button>'; }
  function extrasBody() {
    return '<div class="grp"><span class="label">Draw it for me</span><div class="tools">' + tool('draw', '', 'spark', S.parts.length ? 'Draw again' : 'Draw it for me') + tool('again', '', 'reuse', 'Try another layout') + tool('tidy', '', 'tidy', 'Tidy up') + tool('toast', 'Plating style: Classic, Clock, Stack or Scatter (example)', 'style', 'Plating style') + '</div></div>' +
      '<div class="grp"><span class="label">Draw by hand</span><div class="tools">' + tool('toast', 'Tap the plate to place the words (example)', 'text', 'Text') + tool('toast', 'Drag on the plate to draw a line (example)', 'line', 'Line') + tool('toast', 'Drag on the plate to draw an arrow (example)', 'arrow', 'Arrow') + tool('toast', 'Drag on the plate to draw a box (example)', 'box', 'Box') + tool('toast', 'Drag on the plate to draw an oval (example)', 'oval', 'Oval') + '</div></div>' +
      '<div class="grp"><span class="label">Pick and place</span><div class="tools">' + tool('sheet', 'parts', 'list', 'Parts list') + tool('toast', 'Pick several: tap each part, then move them together (example)', 'many', 'Pick several') + tool('toast', 'Snap to centre is on (example)', 'snap', 'Snap to centre') + '</div></div>' +
      '<div class="grp"><span class="label">Keep and reuse</span><div class="tools">' + tool('toast', 'Saved as a template (example)', 'tpl', 'Save as a template') + tool('toast', 'Choose the recipe to give this drawing to (example)', 'reuse', 'Use for another recipe') + '</div></div>';
  }
  function partsBody() {
    return S.parts.length ? S.parts.map(function (p, k) { return '<button type="button" class="ing" data-a="pick" data-v="' + k + '" aria-pressed="' + (S.sel === k) + '" style="margin-top:8px">' + (k + 1) + '. ' + esc(nameOf(p)) + (p.ing ? '' : ' <span class="hint">(no label)</span>') + '</button>'; }).join('') : '<p class="hint">Nothing on the plate yet.</p>';
  }
  var HUES = [0, 40, 90, 150, 200, 260, 320];
  function colourBody(p) {
    return '<p class="hint">Change the colour of ' + esc(nameOf(p)) + '. Undo puts it back.</p><div class="row" style="margin-top:10px">' + HUES.map(function (h) { return '<button type="button" class="sw" data-a="hue" data-v="' + h + '" aria-label="Colour ' + (h ? h + ' degrees round' : 'as drawn') + '" aria-pressed="' + (p.hue === h) + '" style="background:#D99A50;filter:hue-rotate(' + h + 'deg)"></button>'; }).join('') + '</div>';
  }
  function labelBody(p) {
    return '<p class="hint">The Pass label for this part comes from its ingredient: name, amount and allergens.</p><div class="grp">' + ART.ings.map(function (i) { return '<button type="button" class="ing" data-a="set-ing" data-v="' + esc(i) + '" aria-pressed="' + (p.ing === i) + '">' + esc(i) + '</button>'; }).join('') + '</div>' +
      '<div class="grp"><button type="button" class="btn quiet" data-a="toast" data-v="Shows other drawings of ' + esc(nameOf(p)) + ' to swap in (example)">' + ic('swap') + 'Swap for another drawing</button></div>';
  }
  function pmoreBody(p) {
    return '<div class="grp"><span class="label">Arrange</span><div class="tools">' + tool('order', 'front', 'front', 'To the front') + tool('order', 'up', 'up', 'Forward') + tool('order', 'down', 'down', 'Backward') + tool('order', 'back', 'back', 'To the back') + '</div></div>' +
      '<div class="grp"><span class="label">Change</span><div class="tools">' + tool('dup', '', 'dup', 'Duplicate') + tool('flip', '', 'flip', 'Flip') + tool('toast', 'Drag the corner to stretch one side (example)', 'stretch', 'Stretch') + (/burger/i.test(nameOf(p)) ? tool('toast', 'The burger splits into its layers (example)', 'split', 'Split into pieces') : '') + tool('toast', 'Shows other drawings to swap in (example)', 'swap', 'Swap drawing') + '</div></div>' +
      '<div class="grp"><span class="label">Keep</span><div class="tools">' + tool('toast', 'Saved to your library (example)', 'keep', 'Save as a library piece') + '</div></div>';
  }
  function panelHTML() {
    var p = S.parts[S.sel], k = S.sheet;
    if (k === 'colour' && p) return head('Colour') + colourBody(p);
    if (k === 'label' && p) return head('Which ingredient is this?') + labelBody(p);
    if (k === 'pmore' && p) return head(esc(nameOf(p))) + pmoreBody(p);
    if (k === 'add') return head('Add food') + addBody();
    if (k === 'plate') return head('Plate, bowl or board') + plateBody(false);
    if (k === 'check') return head('Check the drawing') + checkBody();
    if (k === 'extras') return head('More tools') + extrasBody();
    if (k === 'parts') return head('Parts') + partsBody();
    if (MODE === 'a') {   // the step's own tray
      if (S.step === 'plate') return head('What it sits on', false) + plateBody(true);
      if (S.step === 'check') return head('Check and save', false) + checkBody();
      return head(S.parts.length ? 'The food' : 'Put the food on', false) + foodTray();
    }
    return '';
  }

  /* ---------- draw the page ---------- */
  var app = document.getElementById('app'), toastEl, toastT;
  function toast(m) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.hidden = false; toastEl.textContent = m; clearTimeout(toastT); toastT = setTimeout(function () { toastEl.hidden = true; }, 3200);
  }
  function render(focusSel) {
    var panel = panelHTML();
    app.className = 'studio ' + MODE;
    app.innerHTML = topBar() + (MODE === 'a' ? stepsBar() : '') +
      '<div class="work"><div class="stage">' + canvasSVG() + '<button type="button" class="fit" data-a="toast" data-v="Pinch or scroll to zoom. Fit shows the whole plate.">Fit</button>' + heroHTML() + noteHTML() + pbarA() + '</div>' +
      (panel ? '<section class="panel' + (MODE === 'a' && !S.sheet ? ' tray' : '') + '" aria-labelledby="ph-h">' + panel + '</section>' : '') + (MODE === 'b' ? '' : '') + '</div>' + ctxB();
    placeBar();
    if (focusSel) { var f = $(focusSel); if (f) f.focus(); }
  }
  // the part's bar (A) sits just above the part, inside the canvas, never under a tray
  function placeBar() {
    var bar = $('.pbar'); if (!bar) return;
    var st = $('.stage'), g = $('[data-part="' + S.sel + '"]'); if (!g) return;
    var s = st.getBoundingClientRect(), r = g.getBoundingClientRect(), h = bar.offsetHeight, w = bar.offsetWidth;
    var top = r.top - s.top - h - 12; if (top < 8) top = Math.min(s.height - h - 8, r.bottom - s.top + 12);
    bar.style.top = Math.max(8, top) + 'px';
    bar.style.left = Math.max(8, Math.min(s.width - w - 8, (r.left + r.right) / 2 - s.left - w / 2)) + 'px';
  }
  window.addEventListener('resize', placeBar);

  /* ---------- what the taps do ---------- */
  function act(a, v, el) {
    var p = S.parts[S.sel];
    switch (a) {
      case 'draw': snap(); S.parts = drawn(); S.sel = -1; S.note = true; S.sheet = ''; S.layout = 0; if (MODE === 'a') S.step = 'food'; render(); return;
      case 'again': snap(); S.layout = 1 - S.layout; S.parts.forEach(function (q) { var c = q.box[0] + q.box[2] / 2; q.dx = S.layout ? -2 * c : 0; q.dy = 0; }); render(); return;
      case 'tidy': snap(); S.parts.forEach(function (q) { q.dx = 0; q.dy = 0; }); toast('Tidied: everything back on the plate, nothing you placed moved'); render(); return;
      case 'note-x': S.note = false; render(); return;
      case 'undo': if (!S.undo.length) return; S.redo.push(JSON.stringify(S.parts)); S.parts = JSON.parse(S.undo.pop()); S.sel = -1; S.note = false; S.dirty = true; render(); return;
      case 'redo': if (!S.redo.length) return; S.undo.push(JSON.stringify(S.parts)); S.parts = JSON.parse(S.redo.pop()); S.sel = -1; S.dirty = true; render(); return;
      case 'save': if (!S.dirty) return; S.dirty = false; S.saved = true; S.note = false; toast('Saved. Version 2. The Pass labels follow the parts.'); render(); return;
      case 'close': toast('Back to Chicken Burger. A drawing not saved stays as a draft.'); return;
      case 'step': S.step = v; S.sheet = ''; render('.step[data-v="' + v + '"]'); return;
      case 'sheet': S.sheet = S.sheet === v ? '' : v; if (v !== 'add') S.q = ''; render(S.sheet ? '.panel .ph h2' : null); var hh = $('.panel .ph h2'); if (hh) { hh.setAttribute('tabindex', '-1'); hh.focus(); } return;
      case 'shut': S.sheet = ''; render(); return;
      case 'ware': snap(); S.ware = v; render('[data-a="ware"][data-v="' + v + '"]'); return;
      case 'fine': S.fine = !S.fine; render('[data-a="fine"]'); return;
      case 'add-ing': var pc = pieceFor(LIBFOR[v], v); if (pc) { snap(); S.parts.push(pc); S.sel = S.parts.length - 1; S.note = false; if (MODE === 'b') S.sheet = ''; } render(); return;
      case 'add-lib': var pl = pieceFor(v, ''); if (pl) { snap(); S.parts.push(pl); S.sel = S.parts.length - 1; S.note = false; S.sheet = ''; } render(); return;
      case 'pick': S.sel = +v; S.sheet = ''; render(); return;
      case 'none': S.sel = -1; S.sheet = ''; render(); return;
      case 'del': if (!p) return; snap(); S.parts.splice(S.sel, 1); S.sel = -1; S.sheet = ''; toast(nameOf(p) + ' taken off. Undo puts it back.'); render(); return;
      case 'hue': if (!p) return; snap(); p.hue = +v; render('[data-a="hue"][data-v="' + v + '"]'); return;
      case 'set-ing': if (!p) return; snap(); p.ing = v; render('[data-a="set-ing"][data-v="' + v + '"]'); return;
      case 'order': if (!p) return; snap(); var k = S.sel, to = v === 'front' ? S.parts.length - 1 : v === 'back' ? 0 : v === 'up' ? Math.min(S.parts.length - 1, k + 1) : Math.max(0, k - 1); S.parts.splice(k, 1); S.parts.splice(to, 0, p); S.sel = to; toast(nameOf(p) + (v === 'front' || v === 'up' ? ' moved forward' : ' moved back')); render(); return;
      case 'dup': if (!p) return; snap(); var c = JSON.parse(JSON.stringify(p)); c.id += 'c'; c.dx += 14; c.dy += 14; S.parts.push(c); S.sel = S.parts.length - 1; render(); return;
      case 'flip': if (!p) return; snap(); p.flip = !p.flip; render(); return;
      case 'fix-add': act('add-ing', v); return;
      case 'fix-label': S.sel = +v; S.sheet = 'label'; render(); return;
      case 'toast': toast(v); return;
    }
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
    act(b.getAttribute('data-a'), b.getAttribute('data-v'), b);
  });
  document.addEventListener('input', function (e) {
    if (e.target.getAttribute('data-a-input') === 'q') { S.q = e.target.value; var host = e.target.parentNode, old = host.querySelector('.tiles, p.hint'); var tmp = document.createElement('div'); tmp.innerHTML = libTiles(); if (old) old.replaceWith(tmp.firstChild); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (S.sheet) { S.sheet = ''; render(); } else if (S.sel >= 0) { S.sel = -1; render(); } else if (S.note) { S.note = false; render(); } return; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && S.sel >= 0 && !/INPUT|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); act('del'); }
  });
  // pick and drag on the canvas; a tap on the plate lets go
  var drag = null;
  document.addEventListener('pointerdown', function (e) {
    var svg = e.target.closest && e.target.closest('svg.cv'); if (!svg) return;
    var g = e.target.closest('[data-part]');
    if (!g) { if (S.sel >= 0) { S.sel = -1; if (/colour|label|pmore/.test(S.sheet)) S.sheet = ''; render(); } return; }
    var k = +g.getAttribute('data-part'), m = svg.getScreenCTM();
    drag = { k: k, x: e.clientX, y: e.clientY, dx: S.parts[k].dx, dy: S.parts[k].dy, s: m ? m.a : 1, moved: false };
    if (S.sel !== k) { S.sel = k; S.note = false; if (/colour|label|pmore/.test(S.sheet)) S.sheet = ''; }
  });
  document.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var p = S.parts[drag.k], nx = drag.dx + (e.clientX - drag.x) / drag.s, ny = drag.dy + (e.clientY - drag.y) / drag.s;
    if (!drag.moved && Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) < 4) return;
    if (!drag.moved) { snap(); drag.moved = true; }
    p.dx = Math.round(nx); p.dy = Math.round(ny);
    var g = document.querySelector('[data-part="' + drag.k + '"]'); if (g) { var c = centre(p); g.setAttribute('transform', 'translate(' + p.dx + ' ' + p.dy + ')' + (p.flip ? ' translate(' + c[0] * 2 + ' 0) scale(-1 1)' : '')); }
    var sb = document.querySelector('.selbox'); if (sb) { sb.setAttribute('x', p.box[0] + p.dx - 3); sb.setAttribute('y', p.box[1] + p.dy - 3); }
  });
  document.addEventListener('pointerup', function () { if (drag) { drag = null; render(); } });

  // a start state can be asked for in the address: #drawn, #picked, #plate, #check, #more, #add
  function start() {
    var h = (location.hash || '').slice(1);
    if (h && h !== 'new') { S.parts = drawn(); S.undo = ['[]']; S.dirty = true; }
    if (h === 'drawn') S.note = true;
    if (h === 'picked' || h === 'pmore' || h === 'colour') S.sel = 1;
    if (h === 'pmore' || h === 'colour') S.sheet = h;
    if (h === 'plate') { if (MODE === 'a') S.step = 'plate'; else S.sheet = 'plate'; }
    if (h === 'check') { S.parts.push(pieceFor('lemon-wedge', '')); if (MODE === 'a') S.step = 'check'; else S.sheet = 'check'; }
    if (h === 'more') S.sheet = 'extras';
    if (h === 'add') { S.parts = []; S.sheet = MODE === 'b' ? 'add' : ''; }
    render();
  }
  start();
})();
