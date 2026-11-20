/*
  AVC Live card reader (19 Nov 2026, owner; docs/second-venue-options/brief.md, build step 4, the reader only): reads the
  text of an AVC Live "Print Recipe" PDF (Chrome's print of the page) into a recipe draft: the recipe's name, its AVC name,
  the group as a hint, the portions, the yield, and each ingredient's name and amount. Nothing in the book loads this file
  yet. Later it loads only for an authorised chef who chooses an AVC card (never in SHELL), and the draft is saved hidden
  from staff until the head chef has checked it (the review card, build step 5).
  Shared: the phone (window.LK_AVC) and node (tests/avc-reader.test.js).

  Money and codes (owner's AVC rules: ingredients and quantities only). The card also carries prices, costs, GP, supplier
  and product codes, the AVC recipe number and the site number. This file reads only five things: the name at the top,
  the Recipe Group and Recipe Portions values, the Product and Quantity/UOM columns, and the "This batch makes" line. Of
  the Supplier column it asks one question only: does a row start "Batch Recipes" (a house batch, which needs a link)?
  Nothing else is read, kept or returned. Code-like text inside a product name (`# 12345`, a long number, `_bfbr`) is
  taken out and the line is flagged; a last check refuses the whole card if anything that looks like money or a code is
  still in the result.

  Fails closed: a card that does not fit the layout exactly gives { ok: false, why } and no recipe. Each ingredient is
  one quantity in the Quantity/UOM column with the block of product lines centred on it (the card centres every cell in
  its row); a quantity without its name, a name without its quantity, or a quantity it cannot read stops the card. A
  message names the row by number, never a cell from it.

  Never guesses: the kind is always left for the chef (one real card's group was "PLEASE SELECT"), every ingredient's
  allergens are not checked (AVC cards have none), a house batch has no link until the chef picks it, and a unit the
  book does not know keeps its amount in [square brackets].
*/
(function () {
  'use strict';
  var AMT = typeof module === 'object' && module.exports ? require('./amounts.js') : window.LK_AMT;
  var MAX_PAGES = 6, MAX_ITEMS = 4000, MAX_ROWS = 80, MAX_TEXT = 200;
  var UOM = { GRAMS: 'g', GRAM: 'g', KILOGRAMS: 'kg', KILOGRAM: 'kg', MLS: 'ml', ML: 'ml', MILLILITRES: 'ml', LITRES: 'L', LITRE: 'L', EACH: '', PORTION: 'portion', PORTIONS: 'portion', PACKET: 'packet', PACKETS: 'packet', PKT: 'packet' };
  // a pack size written into a product name: 210GX30, 20K, 2KX6, *#1.62K(8), 1K(5), 7.5KG, 2.4kg, 1000g, 6X2KG, 5KG/CTN, (15KG)
  var SIZE = /^\*?#?(\d+(\.\d+)?(K|KG|KGS|G|GM|GMS|GR|L|LT|LTR|ML|MLS)(X\d+)?(\(\d+\))?|\d+X\d+(\.\d+)?(K|KG|G|L|ML)|\d+(\.\d+)?(K|KG|G|L|ML)\/(CTN|CASE|BAG|BOX|TUB|EA|PK)|\(\d+(\.\d+)?(K|KG|G|GM|L|LT|ML)\))$/i;
  // season and venue marks on a name: S26, SEP26, OCT26F, COPY, PP, (QLD); a lone dash left behind
  var MARK = /^(S\d{2}[A-Z]?|(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|SEPT|OCT|NOV|DEC)\d{2}[A-Z]?|COPY|PP|\(QLD\)|-)$/i;
  // pack words at the end of a product's name (CAPSICUM GREEN KG, SHALLOTS BCH, LEMONS CTN - AVC), and the AVC in front
  var PACKWORD = /^(KG|EA|EACH|BCH|CTN|BAG|CASE|PKT|NA|AVC|-)$/i;
  // code-like text: a # with a number after it, five or more digits in a row, an underscore code
  var CODE = /#\s*\d|\d{5,}|_\w|bfbr/i;
  var MONEY = /\$|%/;
  var QTY = /^(\d{1,6}(\.\d{1,4})?)\/([A-Z]{2,12})$/;

  function no(why) { return { ok: false, why: why }; }
  function clean(s) { return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function num(s) { var n = +String(s).replace(/,/g, ''); return isFinite(n) ? n : NaN; }

  // the items of one page, as { s, x, y, w, h }, top of the page first; only items with words in them
  function items(page) {
    return (page || []).filter(function (t) { return t && typeof t.s === 'string' && t.s.trim() && isFinite(t.x) && isFinite(t.y) && t.h > 0; })
      .map(function (t) { return { s: clean(t.s).slice(0, MAX_TEXT), x: +t.x, y: +t.y, w: +t.w || 0, h: +t.h }; });
  }
  function find(list, text, from) { return list.filter(function (t) { return t.s === text && (!from || from(t)); }); }
  // a label pdf.js may have joined with the words after it ("Total: $1.00")
  function starts(list, text) { return list.filter(function (t) { return t.s === text || t.s.indexOf(text + ' ') === 0; }); }
  // where the table ends: the highest of the lines that follow it on a card
  var ENDS = ['Total:', 'Recipe Card:', 'Recipe Details', 'Portions made:', 'This batch makes:', 'ALLERGENS/OTHER INFO'];
  // items on the same line as t (within 40% of its height), left of the limit, right of t
  function rightOf(list, t, limit) {
    return list.filter(function (u) { return u !== t && Math.abs(u.y - t.y) < t.h * 0.4 && u.x >= t.x + t.w - 1 && u.x < limit; })
      .sort(function (a, b) { return a.x - b.x; });
  }
  // lines of text from items, top first: items within 40% of a line's height are one line, joined left to right
  function lines(list) {
    var out = [];
    list.slice().sort(function (a, b) { return b.y - a.y || a.x - b.x; }).forEach(function (t) {
      var l = out[out.length - 1];
      if (l && Math.abs(l.y - t.y) < t.h * 0.4) { l.parts.push(t); return; }
      out.push({ y: t.y, h: t.h, parts: [t] });
    });
    return out.map(function (l) {
      return { y: l.y, h: l.h, s: l.parts.sort(function (a, b) { return a.x - b.x; }).map(function (t) { return t.s; }).join(' ') };
    });
  }
  // lines into cells: a gap of more than 1.6 line heights starts a new cell (rows are padded, lines in a cell are not)
  function blocks(ls) {
    var out = [];
    ls.forEach(function (l) {
      var b = out[out.length - 1];
      if (b && b.bottom - l.y <= l.h * 1.6) { b.lines.push(l); b.bottom = l.y; return; }
      out.push({ lines: [l], top: l.y, bottom: l.y });
    });
    out.forEach(function (b) { b.mid = (b.top + b.bottom) / 2; b.s = b.lines.map(function (l) { return l.s; }).join(' '); });
    return out;
  }

  // The table on one page: the column edges from its own header (each card is printed at its own scale), then each
  // quantity with the product block centred on it. Returns { rows } or { why }.
  function table(list, pageNo) {
    var qh = find(list, 'Quantity/UOM')[0];
    if (!qh) return null;
    var kj = find(list, 'Kilojoules', function (t) { return Math.abs(t.y - qh.y) < qh.h * 2 && t.x > qh.x; })[0];
    var ph = find(list, 'Product', function (t) { return Math.abs(t.y - qh.y) < qh.h * 2 && t.x < qh.x; })
      .sort(function (a, b) { return b.x - a.x; })[0];
    var sh = find(list, 'Supplier', function (t) { return Math.abs(t.y - qh.y) < qh.h * 2 && t.x < (ph ? ph.x : 0); })[0];
    if (!kj || !ph || !sh) return { why: 'Page ' + pageNo + ': the table header is not the AVC card\'s.' };
    // the header's lowest line, and the end of the table: the first closing line under it, else the page's foot
    var headLow = Math.min.apply(null, list.filter(function (t) { return Math.abs(t.y - qh.y) < qh.h * 2 && t.x >= sh.x - 4; }).map(function (t) { return t.y; }));
    var end = [].concat.apply([], ENDS.map(function (e) { return starts(list, e); })).filter(function (t) { return t.y < qh.y; })
      .sort(function (a, b) { return b.y - a.y; })[0];
    var foot = end ? end.y + end.h * 0.6 : 30;
    var inTable = function (t) { return t.y < headLow - t.h * 0.6 && t.y > foot; };
    var qEdge = (qh.x + qh.w + kj.x) / 2;
    // the next header right of Supplier closes the Supplier column ("Product Code", or "Product" over "Code")
    var nextHead = list.filter(function (t) { return Math.abs(t.y - qh.y) < qh.h * 2 && t.x > sh.x + sh.w - 1 && t.x < ph.x; })
      .sort(function (a, b) { return a.x - b.x; })[0];
    var supEdge = nextHead ? nextHead.x - 2 : ph.x;
    var qs = list.filter(function (t) { return inTable(t) && t.x >= qh.x - 10 && t.x < qEdge; })
      .sort(function (a, b) { return b.y - a.y; });
    var prod = blocks(lines(list.filter(function (t) { return inTable(t) && t.x >= ph.x - 4 && t.x < qh.x - 2; })));
    var sup = blocks(lines(list.filter(function (t) { return inTable(t) && t.x >= sh.x - 4 && t.x < supEdge; })));
    var rows = [], used = {};
    for (var i = 0; i < qs.length; i++) {
      var q = qs[i];
      if (!QTY.test(q.s)) return { why: 'Page ' + pageNo + ', row ' + (i + 1) + ': the quantity is not written as an amount and a unit.' };
      var near = function (b) { return Math.abs(b.mid - q.y) < q.h * 0.75; };
      var bi = -1;
      prod.forEach(function (b, k) { if (!used[k] && near(b)) bi = bi < 0 ? k : -2; });
      if (bi === -2) return { why: 'Page ' + pageNo + ', row ' + (i + 1) + ': two product names sit on one quantity.' };
      if (bi < 0) return { why: 'Page ' + pageNo + ', row ' + (i + 1) + ': a quantity has no product name.' };
      used[bi] = true;
      var s = sup.filter(near)[0];
      rows.push({ qty: q.s, product: prod[bi].s, batch: !!(s && /^Batch Recipes\b/i.test(s.s)) });
    }
    for (var k = 0; k < prod.length; k++) if (!used[k]) return { why: 'Page ' + pageNo + ': a product name has no quantity.' };
    return { rows: rows };
  }

  // "1100/GRAMS" to { q: '1.1 kg', n: 1100, u: 'g' }; a unit the book does not know keeps the amount in brackets
  function amount(text) {
    var m = QTY.exec(text), n = num(m[1]), u = UOM[m[3]];
    if (!(n > 0)) return null;
    if (u === undefined) return { q: '[' + m[1] + ' ' + m[3].toLowerCase() + ']', n: n, u: null, flag: 'unit' };
    if (u === 'portion') return { q: AMT.say(n, '') + (n === 1 ? ' portion' : ' portions'), n: n, u: 'portions' };
    if (u === 'packet') return { q: AMT.say(n, '') + (n === 1 ? ' packet' : ' packets'), n: n, u: 'packs' };
    return { q: AMT.say(n, u), n: n, u: u === '' ? 'pieces' : u };
  }

  // Words of a name, with codes and money taken out. Returns { words, coded }.
  function scrub(text) {
    var words = clean(text).split(' '), out = [], coded = false;
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (!w) continue;
      if (MONEY.test(w)) { coded = true; continue; }
      // "# 61043320": a lone # takes the word after it with it
      if (w === '#' && i + 1 < words.length && /\d/.test(words[i + 1])) { coded = true; i++; continue; }
      // "(160G)(QLD)": a venue mark stuck to the word before it
      w = w.replace(/(.)\(QLD\)$/i, '$1');
      if (SIZE.test(w)) { out.push(w.replace(/^\*?#?/, '')); continue; }
      if (CODE.test(w) || /^#/.test(w)) { coded = true; continue; }
      out.push(w.replace(/^\*+/, ''));
    }
    return { words: out.filter(Boolean), coded: coded };
  }
  function sentence(words) {
    var s = words.join(' ').toLowerCase();
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  // Title case for a recipe's name; a short word with no vowel stays in capitals (BBQ, XO)
  function title(words) {
    var small = { and: 1, or: 1, of: 1, with: 1, on: 1, in: 1, the: 1, a: 1, to: 1, n: 1 };
    return words.map(function (w, i) {
      if (/^[A-Z&]{2,5}$/.test(w) && !/[AEIOU]/.test(w)) return w;
      return w.toLowerCase().split('/').map(function (p, j) {
        return (i > 0 && j === 0 && small[p]) ? p : p.charAt(0).toUpperCase() + p.slice(1);
      }).join('/');
    }).join(' ');
  }

  /* pages: one list of text items per page, { s: text, x, y (from the page's foot), w: width, h: font height }.
     Gives { ok: true, recipe } or { ok: false, why }. */
  function read(pages) {
    if (!Array.isArray(pages) || !pages.length) return no('The file has no pages.');
    if (pages.length > MAX_PAGES) return no('The card has more than ' + MAX_PAGES + ' pages.');
    var ps = pages.map(items);
    if (ps.some(function (p) { return p.length > MAX_ITEMS; })) return no('A page has more text than an AVC card.');
    var first = ps[0];
    var idL = find(first, 'Recipe ID:')[0], grL = find(first, 'Recipe Group:')[0], poL = find(first, 'Recipe Portions')[0];
    if (!idL || !grL || !poL) return no('This is not an AVC Live recipe card.');
    // the name: the biggest writing above "Recipe ID:" on the left half
    var above = first.filter(function (t) { return t.y > idL.y + idL.h * 0.5 && t.y < idL.y + idL.h * 8 && t.x < poL.x; });
    var big = Math.max.apply(null, above.map(function (t) { return t.h; }).concat([0]));
    if (!(big >= idL.h * 1.25)) return no('The card has no recipe name.');
    var nameText = lines(above.filter(function (t) { return t.h >= big * 0.95; })).map(function (l) { return l.s; }).join(' ');
    var nm = scrub(nameText), marks = nm.words.filter(function (w) { return !MARK.test(w); });
    if (!marks.length) return no('The card has no recipe name.');
    var group = rightOf(first, grL, poL.x).map(function (t) { return t.s; }).join(' ');
    var gr = scrub(group);
    var portions = num(rightOf(first, poL, Infinity).map(function (t) { return t.s; }).join(''));

    var rows = [];
    for (var p = 0; p < ps.length; p++) {
      var t = table(ps[p], p + 1);
      if (!t) { if (p === 0) return no('The card has no ingredient table.'); continue; }
      if (t.why) return no(t.why);
      rows = rows.concat(t.rows);
    }
    if (!rows.length) return no('The card has no ingredients.');
    if (rows.length > MAX_ROWS) return no('The card has more than ' + MAX_ROWS + ' ingredients.');

    // the yield: "This batch makes: 1000.00 times 1 GRAMS" (on the last page)
    var yl = null;
    ps.forEach(function (list) { var f = starts(list, 'This batch makes:')[0]; if (f) yl = { label: f, list: list }; });
    if (!yl) return no('The card has no "This batch makes" line.');
    var yw = [yl.label.s.slice('This batch makes:'.length)].concat(rightOf(yl.list, yl.label, Infinity).map(function (t) { return t.s; })).join(' ').replace(/\s+/g, ' ').trim();
    var ym = /^([\d.,]+) times ([\d.,]+) ([A-Z]+)$/.exec(yw);
    if (!ym || !(num(ym[1]) * num(ym[2]) > 0) || UOM[ym[3]] === undefined) return no('The "This batch makes" line is not an amount the book knows.');
    var yn = num(ym[1]) * num(ym[2]), yu = UOM[ym[3]];
    var yieldText = yu === 'g' || yu === 'kg' || yu === 'ml' || yu === 'L' ? 'Batch: ' + AMT.say(yn, yu) + '.'
      : yn === 1 ? 'Per serve.' : 'Batch: ' + AMT.say(yn, '') + ' portions.';

    var flags = { name: nm.coded ? ['code'] : [] };
    var ingredients = rows.map(function (r, i) {
      var a = amount(r.qty);
      if (!a) return null;
      var raw = clean(r.product).replace(/^BATCH:\s*/i, '');
      var sc = scrub(raw), f = [];
      // the suggested name: no pack sizes or season marks, no pack words at its end, no AVC in front
      var words = sc.words.filter(function (w) { return !SIZE.test(w) && !MARK.test(w); });
      while (words.length > 1 && PACKWORD.test(words[words.length - 1])) words.pop();
      while (words.length > 1 && PACKWORD.test(words[0])) words.shift();
      if (sc.coded) f.push('code');
      if (a.flag) f.push(a.flag);
      if (r.batch) f.push('link');
      if (!words.length) { f.push('name'); words = ['[Name]']; }
      return { q: a.q, n: a.n, u: a.u, name: words[0] === '[Name]' ? '[Name]' : sentence(words), avc: sc.words.join(' '), batch: r.batch, flags: f };
    });
    if (ingredients.some(function (x) { return !x; })) return no('A quantity on the card is zero.');

    var recipe = {
      name: title(marks), avc: nm.words.join(' '), kind: null,
      group: gr.words.length && !/^please select$/i.test(gr.words.join(' ')) ? gr.words.join(' ') : null,
      portions: portions > 0 ? portions : null,
      yield: yieldText, makes: { n: yn, u: yu === '' ? 'pieces' : yu },
      ingredients: ingredients,
      flags: { kind: true, allergens: true, name: flags.name }
    };
    // last check: no words that look like money or a code leave this file (the numbers are amounts, checked above)
    var words = [recipe.name, recipe.avc, recipe.group || '', recipe.yield].concat(ingredients.map(function (x) { return x.name + ' ' + x.avc + ' ' + x.q; }));
    if (words.some(function (w) { return MONEY.test(w) || CODE.test(w); })) return no('The card still had a price or a code after reading. Nothing was taken.');
    return { ok: true, recipe: recipe };
  }

  /* doc: a pdf.js document (the PDFJS copy js/prep.js already loads). Reads every page's text and gives read()'s answer. */
  function fromPdf(doc) {
    if (!doc || !(doc.numPages > 0)) return Promise.resolve(no('The file has no pages.'));
    if (doc.numPages > MAX_PAGES) return Promise.resolve(no('The card has more than ' + MAX_PAGES + ' pages.'));
    var pages = [];
    var next = function (n) {
      if (n > doc.numPages) return Promise.resolve(read(pages));
      return doc.getPage(n).then(function (pg) { return pg.getTextContent(); }).then(function (tc) {
        pages.push((tc.items || []).map(function (it) {
          var tr = it.transform || [];
          return { s: it.str, x: tr[4], y: tr[5], w: it.width, h: Math.abs(tr[3]) || it.height };
        }));
        return next(n + 1);
      });
    };
    return next(1).catch(function () { return no('The file could not be read as a PDF.'); });
  }

  var X = { api: 1, read: read, fromPdf: fromPdf, scrub: scrub, amount: amount };
  if (typeof module === 'object' && module.exports) { module.exports = X; return; }
  window.LK_AVC = X;
})();
