// The Recipes tutorial (docs/tutorial-videos.md). Filmed as Ann on her own phone, on the demo kitchen's Tuesday
// (fixtures.mjs). The recipes are the book's own public cards (js/data.js): no prices, no supplier codes. A phone's
// screen lock is stood in for (the test browser has none), so Keep screen on shows as it does on a phone; a computer
// does not offer it, so that step is filmed for the phone only. Same shape as storyboards/prep.mjs.
const wakeLock = () => {
  const lock = { request: () => new Promise(yes => { const s = new EventTarget(); s.type = 'screen'; s.released = false; s.release = () => { s.released = true; s.dispatchEvent(new Event('release')); return Promise.resolve(); }; yes(s); }) };
  Object.defineProperty(Navigator.prototype, 'wakeLock', { configurable: true, get: () => lock });
};
const picker = '.ux-picker';

export default {
  id: 'recipes',
  title: 'Recipes',
  sub: 'Find it, check it, cook it',
  next: 'Prep list',
  done: "That's Recipes",
  hash: '#/recipes',
  who: 'ann',
  open: { init: wakeLock },
  intro: ['Recipes.', 'Find any dish, check its allergens and follow the method.'],
  outro: ["That's Recipes. Next up, the Prep list."],
  steps: [
    {
      title: 'Search',
      say: ['Type a dish, an ingredient or an allergen in the search box.', 'The list shrinks as you type. Tap a dish to open it.'],
      do: [
        { s: 0, d: 0.4, circle: '.find-wrap', opts: { pad: 3 } },
        { s: 0, d: 1.6, type: ['#find', 'burger'] },
        { s: 1, d: 2.0, tap: '#shelves a.dish[href="#/r/burger"]' }
      ]
    },
    {
      title: 'Allergens',
      say: ['Every card starts with its allergens, and where they come from.', 'A question mark means check the supplier label.'],
      do: [
        { s: 0, d: 0.3, circle: '#r-allergens', opts: { pad: 3 } },
        { s: 1, d: 0.3, circle: '#r-allergens .tag.maybe', opts: { pad: 5 } }
      ]
    },
    {
      title: 'Ingredients',
      say: ['Then everything on it, with the amounts.'],
      do: [
        { s: 0, d: 0.1, only: 'phone', tap: '[data-act="jump"][data-val="r-ing"]' },
        { s: 0, d: 1.0, circle: '.ing', opts: { pad: 3 } }
      ]
    },
    {
      title: 'Batch recipes',
      say: ['An underlined ingredient has its own recipe card. Tap it to open it.', 'The trail at the top takes you back.'],
      do: [
        { s: 0, d: 0.3, circle: '.ing .ilink', opts: { pad: 5 } },
        { s: 0, d: 2.4, clear: true },
        { s: 0, d: 2.6, tap: '.ing .ilink' },
        { s: 1, d: 0.2, circle: 'nav.trail, nav.crumbs', opts: { pad: 4 } },
        { s: 1, d: 1.6, tap: 'nav a[href="#/r/burger"]' }
      ]
    },
    {
      title: 'The method',
      say: ['The method is step by step.', 'Tap a step to tick it off as you go.'],
      do: [
        { s: 0, d: 0.2, scroll: '#r-steps' },
        { s: 0, d: 1.0, underline: '[data-act="tick"] >> nth=0' },
        { s: 1, d: 0.4, tap: '[data-act="tick"] >> nth=0' },
        { s: 1, d: 1.4, tap: '[data-act="tick"] >> nth=1' }
      ]
    },
    {
      title: 'Keep screen on',
      skip: { desktop: true },
      say: ['Hands busy? Tap Keep screen on, and the phone stays awake while a recipe is open.'],
      do: [
        { s: 0, top: true },
        { s: 0, d: 1.2, tap: '.ko-chip' },
        { s: 0, d: 2.4, circle: '.ko-chip' }
      ]
    },
    {
      title: 'Free from',
      say: ['Cooking for an allergy? Back on the list, tap Free from, then choose the allergen.', 'Only the dishes without it stay on the list.'],
      do: [
        { s: 0, go: '#/recipes' },
        { s: 0, d: 0.5, tap: '.ux-search-clear' },
        { s: 0, d: 1.4, tap: '[data-act="amode"][data-val="free"]' },
        { s: 0, d: 2.6, tap: '.ux-choice-source:has([data-act="free"]) + .ux-picker-trigger' },
        { s: 0, d: 3.6, tap: picker + ' button:has-text("Gluten")' },
        { s: 1, d: 0.1, tap: picker + '-footer .dark' },
        { s: 1, d: 1.0, circle: '#count', opts: { pad: 5 } }
      ]
    },
    {
      title: 'Pass or Tiles',
      say: ['The Pass shows each dish on its plate.', 'Tiles shows them as cards, with their allergens.'],
      do: [
        { s: 0, d: 0.2, circle: '[data-act="topview"][data-val="pass"]' },
        { s: 1, d: 0.2, tap: '[data-act="topview"][data-val="tiles"]' },
        { s: 1, d: 1.4, circle: '.tile-groups .tile >> nth=0', opts: { pad: 4 } }
      ]
    }
  ]
};
