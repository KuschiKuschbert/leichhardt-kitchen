/*
  The bake-off's results: every dish's AI plate scored against Draw it for me's with tests/plating-check.js, and the
  blind page for the head chef. Reads results/<dish id>.json (from run.js), writes to docs/ai-drawing-options/bakeoff/:
    results.json   one row per dish: both scores, the AI plate's faults, cost, seconds, what it left off and why
    summary.md     the numbers
    blind.html     15 dishes side by side, left and right shuffled, the head chef picks; the key stays in results/key.json
  node report.js [--in results] [--out folder]
*/
const fs = require('fs'), path = require('path');
const H = require('./harness.js');
const arg = (k, v) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : v; };
const IN = path.resolve(arg('--in', path.join(__dirname, 'results'))), OUT = path.resolve(arg('--out', path.join(__dirname, '..', '..', 'docs', 'ai-drawing-options', 'bakeoff')));
fs.mkdirSync(OUT, { recursive: true });
const q = (a, p) => { const s = a.filter(v => v != null && isFinite(v)).sort((x, y) => x - y); if (!s.length) return null; const i = (s.length - 1) * p, lo = Math.floor(i); return s[lo] + (s[Math.min(s.length - 1, lo + 1)] - s[lo]) * (i - lo); };
const f2 = v => v == null ? '-' : v.toFixed(2);
// a fixed shuffle (the same page every time it is made)
const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

const rows = [];
H.DISHES.forEach(r => {
  const f = path.join(IN, r.id + '.json'); if (!fs.existsSync(f)) return;
  const rec = JSON.parse(fs.readFileSync(f, 'utf8')), x = H.rules(r);
  const miss = z => z.checks.filter(c => / is in the recipe but not on the | is off the /.test(c));
  const row = { id: r.id, name: r.name, rules: x.score, rulesFlags: x.flags, rulesMissing: miss(x), seconds: rec.seconds, cost: rec.cost, served: rec.served, stop: rec.stop };
  if (!rec.answer) { row.failed = rec.error || rec.parseError || rec.stop; rows.push(row); return; }
  const b = H.brief(r, x), t = H.toDrawing(r, rec.answer, b.parts, x), y = H.scoreAI(r, t.d, x);
  Object.assign(row, { ai: y.score, aiFlags: y.flags, errors: t.errs, missing: miss(y), ware: rec.answer.ware, idea: rec.answer.idea, leftOff: rec.answer.left_off, parts: (rec.answer.parts || []).length });
  row._svgAI = H.svgOf(t.d); row._svgRules = H.svgOf(x.d);
  rows.push(row);
});
const ok = rows.filter(r => r.ai != null), cost = rows.reduce((t, r) => t + (r.cost || 0), 0);
const better = ok.filter(r => r.ai < r.rules - 0.1).length, worse = ok.filter(r => r.ai > r.rules + 0.1).length;
const sum = [
  '# AI drawing bake-off: the numbers',
  '',
  'Made by `scripts/ai-bakeoff/report.js` from ' + rows.length + ' dishes (' + ok.length + ' with an AI plate). Scores are `tests/plating-check.js` against the book\'s own 76 hand-made plates: lower is better, the book\'s own plates score about 0.',
  '',
  '| | Draw it for me | Claude |',
  '| --- | --- | --- |',
  '| Score median | ' + f2(q(ok.map(r => r.rules), 0.5)) + ' | ' + f2(q(ok.map(r => r.ai), 0.5)) + ' |',
  '| Score mean | ' + f2(ok.reduce((t, r) => t + r.rules, 0) / (ok.length || 1)) + ' | ' + f2(ok.reduce((t, r) => t + r.ai, 0) / (ok.length || 1)) + ' |',
  '| Dishes over 2 | ' + ok.filter(r => r.rules > 2).length + ' | ' + ok.filter(r => r.ai > 2).length + ' |',
  '| Something in the recipe missing or off the servingware | ' + ok.filter(r => r.rulesMissing.length).length + ' | ' + ok.filter(r => r.missing.length).length + ' |',
  '',
  'Claude better by more than 0.1: ' + better + '. Worse by more than 0.1: ' + worse + '. About the same: ' + (ok.length - better - worse) + '.',
  '',
  'Cost: US$' + cost.toFixed(2) + ' in all, median US$' + f2(q(rows.map(r => r.cost), 0.5)) + ' a plate. Wait: median ' + f2(q(rows.map(r => r.seconds), 0.5)) + ' s, slowest 10% over ' + f2(q(rows.map(r => r.seconds), 0.9)) + ' s.',
  'Failed answers: ' + rows.filter(r => r.failed).length + '. Answers served by another model: ' + rows.filter(r => r.served && r.served !== 'claude-opus-5-5').length + '. Unknown pieces or names in answers: ' + ok.filter(r => r.errors.length).length + ' dishes.',
  '',
  '| Dish | Draw it for me | Claude | Claude\'s faults | Claude left off |',
  '| --- | --- | --- | --- | --- |'
].concat(ok.slice().sort((a, b) => (a.ai - a.rules) - (b.ai - b.rules)).map(r => '| ' + r.name + ' | ' + f2(r.rules) + ' | ' + f2(r.ai) + ' | ' + (r.aiFlags.concat(r.missing).join('; ') || '-').replace(/\|/g, '/') + ' | ' + ((r.leftOff || []).map(l => l.ingredient).join(', ') || '-').replace(/\|/g, '/') + ' |'));
fs.writeFileSync(path.join(OUT, 'summary.md'), sum.join('\n') + '\n');
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(rows.map(r => { const o = Object.assign({}, r); delete o._svgAI; delete o._svgRules; return o; }), null, 1));

// the blind page: the 10 dishes Draw it for me draws worst, and 5 more picked by a fixed shuffle
const worst = ok.slice().sort((a, b) => b.rules - a.rules).slice(0, 10), rest = ok.filter(r => worst.indexOf(r) < 0).sort((a, b) => hash(a.id) - hash(b.id)).slice(0, 5);
const pick = worst.concat(rest).sort((a, b) => hash('o' + a.id) - hash('o' + b.id)), key = {};
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cards = pick.map((r, k) => { const aiLeft = hash('side' + r.id) % 2 === 0; key[k + 1] = { id: r.id, left: aiLeft ? 'Claude' : 'Draw it for me' };
  const L = aiLeft ? r._svgAI : r._svgRules, R = aiLeft ? r._svgRules : r._svgAI;
  return '<section class="pair" data-n="' + (k + 1) + '"><h2>' + (k + 1) + '. ' + esc(r.name) + '</h2><div class="two"><figure>' + L + '<figcaption>Left</figcaption></figure><figure>' + R + '<figcaption>Right</figcaption></figure></div>' +
    '<p class="ask">Which plate would you rather your cooks follow?</p><div class="btns"><button data-v="L">Left</button><button data-v="R">Right</button><button data-v="B">Both fine</button><button data-v="N">Neither</button></div></section>'; });
// the key stays with the raw results (not in the repo) until the head chef has picked
fs.writeFileSync(path.join(IN, 'key.json'), JSON.stringify(key, null, 1));
const page = '<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Plate bake-off</title><style>' +
  ':root{--paper:#F7F4EE;--ink:#2B2A28;--muted:#6B665E;--line:#DDD6CA;--accent:#B5471B;--on:#FFFFFF}' +
  '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--paper:#1E1D1B;--ink:#EFEAE2;--muted:#B5AEA3;--line:#3A3833;--accent:#E07A4F;--on:#1E1D1B}}' +
  ':root[data-theme="dark"]{--paper:#1E1D1B;--ink:#EFEAE2;--muted:#B5AEA3;--line:#3A3833;--accent:#E07A4F;--on:#1E1D1B}' +
  'body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.45 system-ui,sans-serif}main{max-width:900px;margin:0 auto;padding:16px}' +
  'h1{font-size:1.5rem;margin:.5rem 0}h2{font-size:1.15rem;margin:0 0 .5rem}.pair{border-top:1px solid var(--line);padding:1rem 0}' +
  '.two{display:grid;grid-template-columns:1fr 1fr;gap:12px}figure{margin:0;background:#F4F1EA;border-radius:12px;padding:6px}figure svg{width:100%;height:auto;display:block}' +
  'figcaption{text-align:center;font-weight:700;color:#2B2A28;padding:4px 0}.ask{margin:.75rem 0 .5rem}.btns{display:flex;flex-wrap:wrap;gap:8px}' +
  'button{min-height:44px;min-width:44px;padding:0 16px;border-radius:10px;border:1px solid var(--line);background:transparent;color:var(--ink);font:inherit;font-weight:600;cursor:pointer}' +
  'button[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:var(--on)}button:focus-visible{outline:3px solid var(--accent);outline-offset:2px}' +
  '#code{font:600 1.1rem ui-monospace,monospace;word-break:break-all;background:var(--line);padding:.5rem .75rem;border-radius:8px}.note{color:var(--muted)}</style></head><body><main>' +
  '<h1>Plate bake-off</h1><p>Each dish is drawn twice: once by the book\'s own rules (Draw it for me) and once by Claude, using the same drawing pieces. Left and right are shuffled. Pick the plate you would rather your cooks follow. Nothing is saved anywhere; when you finish, send back the code at the bottom.</p>' +
  cards.join('') + '<section class="pair"><h2>Your picks</h2><p id="code">Pick at least one plate.</p><p class="note">Copy this line and send it back in the chat.</p><button id="copy" type="button">Copy the code</button> <span id="copied" role="status" aria-live="polite"></span></section>' +
  '<script>var picks={};document.querySelectorAll(".pair[data-n]").forEach(function(s){s.querySelectorAll("button").forEach(function(b){b.setAttribute("aria-pressed","false");b.addEventListener("click",function(){s.querySelectorAll("button").forEach(function(o){o.setAttribute("aria-pressed",o===b?"true":"false")});picks[s.dataset.n]=b.dataset.v;var k=Object.keys(picks).sort(function(a,c){return a-c});document.getElementById("code").textContent=k.length?"Bake-off: "+k.map(function(n){return n+picks[n]}).join(" "):"Pick at least one plate."})})});' +
  'document.getElementById("copy").addEventListener("click",function(){var t=document.getElementById("code").textContent;try{navigator.clipboard.writeText(t).then(function(){document.getElementById("copied").textContent="Copied."},function(){document.getElementById("copied").textContent="Could not copy: select the line and copy it."})}catch(e){document.getElementById("copied").textContent="Could not copy: select the line and copy it."}});</script>' +
  '</main></body></html>';
fs.writeFileSync(path.join(OUT, 'blind.html'), page);
console.log(sum.slice(0, 14).join('\n'));
console.log('wrote', OUT);
