/*
  Amounts (22 Oct 2026): reads the amount typed on a prep or order line ("2 L", "2l", "2 litres", "1/2 tub", "3 tubs")
  into a number and one unit, so the book can add amounts up and group the usual amounts. What was typed is always kept
  as it is; this only reads it. Anything it cannot read for sure (a word, a range, two amounts) gives null, and the book
  treats the line as before.
  Shared: the phone (window.LK_AMT, loaded before js/prep.js) and node (scripts/nightly-learn.mjs, tests/amounts-check.js).
*/
(function () {
  'use strict';
  // one unit for each spelling people write; the units the book already shows (wastage: g, kg, L, portions, pieces)
  var UNITS = {
    g: 'g', gm: 'g', gms: 'g', gr: 'g', gram: 'g', grams: 'g', gramme: 'g', grammes: 'g',
    kg: 'kg', kgs: 'kg', kilo: 'kg', kilos: 'kg', kilogram: 'kg', kilograms: 'kg',
    ml: 'ml', mls: 'ml', millilitre: 'ml', millilitres: 'ml', milliliter: 'ml', milliliters: 'ml',
    l: 'L', lt: 'L', ltr: 'L', ltrs: 'L', litre: 'L', litres: 'L', liter: 'L', liters: 'L',
    portion: 'portions', portions: 'portions', port: 'portions', serve: 'portions', serves: 'portions',
    pc: 'pieces', pcs: 'pieces', piece: 'pieces', pieces: 'pieces', ea: 'pieces', each: 'pieces', x: 'pieces',
    tub: 'tubs', tubs: 'tubs', tray: 'trays', trays: 'trays', batch: 'batches', batches: 'batches',
    bunch: 'bunches', bunches: 'bunches', pack: 'packs', packs: 'packs', packet: 'packs', packets: 'packs',
    box: 'boxes', boxes: 'boxes', bag: 'bags', bags: 'bags', bottle: 'bottles', bottles: 'bottles',
    tin: 'tins', tins: 'tins', can: 'tins', cans: 'tins', jar: 'jars', jars: 'jars', bucket: 'buckets', buckets: 'buckets',
    platter: 'platters', platters: 'platters', pan: 'pans', pans: 'pans', container: 'containers', containers: 'containers',
    doz: 'dozen', dozen: 'dozen', case: 'cases', cases: 'cases', carton: 'cartons', cartons: 'cartons', loaf: 'loaves', loaves: 'loaves'
  };
  var FRAC = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };
  function num(s) {
    s = String(s).trim();
    if (FRAC[s] != null) return FRAC[s];
    var m = s.match(/^(\d+)\s*([½¼¾⅓⅔])$/);
    if (m) return +m[1] + FRAC[m[2]];
    m = s.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (m) return +m[2] ? +m[1] / +m[2] : NaN;
    m = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
    if (m) return +m[3] ? +m[1] + +m[2] / +m[3] : NaN;
    if (/^\d+([.,]\d+)?$/.test(s)) return +s.replace(',', '.');
    return NaN;
  }
  /* "2 L" -> { n: 2, u: 'L' }; "3" -> { n: 3, u: '' }; "half a tub", "2-3 kg", "1 kg + 500 g" -> null */
  function parse(text) {
    var t = String(text == null ? '' : text).trim().toLowerCase().replace(/\s+/g, ' ');
    if (!t || t.length > 40) return null;
    var m = t.match(/^(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?|\d+\s+\d+\s*\/\s*\d+|\d*\s*[½¼¾⅓⅔])\s*([a-z]+)?\.?$/);
    if (!m) return null;
    var n = num(m[1].replace(/\s+(?=[½¼¾⅓⅔])/, ''));
    if (!(n > 0) || n >= 100000) return null;
    var u = '';
    if (m[2]) { u = UNITS[m[2]]; if (!u) return null; }
    return { n: Math.round(n * 1000) / 1000, u: u };
  }
  /* A key that is the same for the same amount however it was typed ("2 L", "2l", "2 litres": "2 L"), and the typed text
     itself (lower case, single spaces) when it cannot be read. */
  function key(text) {
    var a = parse(text);
    if (a) return a.n + (a.u ? ' ' + a.u : '');
    return String(text == null ? '' : text).trim().toLowerCase().replace(/\s+/g, ' ');
  }
  var A = { parse: parse, key: key, UNITS: UNITS };
  if (typeof module === 'object' && module.exports) { module.exports = A; return; }
  window.LK_AMT = A;
})();
