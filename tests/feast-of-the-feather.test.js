/* Feast of the Feather (card 130) with its Smoked Chicken (131), Herb Brine (132) and Yorkshire Pudding (133),
   16 November 2026. The dish opens with its board drawing and pins, the chicken pin opens card 131, card 131 opens
   the brine, the Yorkshire pin opens card 133, every part has a card so the dish is complete (mushy peas, card 136,
   bought in), and nothing scrolls sideways. */
const L = require('./lib');
const { R, ok } = L.results();
(async () => {
 global.window = {};
 require('../js/art.js'); require('../js/data.js');
 const D = window.LK_DATA, A = window.LK_ART, by = id => D.recipes.find(r => r.id === id);
 const dish = by('feast-of-the-feather'), chicken = by('smoked-chicken'), brine = by('herb-brine'), york = by('yorkshire-pudding'), cab = by('cider-red-cabbage'), peas = by('mushy-peas');
 ok(!!(dish && chicken && brine && york && cab && peas), 'the six cards are in the book');
 ok(dish.no === '130' && chicken.no === '131' && brine.no === '132' && york.no === '133' && cab.no === '134' && peas.no === '136', 'card numbers 130 to 134 and 136');
 ok(D.recipes.filter(r => ['130', '131', '132', '133', '134', '136'].includes(r.no)).length === 6, 'no other card uses 130 to 134 or 136');
 ok(!!A.plates[dish.art] && !!A.pans[chicken.art] && !!A.pans[brine.art] && !!A.pans[york.art] && !!A.pans[cab.art] && !!A.pans[peas.art], 'the dish has a plate drawing, the batches have pans');
 ok(/bought in/i.test(peas.yield) && /check the label/i.test(peas.labelNote) && dish.ingredients.every(i => !i.link || D.recipes.some(r => r.id === i.link)), 'mushy peas are bought in, and every part of the dish has a card');
 ok(/fresh/.test(york.ingredients.find(i => i.name === 'Canola oil').note) && /Never oil out of the fryer/.test(JSON.stringify(york.sections)) && !/the fryer oil/.test(JSON.stringify(york)), 'the tin oil is fresh canola, never oil out of the fryer');
 ok(cab.ingredients.some(i => i.q === '250 ml' && /cider vinegar/i.test(i.name)) && /2 weeks/.test(cab.safety.text), 'the red cabbage is cider-pickled and keeps 2 weeks');
 ok(!!(A.sides['feast-of-the-feather'] && /Yorkshire pudding/.test(A.sides['feast-of-the-feather'].body) && /Gravy jug/.test(A.sides['feast-of-the-feather'].body)), 'the dish has its labelled side view');
 ok(york.ingredients.map(i => i.q + ' ' + i.name).join(', ') === '140 g Plain flour, 200 ml Milk, 4 Eggs, ½ tsp Salt, 100 ml Canola oil' && york.sections.some(s => s.steps.includes('Rest it 1 hour at room temperature.')) && york.sections.some(s => s.steps.includes('Preheat the oven to 210 °C, full fan, no moisture at all.')) && york.sections.some(s => s.steps.includes('Heat the oil in the oven for 15 min.')) && york.sections.some(s => s.steps.includes('Turn the fan down to 2 bars. Bake 17 min at 210 °C.')) && york.sections.some(s => s.steps.includes('Raise the temperature to 230 °C. Bake 8 min more.')) && york.sections.some(s => s.steps.includes('Out of the oven. Cool it on a wire rack at room temperature.')) && /Never open the oven/.test(york.safety.title) && /17 min at 210 °C, then 8 min at 230 °C/.test(york.yield) && /17 min at 210 °C, then 8 min at 230 °C/.test(JSON.stringify(dish.sections)) && !/fan off|20 to 25 min|upper-middle|250 °C|12 min|Trial/.test(JSON.stringify([dish.sections, york])) && /never the Tuscan oil/.test(JSON.stringify(york.sections)) && /Makes 1 giant pudding in an 18 cm/.test(york.yield) && !/half a batch|2 tins/.test(JSON.stringify([dish, york]) + A.sides['feast-of-the-feather'].body), 'the Yorkshire: 140 g plain flour, 200 ml milk, 4 eggs, ½ tsp salt, rested 1 hour; oil 15 min at 210 °C full fan; fan 2 bars, 17 min at 210 °C then 8 min at 230 °C; never open the oven; cool on a rack');
 ok(/No\. 10/.test(chicken.yield) && !/1\.6 to 1\.8 kg, unstuffed/.test(JSON.stringify(chicken.ingredients)), 'the chicken is a No. 10');
 ok(dish.pins.every(p => p.x > 0 && p.x < 100 && p.y > 0 && p.y < 100), 'every pin sits on the drawing');
 ok(dish.ingredients.some(i => i.link === 'smoked-chicken') && chicken.ingredients.some(i => i.link === 'herb-brine'), 'dish to chicken to brine links');
 ok(!D.menuOrder.some(s => s.ids.includes('feast-of-the-feather')), 'a trial dish, not on the guest menu');
 ok(!/\u2014/.test(JSON.stringify([dish, chicken, brine, york, cab, peas])), 'no em dashes');
 ok(/75 °C/.test(chicken.safety.text) && /5 °C/.test(brine.safety.text), 'the chicken probe and the cold brine warnings are there');
 ok(chicken.sections.some(s => s.title === 'Finish to order' && s.steps.includes('When the board is ordered: into the oven at 180 °C until hot right through.')) && /180 °C/.test(JSON.stringify(dish.sections)) && !chicken.tip && !/iCombi|210 °C|15 to 30 min|10 to 15 min/.test(JSON.stringify(chicken)), 'the chicken is finished to order at 180 °C');
 ok(chicken.sections.some(s => s.title === 'Cool and hold' && s.steps.some(t => /below 21 °C within 2 hours, then 5 °C or below within 4 more hours/.test(t)) && s.steps.some(t => /coolroom/.test(t))) && /coolroom/.test(JSON.stringify(dish.sections)) && !/hot or chilled/.test(JSON.stringify(chicken)), 'after the smoker the chicken is cooled in two stages and kept in the coolroom');
 ok(dish.ingredients.some(i => i.link === 'cider-red-cabbage' && i.q === '120 g') && /120 g per board/.test(cab.yield) && /any brand/.test(peas.yield) && !/Brand to confirm/.test(JSON.stringify(peas)), '120 g red cabbage per board, mushy peas any brand');
 ok(chicken.sections.some(s => s.title === 'Smoke' && s.steps.includes('Smoke 2 hours.')) && /Smoke 2 hours at 150 °C/.test(chicken.yield) && /smoked 2 hours/.test(JSON.stringify(dish.sections)) && !/60 to 90 min|Cooking fast/.test(JSON.stringify(chicken)), 'the No. 10 chicken smokes 2 hours');
 const b = await L.start();
 for (const width of [390, 768, 1280]) {
  const p = await L.open(b, '#/r/feast-of-the-feather', { width, height: 900, wait: 1200 });
  await L.settle(p, 400);
  ok(/Feast of the Feather/.test(await p.locator('#rtitle').textContent()), width + ': the dish opens');
  ok(!(await L.overflow(p)), width + ': the dish fits');
  ok(await p.locator('#r-plate .pin').count() === dish.pins.length, width + ': every pin is on the plate');
  ok(await p.locator('#r-side svg text').count() >= 6, width + ': From the side shows how it is plated, each part named');
  const main = await p.locator('main').innerText();
  ok(!/Not complete yet|Card to come/i.test(main), width + ': every part has a card, so the dish is not marked Not complete yet');
  ok(/mushy peas are bought in: check their label/i.test(main), width + ': the allergen box says to check the bought-in mushy peas label');
  await p.click('#r-plate a.pin[href$="/mushy-peas"]'); await L.settle(p, 400);
  ok(/Mushy Peas/.test(await p.locator('#rtitle').textContent()), width + ': the mushy peas pin opens card 136');
  ok(!(await L.overflow(p)), width + ': card 136 fits');
  await p.goBack(); await L.settle(p, 400);
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
