const L = require('./lib');
const { R, ok } = L.results();
(async () => {
 global.window = {};
 require('../js/art.js'); require('../js/library.js'); require('../js/lib/bread.js'); require('../js/data.js');
 const a = window.LK_ART.pans, piece = window.LK_LIB.body('cornbread');
 ok(a['house-bbq-sauce'] === a['bourbon-bbq-sauce'], 'House BBQ reuses the exact existing BBQ pan');
 ok(a['alabama-white-sauce'] === a.ranch.replaceAll('#8FB06A', '#74604A'), 'Alabama White only recolours existing ranch flecks');
 ok(a['carolina-gold'] === a.aioli.replaceAll('#F3E9C4','#E8C22A').replaceAll('#FFFBE8','#F3D65B').replaceAll('#E0CD8A','#C99A3A'), 'Carolina Gold only recolours the existing aioli pan');
 ok(piece.length > 0 && a.cornbread.split(piece).length - 1 === 12, 'Cornbread uses twelve exact existing library pieces');
 ok(window.LK_DATA.recipes.filter(r => ['carolina-gold','alabama-white-sauce'].includes(r.id)).every(r => !r.ingredients.some(i => /Ingredient to confirm|pecan/i.test(i.name))), 'Excluded source ingredients are omitted');
 const b = await L.start();
 for (const width of [390, 768, 1280]) {
  const p = await L.open(b, '#/r/butchers-board', {width, height:900, wait:1200});
  for (const board of ['butchers-board','beast-board']) {
   await p.goto(L.BASE + '#/r/' + board); await L.settle(p,500);
   ok(await p.evaluate(id => { const r=LK_DATA.recipes.find(r=>r.id===id); return ['cornbread','alabama-white-sauce'].every(link=>r.ingredients.some(i=>i.link===link)&&r.pins.some(i=>i.link===link)); },board), width+': '+board+' ingredients and pins link both batches');
   await p.click('main a[href$="/cornbread"]'); await L.settle(p,400);
   ok(/Cornbread/.test(await p.locator('#rtitle').textContent()),width+': board opens Cornbread');
  }
  for (const id of ['carolina-gold','house-bbq-sauce','alabama-white-sauce','cornbread']) {
   await p.goto(L.BASE+'#/r/'+id); await L.settle(p,400);
   ok(await p.evaluate(id=>!!LK_ART.pans[id],id),width+': '+id+' has pan art');
   ok(!(await L.overflow(p)),width+': '+id+' fits');
   ok(!/not found/i.test(await p.locator('#rtitle').textContent()),width+': '+id+' opens');
  }
  await p.goto(L.BASE+'#/recipes'); await L.settle(p,400);
  await p.fill('#find','egg free'); await L.settle(p,400);
  const visible=await p.evaluate(()=>[...document.querySelectorAll('#shelves a.dish:not(.faded), #results a.tile')].map(a=>a.getAttribute('href')));
  ok(!visible.some(a=>/\/(alabama-white-sauce|cornbread|butchers-board|beast-board)$/.test(a)),width+': egg free excludes egg batches and linked boards');
  ok(p.errors.length===0,width+': no page errors '+p.errors.join(' | '));
  await p.context().close();
 }
 await b.close(); L.report(R);
})();
