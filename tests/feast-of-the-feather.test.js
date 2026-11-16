/* Feast of the Feather (card 130) with its Smoked Chicken (131) and Herb Brine (132), 16 November 2026.
   The dish opens with its board drawing and pins, the chicken pin opens card 131, card 131 opens the brine,
   the three cards to come keep the dish Not complete yet and out of Free from, and nothing scrolls sideways. */
const L = require('./lib');
const { R, ok } = L.results();
(async () => {
 global.window = {};
 require('../js/art.js'); require('../js/data.js');
 const D = window.LK_DATA, A = window.LK_ART, by = id => D.recipes.find(r => r.id === id);
 const dish = by('feast-of-the-feather'), chicken = by('smoked-chicken'), brine = by('herb-brine');
 ok(!!(dish && chicken && brine), 'the three cards are in the book');
 ok(dish.no === '130' && chicken.no === '131' && brine.no === '132', 'card numbers 130, 131 and 132');
 ok(D.recipes.filter(r => ['130', '131', '132'].includes(r.no)).length === 3, 'no other card uses 130 to 132');
 ok(!!A.plates[dish.art] && !!A.pans[chicken.art] && !!A.pans[brine.art], 'the dish has a plate drawing, the batches have pans');
 ok(dish.pins.every(p => p.x > 0 && p.x < 100 && p.y > 0 && p.y < 100), 'every pin sits on the drawing');
 ok(dish.ingredients.some(i => i.link === 'smoked-chicken') && chicken.ingredients.some(i => i.link === 'herb-brine'), 'dish to chicken to brine links');
 ok(!D.menuOrder.some(s => s.ids.includes('feast-of-the-feather')), 'a trial dish, not on the guest menu');
 ok(!/—/.test(JSON.stringify([dish, chicken, brine])), 'no em dashes');
 ok(/75 °C/.test(chicken.safety.text) && /5 °C/.test(brine.safety.text), 'the chicken probe and the cold brine warnings are there');
 const b = await L.start();
 for (const width of [390, 768, 1280]) {
  const p = await L.open(b, '#/r/feast-of-the-feather', { width, height: 900, wait: 1200 });
  await L.settle(p, 400);
  ok(/Feast of the Feather/.test(await p.locator('#rtitle').textContent()), width + ': the dish opens');
  ok(!(await L.overflow(p)), width + ': the dish fits');
  ok(await p.locator('#r-plate .pin').count() === dish.pins.length, width + ': every pin is on the plate');
  const warn = await p.locator('main .warn').first().innerText();
  ok(/Not complete yet/i.test(warn) && /Yorkshire pudding/.test(warn) && /Mushy peas/.test(warn) && /red cabbage/i.test(warn), width + ': the three cards to come keep it Not complete yet');
  await p.click('#r-plate a.pin[href$="/smoked-chicken"]'); await L.settle(p, 400);
  ok(/Smoked Chicken/.test(await p.locator('#rtitle').textContent()), width + ': the chicken pin opens card 131');
  ok(!(await L.overflow(p)), width + ': card 131 fits');
  await p.click('main .ing a[href$="/herb-brine"]'); await L.settle(p, 400);
  ok(/Herb Brine/.test(await p.locator('#rtitle').textContent()), width + ': card 131 opens the brine');
  ok(!(await L.overflow(p)), width + ': card 132 fits');
  await p.goto(L.BASE + '#/recipes'); await L.settle(p, 400);
  await p.fill('#find', 'egg free'); await L.settle(p, 400);
  const shown = await p.evaluate(() => [...document.querySelectorAll('#shelves a.dish:not(.faded), #results a.tile')].map(a => a.getAttribute('href')));
  ok(!shown.some(h => /\/feast-of-the-feather$/.test(h)), width + ': egg free leaves it out');
  ok(p.errors.length === 0, width + ': no page errors ' + p.errors.join(' | '));
  await p.context().close();
 }
 await b.close(); L.report(R);
})();
