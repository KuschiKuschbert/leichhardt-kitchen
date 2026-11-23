// The Recipes and drawings tutorial (docs/tutorial-videos.md): #/manage, the recipe list, the recipe form, the Special
// switch, the drawing studio and a new recipe. Filmed as Sam, the sous chef, on the demo kitchen's Tuesday
// (fixtures.mjs). The recipes are the book's own (js/data.js). Every save goes to the Firebase stand-in only: the
// burger turns Special and gets a new plate drawing on film, and nothing reaches the real book.

// After a tap, the next sentence waits until the page has finished redrawing and painted it, so on a busy computer
// the voice never runs ahead of the picture.
// Then a tiny paint nobody can see (one pixel, almost clear), twice, so the film catches the page as it ends up: the
// screencast skips frames while it waits for the last one, and a page that has stopped moving sends no more.
const poke = page => page.evaluate(() => new Promise(r => { const d = document.createElement('i'); d.style.cssText = 'position:fixed;width:1px;height:1px;opacity:.01;left:0;top:0;pointer-events:none'; document.documentElement.appendChild(d); requestAnimationFrame(() => requestAnimationFrame(() => { d.remove(); r(); })); }));
const settled = (page, cut, L) => L.settle(page, 2500).then(() => poke(page)).then(() => new Promise(r => setTimeout(r, 150))).then(() => poke(page));
// A chip in a row that scrolls sideways (the form's parts on a phone): slid into view first, so the tap lands on it.
const into = sel => page => page.evaluate(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); }, sel).then(() => new Promise(r => setTimeout(r, 600)));
// Draw it for me takes a few seconds: the next sentence waits for the drawing and its note.
const drawn = (page, cut, L) => page.waitForSelector('.dw-note', { timeout: 15000 }).then(() => settled(page, cut, L));

export default {
  id: 'recipes-manage',
  title: 'Recipes and drawings',
  sub: 'Change a recipe, draw the plate',
  next: 'Admin: Today',
  hash: '#/manage',
  who: 'sam',
  intro: ['Recipes and drawings.', "Here's how the chefs change a recipe, mark a special and draw the plate."],
  outro: ["That's Recipes and drawings. Next up, Admin: Today."],
  steps: [
    {
      title: 'The recipe list',
      say: ['This lists every recipe in the book.', 'Find one by name, card number or ingredient.', 'Tap it to open its form.'],
      do: [
        { s: 0, d: 0.3, underline: '#rtitle' },
        { s: 1, d: 0.3, type: ['#mg-q', 'burger'] },
        { s: 2, d: 0.4, tap: '#mg-results a[href="#/manage/r/burger"]', run: settled }
      ]
    },
    {
      title: 'The recipe form',
      say: ['Each part of the recipe has its own tab.', 'Ingredients opens first. Type in a row to change an amount or a name.', 'Save stays grey until something changes.'],
      do: [
        { s: 0, d: 0.3, circle: '.mg-chs', opts: { pad: 4 } },
        { s: 1, d: 1.6, circle: '.mg-ing >> nth=0', opts: { pad: 6 } },
        { s: 2, d: 0.3, circle: '[data-mg="save"]', opts: { pad: 6 } }
      ]
    },
    {
      title: 'Special',
      say: ['Card details holds two switches.', 'Show in the book hides or shows the recipe.', 'Special puts a dish first on the Pass and Tiles.', 'Then tap Save.'],
      do: [
        { s: 0, d: 0.2, run: into('[data-mg="ch"][data-v="card"]') },
        { s: 0, d: 0.9, tap: '[data-mg="ch"][data-v="card"]', run: settled },
        { s: 1, d: 0.3, circle: '[data-mg="sw-show"]', opts: { pad: 4 } },
        { s: 2, d: 0.5, tap: '[data-mg="sw-special"]', run: settled },
        { s: 2, d: 1.6, circle: '[data-mg="sw-special"]', opts: { pad: 4 } },
        { s: 3, d: 0.3, tap: '[data-mg="save"]', run: settled },
        { s: 3, d: 1.2, circle: '.mg-toasts .p-toast', opts: { pad: 4 } }
      ]
    },
    {
      title: 'Drawings',
      say: ['Drawings shows the plate, with its labels.', 'Draw it in the studio opens the drawing studio.'],
      do: [
        { s: 0, d: 0.1, run: into('[data-mg="ch"][data-v="draw"]') },
        { s: 0, d: 0.7, tap: '[data-mg="ch"][data-v="draw"]', run: settled },
        { s: 0, d: 1.6, circle: '.mg-dcard >> nth=0', opts: { pad: 4 } },
        { s: 1, d: 0.5, tap: '[data-mg="draw"][data-v="new:plate"]', run: settled }
      ]
    },
    {
      title: 'The studio',
      say: ['Draw it for me draws the dish from its recipe.', 'Try another gives a new layout. Undo takes it back.', 'Add food puts more on the plate. Drag a part to move it.', 'Tap Save, and the recipe shows the new drawing.'],
      do: [
        { s: 0, d: 0.5, tap: '.dw-hero [data-dw="sm-draw"]', run: drawn },
        { s: 1, d: 0.2, circle: '.dw-note', opts: { pad: 4 } },
        { s: 2, d: 0.3, tap: '.dw-ctx [data-dw="panel"][data-v="lib"]', run: settled },
        { s: 2, d: 1.8, circle: '.dw-tile >> nth=0', opts: { pad: 4 } },
        { s: 3, d: 0.4, tap: '[data-dw="save"]', run: settled },
        { s: 3, d: 1.4, circle: '.mg-toasts .p-toast', opts: { pad: 4 } }
      ]
    },
    {
      title: 'New recipe',
      say: ['Back on the list, New recipe starts an empty card.', 'Cards to come lists the cards still to write.', 'Make this card opens a new recipe for it.', 'Write the name staff see, then fill in each part.'],
      do: [
        { s: 0, go: '#/manage', run: settled },
        { s: 0, d: 1.3, circle: 'a[href="#/manage/new"]', opts: { pad: 6 } },
        { s: 1, d: 0.1, run: into('[data-mg="kind"][data-v="tocome"]') },
        { s: 1, d: 0.8, tap: '[data-mg="kind"][data-v="tocome"]', run: settled },
        { s: 2, d: 0.3, tap: '#mg-results a[href^="#/manage/new/"] >> nth=0', run: settled },
        { s: 3, d: 0.3, circle: '#mg-name', opts: { pad: 6 } }
      ]
    }
  ]
};
