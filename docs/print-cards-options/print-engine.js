/* Print recipe cards: preview engine for the council (not loaded by the book).
   Builds each card into fixed paper sheets. Every sheet repeats the card number, name, page x of y,
   the allergens, the print time and "Check the book for the latest", so a page that is separated
   from the rest still says what it is. A list is never cut through a row or a step: it continues
   under a "(continued)" heading. Amounts are always the recipe's base amounts. */
(function () {
  var D = window.LK_DATA, ART = window.LK_ART, byId = {};
  D.recipes.forEach(function (r) { byId[r.id] = r; });
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // [square brackets] are unconfirmed: they print as "To come" in words, never blank
  function txt(s) { return esc(s).replace(/\[([^\]]*)\]/g, function (m, x) { x = x.replace(/\s*to come\s*$/i, ''); return '<span class="tc">To come</span>' + (/^qty$/i.test(x) || !x ? '' : ' <i>' + x.charAt(0).toLowerCase() + x.slice(1) + '</i>'); }); }
  var KIND = { main: 'Main', snack: 'Snack', side: 'Side', dessert: 'Dessert', batch: 'Batch recipe', component: 'Component' };

  /* allergens: the card's own list, else worked out from the ingredient tags and the recipes it uses */
  function allergens(r, seen) {
    seen = seen || {}; if (seen[r.id]) return {}; seen[r.id] = 1;
    var out = {};
    function add(a, maybe) { a = a.replace(/\?$/, ''); if (!out[a] || out[a] === 'may') out[a] = maybe ? (out[a] || 'may') : 'yes'; }
    if (r.contains || r.check) { (r.contains || []).forEach(function (c) { add(c.allergen, false); }); (r.check || []).forEach(function (c) { add(c.allergen, true); }); }
    (r.ingredients || []).forEach(function (i) {
      (i.tags || []).forEach(function (t) { add(t, /\?$/.test(t)); });
      if (i.link && byId[i.link]) { var sub = allergens(byId[i.link], seen); Object.keys(sub).forEach(function (a) { add(a, sub[a] === 'may'); }); }
    });
    return out;
  }
  function missing(r) { return (r.ingredients || []).filter(function (i) { return i.link && !byId[i.link]; }).map(function (i) { return i.name; }); }
  function allergenLine(r) {
    var a = allergens(r), keys = D.allergens.filter(function (k) { return a[k]; });
    // definite first, then "May contain:" as its own sentence, so a "may" never reads onto a definite allergen
    var yes = keys.filter(function (k) { return a[k] !== 'may'; }), may = keys.filter(function (k) { return a[k] === 'may'; });
    var s = keys.length ? (yes.length ? 'Contains: ' + yes.join(', ') + '.' : '') + (may.length ? (yes.length ? ' ' : '') + 'May contain: ' + may.join(', ') + '.' : '') : 'None in the ingredients.';
    if (missing(r).length) s += ' Not complete: ' + missing(r).join(', ') + ' has no card yet, so treat it as possibly any allergen.';
    return s;
  }
  function art(r, cls) {
    var pl = r.art && ART.plates[r.art], pan = r.art && ART.pans[r.art];
    if (!pl && !pan) return '';
    var vb = pl ? '2 16 212 212' : '0 0 200 140', pins = '';
    if (pl && r.pins && r.pins.length) {
      pins = r.pins.map(function (p, n) {
        var x = 2 + p.x * 2.12, y = 16 + p.y * 2.12;
        return '<circle cx="' + x + '" cy="' + y + '" r="10" fill="#1c1d1f"/><text x="' + x + '" y="' + (y + 5) + '" text-anchor="middle" font-size="14" font-weight="700" fill="#fff" font-family="Barlow, sans-serif">' + (n + 1) + '</text>';
      }).join('');
    }
    return '<svg class="' + cls + '" viewBox="' + vb + '" aria-hidden="true">' + (pl || pan) + pins + '</svg>';
  }
  function pinItems(r) {
    return (r.pins || []).map(function (p, n) { return '<div class="pin"><b>' + (n + 1) + '</b><span><b>' + esc(p.label) + '</b>' + (p.note ? ' ' + txt(p.note) : '') + '</span></div>'; });
  }
  function ingItems(r) {
    return (r.ingredients || []).map(function (i) {
      var linked = i.link && byId[i.link];
      return '<div class="ing"><span class="q">' + (i.q === '[Qty]' ? '<span class="tc">To come</span>' : txt(i.q)) + '</span><span class="n">' + txt(i.name) +
        (linked ? ' <span class="ref">card ' + esc(linked.no) + '</span>' : i.link ? ' <span class="ref">card to come</span>' : '') +
        (i.note ? '<span class="note">' + txt(i.note) + '</span>' : '') + '</span></div>';
    });
  }

  /* A card as blocks. lane "side" = drawing and safety boxes; "main" = ingredients and method.
     items: a list that may break between rows; head: its heading, repeated with "(continued)". */
  function blocks(r) {
    var b = [];
    var drawing = art(r, 'art');
    if (drawing) b.push({ lane: 'side', key: 'art', html: '<div class="blk artb"><div class="h">' + (ART.plates[r.art] ? 'On the plate' : 'In the pan') + '</div>' + drawing + '</div>' });
    if (r.pins && r.pins.length) b.push({ lane: 'side', key: 'pins', head: 'Plate key', items: pinItems(r) });
    b.push({ lane: 'main', key: 'ing', head: 'Ingredients', items: ingItems(r) });
    // the stacked view from the side, with its own labels: in the wide column, sized so the labels keep the type floor
    var sv = ART.sides && (r.side && r.side.charAt(0) === '@' ? ART.sides[r.side] : ART.sides[r.id]);
    // a drawing wider than the usual 232 units needs the whole page width: it takes its own full-width spot
    if (sv) b.push({ lane: (+sv.viewBox.split(' ')[2] || 232) > 300 ? 'full' : 'main', key: 'sideview', html: '<div class="blk sidev"><div class="h">From the side</div><svg viewBox="' + esc(sv.viewBox) + '" style="--vbw:' + (+sv.viewBox.split(' ')[2] || 232) + '" aria-hidden="true">' + sv.body + '</svg></div>' });
    if (r.safety) b.push({ lane: 'side', key: 'safety', html: '<div class="blk safety"><div class="h">' + esc(r.safety.title) + '</div>' + txt(r.safety.text) + '</div>' });
    if (r.tip) b.push({ lane: 'side', key: 'tip', html: '<div class="blk tip"><div class="h">' + esc(r.tip.title) + '</div>' + txt(r.tip.text) + '</div>' });
    if (!(r.sections || []).length) b.push({ lane: 'main', key: 'm', html: '<div class="blk"><div class="h">Method</div>Not written up yet. Ask the head chef or sous chef.</div>' });
    (r.sections || []).forEach(function (s, si) {
      var n = 0;
      b.push({ lane: 'main', key: 'm' + si, head: s.title || 'Method', ol: true, items: (s.steps || []).map(function (t) { n++; return '<div class="st"><b>' + n + '</b><span>' + txt(t) + '</span></div>'; }) });
    });
    return b;
  }
  function title(r, big) {
    return '<div class="ttl' + (big ? ' big' : '') + '"><div class="eb">' + esc(KIND[r.kind] + ' · ' + r.forLine) + '</div><div class="nm">' + esc(r.name) + '</div>' +
      (big ? '<div class="yl">' + txt(r.yield) + '</div>' + (r.menu ? '<div class="mn"><b>On the menu:</b> ' + esc(r.menu) + '</div>' : '') : '') + '</div>';
  }

  /* Paper sizes in mm. */
  var PAPER = { a4p: [210, 297, 'A4 portrait'], a4l: [297, 210, 'A4 landscape'], a5p: [148, 210, 'A5 portrait'], a5l: [210, 148, 'A5 landscape'] };

  /* Layout templates. Each returns the regions of page 1 and of every later page. A region takes blocks of the lanes it lists. */
  var LAYOUT = {
    // A: the screen card, in the same order, one column (two text columns on landscape)
    a: { first: function (p) { return [{ cls: 'r-main' + (p.land ? ' cols' : ''), lanes: ['full', 'side', 'main'], seq: true }]; }, next: function (p) { return [{ cls: 'r-main' + (p.land ? ' cols' : ''), lanes: ['full', 'side', 'main'], seq: true }]; }, order: ['art', 'pins', 'ing', 'sideview', 'm', 'safety', 'tip'] },
    // B: a paper card: drawing, plate key and boxes in a side column; ingredients then method in the wide column
    b: { first: function (p) { return [{ cls: 'r-side', lanes: ['side'] }, { cls: 'r-wide' + (p.land ? ' cols' : ''), lanes: ['full', 'main'] }]; }, next: function (p) { return [{ cls: 'r-main' + (p.land || p.paper === 'a4p' ? ' cols' : ''), lanes: ['full', 'side', 'main'] }]; } },
    // Mix: B's paper card with C's bigger ingredient type and a boxed allergen band on every page
    m: { first: function (p) { return [{ cls: 'r-side', lanes: ['side'] }, { cls: 'r-wide' + (p.land ? ' cols' : ''), lanes: ['main'] }]; }, next: function (p) { return [{ cls: 'r-main' + (p.land || p.paper === 'a4p' ? ' cols' : ''), lanes: ['full', 'side', 'main'] }]; } },
    // C: a station card: page 1 is for reading at arm's length (big ingredients, drawing, allergens big);
    //    the method follows in small two-column type, so it starts on page 1 only if there is room
    c: { first: function (p) { return [{ cls: 'r-big', lanes: ['ingbig'] }, { cls: 'r-side', lanes: ['side'] }, { cls: 'r-low cols', lanes: ['full', 'main'] }]; }, next: function (p) { return [{ cls: 'r-main cols small', lanes: ['full', 'side', 'main', 'ingbig'] }]; }, bigIng: true }
  };

  var splitIng = false;
  function overflow(el) {
    if (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) return true;
    // 6 px headroom under the last block: the final draw can round a little taller than the measure
    var last = el.lastElementChild; if (!last) return false;
    var cols = parseInt(getComputedStyle(el).columnCount, 10) > 1;
    return !cols && last.getBoundingClientRect().bottom > el.getBoundingClientRect().bottom - 6;
  }
  function itemsHTML(b, items, cont) { return '<div class="blk lst' + (b.lane === 'ingbig' ? ' big' : '') + '"><div class="h">' + esc(b.head) + (cont ? ' <i>(continued)</i>' : '') + '</div>' + items.join('') + '</div>'; }

  /* Paginate one card. Returns an array of page bodies (HTML). */
  function paginate(r, opt, host) {
    var L = LAYOUT[opt.layout], p = { paper: opt.paper, land: /l$/.test(opt.paper) };
    var q = blocks(r);
    if (L.bigIng) q.forEach(function (b) { if (b.key === 'ing') b.lane = 'ingbig'; });
    if (L.order) q.sort(function (x, y) { return L.order.indexOf(x.key.replace(/\d+$/, '')) - L.order.indexOf(y.key.replace(/\d+$/, '')); });
    var pages = [], guard = 0; splitIng = false;
    while (q.length && guard++ < 40) {
      var first = !pages.length, regs = (first ? L.first : L.next)(p);
      host.innerHTML = sheetHTML(r, opt, first, 1, 1, regs.map(function (g) { return '<div class="reg ' + g.cls + '"></div>'; }).join(''));
      var els = host.querySelectorAll('.reg');
      regs.forEach(function (g, gi) {
        var el = els[gi];
        for (var k = 0; k < q.length; k++) {
          var b = q[k];
          if (g.lanes.indexOf(b.lane) < 0) { if (g.seq) break; continue; }
          var before = el.innerHTML;
          if (!b.items) {
            el.insertAdjacentHTML('beforeend', b.html);
            if (overflow(el) && before) { el.innerHTML = before; if (g.seq) break; continue; }
            q.splice(k--, 1); continue;
          }
          var fit = 0;
          for (var n = 1; n <= b.items.length; n++) {
            el.innerHTML = before + itemsHTML(b, b.items.slice(0, n), b.cont);
            if (overflow(el)) break; fit = n;
          }
          // nothing fits in a region that already holds something: leave it for the next region
          // a short method section (4 steps or fewer) moves whole rather than splitting
          if (before && fit < b.items.length && /^m\d/.test(b.key) && b.items.length <= 4 && !b.cont) fit = 0;
          if (!fit && before) { el.innerHTML = before; if (g.seq) break; continue; }
          if (!fit) fit = 1;
          el.innerHTML = before + itemsHTML(b, b.items.slice(0, fit), b.cont);
          if (fit < b.items.length) { if (b.key === 'ing') splitIng = true; b.items = b.items.slice(fit); b.cont = true; if (g.seq) break; }
          else q.splice(k--, 1);
        }
      });
      // a side region left empty on page 1 is dropped so the wide column takes the page
      pages.push(Array.prototype.map.call(els, function (el) { return el.innerHTML ? el.outerHTML : ''; }).join(''));
    }
    return pages;
  }
  function stamp(opt) { return opt.layout === 'm' ? 'Printed ' + opt.when + '. Amounts as written in the book (x1). Check the book for the latest.' : 'Printed ' + opt.when + '. Base amounts. Check the book for the latest.'; }
  function sheetHTML(r, opt, first, n, of, body) {
    var P = PAPER[opt.paper];
    return '<section class="sheet ' + opt.paper + ' lay-' + opt.layout + (opt.fit ? ' fit' + opt.fit : '') + '" style="width:' + P[0] + 'mm;height:' + P[1] + 'mm">' +
      '<header class="run"><span class="no">' + esc(r.no) + '</span>' + (first ? title(r, true) : title(r, false)) + '<span class="pg">Page ' + n + ' of ' + of + '</span></header>' +
      (opt.layout === 'm' ? '<div class="algband"><b>Allergens</b> ' + esc(allergenLine(r)) + '</div>' : '') +
      '<div class="body">' + body + '</div>' +
      '<footer class="foot">' + (opt.layout === 'm' ? '' : '<div class="alg"><b>Allergens</b> ' + esc(allergenLine(r)) + '</div>') + '<div class="stp">' + esc(stamp(opt)) + '</div></footer></section>';
  }
  /* Build every chosen card. Each card starts on a new sheet. */
  function build(ids, opt, out) {
    var host = document.createElement('div'); host.className = 'measure'; document.body.appendChild(host);
    var html = [], count = 0, per = {}, fits = {}, split = [];
    ids.forEach(function (id) {
      var r = byId[id]; if (!r) return;
      /* Fit before splitting: slightly smaller type first (never below about 8.5 pt on A4, 7.9 pt on A5).
         The first size that fits one page wins; else the first that keeps the ingredients together on page 1. */
      var tiers = opt.layout === 'm' || /^a5/.test(opt.paper) ? [0, 1] : [0, 1, 2], best = null;
      for (var t = 0; t < tiers.length; t++) {
        var o = Object.assign({}, opt, { fit: tiers[t] }), pg = paginate(r, o, host), whole = !splitIng;
        var cand = { o: o, pages: pg, whole: whole };
        if (pg.length === 1) { best = cand; break; }
        if (!best || (whole && !best.whole)) best = cand;
      }
      per[id] = best.pages.length; fits[best.o.fit] = (fits[best.o.fit] || 0) + 1; if (!best.whole) split.push(id);
      best.pages.forEach(function (b, i) { html.push(sheetHTML(r, best.o, i === 0, i + 1, best.pages.length, b)); count++; });
    });
    host.remove(); out.innerHTML = html.join('');
    return { sheets: count, per: per, fits: fits, splitIngredients: split };
  }
  window.PC = { build: build, PAPER: PAPER, byId: byId };
})();
