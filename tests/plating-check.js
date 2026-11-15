/*
  Measures Draw it for me's plates (js/smart.js drawIt) on every dish against the book's own hand-made plates (js/art.js),
  without a browser (15 Nov 2026). Each plate is drawn as the button draws it on a fresh drawing and rasterised over the
  servingware's food area, and the same is done for the book's plate of the dish. Measures: coverage, overlap between
  solid parts, how far the food sits off the middle, the largest empty sector, separate islands, part sizes, sauces
  under or beside, and a combined score (how far outside the book's own P10 to P90 band each measure is, plus a penalty
  for each fault the head chef sees). Lower is better; the book's own plates score about 0.
    node tests/plating-check.js              the summary, the 15 worst, the observed dishes and the rules each plate keeps
    node tests/plating-check.js all          every dish's row too
  smart.test.js runs the same check (require('./plating-check').check()) and holds the gate.
*/
const { load } = require('./compose-read');
let ENV = null;
// the book, its drawings, the library, the editor and Draw it for me, loaded once
function env() {
  if (ENV) return ENV;
  const { win, D, S } = load();
  win.LK_RX.artVersions = () => ({}); win.LK_RX.change = () => null;          // DR.blank() needs these (js/draw.js newId, recipeOf)
  ENV = { win, D, S, DR: win.LK_DRAW, Rn: win.LK_DRAW.render, LIB: win.LK_LIB, ART: win.LK_ART };
  return ENV;
}
let S, DR, Rn, LIB, ART;
function bind() { const e = env(); S = e.S; DR = e.DR; Rn = e.Rn; LIB = e.LIB; ART = e.ART; return e; }
// ---------- SVG flattener: every shape as absolute polygons ----------
const mul = (A, B) => [A[0]*B[0]+A[2]*B[1], A[1]*B[0]+A[3]*B[1], A[0]*B[2]+A[2]*B[3], A[1]*B[2]+A[3]*B[3], A[0]*B[4]+A[2]*B[5]+A[4], A[1]*B[4]+A[3]*B[5]+A[5]];
const ap = (m, x, y) => [m[0]*x+m[2]*y+m[4], m[1]*x+m[3]*y+m[5]];
function parseTf(s) { let m = [1,0,0,1,0,0]; const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g; let x;
  while ((x = re.exec(s || ''))) { const v = x[2].trim().split(/[\s,]+/).map(Number); let t;
    if (x[1] === 'translate') t = [1,0,0,1,v[0],v[1]||0]; else if (x[1] === 'scale') t = [v[0],0,0,v[1]==null?v[0]:v[1],0,0];
    else if (x[1] === 'rotate') { const a = v[0]*Math.PI/180, c = Math.cos(a), s2 = Math.sin(a), cx = v[1]||0, cy = v[2]||0; t = mul(mul([1,0,0,1,cx,cy],[c,s2,-s2,c,0,0]),[1,0,0,1,-cx,-cy]); }
    else if (x[1] === 'matrix') t = v; else if (x[1] === 'skewX') t = [1,0,Math.tan(v[0]*Math.PI/180),1,0,0]; else t = [1,Math.tan(v[0]*Math.PI/180),0,1,0,0];
    m = mul(m, t); } return m; }
function pathPolys(d) {
  const toks = [], re = /([MmLlHhVvCcSsQqTtAaZz])|([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/g; let mm; while ((mm = re.exec(d))) toks.push(mm[1] || +mm[2]);
  let i = 0, cmd = '', x = 0, y = 0, cpx = null, cpy = null, qx = null, qy = null, cur = null; const polys = [];
  const num = () => toks[i++], isNum = () => typeof toks[i] === 'number', start = (a, b) => { cur = [[a, b]]; polys.push(cur); }, lineTo = (a, b) => { if (!cur) start(x, y); cur.push([a, b]); };
  const cubic = (x0,y0,x1,y1,x2,y2,x3,y3) => { for (let k = 1; k <= 8; k++) { const t = k/8, u = 1-t; lineTo(u*u*u*x0+3*u*u*t*x1+3*u*t*t*x2+t*t*t*x3, u*u*u*y0+3*u*u*t*y1+3*u*t*t*y2+t*t*t*y3); } };
  const quad = (x0,y0,x1,y1,x2,y2) => { for (let k = 1; k <= 6; k++) { const t = k/6, u = 1-t; lineTo(u*u*x0+2*u*t*x1+t*t*x2, u*u*y0+2*u*t*y1+t*t*y2); } };
  const arc = (x1,y1,rx,ry,phi,fa,fs,x2,y2) => { if (!rx || !ry) { lineTo(x2, y2); return; }
    rx = Math.abs(rx); ry = Math.abs(ry); const ph = phi*Math.PI/180, cs = Math.cos(ph), sn = Math.sin(ph), dx = (x1-x2)/2, dy = (y1-y2)/2, x1p = cs*dx+sn*dy, y1p = -sn*dx+cs*dy;
    const lam = x1p*x1p/(rx*rx)+y1p*y1p/(ry*ry); if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
    const nu = rx*rx*ry*ry-rx*rx*y1p*y1p-ry*ry*x1p*x1p, de = rx*rx*y1p*y1p+ry*ry*x1p*x1p; let co = Math.sqrt(Math.max(0, nu/de)); if (!!fa === !!fs) co = -co;
    const cxp = co*rx*y1p/ry, cyp = -co*ry*x1p/rx, cx = cs*cxp-sn*cyp+(x1+x2)/2, cy = sn*cxp+cs*cyp+(y1+y2)/2, ang = (ux,uy,vx,vy) => Math.atan2(ux*vy-uy*vx, ux*vx+uy*vy), t1 = ang(1,0,(x1p-cxp)/rx,(y1p-cyp)/ry);
    let dt = ang((x1p-cxp)/rx,(y1p-cyp)/ry,(-x1p-cxp)/rx,(-y1p-cyp)/ry); if (!fs && dt > 0) dt -= 2*Math.PI; else if (fs && dt < 0) dt += 2*Math.PI;
    const n = Math.max(4, Math.ceil(Math.abs(dt)/(Math.PI/12))); for (let k = 1; k <= n; k++) { const t = t1+dt*k/n; lineTo(cx+rx*Math.cos(t)*cs-ry*Math.sin(t)*sn, cy+rx*Math.cos(t)*sn+ry*Math.sin(t)*cs); } };
  while (i < toks.length) {
    if (typeof toks[i] === 'string') cmd = toks[i++]; else if (!cmd) { i++; continue; }
    const rel = cmd >= 'a' && cmd <= 'z', C = cmd.toUpperCase();
    if (C === 'Z') { if (cur && cur.length) { x = cur[0][0]; y = cur[0][1]; } cur = null; cpx = qx = null; continue; }
    if (!isNum()) continue;
    if (C === 'M') { let a = num(), b = num(); if (rel) { a += x; b += y; } x = a; y = b; start(x, y); cmd = rel ? 'l' : 'L'; cpx = qx = null; }
    else if (C === 'L') { let a = num(), b = num(); if (rel) { a += x; b += y; } lineTo(a, b); x = a; y = b; cpx = qx = null; }
    else if (C === 'H') { let a = num(); if (rel) a += x; lineTo(a, y); x = a; cpx = qx = null; }
    else if (C === 'V') { let b = num(); if (rel) b += y; lineTo(x, b); y = b; cpx = qx = null; }
    else if (C === 'C') { const p = [num(),num(),num(),num(),num(),num()]; if (rel) for (let k = 0; k < 6; k++) p[k] += k%2 ? y : x; cubic(x,y,p[0],p[1],p[2],p[3],p[4],p[5]); cpx = p[2]; cpy = p[3]; x = p[4]; y = p[5]; qx = null; }
    else if (C === 'S') { const p = [num(),num(),num(),num()]; if (rel) for (let k = 0; k < 4; k++) p[k] += k%2 ? y : x; const c1x = cpx == null ? x : 2*x-cpx, c1y = cpx == null ? y : 2*y-cpy; cubic(x,y,c1x,c1y,p[0],p[1],p[2],p[3]); cpx = p[0]; cpy = p[1]; x = p[2]; y = p[3]; qx = null; }
    else if (C === 'Q') { const p = [num(),num(),num(),num()]; if (rel) for (let k = 0; k < 4; k++) p[k] += k%2 ? y : x; quad(x,y,p[0],p[1],p[2],p[3]); qx = p[0]; qy = p[1]; x = p[2]; y = p[3]; cpx = null; }
    else if (C === 'T') { const p = [num(),num()]; if (rel) { p[0] += x; p[1] += y; } const c = qx == null ? [x,y] : [2*x-qx, 2*y-qy]; quad(x,y,c[0],c[1],p[0],p[1]); qx = c[0]; qy = c[1]; x = p[0]; y = p[1]; cpx = null; }
    else if (C === 'A') { const p = [num(),num(),num(),num(),num(),num(),num()]; if (rel) { p[5] += x; p[6] += y; } arc(x,y,p[0],p[1],p[2],p[3],p[4],p[5],p[6]); x = p[5]; y = p[6]; cpx = qx = null; }
    else i++; }
  return polys.filter(p => p.length > 1); }
const ring = (cx, cy, rx, ry, n) => { const o = []; for (let k = 0; k < n; k++) { const a = k/n*2*Math.PI; o.push([cx+rx*Math.cos(a), cy+ry*Math.sin(a)]); } return o; };
function flatten(svg, base) {
  const out = [], stack = [{ m: base || [1,0,0,1,0,0], fill: '#000', stroke: 'none', sw: 1, op: 1 }], re = /<(\/?)([a-zA-Z]+)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g; let t;
  while ((t = re.exec(svg))) { const [, close, tag, attrs, self] = t;
    if (close) { if (tag === 'g' || tag === 'svg') stack.pop(); continue; }
    const A = {}; attrs.replace(/([\w:-]+)\s*=\s*"([^"]*)"/g, (m0, k, v) => { A[k] = v; });
    const top = stack[stack.length-1], st = { m: A.transform ? mul(top.m, parseTf(A.transform)) : top.m, fill: A.fill != null ? A.fill : top.fill, stroke: A.stroke != null ? A.stroke : top.stroke, sw: A['stroke-width'] != null ? +A['stroke-width'] : top.sw, op: top.op * (A.opacity != null ? +A.opacity : 1) * (A['fill-opacity'] != null ? +A['fill-opacity'] : 1) };
    if (tag === 'g' || tag === 'svg') { if (!self) stack.push(st); continue; }
    let polys = null, open = false; const n = k => +(A[k] || 0);
    if (tag === 'circle') polys = [ring(n('cx'), n('cy'), n('r'), n('r'), 28)];
    else if (tag === 'ellipse') polys = [ring(n('cx'), n('cy'), n('rx'), n('ry'), 28)];
    else if (tag === 'rect') { const x = n('x'), y = n('y'), w = n('width'), h = n('height'); polys = [[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]]; }
    else if (tag === 'line') { polys = [[[n('x1'), n('y1')], [n('x2'), n('y2')]]]; open = true; }
    else if (tag === 'polygon' || tag === 'polyline') { const v = String(A.points || '').trim().split(/[\s,]+/).map(Number), p = []; for (let k = 0; k + 1 < v.length; k += 2) p.push([v[k], v[k+1]]); polys = [p]; open = tag === 'polyline'; }
    else if (tag === 'path') polys = pathPolys(A.d || '');
    if (!polys || !polys.length) continue;
    const m = st.m, sc = Math.sqrt(Math.abs(m[0]*m[3]-m[1]*m[2])), P = polys.map(p => p.map(q => ap(m, q[0], q[1]))), xs = [], ys = []; P.forEach(p => p.forEach(q => { xs.push(q[0]); ys.push(q[1]); }));
    out.push({ tag, polys: P, fill: open ? 'none' : String(st.fill).trim(), stroke: st.stroke, sw: st.sw * sc, op: st.op, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] }); }
  return out; }
// ---------- raster over the servingware's food area (1.25-unit cells) ----------
const G_STEP = 1.25;
function grid(a) { const g = G_STEP, nx = Math.ceil(2*a.rx/g)+1, ny = Math.ceil(2*a.ry/g)+1, x0 = a.cx-a.rx, y0 = a.cy-a.ry, inA = new Uint8Array(nx*ny); let nA = 0;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const dx = (x0+i*g-a.cx)/a.rx, dy = (y0+j*g-a.cy)/a.ry; if (a.shape === 'box' ? Math.abs(dx) <= 1 && Math.abs(dy) <= 1 : dx*dx+dy*dy <= 1) { inA[j*nx+i] = 1; nA++; } }
  return { nx, ny, x0, y0, g, inA, nA, a }; }
function inPolys(P, x, y) { let c = false; for (const p of P) for (let a = 0, b = p.length-1; a < p.length; b = a++) { const ya = p[a][1], yb = p[b][1]; if ((ya > y) !== (yb > y) && x < (p[b][0]-p[a][0])*(y-ya)/(yb-ya)+p[a][0]) c = !c; } return c; }
function nearPolys(P, x, y, r) { for (const p of P) for (let a = 1; a < p.length; a++) { const [x1,y1] = p[a-1], [x2,y2] = p[a], dx = x2-x1, dy = y2-y1, L = dx*dx+dy*dy; let t = L ? ((x-x1)*dx+(y-y1)*dy)/L : 0; t = Math.max(0, Math.min(1, t)); if (Math.hypot(x1+t*dx-x, y1+t*dy-y) <= r) return true; } return false; }
const unfilled = p => p.fill === 'none' || p.fill === 'transparent';
const isShadow = p => /^(#000|#000000|black)$/i.test(p.fill) && p.op < 0.5;
const counts = p => !(p.op < 0.3 || isShadow(p) || unfilled(p) && (p.sw < 1.5 || p.op < 0.4 || /^none$/i.test(p.stroke)) || (p.box[2]-p.box[0])*(p.box[3]-p.box[1]) < 2);
function paint(G, prim, mask) { const filled = !unfilled(prim), r = filled ? 0 : prim.sw/2, b = prim.box;
  const i0 = Math.max(0, Math.floor((b[0]-r-G.x0)/G.g)), i1 = Math.min(G.nx-1, Math.ceil((b[2]+r-G.x0)/G.g)), j0 = Math.max(0, Math.floor((b[1]-r-G.y0)/G.g)), j1 = Math.min(G.ny-1, Math.ceil((b[3]+r-G.y0)/G.g));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const k = j*G.nx+i; if (!G.inA[k] || mask[k]) continue; const x = G.x0+i*G.g, y = G.y0+j*G.g; if (filled ? inPolys(prim.polys, x, y) : nearPolys(prim.polys, x, y, r)) mask[k] = 1; } }
// ---------- roles ----------
const GROUP = { main: 'protein', starch: 'starch', veg: 'vegsalad', salad: 'vegsalad', sidedish: 'vegsalad', sauce: 'sauce', dsauce: 'sauce', garnish: 'garnish', topping: 'garnish', bread: 'bread', dessert: 'dessert', dside: 'dessert' };
const SOFT = { sauce: 1, garnish: 1 };
const SAUCE_W = /sauce|jus|gravy|aioli|mayo|dressing|relish|ketchup|chutney|salsa|pesto|glaze|syrup|coulis|pur[eé]e|\bdip\b|drizzle|\boil\b|\bjam\b|laksa|tartare|butterscotch|custard|caramel/i;
const BED_W = /mash|pur[eé]e|rice|polenta|risotto|greens|spinach|leaves|lettuce|mesclun|rocket|slaw|tortilla|noodle|cookie|choy|bed/i;
function roleOfLabel(label, r) {
  if (/topper|topping/i.test(label)) return 'topping';
  if (SAUCE_W.test(label)) return 'sauce';
  const lw = label.toLowerCase(), ing = (r.ingredients || []).find(i => { const n = String(i.name || '').toLowerCase(); return n && (n.indexOf(lw) >= 0 || lw.indexOf(n) >= 0); });
  const m = S.matchIng(ing || { name: label }, r), it = m.id && LIB.get(m.id);
  if (it && m.conf >= 0.6) return it.role;
  return /chip|fries|mash|rice|potato|wedge|noodle|pasta|polenta|tortilla/i.test(label) ? 'starch' : /bun|bread|toast/i.test(label) ? 'bread' : /salad|slaw|leaves|greens|veg|broccol|beans|peas|carrot|corn/i.test(label) ? 'salad' : /garnish|herb|micro|lemon|lime|shallot|chilli|sesame|seed|crumb/i.test(label) ? 'garnish' : 'main';
}
const isBed = p => /^(starch|vegsalad|dessert)$/.test(GROUP[p.role] || '') && BED_W.test(p.name + ' ' + Object.keys(p.ids || {}).join(' '));
// ---------- metrics over a grid and parts {name, role, prims} ----------
function measure(G, parts, extraPrims) {
  const a = G.a, N = G.nx*G.ny, uni = new Uint8Array(N), R = Math.sqrt(a.rx*a.ry), XY = k => [(k % G.nx)*G.g+G.x0, Math.floor(k/G.nx)*G.g+G.y0];
  parts.forEach(p => { p.mask = new Uint8Array(N); p.prims.filter(counts).forEach(q => paint(G, q, p.mask)); let n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
    for (let k = 0; k < N; k++) if (p.mask[k]) { uni[k] = 1; n++; const [x, y] = XY(k); sx += x; sy += y; sxx += x*x; syy += y*y; sxy += x*y; }
    p.n = n; p.share = n/G.nA; if (n) { const mx = sx/n, my = sy/n, cxx = sxx/n-mx*mx, cyy = syy/n-my*my, cxy = sxy/n-mx*my, tr = cxx+cyy, dt = Math.sqrt(Math.max(0, (cxx-cyy)*(cxx-cyy)/4+cxy*cxy)); p.c = [mx, my]; p.elong = Math.sqrt((tr/2+dt)/Math.max(1e-6, tr/2-dt)); } });
  (extraPrims || []).filter(counts).forEach(q => paint(G, q, uni));
  let nU = 0, mx = 0, my = 0; for (let k = 0; k < N; k++) if (uni[k]) { nU++; const [x, y] = XY(k); mx += x; my += y; }
  mx = nU ? mx/nU : a.cx; my = nU ? my/nU : a.cy;
  let rg = 0; for (let k = 0; k < N; k++) if (uni[k]) { const [x, y] = XY(k); rg += ((x-a.cx)/a.rx)**2 + ((y-a.cy)/a.ry)**2; } rg = nU ? Math.sqrt(rg/nU) : 0;
  const inter = (A, B) => { let c = 0; for (let k = 0; k < N; k++) if (A[k] && B[k]) c++; return c; };
  const vis = parts.filter(p => p.n > 0), solid = vis.filter(p => !SOFT[GROUP[p.role] || '']);
  let ov = 0, ovPair = '', ovHard = 0, hardPair = '';
  for (let i = 0; i < solid.length; i++) for (let j = i+1; j < solid.length; j++) { const A = solid[i], B = solid[j], o = inter(A.mask, B.mask)/Math.min(A.n, B.n);
    if (o > ov) { ov = o; ovPair = A.name + ' / ' + B.name; }
    if (!isBed(A) && !isBed(B) && !(GROUP[A.role] === 'vegsalad' && GROUP[B.role] === 'vegsalad') && o > ovHard) { ovHard = o; hardPair = A.name + ' / ' + B.name; } }
  const main = vis.filter(p => /^(protein|dessert)$/.test(GROUP[p.role])).sort((x, y) => y.n-x.n)[0] || null;
  const sauces = vis.filter(p => GROUP[p.role] === 'sauce').map(s => { const um = main && main !== s ? inter(s.mask, main.mask)/s.n : 0; let uo = 0, on = ''; solid.forEach(q => { if (q === main || s.z != null && q.z != null && q.z < s.z) return; const o = inter(s.mask, q.mask)/s.n; if (o > uo) { uo = o; on = q.name; } }); return { name: s.name, share: s.share, underMain: um, underOther: uo, other: on, p: s }; });
  const beds = vis.filter(p => p !== main && isBed(p)), onBed = main && beds.length ? Math.max(...beds.map(b => inter(main.mask, b.mask)/main.n)) : null;
  const BINS = 36, tot = new Array(BINS).fill(0), food = new Array(BINS).fill(0);
  for (let k = 0; k < N; k++) { if (!G.inA[k]) continue; const [x0, y0] = XY(k), x = (x0-a.cx)/a.rx, y = (y0-a.cy)/a.ry; if (Math.hypot(x, y) < 0.3) continue; const b = Math.floor(((Math.atan2(x, -y)*180/Math.PI+360) % 360)/(360/BINS)) % BINS; tot[b]++; if (uni[k]) food[b]++; }
  const empty = tot.map((t, b) => !t || food[b]/t < 0.04); let gap = 0; if (empty.every(Boolean)) gap = 360; else for (let b = 0; b < BINS; b++) { let L = 0; while (L < BINS && empty[(b+L) % BINS]) L++; gap = Math.max(gap, L*360/BINS); }
  const seen = new Uint8Array(N), isl = []; for (let k = 0; k < N; k++) { if (!uni[k] || seen[k]) continue; let c = 0; const st = [k]; seen[k] = 1; while (st.length) { const q = st.pop(); c++; const qi = q % G.nx, qj = Math.floor(q/G.nx); for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = qi+di, jj = qj+dj; if (ii < 0 || jj < 0 || ii >= G.nx || jj >= G.ny) continue; const w = jj*G.nx+ii; if (uni[w] && !seen[w]) { seen[w] = 1; st.push(w); } } } if (c >= 0.005*G.nA) isl.push(c); }
  let sp = Infinity; for (let i = 0; i < solid.length; i++) for (let j = i+1; j < solid.length; j++) sp = Math.min(sp, Math.hypot(solid[i].c[0]-solid[j].c[0], solid[i].c[1]-solid[j].c[1])/R);
  const shares = vis.map(p => p.share), big = solid.slice().sort((x, y) => y.n-x.n)[0], garn = vis.filter(p => GROUP[p.role] === 'garnish');
  const el = solid.filter(p => GROUP[p.role] !== 'garnish').sort((x, y) => (y.elong||0)-(x.elong||0))[0], sel = vis.filter(p => GROUP[p.role] === 'sauce').sort((x, y) => (y.elong||0)-(x.elong||0))[0];
  return { cov: nU/G.nA, ov, ovPair, ovHard, hardPair, off: Math.hypot((mx-a.cx)/a.rx, (my-a.cy)/a.ry), rg, gap, islands: isl.length, spacing: isFinite(sp) ? sp : null,
    minPart: shares.length ? Math.min(...shares) : 0, maxPart: shares.length ? Math.max(...shares) : 0, mainShare: main ? main.share : 0, mainName: main ? main.name : '', bigSolid: big ? big.share : 0, onBed,
    garnBig: main ? garn.filter(g => g.n > 0.5*main.n).map(g => g.name + ' ' + Math.round(g.n/main.n*100) + '% of main') : [], sauces, nVis: vis.length,
    pos: vis.map(p => ({ name: p.name, group: GROUP[p.role] || p.role, x: (p.c[0]-a.cx)/a.rx, y: (p.c[1]-a.cy)/a.ry, share: p.share })),
    maxElong: el ? el.elong : 0, elongName: el ? el.name : '', sauceElong: sel ? sel.elong : 0, sauceElongName: sel ? sel.name : '' };
}
// ---------- the book's own plates: servingware from the leading shapes, parts from the pins ----------
function bookPlate(r) {
  const prims = flatten(ART.plates[r.art]), cen = p => [(p.box[0]+p.box[2])/2, (p.box[1]+p.box[3])/2], bw = p => p.box[2]-p.box[0], bh = p => p.box[3]-p.box[1];
  const round = p => p.tag === 'circle' || (p.tag === 'ellipse' && Math.abs(bw(p)-bh(p)) < 2), c0 = cen(prims[0]); let k = 0; const ware = [];
  while (k < prims.length) { const p = prims[k], c = cen(p), big = (round(p) || p.tag === 'rect') && bw(p) >= 110 && Math.hypot(c[0]-c0[0], c[1]-c0[1]) < 12, thin = ware.length >= 2 && unfilled(p) && (p.sw < 3 || p.op < 0.8), tiny = ware.length >= 2 && bw(p)*bh(p) < 4;
    if (big || thin || tiny) { ware.push(p); k++; } else break; }
  const body = ware.filter(p => (round(p) || p.tag === 'rect') && p.stroke && p.stroke !== 'none' && !unfilled(p))[0] || ware[1] || ware[0], bc = cen(body), BR = bw(body)/2;
  const well = ware.filter(p => p !== body && (round(p) || p.tag === 'rect') && bw(p) < bw(body)*0.97 && bw(p) > bw(body)*0.55 && Math.hypot(cen(p)[0]-bc[0], cen(p)[1]-bc[1]) < 3).sort((x, y) => bw(x)-bw(y))[0];
  let a, kind;
  if (body.tag === 'rect') { a = { shape: 'box', cx: bc[0], cy: bc[1], rx: bw(body)/2-8, ry: bh(body)/2-8 }; kind = /^#F/i.test(body.fill) ? 'platter' : 'board'; }
  else { const std = Math.abs(BR-100) < 1 && (!well || Math.abs(bw(well)/2-82) < 1), rr = std ? 78.4 : well ? bw(well)/2*0.98 : BR*0.8*0.98; a = { shape: 'ellipse', cx: bc[0], cy: bc[1], rx: rr, ry: rr }; kind = std ? 'plate30' : well && !unfilled(well) ? 'bowl(r' + Math.round(BR) + ')' : 'plate(r' + Math.round(BR) + ')'; }
  const food = prims.slice(k), G = grid(a), wareArea = Math.PI*a.rx*a.ry;
  const pins = (r.pins || []).map(p => ({ name: p.label, role: roleOfLabel(p.label, r), x: 2+2.12*p.x, y: 16+2.12*p.y, prims: [] })), un = [], solidG = /^(protein|starch|vegsalad|bread|dessert)$/, baseG = /^(sauce|starch|vegsalad)$/;
  // each shape goes to a pin inside it (a big base prefers a sauce, starch or veg pin, a small shape a solid one), else the nearest pin within 60 units
  food.forEach(q => { if (!counts(q)) return; const c = cen(q), inside = pins.filter(p => unfilled(q) ? nearPolys(q.polys, p.x, p.y, q.sw/2+2) : inPolys(q.polys, p.x, p.y));
    const near = L => L.slice().sort((x, y) => Math.hypot(x.x-c[0], x.y-c[1])-Math.hypot(y.x-c[0], y.y-c[1]))[0], big = bw(q)*bh(q) >= 0.35*wareArea, pref = inside.filter(p => (big ? baseG : solidG).test(GROUP[p.role] || ''));
    let o = pref.length ? near(pref) : inside.length ? near(inside) : near(pins); if (o && !inside.length && Math.hypot(o.x-c[0], o.y-c[1]) > 60) o = null; if (o) o.prims.push(q); else un.push(q); });
  const m = measure(G, pins, un), R = Math.sqrt(a.rx*a.ry);
  m.kind = kind; m.parts = pins.length; m.area = a;
  m.pinPos = pins.map(p => ({ name: p.name, group: GROUP[p.role] || p.role, x: (p.x-a.cx)/a.rx, y: (p.y-a.cy)/a.ry }));
  m.sauceHow = pins.filter(p => GROUP[p.role] === 'sauce').map(p => {
    const ram = food.some(q => q.tag === 'circle' && /^#(FFFFFF|FFF|F7F5F0|F4F1EA|F6F2EA|FAF8F3)$/i.test(q.fill) && bw(q)/2 >= 8 && bw(q)/2 <= 26 && Math.hypot(cen(q)[0]-p.x, cen(q)[1]-p.y) < bw(q)/2);
    const s = m.sauces.find(x => x.name === p.name) || {}, line = p.prims.filter(counts).length && p.prims.filter(counts).every(unfilled);
    return p.name + ':' + (ram ? 'ramekin' : line ? 'line' : (s.underMain || 0) > 0.25 ? 'under-main' : (s.underOther || 0) > 0.25 ? 'under-' + s.other : 'beside'); });
  return m;
}
// ---------- Draw it for me, as the button does it on a fresh drawing (seed 0, js/smart.js:772) ----------
/* A sauce the recipe serves on the side: in a ramekin, as the book draws every one of them. Phrases, not the word side:
   the nachos' sour cream "on the other side" is spread on the nachos (15 Nov 2026). */
const WANT_SIDE = /on the side|side sauce|\bramekin|sauce of choice|\bchoice\b|\bchoose\b|\bguests?\b/i;
// Draw it for me, as the button does it on a fresh drawing (seed 0 is the button's own, js/smart.js ui.cmd)
function auto(r, seed) {
  const d = DR.blank(r.id, 'plate'); let res = null;
  DR.withDrawing(d, () => { res = S.drawIt(seed || 0); });
  const a = LIB.surface(d.surf).area, G = grid(a), by = {};
  // z: where the part is first drawn; a sauce drawn over a part (a dollop on a salad) is not under it
  DR.withDrawing(d, () => d.els.forEach((e, z) => { if (e.t !== 'item' && e.t !== 'raw') return; const it = e.t === 'item' ? LIB.get(e.a.split('@')[0]) : null, role = it ? it.role : e.role || 'main', key = e.ing || e.a;
    const p = by[key] = by[key] || { name: key, role, prims: [], els: 0, ids: {}, z }; p.els++; p.ids[it ? it.id : 'raw:' + (e.made || e.dr || '')] = it ? it.form || '' : 'card'; p.prims.push(...flatten(Rn.elSVG(e))); }));
  const parts = Object.values(by), m = measure(G, parts, []);
  m.style = res && res.style; m.kind = d.surf.fam + (d.surf.size || '') + (d.surf.shape && d.surf.shape !== 'round' ? d.surf.shape : ''); m.parts = parts.length; m.els = d.els.length; m.area = a; m.unsure = (res && res.unsure || []).map(u => u.ing);
  m.sauceHow = m.sauces.map(s => { const ids = Object.keys(s.p.ids), ram = ids.some(x => /ramekin/.test(x)), ing = (r.ingredients || []).find(i => Rn.ingName(i) === s.name), want = WANT_SIDE.test(s.name + ' ' + (ing && ing.note || ''));
    s.missingRamekin = want && !ram; return s.name + ':' + (ram ? 'ramekin' : (s.underMain > 0.25 ? 'under-main' : s.underOther > 0.25 ? 'under-' + s.other : 'beside') + '(' + Object.values(s.p.ids).join('/') + ')') + (want ? ' [recipe: side/choice]' : ''); });
  // what the rules below look at: the drawing as saved, and what Check says about it
  m.d = d; m.surf = d.surf; m.lv = d.layout && d.layout.lv;
  m.checks = DR.withDrawing(d, () => DR.check()).map(c => c.msg);
  const main = parts.filter(p => p.n && /^(main|dessert)$/.test(p.role)).sort((x, y) => y.n - x.n)[0];
  m.garnTotal = main ? parts.filter(p => p.n && /^(garnish|topping)$/.test(p.role)).reduce((t, p) => t + p.n, 0) / main.n : 0;
  return m;
}

// ---------- every dish (kinds main, snack, side, dessert) ----------
const q = (arr, p) => { const s = arr.filter(v => v != null && isFinite(v)).sort((x, y) => x-y); if (!s.length) return null; const i = (s.length-1)*p, lo = Math.floor(i); return s[lo]+(s[Math.min(s.length-1, lo+1)]-s[lo])*(i-lo); };
const pct = v => v == null ? '-' : Math.round(v*100) + '%', f2 = v => v == null ? '-' : v.toFixed(2), fam = k => /board|platter/.test(k) ? 'board' : 'plate';
const KEYS = ['cov', 'ov', 'ovHard', 'off', 'rg', 'gap', 'islands', 'minPart', 'maxPart', 'bigSolid', 'mainShare', 'spacing', 'parts'];
const OBSERVED = ['eye-fillet', 'pork-belly', 'brisket-board', 'pumpkin-salad', 'chicken-adobo', 'beef-cheek', 'fish-chips', 'caesar'];
let BOOK = null;
// the book's own plates and their bands, measured once (they do not change with Draw it for me)
function book(dishes) {
  if (BOOK) return BOOK;
  const hs = {}; dishes.forEach(r => { hs[r.id] = bookPlate(r); });
  const band = {}; ['plate', 'board'].forEach(F => { band[F] = {}; const L = dishes.map(r => hs[r.id]).filter(h => fam(h.kind) === F); KEYS.forEach(k => { band[F][k] = [q(L.map(h => h[k]), 0.1), q(L.map(h => h[k]), 0.5), q(L.map(h => h[k]), 0.9)]; }); });
  BOOK = { hs, band };
  return BOOK;
}
/* Combined badness: for each measure, how far outside the hand-made P10..P90 band of the same ware family (plates and bowls,
   or boards and platters), in band widths, capped at 3, weighted; plus a penalty for each fault the head chef sees. */
const pen = (v, b) => { if (v == null || b[0] == null) return 0; const w = Math.max(1e-3, b[2]-b[0]); return Math.min(3, Math.max(0, (b[0]-v)/w, (v-b[2])/w)); };
function score(x, band) {
  const B = band[fam(x.kind)], fl = [];
  let s = 2*pen(x.cov, B.cov) + 1.5*pen(x.off, B.off) + pen(x.gap, B.gap) + pen(x.rg, B.rg) + pen(x.islands, B.islands) + pen(x.bigSolid, B.bigSolid) + 2*Math.max(0, x.ovHard-0.15)/0.35;
  if (x.ovHard > 0.2) fl.push('overlap ' + x.hardPair + ' ' + pct(x.ovHard));
  x.sauces.forEach(sc => { if (sc.underOther > 0.25 && sc.underOther > sc.underMain) { s += 1; fl.push(sc.name + ' under ' + sc.other); } if (sc.missingRamekin) { s += 0.5; fl.push(sc.name + ' wants a ramekin'); } });
  if (x.garnBig.length) { s += Math.min(1, 0.5*x.garnBig.length); fl.push('garnish big: ' + x.garnBig.join(', ')); }
  if (x.sauceElong > 3 && !x.lineOk) { s += 0.5; fl.push('sauce stick ' + x.sauceElongName + ' ' + x.sauceElong.toFixed(1)); }
  if (x.maxElong > 3.5) { s += 0.5; fl.push('long ' + x.elongName + ' ' + x.maxElong.toFixed(1)); }
  if (x.style === 'bed' && x.onBed != null && x.onBed < 0.25) { s += 1; fl.push('main off its bed (' + pct(x.onBed) + ' on it)'); }
  if (x.els - x.parts >= 4) { s += 0.5; fl.push((x.els - x.parts) + ' extra copies'); }
  if (x.nVis >= 4 && x.maxPart < 0.08) { s += 0.5; fl.push('scattered: every part under 8%'); }
  if (x.unsure.length) fl.push('unsure: ' + x.unsure.join(','));
  x.score = s; x.flags = fl;
  return s;
}
// a sauce that is meant to be a line or a swoosh across the plate (its own words say so) is not a stick
const LINE_OK = /wav|squiggl|zigzag|\bline\b|across|swoop|swoosh|smear|swipe/i;
/* The rules every auto plate keeps (each one was broken by Draw it for me before 15 Nov 2026). Each returns the dishes
   that break it. */
const RULES = [
  ['no two solid parts overlap by more than 0.10 (not a main on its bed, not salad on salad)', x => x.ovHard > 0.10],
  ['food covers 20 to 65% of the servingware', x => x.cov < 0.20 || x.cov > 0.65],
  ['the food sits in the middle (off by 0.18 or less on a plate, 0.30 on a board)', x => x.off > (fam(x.kind) === 'board' ? 0.30 : 0.18)],
  ['on a bed, the main is at least half on it', x => x.style === 'bed' && x.onBed != null && x.onBed < 0.5],
  ['a sauce the recipe serves on the side is in a ramekin', x => x.sauces.some(s => s.missingRamekin)],
  ['garnish and toppings together are under 0.6 of the main (parmy toppers, tacos and boards apart: there the toppings are the dish)', x => !/parm|schnit|taco|nacho/i.test(x.r.name) && fam(x.kind) !== 'board' && x.garnTotal > 0.6],
  ['at most 3 extra copies on a plate', x => fam(x.kind) !== 'board' && x.els - x.parts > 3],
  ['the drawing carries the layout version (layout.lv 2)', x => x.lv !== 2],
  ['a board is the book\'s size (36)', x => fam(x.kind) === 'board' && x.surf.size !== 36],
  ['Check finds nothing missing or off the servingware', x => x.checks.some(c => / is in the recipe but not on the | is off the /.test(c) && !x.unsure.some(u => c.indexOf(u + ' ') === 0))]
];
function check(o) {
  o = o || {};
  const e = bind(), seeds = o.seeds || [0], dishes = e.D.recipes.filter(r => ['main', 'snack', 'side', 'dessert'].indexOf(r.kind) >= 0 && (!o.ids || o.ids.indexOf(r.id) >= 0));
  const { hs, band } = book(e.D.recipes.filter(r => ['main', 'snack', 'side', 'dessert'].indexOf(r.kind) >= 0));
  const out = seeds.map(seed => {
    const rows = dishes.map(r => { const x = auto(r, seed); x.r = r; x.lineOk = LINE_OK.test(x.sauceElongName ? x.sauceElongName + ' ' + ((r.ingredients || []).find(i => Rn.ingName(i) === x.sauceElongName) || {}).note : ''); score(x, band); return { r, h: hs[r.id], x }; });
    const sc = rows.map(o2 => o2.x.score), rank = rows.slice().sort((a, b) => b.x.score - a.x.score);
    const rules = RULES.map(rl => ({ rule: rl[0], fails: rows.filter(o2 => rl[1](o2.x)).map(o2 => o2.r.id) }));
    return { seed, rows, median: q(sc, 0.5), mean: sc.reduce((a, b) => a + b, 0) / (sc.length || 1), over2: sc.filter(v => v > 2).length, worst: rank[0] ? { id: rank[0].r.id, score: rank[0].x.score } : null, rank,
      observed: OBSERVED.reduce((m, id) => { const w = rows.find(o2 => o2.r.id === id); if (w) m[id] = w.x.score; return m; }, {}), rules };
  });
  return o.seeds ? out : out[0];
}
function print(res, all) {
  const { rows } = res;
  if (all) {
    console.log('id | kind | style | ware | parts/els | cov (book) | ov / ovHard | off (book) | gap deg (book) | islands (book) | bigSolid (book) | sauces | score | flags');
    rows.forEach(({ r, h, x }) => console.log([r.id, r.kind, x.style, x.kind, x.parts + '/' + x.els, pct(x.cov) + ' (' + pct(h.cov) + ')', f2(x.ov) + '/' + f2(x.ovHard), f2(x.off) + ' (' + f2(h.off) + ')', x.gap + ' (' + h.gap + ')', x.islands + ' (' + h.islands + ')', pct(x.bigSolid) + ' (' + pct(h.bigSolid) + ')', x.sauceHow.join('; ') || '-', x.score.toFixed(1), x.flags.join('; ')].join(' | ')));
    console.log('');
  }
  console.log('Seed ' + res.seed + ': ' + rows.length + ' dishes, score median ' + res.median.toFixed(2) + ', mean ' + res.mean.toFixed(2) + ', over 2: ' + res.over2 + ', worst ' + res.worst.id + ' ' + res.worst.score.toFixed(1));
  console.log('\n15 worst:');
  res.rank.slice(0, 15).forEach((o, k) => console.log('  ' + (k + 1) + '. ' + o.r.id + ' ' + o.x.score.toFixed(1) + ' | ' + o.x.style + ', ' + o.x.kind + ' | cov ' + pct(o.x.cov) + ' (book ' + pct(o.h.cov) + '), off ' + f2(o.x.off) + ', gap ' + o.x.gap + ' | ' + o.x.flags.join('; ')));
  console.log('\nObserved: ' + Object.keys(res.observed).map(id => id + ' ' + res.observed[id].toFixed(1)).join(', '));
  console.log('\nRules:');
  res.rules.forEach(rl => console.log('  ' + (rl.fails.length ? 'BROKEN ' : 'kept   ') + rl.rule + (rl.fails.length ? ' (' + rl.fails.length + ': ' + rl.fails.slice(0, 12).join(', ') + (rl.fails.length > 12 ? ', ...' : '') + ')' : '')));
}
module.exports = { check, print, RULES, OBSERVED };
if (require.main === module) print(check(), process.argv[2] === 'all');
