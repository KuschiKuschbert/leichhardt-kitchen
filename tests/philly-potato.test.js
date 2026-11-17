/* Philly Cheesesteak Loaded Potato (card 137), 17 November 2026. The AVC Live amounts per serve and nothing else from
   AVC (no prices, supplier names or product codes); the head chef's build: 2 potatoes gently squashed, loaded with
   brisket, capsicum, caramelised onion and cheese sauce, through the impinger, then ranch, fried onions and spring
   onion on top; the links to the brisket, American cheese sauce and ranch cards; the bought-in crispy fried onions kept
   apart from the house fried onions and marked may contain gluten; Specials; a search for the AVC name finds it; and
   nothing scrolls sideways at 390, 768 and 1280 px. */
const L = require('./lib');
const { R, ok } = L.results();
(async () => {
 global.window = {};
 require('../js/art.js'); require('../js/data.js');
 const D = window.LK_DATA, A = window.LK_ART, r = D.recipes.find(x => x.id === 'philly-potato');
 ok(!!r && r.no === '137' && D.recipes.filter(x => x.no === '137').length === 1, 'card 137 is the Philly Cheesesteak Loaded Potato, and no other card is 137');
 ok(!!A.plates[r.art], 'it has a plate drawing');
 const ing = name => r.ingredients.find(i => i.name === name) || {};
 ok(ing('Washed potatoes').q === '250 g' && ing('Pulled BBQ brisket').q === '100 g' && ing('Roast capsicum strips').q === '60 g' &&
  ing('Caramelised onion').q === '80 g' && ing('American cheese sauce').q === '50 g' && ing('Ranch dressing').q === '50 ml' &&
  ing('Crispy fried onions').q === '15 g' && ing('Spring onion').q === '0.05 bunch' && r.ingredients.length === 8, 'every amount is the AVC Live amount per serve');
 ok(ing('Pulled BBQ brisket').link === 'brisket' && ing('American cheese sauce').link === 'american-cheese-sauce' && ing('Ranch dressing').link === 'ranch', 'the brisket, cheese sauce and ranch open their cards');
 ok(!ing('Crispy fried onions').link && (ing('Crispy fried onions').tags || []).includes('Gluten?') && /not the house fried onions/.test(ing('Crispy fried onions').note),
  'the bought-in crispy fried onions are not the house fried onions, and may contain gluten');
 const steps = r.sections[0].steps, at = re => steps.findIndex(t => re.test(t));
 ok(/2 potatoes/.test(ing('Washed potatoes').note) && at(/^Gently squash 2 potatoes/) >= 0, 'two potatoes, gently squashed');
 ok(at(/^Gently squash/) < at(/^Load them with 100 g pulled BBQ brisket, 60 g roast capsicum, 80 g caramelised onion and 50 g American cheese sauce/) &&
  at(/^Load/) < at(/impinger/) && at(/impinger/) < at(/^Top with 50 ml ranch dressing, 15 g crispy fried onions and the spring onion/),
  'squash, load, through the impinger, then the toppings, in that order');
 ok(['Ranch dressing', 'Crispy fried onions', 'Spring onion'].every(n => /after the impinger/.test(ing(n).note)), 'the toppings go on after the impinger');
 const text = JSON.stringify(r);
 ok(!/\$|\bGP\b|PFD|Simon George|A La Carte|POTW15|T300244|208559|254555|214076|396332|254723/.test(text), 'nothing from AVC beyond ingredient names and amounts');
 ok(D.menuOrder.find(s => s.title === 'Specials').ids.includes('philly-potato'), 'it is on Specials');
 ok(r.pins.every(p => p.x > 0 && p.x < 100 && p.y > 0 && p.y < 100), 'every pin sits on the drawing');
 ok(!/—/.test(text + A.plates[r.art]), 'no em dashes');
 const b = await L.start();
 for (const width of [390, 768, 1280]) {
  const p = await L.open(b, '#/r/philly-potato', { width, height: 900, wait: 1200 });
  await L.settle(p, 400);
  ok(/Philly Cheesesteak Loaded Potato/.test(await p.locator('#rtitle').textContent()), width + ': the potato opens');
  ok(!(await L.overflow(p)), width + ': the card fits');
  ok(await p.locator('#r-plate .pin').count() === r.pins.length, width + ': every pin is on the plate');
  const main = await p.locator('main').innerText();
  ok(!/Not complete yet/i.test(main), width + ': every linked card is in the book');
  ok(/Gluten/.test(main) && /Milk/.test(main), width + ': gluten (the fried onions) and milk (the cheese sauce) roll up');
  await p.click('main .ing a[href$="/american-cheese-sauce"]'); await L.settle(p, 400);
  ok(/American Cheese Sauce/.test(await p.locator('#rtitle').textContent()), width + ': the cheese sauce opens card 117');
  await p.goto(L.BASE + '#/recipes'); await L.settle(p, 400);
  await p.fill('#find', 'loaded spuds'); await L.settle(p, 400);
  const found = await p.evaluate(() => [...document.querySelectorAll('#shelves a.dish:not(.faded), #results a.tile')].map(a => a.getAttribute('href')));
  ok(found.some(h => /\/philly-potato$/.test(h)), width + ': a search for the AVC name finds it');
  await p.fill('#find', 'gluten free'); await L.settle(p, 400);
  const gf = await p.evaluate(() => [...document.querySelectorAll('#shelves a.dish:not(.faded), #results a.tile')].map(a => a.getAttribute('href')));
  ok(!gf.some(h => /\/philly-potato$/.test(h)), width + ': gluten free leaves it out');
  ok(p.errors.length === 0, width + ': no page errors ' + p.errors.join(' | '));
  await p.context().close();
 }
 await b.close(); L.report(R);
})();
