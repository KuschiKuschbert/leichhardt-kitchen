/* BBQ Pulled Beef Loaded Fries (card 138), 19 November 2026. A special from the guest menu wording only: every amount
   is [Qty] (To come) until the head chef confirms it, and nothing from the ordering system beyond the menu words (no
   price); the links to the brisket, American cheese sauce, Alabama white sauce and cowboy candy cards; the fried
   shallots marked may contain gluten while house or bought in is to confirm; a plate drawing with every pin on it;
   Specials; a search for loaded fries or cowboy candy finds it; gluten free leaves it out; and nothing scrolls sideways
   at 390, 768 and 1280 px. */
const L = require('./lib');
const { R, ok } = L.results();
(async () => {
 global.window = {};
 require('../js/art.js'); require('../js/data.js');
 const D = window.LK_DATA, A = window.LK_ART, r = D.recipes.find(x => x.id === 'loaded-fries');
 ok(!!r && r.no === '138' && D.recipes.filter(x => x.no === '138').length === 1, 'card 138 is the BBQ Pulled Beef Loaded Fries, and no other card is 138');
 ok(r.kind === 'snack' && r.forLine === 'Special' && r.name === 'BBQ Pulled Beef Loaded Fries' && r.short === 'Loaded fries', 'a snack on Specials, short name Loaded fries');
 ok(!!A.plates[r.art] && A.plates[r.art].length > 1000, 'it has a plate drawing');
 const ing = name => r.ingredients.find(i => i.name === name) || {};
 ok(['Chips', 'Pulled BBQ brisket', 'Cheese sauce', 'Alabama white sauce', 'Fried shallots', 'Cowboy candy'].every(n => ing(n).q === '[Qty]') && r.ingredients.length === 6,
  'all six parts from the menu, and no amount until the head chef confirms it');
 ok(ing('Pulled BBQ brisket').link === 'brisket' && ing('Cheese sauce').link === 'american-cheese-sauce' &&
  ing('Alabama white sauce').link === 'alabama-white-sauce' && ing('Cowboy candy').link === 'cowboy-candy', 'the brisket, cheese sauce, Alabama white sauce and cowboy candy open their cards');
 ok(['brisket', 'american-cheese-sauce', 'alabama-white-sauce', 'cowboy-candy'].every(id => D.recipes.some(x => x.id === id)), 'every linked card is in the book');
 ok(!ing('Fried shallots').link && (ing('Fried shallots').tags || []).includes('Gluten?') && /\[house fried onions \(card 73\) or bought in, to confirm\]/.test(ing('Fried shallots').note),
  'the fried shallots may contain gluten until house or bought in is confirmed');
 ok(/\[smoked brisket \(card 79\) or oven brisket \(card 121\)/.test(ing('Pulled BBQ brisket').note) && /\[American cheese sauce \(card 117\) to confirm\]/.test(ing('Cheese sauce').note),
  'the brisket and the cheddar sauce say what is still to confirm');
 ok(/cowboy candy/.test(r.menu) && /Alabama white sauce/.test(r.menu) && /fried shallots/.test(r.menu), 'the guest menu words are on the card');
 const steps = r.sections[0].steps;
 ok(/^\[These steps follow the guest menu/.test(steps[0]), 'the method says the build order is still to confirm');
 const text = JSON.stringify(r);
 ok(!/\$|\bGP\b|price|meandu/i.test(text), 'no price and nothing from the ordering system beyond the menu words');
 ok(D.menuOrder.find(s => s.title === 'Specials').ids.includes('loaded-fries'), 'it is on Specials');
 ok(r.pins.length === 6 && r.pins.every(p => p.x > 0 && p.x < 100 && p.y > 0 && p.y < 100), 'six pins, every one on the drawing');
 ok(!/—/.test(text + A.plates[r.art]), 'no em dashes');
 const b = await L.start();
 for (const width of [390, 768, 1280]) {
  const p = await L.open(b, '#/r/loaded-fries', { width, height: 900, wait: 1200 });
  await L.settle(p, 400);
  ok(/BBQ Pulled Beef Loaded Fries/.test(await p.locator('#rtitle').textContent()), width + ': the loaded fries open');
  ok(!(await L.overflow(p)), width + ': the card fits');
  ok(await p.locator('#r-plate .pin').count() === r.pins.length, width + ': every pin is on the plate');
  const main = await p.locator('main').innerText();
  ok(!/Not complete yet/i.test(main), width + ': every linked card is in the book');
  ok(/To come/.test(main), width + ': the amounts show To come');
  ok(/Milk/.test(main) && /Egg/.test(main) && /Gluten/.test(main), width + ': milk (cheese sauce), egg (Alabama white) and gluten (the shallots) roll up');
  await p.click('main .ing a[href$="/cowboy-candy"]'); await L.settle(p, 400);
  ok(/Cowboy Candy/.test(await p.locator('#rtitle').textContent()), width + ': the cowboy candy opens card 109');
  await p.goto(L.BASE + '#/recipes'); await L.settle(p, 400);
  await p.fill('#find', 'loaded fries'); await L.settle(p, 400);
  const found = await p.evaluate(() => [...document.querySelectorAll('#shelves a.dish:not(.faded), #results a.tile')].map(a => a.getAttribute('href')));
  ok(found.some(h => /\/loaded-fries$/.test(h)), width + ': a search for loaded fries finds it');
  await p.fill('#find', 'gluten free'); await L.settle(p, 400);
  const gf = await p.evaluate(() => [...document.querySelectorAll('#shelves a.dish:not(.faded), #results a.tile')].map(a => a.getAttribute('href')));
  ok(!gf.some(h => /\/loaded-fries$/.test(h)), width + ': gluten free leaves it out');
  ok(p.errors.length === 0, width + ': no page errors ' + p.errors.join(' | '));
  await p.context().close();
 }
 await b.close(); L.report(R);
})();
