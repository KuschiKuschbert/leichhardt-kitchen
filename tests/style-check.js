/*
  Checks that the drawings made from a recipe card (js/compose.js) look like the book's own (js/art.js), without a
  browser. It draws every card's part the way a dish gets it, every batch card's own GN pan and every burger from above,
  and measures what the book's 184 drawings measure:
    outlines   the same hue as the fill, at 0.55 to 0.9 of its lightness (the book: 0.63 to 0.83, middle 0.74)
    shadows    black at 0.08 to 0.18 (the book: 0.10 to 0.16)
    strokes    no wider than 8 units
    colours    most fills are colours the book itself uses (snapped to its palette)
    size       each part under 16 kB, plain SVG only (the library's rule)
    node tests/style-check.js          the numbers and anything outside them
  smart.test.js runs the same checks (require('./style-check').check()).
*/
const { load } = require('./compose-read');
const { svgProblems } = require('./library-check');
function hsl(h) {
  h = h.replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&');
  const c = [0, 2, 4].map(k => parseInt(h.slice(k, k + 2), 16) / 255), mx = Math.max(...c), mn = Math.min(...c), l = (mx + mn) / 2, d = mx - mn;
  let s = 0, hh = 0;
  if (d) { s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === c[0] ? (c[1] - c[2]) / d + (c[1] < c[2] ? 6 : 0) : mx === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4; hh *= 60; }
  return [hh, s, l, (mx - mn) * 255];
}
function parts() {
  const { D, C, S, L } = load(), out = [];
  D.recipes.forEach(r => (r.ingredients || []).forEach(i => {
    const m = S.matchIng(i, r), p = C.partFor(i, r, m);
    if (p) out.push({ where: r.id + ': ' + i.name, p });
  }));
  // every card on its own too (a card no dish uses yet is still drawn when it is saved), and in its own GN pan
  D.recipes.filter(r => /batch|component/.test(r.kind)).forEach(r => {
    const p = C.compose(C.read(r), {}); if (p) out.push({ where: r.id, p });
    const pan = C.panPart(r, L.surface(S.ware(r, 'pan')).area); if (pan) out.push({ where: r.id + ' (pan)', p: pan });
  });
  // the burgers and sandwiches from above, from their own layers
  D.recipes.forEach(r => { const st = S.partsOf(r, { slot: 'plate', rid: r.id, els: [], defs: {} }).parts.find(x => x.it && x.it.form === 'stack' && x.it.raw); if (st) out.push({ where: r.id + ' (from above)', p: st.it }); });
  return { out, C };
}
function check() {
  const { out, C } = parts(), errs = [], pal = {};
  C.palette().forEach(p => { pal[p.h] = 1; });
  let fills = 0, inPal = 0, ratios = [];
  out.forEach(({ where, p }) => {
    const e = m => errs.push(where + ': ' + m);
    svgProblems(p.body).forEach(e);
    if (p.body.length > 16000) e('drawing over 16 kB (' + p.body.length + ')');
    // what was drawn here, after the library's own shape it sits on (a sauce pool, a butter pat)
    const b = p.body.slice(p.lib || 0);
    for (const m of b.matchAll(/<(\w+)([^>]*)>/g)) {
      const a = m[2], f = (a.match(/fill="(#[0-9A-Fa-f]{6})"/) || [])[1], st = (a.match(/stroke="(#[0-9A-Fa-f]{6})"/) || [])[1], w = +(a.match(/stroke-width="([\d.]+)"/) || [])[1] || 0, op = (a.match(/opacity="([\d.]+)"/) || [])[1];
      if (w > 8) e('a stroke ' + w + ' wide');
      if (f && /^#0{6}$/.test(f) && op && (+op < 0.08 || +op > 0.18)) e('a shadow at ' + op);
      if (f && !/^#0{6}$/i.test(f)) { fills++; if (pal[f.toUpperCase()]) inPal++; }
      if (f && st) {
        const A = hsl(f), B = hsl(st), ratio = B[2] / Math.max(0.01, A[2]), dh = Math.min(Math.abs(A[0] - B[0]), 360 - Math.abs(A[0] - B[0]));
        ratios.push(ratio);
        if (ratio < 0.55 || ratio > 0.9) e('an outline at ' + ratio.toFixed(2) + ' of its fill (' + f + ' ' + st + ')');
        if (A[3] > 25 && dh > 12) e('an outline ' + Math.round(dh) + ' degrees off its fill (' + f + ' ' + st + ')');
      }
    }
  });
  ratios.sort((a, b) => a - b);
  return { errs: Array.from(new Set(errs)), parts: out.length, fills, palShare: fills ? inPal / fills : 1, ratio: ratios.length ? ratios[Math.floor(ratios.length / 2)] : 0 };
}
module.exports = { check, parts };
if (require.main === module) {
  const c = check();
  console.log(c.parts + ' parts drawn from their cards; outlines at ' + c.ratio.toFixed(2) + ' of their fill (the book: 0.74); ' + Math.round(c.palShare * 100) + '% of ' + c.fills + ' fills are the book\'s own colours');
  console.log(c.errs.length ? '\nOutside the book\'s look (' + c.errs.length + '):\n' + c.errs.join('\n') : '\nEverything is inside the book\'s look.');
}
