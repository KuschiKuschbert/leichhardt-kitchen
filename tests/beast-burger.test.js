/* Beast Burger (card 135), 16 November 2026. The head chef's build, bottom to top, on the card, in the plating steps
   and in the build drawing; the confirmed links (house BBQ, American cheese sauce, cowboy candy, Alabama white, pork
   belly, smash patty); the smash patty card to come keeps it Not complete yet and out of Free from; a search for the
   working title finds it; and nothing scrolls sideways at 390, 768 and 1280 px. */
const L = require('./lib');
const { R, ok } = L.results();
(async () => {
 global.window = {};
 require('../js/art.js'); require('../js/data.js');
 const D = window.LK_DATA, A = window.LK_ART, r = D.recipes.find(x => x.id === 'beast-burger');
 ok(!!r && r.no === '135' && D.recipes.filter(x => x.no === '135').length === 1, 'card 135 is the Beast Burger, and no other card is 135');
 ok(!!A.plates[r.art] && !!A.diagrams[r.diagram], 'it has a plate drawing and a build drawing');
 const q = name => (r.ingredients.find(i => i.name === name) || {}).q;
 ok(q('Smash patty') === '160 g' && q('Pork belly') === '80 g' && q('Southern-style chicken tenders') === '2' && q('Smoked pulled lamb') === '120 g' &&
  q('Burger cheese') === '2 slices' && q('Oak leaf lettuce') === '20 g' && q('Pickles') === '50 g' && q('Cowboy candy') === '50 g' &&
  q('House BBQ sauce') === '30 ml' && q('Alabama white sauce') === '50 ml' && q('American cheese sauce') === '50 ml' &&
  q('Sourdough cob loaf') === '1' && q('Chips') === '160 g' && q('Onion rings') === '5', 'every amount is the head chef\'s');
 const link = name => (r.ingredients.find(i => i.name === name) || {}).link;
 ok(link('House BBQ sauce') === 'house-bbq-sauce' && link('American cheese sauce') === 'american-cheese-sauce' && link('Cowboy candy') === 'cowboy-candy' &&
  link('Alabama white sauce') === 'alabama-white-sauce' && link('Pork belly') === 'pork-belly-batch' && link('Smash patty') === 'smash-patty', 'the sauces, cowboy candy, pork belly and patty open their cards');
 const build = ['Cob base', 'House BBQ sauce', 'Oak leaf', 'Pickles', 'Smashed patties', 'Cheese', 'Chicken tenders', 'Pork belly', 'Pulled lamb', 'Cheese sauce', 'Cowboy candy', 'Onion rings', 'Alabama white sauce', 'Cob top'];
 const plating = r.sections.find(s => /bottom to top/.test(s.title)).steps;
 ok(build.every((b, n) => plating[n].startsWith(b)), 'the plating steps follow the head chef\'s build, bottom to top');
 const named = [...A.diagrams[r.diagram].body.matchAll(/font-weight="700" font-size="10"[^>]*>([^<]+)</g)].map(m => m[1]);
 ok(named.join() === build.slice().reverse().join(), 'the build drawing names the same layers, top to bottom (' + named.join(', ') + ')');
 ok(r.pins.every(p => p.x > 0 && p.x < 100 && p.y > 0 && p.y < 100), 'every pin sits on the drawing');
 ok(!D.menuOrder.some(s => s.ids.includes('beast-burger')), 'a new dish, not on the guest menu yet');
 ok(!/—/.test(JSON.stringify(r) + A.diagrams[r.diagram].body), 'no em dashes');
 const b = await L.start();
 for (const width of [390, 768, 1280]) {
  const p = await L.open(b, '#/r/beast-burger', { width, height: 900, wait: 1200 });
  await L.settle(p, 400);
  ok(/Beast Burger/.test(await p.locator('#rtitle').textContent()), width + ': the burger opens');
  ok(!(await L.overflow(p)), width + ': the card fits');
  ok(await p.locator('#r-plate .pin').count() === r.pins.length, width + ': both pins are on the plate');
  ok(await p.locator('svg.diagram text').count() >= 16, width + ': the build drawing shows each layer by name');
  const warn = await p.locator('main .warn').first().innerText();
  ok(/Not complete yet/i.test(warn) && /Smash patty/i.test(warn), width + ': the smash patty card to come keeps it Not complete yet');
  ok(/Egg/.test(await p.locator('main').innerText()), width + ': the Alabama white sauce egg rolls up into the burger');
  await p.click('main .ing a[href$="/cowboy-candy"]'); await L.settle(p, 400);
  ok(/Cowboy Candy/.test(await p.locator('#rtitle').textContent()), width + ': cowboy candy opens card 109');
  await p.goto(L.BASE + '#/recipes'); await L.settle(p, 400);
  await p.fill('#find', 'mixed meat monster'); await L.settle(p, 400);
  const found = await p.evaluate(() => [...document.querySelectorAll('#shelves a.dish:not(.faded), #results a.tile')].map(a => a.getAttribute('href')));
  ok(found.some(h => /\/beast-burger$/.test(h)), width + ': a search for the working title finds it');
  await p.fill('#find', 'gluten free'); await L.settle(p, 400);
  const gf = await p.evaluate(() => [...document.querySelectorAll('#shelves a.dish:not(.faded), #results a.tile')].map(a => a.getAttribute('href')));
  ok(!gf.some(h => /\/beast-burger$/.test(h)), width + ': gluten free leaves it out');
  ok(p.errors.length === 0, width + ': no page errors ' + p.errors.join(' | '));
  await p.context().close();
 }
 await b.close(); L.report(R);
})();
