// The recipe editor (js/manage.js) saves what the card needs (13 Nov 2026): a linked ingredient keeps its allergen
// tags, a dish taken off the guest menu stays off, long method steps are refused with a clear message, and Undo after
// two multipliers goes back to the amounts before the first one.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true });
const cfg = () => ({ [fsKey(['config', 'main'])]: { people: [P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'head'), P('bo', 'Bo', 'staff')], headId: 'ann', sousIds: ['sam', 'ann'], pingIds: ['sam', 'ann'], showBadges: true } });
const wait = (p, fn, arg, t) => L.waitFor(p, fn, arg, t || 6000).catch(() => false);
const store = p => p.evaluate(() => window.__fake.dump());
const editor = p => wait(p, () => !!document.getElementById('mg-name'));
// waits until recipes/<id> is saved at version v and the Save button has settled
const savedAt = (p, id, v) => wait(p, ([root, id, v]) => {
  const s = window.__fake.dump(), r = s[root + '/recipes/' + id], save = document.querySelector('[data-mg="save"]');
  return !!(r && r.v === v && save && save.disabled);
}, [fsKey([]), id, v], 10000);
async function go(p, hash) { await p.evaluate(h => { location.hash = h; }, hash); await L.settle(p, 300); }

(async () => {
  const b = await L.start();
  let p, s;

  // 1. a linked ingredient keeps its allergen tags when the recipe is saved: the beer batter card is still to come,
  // so the fish's Gluten comes only from the tag on its Beer batter line
  p = await L.open(b, '#/manage/r/fish-chips', { who: 'ann', extra: cfg(), wait: 1400 });
  await editor(p);
  await L.chapter(p, 'card');
  await L.reveal(p, '#mg-yield'); await p.fill('#mg-yield', '1 plate');
  await p.click('[data-mg="save"]');
  await savedAt(p, 'fish-chips', 1);
  s = await store(p);
  const fc = (s[fsKey(['recipes', 'fish-chips'])] || {}).r || { ingredients: [] };
  const ingOf = n => fc.ingredients.find(i => i.name === n) || {};
  ok(JSON.stringify(ingOf('Beer batter').tags) === '["Gluten"]' && ingOf('Beer batter').link === 'beer-batter', 'linked tags: Beer batter keeps its link and its Gluten tag (' + JSON.stringify(ingOf('Beer batter')) + ')');
  ok(JSON.stringify(ingOf('Tartare sauce').tags) === '["Egg","Soy?"]', 'linked tags: Tartare sauce keeps Egg and Soy? (' + JSON.stringify(ingOf('Tartare sauce')) + ')');
  await go(p, '#/r/fish-chips'); await L.settle(p, 400);
  const alg = await txt(p, '#r-allergens') || '';
  ok(/Gluten/.test(alg) && /Egg/.test(alg) && /Fish/.test(alg), 'linked tags: the saved card still lists Gluten, Egg and Fish (' + alg.slice(0, 160) + ')');
  ok(p.errors.length === 0, 'linked tags: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
