/* Feast of the Feather (card 130) with its Smoked Chicken (131), Herb Brine (132) and Yorkshire Pudding (133),
   16 November 2026. The dish opens with its board drawing and pins, the chicken pin opens card 131, card 131 opens
   the brine, the Yorkshire pin opens card 133, the two cards to come keep the dish Not complete yet and out of
   Free from, and nothing scrolls sideways. */
const L = require('./lib');
const { R, ok } = L.results();
(async () => {
 global.window = {};
 require('../js/art.js'); require('../js/data.js');
 const D = window.LK_DATA, A = window.LK_ART, by = id => D.recipes.find(r => r.id === id);
 const dish = by('feast-of-the-feather'), chicken = by('smoked-chicken'), brine = by('herb-brine'), york = by('yorkshire-pudding'), cab = by('cider-red-cabbage');
 ok(!!(dish && chicken && brine && york && cab), 'the five cards are in the book');
 ok(dish.no === '130' && chicken.no === '131' && brine.no === '132' && york.no === '133' && cab.no === '134', 'card numbers 130 to 134');
 ok(D.recipes.filter(r => ['130', '131', '132', '133', '134'].includes(r.no)).length === 5, 'no other card uses 130 to 134');
 ok(!!A.plates[dish.art] && !!A.pans[chicken.art] && !!A.pans[brine.art] && !!A.pans[york.art] && !!A.pans[cab.art], 'the dish has a plate drawing, the batches have pans');
 ok(cab.ingredients.some(i => i.q === '250 ml' && /cider vinegar/i.test(i.name)) && /2 weeks/.test(cab.safety.text), 'the red cabbage is cider-pickled and keeps 2 weeks');
 ok(!!(A.sides['feast-of-the-feather'] && /Yorkshire pudding/.test(A.sides['feast-of-the-feather'].body) && /Gravy jug/.test(A.sides['feast-of-the-feather'].body)), 'the dish has its labelled side view');
 ok(york.ingredients.map(i => i.q + ' ' + i.name).join(', ') === '200 g Flour, 200 ml Milk, 4 Eggs' && /210 °C for 12 min/.test(york.yield) && !/250 °C/.test(JSON.stringify([dish, york])) && /Makes 1 giant pudding in an 18 cm/.test(york.yield) && !/half a batch|2 tins/.test(JSON.stringify([dish, york]) + A.sides['feast-of-the-feather'].body) && york.sections[0].steps.includes('Rest the batter for 1 hour.') && !/Resting time/.test(JSON.stringify(york.sections)), 'the Yorkshire is 200 g flour, 200 ml milk, 4 eggs, rested 1 hour, 1 pudding in an 18 cm tin, one batch per board, 210 °C for 12 min');
 ok(/No\. 10/.test(chicken.yield) && !/1\.6 to 1\.8 kg, unstuffed/.test(JSON.stringify(chicken.ingredients)), 'the chicken is a No. 10');
 ok(dish.pins.every(p => p.x > 0 && p.x < 100 && p.y > 0 && p.y < 100), 'every pin sits on the drawing');
 ok(dish.ingredients.some(i => i.link === 'smoked-chicken') && chicken.ingredients.some(i => i.link === 'herb-brine'), 'dish to chicken to brine links');
 ok(!D.menuOrder.some(s => s.ids.includes('feast-of-the-feather')), 'a trial dish, not on the guest menu');
 ok(!/\u2014/.test(JSON.stringify([dish, chicken, brine, york, cab])), 'no em dashes');
 ok(/75 °C/.test(chicken.safety.text) && /5 °C/.test(brine.safety.text), 'the chicken probe and the cold brine warnings are there');
 const b = await L.start();
 for (const width of [390, 768, 1280]) {
  const p = await L.open(b, '#/r/feast-of-the-feather', { width, height: 900, wait: 1200 });
  await L.settle(p, 400);
  ok(/Feast of the Feather/.test(await p.locator('#rtitle').textContent()), width + ': the dish opens');
  ok(!(await L.overflow(p)), width + ': the dish fits');
  ok(await p.locator('#r-plate .pin').count() === dish.pins.length, width + ': every pin is on the plate');
  ok(await p.locator('#r-side svg text').count() >= 6, width + ': From the side shows how it is plated, each part named');
  const warn = await p.locator('main .warn').first().innerText();
  ok(/Not complete yet/i.test(warn) && /Mushy peas/.test(warn) && !/red cabbage/i.test(warn) && !/Yorkshire/.test(warn), width + ': only the mushy peas card to come keeps it Not complete yet');
  await p.click('#r-plate a.pin[href$="/cider-red-cabbage"]'); await L.settle(p, 400);
  ok(/Cider-Pickled Red Cabbage/.test(await p.locator('#rtitle').textContent()), width + ': the red cabbage pin opens card 134');
  ok(!(await L.overflow(p)), width + ': card 134 fits');
  await p.goBack(); await L.settle(p, 400);
  ok(/Gluten/.test(await p.locator('main').innerText()), width + ': the Yorkshire gluten rolls up into the dish');
  await p.click('#r-plate a.pin[href$="/yorkshire-pudding"]'); await L.settle(p, 400);
  ok(/Yorkshire Pudding/.test(await p.locator('#rtitle').textContent()), width + ': the Yorkshire pin opens card 133');
  ok(!(await L.overflow(p)), width + ': card 133 fits');
  await p.goBack(); await L.settle(p, 400);
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
