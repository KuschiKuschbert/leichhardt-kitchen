// A made-up AVC Live "Print Recipe" card (19 Nov 2026, docs/second-venue-options/brief.md): the text items pdf.js gives
// for a card, laid out like the real cards (the header labels, the columns found from the table's own header, each cell
// centred in its row, the header repeated on page 2, the yield line at the end). Made-up dishes, suppliers, brands,
// codes and prices only: nothing here comes from a real card. Used by avc-reader.test.js. Not a test file itself.
// pdf(pages) writes the same items into a small real PDF, so the test also reads a card through pdf.js.

// Two column layouts seen on real cards: A (small print) and B (larger print, "Product" over "Code").
const LAYOUTS = {
  A: { h: 7.2, hh: 8.4, cols: { brand: 54, sup: 100, code: 161, pack: 225, inner: 264, price: 292, inv: 331, prod: 372, qty: 429, kj: 479, cost: 522 },
    head: [['Brand', 55, 0], ['Supplier', 101, 0], ['Product Code', 162, 0], ['Package', 226, 4], ['Size', 226, -5], ['Inner', 265, 9], ['Unit', 265, 0], ['Type', 265, -10],
      ['Price', 293, 9], ['Per', 293, 0], ['Package', 293, -10], ['Inventory', 332, 4], ['Group', 332, -5], ['Product', 373, 0], ['Quantity/UOM', 421, 0], ['Kilojoules', 480, 0], ['Cost', 523, 0]] },
  B: { h: 8, hh: 9.3, cols: { brand: 57, sup: 89, code: 134, pack: 176, inner: 222, price: 256, inv: 304, prod: 353, qty: 409, kj: 469, cost: 517 },
    head: [['Brand', 58, 0], ['Supplier', 91, 0], ['Product', 135, 6], ['Code', 135, -5], ['Package', 177, 6], ['Size', 177, -5], ['Inner', 223, 11], ['Unit', 223, 0], ['Type', 223, -10],
      ['Price Per', 257, 6], ['Package', 257, -5], ['Inventory', 305, 6], ['Group', 305, -5], ['Product', 354, 0], ['Quantity/UOM', 404, 0], ['Kilojoules', 471, 0], ['Cost', 518, 0]] }
};

// A made-up row: product lines, the quantity, and the columns the reader must never read
const ROWS = [
  { prod: ['2KX6 TEST', 'CRISPY CHIPS', '9MM'], qty: '160/GRAMS', brand: ['BRANDX'], sup: ['MADE UP FOODS', 'TOWNSVILLE', '#7000123'], code: 'ZZ4411', pack: '2kg x 6', inner: 'EA', price: '$38.3200', inv: [], kj: '0', cost: '$3.0656' },
  { prod: ['1K(4) HOUSE', 'AIOLI # 12345', 'BRANDCO'], qty: '50/MLS', brand: ['BRANDY'], sup: ['MADE UP FOODS', 'TOWNSVILLE'], code: 'ZZ5522', pack: '1kg (4)', inner: 'EA', price: '$11.9300', inv: ['SAUCES'], kj: '0', cost: '$0.5965' },
  { prod: ['Test Gravy', 'Batch 2l'], qty: '60/MLS', brand: [], sup: ['Batch Recipes -', '9999 -', 'MADE UP', 'HOTEL'], code: '123456_9999_bfbr', pack: '2.00', inner: 'serving', price: '$22.7472', inv: [], kj: '0', cost: '$0.6824' },
  { prod: ['LETT TEST', 'GREEN #8', 'CASE'], qty: '15/GRAMS', brand: ['FARMCO'], sup: ['VEG SUPPLIER'], code: 'VV9901', pack: 'CASE', inner: '1', price: '$29.9000', inv: ['FRUIT', 'AND VEG'], kj: '0', cost: '$0.2585' },
  { prod: ['LEMONS CTN', '(15KG) - AVC'], qty: '0.25/EACH', brand: ['FARMCO'], sup: ['VEG SUPPLIER'], code: 'VV9902', pack: 'CTN', inner: '1', price: '$45.0000', inv: ['FRUIT', 'AND VEG'], kj: '0', cost: '$0.1500' }
];

function build(o) {
  o = Object.assign({ layout: 'A', rows: ROWS, perPage: 99, name: ['TEST SMOKED BURGER SEP26', 'COPY'], group: 'SPECIAL', portions: '1', batch: ['1.00', 'times', '1', 'EACH'], noYield: false, noRecipeId: false, noTable: false, dx: 0, edit: null, total: 'split' }, o || {});
  const L = LAYOUTS[o.layout], C = L.cols, h = L.h, hh = L.hh, lh = h * 1.17, pad = 6.5;
  const it = (pg, s, x, y, size) => pg.push({ s, x: x + o.dx, y, w: Math.round(s.length * (size || h) * 0.5 * 10) / 10, h: size || h });
  const pages = [[]];
  let pg = pages[0];
  // page top and foot (date, address with the AVC recipe number, page count)
  const frame = (p, n, of) => { it(p, '19/11/2026, 14:33', 24, 819, 8); it(p, 'https://example.invalid/_customer/Print-Recipe.aspx?rid=999001', 24, 17, 8); it(p, n + '/' + of, 561, 17, 8); };
  // the recipe's header block
  it(pg, 'Print', 391, 778, 9.6); it(pg, '[Close]', 416, 778, 9.6);
  it(pg, 'Made Up Hotel Head Chef', 39, 731, 9.6);
  o.name.forEach((s, i) => it(pg, s, 39 + i * 160, 709, 12.8));
  if (!o.noRecipeId) { it(pg, 'Recipe ID:', 39, 686, hh); it(pg, '999001', 125, 686, hh); }
  it(pg, 'Recipe Group:', 39, 671, hh); if (o.group) it(pg, o.group, 125, 671, hh);
  it(pg, 'Menus:', 39, 655, hh); it(pg, 'Recipe currently not listed in any menus', 125, 655, hh);
  it(pg, 'Sell Price Per Serve', 39, 640, hh); it(pg, '$66.00', 125, 640, hh);
  it(pg, 'Sell Price ex GST', 39, 624, hh); it(pg, '$60.00', 125, 624, hh);
  it(pg, 'Recipe Portions', 300, 686, hh); it(pg, o.portions, 426, 686, hh);
  it(pg, 'POS ID', 300, 671, hh); it(pg, 'Total Kilojoules', 300, 655, hh); it(pg, '0', 426, 655, hh);
  it(pg, 'COGS', 300, 640, hh); it(pg, '$16.6418', 426, 640, hh);
  it(pg, 'Gross Profit', 300, 608, hh); it(pg, '$43.36', 426, 608, hh); it(pg, '|', 454, 608, hh); it(pg, '72.27%', 458, 608, hh);
  it(pg, 'Outer (CTN, TRAY etc)', 105, 569, 9.6); it(pg, 'Inner (EA, PKT etc)', 274, 569, 9.6);
  // the Total line: two items, joined into one (as pdf.js may give it), or missing
  const total = (p, ty) => { if (o.total === 'split') { it(p, 'Total:', 492, ty, 9.6); it(p, '$16.6418', 520, ty, 9.6); } else if (o.total === 'joined') it(p, 'Total: $16.6418', 492, ty, 9.6); };
  const header = (p, y) => L.head.forEach(([s, x, dy]) => it(p, s, x, y + dy, hh));
  let y = 534;
  if (!o.noTable) header(pg, y);
  y -= 15;
  // each row: every cell centred on the row's middle line
  const rows = o.edit ? o.edit(o.rows.map(r => Object.assign({}, r))) : o.rows;
  rows.forEach((r, i) => {
    if (i && i % o.perPage === 0) {
      total(pg, y - 6);
      pg = []; pages.push(pg); y = 793; header(pg, y); y -= 20;
    }
    const n = Math.max(1, r.prod.length, r.sup.length, r.brand.length, r.inv.length);
    const mid = y - pad - (n - 1) * lh / 2;
    const cell = (ls, x) => ls.forEach((s, k) => it(pg, s, x, Math.round((mid + ((ls.length - 1) / 2 - k) * lh) * 10) / 10));
    cell(r.brand, C.brand); cell(r.sup, C.sup); cell([r.code], C.code); cell([r.pack], C.pack); cell([r.inner], C.inner);
    cell([r.price], C.price); cell(r.inv, C.inv); cell(r.prod, C.prod); if (r.qty) cell([r.qty], C.qty); cell([r.kj], C.kj); cell([r.cost], C.cost);
    y = mid - (n - 1) * lh / 2 - pad - 2;
  });
  total(pg, y - 6);
  y -= 40;
  it(pg, 'Recipe Card:', 42, y, hh); y -= 25;
  it(pg, 'Recipe Details', 40, y, 9.6); it(pg, 'Batch Recipe Stocktake Details', 300, y, 9.6); y -= 11;
  it(pg, 'Portions made:', 40, y, 9.6); it(pg, '1', 160, y, 9.6); it(pg, 'times', 180, y, 9.6); it(pg, '1', 230, y, 9.6); it(pg, 'EACH', 238, y, 9.6);
  if (!o.noYield) { it(pg, 'This batch makes:', 301, y, 9.6); [422, 459, 501, 509].forEach((x, k) => it(pg, o.batch[k], x, y, 9.6)); }
  y -= 34; it(pg, 'ALLERGENS/OTHER INFO', 39, y, hh); y -= 16; it(pg, 'Allergens', 39, y, 9.6); it(pg, 'Other', 309, y, 9.6);
  pages.forEach((p, i) => frame(p, i + 1, pages.length));
  return pages;
}

// The same items as a small real PDF (Helvetica, one text object per item), for reading through pdf.js
function pdf(pages) {
  const esc = s => s.replace(/[\\()]/g, m => '\\' + m);
  const objs = [];
  const add = s => { objs.push(s); return objs.length; };
  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const kids = [], pagesId = objs.length + 1 + pages.length * 2;
  pages.forEach(p => {
    const body = p.map(t => 'BT /F1 ' + t.h + ' Tf 1 0 0 1 ' + t.x + ' ' + t.y + ' Tm (' + esc(t.s) + ') Tj ET').join('\n');
    const content = add('<< /Length ' + Buffer.byteLength(body, 'latin1') + ' >>\nstream\n' + body + '\nendstream');
    kids.push(add('<< /Type /Page /Parent ' + pagesId + ' 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ' + font + ' 0 R >> >> /Contents ' + content + ' 0 R >>'));
  });
  add('<< /Type /Pages /Kids [' + kids.map(k => k + ' 0 R').join(' ') + '] /Count ' + kids.length + ' >>');
  const cat = add('<< /Type /Catalog /Pages ' + pagesId + ' 0 R >>');
  let out = '%PDF-1.4\n';
  const at = [];
  objs.forEach((s, i) => { at.push(Buffer.byteLength(out, 'latin1')); out += (i + 1) + ' 0 obj\n' + s + '\nendobj\n'; });
  const xref = Buffer.byteLength(out, 'latin1');
  out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + at.map(n => String(n).padStart(10, '0') + ' 00000 n \n').join('');
  out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root ' + cat + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  return new Uint8Array(Buffer.from(out, 'latin1'));
}

module.exports = { build, pdf, ROWS, LAYOUTS };
