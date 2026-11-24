/*
  AI drawing bake-off: ask Claude to lay out each plated dish from the book's own parts and library pieces.
  node run.js [--cap 15] [--only id,id] [--limit n] [--effort medium]
  node run.js --selftest      checks the conversion and the scoring, no API call
  node run.js --dry           shows the prompt's size, no API call
  Results go to results/<dish id>.json; a dish already there is skipped, so a stopped run carries on.
  Stops before a call once the money spent reaches the cap (US$), counted from each answer's real token counts.
*/
const fs = require('fs'), path = require('path');
const Anthropic = require('@anthropic-ai/sdk').default || require('@anthropic-ai/sdk');
const H = require('./harness.js');
const arg = (k, v) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : v; };
const CAP = +arg('--cap', 15), ONLY = (arg('--only', '') || '').split(',').filter(Boolean), LIMIT = +arg('--limit', 0);
const OUT = path.join(__dirname, 'results'); fs.mkdirSync(OUT, { recursive: true });
const MODEL = 'claude-opus-5-5', EFFORT = arg('--effort', 'medium');
// US$ per million tokens, Claude Opus 5.5 (cache write 1.25x input for the 5 minute cache)
const PRICE = { in: 4, out: 20, cw: 5, cr: 0.2 };

const SYSTEM = [
  'You lay out plate drawings for a pub kitchen\'s recipe book in Australia. The drawing shows the servingware from above, as the cook plates it. Cooks read it on a phone at arm\'s length to plate the dish the same way every time, and The Pass labels each part.',
  '',
  'You get one dish: its ingredients, its method, and what the book draws today for each ingredient. You answer with the servingware and the parts to draw, each placed and sized.',
  '',
  'Coordinates. x and y run from -1 to 1 across the food area of the servingware (the well of a plate, the inside of a bowl, the top of a board). x -1 is the left edge, 1 the right edge. y -1 is the back (away from the guest), 1 the front. width is the part\'s width as a share of the food area\'s width: 0.5 is half way across. squash is its height scale against its width scale (1 as drawn, 0.5 flattened, for a drizzle or a line of sauce). turn is degrees clockwise.',
  'List the parts bottom to top: what comes first is drawn underneath (rice under the chicken, a sauce pool under a steak, the chicken under its garnish).',
  '',
  'The book\'s house style, measured from the head chef\'s 76 hand-made plates:',
  '- Food covers about 40% of a plate\'s food area; a lone main less. A board is packed edge to edge in rows, each part a similar size.',
  '- On a plate: the protein at the back, a little left of centre; chips at the front left; salad or veg at the front right; a sauce of choice or a dip with fried food in a ramekin at about 2 o\'clock (x 0.66, y -0.4).',
  '- A main served on mash, purée, rice or noodles sits on that bed, mostly on it. Several things on one bed spread over it.',
  '- Garnish is small: about a third of the main\'s width. Garnish and toppings together stay under 0.6 of the main, except a parmy\'s toppers, tacos and boards, where the toppings are the dish.',
  '- Solid parts do not overlap, except things meant to sit on each other. The food sits in the middle of the plate overall.',
  '- At most 3 extra copies of one piece on a plate (2 or 3 lemon wedges, not a scatter). Use one piece for a pile of chips or a scoop of rice.',
  '- A sauce served on the side, a sauce of choice or a dip uses the library piece "sauce-ramekin" (it takes the sauce\'s colour). A sauce poured over something is a drizzle or pool piece on it, not a long stick across the plate.',
  '- When the method says how it is plated (what goes on what, in a bowl, halves, on the side, a board\'s back row), follow it exactly.',
  '- Leave off what is not seen on the finished plate: rubs, marinades, stocks, oil, seasoning and sugar cooked in, a wrapper\'s filling. Every part a guest sees must be drawn.',
  '',
  'Each part names its ingredient with the exact name from the dish\'s "What the book draws today" list (or the ingredient list), and its piece: "book" uses the part the book already draws for that ingredient (drawn from its own card or picked from the library); a library id from the list below replaces it when the book\'s part is wrong, unsure or missing. Use only ids from the list. Prefer "book" for parts drawn from their own card.',
  'ware: "book" keeps the servingware the book picks; otherwise one of the servingware names below.',
  'left_off: each ingredient you do not draw, with a few words why. idea: one short sentence on how the plate is laid out.',
  '',
  'Servingware names:',
  H.WARE.map(w => w.name + ' (' + w.fam + ')').join('; '),
  '',
  'Library pieces (id | name | role | form | width x height in drawing units; a 30 cm plate\'s food area is about 157 units across):',
  H.CATALOGUE
].join('\n');

const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['ware', 'parts', 'left_off', 'idea'],
  properties: {
    ware: { type: 'string', enum: ['book'].concat(H.WARE.map(w => w.name)) },
    parts: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['ingredient', 'piece', 'x', 'y', 'width', 'squash', 'turn'],
      properties: { ingredient: { type: 'string' }, piece: { type: 'string' }, x: { type: 'number' }, y: { type: 'number' }, width: { type: 'number' }, squash: { type: 'number' }, turn: { type: 'number' } } } },
    left_off: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['ingredient', 'why'], properties: { ingredient: { type: 'string' }, why: { type: 'string' } } } },
    idea: { type: 'string' }
  }
};

const cost = u => ((u.input_tokens || 0) * PRICE.in + (u.output_tokens || 0) * PRICE.out + (u.cache_creation_input_tokens || 0) * PRICE.cw + (u.cache_read_input_tokens || 0) * PRICE.cr) / 1e6;
function spent() { return fs.readdirSync(OUT).filter(f => f.endsWith('.json')).reduce((t, f) => t + (JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8')).cost || 0), 0); }

// asks for a line without showing what is typed (a password prompt)
function askHidden(q) {
  return new Promise(res => {
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    process.stdout.write(q); rl._writeToOutput = () => {};
    rl.question('', a => { rl.close(); process.stdout.write('\n'); res(String(a || '').trim()); });
  });
}
async function main() {
  // --selftest: each named dish's own Draw it for me plate turned into an answer and back must score the same, so the
  // conversion and the scoring are faithful before any money is spent (writes stand-in answers to results-selftest/)
  if (process.argv.includes('--selftest')) {
    const ST = path.join(__dirname, 'results-selftest'); fs.mkdirSync(ST, { recursive: true }); let bad = 0;
    const LIB = require('../../tests/plating-check.js').env().LIB;
    for (const id of (arg('--selftest', '') || 'chicken-adobo,seafood-platter,wedges,butchers-board,caesar,haloumi-tacos').split(',')) {
      const r = H.DISHES.find(d => d.id === id), x = H.rules(r), b = H.brief(r, x), area = LIB.surface(x.surf).area;
      const parts = x.d.els.filter(e => e.t === 'item' || e.t === 'raw').map(e => { const it = e.t === 'item' ? LIB.get(e.a.split('@')[0]) : null, bx = String(e.bx || '').split(' ').map(Number), w = it ? it.w : bx[2] - bx[0];
        return { ingredient: e.ing || '', piece: it ? it.id : 'book', x: (e.x - area.cx) / area.rx, y: (e.y - area.cy) / area.ry, width: w * e.sx / (2 * area.rx), squash: e.sy / e.sx, turn: e.r || 0 }; });
      const ans = { ware: 'book', parts, left_off: [], idea: 'stand-in' }, t = H.toDrawing(r, ans, b.parts, x), y = H.scoreAI(r, t.d, x), same = Math.abs(y.score - x.score) < 1e-6 && !t.errs.length;
      if (!same) bad++;
      console.log((same ? 'same ' : 'DIFF ') + id + ' rules ' + x.score.toFixed(2) + ' converted ' + y.score.toFixed(2) + (t.errs.length ? ' ' + t.errs.join('; ') : ''));
      fs.writeFileSync(path.join(ST, id + '.json'), JSON.stringify({ id, answer: ans, seconds: 0, cost: 0, served: MODEL, stop: 'end_turn' }));
    }
    process.exit(bad ? 1 : 0);
  }
  if (process.argv.includes('--dry')) { console.log('system chars', SYSTEM.length, 'about', Math.round(SYSTEM.length / 3.3), 'tokens'); console.log(SYSTEM.slice(0, 3000)); return; }
  // the key is read from its own variable, so nothing else on the machine picks it up by itself
  // the key: LK_BAKEOFF_API_KEY if it is set, else typed when the run starts (hidden, kept in memory for this run only,
  // never written anywhere)
  let key = process.env.LK_BAKEOFF_API_KEY || '';
  if (!key && process.stdin.isTTY) key = await askHidden('Claude API key (typing is hidden, nothing is saved): ');
  if (!key) { console.log('No key: set LK_BAKEOFF_API_KEY, or run this in a terminal and type the key when asked.'); process.exit(2); }
  const client = new Anthropic({ apiKey: key }); key = '';
  let todo = H.DISHES.filter(r => !ONLY.length || ONLY.indexOf(r.id) >= 0).filter(r => !fs.existsSync(path.join(OUT, r.id + '.json')));
  if (LIMIT) todo = todo.slice(0, LIMIT);
  console.log('to do', todo.length, 'spent so far US$' + spent().toFixed(2), 'cap US$' + CAP);
  for (const r of todo) {
    const before = spent(); if (before + 0.5 > CAP) { console.log('stopping: US$' + before.toFixed(2) + ' spent, cap US$' + CAP); break; }
    const x = H.rules(r), b = H.brief(r, x), t0 = Date.now();
    let res, rec = { id: r.id, model: MODEL, effort: EFFORT };
    try {
      res = await client.beta.messages.create({
        model: MODEL, max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: b.text }],
        output_config: { effort: EFFORT, format: { type: 'json_schema', schema: SCHEMA } }
      });
    } catch (e) {
      console.log(r.id, 'error', e.status || '', e.message); rec.error = String(e.message).slice(0, 500); rec.seconds = (Date.now() - t0) / 1000;
      if (e.status === 401 || e.status === 403 || e.status === 400) { fs.writeFileSync(path.join(OUT, '_error.json'), JSON.stringify(rec, null, 1)); break; }
      continue;
    }
    rec.seconds = (Date.now() - t0) / 1000; rec.served = res.model; rec.stop = res.stop_reason; rec.usage = res.usage; rec.cost = cost(res.usage);
    const txt = (res.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    try { rec.answer = JSON.parse(txt); } catch (e) { rec.raw = txt.slice(0, 4000); rec.parseError = String(e.message); }
    fs.writeFileSync(path.join(OUT, r.id + '.json'), JSON.stringify(rec, null, 1));
    console.log(r.id, rec.stop, rec.seconds.toFixed(1) + ' s', 'US$' + rec.cost.toFixed(3), 'in', res.usage.input_tokens, 'cache r/w', res.usage.cache_read_input_tokens, '/', res.usage.cache_creation_input_tokens, 'out', res.usage.output_tokens, res.model !== MODEL ? 'SERVED BY ' + res.model : '');
  }
  console.log('total spent US$' + spent().toFixed(2));
}
main().catch(e => { console.error(e); process.exit(1); });
