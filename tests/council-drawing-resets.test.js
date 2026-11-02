// Completing an ingredient choice clears its deferred library search without saving the drawing.
const L = require('./lib');
const { R, ok } = L.results();
const configKey = ['kitchens', L.PIN, 'config', 'main'].join('/');
const extra = { [configKey]: { people: [
  { id: 'ann', name: 'Ann', role: 'head', active: true, add: true, tick: true, del: true },
  { id: 'sam', name: 'Sam', role: 'sous', active: true, add: true, tick: true, del: true },
  { id: 'bo', name: 'Bo', role: 'staff', active: true, add: true, tick: true, del: false }
], headId: 'ann', sousIds: ['ann', 'sam'], pingIds: ['ann', 'sam'] } };
const savedWork = p => p.evaluate(() => Object.entries(__fake.dump()).filter(([key]) => /\/(?:drawings|drawtpl|drawlib|recipes|publicDrawings|publicRecipes)\/|\/book\/matches$/.test(key)));
(async () => {
  const b = await L.start();
  for (const width of [390, 768, 1280]) for (const kind of ['swap', 'ingredient']) {
    const p = await L.open(b, '#/manage/draw/new/burger/plate', { who: 'ann', extra, width, height: 900, wait: 1400 });
    await L.waitFor(p, () => !!window.LK_DRAW?.state().d && !!document.querySelector('#dw-q[data-smart-search]'), null, 15000);
    const stored = await savedWork(p);
    const ingredient = await p.evaluate(kind => {
      const w = LK_DRAW.state(), name = LK_DRAW.render.ingName(LK_DRAW.render.plateIngs(LK_DRAW.render.recipeOf('burger'))[0]);
      if (kind === 'swap') LK_DRAW.addItem('rump', { ing: name });
      else { w.pendingIng = name; LK_DRAW.redraw(); }
      return name;
    }, kind);
    if (kind === 'swap') await p.click('[data-dw="swap"]');
    await L.waitFor(p, () => !!document.querySelector('#dw-q[data-smart-search]'));
    await p.evaluate(() => LK_UX.resetSearch(document.getElementById('dw-q'))); await L.settle(p, 160);
    const librarySize = await p.locator('.dw-tile[data-dw="add"]').count();
    const completed = await p.evaluate(kind => {
      const input = document.getElementById('dw-q'), tile = [...document.querySelectorAll('.dw-tile[data-dw="add"]')].find(el => el.dataset.v !== 'rump'), chosen = tile.dataset.v;
      input.focus(); input.value = 'rump'; input.dispatchEvent(new Event('input', { bubbles: true })); tile.click();
      const w = LK_DRAW.state();
      if (kind === 'ingredient') document.querySelector('[data-dw="panel"][data-v="lib"]').click();
      return { chosen, count: w.d.els.length, piece: w.d.els[0].a.split('@')[0], ingredient: w.d.els[0].ing, pending: w.pendingIng, panel: w.panel, query: w.q };
    }, kind);
    ok(completed.count === 1 && completed.piece === completed.chosen && completed.ingredient === ingredient, width + ' ' + kind + ': the selected piece completes the ingredient task');
    ok(completed.pending === '' && completed.panel === '' && completed.query === '', width + ' ' + kind + ': completion clears the task and closes the library');
    await L.settle(p, 450);
    await p.click('[data-dw="panel"][data-v="lib"]'); await L.settle(p, 300);
    ok(await p.evaluate(() => { const input = document.getElementById('dw-q'); return LK_DRAW.state().q === '' && input.value === '' && input.dataset.committedQuery === ''; }), width + ' ' + kind + ': reopening the library does not revive the completed task search');
    ok(await p.locator('.dw-tile[data-dw="add"]').count() === librarySize, width + ' ' + kind + ': the reopened library shows its complete unfiltered choices');
    ok(JSON.stringify(await savedWork(p)) === JSON.stringify(stored), width + ' ' + kind + ': choosing a piece writes no recipe, drawing or saved match');
    ok(!(await L.overflow(p)) && p.errors.length === 0, width + ' ' + kind + ': the unsaved drawing has no page overflow or browser errors');
    await p.context().close();
  }
  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
